/**
 * Artisan Orders — Master Artisan 360 Commission Bridge (All Crafts)
 *
 * POST /api/artisan-orders
 *   Accepts bespoke commissions from any Craft360 page:
 *   SmokeCraft (cigar box), PourCraft (spirit pour), BrewCraft (beer),
 *   VapeCraft (device).
 *   Logs and fires a formatted email to jc@360enterprisesservices.com.
 *   Guest-accessible (no auth required — kiosk-facing endpoint).
 *
 * Returns { success: true, orderId } regardless of email status so the
 * guest UI always receives confirmation. Email failures are logged as warnings.
 */

import { Router } from "express";
import { z }      from "zod";
import { sendEmail } from "../services/email";

const router = Router();

// ── Label maps ─────────────────────────────────────────────────────────────────
const WOOD_LABELS = {
  cedar:    "Spanish Cedar",
  mahogany: "African Mahogany",
  ebony:    "Piano Black Ebony",
};

const BAND_LABELS = {
  sovereign: "The Sovereign — Matte Black · 24k Gold Leaf",
  obsidian:  "The Obsidian — Smoked Charcoal · Silver",
  heirloom:  "The Heirloom — Cream Parchment · Bronze Filigree",
  midnight:  "The Midnight — Deep Navy · Brushed Titanium",
};

const CRAFT_LABELS: Record<string, string> = {
  smoke: "SmokeCraft 360 — Bespoke Cigar Box",
  pour:  "PourCraft 360 — Spirit Pour Commission",
  brew:  "BrewCraft 360 — Craft Beer Commission",
  vape:  "VapeCraft 360 — Device Commission",
};

// ── Schema ─────────────────────────────────────────────────────────────────────
const OrderSchema = z.object({
  craft:       z.enum(["smoke", "pour", "brew", "vape"]).default("smoke"),
  // Smoke-specific
  wood:        z.enum(["cedar", "mahogany", "ebony"]).optional(),
  band:        z.enum(["sovereign", "obsidian", "heirloom", "midnight"]).optional(),
  // Generic design descriptor (pour/brew/vape use this)
  style:       z.string().max(120).optional(),
  flavorNotes: z.array(z.string().max(40)).max(4).optional(),
  hasEmblem:   z.boolean().default(false),
  guestName:   z.string().max(80).optional(),
  notes:       z.string().max(400).optional(),
});

// ── POST /api/artisan-orders ───────────────────────────────────────────────────
router.post("/artisan-orders", async (req, res) => {
  const parsed = OrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
    return;
  }

  const order   = parsed.data;
  const orderId = `ART-${Date.now().toString(36).toUpperCase()}`;
  const ts      = new Date().toLocaleString("en-US", {
    timeZone:  "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });

  req.log.info(
    { orderId, craft: order.craft, style: order.style, wood: order.wood, band: order.band },
    "artisan-order commission received",
  );

  const result = await sendEmail({
    to:      "jc@360enterprisesservices.com",
    subject: `◈ NOVEE OS — ${CRAFT_LABELS[order.craft] ?? "Commission"} ${orderId}`,
    html:    buildEmail({ ...order, orderId, ts }),
  });

  if (!result.sent) {
    req.log.warn({ orderId, reason: result.reason }, "artisan-order email not delivered — check SENDGRID_FROM_EMAIL");
  }

  res.json({ success: true, orderId });
});

// ── HTML email builder ─────────────────────────────────────────────────────────
function buildEmail(o: {
  orderId:      string;
  ts:           string;
  craft:        string;
  wood?:        keyof typeof WOOD_LABELS;
  band?:        keyof typeof BAND_LABELS;
  style?:       string;
  flavorNotes?: string[];
  hasEmblem:    boolean;
  guestName?:   string;
  notes?:       string;
}): string {
  const craftLabel = CRAFT_LABELS[o.craft] ?? o.craft;

  const designRows: [string, string][] = o.craft === "smoke"
    ? [
        ["Wood Selection",   o.wood ? WOOD_LABELS[o.wood] : "—"],
        ["Band Style",       o.band ? BAND_LABELS[o.band] : "—"],
        ["Custom Emblem",    o.hasEmblem ? "Yes — Uploaded at session" : "None"],
      ]
    : [
        ["Design Profile",   o.style ?? "—"],
        ["Flavor Notes",     o.flavorNotes?.join(", ") || "—"],
      ];

  const rows: [string, string][] = [
    ["Order Reference", `<span style="color:#D4AF37;letter-spacing:.18em">${o.orderId}</span>`],
    ["Submitted",       o.ts],
    ["Commission Type", craftLabel],
    ["Guest Name",      o.guestName || "— (Anonymous)"],
    ...designRows,
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${craftLabel} — ${o.orderId}</title>
</head>
<body style="margin:0;padding:0;background:#0A0908;font-family:'Courier New',Courier,monospace">
  <div style="max-width:580px;margin:0 auto;padding:40px 28px">

    <!-- Header -->
    <div style="text-align:center;padding-bottom:28px;border-bottom:1px solid #D4AF3730">
      <div style="display:inline-block;background:#D4AF3714;border:1px solid #D4AF3770;
                  color:#D4AF37;font-size:9px;letter-spacing:.24em;
                  padding:6px 18px;border-radius:999px">
        ◈ NOVEE OS · ${o.craft.toUpperCase()}CRAFT 360
      </div>
      <div style="color:#F5F2ED;font-size:24px;font-weight:300;letter-spacing:.2em;
                  text-transform:uppercase;margin:18px 0 4px">
        Commission Received
      </div>
      <div style="color:#D4AF3770;font-size:9px;letter-spacing:.18em">
        ${craftLabel.toUpperCase()}
      </div>
    </div>

    <!-- Order table -->
    <div style="padding:8px 0 24px">
      <table style="width:100%;border-collapse:collapse">
        ${rowsHtml}
      </table>
    </div>

    <!-- Action note -->
    <div style="background:#D4AF3709;border:1px solid #D4AF3726;border-radius:8px;
                padding:16px 20px;margin-top:8px">
      <div style="color:#D4AF37;font-size:9px;letter-spacing:.18em;margin-bottom:6px">
        NEXT STEP — ARTISAN REVIEW
      </div>
      <div style="color:#F5F2EDBB;font-size:12px;line-height:1.7;letter-spacing:.03em">
        Review the specifications above and coordinate with the guest to confirm
        production timeline, any artwork or customisation requirements, and delivery.
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:36px;text-align:center;
                color:#D4AF3730;font-size:8px;letter-spacing:.16em">
      NOVEE OS · MASTER ARTISAN BRIDGE · jc@360enterprisesservices.com
    </div>
  </div>
</body>
</html>`;
}

export default router;
