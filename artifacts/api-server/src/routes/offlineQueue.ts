/**
 * Offline queue routes — replay kiosk actions captured while offline.
 *
 *   POST   /api/offline-queue/sync  — bulk replay (kiosk; auth optional)
 *   GET    /api/offline-queue       — list pending + recent (manager+)
 *   DELETE /api/offline-queue/:id   — drop a stuck row     (super_admin)
 *
 * The /sync handler is the only writer of new queue rows: a kiosk POSTs
 * the actions it has buffered, the server inserts them as `pending`,
 * dispatches each to the appropriate inline handler, then updates the
 * row to `synced` or `failed` with `attempts`/`lastError`. The unique
 * `idempotencyKey` guarantees that the same buffered action replayed
 * twice (e.g. spotty connection) collapses to a single insert and
 * returns the prior result.
 *
 * Currently dispatches: kind="order" → inserts into ordersTable.
 * Extensible by adding more cases to dispatchOne().
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, inArray, and, sql }                       from "drizzle-orm";
import {
  db, offlineQueueTable, ordersTable, venueInventoryTable, ndaSignaturesTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest }                     from "../middleware/auth";
import { requireRole }                                       from "../middleware/roles";
import { allowOnly }                                         from "../middleware/sanitize";
import { offlineSyncLimiter }                                from "../middleware/rateLimit";
import { checkLicenseForVenue }                              from "../middleware/license";

const router: IRouter = Router();

const UUID_RE      = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_KINDS  = ["order", "nda"] as const;
const MAX_BATCH    = 100;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const MAX_NDA_PAYLOAD_BYTES = 400 * 1024;

type Kind = (typeof VALID_KINDS)[number];

interface SyncItem {
  idempotencyKey: string;
  kind:           Kind;
  payload:        Record<string, unknown>;
  clientCreatedAt?: string;
}

interface SyncResult {
  idempotencyKey: string;
  status:         "synced" | "failed" | "duplicate";
  resultId?:      string;
  error?:         string;
}

// ── dispatch ─────────────────────────────────────────────────────────────────

/** Dispatch one queued action to its handler. Returns the new entity id.
 *  HIGH (architect fix): mirrors POST /api/orders security posture —
 *  payload.userId is IGNORED (orders replayed via the queue are guest
 *  orders unless the kiosk later attaches identity), and the venue's
 *  license is re-checked so a lapsed subscription cannot be bypassed
 *  by replaying queued actions after billing is suspended. */
async function dispatchOne(item: SyncItem): Promise<string> {
  switch (item.kind) {
    case "order": {
      const p = item.payload as {
        cigarId?:    string; cigarName?:  string;
        drinkId?:    string; drinkName?:  string;
        foodId?:     string; foodName?:   string;
        orderType?:  string; tableNumber?: string;
        venueId?:    string;
      };
      if (!p.orderType || !["table","pickup","delivery"].includes(p.orderType)) {
        throw new Error('payload.orderType must be one of: table, pickup, delivery');
      }
      if (!p.cigarId && !p.drinkId && !p.foodId) {
        throw new Error('payload requires at least one of cigarId, drinkId, foodId');
      }
      // HIGH (architect fix): re-check venue license before replay; a venue
      // that lapsed while the kiosk was offline must not be able to drain
      // its buffered orders into the system.
      if (p.venueId) {
        try {
          const lic = await checkLicenseForVenue(p.venueId);
          if (!lic.allowed) {
            throw new Error(`license_blocked:${lic.status}`);
          }
        } catch (err) {
          // Re-throw license-block errors; swallow internal license-check
          // failures so a transient DB blip doesn't strand a real order.
          if (err instanceof Error && err.message.startsWith("license_blocked:")) throw err;
        }
      }
      const [order] = await db.insert(ordersTable).values({
        // userId intentionally omitted (architect HIGH fix): client-supplied
        // userId is not trusted on this public endpoint.
        venueId:     p.venueId   ?? undefined,
        cigarId:     p.cigarId   ?? undefined,
        cigarName:   p.cigarName ?? undefined,
        drinkId:     p.drinkId   ?? undefined,
        drinkName:   p.drinkName ?? undefined,
        foodId:      p.foodId    ?? undefined,
        foodName:    p.foodName  ?? undefined,
        orderType:   p.orderType as "table"|"pickup"|"delivery",
        status:      "pending",
        tableNumber: p.tableNumber ?? undefined,
      }).returning({ id: ordersTable.id });

      // Best-effort inventory decrement (mirrors POST /api/orders behavior).
      if (p.venueId) {
        const ids = [p.cigarId, p.drinkId, p.foodId].filter((x): x is string => !!x);
        for (const productId of ids) {
          try {
            await db.update(venueInventoryTable).set({
              quantity:  sql`GREATEST(0, ${venueInventoryTable.quantity} - 1)`,
              updatedAt: new Date(),
            }).where(and(
              eq(venueInventoryTable.venueId,   p.venueId),
              eq(venueInventoryTable.productId, productId),
            ));
          } catch { /* non-fatal */ }
        }
      }
      return order!.id;
    }
    case "nda": {
      const p = item.payload as {
        fullName?:      string; initials?:      string;
        signatureData?: string; agreed?:        boolean;
        sessionId?:     string; deviceId?:      string;
        venueId?:       string; deviceType?:    string;
        ipAddress?:     string;
      };
      if (!p.fullName || !p.signatureData) {
        throw new Error("payload requires fullName and signatureData");
      }
      const [row] = await db.insert(ndaSignaturesTable).values({
        fullName:      p.fullName,
        initials:      p.initials ?? "",
        signatureData: p.signatureData,
        agreed:        p.agreed ?? true,
        ipAddress:     p.ipAddress ?? null,
        deviceType:    p.deviceType ?? null,
        sessionId:     p.sessionId ?? null,
        deviceId:      p.deviceId ?? null,
        venueId:       p.venueId ?? null,
      }).returning({ id: ndaSignaturesTable.id });
      return row!.id;
    }
  }
}

