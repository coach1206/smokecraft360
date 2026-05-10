/**
 * Cognitive Build Sheet — POST /api/cognitive-build-sheet
 *
 * Fired when a guest finalizes a sensory ritual (Begin Creation).
 * Emails a formatted Cognitive Build Sheet to jc@360enterprisesservices.com
 * with the full behavioral snapshot: flavor archetype, emotional state,
 * guest tier, group energy, cross-craft synergy, and session metadata.
 *
 * Guest-accessible — no auth required (kiosk-facing endpoint).
 * Returns { sent, orderId } regardless of email delivery status.
 */

import { Router } from "express";
import { z }      from "zod";
import { sendEmail } from "../services/email";

const router = Router();

// ── Schema ─────────────────────────────────────────────────────────────────────

const BuildSheetSchema = z.object({
  guestName:       z.string().max(80).default("Guest"),
  flavor:          z.string().max(60),
  flavorBody:      z.string().max(60).optional(),
  flavorStrength:  z.number().int().min(0).max(100).optional(),
  flavorNotes:     z.array(z.string().max(40)).max(6).optional(),
  guestTier:       z.enum(["APPRENTICE", "JOURNEYMAN", "ARTISAN", "MASTER"]).default("APPRENTICE"),
  totalSessions:   z.number().int().min(0).default(0),
  dominantFlavor:  z.string().max(60).optional(),
  crossCraftSuggestion: z.string().max(120).optional(),
  escalationLevel: z.string().max(40).optional(),
  ritualState:     z.string().max(40).optional(),
  confidence:      z.number().min(0).max(100).optional(),
  immersionDepth:  z.number().min(0).max(100).optional(),
  premiumIntent:   z.number().min(0).max(100).optional(),
  loungeMood:      z.enum(["MEDITATIVE", "FOCUSED", "HIGH_ENERGY"]).default("FOCUSED"),
  lightingHex:     z.string().max(10).optional(),
  mentor:          z.string().max(80).optional(),
  craft:           z.string().max(40).default("smoke"),
  venueId:         z.string().max(80).optional(),
  ts:              z.string().max(40).optional(),
});

type BuildSheet = z.infer<typeof BuildSheetSchema>;

// ── POST /api/cognitive-build-sheet ────────────────────────────────────────────

router.post("/cognitive-build-sheet", async (req, res) => {
  const parsed = BuildSheetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid build sheet payload", details: parsed.error.flatten() });
    return;
  }

  const sheet   = parsed.data;
  const orderId = `CBS-${Date.now().toString(36).toUpperCase()}`;
  const ts      = sheet.ts ?? new Date().toLocaleString("en-US", {
    timeZone: "America/New_York", dateStyle: "full", timeStyle: "short",
  });

  req.log.info({ orderId, flavor: sheet.flavor, tier: sheet.guestTier, mood: sheet.loungeMood }, "cognitive-build-sheet received");

  const result = await sendEmail({
    to:      "jc@360enterprisesservices.com",
    subject: `◈ NOVEE OS — Cognitive Build Sheet ${orderId}`,
    html:    buildEmailHtml({ ...sheet, orderId, ts }),
  });

  if (!result.sent) {
    req.log.warn({ orderId, reason: result.reason }, "cognitive-build-sheet email not delivered — check SENDGRID env vars");
  }

  res.status(200).json({ sent: result.sent, orderId });
});

export default router;

// ── Email template ─────────────────────────────────────────────────────────────

