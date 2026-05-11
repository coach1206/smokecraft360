/**
 * Sovereign Distribution Vault — Titan Bundle System
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * POST /api/distribution/batches          — create shipment + generate activation keys
 * GET  /api/distribution/batches          — list all batches
 * GET  /api/distribution/batches/:id/keys — list keys for a batch
 * PUT  /api/distribution/batches/:id/authorize — toggle batch authorization
 * POST /api/distribution/links            — generate 24hr cloud download link
 * GET  /api/distribution/bundle/:batchId  — download bundle manifest (license + specs + cold start)
 * POST /api/nodes/register               — device handshake (public)
 * GET  /api/distribution/nodes           — list registered nodes
 */

import { Router }    from "express";
import { z }         from "zod";
import { randomBytes } from "crypto";
import bcrypt        from "bcryptjs";
import { pool }      from "@workspace/db";
import { sendEmail } from "../services/email";
import { logger }    from "../lib/logger";

const router = Router();

// ── Bootstrap tables ────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS distribution_deployments (
    id            SERIAL PRIMARY KEY,
    batch_id      INTEGER,
    target        TEXT        NOT NULL DEFAULT 'ALL',
    package       TEXT        NOT NULL DEFAULT 'titan-v-5.2.0',
    status        TEXT        NOT NULL DEFAULT 'PENDING',
    created_by    TEXT        NOT NULL DEFAULT 'sovereign',
    notes         TEXT,
    started_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS distribution_war_room_events (
    id            SERIAL PRIMARY KEY,
    severity      TEXT        NOT NULL DEFAULT 'INFO',
    category      TEXT        NOT NULL DEFAULT 'SYSTEM',
    title         TEXT        NOT NULL,
    description   TEXT,
    source        TEXT,
    acknowledged  BOOLEAN     NOT NULL DEFAULT FALSE,
    ack_by        TEXT,
    ack_at        TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS sovereign_hardware_devices (
    id            SERIAL PRIMARY KEY,
    device_label  TEXT        NOT NULL,
    device_type   TEXT        NOT NULL DEFAULT 'kiosk',
    firmware      TEXT        NOT NULL DEFAULT 'titan-v-5.2.0',
    signal_state  TEXT        NOT NULL DEFAULT 'NOMINAL',
    sensor_state  TEXT        NOT NULL DEFAULT 'ONLINE',
    last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address    TEXT,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS sovereign_batches (
    id               SERIAL PRIMARY KEY,
    manufacturer_name TEXT        NOT NULL,
    order_qty         INTEGER     NOT NULL,
    device_type       TEXT        NOT NULL,
    authorized        BOOLEAN     NOT NULL DEFAULT FALSE,
    legal_entity      TEXT        NOT NULL DEFAULT '360 Enterprises Services LLC',
    contact_email     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS activation_keys (
    id           SERIAL PRIMARY KEY,
    batch_id     INTEGER REFERENCES sovereign_batches(id) ON DELETE CASCADE,
    key_value    TEXT        NOT NULL UNIQUE,
    serial_prefix TEXT       NOT NULL,
    activated    BOOLEAN     NOT NULL DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    node_id      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS registered_nodes (
    id            SERIAL PRIMARY KEY,
    serial_number TEXT        NOT NULL UNIQUE,
    batch_id      INTEGER,
    key_value     TEXT,
    status        TEXT        NOT NULL DEFAULT 'PENDING',
    ip_address    TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS distribution_links (
    id              SERIAL PRIMARY KEY,
    batch_id        INTEGER REFERENCES sovereign_batches(id) ON DELETE CASCADE,
    token           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    download_count  INTEGER     NOT NULL DEFAULT 0,
    recipient_email TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`).catch(() => {});

// ── Key generation ──────────────────────────────────────────────────────────

function generateActivationKey(deviceType: string, batchId: number, seq: number): string {
  const dtCode   = deviceType.toUpperCase().slice(0, 3).padEnd(3, "X");
  const batchHex = batchId.toString(16).toUpperCase().padStart(4, "0");
  const body     = randomBytes(8).toString("hex").toUpperCase();
  const seqHex   = seq.toString(16).toUpperCase().padStart(3, "0");
  return `NOVEE-${dtCode}-${batchHex}-${body.slice(0,4)}-${body.slice(4,8)}-${body.slice(8,12)}-${seqHex}`;
}

// ── Bundle manifest ─────────────────────────────────────────────────────────

function buildBundleManifest(
  batch: { id: number; manufacturer_name: string; device_type: string; order_qty: number; created_at: string },
  keys:  { key_value: string }[],
) {
  const license = {
    legalEntity:    "360 Enterprises Services LLC",
    owner:          "Johnie Manuel Lee Collins",
    platform:       "NOVEE OS · Titan V Engine",
    version:        "5.2.0",
    batchId:        batch.id,
    manufacturer:   batch.manufacturer_name,
    deviceType:     batch.device_type,
    orderQty:       batch.order_qty,
    issuedAt:       new Date().toISOString(),
    activationKeys: keys.map(k => k.key_value),
    notice:         "This software is sovereign-locked. Unauthorized use is prohibited. Device will remain in Obsidian Lock mode until activation is granted by 360 Enterprises Services LLC.",
  };

  const systemSpecs = {
    platform:  "NOVEE OS · Titan V Engine v5.2.0",
    entity:    "360 Enterprises Services LLC",
    hardware: {
      ram:        "8 GB minimum · 16 GB recommended",
      cpu:        "Intel Core i5 (8th Gen+) / Apple M1+ / ARM Cortex-A78",
      storage:    "64 GB SSD minimum · 256 GB recommended",
      display:    '15.6" minimum · 4K UHD recommended',
      touchFoil:  { sensitivity: "Titanium Grade — 92% touch response threshold", protocol: "USB-HID · TUIO 2.0" },
      network:    "Gigabit Ethernet · Wi-Fi 6 (802.11ax)",
      gpu:        "Integrated GPU sufficient · Dedicated GPU for 4K dual-display",
      os:         "Chrome OS 120+ · Ubuntu 22.04 LTS · Windows 11 Pro",
    },
    performance: {
      targetFPS:         "60 fps minimum",
      aiResponseTime:    "<1.2 s recommendation latency",
      touchLatency:      "<16 ms",
      heartbeatInterval: "30 s",
    },
    titan_v: {
      holdThreshold:     "2000 ms hardware safety lock",
      socketProtocol:    "Socket.io v4 · /api/socket.io",
      encryptionStandard:"AES-256-GCM field-level",
      regionSupport:     ["DR", "US", "EU", "GLOBAL"],
    },
  };

  const coldStartHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>NOVEE OS · Sovereign Authorization Required</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height:100vh; background:#050505; color:#F5F2ED;
    font-family:'Courier New',monospace;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .glow { position:fixed; top:0; left:50%; transform:translateX(-50%);
    width:600px; height:200px;
    background:radial-gradient(ellipse,rgba(212,175,55,0.12) 0%,transparent 70%);
    pointer-events:none; }
  .card {
    background:rgba(20,18,16,0.96); border:1px solid rgba(212,175,55,0.28);
    border-radius:8px; padding:48px 52px; max-width:520px; width:90%;
    text-align:center; box-shadow:0 0 80px rgba(212,175,55,0.06);
  }
  .logo { font-size:11px; letter-spacing:0.32em; color:rgba(212,175,55,0.45); margin-bottom:32px; }
  .lock-icon { width:64px; height:64px; margin:0 auto 28px; opacity:0.85; }
  h1 { font-size:22px; letter-spacing:0.22em; color:#D4AF37; margin-bottom:10px; font-weight:300; }
  .sub { font-size:11px; letter-spacing:0.18em; color:rgba(245,242,237,0.35); margin-bottom:36px; }
  .pulse { width:8px; height:8px; border-radius:50%; background:#D4AF37;
    margin:0 auto 24px; animation:pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 12px #D4AF37;} 50%{opacity:0.3;box-shadow:none;} }
  .status { font-size:10px; letter-spacing:0.20em; color:rgba(212,175,55,0.55); margin-bottom:28px; }
  .qr-placeholder {
    width:140px; height:140px; margin:0 auto 24px;
    border:1px solid rgba(212,175,55,0.22); border-radius:4px;
    display:flex; align-items:center; justify-content:center;
    font-size:9px; letter-spacing:0.14em; color:rgba(212,175,55,0.35);
  }
  .batch { font-size:9px; color:rgba(212,175,55,0.30); letter-spacing:0.12em; margin-top:28px; }
  .entity { font-size:8px; color:rgba(245,242,237,0.20); letter-spacing:0.14em; margin-top:10px; }
</style>
</head>
<body>
<div class="glow"></div>
<div class="card">
  <div class="logo">NOVEE OS · TITAN V ENGINE · v5.2.0</div>
  <svg class="lock-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="28" width="40" height="28" rx="4" stroke="#D4AF37" stroke-width="1.5"/>
    <path d="M20 28V22a12 12 0 0 1 24 0v6" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="32" cy="42" r="4" fill="#D4AF37" opacity="0.7"/>
    <path d="M32 46v5" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
  <h1>SOVEREIGN AUTHORIZATION<br/>REQUIRED</h1>
  <div class="sub">WAITING FOR REMOTE UNLOCK</div>
  <div class="pulse"></div>
  <div class="status">OBSIDIAN LOCK · ACTIVE · DEVICE REGISTERED</div>
  <div class="qr-placeholder">QR CODE<br/>ACTIVATION</div>
  <div class="batch">BATCH ID: ${batch.id} · DEVICE: ${batch.device_type.toUpperCase()}</div>
  <div class="entity">360 ENTERPRISES SERVICES LLC · JOHNIE MANUEL LEE COLLINS</div>
</div>
</body>
</html>`;

  const installGuide = `NOVEE OS · TITAN BUNDLE INSTALLATION GUIDE
360 Enterprises Services LLC · Johnie Manuel Lee Collins
Version 5.2.0 · Batch ${batch.id}
============================================================

MANUFACTURER: ${batch.manufacturer_name}
DEVICE TYPE:  ${batch.device_type}
ORDER QTY:    ${batch.order_qty} unit(s)
ISSUED:       ${new Date().toISOString()}

LEGAL NOTICE:
  This software is the exclusive intellectual property of
  360 Enterprises Services LLC and Johnie Manuel Lee Collins.
  Unauthorized duplication, distribution, or modification is
  strictly prohibited and subject to civil and criminal penalties.

  The software operates under Sovereign Lock protection.
  The device will remain in Obsidian Lock mode until remote
  authorization is granted by 360 Enterprises Services LLC.

STEP 1 — HARDWARE PREPARATION
  Ensure the device meets minimum specifications:
  • RAM:     8 GB minimum (16 GB recommended)
  • CPU:     Intel i5 8th Gen+ / Apple M1+ / ARM Cortex-A78
  • Storage: 64 GB SSD
  • Display: 15.6" minimum · Touch-foil enabled
  • Network: Gigabit LAN or Wi-Fi 6

STEP 2 — COLD START SCREEN
  Copy cold_start.html to the device startup folder.
  This screen will display until Sovereign Authorization is granted.

STEP 3 — ACTIVATION KEY REGISTRATION
  Each device requires one unique activation key from activation_manifest.json.
  On first boot, the device calls:
    POST https://[your-domain]/api/nodes/register
    Body: { "serialNumber": "[DEVICE_SERIAL]", "keyValue": "[ACTIVATION_KEY]" }

STEP 4 — AWAIT SOVEREIGN AUTHORIZATION
  The device registers as "PENDING" in the Sovereign Distribution Vault.
  360 Enterprises Services LLC will authorize the batch remotely.
  Once authorized, the device exits Obsidian Lock and enters normal operation.

STEP 5 — TOUCH-FOIL CALIBRATION
  Set touch sensitivity to "Titanium Grade" (92% threshold).
  Protocol: USB-HID · TUIO 2.0
  Response target: <16 ms latency.

SUPPORT:
  Contact 360 Enterprises Services LLC for technical support.
  Reference Batch ID: ${batch.id}

============================================================
END OF INSTALLATION GUIDE
`;

  return { license, systemSpecs, coldStartHtml, installGuide };
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const CreateBatchSchema = z.object({
  manufacturerName: z.string().min(2).max(120),
  orderQty:         z.number().int().min(1).max(10_000),
  deviceType:       z.enum(["Mirror", "Table", "Vehicle"]),
  contactEmail:     z.string().email().optional(),
});

const CreateLinkSchema = z.object({
  batchId:        z.number().int().positive(),
  password:       z.string().min(6).max(64),
  recipientEmail: z.string().email().optional(),
});

const RegisterNodeSchema = z.object({
  serialNumber: z.string().min(4).max(120),
  keyValue:     z.string().min(10).max(200),
});

// ── Routes ──────────────────────────────────────────────────────────────────

// POST /api/distribution/batches — create shipment + keys
router.post("/distribution/batches", async (req, res) => {
  const parsed = CreateBatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { manufacturerName, orderQty, deviceType, contactEmail } = parsed.data;

  try {
    const batchRes = await pool.query<{ id: number }>(
      `INSERT INTO sovereign_batches (manufacturer_name, order_qty, device_type, contact_email)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [manufacturerName, orderQty, deviceType, contactEmail ?? null],
    );
    const batchId = batchRes.rows[0]!.id;

    const keys: string[] = [];
    for (let i = 0; i < orderQty; i++) {
      keys.push(generateActivationKey(deviceType, batchId, i + 1));
    }

    // Bulk insert keys
    const values = keys.map((k, i) => `($1, $${i + 2}, $${i + orderQty + 2})`).join(",");
    const params: (number | string)[] = [batchId];
    keys.forEach(k => params.push(k));
    keys.forEach(() => params.push(`${deviceType.toUpperCase().slice(0,3)}-${batchId}`));

    // Insert one by one to avoid dynamic param complexity
    for (let i = 0; i < keys.length; i++) {
      await pool.query(
        `INSERT INTO activation_keys (batch_id, key_value, serial_prefix) VALUES ($1, $2, $3)`,
        [batchId, keys[i], `${deviceType.toUpperCase().slice(0,3)}-${batchId.toString().padStart(4,"0")}`],
      );
    }

    res.status(201).json({ batchId, keyCount: keys.length, preview: keys.slice(0, 3) });
  } catch (err) {
    logger.error({ err }, "Failed to create distribution batch");
    res.status(500).json({ error: "Failed to create batch" });
  }
});

// GET /api/distribution/batches — list all batches
router.get("/distribution/batches", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, COUNT(k.id) AS key_count,
             SUM(CASE WHEN k.activated THEN 1 ELSE 0 END) AS activated_count,
             (SELECT COUNT(*) FROM registered_nodes n WHERE n.batch_id = b.id) AS node_count
      FROM sovereign_batches b
      LEFT JOIN activation_keys k ON k.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json({ batches: result.rows });
  } catch { res.json({ batches: [] }); }
});

// GET /api/distribution/batches/:id/keys — list keys for a batch
router.get("/distribution/batches/:id/keys", async (req, res) => {
  const batchId = parseInt(req.params.id, 10);
  if (isNaN(batchId)) { res.status(400).json({ error: "Invalid batch ID" }); return; }
  try {
    const result = await pool.query(
      `SELECT id, key_value, serial_prefix, activated, activated_at, node_id, created_at
       FROM activation_keys WHERE batch_id = $1 ORDER BY id`,
      [batchId],
    );
    res.json({ keys: result.rows });
  } catch { res.json({ keys: [] }); }
});

// PUT /api/distribution/batches/:id/authorize — toggle authorization
router.put("/distribution/batches/:id/authorize", async (req, res) => {
  const batchId = parseInt(req.params.id, 10);
  if (isNaN(batchId)) { res.status(400).json({ error: "Invalid batch ID" }); return; }
  try {
    const result = await pool.query<{ authorized: boolean }>(
      `UPDATE sovereign_batches SET authorized = NOT authorized WHERE id = $1 RETURNING authorized`,
      [batchId],
    );
    const authorized = result.rows[0]?.authorized ?? false;
    // Flip all PENDING nodes to AUTHORIZED if batch is now authorized
    if (authorized) {
      await pool.query(
        `UPDATE registered_nodes SET status = 'AUTHORIZED' WHERE batch_id = $1 AND status = 'PENDING'`,
        [batchId],
      );
    } else {
      await pool.query(
        `UPDATE registered_nodes SET status = 'PENDING' WHERE batch_id = $1 AND status = 'AUTHORIZED'`,
        [batchId],
      );
    }
    res.json({ authorized });
  } catch (err) {
    res.status(500).json({ error: "Failed to update authorization" });
  }
});

// POST /api/distribution/links — generate cloud link
router.post("/distribution/links", async (req, res) => {
  const parsed = CreateLinkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { batchId, password, recipientEmail } = parsed.data;

  try {
    const token        = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt    = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO distribution_links (batch_id, token, password_hash, expires_at, recipient_email)
       VALUES ($1, $2, $3, $4, $5)`,
      [batchId, token, passwordHash, expiresAt, recipientEmail ?? null],
    );

    const downloadUrl = `/api/distribution/download/${token}`;

    // Email if recipient provided
    if (recipientEmail) {
      const batchRes = await pool.query<{ manufacturer_name: string; device_type: string }>(
        `SELECT manufacturer_name, device_type FROM sovereign_batches WHERE id = $1`,
        [batchId],
      );
      const batch = batchRes.rows[0];
      if (batch) {
        await sendEmail({
          to:      recipientEmail,
          subject: `NOVEE OS · Titan Bundle — Batch #${batchId} Download Ready`,
          html:    `
<div style="background:#050505;color:#F5F2ED;font-family:'Courier New',monospace;padding:40px;max-width:580px;margin:0 auto;border:1px solid rgba(212,175,55,0.28);border-radius:8px;">
  <div style="font-size:11px;letter-spacing:0.28em;color:rgba(212,175,55,0.45);margin-bottom:24px;">
    NOVEE OS · SOVEREIGN DISTRIBUTION VAULT
  </div>
  <h1 style="font-size:20px;color:#D4AF37;letter-spacing:0.14em;font-weight:300;margin-bottom:8px;">
    TITAN BUNDLE READY
  </h1>
  <p style="font-size:12px;color:rgba(245,242,237,0.55);margin-bottom:28px;line-height:1.7;">
    Your software bundle for <strong style="color:#F5F2ED;">${batch.manufacturer_name}</strong>
    (${batch.device_type} · Batch #${batchId}) is ready for download.
    This link expires in <strong style="color:#D4AF37;">24 hours</strong>.
  </p>
  <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.22);border-radius:6px;padding:20px;margin-bottom:24px;">
    <div style="font-size:9px;color:rgba(212,175,55,0.45);letter-spacing:0.18em;margin-bottom:8px;">DOWNLOAD LINK</div>
    <div style="font-size:12px;color:#D4AF37;word-break:break-all;">${downloadUrl}</div>
    <div style="font-size:9px;color:rgba(245,242,237,0.3);margin-top:10px;">Password provided separately by 360 Enterprises Services LLC</div>
  </div>
  <p style="font-size:10px;color:rgba(245,242,237,0.25);line-height:1.6;">
    360 Enterprises Services LLC · Johnie Manuel Lee Collins<br/>
    This software is sovereign-locked. Unauthorized use is prohibited.
  </p>
</div>`,
        });
      }
    }

    res.json({ token, downloadUrl, expiresAt, emailSent: !!recipientEmail });
  } catch (err) {
    logger.error({ err }, "Failed to create distribution link");
    res.status(500).json({ error: "Failed to create link" });
  }
});

// GET /api/distribution/bundle/:batchId — generate bundle manifest
router.get("/distribution/bundle/:batchId", async (req, res) => {
  const batchId = parseInt(req.params.batchId, 10);
  if (isNaN(batchId)) { res.status(400).json({ error: "Invalid batch ID" }); return; }
  try {
    const batchRes = await pool.query(
      `SELECT * FROM sovereign_batches WHERE id = $1`,
      [batchId],
    );
    const batch = batchRes.rows[0];
    if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

    const keysRes = await pool.query<{ key_value: string }>(
      `SELECT key_value FROM activation_keys WHERE batch_id = $1 ORDER BY id`,
      [batchId],
    );

    const manifest = buildBundleManifest(batch, keysRes.rows);
    res.json(manifest);
  } catch {
    res.status(500).json({ error: "Failed to generate bundle" });
  }
});

// GET /api/distribution/download/:token — public download endpoint
router.get("/distribution/download/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.query as { password?: string };

  try {
    const linkRes = await pool.query(
      `SELECT * FROM distribution_links WHERE token = $1 AND expires_at > NOW()`,
      [token],
    );
    const link = linkRes.rows[0];
    if (!link) { res.status(404).send("Link expired or not found"); return; }

    if (!password || !(await bcrypt.compare(password, link.password_hash))) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    await pool.query(
      `UPDATE distribution_links SET download_count = download_count + 1 WHERE id = $1`,
      [link.id],
    );

    // Return bundle manifest
    const batchRes = await pool.query(`SELECT * FROM sovereign_batches WHERE id = $1`, [link.batch_id]);
    const keysRes  = await pool.query<{ key_value: string }>(
      `SELECT key_value FROM activation_keys WHERE batch_id = $1`, [link.batch_id],
    );
    const manifest = buildBundleManifest(batchRes.rows[0], keysRes.rows);
    res.json({ ...manifest, downloadCount: link.download_count + 1 });
  } catch {
    res.status(500).json({ error: "Download failed" });
  }
});

// POST /api/nodes/register — device handshake (public)
router.post("/nodes/register", async (req, res) => {
  const parsed = RegisterNodeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { serialNumber, keyValue } = parsed.data;

  try {
    // Validate key exists and get batch
    const keyRes = await pool.query<{ id: number; batch_id: number; activated: boolean }>(
      `SELECT id, batch_id, activated FROM activation_keys WHERE key_value = $1`,
      [keyValue],
    );
    const key = keyRes.rows[0];
    if (!key) { res.status(403).json({ error: "Invalid activation key", status: "OBSIDIAN_LOCK" }); return; }

    // Check batch authorization
    const batchRes = await pool.query<{ authorized: boolean }>(
      `SELECT authorized FROM sovereign_batches WHERE id = $1`,
      [key.batch_id],
    );
    const batchAuthorized = batchRes.rows[0]?.authorized ?? false;

    // Upsert node registration
    await pool.query(
      `INSERT INTO registered_nodes (serial_number, batch_id, key_value, status, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (serial_number) DO UPDATE
       SET status = EXCLUDED.status, ip_address = EXCLUDED.ip_address`,
      [serialNumber, key.batch_id, keyValue, batchAuthorized ? "AUTHORIZED" : "PENDING",
       req.ip ?? "unknown"],
    );

    // Mark key as activated
    if (!key.activated) {
      await pool.query(
        `UPDATE activation_keys SET activated = TRUE, activated_at = NOW(), node_id = $1 WHERE id = $2`,
        [serialNumber, key.id],
      );
    }

    res.json({
      status:    batchAuthorized ? "AUTHORIZED" : "PENDING",
      batchId:   key.batch_id,
      message:   batchAuthorized
        ? "Sovereign authorization confirmed. Device may proceed."
        : "Device registered. Awaiting Sovereign Authorization from 360 Enterprises Services LLC.",
    });
  } catch (err) {
    logger.error({ err }, "Node registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /api/distribution/nodes — list registered nodes
router.get("/distribution/nodes", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, b.manufacturer_name, b.device_type, b.authorized AS batch_authorized
      FROM registered_nodes n
      LEFT JOIN sovereign_batches b ON b.id = n.batch_id
      ORDER BY n.registered_at DESC
      LIMIT 200
    `);
    res.json({ nodes: result.rows });
  } catch { res.json({ nodes: [] }); }
});

// ── Node control actions ─────────────────────────────────────────────────────

router.post("/nodes/:id/authorize", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid node id" }); return; }
  try {
    await pool.query(`UPDATE registered_nodes SET status = 'AUTHORIZED' WHERE id = $1`, [id]);
    res.json({ ok: true, status: "AUTHORIZED" });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/nodes/:id/lock", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid node id" }); return; }
  try {
    await pool.query(`UPDATE registered_nodes SET status = 'LOCKED' WHERE id = $1`, [id]);
    res.json({ ok: true, status: "LOCKED" });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/nodes/:id/revoke", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid node id" }); return; }
  try {
    await pool.query(`UPDATE registered_nodes SET status = 'REVOKED' WHERE id = $1`, [id]);
    res.json({ ok: true, status: "REVOKED" });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/nodes/:id/heartbeat", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid node id" }); return; }
  try {
    const ip = (req.body as { ip?: string }).ip ?? req.ip ?? "unknown";
    await pool.query(
      `UPDATE registered_nodes SET ip_address = $1 WHERE id = $2`,
      [ip, id],
    );
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Distribution status ──────────────────────────────────────────────────────

router.get("/distribution/status", async (_req, res) => {
  try {
    const [batches, nodes, deployments] = await Promise.all([
      pool.query<{ total: string; authorized: string }>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN authorized THEN 1 ELSE 0 END) AS authorized
         FROM sovereign_batches`
      ),
      pool.query<{ total: string; authorized: string; pending: string }>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'AUTHORIZED' THEN 1 ELSE 0 END) AS authorized,
                SUM(CASE WHEN status = 'PENDING'    THEN 1 ELSE 0 END) AS pending
         FROM registered_nodes`
      ),
      pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM distribution_deployments`
      ),
    ]);
    res.json({
      online:      true,
      mode:        "local",
      version:     "5.2.0",
      batches:     { total: parseInt(batches.rows[0]?.total ?? "0"), authorized: parseInt(batches.rows[0]?.authorized ?? "0") },
      nodes:       { total: parseInt(nodes.rows[0]?.total ?? "0"), authorized: parseInt(nodes.rows[0]?.authorized ?? "0"), pending: parseInt(nodes.rows[0]?.pending ?? "0") },
      deployments: parseInt(deployments.rows[0]?.total ?? "0"),
      lastSync:    new Date().toISOString(),
    });
  } catch { res.json({ online: false, mode: "local", version: "5.2.0", batches: { total: 0, authorized: 0 }, nodes: { total: 0, authorized: 0, pending: 0 }, deployments: 0, lastSync: null }); }
});

// ── War Room ─────────────────────────────────────────────────────────────────

router.get("/distribution/war-room", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM distribution_war_room_events
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ events: result.rows });
  } catch { res.json({ events: [] }); }
});

