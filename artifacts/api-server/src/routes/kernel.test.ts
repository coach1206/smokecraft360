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
    transaction: vi.fn(),
  },
  kernelModulesTable: { slug: "slug", id: "id", registeredAt: "registeredAt" },
  kernelModeConfigTable: { venueId: "venue_id", mode: "mode", updatedAt: "updated_at", updatedBy: "updated_by" },
  telemetryEventsTable: {},
  kernelModuleAuditLogTable: {},
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

/**
 * Chainable drizzle-like select mock for routes that use
 * select → from → orderBy → limit (e.g. telemetry/recent).
 */
function makeOrderedSelectMock(rows: object[]) {
  const builder = {
    from: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  builder.limit.mockResolvedValue(rows);
  builder.orderBy.mockReturnValue(builder);
  builder.from.mockReturnValue(builder);
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  return builder;
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

describe("PATCH /api/kernel/modules/:id — duplicate-slug rejection", () => {
  const MODULE_ID = "00000000-0000-0000-0000-000000000010";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };
  });

  it("returns 409 with { error: 'Slug already in use', field: 'slug' } when renaming to an already-taken slug", async () => {
    const pgError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    (db.transaction as ReturnType<typeof vi.fn>).mockRejectedValue(pgError);

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/modules/${MODULE_ID}`)
      .send({ slug: "already-taken" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Slug already in use", field: "slug" });
  });

  it("returns 200 when PATCHing a module with its own current slug (self-rename / excludeId scenario)", async () => {
    const existingModule = { id: MODULE_ID, name: "My Module", slug: "my-module", craftType: "smoke" };
    const updatedModule  = { ...existingModule };

    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: object) => Promise<unknown>) => {
        const txSelectBuilder = {
          from:  vi.fn(),
          where: vi.fn(),
          limit: vi.fn(),
        };
        txSelectBuilder.limit.mockResolvedValue([existingModule]);
        txSelectBuilder.where.mockReturnValue(txSelectBuilder);
        txSelectBuilder.from.mockReturnValue(txSelectBuilder);

        const txUpdateBuilder = {
          set:       vi.fn(),
          where:     vi.fn(),
          returning: vi.fn(),
        };
        txUpdateBuilder.returning.mockResolvedValue([updatedModule]);
        txUpdateBuilder.where.mockReturnValue(txUpdateBuilder);
        txUpdateBuilder.set.mockReturnValue(txUpdateBuilder);

        const txInsertBuilder = {
          values: vi.fn().mockResolvedValue([{}]),
        };

        const tx = {
          select:  vi.fn().mockReturnValue(txSelectBuilder),
          update:  vi.fn().mockReturnValue(txUpdateBuilder),
          insert:  vi.fn().mockReturnValue(txInsertBuilder),
        };

        return callback(tx);
      },
    );

    const app = buildApp();
    const res = await request(app)
      .patch(`/api/kernel/modules/${MODULE_ID}`)
      .send({ slug: "my-module" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("module");
    expect(res.body.module).toMatchObject({ slug: "my-module" });
  });
});

/** Chainable drizzle-like update mock for DELETE (soft-delete) path. */
function makeUpdateMock(rows: object[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set });
}

/**
 * Mock for GET /modules/:id/history which issues two sequential selects:
 *   1. count query  — resolves with [{ total: N }]
 *   2. entries query — resolves with the given rows
 */
function makeHistorySelectMock(total: number, entries: object[]) {
  const countBuilder = {
    from: vi.fn(),
    where: vi.fn(),
  };
  countBuilder.where.mockResolvedValue([{ total }]);
  countBuilder.from.mockReturnValue(countBuilder);

  const entriesBuilder = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  entriesBuilder.offset.mockResolvedValue(entries);
  entriesBuilder.limit.mockReturnValue(entriesBuilder);
  entriesBuilder.orderBy.mockReturnValue(entriesBuilder);
  entriesBuilder.where.mockReturnValue(entriesBuilder);
  entriesBuilder.from.mockReturnValue(entriesBuilder);

  (db.select as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(countBuilder)
    .mockReturnValueOnce(entriesBuilder);
}

// ── DELETE /api/kernel/modules/:id ────────────────────────────────────────────

describe("DELETE /api/kernel/modules/:id — soft-delete", () => {
  const MODULE_ID = "00000000-0000-0000-0000-000000000020";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };
  });

  it("returns 204 when a valid module UUID is soft-deleted", async () => {
    makeUpdateMock([{ id: MODULE_ID }]);

    const app = buildApp();
    const res = await request(app).delete(`/api/kernel/modules/${MODULE_ID}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it("returns 404 when the UUID does not match any active module", async () => {
    makeUpdateMock([]);

    const app = buildApp();
    const res = await request(app).delete(`/api/kernel/modules/${MODULE_ID}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for manager role", async () => {
    mockUser = { id: "mgr-uuid", email: "mgr@test.com", role: "manager", name: "Manager", venueId: null };

    const app = buildApp();
    const res = await request(app).delete(`/api/kernel/modules/${MODULE_ID}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for staff role", async () => {
    mockUser = { id: "staff-uuid", email: "staff@test.com", role: "staff", name: "Staff", venueId: null };

    const app = buildApp();
    const res = await request(app).delete(`/api/kernel/modules/${MODULE_ID}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when id is not a valid UUID", async () => {
    const app = buildApp();
    const res = await request(app).delete("/api/kernel/modules/not-a-uuid");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 500 when the database update fails", async () => {
    const returning = vi.fn().mockRejectedValue(new Error("db failure"));
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set });

    const app = buildApp();
    const res = await request(app).delete(`/api/kernel/modules/${MODULE_ID}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

// ── GET /api/kernel/modules/:id/history ───────────────────────────────────────

describe("GET /api/kernel/modules/:id/history — audit log", () => {
  const MODULE_ID = "00000000-0000-0000-0000-000000000030";

  const SAMPLE_ENTRY = {
    id: "audit-uuid-1",
    moduleId: MODULE_ID,
    changedBy: "admin@test.com",
    changedAt: "2026-05-15T10:00:00.000Z",
    diff: { name: { before: "Old Name", after: "New Name" } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "admin-uuid", email: "admin@test.com", role: "super_admin", name: "Admin", venueId: null };
  });

  it("returns 200 with history array and pagination metadata", async () => {
    makeHistorySelectMock(1, [SAMPLE_ENTRY]);

    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("history");
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history).toHaveLength(1);
    expect(res.body).toHaveProperty("total", 1);
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("totalPages", 1);
  });

  it("returns 200 with an empty history array when no audit entries exist", async () => {
    makeHistorySelectMock(0, []);

    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history`);

    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("returns 403 for manager role", async () => {
    mockUser = { id: "mgr-uuid", email: "mgr@test.com", role: "manager", name: "Manager", venueId: null };

    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 403 for staff role", async () => {
    mockUser = { id: "staff-uuid", email: "staff@test.com", role: "staff", name: "Staff", venueId: null };

    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when id is not a valid UUID", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/kernel/modules/not-a-uuid/history");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when limit is out of range", async () => {
    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history?limit=99`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when page is not a positive integer", async () => {
    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history?page=0`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 500 when the database query fails", async () => {
    const failBuilder = {
      from: vi.fn(),
      where: vi.fn(),
    };
    failBuilder.where.mockRejectedValue(new Error("db failure"));
    failBuilder.from.mockReturnValue(failBuilder);
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(failBuilder);

    const app = buildApp();
    const res = await request(app).get(`/api/kernel/modules/${MODULE_ID}/history`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/kernel/telemetry/recent — payload field inclusion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const SAMPLE_EVENT = {
    id: "evt-uuid-1",
    eventType: "swipe_start",
    moduleId: "mod-uuid-1",
    venueId: VENUE_A,
    occurredAt: "2026-05-15T10:00:00.000Z",
    payload: { craftType: "smoke", userId: "u1" },
  };

  it("returns 200 with events array that includes the payload field", async () => {
    makeOrderedSelectMock([SAMPLE_EVENT]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/telemetry/recent");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("events");
    expect(Array.isArray(res.body.events)).toBe(true);
    const evt = res.body.events[0] as typeof SAMPLE_EVENT;
    expect(evt).toHaveProperty("payload");
    expect(evt.payload).toEqual({ craftType: "smoke", userId: "u1" });
  });

  it("returns an empty events array when there are no rows", async () => {
    makeOrderedSelectMock([]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/telemetry/recent");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: [] });
  });

  it("includes all five core fields alongside payload", async () => {
    makeOrderedSelectMock([SAMPLE_EVENT]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/telemetry/recent?limit=1");

    expect(res.status).toBe(200);
    const evt = res.body.events[0] as typeof SAMPLE_EVENT;
    expect(evt).toMatchObject({
      id: "evt-uuid-1",
      eventType: "swipe_start",
      moduleId: "mod-uuid-1",
      venueId: VENUE_A,
      occurredAt: "2026-05-15T10:00:00.000Z",
      payload: { craftType: "smoke", userId: "u1" },
    });
  });

  it("returns null payload without throwing when payload is null", async () => {
    makeOrderedSelectMock([{ ...SAMPLE_EVENT, payload: null }]);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/telemetry/recent");

    expect(res.status).toBe(200);
    expect(res.body.events[0].payload).toBeNull();
  });

  it("returns 500 when the database query fails", async () => {
    const builder = {
      from: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
    };
    builder.limit.mockRejectedValue(new Error("db error"));
    builder.orderBy.mockReturnValue(builder);
    builder.from.mockReturnValue(builder);
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue(builder);

    const app = buildApp();
    const res = await request(app).get("/api/kernel/telemetry/recent");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});