function bar(value: number, color = "#D48B00"): string {
  const pct = Math.round(value);
  return `
    <div style="background:#1a1108;border-radius:4px;overflow:hidden;height:8px;margin-top:4px;">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
    </div>`;
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#9A8468;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;font-family:monospace;width:160px;">${label}</td>
      <td style="padding:6px 0;color:#F0E8D4;font-size:12px;font-family:monospace;">${value}</td>
    </tr>`;
}

const TIER_COLOR: Record<string, string> = {
  MASTER:      "#FFD770",
  ARTISAN:     "#D48B00",
  JOURNEYMAN:  "#C8A96E",
  APPRENTICE:  "#9A8468",
};

function buildEmailHtml(s: BuildSheet & { orderId: string; ts: string }): string {
  const tierColor = TIER_COLOR[s.guestTier] ?? "#D48B00";
  const moodEmoji: Record<string, string> = { MEDITATIVE: "◌", FOCUSED: "◑", HIGH_ENERGY: "●" };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>NOVEE OS — Cognitive Build Sheet</title></head>
<body style="margin:0;padding:0;background:#0A0804;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:40px 32px;">

    <!-- Header -->
    <div style="border-bottom:1px solid #D48B0030;padding-bottom:24px;margin-bottom:28px;">
      <div style="font-size:10px;letter-spacing:0.28em;color:#D48B00;text-transform:uppercase;font-family:monospace;margin-bottom:8px;">
        NOVEE OS · EEIE COGNITIVE COMMAND
      </div>
      <div style="font-size:26px;color:#F0E8D4;font-weight:300;letter-spacing:0.05em;">
        Cognitive Build Sheet
      </div>
      <div style="font-size:11px;color:#6B5E4E;margin-top:6px;font-family:monospace;">${s.orderId} · ${s.ts}</div>
    </div>

    <!-- Guest Identity -->
    <div style="margin-bottom:28px;">
      <div style="font-size:8px;letter-spacing:0.24em;color:#D48B0070;text-transform:uppercase;font-family:monospace;margin-bottom:12px;">◈ GUEST IDENTITY</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row("Guest",          s.guestName)}
        ${row("Guest Tier",     `<span style="color:${tierColor};font-weight:700;">${s.guestTier}</span>`)}
        ${row("Total Sessions", String(s.totalSessions))}
        ${s.mentor ? row("Mentor Affinity", s.mentor) : ""}
        ${s.venueId ? row("Venue", s.venueId) : ""}
      </table>
    </div>

    <!-- Sensory Foundation -->
    <div style="margin-bottom:28px;padding:20px;background:#0F0C07;border-radius:12px;border:1px solid #D48B0018;">
      <div style="font-size:8px;letter-spacing:0.24em;color:#D48B0070;text-transform:uppercase;font-family:monospace;margin-bottom:14px;">◈ SENSORY FOUNDATION — ${s.craft.toUpperCase()}</div>
      <div style="font-size:22px;color:#D48B00;margin-bottom:8px;letter-spacing:0.06em;">${s.flavor.toUpperCase()}</div>
      ${s.flavorBody       ? `<div style="font-size:11px;color:#9A8468;margin-bottom:4px;font-family:monospace;">${s.flavorBody} body · ${s.flavorStrength ?? "—"}% strength</div>` : ""}
      ${s.flavorNotes?.length ? `<div style="margin-top:8px;">${s.flavorNotes.map(n => `<span style="display:inline-block;padding:2px 10px;border:1px solid #D48B0025;border-radius:20px;font-size:10px;color:#9A8468;font-family:monospace;margin:2px 3px 2px 0;">${n}</span>`).join("")}</div>` : ""}
    </div>

    <!-- Behavioral Metrics -->
    <div style="margin-bottom:28px;">
      <div style="font-size:8px;letter-spacing:0.24em;color:#D48B0070;text-transform:uppercase;font-family:monospace;margin-bottom:14px;">◈ BEHAVIORAL METRICS</div>
      ${s.escalationLevel ? row("Escalation",    s.escalationLevel)   : ""}
      ${s.ritualState     ? row("Ritual State",  s.ritualState)       : ""}

      ${s.confidence !== undefined ? `
      <div style="margin:8px 0;">
        <span style="font-size:10px;color:#9A8468;font-family:monospace;text-transform:uppercase;letter-spacing:0.10em;">Confidence&nbsp;&nbsp;${Math.round(s.confidence)}%</span>
        ${bar(s.confidence, "#D48B00")}
      </div>` : ""}

      ${s.immersionDepth !== undefined ? `
      <div style="margin:8px 0;">
        <span style="font-size:10px;color:#9A8468;font-family:monospace;text-transform:uppercase;letter-spacing:0.10em;">Immersion&nbsp;&nbsp;${Math.round(s.immersionDepth)}%</span>
        ${bar(s.immersionDepth, "#C8A96E")}
      </div>` : ""}

      ${s.premiumIntent !== undefined ? `
      <div style="margin:8px 0;">
        <span style="font-size:10px;color:#9A8468;font-family:monospace;text-transform:uppercase;letter-spacing:0.10em;">Premium Intent&nbsp;&nbsp;${Math.round(s.premiumIntent)}%</span>
        ${bar(s.premiumIntent, "#FFD770")}
      </div>` : ""}
    </div>

    <!-- Group Intelligence -->
    <div style="margin-bottom:28px;padding:20px;background:#0F0C07;border-radius:12px;border:1px solid #D48B0018;">
      <div style="font-size:8px;letter-spacing:0.24em;color:#D48B0070;text-transform:uppercase;font-family:monospace;margin-bottom:14px;">◈ GROUP INTELLIGENCE</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row("Lounge Mood",     `${moodEmoji[s.loungeMood] ?? "◑"}  ${s.loungeMood}`)}
        ${s.dominantFlavor  ? row("Memory Dominant",  s.dominantFlavor)       : ""}
        ${s.crossCraftSuggestion ? row("Cross-Craft Tip", s.crossCraftSuggestion) : ""}
        ${s.lightingHex     ? row("Lighting Sync",    s.lightingHex)          : ""}
      </table>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #D48B0015;padding-top:20px;text-align:center;">
      <div style="font-size:9px;letter-spacing:0.18em;color:#3A3028;text-transform:uppercase;font-family:monospace;">
        NOVEE OS · EEIE COGNITIVE COMMAND · CONFIDENTIAL
      </div>
    </div>

  </td></tr>
</table>
</body>
</html>`;
}
