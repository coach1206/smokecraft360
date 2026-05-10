/**
 * Sovereign Identity Lock — Magic Link Authentication
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * POST /api/sovereign/magic-link        — request a 15-min JWT magic link
 * GET  /api/sovereign/verify-magic/:token — verify magic link → return session token
 * GET  /api/sovereign/verify-session    — validate a session token (bearer header)
 * POST /api/sovereign/revoke            — broadcast SOVEREIGN_SESSION_REVOKED to all sockets
 */

import { Router }   from "express";
import { SignJWT, jwtVerify } from "jose";
import { z }        from "zod";
import { sendEmail } from "../services/email";
import { getIO }    from "../lib/socketServer";
import { logger }   from "../lib/logger";
import { pool }     from "@workspace/db";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "sovereign-fallback-360");
}

/** The sole authorized operator. Env var overrides the hardcoded root identity. */
const SOVEREIGN_ROOT_EMAIL = "jc@dayone360.com";
function masterEmail(): string {
  return (process.env.SOVEREIGN_EMAIL ?? SOVEREIGN_ROOT_EMAIL).toLowerCase().trim();
}

/** Base URL for magic link emails. */
function baseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  return "http://localhost:80";
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const MagicLinkSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const RevokeSchema = z.object({
  authKey: z.string(),
});

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/sovereign/magic-link
 * Validates the email against SOVEREIGN_EMAIL, generates a 15-min signed JWT,
 * and dispatches a branded magic-link email via SendGrid.
 * Always returns { dispatched: true } to prevent email enumeration.
 */
router.post("/sovereign/magic-link", async (req, res) => {
  const parsed = MagicLinkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid email" }); return; }
  const { email } = parsed.data;

  // Silently succeed for non-master emails (no enumeration)
  if (!masterEmail() || email !== masterEmail()) {
    logger.info({ email }, "Magic link request — email not authorised (silent)");
    res.json({ dispatched: true });
    return;
  }

  try {
    const token = await new SignJWT({ email, type: "sovereign-magic" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(secret());

    const link = `${baseUrl()}/sovereign-verify?token=${token}`;

    await sendEmail({
      to:      email,
      subject: "NOVEE OS · Sovereign Command Access — Magic Link",
      html:    `
<div style="background:#050505;color:#F5F2ED;font-family:'Courier New',monospace;padding:44px;max-width:540px;margin:0 auto;border:1px solid rgba(212,175,55,0.28);border-radius:8px;">
  <div style="font-size:10px;letter-spacing:0.30em;color:rgba(212,175,55,0.40);margin-bottom:28px;">
    NOVEE OS · SOVEREIGN DISTRIBUTION ENGINE
  </div>
  <h1 style="font-size:22px;color:#D4AF37;letter-spacing:0.16em;font-weight:300;margin-bottom:8px;">
    SOVEREIGN COMMAND ACCESS
  </h1>
  <p style="font-size:11px;color:rgba(245,242,237,0.45);margin-bottom:32px;line-height:1.8;">
    A request was made to activate this device as a<br/>
    <strong style="color:#F5F2ED;">Sovereign Command Node</strong> for NOVEE OS.<br/>
    This link expires in <strong style="color:#D4AF37;">15 minutes</strong>.
  </p>
  <a href="${link}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#050505;text-decoration:none;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:0.14em;margin-bottom:32px;">
    ACTIVATE SOVEREIGN COMMAND NODE
  </a>
  <p style="font-size:9px;color:rgba(245,242,237,0.20);line-height:1.8;margin-top:24px;word-break:break-all;">
    Or paste this link: ${link}
  </p>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(212,175,55,0.12);">
    <div style="font-size:8px;color:rgba(245,242,237,0.18);letter-spacing:0.18em;">
      AUTHORIZED OPERATOR: JC // 360 ENTERPRISES SERVICES LLC<br/>
      NOVEE OS · TITAN V 5.2.0
    </div>
  </div>
</div>`,
    });

    logger.info({ email }, "Sovereign magic link dispatched");
  } catch (err) {
    logger.error({ err }, "Failed to send sovereign magic link");
  }

  res.json({ dispatched: true });
});

/**
 * GET /api/sovereign/verify-magic/:token
 * Verifies the 15-min magic link JWT.
 * On success, issues a 7-day session JWT that the client stores in localStorage.
 */
router.get("/sovereign/verify-magic/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: "No token" }); return; }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload["type"] !== "sovereign-magic") throw new Error("Wrong token type");
    if (!masterEmail() || payload["email"] !== masterEmail()) {
      res.status(403).json({ error: "Email not authorised" });
      return;
    }

    // Issue a 7-day session token
    const sessionToken = await new SignJWT({
      email:  payload["email"],
      type:   "sovereign-session",
      entity: "360 Enterprises Services LLC",
      owner:  "Johnie Manuel Lee Collins",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret());

    logger.info({ email: payload["email"] }, "Sovereign session token issued");
    res.json({
      ok:           true,
      sessionToken,
      owner:        "Johnie Manuel Lee Collins",
      entity:       "360 Enterprises Services LLC",
      expiresInDays: 7,
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired magic link" });
  }
});

/**
 * GET /api/sovereign/verify-session
 * Validates the session token passed as Bearer in Authorization header.
 * Used by the frontend gate check.
 */
router.get("/sovereign/verify-session", async (req, res) => {
  const auth  = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) { res.status(401).json({ valid: false }); return; }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload["type"] !== "sovereign-session") throw new Error();
    res.json({ valid: true, owner: payload["owner"], entity: payload["entity"] });
  } catch {
    res.status(401).json({ valid: false });
  }
});

