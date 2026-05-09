/**
 * Sovereign Order — Bespoke Cigar Design Gateway
 *
 * POST /api/sovereign-order
 *   Accepts a fully-resolved bespoke cigar design from the frontend
 *   finalizeOrder() call and fires a formatted email to the artisan.
 *   Fields: guestName, woodType, bandStyle, customLogoUrl, harmonyScore
 *
 *   Guest-accessible — no auth required (kiosk-facing endpoint).
 *   Returns { success: true, orderId } regardless of email delivery so
 *   the guest UI always receives confirmation.
 */

import { Router } from "express";
import { z }      from "zod";
import { sendEmail } from "../services/email";

const router = Router();

// ── Schema ──────────────────────────────────────────────────────────────────────
const SovereignOrderSchema = z.object({
  guestName:      z.string().max(80).optional(),
  woodType:       z.string().max(60).optional(),
  bandStyle:      z.string().max(80).optional(),
  customLogoUrl:  z.string().url().max(500).optional().or(z.literal("")),
  harmonyScore:   z.number().min(0).max(100).optional(),
  notes:          z.string().max(400).optional(),
});

// ── POST /api/sovereign-order ───────────────────────────────────────────────────
router.post("/sovereign-order", async (req, res) => {
  const parsed = SovereignOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
    return;
  }

  const order   = parsed.data;
  const orderId = `SOV-${Date.now().toString(36).toUpperCase()}`;
  const ts      = new Date().toLocaleString("en-US", {
    timeZone:  "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });

  req.log.info(
    { orderId, guestName: order.guestName, woodType: order.woodType, harmonyScore: order.harmonyScore },
    "sovereign-order received",
  );

  const result = await sendEmail({
    to:      "jc@360enterprisesservices.com",
    subject: `◈ SOVEREIGN ORDER: Bespoke Cigar Design — ${orderId}`,
    html:    buildEmail({ ...order, orderId, ts }),
  });

  if (!result.sent) {
    req.log.warn({ orderId, reason: result.reason }, "sovereign-order email not delivered — check SENDGRID_FROM_EMAIL");
  }

  res.json({ success: true, orderId });
});

// ── HTML email builder ──────────────────────────────────────────────────────────
function buildEmail(o: {
  orderId:        string;
  ts:             string;
  guestName?:     string;
  woodType?:      string;
  bandStyle?:     string;
  customLogoUrl?: string;
  harmonyScore?:  number;
  notes?:         string;
}): string {
  const score       = o.harmonyScore ?? 0;
  const scoreColor  = score >= 80 ? "#4ade80" : score >= 55 ? "#D4AF37" : "#f87171";
  const scoreLabel  = score >= 80 ? "EXCEPTIONAL MATCH" : score >= 55 ? "STRONG HARMONY" : "DEVELOPING PROFILE";

  const rows: [string, string][] = [
    ["Order Reference",  `<span style="color:#D4AF37;letter-spacing:.18em">${o.orderId}</span>`],
    ["Submitted",        o.ts],
    ["Guest",            o.guestName || "— (Anonymous)"],
    ["Wood Selection",   o.woodType  || "—"],
    ["Band Concept",     o.bandStyle || "—"],
    ["Custom Logo",      o.customLogoUrl
      ? `<a href="${o.customLogoUrl}" style="color:#D4AF37">View Uploaded Asset ›</a>`
      : "None"],
    ["EEIS Harmony",     `<span style="color:${scoreColor};font-weight:700;letter-spacing:.12em">${score}% — ${scoreLabel}</span>`],
    ...(o.notes ? [["Special Instructions", o.notes] as [string, string]] : []),
  ];

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid #D4AF3720;
                 color:#D4AF3770;font-size:9px;letter-spacing:.18em;
                 text-transform:uppercase;vertical-align:top;
                 padding-right:20px;white-space:nowrap">${label}</td>
      <td style="padding:11px 0;border-bottom:1px solid #D4AF3720;
                 color:#F5F2ED;font-size:13px;letter-spacing:.04em">${value}</td>
    </tr>`).join("");

  const scoreFill = Math.round(score * 3.4); // 0–340px bar width

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sovereign Order — ${o.orderId}</title>
</head>
<body style="margin:0;padding:0;background:#0A0908;font-family:'Courier New',Courier,monospace">
  <div style="max-width:580px;margin:0 auto;padding:40px 28px">

    <!-- Header -->
    <div style="text-align:center;padding-bottom:28px;border-bottom:1px solid #D4AF3730">
      <div style="display:inline-block;background:#D4AF3714;border:1px solid #D4AF3770;
                  color:#D4AF37;font-size:9px;letter-spacing:.24em;
                  padding:6px 18px;border-radius:999px">
        ◈ AXIOM OS · SOVEREIGN ORDER
      </div>
      <div style="color:#F5F2ED;font-size:24px;font-weight:300;letter-spacing:.2em;
                  text-transform:uppercase;margin:18px 0 4px">
        Bespoke Cigar Design
      </div>
      <div style="color:#D4AF3770;font-size:9px;letter-spacing:.18em">
        MASTER ARTISAN BRIDGE · COMMISSION RECEIVED
      </div>
    </div>

    <!-- Order table -->
    <div style="padding:8px 0 24px">
      <table style="width:100%;border-collapse:collapse">
        ${rowsHtml}
      </table>
    </div>

    <!-- EEIS harmony bar -->
    <div style="background:#D4AF3709;border:1px solid #D4AF3726;border-radius:8px;
                padding:16px 20px;margin-top:8px">
      <div style="color:#D4AF37;font-size:9px;letter-spacing:.18em;margin-bottom:10px">
        EEIS HARMONY SCORE
      </div>
      <div style="background:#1A1A1B;border-radius:4px;height:6px;width:100%;overflow:hidden">
        <div style="height:6px;width:${scoreFill}px;max-width:100%;
                    background:${scoreColor};border-radius:4px"></div>
      </div>
      <div style="color:${scoreColor};font-size:11px;letter-spacing:.1em;
                  font-weight:700;margin-top:8px">${score}% — ${scoreLabel}</div>
    </div>

    <!-- Action note -->
    <div style="background:#D4AF3709;border:1px solid #D4AF3726;border-radius:8px;
                padding:16px 20px;margin-top:12px">
      <div style="color:#D4AF37;font-size:9px;letter-spacing:.18em;margin-bottom:6px">
        NEXT STEP — ARTISAN REVIEW
      </div>
      <div style="color:#F5F2EDBB;font-size:12px;line-height:1.7;letter-spacing:.03em">
        Review the specifications above and coordinate with the guest to confirm
        production timeline, artwork or customisation requirements, and delivery.
        The EEIS score reflects AI-predicted preference alignment at time of order.
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:36px;text-align:center;
                color:#D4AF3730;font-size:8px;letter-spacing:.16em">
      AXIOM OS · SOVEREIGN ORDER GATEWAY · jc@360enterprisesservices.com
    </div>
  </div>
</body>
</html>`;
}

export default router;
