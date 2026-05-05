/**
 * Demand Routes — track guest requests for out-of-stock products.
 *
 * POST /api/demand           — record a demand request (auth optional)
 * GET  /api/demand/:venueId  — get demand data for a venue (auth required, manager+)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, sql }                                      from "drizzle-orm";
import { db, demandRequestsTable }                            from "@workspace/db";
import { verifyToken }                                        from "../lib/jwt";
import { requireAuth, type AuthRequest }                      from "../middleware/auth";
import { requireRole }                                        from "../middleware/roles";
import { allowOnly }                                          from "../middleware/sanitize";

const router: IRouter = Router();

async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ── POST /api/demand ──────────────────────────────────────────────────────────

router.post(
  "/",
  allowOnly("productId", "productName", "category", "venueId", "sessionId"),
  async (req: Request, res: Response) => {
    const { productId, productName, category, venueId, sessionId } = req.body as {
      productId?:   string;
      productName?: string;
      category?:    string;
      venueId?:     string;
      sessionId?:   string;
    };

    if (!productId || typeof productId !== "string") {
      res.status(400).json({ error: '"productId" is required' });
      return;
    }

    // Respond immediately — never let tracking block the UI
    res.json({ ok: true });

    const userId = await tryGetUserId(req);

    db.insert(demandRequestsTable)
      .values({
        productId,
        productName: productName ?? undefined,
        category:    category    ?? undefined,
        venueId:     venueId     ?? undefined,
        userId:      userId      ?? undefined,
        sessionId:   sessionId   ?? undefined,
      })
      .catch((err) => {
        req.log.error({ err }, "Failed to persist demand request");
      });
  },
);

// ── GET /api/demand ───────────────────────────────────────────────────────────
// Returns recent demand requests scoped to the caller's venue (or all for super_admin).
router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user!.venueId;
    const limit   = Math.min(Number((req.query as Record<string, string>).limit ?? 50), 100);

    let rows;
    if (req.user!.role === "super_admin") {
      rows = await db
        .select()
        .from(demandRequestsTable)
        .orderBy(desc(demandRequestsTable.createdAt))
        .limit(limit);
    } else {
      if (!venueId) { res.status(403).json({ error: "No venue context" }); return; }
      rows = await db
        .select()
        .from(demandRequestsTable)
        .where(eq(demandRequestsTable.venueId, venueId))
        .orderBy(desc(demandRequestsTable.createdAt))
        .limit(limit);
    }

    res.json(rows);
  },
);

// ── GET /api/demand/:venueId ───────────────────────────────────────────────────

router.get(
  "/:venueId",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    const user        = req.user!;

    if (user.role !== "super_admin" && user.venueId !== venueId) {
      res.status(403).json({ error: "Access denied to this venue" });
      return;
    }

    // Aggregate by productId to get request counts
    const rows = await db.execute<{
      product_id:   string;
      product_name: string | null;
      category:     string | null;
      request_count: number;
      last_requested: string;
    }>(sql`
      SELECT
        product_id,
        MAX(product_name)                    AS product_name,
        MAX(category)                        AS category,
        cast(count(*) as integer)            AS request_count,
        MAX(created_at)::text                AS last_requested
      FROM  demand_requests
      WHERE (venue_id = ${venueId}::uuid OR venue_id IS NULL)
      GROUP BY product_id
      ORDER BY request_count DESC
      LIMIT 50
    `);

    const totalRequests = rows.rows?.reduce((s, r) => s + Number(r.request_count), 0) ?? 0;

    res.json({
      venueId,
      totalRequests,
      items: (rows.rows ?? []).map((r) => ({
        productId:     r.product_id,
        productName:   r.product_name ?? r.product_id,
        category:      r.category,
        requestCount:  Number(r.request_count),
        lastRequested: r.last_requested,
      })),
    });
  },
);

export default router;