/**
 * POST /api/sovereign/revoke
 * Requires MASTER_KEY_360. Broadcasts SOVEREIGN_SESSION_REVOKED to all sockets
 * so every connected admin device is forced back to the gate.
 */
router.post("/sovereign/revoke", (req, res) => {
  const parsed = RevokeSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.authKey !== "MASTER_KEY_360") {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    getIO().emit("SOVEREIGN_SESSION_REVOKED", { ts: Date.now(), reason: "OPERATOR_REVOKE" });
    logger.info("Sovereign session revoke broadcast sent");
    res.json({ revoked: true });
  } catch {
    res.status(500).json({ error: "Socket not available" });
  }
});

// ── Ambassador Identity ───────────────────────────────────────────────────────

/** Hardcoded Ambassador email — SOVEREIGN_EMAIL env var does NOT override this. */
const AMBASSADOR_ROOT_EMAIL = "chrislclark@gmail.com";
function ambassadorEmail(): string {
  return (process.env.AMBASSADOR_EMAIL ?? AMBASSADOR_ROOT_EMAIL).toLowerCase().trim();
}

const AmbassadorMagicLinkSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

/**
 * POST /api/ambassador/magic-link
 * Issues a 15-min signed magic link only for the hardcoded Ambassador email.
 * Always returns { dispatched: true } (no enumeration).
 */
