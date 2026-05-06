/**
 * systemValidation — one-click smoke test and validation history.
 *
 * GET  /api/admin/system-validation          — last 10 runs + live health summary
 * POST /api/admin/system-validation/run      — execute full smoke test (transaction rollback — safe)
 *
 * All write operations in POST /run execute inside a PostgreSQL transaction that is
 * deliberately rolled back via a sentinel throw. The only record that persists is the
 * system_validation_runs row itself (the audit trail). No production data is corrupted.
 */

import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "@workspace/db";
import {
  systemValidationRunsTable,
  experienceSessionsTable,
  sessionSwipesTable,
  experienceItemsTable,
  inventoryReservationsTable,
  swipeOrdersTable,
  swipeOrderItemsTable,
  analyticsEventsTable,
  orchestratorEventsTable,
  userTasteMemoryTable,
  type SystemCheckResult,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── GET / — last 10 runs + quick health check ────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const runs = await db
      .select()
      .from(systemValidationRunsTable)
      .orderBy(desc(systemValidationRunsTable.createdAt))
      .limit(10);

    // Quick system health: one COUNT per critical table (read-only)
    const health = await Promise.allSettled([
      db.execute(sql`SELECT 1 AS ok`).then(() => ({ system: "database",         status: "healthy" as const })),
      db.select({ c: sql<number>`count(*)::int` }).from(experienceSessionsTable).then(([r]) => ({ system: "swipe_engine",    status: (Number(r!.c) >= 0) ? "healthy" as const : "warning" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(experienceItemsTable).where(eq(experienceItemsTable.active, true)).then(([r]) => ({ system: "inventory",      status: Number(r!.c) > 0 ? "healthy" as const : "warning" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(userTasteMemoryTable).then(([r]) => ({ system: "memory_brain",    status: "healthy" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(swipeOrdersTable).then(([r]) => ({ system: "add_to_order",    status: "healthy" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(inventoryReservationsTable).then(([r]) => ({ system: "reservations",     status: "healthy" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(analyticsEventsTable).then(([r]) => ({ system: "analytics",        status: "healthy" as const, count: Number(r!.c) })),
      db.select({ c: sql<number>`count(*)::int` }).from(orchestratorEventsTable).then(([r]) => ({ system: "orchestrator",      status: "healthy" as const, count: Number(r!.c) })),
    ]);

    const healthResults = health.map((r, i) => {
      const NAMES = ["database","swipe_engine","inventory","memory_brain","add_to_order","reservations","analytics","orchestrator"];
      if (r.status === "fulfilled") return r.value;
      return { system: NAMES[i] ?? "unknown", status: "failed" as const, error: String(r.reason) };
    });

    res.json({ runs, health: healthResults, checkedAt: new Date().toISOString() });
  },
);

// ── POST /run — full transactional smoke test ─────────────────────────────────

const SENTINEL = "SMOKE_TEST_ROLLBACK";

router.post(
  "/run",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const checks: SystemCheckResult[] = [];
    const t0 = Date.now();

    function pushCheck(system: string, status: SystemCheckResult["status"], message: string, durationMs: number, detail?: string) {
      checks.push({ system, status, message, durationMs, ...(detail ? { detail } : {}) });
    }

    // ── 1. DB connectivity ────────────────────────────────────────────────────
    {
      const ts = Date.now();
      try {
        await db.execute(sql`SELECT 1`);
        pushCheck("db_connectivity", "passed", "Database responding", Date.now() - ts);
      } catch (e) {
        pushCheck("db_connectivity", "failed", String(e), Date.now() - ts);
        res.status(200).json({ status: "failed", summary: "DB unreachable — aborting", checks });
        return;
      }
    }

    // ── 2–13. Transaction block — always rolled back ──────────────────────────
    try {
      await db.transaction(async (tx) => {

        // 2. Start session
        let sessionId!: string;
        {
          const ts = Date.now();
          const [session] = await tx.insert(experienceSessionsTable).values({
            experienceType: "smoke",
            status:         "active",
          }).returning();
          sessionId = session!.id;
          pushCheck("start_session", "passed", `Session created: ${sessionId.slice(0, 8)}…`, Date.now() - ts);
        }

        // 3. Load swipe cards
        let demoItemId = "00000000-0000-0000-0000-000000000001";
        {
          const ts = Date.now();
          const items = await tx
            .select({ id: experienceItemsTable.id })
            .from(experienceItemsTable)
            .where(eq(experienceItemsTable.active, true))
            .limit(5);
          if (items.length > 0) demoItemId = items[0]!.id;
          pushCheck(
            "load_swipe_cards",
            items.length > 0 ? "passed" : "warning",
            `${items.length} active experience items found`,
            Date.now() - ts,
            items.length === 0 ? "No experience items in DB — add items to enable swipe engine" : undefined,
          );
        }

        // 4. Record add swipe
        {
          const ts = Date.now();
          await tx.insert(sessionSwipesTable).values({
            sessionId,
            itemId:         demoItemId,
            experienceType: "smoke",
            action:         "add",
            tags:           ["bold", "reserve"],
          });
          pushCheck("record_add_swipe", "passed", "Add swipe recorded (smoke → bold, reserve)", Date.now() - ts);
        }

        // 5. Record skip swipe
        {
          const ts = Date.now();
          await tx.insert(sessionSwipesTable).values({
            sessionId,
            itemId:         demoItemId,
            experienceType: "smoke",
            action:         "skip",
            tags:           ["mild"],
          });
          pushCheck("record_skip_swipe", "passed", "Skip swipe recorded (smoke → mild)", Date.now() - ts);
        }

        // 6. Memory brain (read access)
        {
          const ts = Date.now();
          const [sample] = await tx.select({ c: sql<number>`count(*)::int` }).from(userTasteMemoryTable);
          pushCheck("memory_brain", "passed", `Taste memory table accessible — ${sample!.c} rows`, Date.now() - ts);
        }

        // 7. Generate recommendation (score-ranked query)
        {
          const ts = Date.now();
          const top = await tx
            .select({ id: experienceItemsTable.id, score: experienceItemsTable.baseScore })
            .from(experienceItemsTable)
            .where(eq(experienceItemsTable.active, true))
            .orderBy(desc(experienceItemsTable.baseScore))
            .limit(3);
          pushCheck(
            "recommendation_engine",
            top.length > 0 ? "passed" : "warning",
            `Revenue Brain ranked ${top.length} items (top score: ${top[0]?.score ?? 0})`,
            Date.now() - ts,
          );
        }

        // 8. Validate inventory
        {
          const ts = Date.now();
          const [inv] = await tx.select({ c: sql<number>`count(*)::int` }).from(experienceItemsTable).where(eq(experienceItemsTable.active, true));
          pushCheck(
            "inventory_validation",
            Number(inv!.c) > 0 ? "passed" : "warning",
            `${inv!.c} active inventory items available`,
            Date.now() - ts,
          );
        }

        // 9. Create reservation
        let reservationId!: string;
        {
          const ts = Date.now();
          const [res2] = await tx.insert(inventoryReservationsTable).values({
            inventoryId: demoItemId,
            sessionId,
            quantity:    1,
            expiresAt:   new Date(Date.now() + 900_000),
          }).returning();
          reservationId = res2!.id;
          pushCheck("create_reservation", "passed", `Reservation created: ${reservationId.slice(0, 8)}…`, Date.now() - ts);
        }

        // 10. Add item to order
        let orderId!: string;
        {
          const ts = Date.now();
          const [order] = await tx.insert(swipeOrdersTable).values({
            sessionId,
            status: "pending",
          }).returning();
          orderId = order!.id;
          await tx.insert(swipeOrderItemsTable).values({
            orderId,
            inventoryId:   demoItemId,
            inventoryName: "Smoke Test Item",
            quantity:      1,
            priceCents:    1000,
            totalCents:    1000,
            craftType:     "smoke",
          });
          pushCheck("add_item_to_order", "passed", `Order ${orderId.slice(0, 8)}… + 1 line item`, Date.now() - ts);
        }

        // 11. Cancel order + release reservation
        {
          const ts = Date.now();
          await tx.update(swipeOrdersTable)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(swipeOrdersTable.id, orderId));
          await tx.update(inventoryReservationsTable)
            .set({ releasedAt: new Date() })
            .where(eq(inventoryReservationsTable.id, reservationId));
          pushCheck("cancel_and_release", "passed", "Order cancelled, reservation released", Date.now() - ts);
        }

        // 12. Analytics event
        {
          const ts = Date.now();
          await tx.insert(analyticsEventsTable).values({
            eventType: "craft_session",
            metadata:  { source: "smoke_test", ts: Date.now() },
          });
          pushCheck("analytics_event", "passed", "Analytics event (craft_session) written", Date.now() - ts);
        }

        // 13. Orchestrator event
        {
          const ts = Date.now();
          await tx.insert(orchestratorEventsTable).values({
            craftType:              "smoke",
            mood:                   "focused",
            pacing:                 "balanced",
            confidence:             80,
            premiumIntent:          50,
            socialEnergy:           40,
            recommendationPressure: 55,
            atmosphereIntensity:    65,
            avgSwipeMs:             1200,
            skipRatio:              "0.5",
            sessionDepth:           2,
          });
          pushCheck("orchestrator_event", "passed", "Orchestrator event written with full profile", Date.now() - ts);
        }

        // Always roll back — smoke test must not persist any writes
        throw new Error(SENTINEL);
      });
    } catch (e) {
      if (!(e instanceof Error) || e.message !== SENTINEL) {
        // Unexpected error during one of the checks
        const last = checks[checks.length - 1];
        pushCheck(
          last?.system ?? "unknown",
          "failed",
          e instanceof Error ? e.message : String(e),
          0,
          String(e),
        );
      }
      // SENTINEL throw = clean rollback, all good
    }

    // ── Compute overall status ────────────────────────────────────────────────
    const failed  = checks.filter(c => c.status === "failed").length;
    const warned  = checks.filter(c => c.status === "warning").length;
    const passed  = checks.filter(c => c.status === "passed").length;
    const overall = failed > 0 ? "failed" : warned > 0 ? "partial" : "passed";
    const elapsed = Date.now() - t0;
    const summary = `${passed} passed · ${warned} warning · ${failed} failed — ${elapsed}ms total`;

    req.log.info({ status: overall, passed, warned, failed, elapsed }, "smoke test completed");

    // Persist the audit record (this write is NOT inside the rolled-back tx)
    const [run] = await db.insert(systemValidationRunsTable).values({
      status:  overall,
      summary,
      details: checks,
      ranBy:   req.user?.id ?? undefined,
    }).returning();

    res.json({ run, checks, summary, status: overall, elapsed });
  },
);

export default router;
