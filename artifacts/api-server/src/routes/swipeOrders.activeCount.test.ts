/**
 * swipeOrders — GET /api/swipe-orders/active-count
 *
 * Tests:
 *  - Returns the correct count for a venue_owner scoped to their venue
 *  - Returns 0 when there are no pending orders
 *  - Scopes correctly when venueId is provided by super_admin via query param
 *  - Returns global (unscoped) count for super_admin without ?venueId=
 *  - Returns 0 (not an error) when venue_owner has no venueId in JWT
 *  - Returns 401 when unauthenticated
 *  - Returns 403 for roles without permission (staff, manager, patron)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

// ── Module mocks (hoisted before any imports of the mocked modules) ───────────

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
  swipeOrdersTable:           { status: "status", venueId: "venue_id" },
  swipeOrderItemsTable:       {},
  inventoryReservationsTable: {},
  analyticsEventsTable:       {},
  venueInventoryTable:        {},
}));

vi.mock("../lib/jwt", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("../lib/neuralBridge", () => ({
  dispatchNeuralBridge: vi.fn(),
}));

/**
 * Mock drizzle-orm operators to return plain inspectable objects.
 * This lets us assert what conditions the route actually passes to `.where()`.
 * Scoped to this file only — each test file gets its own module registry.
 */