// ── POST /api/offline-queue/sync ─────────────────────────────────────────────

router.post(
  "/sync",
  offlineSyncLimiter, // HIGH (architect fix): dedicated tighter limiter for public-write sync
  allowOnly("items"),
  async (req: Request, res: Response) => {
    const items = (req.body as { items?: unknown }).items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: '"items" must be an array' }); return;
    }
    if (items.length === 0) { res.json({ results: [] }); return; }
    if (items.length > MAX_BATCH) {
      res.status(400).json({ error: `batch exceeds ${MAX_BATCH} items` }); return;
    }

    // Per-item validation pass (shape) before any DB write.
    const valid: SyncItem[] = [];
    const results: SyncResult[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") {
        results.push({ idempotencyKey: "", status: "failed", error: "item must be an object" }); continue;
      }
      const r = raw as Record<string, unknown>;
      const key = typeof r["idempotencyKey"] === "string" ? r["idempotencyKey"] : "";
      if (!UUID_RE.test(key)) {
        results.push({ idempotencyKey: key, status: "failed", error: "idempotencyKey must be a UUID" }); continue;
      }
      const kind = r["kind"];
      if (typeof kind !== "string" || !(VALID_KINDS as readonly string[]).includes(kind)) {
        results.push({ idempotencyKey: key, status: "failed", error: `kind must be one of: ${VALID_KINDS.join(", ")}` }); continue;
      }
      const payload = r["payload"];
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        results.push({ idempotencyKey: key, status: "failed", error: "payload must be an object" }); continue;
      }
      const maxBytes = kind === "nda" ? MAX_NDA_PAYLOAD_BYTES : MAX_PAYLOAD_BYTES;
      try {
        if (JSON.stringify(payload).length > maxBytes) {
          results.push({ idempotencyKey: key, status: "failed", error: `payload exceeds ${maxBytes / 1024}KB` }); continue;
        }
      } catch { results.push({ idempotencyKey: key, status: "failed", error: "payload not serializable" }); continue; }

      const clientTs = typeof r["clientCreatedAt"] === "string" ? new Date(r["clientCreatedAt"]) : null;
      valid.push({
        idempotencyKey: key,
        kind:           kind as Kind,
        payload:        payload as Record<string, unknown>,
        ...(clientTs && !Number.isNaN(clientTs.getTime()) ? { clientCreatedAt: r["clientCreatedAt"] as string } : {}),
      });
    }

    // Idempotency: find existing rows for these keys; collapse duplicates.
    const keys = valid.map(v => v.idempotencyKey);
    const existing = keys.length > 0
      ? await db.select({
          key:       offlineQueueTable.idempotencyKey,
          status:    offlineQueueTable.status,
          resultId:  offlineQueueTable.resultId,
          lastError: offlineQueueTable.lastError,
        }).from(offlineQueueTable).where(inArray(offlineQueueTable.idempotencyKey, keys))
      : [];
    const existingByKey = new Map(existing.map(e => [e.key, e]));

    const deviceId = typeof req.headers["x-device-id"] === "string"
      ? (req.headers["x-device-id"] as string) : null;

    for (const item of valid) {
      const prior = existingByKey.get(item.idempotencyKey);
      if (prior?.status === "synced") {
        // Already replayed → return the prior result, no re-dispatch.
        results.push({
          idempotencyKey: item.idempotencyKey,
          status:         "duplicate",
          ...(prior.resultId ? { resultId: prior.resultId } : {}),
        });
        continue;
      }

      // ── CRITICAL (architect fix): atomic claim before dispatch ─────────
      // The original code used onConflictDoNothing then dispatched whether
      // insert succeeded or not, allowing two concurrent sync calls with
      // the same idempotencyKey to BOTH dispatch (double-charge race).
      //
      // New flow (one of three exclusive paths):
      //   1. INSERT ... ON CONFLICT DO NOTHING — if it inserts, we own
      //      the row in `pending` and can proceed to dispatch.
      //   2. INSERT skipped (row already exists) → atomic claim via
      //      UPDATE ... WHERE status='failed' → only succeeds if the row
      //      is currently in 'failed' (a retry is allowed). Returns the
      //      now-claimed row.
      //   3. Neither succeeded → another worker is mid-flight on the
      //      same key (status='pending'); return in_progress, don't
      //      double-dispatch.
      const venueId = typeof (item.payload as { venueId?: unknown }).venueId === "string"
        ? (item.payload as { venueId?: string }).venueId ?? null : null;

      let claimed = false;
      let inserted: { id: string } | undefined;
      try {
        const [row] = await db.insert(offlineQueueTable).values({
          idempotencyKey:   item.idempotencyKey,
          deviceId,
          venueId,
          kind:             item.kind,
          payload:          item.payload,
          status:           "pending",
          attempts:         1,
          ...(item.clientCreatedAt ? { clientCreatedAt: new Date(item.clientCreatedAt) } : {}),
        }).onConflictDoNothing({ target: offlineQueueTable.idempotencyKey })
          .returning({ id: offlineQueueTable.id });
        inserted = row;
      } catch (err) {
        results.push({
          idempotencyKey: item.idempotencyKey,
          status:         "failed",
          error:          err instanceof Error ? err.message : "queue insert failed",
        });
        continue;
      }

      if (inserted) {
        claimed = true;
      } else {
        // Row exists. Try to atomically transition failed → pending so we
        // can retry. This UPDATE is the single point of mutual exclusion
        // between concurrent sync workers.
        const claimedRows = await db.update(offlineQueueTable).set({
          status:   "pending",
          attempts: sql`${offlineQueueTable.attempts} + 1`,
        }).where(and(
          eq(offlineQueueTable.idempotencyKey, item.idempotencyKey),
          eq(offlineQueueTable.status, "failed"),
        )).returning({ id: offlineQueueTable.id });
        claimed = claimedRows.length > 0;

        if (!claimed) {
          // Either another worker is mid-flight (status='pending'), or
          // the row already synced between our SELECT and now — re-read
          // and return the most accurate status.
          const [now] = await db.select({
            status:   offlineQueueTable.status,
            resultId: offlineQueueTable.resultId,
          }).from(offlineQueueTable)
            .where(eq(offlineQueueTable.idempotencyKey, item.idempotencyKey)).limit(1);
          if (now?.status === "synced") {
            results.push({
              idempotencyKey: item.idempotencyKey,
              status:         "duplicate",
              ...(now.resultId ? { resultId: now.resultId } : {}),
            });
          } else {
            results.push({
              idempotencyKey: item.idempotencyKey,
              status:         "failed",
              error:          "in_progress: another sync worker is processing this key",
            });
          }
          continue;
        }
      }

      // We own the row (status='pending'). Dispatch.
      try {
        const resultId = await dispatchOne(item);
        await db.update(offlineQueueTable).set({
          status: "synced", resultId, syncedAt: new Date(), lastError: null,
        }).where(eq(offlineQueueTable.idempotencyKey, item.idempotencyKey));
        results.push({ idempotencyKey: item.idempotencyKey, status: "synced", resultId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "dispatch failed";
        await db.update(offlineQueueTable).set({
          status: "failed", lastError: msg,
        }).where(eq(offlineQueueTable.idempotencyKey, item.idempotencyKey));
        results.push({ idempotencyKey: item.idempotencyKey, status: "failed", error: msg });
        req.log?.warn({ err, kind: item.kind }, "offline-queue dispatch failed");
      }
    }

    res.json({ results });
  },
);

