/**
 * posIntegrations — CRUD for POS connections and credential vault.
 *
 * GET    /api/pos/providers          — list all adapter capabilities
 * GET    /api/pos/connections        — list venue's POS connections (auth required)
 * POST   /api/pos/connections        — create/register a POS connection
 * GET    /api/pos/connections/:id    — get single connection
 * PATCH  /api/pos/connections/:id    — update connection (status, meta)
 * DELETE /api/pos/connections/:id    — soft-delete (status = inactive)
 * POST   /api/pos/connections/:id/credentials — store encrypted credentials
 * POST   /api/pos/connections/:id/test        — test connectivity
 * POST   /api/pos/connections/:id/sync        — trigger on-demand inventory sync
 * GET    /api/pos/connections/:id/oauth-url   — get OAuth authorization URL
 * POST   /api/pos/oauth/callback     — handle OAuth code exchange
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, posConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest }  from "../middleware/auth";
import { requireRole }                    from "../middleware/roles";
import { tokenManager }                   from "../integrations/services/tokenManager";
import { listProviders, getUniversalAdapter } from "../integrations/services/posRouter";
import { syncVenueInventory }             from "../integrations/services/inventorySync";
import { posEventBus }                    from "../integrations/services/eventBus";
import { logAudit }                       from "../lib/audit";

const router = Router();

router.get("/pos/providers", (_req, res) => {
  res.json({ providers: listProviders() });
});

const createConnectionSchema = z.object({
  provider:    z.enum(["clover", "toast", "square", "lightspeed", "shopify", "ncr", "micros", "manual_import"]),
  displayName: z.string().min(1).max(100),
  merchantId:  z.string().max(200).optional(),
  locationId:  z.string().max(200).optional(),
  webhookUrl:  z.string().url().optional(),
  isDefault:   z.boolean().optional().default(false),
  meta:        z.record(z.string(), z.unknown()).optional(),
});

router.get("/pos/connections", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const rows = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.venueId, venueId));
  res.json({ connections: rows });
});

router.post("/pos/connections", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const parsed = createConnectionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }

  if (parsed.data.isDefault) {
    await db.update(posConnectionsTable)
      .set({ isDefault: false })
      .where(eq(posConnectionsTable.venueId, venueId));
  }

  const rows = await db.insert(posConnectionsTable).values({
    venueId,
    provider:    parsed.data.provider,
    displayName: parsed.data.displayName,
    merchantId:  parsed.data.merchantId ?? null,
    locationId:  parsed.data.locationId ?? null,
    webhookUrl:  parsed.data.webhookUrl ?? null,
    isDefault:   parsed.data.isDefault ?? false,
    meta:        parsed.data.meta ?? {},
    status:      "pending_auth",
    createdBy:   req.user?.id ? req.user.id : null,
  }).returning();

  await logAudit(req, { action: "pos_connection.created", entityType: "pos_connection", entityId: rows[0]!.id, after: { provider: parsed.data.provider }, venueId });
  res.status(201).json({ connection: rows[0] });
});

router.get("/pos/connections/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const rows = await db.select().from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.id, req.params["id"] as string), eq(posConnectionsTable.venueId, venueId)));
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ connection: rows[0] });
});

router.patch("/pos/connections/:id", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const id = req.params["id"] as string;

  const allowed = z.object({
    displayName: z.string().max(100).optional(),
    merchantId:  z.string().max(200).optional(),
    locationId:  z.string().max(200).optional(),
    webhookUrl:  z.string().url().optional().nullable(),
    status:      z.enum(["active", "inactive", "pending_auth"]).optional(),
    isDefault:   z.boolean().optional(),
    meta:        z.record(z.string(), z.unknown()).optional(),
  });
  const parsed = allowed.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }

  if (parsed.data.isDefault) {
    await db.update(posConnectionsTable).set({ isDefault: false }).where(eq(posConnectionsTable.venueId, venueId));
  }

  const rows = await db.update(posConnectionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(posConnectionsTable.id, id), eq(posConnectionsTable.venueId, venueId)))
    .returning();

  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ connection: rows[0] });
});

router.delete("/pos/connections/:id", requireAuth, requireRole("venue_owner", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  await db.update(posConnectionsTable)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(eq(posConnectionsTable.id, id), eq(posConnectionsTable.venueId, venueId)));
  await tokenManager.revoke(id, venueId);
  await logAudit(req, { action: "pos_connection.deleted", entityType: "pos_connection", entityId: id, venueId });
  res.json({ deleted: true });
});

router.post("/pos/connections/:id/credentials", requireAuth, requireRole("venue_owner", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const schema = z.object({
    accessToken:   z.string().min(1),
    refreshToken:  z.string().optional(),
    apiSecret:     z.string().optional(),
    tokenType:     z.string().optional(),
    scopes:        z.string().optional(),
    expiresIn:     z.number().int().positive().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }

  const rows = await db.select({ provider: posConnectionsTable.provider })
    .from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.id, id), eq(posConnectionsTable.venueId, venueId)))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }

  await tokenManager.store({ connectionId: id, venueId, provider: rows[0].provider, ...parsed.data });
  await db.update(posConnectionsTable).set({ status: "active", updatedAt: new Date() }).where(eq(posConnectionsTable.id, id));

  posEventBus.fire("pos.connection.established", { venueId, provider: rows[0].provider, connectionId: id });
  await logAudit(req, { action: "pos_credentials.stored", entityType: "pos_connection", entityId: id, venueId });
  res.json({ stored: true });
});

router.post("/pos/connections/:id/test", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const rows = await db.select().from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.id, id), eq(posConnectionsTable.venueId, venueId)))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const adapter = getUniversalAdapter(rows[0].provider);
  if (!adapter) { res.status(400).json({ error: "no_adapter", provider: rows[0].provider }); return; }

  const creds = await tokenManager.get(id, venueId);
  if (!creds) { res.json({ connected: false, error: "No credentials stored" }); return; }
  if (creds.isExpired) { res.json({ connected: false, error: "Token expired" }); return; }

  try {
    const start = Date.now();
    await adapter.syncInventory({
      accessToken: creds.accessToken, refreshToken: creds.refreshToken, apiSecret: creds.apiSecret,
      merchantId: rows[0].merchantId ?? undefined, locationId: rows[0].locationId ?? undefined,
    }, venueId);
    res.json({ connected: true, provider: rows[0].provider, responseMs: Date.now() - start });
  } catch (err) {
    res.json({ connected: false, error: String(err) });
  }
});

router.post("/pos/connections/:id/sync", requireAuth, requireRole("venue_owner", "super_admin", "manager", "staff"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const snapshot = await syncVenueInventory(venueId, true);
  if (!snapshot) { res.json({ synced: false, error: "No active POS connection or sync failed" }); return; }
  res.json({ synced: true, itemCount: snapshot.itemCount, outOfStockCount: snapshot.outOfStockIds.length, syncedAt: snapshot.syncedAt });
});

router.get("/pos/connections/:id/oauth-url", requireAuth, requireRole("venue_owner", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const rows = await db.select().from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.id, id), eq(posConnectionsTable.venueId, venueId)))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const adapter = getUniversalAdapter(rows[0].provider);
  if (!adapter?.getAuthorizationUrl) { res.status(400).json({ error: "Provider does not support OAuth" }); return; }

  const clientId    = process.env[`${rows[0].provider.toUpperCase()}_CLIENT_ID`] ?? "";
  const domain      = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const redirectUri = domain ? `https://${domain}/api/pos/oauth/callback` : "http://localhost/api/pos/oauth/callback";
  const state       = Buffer.from(JSON.stringify({ connectionId: id, venueId })).toString("base64");

  const url = adapter.getAuthorizationUrl(clientId, redirectUri, state);
  res.json({ url, provider: rows[0].provider });
});

router.post("/pos/oauth/callback", async (req: Request, res: Response) => {
  const { code, state } = req.body as { code?: string; state?: string };
  if (!code || !state) { res.status(400).json({ error: "code_and_state_required" }); return; }

  let decoded: { connectionId: string; venueId: string };
  try { decoded = JSON.parse(Buffer.from(state, "base64").toString("utf8")) as typeof decoded; }
  catch { res.status(400).json({ error: "invalid_state" }); return; }

  const rows = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.id, decoded.connectionId)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "connection_not_found" }); return; }

  const adapter = getUniversalAdapter(rows[0].provider);
  if (!adapter?.exchangeCode) { res.status(400).json({ error: "OAuth not supported" }); return; }

  const clientId     = process.env[`${rows[0].provider.toUpperCase()}_CLIENT_ID`]     ?? "";
  const clientSecret = process.env[`${rows[0].provider.toUpperCase()}_CLIENT_SECRET`] ?? "";
  const domain       = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  const redirectUri  = domain ? `https://${domain}/api/pos/oauth/callback` : "http://localhost/api/pos/oauth/callback";

  const tokens = await adapter.exchangeCode(clientId, clientSecret, code, redirectUri);
  await tokenManager.store({ connectionId: decoded.connectionId, venueId: decoded.venueId, provider: rows[0].provider, ...tokens });
  await db.update(posConnectionsTable).set({ status: "active", updatedAt: new Date() }).where(eq(posConnectionsTable.id, decoded.connectionId));

  posEventBus.fire("pos.connection.established", { venueId: decoded.venueId, provider: rows[0].provider, connectionId: decoded.connectionId });
  res.json({ connected: true, provider: rows[0].provider });
});

export default router;
