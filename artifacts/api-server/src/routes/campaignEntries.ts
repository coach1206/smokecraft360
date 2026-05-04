import { Router, type IRouter, type Response } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, campaignEntriesTable, campaignsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const entrySchema = z.object({
  style: z.string().min(1).max(200),
  score: z.number().int().min(0).max(10000).optional().default(0),
  answers: z.string().max(2000).optional(),
});

router.post(
  "/:id/enter",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const campaignId = String(req.params.id ?? "");
    if (!UUID_RE.test(campaignId)) {
      res.status(400).json({ error: "Invalid campaign id" });
      return;
    }

    const parse = entrySchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Valid style required", details: parse.error.format() });
      return;
    }

    const [campaign] = await db
      .select({ id: campaignsTable.id, status: campaignsTable.status, active: campaignsTable.active })
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    if (!campaign.active || campaign.status !== "active") {
      res.status(400).json({ error: "Campaign is not currently active" });
      return;
    }

    const userId = req.user!.id;
    const { style, score, answers } = parse.data;
    const venueId = req.user!.venueId ?? null;

    const [entry] = await db
      .insert(campaignEntriesTable)
      .values({
        campaignId,
        userId,
        venueId,
        style,
        score,
        answers: answers ?? null,
      })
      .returning();

    req.log.info({ campaignId, userId, entryId: entry.id }, "campaign entry submitted");

    await logAudit(req as any, {
      action: "campaign.entry_submitted",
      entityType: "campaign_entries",
      entityId: entry.id,
      after: { campaignId, style, score } as unknown as Record<string, unknown>,
    });

    res.status(201).json(entry);
  },
);

router.get(
  "/:id/leaderboard",
  async (req, res: Response) => {
    const campaignId = String(req.params.id ?? "");
    if (!UUID_RE.test(campaignId)) {
      res.status(400).json({ error: "Invalid campaign id" });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const rows = await db
      .select({
        id: campaignEntriesTable.id,
        userId: campaignEntriesTable.userId,
        style: campaignEntriesTable.style,
        score: campaignEntriesTable.score,
        createdAt: campaignEntriesTable.createdAt,
      })
      .from(campaignEntriesTable)
      .where(eq(campaignEntriesTable.campaignId, campaignId))
      .orderBy(desc(campaignEntriesTable.score))
      .limit(limit);

    const totalResult = await db.execute<{ cnt: number }>(
      sql`SELECT cast(count(*) as integer) AS cnt FROM campaign_entries WHERE campaign_id = ${campaignId}`,
    );
    const totalEntries = totalResult.rows[0]?.cnt ?? 0;

    res.json({
      campaignId,
      totalEntries,
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        ...r,
      })),
    });
  },
);

router.get(
  "/:id/entries",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const campaignId = String(req.params.id ?? "");
    if (!UUID_RE.test(campaignId)) {
      res.status(400).json({ error: "Invalid campaign id" });
      return;
    }

    const userId = req.user!.id;

    const myEntries = await db
      .select()
      .from(campaignEntriesTable)
      .where(
        sql`${campaignEntriesTable.campaignId} = ${campaignId} AND ${campaignEntriesTable.userId} = ${userId}`,
      )
      .orderBy(desc(campaignEntriesTable.createdAt));

    const totalResult = await db.execute<{ cnt: number }>(
      sql`SELECT cast(count(*) as integer) AS cnt FROM campaign_entries WHERE campaign_id = ${campaignId}`,
    );
    const totalEntries = totalResult.rows[0]?.cnt ?? 0;

    res.json({
      campaignId,
      totalEntries,
      myEntries,
    });
  },
);

export default router;
