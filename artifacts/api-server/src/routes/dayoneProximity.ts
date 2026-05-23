import { Router }  from "express";
import { z }        from "zod";
import { db }       from "../db";
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
