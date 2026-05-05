/**
 * tournamentWorker — idempotency tests
 *
 * Verifies that the worker's spawn guard prevents duplicate replacement
 * tournaments when a run processes multiple expired tournaments of the same
 * type, or when a backlogged cycle finds an already-spawned replacement.
 *
 * Guard logic (window-overlap semantics):
 *   existing.startAt <= window.endAt  AND  existing.endAt >= window.startAt
 *
 * This means a tournament from a far-future window does NOT block the current
 * window's spawn.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks (hoisted before any imports of the mocked modules) ───────────

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn() },
  tournamentsTable: {},
}));

vi.mock("./logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("./socketServer", () => ({
  getIO: () => ({ emit: vi.fn() }),
}));

vi.mock("drizzle-orm", async (importActual) => {
  const actual = await importActual<typeof import("drizzle-orm")>();
  return { ...actual };
});

// ── Import under test ─────────────────────────────────────────────────────────
import { runTournamentEnforcement } from "./tournamentWorker";
import { db } from "@workspace/db";
import { logger } from "./logger";

// ── Helpers ───────────────────────────────────────────────────────────────────

type SelectBuilder = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

/**
 * Chainable drizzle-like select mock that resolves `rows` at the limit() call.
 */
function makeSelectMock(rows: object[]): SelectBuilder {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  builder.limit.mockResolvedValue(rows);
  builder.where.mockReturnValue(builder);
  builder.from.mockReturnValue(builder);
  return builder;
}

/** A minimal expired tournament row (endAt in the past). */
function expiredTournament(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaa-0001",
    type: "daily",
    title: "Daily Smoke Masters",
    description: "24-hour rolling competition",
    craftType: null,
    venueId: null,
    maxEntrants: null,
    prizeFirst: null,
    prizeSecond: null,
    prizeThird: null,
    featured: false,
    endAt: new Date(Date.now() - 60_000),
    ...overrides,
  };
}

/** Wire up a standard update().set().where() mock chain. */
function mockUpdate() {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn().mockReturnValue({ where });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set });
}

/** Wire up an insert().values().returning() mock chain. */
function mockInsert(returnedId = "bbbb-spawned") {
  const returning = vi.fn().mockResolvedValue([{ id: returnedId }]);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runTournamentEnforcement — idempotency guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("spawns a replacement when no active/upcoming tournament overlaps the current window", async () => {
    const tournament = expiredTournament();

    (db.select as ReturnType<typeof vi.fn>)
      // expired scan
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([tournament]),
        }),
      })
      // idempotency check — nothing found for this window
      .mockReturnValueOnce(makeSelectMock([]));

    mockUpdate();
    mockInsert("bbbb-0002");

    const result = await runTournamentEnforcement(["daily"]);

    expect(result.completedCount).toBe(1);
    expect(result.spawnedCount).toBe(1);
    expect(result.errors).toBe(0);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("skips the spawn and logs when an active/upcoming replacement already overlaps the window", async () => {
    const tournament = expiredTournament();
    const existingReplacement = { id: "bbbb-already" };

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([tournament]),
        }),
      })
      // idempotency check — replacement found
      .mockReturnValueOnce(makeSelectMock([existingReplacement]));

    mockUpdate();

    const result = await runTournamentEnforcement(["daily"]);

    expect(result.completedCount).toBe(1);
    expect(result.spawnedCount).toBe(0);
    expect(result.errors).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();

    // Skip must be logged with structured metadata
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        existingId: existingReplacement.id,
        type: "daily",
      }),
      "Replacement tournament already exists — spawn skipped",
    );
  });

  it("spawns exactly one replacement when multiple expired rows of the same type are processed in one run", async () => {
    const t1 = expiredTournament({ id: "aaaa-0001" });
    const t2 = expiredTournament({ id: "aaaa-0002" });

    (db.select as ReturnType<typeof vi.fn>)
      // expired scan: two stale rows
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([t1, t2]),
        }),
      })
      // idempotency check for t1: nothing exists yet
      .mockReturnValueOnce(makeSelectMock([]))
      // idempotency check for t2: the replacement just spawned for t1 is found
      .mockReturnValueOnce(makeSelectMock([{ id: "bbbb-spawned" }]));

    mockUpdate();
    mockInsert("bbbb-spawned");

    const result = await runTournamentEnforcement(["daily"]);

    expect(result.completedCount).toBe(2);
    expect(result.spawnedCount).toBe(1);
    expect(result.errors).toBe(0);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("applies the idempotency guard per-venue when venueId is set", async () => {
    const venueId = "venue-uuid-1234";
    const t1 = expiredTournament({ id: "aaaa-v1", venueId });
    const t2 = expiredTournament({ id: "aaaa-v2", venueId });

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([t1, t2]),
        }),
      })
      .mockReturnValueOnce(makeSelectMock([]))
      .mockReturnValueOnce(makeSelectMock([{ id: "bbbb-venue-spawned" }]));

    mockUpdate();
    mockInsert("bbbb-venue-spawned");

    const result = await runTournamentEnforcement(["daily"]);

    expect(result.spawnedCount).toBe(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("does NOT suppress spawn when only a far-future tournament exists (no window overlap)", async () => {
    // Simulate: idempotency check returns empty because the far-future
    // tournament falls outside the replacement window bounds. The worker
    // should proceed to spawn.
    const tournament = expiredTournament();

    (db.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([tournament]),
        }),
      })
      // Guard query returns nothing — the far-future row's startAt is beyond
      // window.endAt so it doesn't satisfy the overlap condition.
      .mockReturnValueOnce(makeSelectMock([]));

    mockUpdate();
    mockInsert("bbbb-fresh");

    const result = await runTournamentEnforcement(["daily"]);

    expect(result.spawnedCount).toBe(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