router.post("/ambassador/magic-link", async (req, res) => {
  const parsed = AmbassadorMagicLinkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid email" }); return; }
  const { email } = parsed.data;

  if (email !== ambassadorEmail()) {
    logger.info({ email }, "Ambassador magic link request — email not authorised (silent)");
    res.json({ dispatched: true });
    return;
  }

  try {
    const token = await new SignJWT({ email, type: "ambassador-magic", role: "AMBASSADOR", operator: "Clark" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15m")
      .setIssuedAt()
      .sign(secret());

    const link = `${baseUrl()}/ambassador-verify?token=${token}`;

    await sendEmail({
      to:      email,
      subject: "NOVEE OS · Ambassador Access — Magic Link",
      html:    `
<div style="background:#050505;color:#F5F2ED;font-family:'Courier New',monospace;padding:44px;max-width:540px;margin:0 auto;border:1px solid rgba(212,175,55,0.28);border-radius:8px;">
  <div style="font-size:10px;letter-spacing:0.30em;color:rgba(212,175,55,0.40);margin-bottom:28px;">
    NOVEE OS · AMBASSADOR COMMAND DECK
  </div>
  <h1 style="font-size:22px;color:#D4AF37;letter-spacing:0.16em;font-weight:300;margin-bottom:8px;">
    AMBASSADOR ACCESS
  </h1>
  <p style="font-size:11px;color:rgba(245,242,237,0.45);margin-bottom:32px;line-height:1.8;">
    Hello <strong style="color:#F5F2ED;">Clark</strong>,<br/>
    Your demo access link is ready. This link expires in
    <strong style="color:#D4AF37;">15 minutes</strong>.
  </p>
  <a href="${link}" style="display:inline-block;padding:14px 32px;background:#D4AF37;color:#050505;text-decoration:none;border-radius:6px;font-size:12px;font-weight:800;letter-spacing:0.14em;margin-bottom:32px;">
    OPEN AMBASSADOR COMMAND DECK
  </a>
  <p style="font-size:9px;color:rgba(245,242,237,0.20);line-height:1.8;margin-top:24px;word-break:break-all;">
    Or paste: ${link}
  </p>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(212,175,55,0.12);">
    <div style="font-size:8px;color:rgba(245,242,237,0.18);letter-spacing:0.18em;">
      AUTHORIZED AMBASSADOR: CLARK // 360 ENTERPRISES SERVICES LLC<br/>
      NOVEE OS · DEMO MODE · TITAN V 5.2.0
    </div>
  </div>
</div>`,
    });

    logger.info({ email }, "Ambassador magic link dispatched");
  } catch (err) {
    logger.error({ err }, "Failed to send ambassador magic link");
  }

  res.json({ dispatched: true });
});

/**
 * GET /api/ambassador/verify-magic/:token
 * Verifies the 15-min Ambassador magic link JWT.
 * Issues a 7-day Ambassador session JWT flagged ROLE: AMBASSADOR.
 */
router.get("/ambassador/verify-magic/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) { res.status(400).json({ error: "No token" }); return; }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload["type"] !== "ambassador-magic") throw new Error("Wrong token type");
    if (payload["email"] !== ambassadorEmail()) {
      res.status(403).json({ error: "Email not authorised" });
      return;
    }

    const sessionToken = await new SignJWT({
      email:    payload["email"],
      type:     "ambassador-session",
      role:     "AMBASSADOR",
      operator: "Clark",
      entity:   "360 Enterprises Services LLC",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret());

    logger.info({ email: payload["email"] }, "Ambassador session token issued");
    res.json({ ok: true, sessionToken, role: "AMBASSADOR", operator: "Clark" });
  } catch {
    res.status(401).json({ error: "Invalid or expired magic link" });
  }
});

// ── Ambassador Node Management ────────────────────────────────────────────────

/** Extend registered_nodes with ambassador fields (safe — IF NOT EXISTS). */
pool.query(`
  ALTER TABLE registered_nodes
    ADD COLUMN IF NOT EXISTS venue_name   TEXT,
    ADD COLUMN IF NOT EXISTS location_id  TEXT,
    ADD COLUMN IF NOT EXISTS node_type    TEXT,
    ADD COLUMN IF NOT EXISTS created_by   TEXT NOT NULL DEFAULT 'sovereign';
`).catch(() => {});

/** Verify an AMBASSADOR_SESSION Bearer token — returns the payload or null. */
async function verifyAmbassadorSession(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload["type"] !== "ambassador-session") return null;
    return payload;
  } catch {
    return null;
  }
}

const InitNodeSchema = z.object({
  venueName:  z.string().min(2).max(120),
  locationId: z.string().min(3).max(40),
  nodeType:   z.enum(["SMART_MIRROR", "INTERACTIVE_TABLE", "MOBILE_HUD", "STANDARD_KIOSK"]),
});

/**
 * POST /api/ambassador/initialize-node
 * Requires AMBASSADOR_SESSION Bearer.
 * Creates a registered_node in OBSIDIAN_LOCK state, emails JC the sovereign alert.
 */