vi.mock("drizzle-orm", async (importOriginal) => {
  const orig = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...orig,
    eq:    vi.fn((col: unknown, val: unknown) => ({ _tag: "eq",  col, val })),
    and:   vi.fn((...args: unknown[]) => ({ _tag: "and", args })),
    lt:    vi.fn((col: unknown, val: unknown) => ({ _tag: "lt",  col, val })),
    count: vi.fn(() => ({ _tag: "count" })),
  };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import swipeOrdersRouter from "./swipeOrders";

// ── App fixture ───────────────────────────────────────────────────────────────

/**
 * Builds an Express app with an optional injected user on req.user.
 * The active-count route checks req.user directly (no requireAuth call),
 * so we need to set it via a preceding middleware.
 */
function buildApp(user: object | null = null) {
  const app = express();
  app.use(express.json());

  // Inject the mock user (or leave req.user undefined to simulate unauthenticated)
  app.use((req: Request & { user?: object }, _res: Response, next: NextFunction) => {
    if (user !== null) req.user = user;
    next();
  });

  app.use("/api/swipe-orders", swipeOrdersRouter);
  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mocks `db.select().from().where()` so the final `.where()` resolves with `rows`.
 * This matches the chain used in the active-count endpoint.
 */
function makeCountSelectMock(rows: object[]) {
  const builder = {
    from:  vi.fn(),
    where: vi.fn(),
  };
  builder.where.mockResolvedValue(rows);
  builder.from.mockReturnValue(builder);
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  return builder;
}

const VENUE_A = "00000000-0000-0000-0000-000000000001";
const VENUE_B = "00000000-0000-0000-0000-000000000002";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/swipe-orders/active-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Authentication & authorization ─────────────────────────────────────────

  it("returns 401 when no user is authenticated", async () => {
    const app = buildApp(null);
    const res = await request(app).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for staff role", async () => {
    const user = { id: "s-uuid", email: "staff@test.com", role: "staff", venueId: VENUE_A };
    const app = buildApp(user);
    const res = await request(app).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for manager role", async () => {
    const user = { id: "m-uuid", email: "mgr@test.com", role: "manager", venueId: VENUE_A };
    const app = buildApp(user);
    const res = await request(app).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for patron role", async () => {
    const user = { id: "p-uuid", email: "patron@test.com", role: "patron", venueId: VENUE_A };
    const app = buildApp(user);
    const res = await request(app).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  // ── venue_owner ─────────────────────────────────────────────────────────────

  it("returns the correct count for a venue_owner scoped to their venue", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: VENUE_A };
    makeCountSelectMock([{ total: 3 }]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 3 });
  });

  it("returns count:0 when there are no pending orders for the venue", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: VENUE_A };
    makeCountSelectMock([{ total: 0 }]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0 });
  });

  it("returns count:0 (not an error) when venue_owner has no venueId in JWT", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: null };

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0 });
  });

  it("returns count:0 when the db result set is empty (total field missing)", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: VENUE_A };
    makeCountSelectMock([]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0 });
  });

  // ── admin role (same tenant isolation as venue_owner) ──────────────────────

  it("returns the correct count for admin role scoped to their venue", async () => {
    const user = { id: "a-uuid", email: "admin@test.com", role: "admin", venueId: VENUE_B };
    makeCountSelectMock([{ total: 7 }]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 7 });
  });

  // ── super_admin ─────────────────────────────────────────────────────────────

  it("super_admin with ?venueId= returns the count scoped to that venue", async () => {
    const user = { id: "su-uuid", email: "su@test.com", role: "super_admin", venueId: null };
    makeCountSelectMock([{ total: 5 }]);

    const res = await request(buildApp(user)).get(`/api/swipe-orders/active-count?venueId=${VENUE_A}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 5 });
  });

  it("super_admin without ?venueId= returns the global (unscoped) count", async () => {
    const user = { id: "su-uuid", email: "su@test.com", role: "super_admin", venueId: null };
    makeCountSelectMock([{ total: 42 }]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 42 });
  });

  it("super_admin with empty ?venueId= falls back to global (unscoped) count", async () => {
    const user = { id: "su-uuid", email: "su@test.com", role: "super_admin", venueId: null };
    makeCountSelectMock([{ total: 10 }]);

    const res = await request(buildApp(user)).get("/api/swipe-orders/active-count?venueId=");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 10 });
  });
});

// ── Scoping assertions — verify WHERE conditions ──────────────────────────────
//
// These tests confirm the route actually includes (or excludes) the venueId
// condition in the SQL WHERE clause, catching regressions where the right
// count is returned but via the wrong scope.

/** Extracts the flat list of `eq` calls from the single `and(...)` passed to `where`. */
function captureEqArgs(whereSpy: ReturnType<typeof vi.fn>) {
  type EqObj = { _tag: "eq"; col: unknown; val: unknown };
  type AndObj = { _tag: "and"; args: unknown[] };

  // where is called once; its first argument is the result of and(...)
  const whereArg = whereSpy.mock.calls[0]?.[0] as AndObj | undefined;
  if (!whereArg || whereArg._tag !== "and") return [];
  return (whereArg.args as EqObj[]).filter((a) => a._tag === "eq");
}

describe("GET /api/swipe-orders/active-count — WHERE condition scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("venue_owner: WHERE includes venueId = their venueId", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: VENUE_A };
    const { where } = makeCountSelectMock([{ total: 2 }]);

    await request(buildApp(user)).get("/api/swipe-orders/active-count");

    const eqArgs = captureEqArgs(where);
    // One of the eq conditions must be venueId = VENUE_A
    const venueCondition = eqArgs.find((a) => a.val === VENUE_A);
    expect(venueCondition).toBeDefined();
  });

  it("admin: WHERE includes venueId = their venueId", async () => {
    const user = { id: "a-uuid", email: "admin@test.com", role: "admin", venueId: VENUE_B };
    const { where } = makeCountSelectMock([{ total: 4 }]);

    await request(buildApp(user)).get("/api/swipe-orders/active-count");

    const eqArgs = captureEqArgs(where);
    const venueCondition = eqArgs.find((a) => a.val === VENUE_B);
    expect(venueCondition).toBeDefined();
  });

  it("super_admin with ?venueId=VENUE_A: WHERE includes venueId = VENUE_A", async () => {
    const user = { id: "su-uuid", email: "su@test.com", role: "super_admin", venueId: null };
    const { where } = makeCountSelectMock([{ total: 3 }]);

    await request(buildApp(user)).get(`/api/swipe-orders/active-count?venueId=${VENUE_A}`);

    const eqArgs = captureEqArgs(where);
    const venueCondition = eqArgs.find((a) => a.val === VENUE_A);
    expect(venueCondition).toBeDefined();
  });

  it("super_admin without ?venueId=: WHERE does NOT include any venueId condition", async () => {
    const user = { id: "su-uuid", email: "su@test.com", role: "super_admin", venueId: null };
    const { where } = makeCountSelectMock([{ total: 99 }]);

    await request(buildApp(user)).get("/api/swipe-orders/active-count");

    const eqArgs = captureEqArgs(where);
    // Only the status condition should be present; no venue UUID should appear
    const venueUuidCondition = eqArgs.find(
      (a) => typeof a.val === "string" && a.val.match(/^[0-9a-f-]{36}$/),
    );
    expect(venueUuidCondition).toBeUndefined();
  });

  it("WHERE always includes a status condition (pending-only filter)", async () => {
    const user = { id: "vo-uuid", email: "owner@test.com", role: "venue_owner", venueId: VENUE_A };
    const { where } = makeCountSelectMock([{ total: 1 }]);

    await request(buildApp(user)).get("/api/swipe-orders/active-count");

    expect(and as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    const eqArgs = captureEqArgs(where);
    const statusCondition = eqArgs.find((a) => a.val === "pending");
    expect(statusCondition).toBeDefined();
  });
});
