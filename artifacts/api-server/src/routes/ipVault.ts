/**
 * IP Vault — owner-only intellectual-property evidence registry.
 *
 *   GET    /api/ip-vault              — list (super_admin only)
 *   GET    /api/ip-vault/:id          — fetch one
 *   POST   /api/ip-vault              — create (status defaults to "draft")
 *   PATCH  /api/ip-vault/:id          — update title/desc/status/notes/etc
 *   POST   /api/ip-vault/:id/register — promote draft → registered
 *                                       (sets registeredAt + registeredBy)
 *   DELETE /api/ip-vault/:id          — soft-delete (sets retiredAt)
 *
 * Every route is super_admin-only AND requires a signed NDA (own column on
 * users). NDA is enforced via a small helper, not middleware, so we can
 * return a clean 412 Precondition Failed with a useful payload pointing
 * the client at /api/nda/sign.
 */

import { Router, type IRouter, type Response, type NextFunction } from "express";
import { and, desc, eq, isNull, sql }          from "drizzle-orm";
import {
  db, ipAssetsTable, usersTable,
  IP_ASSET_KINDS, IP_ASSET_STATUSES,
  type IpAssetKind, type IpAssetStatus,
} from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";

const router: IRouter = Router();
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_RE  = /^[a-f0-9]{32,128}$/i;
// HIGH: enforce https for evidence URLs to prevent MITM on sensitive IP.
const HTTPS_RE = /^https:\/\//i;

/**
 * Router-level middleware (architect HIGH fix): apply NDA + auth + role
 * gate ONCE for every IP-vault route so a future handler cannot
 * accidentally skip the NDA check.
 */
async function requireNdaMw(req: AuthRequest, res: Response, next: NextFunction) {
  const uid = req.user?.id;
  if (!uid) { res.status(401).json({ error: "Auth required" }); return; }
  const [u] = await db.select({ ts: usersTable.ndaSignedAt })
    .from(usersTable).where(eq(usersTable.id, uid)).limit(1);
  if (!u?.ts) {
    res.status(412).json({
      error:        "NDA signature required to access IP vault",
      requiresNda:  true,
      signEndpoint: "/api/nda/sign",
    });
    return;
  }
  next();
}

router.use(requireAuth, requireRole("super_admin"), requireNdaMw);

// ── GET /api/ip-vault ─────────────────────────────────────────────────────────

router.get(
  "/",
  async (req: AuthRequest, res: Response) => {

    const includeRetired = req.query["includeRetired"] === "true";
    const status = typeof req.query["status"] === "string" ? req.query["status"] : null;

    const conditions = [];
    if (!includeRetired) conditions.push(isNull(ipAssetsTable.retiredAt));
    if (status && (IP_ASSET_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(ipAssetsTable.status, status as IpAssetStatus));
    }
    const rows = conditions.length > 0
      ? await db.select().from(ipAssetsTable).where(and(...conditions)).orderBy(desc(ipAssetsTable.createdAt))
      : await db.select().from(ipAssetsTable).orderBy(desc(ipAssetsTable.createdAt));
    res.json({ assets: rows });
  },
);

// ── GET /api/ip-vault/:id ─────────────────────────────────────────────────────

router.get(
  "/:id",
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(ipAssetsTable).where(eq(ipAssetsTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Asset not found" }); return; }
    res.json(row);
  },
);

// ── POST /api/ip-vault ────────────────────────────────────────────────────────

router.post(
  "/",
  allowOnly("title", "kind", "description", "fileUrl", "fileHash", "authorship", "notes"),
  async (req: AuthRequest, res: Response) => {

    const { title, kind, description, fileUrl, fileHash, authorship, notes } =
      req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: '"title" is required' }); return;
    }
    if (typeof kind !== "string" || !(IP_ASSET_KINDS as readonly string[]).includes(kind)) {
      res.status(400).json({ error: `"kind" must be one of: ${IP_ASSET_KINDS.join(", ")}` }); return;
    }
    if (fileUrl !== undefined && fileUrl !== null && (typeof fileUrl !== "string" || !HTTPS_RE.test(fileUrl))) {
      res.status(400).json({ error: '"fileUrl" must be an https URL or omitted' }); return;
    }
    if (fileHash !== undefined && fileHash !== null && (typeof fileHash !== "string" || !HASH_RE.test(fileHash))) {
      res.status(400).json({ error: '"fileHash" must be a 32-128 char hex digest or omitted' }); return;
    }

    const [row] = await db.insert(ipAssetsTable).values({
      title:       title.trim(),
      kind:        kind as IpAssetKind,
      description: typeof description === "string" ? description.trim() || null : null,
      fileUrl:     typeof fileUrl  === "string" ? fileUrl  : null,
      fileHash:    typeof fileHash === "string" ? fileHash.toLowerCase() : null,
      authorship:  typeof authorship === "string" ? authorship.trim() || null : null,
      notes:       typeof notes === "string" ? notes.trim() || null : null,
      createdBy:   req.user!.id,
    }).returning();

    req.log.info({ assetId: row.id, kind: row.kind, by: req.user?.id }, "ip asset created");
    res.status(201).json(row);
  },
);

