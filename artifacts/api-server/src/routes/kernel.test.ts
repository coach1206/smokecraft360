/**
 * kernel routes — duplicate-slug rejection coverage + kernel mode authorization
 *
 * Tests:
 *  - 409 path on POST /api/kernel/modules
 *  - slug availability check on GET /api/kernel/modules?slug=
 *  - PATCH /api/kernel/mode/:venueId role-based access control:
 *      super_admin → any venue allowed
 *      venue_owner → own venue allowed, other venue rejected (403)
 *      other roles → rejected (403)
 *
 * All paths use mocked db calls so no real database is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── Module mocks (hoisted before any imports of the mocked modules) ───────────

// Mutable user so individual tests can override role/venueId
let mockUser: object = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  kernelModulesTable: { slug: "slug", id: "id", registeredAt: "registeredAt" },
  kernelModeConfigTable: { venueId: "venue_id", mode: "mode", updatedAt: "updated_at", updatedBy: "updated_by" },
  telemetryEventsTable: {},
}));

vi.mock("../middleware/auth", () => ({
  requireAuth: (
    req: express.Request & { user?: object },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = mockUser;
    next();
  },
}));

vi.mock("../lib/jwt", () => ({
  verifyToken: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { db } from "@workspace/db";
import kernelRouter from "./kernel";

// ── App fixture ───────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/kernel", kernelRouter);
  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Chainable drizzle-like select mock that resolves `rows` at the final call. */
function makeSelectMock(rows: object[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  builder.limit.mockResolvedValue(rows);
  builder.where.mockReturnValue(builder);
  builder.from.mockReturnValue(builder);
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  return builder;
}

/** Chainable drizzle-like insert mock. */
function makeInsertMock(result: object | Error) {
  const returning = vi.fn();
  if (result instanceof Error) {
    returning.mockRejectedValue(result);
  } else {
    returning.mockResolvedValue([result]);
  }
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ returning, onConflictDoUpdate });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values });
}

/** Minimal valid module payload. */
function modulePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Module",
    slug: "test-module",
    craftType: "smoke",
    ...overrides,
  };
}

const VENUE_A = "00000000-0000-0000-0000-000000000001";
const VENUE_B = "00000000-0000-0000-0000-000000000002";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/kernel/modules — duplicate-slug rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };
  });

  it("returns 201 on the first insert", async () => {
    makeInsertMock({ id: "mod-uuid-1", slug: "test-module", name: "Test Module" });

    const app = buildApp();
    const res = await request(app)
      .post("/api/kernel/modules")
      .send(modulePayload());

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("module");
  });

  it("returns 409 with { error: 'Slug already in use', field: 'slug' } when the db raises a unique-constraint violation (code 23505)", async () => {
    const pgError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    makeInsertMock(pgError);

    const app = buildApp();
    const res = await request(app)
      .post("/api/kernel/modules")
      .send(modulePayload());

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Slug already in use", field: "slug" });
  });

  it("returns 500 for other database errors", async () => {
    makeInsertMock(new Error("connection lost"));

    const app = buildApp();
    const res = await request(app)
      .post("/api/kernel/modules")
      .send(modulePayload());

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).not.toBe("Slug already in use");
  });
});

describe("GET /api/kernel/modules?slug= — availability check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };
  });

  it("returns { available: false } when the slug is already taken", async () => {
    makeSelectMock([{ id: "mod-uuid-existing" }]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/modules?slug=test-module");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: false });
  });

  it("returns { available: true } when the slug is not taken", async () => {
    makeSelectMock([]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/modules?slug=brand-new-slug");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });
  });

  it("returns { available: true } for a slug that exists only on the excluded module (edit-self scenario)", async () => {
    makeSelectMock([]);

    const app = buildApp();
    const res = await request(app).get(
      "/api/kernel/modules?slug=test-module&excludeId=00000000-0000-0000-0000-000000000001",
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ available: true });
  });

  it("returns 400 when excludeId is not a valid UUID", async () => {
    const app = buildApp();
    const res = await request(app).get(
      "/api/kernel/modules?slug=test-module&excludeId=not-a-uuid",
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "excludeId must be a valid UUID");
  });
});

describe("PATCH /api/kernel/mode/:venueId — role-based access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("super_admin can update any venue", async () => {
    mockUser = { id: "su-uuid", email: "su@test.com", role: "super_admin", name: "SU", venueId: null };
    makeInsertMock({ venueId: VENUE_A, mode: "essential", updatedAt: new Date().toISOString() });

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "essential" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mode", "essential");
  });

  it("super_admin can update a venue they do not own", async () => {
    mockUser = { id: "su-uuid", email: "su@test.com", role: "super_admin", name: "SU", venueId: VENUE_B };
    makeInsertMock({ venueId: VENUE_A, mode: "sovereign", updatedAt: new Date().toISOString() });

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "sovereign" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mode", "sovereign");
  });

  it("venue_owner can update their own venue", async () => {
    mockUser = { id: "vo-uuid", email: "vo@test.com", role: "venue_owner", name: "Owner", venueId: VENUE_A };
    makeInsertMock({ venueId: VENUE_A, mode: "essential", updatedAt: new Date().toISOString() });

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "essential" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mode", "essential");
  });

  it("venue_owner is rejected when targeting a different venue (403)", async () => {
    mockUser = { id: "vo-uuid", email: "vo@test.com", role: "venue_owner", name: "Owner", venueId: VENUE_A };

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_B}`)
      .send({ mode: "essential" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("manager role is rejected with 403", async () => {
    mockUser = { id: "mgr-uuid", email: "mgr@test.com", role: "manager", name: "Manager", venueId: VENUE_A };

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "essential" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("staff role is rejected with 403", async () => {
    mockUser = { id: "staff-uuid", email: "staff@test.com", role: "staff", name: "Staff", venueId: VENUE_A };

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "sovereign" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when mode value is invalid", async () => {
    mockUser = { id: "su-uuid", email: "su@test.com", role: "super_admin", name: "SU", venueId: null };

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/mode/${VENUE_A}`)
      .send({ mode: "premium" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