// ── GET /api/offline-queue (manager+) ────────────────────────────────────────

router.get(
  "/",
  requireAuth, requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const rawStatus = String(req.query["status"] ?? "");
    const limit     = Math.min(200, Math.max(1, Number(req.query["limit"] ?? 50) || 50));
    const conds = [];
    if (rawStatus && ["pending","synced","failed"].includes(rawStatus)) {
      conds.push(eq(offlineQueueTable.status, rawStatus));
    }
    // Tenant scope: non-super sees only their venue.
    if (req.user!.role !== "super_admin" && req.user!.venueId) {
      conds.push(eq(offlineQueueTable.venueId, req.user!.venueId));
    }
    const rows = conds.length > 0
      ? await db.select().from(offlineQueueTable).where(and(...conds)).orderBy(desc(offlineQueueTable.createdAt)).limit(limit)
      : await db.select().from(offlineQueueTable).orderBy(desc(offlineQueueTable.createdAt)).limit(limit);
    res.json({ items: rows });
  },
);

// ── DELETE /api/offline-queue/:id (super_admin) ──────────────────────────────

router.delete(
  "/:id",
  requireAuth, requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const deleted = await db.delete(offlineQueueTable)
      .where(eq(offlineQueueTable.id, id)).returning({ id: offlineQueueTable.id });
    if (deleted.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ deleted: deleted[0]!.id });
  },
);

export default router;
