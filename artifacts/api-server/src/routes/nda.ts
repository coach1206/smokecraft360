/**
 * NDA routes.
 *
 *   GET  /api/nda/me              — { signed, signedAt, name }            (auth)
 *   POST /api/nda/sign            — body { name } → IP-vault gate sign    (auth)
 *
 *   POST /api/nda/demo-sign       — full ceremony from /demo gate         (public)
 *   GET  /api/nda/signatures      — list latest 100 demo signatures       (super_admin)
 *   GET  /api/nda/signatures/:id  — single signature with full data       (super_admin)
 *
 * The /me + /sign pair is the lightweight per-user gate that lets a logged-in
 * super_admin into the IP vault. The /demo-sign pair captures rich pre-auth
 * ceremony rows (typed name + initials + drawn canvas signature + agreed
 * checkbox + forensic fields) for legal evidence; reads are admin-only.
 */

import { Router, type IRouter, type Response, type Request } from "express";
import { eq, and, isNull, desc }               from "drizzle-orm";
import { db, usersTable, ndaSignaturesTable, analyticsEventsTable } from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";
import { ndaSignLimiter }                      from "../middleware/rateLimit";
import { logAudit }                            from "../lib/audit";

const router: IRouter = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coarse device classification from UA — for forensic logging only. */
function classifyDevice(ua: string | undefined): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s))                  return "tablet";
  if (/mobile|iphone|android.*mobile/.test(s)) return "mobile";
  if (/android/.test(s))                       return "tablet";
  return "desktop";
}

/** Validate signature dataURL: must be a PNG dataURL with non-trivial payload. */
function validateSignatureData(s: string): string | null {
  if (typeof s !== "string") return "signatureData must be a string";
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m)                                  return "signatureData must be a base64-encoded PNG/JPEG dataURL";
  // Cap at 256 KB raw to avoid DB bloat (architect-style guard).
  if (s.length > 350_000)                  return "signatureData exceeds 256 KB";
  // A near-empty canvas exports as ~1.5 KB of pure white PNG. Require at least
  // ~2 KB of payload so we don't accept blank canvases.
  if ((m[2]?.length ?? 0) < 2000)          return "signatureData appears to be empty";
  return null;
}

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const [u] = await db.select({
    ts:   usersTable.ndaSignedAt,
    name: usersTable.ndaSignatureName,
  }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
  res.json({
    signed:   !!u?.ts,
    signedAt: u?.ts ?? null,
    name:     u?.name ?? null,
  });
});

router.post(
  "/sign",
  requireAuth,
  allowOnly("name"),
  async (req: AuthRequest, res: Response) => {
    const { name } = req.body as { name?: unknown };
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: '"name" (signer full name) is required' }); return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      res.status(400).json({ error: '"name" must be 2-200 characters' }); return;
    }

    // Atomic conditional update — only signs if not already signed (preserves
    // the original timestamp on idempotent re-submits).
    const ip = req.ip ?? null;
    const updated = await db.update(usersTable).set({
      ndaSignedAt:      new Date(),
      ndaSignatureName: trimmed,
      ndaSignatureIp:   ip,
    }).where(and(
      eq(usersTable.id, req.user!.id),
      isNull(usersTable.ndaSignedAt),
    )).returning({
      ts:   usersTable.ndaSignedAt,
      name: usersTable.ndaSignatureName,
    });

    if (updated.length === 0) {
      // Already signed — return the existing signature.
      const [existing] = await db.select({
        ts:   usersTable.ndaSignedAt,
        name: usersTable.ndaSignatureName,
      }).from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
      res.json({ signed: true, signedAt: existing?.ts ?? null, name: existing?.name ?? null, alreadySigned: true });
      return;
    }

    req.log.info({ userId: req.user?.id, name: trimmed }, "NDA signed");
    res.status(201).json({ signed: true, signedAt: updated[0].ts, name: updated[0].name });
  },
);

// ── /api/nda/demo-sign ────────────────────────────────────────────────────────
// Public route — no auth required because the demo gate runs before login.

