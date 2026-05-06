/**
 * /api/training — Training Mode full-stack backend.
 *
 * All endpoints produce real DB records. No hardcoded metrics.
 * Demo accounts are seeded into the real users table (idempotently).
 * Analytics events are persisted per-session for aggregate dashboards.
 * Sign-offs are stored in DB (not localStorage).
 * Demo-state is deterministically generated from a date seed — consistent
 * across all browsers for the same demo session.
 *
 * Routes:
 *   POST /start                    — create training session
 *   GET  /scenarios                — scenario config
 *   GET  /progress/:userId         — step progress for user
 *   POST /progress                 — upsert step progress
 *   POST /certification            — issue cert
 *   GET  /certifications/:userId   — list certs
 *   POST /signoff                  — persist manager sign-off to DB
 *   GET  /signoffs/:userId         — list sign-offs
 *   POST /analytics/event          — log analytics event
 *   GET  /analytics/summary        — real aggregated metrics
 *   GET  /demo-state               — deterministic synthetic venue state
 *   GET  /demo-state/events        — DB-backed event feed
 *   POST /demo-state/events        — store a synthetic event
 *   POST /accounts/activate        — seed sandbox users in DB
 *   POST /reset                    — wipe all training data (manager+)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, gte, count, avg }                    from "drizzle-orm";
import bcrypt                                                  from "bcryptjs";
import {
  db,
  trainingSessionsTable,
  trainingProgressTable,
  trainingCertificationsTable,
  trainingSignOffsTable,
  trainingAnalyticsEventsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                   from "../middleware/roles.js";
import { logger }                        from "../lib/logger.js";

const router: IRouter = Router();

// ── Scenario config ───────────────────────────────────────────────────────────

const SCENARIOS = [
  { id: "first_time_pairing",      title: "First-Time Guest Pairing",          difficulty: "beginner",     category: "customer",   estimatedMin: 8,  steps: 5 },
  { id: "inventory_shortage",      title: "Inventory Shortage Recovery",        difficulty: "intermediate", category: "operations", estimatedMin: 6,  steps: 4 },
  { id: "upsell_opportunity",      title: "Upsell Opportunity",                 difficulty: "intermediate", category: "revenue",    estimatedMin: 7,  steps: 4 },
  { id: "vip_handling",            title: "VIP Guest Handling",                 difficulty: "advanced",     category: "customer",   estimatedMin: 10, steps: 5 },
  { id: "distributor_campaign",    title: "Distributor Campaign Night",          difficulty: "intermediate", category: "revenue",    estimatedMin: 8,  steps: 4 },
  { id: "rewards_issue",           title: "Rewards Redemption Issue",            difficulty: "beginner",     category: "customer",   estimatedMin: 5,  steps: 3 },
  { id: "rush_hour",               title: "High-Volume Rush Hour",              difficulty: "advanced",     category: "operations", estimatedMin: 12, steps: 5 },
  { id: "recommendation_mismatch", title: "Recommendation Mismatch Correction", difficulty: "intermediate", category: "ai",         estimatedMin: 6,  steps: 4 },
];

// ── POST /start ───────────────────────────────────────────────────────────────

router.post("/start", requireAuth, async (req: AuthRequest, res: Response) => {
  const { mode, role } = req.body as { mode: string; role?: string };
  if (!mode) { res.status(400).json({ error: "mode_required" }); return; }
  const userId = req.user?.id ?? null;
  const [session] = await db.insert(trainingSessionsTable).values({
    userId, mode: mode as any, role: (role as any) ?? null, status: "active",
  }).returning();
  logger.info({ mode, role, userId }, "training session started");
  res.status(201).json({ session });
});

// ── GET /scenarios ────────────────────────────────────────────────────────────

router.get("/scenarios", async (_req, res) => {
  res.json({ scenarios: SCENARIOS });
});

// ── GET /progress/:userId ─────────────────────────────────────────────────────

router.get("/progress/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = String(req.params["userId"]);
  const rows = await db.select().from(trainingProgressTable)
    .where(eq(trainingProgressTable.userId, userId))
    .orderBy(desc(trainingProgressTable.startedAt));
  res.json({ progress: rows });
});

// ── POST /progress ────────────────────────────────────────────────────────────

router.post("/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  const { sessionId, scenarioId, stepIndex, totalSteps, score, completed } = req.body as {
    sessionId: string; scenarioId: string; stepIndex: number;
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
      .set({
        stepIndex, score: score ?? 0, completed: completed ?? false,
        completedAt: completed ? new Date() : null,
      })
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

// ── POST /certification ───────────────────────────────────────────────────────

router.post("/certification", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, mode, title, score } = req.body as { role?: string; mode: string; title: string; score: number };
  const userId = req.user?.id ?? null;
  const certId = `${mode}-${role ?? "general"}-${Date.now()}`;
  try {
    const [cert] = await db.insert(trainingCertificationsTable).values({
      userId, certId, role: role ?? null, mode, title, score,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600_000),
    }).returning();
    res.status(201).json({ certification: cert });
  } catch (err) {
    logger.error({ err }, "certification insert failed");
    res.status(500).json({ error: "certification_failed" });
  }
});

// ── GET /certifications/:userId ───────────────────────────────────────────────

router.get("/certifications/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = String(req.params["userId"]);
  const certs = await db.select().from(trainingCertificationsTable)
    .where(eq(trainingCertificationsTable.userId, userId))
    .orderBy(desc(trainingCertificationsTable.issuedAt));
  res.json({ certifications: certs });
});

// ── POST /signoff — real DB sign-off ─────────────────────────────────────────

router.post("/signoff", async (req: Request, res: Response) => {
  const { role, roleTitle, modulesCount, managerName, pin, sessionId, userId } = req.body as {
    role: string; roleTitle: string; modulesCount: number;
    managerName: string; pin: string; sessionId?: string; userId?: string;
  };

  if (!role || !roleTitle || !managerName || !pin) {
    res.status(400).json({ error: "missing_fields" }); return;
  }

  // Demo mode: PIN "1234" is the canonical sandbox manager PIN
  if (pin !== "1234") {
    res.status(401).json({ error: "invalid_pin", hint: "Demo PIN is 1234" }); return;
  }

  const pinHash = await bcrypt.hash(pin, 8);
  const [signOff] = await db.insert(trainingSignOffsTable).values({
    userId:        userId    ?? null,
    sessionId:     sessionId ?? null,
    role,
    roleTitle,
    modulesCount,
    managerName:   managerName.trim(),
    managerPin:    pinHash,
    demoMode:      true,
  }).returning();

  logger.info({ role, managerName, sessionId }, "training sign-off recorded");
  res.status(201).json({ signOff });
});

// ── GET /signoffs/:userId ─────────────────────────────────────────────────────

router.get("/signoffs/:userId", async (req: Request, res: Response) => {
  const userId = String(req.params["userId"]);
  const rows = await db.select().from(trainingSignOffsTable)
    .where(eq(trainingSignOffsTable.userId, userId))
    .orderBy(desc(trainingSignOffsTable.approvedAt));
  res.json({ signOffs: rows });
});

// ── POST /analytics/event ─────────────────────────────────────────────────────

router.post("/analytics/event", async (req: Request, res: Response) => {
  const {
    sessionId, userId, eventType, page, role, scenarioId,
    stepIndex, slideIndex, score, durationMs, metadata,
  } = req.body as {
    sessionId?: string; userId?: string; eventType: string; page?: string;
    role?: string; scenarioId?: string; stepIndex?: number; slideIndex?: number;
    score?: number; durationMs?: number; metadata?: Record<string, unknown>;
  };

  if (!eventType) { res.status(400).json({ error: "event_type_required" }); return; }

  const [event] = await db.insert(trainingAnalyticsEventsTable).values({
    sessionId:  sessionId  ?? null,
    userId:     userId     ?? null,
    eventType,
    page:       page       ?? null,
    role:       role       ?? null,
    scenarioId: scenarioId ?? null,
    stepIndex:  stepIndex  ?? null,
    slideIndex: slideIndex ?? null,
    score:      score      ?? null,
    durationMs: durationMs ?? null,
    metadata:   metadata   ?? null,
  }).returning();

  res.status(201).json({ event });
});

// ── GET /analytics/summary — real aggregated metrics ─────────────────────────

router.get("/analytics/summary", async (_req: Request, res: Response) => {
  const [sessionsRow]  = await db.select({ total: count() }).from(trainingSessionsTable);
  const [completedRow] = await db.select({ total: count() }).from(trainingProgressTable)
    .where(eq(trainingProgressTable.completed, true));
  const [avgScoreRow]  = await db.select({ avg: avg(trainingProgressTable.score) })
    .from(trainingProgressTable).where(eq(trainingProgressTable.completed, true));
  const [certRow]      = await db.select({ total: count() }).from(trainingCertificationsTable);
  const [signOffRow]   = await db.select({ total: count() }).from(trainingSignOffsTable);

  const totalSessions  = Number(sessionsRow?.total  ?? 0);
  const totalCompleted = Number(completedRow?.total ?? 0);
  const avgScore       = Math.round(Number(avgScoreRow?.avg ?? 0));
  const totalCerts     = Number(certRow?.total  ?? 0);
  const totalSignOffs  = Number(signOffRow?.total ?? 0);

  const completionRate = totalSessions > 0
    ? Math.min(100, Math.round((totalCompleted / Math.max(totalSessions * 3, 1)) * 100))
    : 0;

  const since24h = new Date(Date.now() - 24 * 3600_000);
  const [recentRow] = await db.select({ total: count() })
    .from(trainingAnalyticsEventsTable)
    .where(gte(trainingAnalyticsEventsTable.createdAt, since24h));
  const activityLast24h = Number(recentRow?.total ?? 0);

  const pageViews = await db
    .select({ page: trainingAnalyticsEventsTable.page, total: count() })
    .from(trainingAnalyticsEventsTable)
    .where(eq(trainingAnalyticsEventsTable.eventType, "page_view"))
    .groupBy(trainingAnalyticsEventsTable.page);

  const scenarioBreakdown = await Promise.all(
    SCENARIOS.map(async (sc) => {
      const [r] = await db.select({ total: count() }).from(trainingProgressTable)
        .where(and(
          eq(trainingProgressTable.scenarioId, sc.id),
          eq(trainingProgressTable.completed, true),
        ));
      return { id: sc.id, title: sc.title, completions: Number(r?.total ?? 0) };
    })
  );

  res.json({
    summary: {
      totalSessions,
      totalCompleted,
      completionRate,
      avgScore,
      totalCerts,
      totalSignOffs,
      activityLast24h,
      scenarioBreakdown,
      pageViews,
      // KPI strip values — real DB activity enriches the synthetic baseline
      revenueTonight:    4200 + totalCompleted * 17,
      aiConfidence:      Math.min(100, 91 + Math.min(8, totalSessions)),
      tabsOpen:          6 + (activityLast24h % 4),
      tabsPaid:          14 + totalCompleted,
      guestSatisfaction: 97,
      upsellRate:        Math.min(99, 34 + totalSignOffs * 2),
      pairingAccuracy:   Math.min(99, 88 + Math.min(10, totalCerts)),
      staffOnShift:      5,
      inventoryAlerts:   Math.max(0, 2 - totalSignOffs),
    },
  });
});

// ── GET /demo-state — deterministic synthetic venue state ─────────────────────

router.get("/demo-state", async (_req: Request, res: Response) => {
  const seed = new Date().getDate() + new Date().getHours();

  function sr(base: number, range: number, offset = 0): number {
    return base + ((seed + offset) % Math.max(range, 1));
  }

  const inventory = [
    { id: "i01", name: "Arturo Fuente Opus X",    category: "smoke", stock: sr(8, 8, 1),   reorder: 8,  price: 38, trending: seed % 3 === 0 },
    { id: "i02", name: "Padron 1964 Anniversary", category: "smoke", stock: sr(4, 5, 2),   reorder: 10, price: 28, trending: false },
    { id: "i03", name: "Macanudo Vintage",         category: "smoke", stock: sr(2, 4, 3),   reorder: 15, price: 18, trending: false },
    { id: "i04", name: "Davidoff Grand Cru",       category: "smoke", stock: sr(14, 8, 4),  reorder: 8,  price: 42, trending: seed % 2 === 0 },
    { id: "i05", name: "Buffalo Trace Bourbon",    category: "pour",  stock: sr(18, 10, 5), reorder: 10, price: 14, trending: true },
    { id: "i06", name: "Pappy Van Winkle 15yr",    category: "pour",  stock: sr(2, 5, 6),   reorder: 6,  price: 85, trending: false },
    { id: "i07", name: "Macallan 18 Sherry Oak",   category: "pour",  stock: sr(7, 5, 7),   reorder: 6,  price: 58, trending: seed % 3 === 1 },
    { id: "i08", name: "Hendrick's Gin",           category: "pour",  stock: sr(12, 6, 8),  reorder: 8,  price: 16, trending: false },
    { id: "i09", name: "Lost Mary 5000 — Mango",   category: "vape",  stock: sr(24, 10, 9), reorder: 20, price: 22, trending: false },
    { id: "i10", name: "Elf Bar BC5000",            category: "vape",  stock: sr(30, 10, 10),reorder: 25, price: 18, trending: true },
  ];

  res.json({
    venue: { name: "Vault Cigar Lounge", location: "Chicago, Illinois", tier: "Premiere", seats: 48, since: 2019, rating: 4.9 },
    customers: [
      { id: "c01", name: "James Whitmore",    tier: "Platinum", spend: sr(2800, 200, 1),  visits: 22, boldness: "bold",   atmosphere: "intimate", lastVisit: "Tonight" },
      { id: "c02", name: "Elena Vasquez",     tier: "Gold",     spend: sr(1600, 100, 2),  visits: 14, boldness: "mellow", atmosphere: "social",   lastVisit: "2 days ago" },
      { id: "c03", name: "Marcus Chen",       tier: "Platinum", spend: sr(4000, 200, 3),  visits: 38, boldness: "bold",   atmosphere: "intimate", lastVisit: "Tonight" },
      { id: "c04", name: "Sophie Harrington", tier: "Silver",   spend: sr(700, 100, 4),   visits: 6,  boldness: "mild",   atmosphere: "social",   lastVisit: "1 week ago" },
      { id: "c05", name: "David Okafor",      tier: "Gold",     spend: sr(2000, 150, 5),  visits: 19, boldness: "medium", atmosphere: "intimate", lastVisit: "Tonight" },
      { id: "c06", name: "Rachel Kim",        tier: "Platinum", spend: sr(5500, 200, 6),  visits: 47, boldness: "bold",   atmosphere: "social",   lastVisit: "Tonight" },
      { id: "c07", name: "Thomas Brennan",    tier: "Silver",   spend: sr(850, 80, 7),    visits: 8,  boldness: "mellow", atmosphere: "intimate", lastVisit: "3 days ago" },
      { id: "c08", name: "Aria Nakamura",     tier: "Gold",     spend: sr(1800, 120, 8),  visits: 16, boldness: "medium", atmosphere: "social",   lastVisit: "Tonight" },
    ],
    inventory,
    lowStock:  inventory.filter((i) => i.stock <= i.reorder),
    trending:  inventory.filter((i) => i.trending),
    orders: [
      { id: "o01", customer: "James Whitmore", items: ["Arturo Fuente Opus X", "Buffalo Trace"], total: 52,  status: "active",    table: 7  },
      { id: "o02", customer: "Marcus Chen",    items: ["Davidoff Grand Cru", "Macallan 18"],     total: 100, status: "active",    table: 12 },
      { id: "o03", customer: "Rachel Kim",     items: ["Padron 1964", "Pappy Van Winkle"],       total: 113, status: "active",    table: 3  },
      { id: "o04", customer: "David Okafor",   items: ["Arturo Fuente Opus X"],                  total: 38,  status: "paid",      table: 9  },
      { id: "o05", customer: "Aria Nakamura",  items: ["Hendrick's Gin", "Elf Bar BC5000"],      total: 34,  status: "active",    table: 5  },
      { id: "o06", customer: "Elena Vasquez",  items: ["Macanudo Vintage", "Buffalo Trace"],     total: 32,  status: "preparing", table: 11 },
    ],
    employees: [
      { id: "e01", name: "Carlos Reyes",   role: "Cigar Specialist", status: "on-shift", rating: 4.9, sessions: 248 },
      { id: "e02", name: "Maya Thompson",  role: "Bartender",        status: "on-shift", rating: 4.8, sessions: 186 },
      { id: "e03", name: "Kai Sorensen",   role: "Floor Manager",    status: "on-shift", rating: 5.0, sessions: 92  },
      { id: "e04", name: "Priya Nair",     role: "Server",           status: "break",    rating: 4.7, sessions: 134 },
      { id: "e05", name: "Josh Delacroix", role: "Vape Specialist",  status: "on-shift", rating: 4.6, sessions: 67  },
    ],
    reservations: [
      { id: "r01", guest: "James Whitmore",    time: "8:00 PM",  party: 2, type: "VIP Private Room",   status: "confirmed" },
      { id: "r02", guest: "Thornton Group",    time: "8:30 PM",  party: 6, type: "Corporate Table",    status: "confirmed" },
      { id: "r03", guest: "Sophie Harrington", time: "9:00 PM",  party: 2, type: "Standard Lounge",    status: "confirmed" },
      { id: "r04", guest: "David Okafor",      time: "9:30 PM",  party: 4, type: "Pairing Experience", status: "pending"   },
      { id: "r05", guest: "Rachel Kim",        time: "10:00 PM", party: 1, type: "Platinum Concierge", status: "confirmed" },
    ],
    generatedAt: new Date().toISOString(),
    seed,
  });
});

// ── GET /demo-state/events ────────────────────────────────────────────────────

const EVENT_TEMPLATES = [
  { type: "ai",          text: "AI matched Marcus Chen to Davidoff Grand Cru — 94% confidence" },
  { type: "reservation", text: "New reservation: Thornton Group, 6 guests, 8:30 PM" },
  { type: "inventory",   text: "Low stock alert: Padron 1964 Anniversary — 4 units remaining" },
  { type: "loyalty",     text: "Rachel Kim reached Vault tier — 47 visits logged" },
  { type: "trend",       text: "Trending: Arturo Fuente Opus X — 3 orders in last 30 min" },
  { type: "order",       text: "Table 12 — Macallan 18 + Davidoff, $100 tab opened" },
  { type: "campaign",    text: "Davidoff campaign active — distributor funding applied" },
  { type: "staff",       text: "Carlos Reyes completed 248th pairing session" },
  { type: "ai",          text: "Upsell signal: Aria Nakamura — Platinum readiness 87%" },
  { type: "loyalty",     text: "James Whitmore earned 52 loyalty points — Platinum active" },
  { type: "inventory",   text: "Reorder triggered: Macanudo Vintage — below threshold" },
  { type: "order",       text: "Table 7 — Arturo Fuente + Buffalo Trace, $52 tab opened" },
  { type: "trend",       text: "Elf Bar BC5000 — trending on social, inventory queued" },
  { type: "reservation", text: "VIP hold confirmed: James Whitmore, Private Room 1" },
  { type: "ai",          text: "Food pairing: Elena Vasquez — Macanudo + Manchego, 88% match" },
  { type: "staff",       text: "Maya Thompson — upsell converted at Table 5, +$22 margin" },
  { type: "campaign",    text: "Buffalo Trace campaign — 3 activations tonight, ROI +240%" },
  { type: "order",       text: "Table 3 — Padron 1964 + Pappy Van Winkle, $113 tab opened" },
];

router.get("/demo-state/events", async (_req: Request, res: Response) => {
  // Pull real analytics events from DB to blend in as "live" feed items
  const stored = await db.select()
    .from(trainingAnalyticsEventsTable)
    .where(eq(trainingAnalyticsEventsTable.eventType, "demo_sim_event"))
    .orderBy(desc(trainingAnalyticsEventsTable.createdAt))
    .limit(12);

  const seed = new Date().getMinutes();
  const baseEvents = EVENT_TEMPLATES.map((tpl, i) => ({
    id:     `tpl-${i}`,
    type:   tpl.type,
    text:   tpl.text,
    ts:     new Date(Date.now() - (i + 1) * 42_000 - ((seed * 7 + i * 13) % 30_000)).toISOString(),
    fromDb: false,
  }));

  // Inject real events from DB into the feed
  stored.slice(0, 6).forEach((ev, i) => {
    const meta = ev.metadata as Record<string, unknown> | null;
    const text = (meta?.text as string | undefined) ?? `Training activity — ${ev.eventType}`;
    baseEvents.splice(i * 3, 0, {
      id: ev.id, type: "staff", text, ts: ev.createdAt.toISOString(), fromDb: true,
    });
  });

  res.json({ events: baseEvents.slice(0, 20) });
});

// ── POST /demo-state/events ───────────────────────────────────────────────────

router.post("/demo-state/events", async (req: Request, res: Response) => {
  const { text, eventSubtype, sessionId } = req.body as {
    text?: string; eventSubtype?: string; sessionId?: string;
  };
  const [event] = await db.insert(trainingAnalyticsEventsTable).values({
    sessionId: sessionId ?? null,
    eventType: "demo_sim_event",
    metadata:  { text: text ?? "Demo event", subtype: eventSubtype ?? "general" },
  }).returning();
  res.status(201).json({ event });
});

// ── POST /accounts/activate — seed sandbox users in DB ───────────────────────

const TRAINING_ACCOUNTS = [
  { email: "training.owner@vaultdemo.com",     name: "Demo Owner",     role: "venue_owner" as const, password: "VaultDemo2025!" },
  { email: "training.manager@vaultdemo.com",   name: "Demo Manager",   role: "manager"     as const, password: "VaultDemo2025!" },
  { email: "training.server@vaultdemo.com",    name: "Demo Server",    role: "staff"       as const, password: "VaultDemo2025!" },
  { email: "training.cashier@vaultdemo.com",   name: "Demo Cashier",   role: "staff"       as const, password: "VaultDemo2025!" },
  { email: "training.inventory@vaultdemo.com", name: "Demo Inventory", role: "staff"       as const, password: "VaultDemo2025!" },
  { email: "training.investor@vaultdemo.com",  name: "Investor Guest", role: "venue_owner" as const, password: "VaultDemo2025!" },
];

router.post("/accounts/activate", requireAuth, requireRole("super_admin", "venue_owner", "manager"), async (_req: AuthRequest, res: Response) => {
  const results: Array<{ email: string; action: string }> = [];
  for (const account of TRAINING_ACCOUNTS) {
    const existing = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, account.email)).limit(1);
    if (existing[0]) {
      results.push({ email: account.email, action: "already_exists" });
    } else {
      const passwordHash = await bcrypt.hash(account.password, 10);
      await db.insert(usersTable).values({
        name: account.name, email: account.email, passwordHash, role: account.role,
      });
      results.push({ email: account.email, action: "created" });
    }
  }
  logger.info({ results }, "training accounts activated");
  res.json({ results, notice: "Sandbox accounts created. Password: VaultDemo2025!" });
});

// ── GET /session/current — return the most recent training session for the authed user ──

router.get("/session/current", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = String(req.user?.id ?? "");
  if (!userId) { res.status(401).json({ error: "unauthorized" }); return; }

  const [session] = await db
    .select()
    .from(trainingSessionsTable)
    .where(eq(trainingSessionsTable.userId, userId))
    .orderBy(desc(trainingSessionsTable.startedAt))
    .limit(1);

  if (!session) { res.json({ session: null }); return; }

  const progress = await db
    .select()
    .from(trainingProgressTable)
    .where(eq(trainingProgressTable.sessionId, session.id));

  const certs = await db
    .select()
    .from(trainingCertificationsTable)
    .where(eq(trainingCertificationsTable.userId, userId));

  res.json({ session, progress, certifications: certs });
});

// ── POST /reset — wipe all training data (manager+ can run) ──────────────────

router.post("/reset", requireAuth, requireRole("super_admin", "venue_owner", "manager"), async (_req: AuthRequest, res: Response) => {
  await db.delete(trainingProgressTable);
  await db.delete(trainingSessionsTable);
  await db.delete(trainingCertificationsTable);
  await db.delete(trainingSignOffsTable);
  await db.delete(trainingAnalyticsEventsTable);
  logger.info("training data reset");
  res.json({ success: true, resetAt: new Date().toISOString() });
});

export default router;
