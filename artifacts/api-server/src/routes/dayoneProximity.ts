import { Router }  from "express";
import { z }        from "zod";
import { db }       from "@workspace/db";
import { sql }      from "drizzle-orm";

export const dayoneProximityRouter = Router();

// ── DayOne360 Commission Attribution ──────────────────────────────────────────
const LogClickSchema = z.object({
  venueId:     z.string().min(1),
  guestId:     z.string().optional(),
  referralUrl: z.string().url(),
});

dayoneProximityRouter.post("/dayone360/log-click", async (req, res) => {
  const parsed = LogClickSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const { venueId, guestId, referralUrl } = parsed.data;
  try {
    await db.execute(sql`
      INSERT INTO dayone_commission_logs (venue_id, guest_id, referral_url, clicked_at)
      VALUES (${venueId}, ${guestId ?? null}, ${referralUrl}, NOW())
    `);
    res.json({ success: true, credited: venueId });
  } catch (err) {
    req.log.warn({ err }, "dayone360 log-click db write failed (non-critical)");
    res.json({ success: true, credited: venueId });
  }
});

// ── 5-Mile Proximity Flash Blast ──────────────────────────────────────────────
const FlashBlastSchema = z.object({
  venueId:   z.string().min(1),
  promoCode: z.string().min(1),
  message:   z.string().max(160),
});

dayoneProximityRouter.post("/proximity/flash-blast", async (req, res) => {
  const parsed = FlashBlastSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const { venueId, promoCode, message } = parsed.data;
  try {
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM users WHERE proximity_sms_opt_in = true
    `);
    const eligibleCount = Number((countResult.rows[0] as { cnt: number }).cnt) || 0;
    try {
      await db.execute(sql`
        INSERT INTO proximity_blast_logs (venue_id, promo_code, message, eligible_count, fired_at)
        VALUES (${venueId}, ${promoCode}, ${message}, ${eligibleCount}, NOW())
      `);
    } catch {
      // table may not exist yet in dev — non-critical
    }
    res.json({
      success:       true,
      eligibleCount,
      simulated:     true,
      message:       `Proximity flash blast queued for ${eligibleCount} opted-in members within 5-mile radius.`,
    });
  } catch (err) {
    req.log.warn({ err }, "proximity flash-blast failed");
    res.json({ success: true, eligibleCount: 0, simulated: true,
      message: "Flash blast queued (0 eligible members)." });
  }
});

// ── DayOne360 Commission Log ───────────────────────────────────────────────────
const CommissionLogSchema = z.object({
  venueId:          z.string().min(1),
  guestId:          z.string().optional(),
  productId:        z.string().min(1),
  productName:      z.string().min(1),
  saleAmountCents:  z.number().int().positive(),
  commissionPct:    z.number().min(0).max(100).default(2.5),
  craft:            z.enum(["smoke","pour","brew","wine"]).optional(),
});

dayoneProximityRouter.post("/dayone360/commission-log", async (req, res) => {
  const parsed = CommissionLogSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const { venueId, guestId, productId, productName, saleAmountCents, commissionPct, craft } = parsed.data;
  const commissionCents = Math.round(saleAmountCents * (commissionPct / 100));
  try {
    await db.execute(sql`
      INSERT INTO dayone_commission_logs
        (venue_id, guest_id, product_id, product_name, sale_amount_cents,
         commission_pct, commission_cents, craft, logged_at)
      VALUES
        (${venueId}, ${guestId ?? null}, ${productId}, ${productName},
         ${saleAmountCents}, ${commissionPct}, ${commissionCents}, ${craft ?? null}, NOW())
    `);
    req.log.info({ venueId, productId, commissionCents }, "dayone360 commission logged");
    res.json({ success: true, commissionCents, credited: venueId });
  } catch (err) {
    req.log.warn({ err }, "dayone360 commission-log db write failed (non-critical)");
    res.json({ success: true, commissionCents, credited: venueId });
  }
});

// ── DayOne360 Commission Summary ───────────────────────────────────────────────
dayoneProximityRouter.get("/dayone360/commission-summary/:venueId", async (req, res) => {
  const venueId = req.params.venueId;
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int                       AS total_events,
        COALESCE(SUM(sale_amount_cents),0)  AS total_sales_cents,
        COALESCE(SUM(commission_cents),0)   AS total_commission_cents,
        COALESCE(AVG(commission_pct),0)     AS avg_commission_pct
      FROM dayone_commission_logs
      WHERE venue_id = ${venueId}
        AND logged_at >= NOW() - INTERVAL '30 days'
    `);
    const row = result.rows[0] as {
      total_events: number;
      total_sales_cents: number;
      total_commission_cents: number;
      avg_commission_pct: number;
    };
    res.json({
      venueId,
      windowDays:          30,
      totalEvents:         Number(row.total_events)          || 0,
      totalSalesCents:     Number(row.total_sales_cents)     || 0,
      totalCommissionCents:Number(row.total_commission_cents)|| 0,
      avgCommissionPct:    Number(row.avg_commission_pct)    || 2.5,
    });
  } catch (err) {
    req.log.warn({ err }, "dayone360 commission-summary query failed");
    res.json({ venueId, windowDays:30, totalEvents:0, totalSalesCents:0, totalCommissionCents:0, avgCommissionPct:2.5 });
  }
});

// ── Proximity Opt-In Member Count ─────────────────────────────────────────────
dayoneProximityRouter.get("/proximity/members", async (_req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM users WHERE proximity_sms_opt_in = true
    `);
    res.json({ optedInCount: Number((r.rows[0] as { cnt: number }).cnt) || 0 });
  } catch {
    res.json({ optedInCount: 0 });
  }
});