router.post("/distribution/war-room/acknowledge", async (req, res) => {
  const { eventId, ackBy } = req.body as { eventId: number; ackBy?: string };
  if (!eventId) { res.status(400).json({ error: "eventId required" }); return; }
  try {
    await pool.query(
      `UPDATE distribution_war_room_events
       SET acknowledged = TRUE, ack_by = $1, ack_at = NOW()
       WHERE id = $2`,
      [ackBy ?? "sovereign", eventId],
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// Auto-seed a startup war-room event (once) so the panel isn't blank
pool.query(`
  INSERT INTO distribution_war_room_events (severity, category, title, description, source)
  SELECT 'INFO','SYSTEM','Vault System Online','Sovereign Distribution Vault initialized. All systems nominal.','vault-boot'
  WHERE NOT EXISTS (SELECT 1 FROM distribution_war_room_events LIMIT 1)
`).catch(() => {});

// ── Deployments ──────────────────────────────────────────────────────────────

router.get("/distribution/deployments", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, b.manufacturer_name, b.device_type
      FROM distribution_deployments d
      LEFT JOIN sovereign_batches b ON b.id = d.batch_id
      ORDER BY d.created_at DESC LIMIT 50
    `);
    res.json({ deployments: result.rows });
  } catch { res.json({ deployments: [] }); }
});

const DeploySchema = z.object({
  batchId:  z.number().int().positive().optional(),
  target:   z.string().min(1).max(120).default("ALL"),
  package:  z.string().min(1).max(120).default("titan-v-5.2.0"),
  notes:    z.string().max(500).optional(),
});

router.post("/distribution/deploy", async (req, res) => {
  const parsed = DeploySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { batchId, target, package: pkg, notes } = parsed.data;
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO distribution_deployments (batch_id, target, package, status, notes, started_at)
       VALUES ($1, $2, $3, 'IN_PROGRESS', $4, NOW())
       RETURNING id`,
      [batchId ?? null, target, pkg, notes ?? null],
    );
    const deployId = result.rows[0]!.id;

    // Simulate completion after 3 seconds
    setTimeout(async () => {
      await pool.query(
        `UPDATE distribution_deployments SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`,
        [deployId],
      ).catch(() => {});
      await pool.query(
        `INSERT INTO distribution_war_room_events (severity, category, title, description, source)
         VALUES ('INFO','DEPLOY','Deployment Completed','Package ${pkg} deployed to ${target}.','deploy-worker')`,
      ).catch(() => {});
    }, 3000);

    res.status(201).json({ deploymentId: deployId, status: "IN_PROGRESS" });
  } catch (err) {
    logger.error({ err }, "Deploy failed");
    res.status(500).json({ error: "Deploy failed" });
  }
});

// ── Hardware devices ─────────────────────────────────────────────────────────

router.get("/hardware/devices", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM sovereign_hardware_devices ORDER BY created_at DESC`);
    res.json({ devices: result.rows });
  } catch { res.json({ devices: [] }); }
});

const HardwareDeviceSchema = z.object({
  deviceLabel: z.string().min(1).max(200),
  deviceType:  z.string().min(1).max(60).default("kiosk"),
  firmware:    z.string().min(1).max(120).default("titan-v-5.2.0"),
  ipAddress:   z.string().max(100).optional(),
  notes:       z.string().max(500).optional(),
});

router.post("/hardware/devices", async (req, res) => {
  const parsed = HardwareDeviceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { deviceLabel, deviceType, firmware, ipAddress, notes } = parsed.data;
  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO sovereign_hardware_devices (device_label, device_type, firmware, ip_address, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [deviceLabel, deviceType, firmware, ipAddress ?? null, notes ?? null],
    );
    res.status(201).json({ id: result.rows[0]!.id });
  } catch (err) {
    logger.error({ err }, "Failed to register hardware device");
    res.status(500).json({ error: "Failed to register device" });
  }
});

router.post("/hardware/devices/:id/refresh", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid device id" }); return; }
  try {
    await pool.query(
      `UPDATE sovereign_hardware_devices SET last_seen = NOW(), signal_state = 'NOMINAL', sensor_state = 'ONLINE' WHERE id = $1`,
      [id],
    );
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