router.post("/ambassador/initialize-node", async (req, res) => {
  const payload = await verifyAmbassadorSession(req.headers.authorization);
  if (!payload) { res.status(401).json({ error: "Invalid ambassador session" }); return; }

  const parsed = InitNodeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() }); return; }

  const { venueName, locationId, nodeType } = parsed.data;

  // Auto-generate serial: AMB-<LOC>-<random>
  const rnd    = Math.random().toString(36).slice(2, 8).toUpperCase();
  const serial = `AMB-${locationId}-${rnd}`;

  try {
    await pool.query(
      `INSERT INTO registered_nodes
         (serial_number, status, venue_name, location_id, node_type, created_by)
       VALUES ($1, 'OBSIDIAN_LOCK', $2, $3, $4, 'clark')`,
      [serial, venueName, locationId, nodeType],
    );

    logger.info({ serial, venueName, locationId, nodeType }, "Ambassador node initialized");

    // Sovereign alert — email to JC
    try {
      const sovereign = (process.env.SOVEREIGN_EMAIL ?? "jc@dayone360.com").toLowerCase().trim();
      await sendEmail({
        to:      sovereign,
        subject: `NOVEE OS · NEW NODE PENDING: ${venueName}`,
        html: `
<div style="background:#050505;color:#F5F2ED;font-family:'Courier New',monospace;padding:40px;max-width:560px;margin:0 auto;border:1px solid rgba(212,175,55,0.28);border-radius:8px;">
  <div style="font-size:9px;letter-spacing:0.30em;color:rgba(212,175,55,0.40);margin-bottom:20px;">
    NOVEE OS · SOVEREIGN ALERT · 360 ENTERPRISES SERVICES LLC
  </div>
  <h2 style="font-size:18px;color:#D4AF37;letter-spacing:0.16em;font-weight:300;margin-bottom:8px;">
    NEW NODE PENDING
  </h2>
  <p style="font-size:11px;color:rgba(245,242,237,0.45);margin-bottom:28px;line-height:1.8;">
    Ambassador <strong style="color:#F5F2ED;">CLARK</strong> has initialized a new venue node
    and is awaiting your Sovereign activation.
  </p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    ${[["VENUE", venueName], ["NODE ID", serial], ["LOCATION", locationId], ["HARDWARE", nodeType.replace(/_/g, " ")], ["STATUS", "OBSIDIAN LOCK"]].map(([k, v]) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.10);font-size:9px;color:rgba(245,242,237,0.35);letter-spacing:0.18em;width:40%;">${k}</td>
      <td style="padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.10);font-size:11px;color:#F5F2ED;letter-spacing:0.08em;">${v}</td>
    </tr>`).join("")}
  </table>
  <p style="font-size:10px;color:rgba(245,242,237,0.35);line-height:1.8;margin-bottom:20px;">
    Log into your Sovereign Command Center to authorize this node and wake the device.
  </p>
  <div style="margin-top:28px;padding-top:18px;border-top:1px solid rgba(212,175,55,0.12);">
    <div style="font-size:8px;color:rgba(245,242,237,0.18);letter-spacing:0.18em;">
      AUTHORIZED OPERATOR: JC // 360 ENTERPRISES SERVICES LLC · TITAN V 5.2.0
    </div>
  </div>
</div>`,
      });
    } catch (emailErr) {
      logger.error({ emailErr }, "Sovereign alert email failed (node still created)");
    }

    res.json({ ok: true, serial, venueName, locationId, nodeType, status: "OBSIDIAN_LOCK" });
  } catch (err) {
    logger.error({ err }, "Ambassador initialize-node failed");
    res.status(500).json({ error: "Failed to create node" });
  }
});

/**
 * GET /api/ambassador/nodes
 * Requires AMBASSADOR_SESSION Bearer.
 * Returns all nodes created by Clark (created_by = 'clark'), newest first.
 */
router.get("/ambassador/nodes", async (req, res) => {
  const payload = await verifyAmbassadorSession(req.headers.authorization);
  if (!payload) { res.status(401).json({ error: "Invalid ambassador session" }); return; }

  try {
    const { rows } = await pool.query<{
      id: number; serial_number: string; venue_name: string;
      location_id: string; node_type: string; status: string; registered_at: string;
    }>(
      `SELECT id, serial_number, venue_name, location_id, node_type, status, registered_at AS created_at
       FROM registered_nodes
       WHERE created_by = 'clark'
       ORDER BY registered_at DESC`,
    );
    res.json({ nodes: rows });
  } catch (err) {
    logger.error({ err }, "GET /ambassador/nodes failed");
    res.status(500).json({ error: "Failed to fetch nodes" });
  }
});

export default router;
