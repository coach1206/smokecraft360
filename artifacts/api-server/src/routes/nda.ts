/**
 * NDA — single-signature gate for the IP vault.
 *
 *   GET  /api/nda/me   — { signed: bool, signedAt, name }
 *   POST /api/nda/sign — body { name } → records signature
 *
 * Idempotent: re-signing returns the original signature payload (we keep
 * the first signature so the timestamp is the legally-meaningful one).
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, isNull }                     from "drizzle-orm";
import { db, usersTable }                      from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { allowOnly }                           from "../middleware/sanitize";

const router: IRouter = Router();

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

export default router;
