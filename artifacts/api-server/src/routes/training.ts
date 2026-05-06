/**
 * /api/training — Training Mode backend.
 *
 *   POST /api/training/start           — create or resume a training session
 *   GET  /api/training/scenarios       — list all scenarios (static)
 *   GET  /api/training/progress/:userId — get all progress for a user
 *   POST /api/training/progress        — upsert step progress
 *   POST /api/training/certification   — issue a certification
 *   GET  /api/training/certifications/:userId
 *   POST /api/training/reset           — reset all demo training data (super_admin)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and }                             from "drizzle-orm";
import { randomUUID }                          from "crypto";
import {
  db,
  trainingSessionsTable, trainingProgressTable, trainingCertificationsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                   from "../middleware/roles.js";
import { logger }                        from "../lib/logger.js";

const router: IRouter = Router();

// ── POST /api/training/start ──────────────────────────────────────────────────

router.post("/start", requireAuth, async (req: AuthRequest, res: Response) => {
  const { mode, role } = req.body as { mode: string; role?: string };
  if (!mode) { res.status(400).json({ error: "mode_required" }); return; }

  const userId = req.user?.id ?? null;

  const [session] = await db.insert(trainingSessionsTable).values({
    userId,
    mode:   mode as any,
    role:   role as any ?? null,
    status: "active",
  }).returning();

  logger.info({ mode, role, userId }, "Training session started");
  res.status(201).json({ session });
});

// ── GET /api/training/scenarios ───────────────────────────────────────────────

router.get("/scenarios", async (_req, res) => {
  // Scenarios are static config — returned from code, not DB.
  const scenarios = [
    { id: "first_time_pairing",       title: "First-Time Guest Pairing",          difficulty: "beginner",      category: "customer",    estimatedMin: 8,  steps: 5 },
    { id: "inventory_shortage",       title: "Inventory Shortage Recovery",        difficulty: "intermediate",  category: "operations",  estimatedMin: 6,  steps: 4 },
    { id: "upsell_opportunity",       title: "Upsell Opportunity",                 difficulty: "intermediate",  category: "revenue",     estimatedMin: 7,  steps: 4 },
    { id: "vip_handling",             title: "VIP Guest Handling",                 difficulty: "advanced",      category: "customer",    estimatedMin: 10, steps: 5 },
    { id: "distributor_campaign",     title: "Distributor Campaign Night",         difficulty: "intermediate",  category: "revenue",     estimatedMin: 8,  steps: 4 },
    { id: "rewards_issue",            title: "Rewards Redemption Issue",           difficulty: "beginner",      category: "customer",    estimatedMin: 5,  steps: 3 },
    { id: "rush_hour",                title: "High-Volume Rush Hour",              difficulty: "advanced",      category: "operations",  estimatedMin: 12, steps: 5 },
    { id: "recommendation_mismatch",  title: "Recommendation Mismatch Correction", difficulty: "intermediate", category: "ai",          estimatedMin: 6,  steps: 4 },
  ];
  res.json({ scenarios });
});

// ── GET /api/training/progress/:userId ───────────────────────────────────────

router.get("/progress/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = String(req.params["userId"]);
  const rows   = await db.select().from(trainingProgressTable)
    .where(eq(trainingProgressTable.userId, userId));
  res.json({ progress: rows });
});

// ── POST /api/training/progress ───────────────────────────────────────────────

router.post("/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  const { sessionId, scenarioId, stepIndex, totalSteps, score, completed } = req.body as {
    sessionId:  string; scenarioId: string; stepIndex: number;
    totalSteps: number; score?: number; completed?: boolean;
  };
  const userId = req.user?.id ?? null;

  const existing = await db.select({ id: trainingProgressTable.id })
    .from(trainingProgressTable)
    .where(and(
      eq(trainingProgressTable.sessionId, sessionId),
      eq(trainingProgressTable.scenarioId, scenarioId),
    )).limit(1);

  if (existing[0]) {
    const [updated] = await db.update(trainingProgressTable)
      .set({ stepIndex, score: score ?? 0, completed: completed ?? false, completedAt: completed ? new Date() : null })
      .where(eq(trainingProgressTable.id, existing[0].id))
      .returning();
    res.json({ progress: updated });
  } else {
    const [created] = await db.insert(trainingProgressTable).values({
      sessionId, userId, scenarioId, stepIndex, totalSteps,
      score: score ?? 0, completed: completed ?? false,
      completedAt: completed ? new Date() : null,
    }).returning();
    res.json({ progress: created });
  }
});

// ── POST /api/training/certification ─────────────────────────────────────────

router.post("/certification", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, mode, title, score } = req.body as { role?: string; mode: string; title: string; score: number };
  const userId = req.user?.id ?? null;
  const certId = `${mode}-${role ?? "general"}-${Date.now()}`;

  try {
    const [cert] = await db.insert(trainingCertificationsTable).values({
      userId, certId, role: role ?? null, mode, title, score,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600_000), // 1 year
    }).returning();
    res.status(201).json({ certification: cert });
  } catch (err) {
    logger.error({ err }, "Certification insert failed");
    res.status(500).json({ error: "certification_failed" });
  }
});

// ── GET /api/training/certifications/:userId ──────────────────────────────────

router.get("/certifications/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = String(req.params["userId"]);
  const certs  = await db.select().from(trainingCertificationsTable)
    .where(eq(trainingCertificationsTable.userId, userId));
  res.json({ certifications: certs });
});

// ── POST /api/training/reset — wipe all demo training data ───────────────────

router.post("/reset", requireAuth, requireRole("super_admin"), async (_req: AuthRequest, res: Response) => {
  await db.delete(trainingProgressTable);
  await db.delete(trainingSessionsTable);
  await db.delete(trainingCertificationsTable);
  res.json({ success: true, resetAt: new Date().toISOString() });
});

export default router;