// ── PATCH /api/ip-vault/:id ───────────────────────────────────────────────────

router.patch(
  "/:id",
  allowOnly("title", "description", "status", "notes", "fileUrl", "fileHash", "authorship"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const patch: Record<string, unknown> = {};
    const { title, description, status, notes, fileUrl, fileHash, authorship } =
      req.body as Record<string, unknown>;

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) { res.status(400).json({ error: '"title" must be non-empty' }); return; }
      patch["title"] = title.trim();
    }
    if (description !== undefined)
      patch["description"] = typeof description === "string" ? description.trim() || null : null;
    if (status !== undefined) {
      if (typeof status !== "string" || !(IP_ASSET_STATUSES as readonly string[]).includes(status)) {
        res.status(400).json({ error: `"status" must be one of: ${IP_ASSET_STATUSES.join(", ")}` }); return;
      }
      patch["status"] = status as IpAssetStatus;
    }
    if (notes !== undefined)
      patch["notes"] = typeof notes === "string" ? notes.trim() || null : null;
    if (fileUrl !== undefined) {
      if (fileUrl !== null && (typeof fileUrl !== "string" || !HTTPS_RE.test(fileUrl))) {
        res.status(400).json({ error: '"fileUrl" must be an https URL or null' }); return;
      }
      patch["fileUrl"] = fileUrl;
    }
    if (fileHash !== undefined) {
      if (fileHash !== null && (typeof fileHash !== "string" || !HASH_RE.test(fileHash))) {
        res.status(400).json({ error: '"fileHash" must be a 32-128 char hex digest or null' }); return;
      }
      patch["fileHash"] = typeof fileHash === "string" ? fileHash.toLowerCase() : null;
    }
    if (authorship !== undefined)
      patch["authorship"] = typeof authorship === "string" ? authorship.trim() || null : null;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No fields to update" }); return;
    }

    const updated = await db.update(ipAssetsTable).set(patch)
      .where(and(eq(ipAssetsTable.id, id), isNull(ipAssetsTable.retiredAt)))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ error: "Asset not found or retired" }); return;
    }
    res.json(updated[0]);
  },
);

// ── POST /api/ip-vault/:id/register ───────────────────────────────────────────

router.post(
  "/:id/register",
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    // Atomic: only registers if currently draft and not retired.
    const updated = await db.update(ipAssetsTable).set({
      status:       "registered",
      registeredAt: new Date(),
      registeredBy: req.user!.id,
    }).where(and(
      eq(ipAssetsTable.id, id),
      eq(ipAssetsTable.status, "draft"),
      isNull(ipAssetsTable.retiredAt),
    )).returning();

    if (updated.length === 0) {
      const [fresh] = await db.select().from(ipAssetsTable).where(eq(ipAssetsTable.id, id)).limit(1);
      res.status(409).json({
        error: fresh ? `Cannot register asset in status "${fresh.status}"` : "Asset not found",
        currentStatus: fresh?.status ?? null,
      });
      return;
    }
    req.log.info({ assetId: id, by: req.user?.id }, "ip asset registered");
    res.json(updated[0]);
  },
);

// ── DELETE /api/ip-vault/:id ──────────────────────────────────────────────────

router.delete(
  "/:id",
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const updated = await db.update(ipAssetsTable).set({
      retiredAt: new Date(),
      status:    "retired",
    }).where(and(eq(ipAssetsTable.id, id), isNull(ipAssetsTable.retiredAt))).returning();

    if (updated.length === 0) { res.status(404).json({ error: "Asset not found or already retired" }); return; }
    req.log.info({ assetId: id, by: req.user?.id }, "ip asset retired");
    res.json({ ok: true, asset: updated[0] });
  },
);

void sql;
export default router;
