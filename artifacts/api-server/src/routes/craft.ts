/**
 * /api/craft — unified craft intelligence hub.
 *
 *   POST /api/craft/score              — score a build using the craft engine
 *   POST /api/craft/session/save       — save/update a craft session
 *   GET  /api/craft/session/:id        — load a craft session by id
 *   GET  /api/craft/leaderboard        — top scorers across all craft types
 *   GET  /api/craft/intel/quick        — trending style + top creator (lightweight)
 *   GET  /api/craft/intel/summary      — top preference + action list (owner view)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql, and, isNotNull, gte }               from "drizzle-orm";
import { z }                                                 from "zod";
import { db, craftBuildsTable, usersTable, userPreferencesTable, craftSessionStatesTable } from "@workspace/db";
import { scoreBuild }                                        from "../engine/craftEngine";

const router: IRouter = Router();

// ── POST /api/craft/score ─────────────────────────────────────────────────────

const scoreSchema = z.object({
  strength:    z.number().finite().min(0).max(5),
  flavorMatch: z.number().finite().min(0).max(5),
  balance:     z.number().finite().min(0).max(5),
  finish:      z.number().finite().min(0).max(5),
  timeTaken:   z.number().finite().min(0),
  converted:   z.boolean().optional().default(false),
});

router.post("/score", (req: Request, res: Response) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }
  res.json(scoreBuild(parsed.data));
});

// ── POST /api/craft/session/save ──────────────────────────────────────────────

router.post("/session/save", (_req: Request, res: Response) => {
  // Sessions are persisted via /api/craft-sessions (PATCH). This endpoint
  // exists for spec compatibility — future expansions can write extra metadata here.
  res.json({ status: "saved" });
});

// ── GET /api/craft/session/:id ────────────────────────────────────────────────

router.get("/session/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }
  const [session] = await db
    .select()
    .from(craftSessionStatesTable)
    .where(eq(craftSessionStatesTable.id, id))
    .limit(1);
  res.json({ session: session ?? null });
});

// ── GET /api/craft/leaderboard ────────────────────────────────────────────────

router.get("/leaderboard", async (_req: Request, res: Response) => {
  // Top 10 users by highest craft build score, joining user name.
  const rows = await db
    .select({
      userId: craftBuildsTable.userId,
      name:   usersTable.name,
      score:  sql<number>`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`.as("score"),
      craft:  craftBuildsTable.craft,
    })
    .from(craftBuildsTable)
    .leftJoin(usersTable, eq(craftBuildsTable.userId, usersTable.id))
    .where(isNotNull(craftBuildsTable.score))
    .groupBy(craftBuildsTable.userId, usersTable.name, craftBuildsTable.craft)
    .orderBy(desc(sql`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`))
    .limit(10);

  res.json(
    rows.map(r => ({
      name:  r.name ?? "Guest",
      score: Number(Number(r.score).toFixed(2)),
      craft: r.craft,
    })),
  );
});

// ── GET /api/craft/intel/quick ────────────────────────────────────────────────

router.get("/intel/quick", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [trendRow] = await db
    .select({
      styleChoice: craftBuildsTable.styleChoice,
      moodChoice:  craftBuildsTable.moodChoice,
      cnt:         sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(craftBuildsTable)
    .where(and(
      isNotNull(craftBuildsTable.styleChoice),
      gte(craftBuildsTable.createdAt, since),
    ))
    .groupBy(craftBuildsTable.styleChoice, craftBuildsTable.moodChoice)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const [topRow] = await db
    .select({
      name:  usersTable.name,
      score: sql<number>`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`.as("top_score"),
    })
    .from(craftBuildsTable)
    .leftJoin(usersTable, eq(craftBuildsTable.userId, usersTable.id))
    .where(isNotNull(craftBuildsTable.score))
    .groupBy(usersTable.name)
    .orderBy(desc(sql`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))`))
    .limit(1);

  const style  = trendRow?.styleChoice ?? "Bold";
  const mood   = trendRow?.moodChoice  ?? "Relaxed";
  const trend  = `${capitalize(style)} + ${capitalize(mood)}`;
  const creator = topRow?.name ?? "James";

  res.json({ trend, topCreator: creator });
});

// ── GET /api/craft/intel/summary ──────────────────────────────────────────────

router.get("/intel/summary", async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Top mood from preferences last 7 days
  const [topPrefRow] = await db
    .select({
      mood: userPreferencesTable.mood,
      cnt:  sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(userPreferencesTable)
    .where(gte(userPreferencesTable.createdAt, since))
    .groupBy(userPreferencesTable.mood)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  // Top style choice from craft builds last 7 days
  const [topStyleRow] = await db
    .select({
      styleChoice: craftBuildsTable.styleChoice,
      cnt:         sql<number>`COUNT(*)`.as("cnt"),
    })
    .from(craftBuildsTable)
    .where(and(
      isNotNull(craftBuildsTable.styleChoice),
      gte(craftBuildsTable.createdAt, since),
    ))
    .groupBy(craftBuildsTable.styleChoice)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const mood  = topPrefRow?.mood       ?? "relaxed";
  const style = topStyleRow?.styleChoice ?? "bold";

  const topPreference = `${capitalize(style)} + ${capitalize(mood)}`;

  const actions = [
    `Stock more ${capitalize(style)} selections`,
    `Promote ${capitalize(mood)} mood pairings`,
    style.toLowerCase() === "bold"   ? "Reduce light/mild inventory"  :
    style.toLowerCase() === "smooth" ? "Reduce heavy/full-body stock"  :
    "Balance variety across all strength levels",
  ];

  res.json({ topPreference, actions });
});

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default router;
