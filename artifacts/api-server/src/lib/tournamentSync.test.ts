/**
 * Unit tests for tournamentSync.ts
 *
 * Covers:
 *  1. Score non-demotion: a lower-scoring build must never overwrite a higher
 *     existing tournament entry score.
 *  2. Rerank: entries are correctly ranked by descending score, including
 *     the case where multiple users share identical scores.
 *  3. getUserBestCraftScore: MAX aggregation, 0–5 float → 0–500 int scaling,
 *     and non-castable/corrupt score values do not break the guard.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ── Hoisted mock state ─────────────────────────────────────────────────────
//
// vi.mock factories are hoisted above imports, so variables used inside them
// must be created with vi.hoisted().

const mocks = vi.hoisted(() => {
  // A minimal "thenable + chainable" object so that
  //   await db.select().from().where()          → resolves with `result`
  //   await db.select().from().where().orderBy() → resolves with `result`
  // work with the same mock chain.
  const makeResultNode = (result: unknown[]) => {
    const node = {
      orderBy: vi.fn(() => Promise.resolve(result)),
      then: (
        onFulfilled?: (value: unknown[]) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
      catch: (onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).catch(onRejected),
    };
    return node;
  };

  // ── select chain ──────────────────────────────────────────────────────────
  // Each test pushes its expected row arrays into `selectQueue`.
  // Every call to `where` pops the next result from the queue.
  const selectQueue: unknown[][] = [];

  const mockWhere = vi.fn(() => makeResultNode(selectQueue.shift() ?? []));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  // ── update chain ──────────────────────────────────────────────────────────
  const updateCalls: Array<{ setArgs: unknown; whereArgs: unknown }> = [];
  const mockUpdateWhere = vi.fn((whereArgs: unknown) => {
    updateCalls[updateCalls.length - 1]!.whereArgs = whereArgs;
    return Promise.resolve([]);
  });
  const mockUpdateSet = vi.fn((setArgs: unknown) => {
    updateCalls.push({ setArgs, whereArgs: null });
    return { where: mockUpdateWhere };
  });
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

  // ── drizzle operator stubs ────────────────────────────────────────────────
  const and = vi.fn((...args: unknown[]) => ({ _and: args }));
  const eq = vi.fn((col: unknown, val: unknown) => ({ _eq: [col, val] }));
  const gte = vi.fn((col: unknown, val: unknown) => ({ _gte: [col, val] }));
  const lte = vi.fn((col: unknown, val: unknown) => ({ _lte: [col, val] }));
  const isNotNull = vi.fn((col: unknown) => ({ _isNotNull: col }));
  const desc = vi.fn((col: unknown) => ({ _desc: col }));
  const sql = vi.fn(() => "MAX_EXPR") as unknown as typeof import("drizzle-orm").sql;

  return {
    selectQueue,
    updateCalls,
    mockSelect,
    mockFrom,
    mockWhere,
    mockInnerJoin,
    mockUpdate,
    mockUpdateSet,
    mockUpdateWhere,
    and,
    eq,
    gte,
    lte,
    isNotNull,
    desc,
    sql,
  };
});

// ── Module mocks ───────────────────────────────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: {
    select: mocks.mockSelect,
    update: mocks.mockUpdate,
  },
  craftBuildsTable: {
    userId: "userId",
    score: "score",
    craft: "craft",
    createdAt: "createdAt",
  },
  tournamentEntriesTable: {
    id: "id",
    tournamentId: "tournamentId",
    userId: "userId",
    score: "score",
  },
  tournamentsTable: {
    id: "id",
    status: "status",
    craftType: "craftType",
    startAt: "startAt",
    endAt: "endAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: mocks.and,
  eq: mocks.eq,
  gte: mocks.gte,
  lte: mocks.lte,
  isNotNull: mocks.isNotNull,
  desc: mocks.desc,
  sql: mocks.sql,
}));

vi.mock("./logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ── Import SUT after mocks are registered ─────────────────────────────────
import {
  syncActiveTournamentScores,
  rerank,
  getUserBestCraftScore,
} from "./tournamentSync";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTournamentEntry(overrides: Partial<{
  entryId: string;
  entryScore: number;
  tournamentId: string;
  startAt: Date;
  endAt: Date;
  craftType: string | null;
}> = {}) {
  return {
    entryId: overrides.entryId ?? "entry-1",
    entryScore: overrides.entryScore ?? 0,
    tournamentId: overrides.tournamentId ?? "tournament-1",
    startAt: overrides.startAt ?? new Date("2025-01-01"),
    endAt: overrides.endAt ?? new Date("2025-12-31"),
    craftType: overrides.craftType !== undefined ? overrides.craftType : "smoke",
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mocks.selectQueue.length = 0;
  mocks.updateCalls.length = 0;
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────
describe("getUserBestCraftScore", () => {
  it("returns 0 when no qualifying builds exist", async () => {
    mocks.selectQueue.push([{ best: null }]);
    const score = await getUserBestCraftScore(
      "user-1",
      "smoke",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );
    expect(score).toBe(0);
  });

  it("scales a 0–5 float to 0–500 integer points", async () => {
    mocks.selectQueue.push([{ best: 4.5 }]);
    const score = await getUserBestCraftScore(
      "user-1",
      "smoke",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );
    expect(score).toBe(450);
  });

  it("rounds fractional scaled values to the nearest integer", async () => {
    mocks.selectQueue.push([{ best: 3.333 }]);
    const score = await getUserBestCraftScore(
      "user-1",
      "smoke",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );
    expect(score).toBe(333);
  });

  it("returns 0 when the DB returns an empty array (no row)", async () => {
    mocks.selectQueue.push([]);
    const score = await getUserBestCraftScore(
      "user-1",
      "smoke",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );
    expect(score).toBe(0);
  });

  it("returns 0 when the best value is non-numeric (corrupt data)", async () => {
    mocks.selectQueue.push([{ best: "not-a-number" }]);
    const score = await getUserBestCraftScore(
      "user-1",
      "smoke",
      new Date("2025-01-01"),
      new Date("2025-12-31"),
    );
    // The NaN guard ensures a corrupt DB value never propagates as NaN;
    // it is safely coerced to 0 so no score is awarded for a bad row.
    expect(score).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
describe("syncActiveTournamentScores — score non-demotion", () => {
  it("does NOT update the entry when the new score is lower than the existing score", async () => {
    const existingScore = 300; // 300 pts already recorded
    const lowerNewScore = 200; // later build scored less

    // First select: tournament entries for this user
    mocks.selectQueue.push([makeTournamentEntry({ entryScore: existingScore })]);
    // Second select: getUserBestCraftScore → 2.0 → 200 pts
    mocks.selectQueue.push([{ best: lowerNewScore / 100 }]);

    await syncActiveTournamentScores("user-1", "smoke");

    // db.update must never have been called
    expect(mocks.updateCalls.length).toBe(0);
  });

  it("does NOT update the entry when the new score equals the existing score", async () => {
    const existingScore = 350;

    mocks.selectQueue.push([makeTournamentEntry({ entryScore: existingScore })]);
    mocks.selectQueue.push([{ best: existingScore / 100 }]);

    await syncActiveTournamentScores("user-1", "smoke");

    expect(mocks.updateCalls.length).toBe(0);
  });

  it("DOES update the entry when the new score is strictly higher than the existing score", async () => {
    const existingScore = 200;
    const higherNewScore = 350;

    // Entries query
    mocks.selectQueue.push([makeTournamentEntry({ entryScore: existingScore })]);
    // getUserBestCraftScore query → 350 pts
    mocks.selectQueue.push([{ best: higherNewScore / 100 }]);
    // rerank → select entries
    mocks.selectQueue.push([{ id: "entry-1" }]);

    await syncActiveTournamentScores("user-1", "smoke");

    // Should have called update once for the score, once inside rerank
    const scoreUpdate = mocks.updateCalls.find(
      (c) =>
        typeof c.setArgs === "object" &&
        c.setArgs !== null &&
        "score" in (c.setArgs as Record<string, unknown>),
    );
    expect(scoreUpdate).toBeDefined();
    expect((scoreUpdate!.setArgs as Record<string, unknown>)["score"]).toBe(
      higherNewScore,
    );
  });

  it("preserves the existing score across multiple lower-scoring subsequent builds", async () => {
    const existingScore = 400;
    const buildScores = [1.5, 2.0, 3.0]; // all lower than 400 pts

    for (const buildScore of buildScores) {
      mocks.selectQueue.push([makeTournamentEntry({ entryScore: existingScore })]);
      mocks.selectQueue.push([{ best: buildScore }]);
    }

    for (const _ of buildScores) {
      await syncActiveTournamentScores("user-1", "smoke");
    }

    expect(mocks.updateCalls.length).toBe(0);
  });

  it("skips tournaments whose craftType does not match the current craft", async () => {
    // The entry is for a "brew" tournament; the call is for "smoke"
    mocks.selectQueue.push([
      makeTournamentEntry({ craftType: "brew", entryScore: 100 }),
    ]);

    await syncActiveTournamentScores("user-1", "smoke");

    // Craft mismatch → no getUserBestCraftScore call and no update
    expect(mocks.updateCalls.length).toBe(0);
  });

  it("processes multiple active entries and only updates those with improved scores", async () => {
    const entry1 = makeTournamentEntry({ entryId: "entry-1", entryScore: 200, tournamentId: "t-1" });
    const entry2 = makeTournamentEntry({ entryId: "entry-2", entryScore: 400, tournamentId: "t-2" });

    // Entries query returns both entries
    mocks.selectQueue.push([entry1, entry2]);
    // getUserBestCraftScore for entry1 → 350 pts (improvement over 200)
    mocks.selectQueue.push([{ best: 3.5 }]);
    // rerank for t-1 → one entry
    mocks.selectQueue.push([{ id: "entry-1" }]);
    // getUserBestCraftScore for entry2 → 300 pts (below existing 400)
    mocks.selectQueue.push([{ best: 3.0 }]);

    await syncActiveTournamentScores("user-1", "smoke");

    // Only entry-1 should have received a score update
    const scoreUpdates = mocks.updateCalls.filter(
      (c) =>
        typeof c.setArgs === "object" &&
        c.setArgs !== null &&
        "score" in (c.setArgs as Record<string, unknown>),
    );
    expect(scoreUpdates.length).toBe(1);
    expect((scoreUpdates[0]!.setArgs as Record<string, unknown>)["score"]).toBe(350);
  });
});

// ──────────────────────────────────────────────────────────────────────────
describe("rerank", () => {
  it("assigns rank 1 to the single entry in the tournament", async () => {
    mocks.selectQueue.push([{ id: "entry-1" }]);

    await rerank("tournament-1");

    expect(mocks.updateCalls.length).toBe(1);
    expect((mocks.updateCalls[0]!.setArgs as Record<string, unknown>)["rank"]).toBe(1);
  });

  it("assigns ranks 1, 2, 3 in descending score order (DB handles ordering)", async () => {
    // The DB returns entries already sorted by DESC score — rerank trusts DB ordering
    mocks.selectQueue.push([
      { id: "entry-high" },   // highest score → rank 1
      { id: "entry-mid" },    // middle score  → rank 2
      { id: "entry-low" },    // lowest score  → rank 3
    ]);

    await rerank("tournament-1");

    expect(mocks.updateCalls.length).toBe(3);
    expect((mocks.updateCalls[0]!.setArgs as Record<string, unknown>)["rank"]).toBe(1);
    expect((mocks.updateCalls[1]!.setArgs as Record<string, unknown>)["rank"]).toBe(2);
    expect((mocks.updateCalls[2]!.setArgs as Record<string, unknown>)["rank"]).toBe(3);
  });

  it("correctly positions players when multiple users share identical scores", async () => {
    // Two users tied at the same score. DB returns them in an arbitrary order;
    // rerank assigns consecutive ranks so no player is left unranked.
    mocks.selectQueue.push([
      { id: "tied-user-a" },
      { id: "tied-user-b" },
    ]);

    await rerank("tournament-1");

    expect(mocks.updateCalls.length).toBe(2);
    const ranks = mocks.updateCalls.map(
      (c) => (c.setArgs as Record<string, unknown>)["rank"],
    );
    // Both tied players must receive a rank; ranks must be consecutive starting at 1
    expect(ranks).toContain(1);
    expect(ranks).toContain(2);
    expect(new Set(ranks).size).toBe(2); // no duplicate ranks
  });

  it("handles three-way tie and assigns unique ranks to all", async () => {
    mocks.selectQueue.push([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ]);

    await rerank("tournament-1");

    const ranks = mocks.updateCalls.map(
      (c) => (c.setArgs as Record<string, unknown>)["rank"],
    ) as number[];
    expect(ranks.sort((x, y) => x - y)).toEqual([1, 2, 3]);
  });

  it("is a no-op (zero DB updates) when there are no entries", async () => {
    mocks.selectQueue.push([]);

    await rerank("tournament-1");

    expect(mocks.updateCalls.length).toBe(0);
  });
});
