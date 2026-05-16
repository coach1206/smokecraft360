/**
 * posMenuMapping — Admin menu mapping dashboard API.
 */

import { Router, type Response } from "express";
import { z } from "zod/v4";
import { db, posMenuMappingsTable, posConnectionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { tokenManager }                  from "../integrations/services/tokenManager";
import { getUniversalAdapter }           from "../integrations/services/posRouter";

const router = Router();

router.get("/pos/menu-mappings", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const rows = await db.select().from(posMenuMappingsTable)
    .where(eq(posMenuMappingsTable.venueId, venueId));
  res.json({ mappings: rows });
});

const mappingSchema = z.object({
  connectionId:  z.string().uuid(),
  provider:      z.string().min(1),
  eeisProdId:    z.string().min(1),
  eeisName:      z.string().min(1),
  posProdId:     z.string().min(1),
  posName:       z.string().min(1),
  posCategory:   z.string().optional(),
  posPriceCents: z.number().int().nonnegative().optional(),
  sku:           z.string().optional(),
});

router.post("/pos/menu-mappings", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const parsed = mappingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }

  const rows = await db.insert(posMenuMappingsTable).values({
    venueId,
    mappedBy:      req.user?.id ?? null,
    isVerified:    false,
    isActive:      true,
    connectionId:  parsed.data.connectionId,
    provider:      parsed.data.provider,
    eeisProdId:    parsed.data.eeisProdId,
    eeisName:      parsed.data.eeisName,
    posProdId:     parsed.data.posProdId,
    posName:       parsed.data.posName,
    posCategory:   parsed.data.posCategory ?? null,
    posPriceCents: parsed.data.posPriceCents ?? null,
    sku:           parsed.data.sku ?? null,
  }).returning();

  res.status(201).json({ mapping: rows[0] });
});

router.patch("/pos/menu-mappings/:id", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const partial = z.object({
    posProdId:     z.string().optional(),
    posName:       z.string().optional(),
    posCategory:   z.string().optional(),
    posPriceCents: z.number().int().nonnegative().optional(),
    sku:           z.string().optional(),
    isVerified:    z.boolean().optional(),
    isActive:      z.boolean().optional(),
  }).safeParse(req.body);
  if (!partial.success) { res.status(400).json({ error: "validation_failed", details: partial.error.issues }); return; }

  const rows = await db.update(posMenuMappingsTable)
    .set({ ...partial.data, updatedAt: new Date() })
    .where(and(eq(posMenuMappingsTable.id, id), eq(posMenuMappingsTable.venueId, venueId)))
    .returning();
  if (!rows[0]) { res.status(404).json({ error: "not_found" }); return; }
  res.json({ mapping: rows[0] });
});

router.delete("/pos/menu-mappings/:id", requireAuth, requireRole("venue_owner", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const id = req.params["id"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  await db.delete(posMenuMappingsTable)
    .where(and(eq(posMenuMappingsTable.id, id), eq(posMenuMappingsTable.venueId, venueId)));
  res.json({ deleted: true });
});

router.get("/pos/menu-catalog/:connectionId", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const connectionId = req.params["connectionId"] as string;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }

  const rows = await db.select().from(posConnectionsTable)
    .where(and(eq(posConnectionsTable.id, connectionId), eq(posConnectionsTable.venueId, venueId)))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "connection_not_found" }); return; }

  const adapter = getUniversalAdapter(rows[0].provider);
  if (!adapter) { res.status(400).json({ error: "no_adapter" }); return; }

  const creds = await tokenManager.get(connectionId, venueId);
  if (!creds) { res.json({ items: [], error: "No credentials stored" }); return; }

  try {
    const items = await adapter.syncMenuCatalog({
      accessToken: creds.accessToken, refreshToken: creds.refreshToken,
      apiSecret: creds.apiSecret, merchantId: rows[0].merchantId ?? undefined, locationId: rows[0].locationId ?? undefined,
    }, venueId);
    res.json({ items, provider: rows[0].provider, count: items.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