router.post(
  "/demo-sign",
  ndaSignLimiter, // HIGH (architect fix): IP-based throttle on public write endpoint
  allowOnly("fullName", "initials", "signatureData", "agreed", "sessionId", "deviceId", "venueId"),
  async (req: Request, res: Response) => {
    const b = req.body as {
      fullName?: unknown; initials?: unknown; signatureData?: unknown;
      agreed?: unknown; sessionId?: unknown; deviceId?: unknown; venueId?: unknown;
    };

    if (typeof b.fullName !== "string" || b.fullName.trim().length < 2 || b.fullName.trim().length > 200) {
      res.status(400).json({ error: '"fullName" must be 2-200 characters' }); return;
    }
    if (typeof b.initials !== "string" || b.initials.trim().length < 1 || b.initials.trim().length > 12) {
      res.status(400).json({ error: '"initials" must be 1-12 characters' }); return;
    }
    if (typeof b.signatureData !== "string") {
      res.status(400).json({ error: '"signatureData" is required' }); return;
    }
    const sigErr = validateSignatureData(b.signatureData);
    if (sigErr) { res.status(400).json({ error: sigErr }); return; }
    if (b.agreed !== true) {
      res.status(400).json({ error: '"agreed" must be true' }); return;
    }
    if (b.sessionId !== undefined && (typeof b.sessionId !== "string" || b.sessionId.length > 200)) {
      res.status(400).json({ error: '"sessionId" must be a string up to 200 chars' }); return;
    }
    const deviceIdVal = typeof b.deviceId === "string" && UUID_RE.test(b.deviceId) ? b.deviceId : null;
    const venueIdVal  = typeof b.venueId  === "string" && UUID_RE.test(b.venueId)  ? b.venueId  : null;

    const [row] = await db.insert(ndaSignaturesTable).values({
      fullName:      b.fullName.trim(),
      initials:      b.initials.trim(),
      signatureData: b.signatureData,
      agreed:        true,
      ipAddress:     req.ip ?? null,
      deviceType:    classifyDevice(req.get("user-agent") ?? undefined),
      sessionId:     typeof b.sessionId === "string" ? b.sessionId : null,
      deviceId:      deviceIdVal,
      venueId:       venueIdVal,
    }).returning({ id: ndaSignaturesTable.id, createdAt: ndaSignaturesTable.createdAt });

    req.log?.info({ id: row?.id, name: b.fullName.trim(), deviceId: deviceIdVal }, "demo NDA signed");

    void logAudit(req as unknown as import("../middleware/auth").AuthRequest, {
      action:     "nda.demo_signed",
      entityType: "nda_signature",
      entityId:   row?.id ?? null,
      after:      { fullName: b.fullName.trim(), deviceId: deviceIdVal, venueId: venueIdVal },
      venueId:    venueIdVal,
    });

    db.insert(analyticsEventsTable).values({
      eventType: "nda_signed",
      venueId:   venueIdVal,
      metadata:  { signatureId: row?.id, deviceId: deviceIdVal, sessionId: b.sessionId ?? null },
    }).catch(() => {});

    res.status(201).json({ id: row?.id, signedAt: row?.createdAt });
  },
);

// ── /api/nda/signatures (admin list) ──────────────────────────────────────────

router.get(
  "/signatures",
  requireAuth, requireRole("super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db.select({
      id:         ndaSignaturesTable.id,
      fullName:   ndaSignaturesTable.fullName,
      initials:   ndaSignaturesTable.initials,
      agreed:     ndaSignaturesTable.agreed,
      ipAddress:  ndaSignaturesTable.ipAddress,
      deviceType: ndaSignaturesTable.deviceType,
      sessionId:  ndaSignaturesTable.sessionId,
      deviceId:   ndaSignaturesTable.deviceId,
      venueId:    ndaSignaturesTable.venueId,
      createdAt:  ndaSignaturesTable.createdAt,
    }).from(ndaSignaturesTable).orderBy(desc(ndaSignaturesTable.createdAt)).limit(100);
    res.json({ signatures: rows });
  },
);

// ── /api/nda/signatures/:id (admin single — includes signature image) ────────

router.get(
  "/signatures/:id",
  requireAuth, requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(ndaSignaturesTable)
      .where(eq(ndaSignaturesTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  },
);

export default router;
