/**
 * /api/governance — Enterprise Control Layer
 *
 * Extends existing kill-switch, RBAC, and audit infrastructure with:
 *   GET  /api/governance/kill-switches            list all system flags
 *   POST /api/governance/kill-switches/:name      toggle on/off (super_admin)
 *   GET  /api/governance/role-matrix              all users with roles, scoped by venue
 *   POST /api/governance/role-matrix/:userId/role change role (super_admin | venue_owner)
 *   GET  /api/governance/permissions              venue-scoped permission summary
 *   GET  /api/governance/automation-queue         pending automation approvals
 *   POST /api/governance/automation-queue/:id     approve or reject
 *   GET  /api/governance/health                   system health summary
 *
 * All writes emit audit log entries via lib/audit.ts.
 * Tenant isolation: venue_owner/manager scoped to req.user.venueId.
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, isNull, sql }          from "drizzle-orm";
import { z }                                   from "zod/v4";
import { db, featureFlagsTable, auditLogTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { logAudit }                            from "../lib/audit";

const router: IRouter = Router();

// ── Kill-switch definitions ────────────────────────────────────────────────────
// Canonical list of system kill switches with descriptions and safe defaults.

const SYSTEM_KILL_SWITCHES: {
  name:        string;
  label:       string;
  description: string;
  category:    string;
  safeDefault: boolean; // true = enabled by default
  risk:        "low" | "medium" | "high";
}[] = [
  {
    name: "payments-enabled",
    label: "Payment Processing",
    description: "Allow guests to complete purchases through the POS and checkout flow.",
    category: "commerce",
    safeDefault: true,
    risk: "high",
  },
  {
    name: "rewards-enabled",
    label: "Loyalty Rewards",
    description: "Award and redeem loyalty points on orders.",
    category: "loyalty",
    safeDefault: true,
    risk: "medium",
  },
  {
    name: "swipe-experience-enabled",
    label: "Swipe Experience Engine",
    description: "Allow guests to enter the card-swipe recommendation flow.",
    category: "experience",
    safeDefault: true,
    risk: "low",
  },
  {
    name: "enrollment-enabled",
    label: "Guest Enrollment",
    description: "Allow new guests to enroll through the kiosk Human Foundation flow.",
    category: "identity",
    safeDefault: true,
    risk: "low",
  },
  {
    name: "campaigns-enabled",
    label: "Campaign Engine",
    description: "Allow campaign triggers to fire and dispatch messages.",
    category: "marketing",
    safeDefault: true,
    risk: "medium",
  },
  {
    name: "ai-scoring-enabled",
    label: "AI Scoring Engine",
    description: "Enable real-time product scoring and recommendation engine.",
    category: "intelligence",
    safeDefault: true,
    risk: "medium",
  },
  {
    name: "inventory-reservations-enabled",
    label: "Inventory Reservations",
    description: "Reserve stock when items are added to swipe orders.",
    category: "commerce",
    safeDefault: true,
    risk: "medium",
  },
  {
    name: "analytics-enabled",
    label: "Analytics Collection",
    description: "Collect and process behavior event analytics.",
    category: "intelligence",
    safeDefault: true,
    risk: "low",
  },
  {
    name: "voice-enabled",
    label: "Voice Interface",
    description: "Enable ElevenLabs voice commentary across the experience engine.",
    category: "experience",
    safeDefault: true,
    risk: "low",
  },
  {
    name: "exports-enabled",
    label: "Data Exports",
    description: "Allow role-gated CSV/JSON data exports.",
    category: "governance",
    safeDefault: true,
    risk: "medium",
  },
  {
    name: "presence-detection-enabled",
    label: "Presence Engine",
    description: "Allow geofence and WiFi arrival detection for opted-in guests.",
    category: "identity",
    safeDefault: true,
    risk: "low",
  },
  {
    name: "maintenance-mode",
    label: "Maintenance Mode",
    description: "Put the venue into maintenance — blocks all guest-facing flows.",
    category: "operations",
    safeDefault: false,
    risk: "high",
  },
];

// ── In-memory automation approval queue (demo) ────────────────────────────────
// In production this would be a DB table. Seeded with realistic pending items.

interface AutomationApprovalItem {
  id:         string;
  ruleId:     string;
  title:      string;
  insight:    string;
  category:   string;
  channel:    string;
  messageBody: string;
  cta:        string;
  metaScore:  number;
  requestedAt: string;
  status:     "pending" | "approved" | "rejected";
  decidedAt:  string | null;
  decidedBy:  string | null;
  venueId:    string | null;
}

const approvalQueue: AutomationApprovalItem[] = [
  {
    id: "aq-001", ruleId: "traffic.dead_period",
    title: "Launch Reserve Pairing Night — Thursday Push",
    insight: "Order volume is below Thursday evening baseline. Reserve Pairing Night push could recover $200–$400.",
    category: "traffic", channel: "sms",
    messageBody: "Tonight at [Venue]: A hand-selected reserve pairing experience awaits. Limited seats — reserve yours now.",
    cta: "Reserve a Seat", metaScore: 82,
    requestedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    status: "pending", decidedAt: null, decidedBy: null, venueId: null,
  },
  {
    id: "aq-002", ruleId: "loyalty.low_conversion",
    title: "Send Member Points Alert — Loyalty Reactivation",
    insight: "Reward conversion under 15% despite active orders. Member alert could re-engage loyalty tier guests.",
    category: "loyalty", channel: "email",
    messageBody: "Your loyalty points are ready. You're just [X] points from [Tier]. Stop in this week.",
    cta: "See My Status", metaScore: 68,
    requestedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    status: "pending", decidedAt: null, decidedBy: null, venueId: null,
  },
  {
    id: "aq-003", ruleId: "event.pairing_night",
    title: "Friday Pairing Night — VIP First Access Email",
    insight: "Friday evening pre-traffic lower than expected. Reserve pairing night could fill the evening.",
    category: "event", channel: "email",
    messageBody: "As a valued member, you have first access to tonight's Reserve Pairing Night at [Venue].",
    cta: "Reserve My Seat", metaScore: 88,
    requestedAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    status: "approved", decidedAt: new Date(Date.now() - 90 * 60000).toISOString(), decidedBy: "Jordan Mitchell", venueId: null,
  },
];

// ── Role permissions matrix ────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, {
  label:       string;
  color:       string;
  permissions: string[];
  denied:      string[];
}> = {
  super_admin: {
    label: "Super Admin",
    color: "#ef4444",
    permissions: ["*"],
    denied: [],
  },
  venue_owner: {
    label: "Venue Owner",
    color: "#d4af37",
    permissions: [
      "view_all_modules", "manage_staff", "manage_campaigns",
      "manage_inventory", "view_analytics", "manage_settings",
      "approve_automations", "manage_loyalty", "view_audit_log",
      "manage_kill_switches",
    ],
    denied: ["manage_venues", "manage_billing", "access_super_admin"],
  },
  manager: {
    label: "Manager",
    color: "#c9a84c",
    permissions: [
      "view_all_modules", "manage_staff", "manage_campaigns",
      "manage_inventory", "view_analytics", "manage_loyalty",
    ],
    denied: [
      "manage_settings", "approve_automations", "view_audit_log",
      "manage_kill_switches", "manage_venues",
    ],
  },
  staff: {
    label: "Staff / Host",
    color: "#60a5fa",
    permissions: [
      "run_pos", "view_inventory", "view_orders",
      "run_swipe_experience", "check_in_guests",
    ],
    denied: [
      "view_analytics", "manage_campaigns", "manage_staff",
      "view_audit_log", "manage_kill_switches",
    ],
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/governance/kill-switches
router.get(
  "/kill-switches",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    // Load current DB state for all known switches
    const rows = await db
      .select({ name: featureFlagsTable.name, enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(isNull(featureFlagsTable.venueId));

    const dbMap = new Map(rows.map(r => [r.name, r.enabled]));

    const switches = SYSTEM_KILL_SWITCHES.map(s => ({
      ...s,
      enabled: dbMap.has(s.name) ? dbMap.get(s.name)! : s.safeDefault,
    }));

    res.json({ switches });
  },
);

// POST /api/governance/kill-switches/:name
const toggleSchema = z.object({ enabled: z.boolean() });

router.post(
  "/kill-switches/:name",
  requireAuth,
  requireRole("super_admin", "venue_owner"),
  async (req: AuthRequest, res: Response) => {
    const name = String(req.params["name"] ?? "");
    const def  = SYSTEM_KILL_SWITCHES.find(s => s.name === name);
    if (!def) { res.status(404).json({ error: "Unknown kill switch" }); return; }

    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
    const { enabled } = parsed.data;

    // Venue owners cannot toggle high-risk switches
    if (req.user!.role === "venue_owner" && def.risk === "high") {
      res.status(403).json({ error: "High-risk switches require super_admin" });
      return;
    }

    const [existing] = await db
      .select({ id: featureFlagsTable.id, enabled: featureFlagsTable.enabled })
      .from(featureFlagsTable)
      .where(and(eq(featureFlagsTable.name, name), isNull(featureFlagsTable.venueId), isNull(featureFlagsTable.themeSlug)))
      .limit(1);

    const before = existing ? { enabled: existing.enabled } : { enabled: def.safeDefault };

    if (existing) {
      await db.update(featureFlagsTable)
        .set({ enabled, updatedAt: new Date() })
        .where(eq(featureFlagsTable.id, existing.id));
    } else {
      await db.insert(featureFlagsTable).values({ name, enabled, venueId: null, themeSlug: null });
    }

    await logAudit(req, {
      action:     "governance.kill_switch.toggle",
      entityType: "feature_flag",
      entityId:   existing?.id ?? null,
      before,
      after:      { name, enabled },
      venueId:    req.user!.venueId ?? null,
    });

    res.json({ name, enabled, risk: def.risk });
  },
);

// GET /api/governance/role-matrix
router.get(
  "/role-matrix",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const isSuper  = req.user!.role === "super_admin";
    const venueId  = req.user!.venueId;

    const rows = await (isSuper
      ? db.select({
          id: usersTable.id, name: usersTable.name,
          email: usersTable.email, role: usersTable.role,
          venueId: usersTable.venueId, createdAt: usersTable.createdAt,
        }).from(usersTable).limit(200)
      : venueId
        ? db.select({
            id: usersTable.id, name: usersTable.name,
            email: usersTable.email, role: usersTable.role,
            venueId: usersTable.venueId, createdAt: usersTable.createdAt,
          }).from(usersTable).where(sql`${usersTable.venueId} = ${venueId}::uuid`).limit(200)
        : Promise.resolve([])
    );

    res.json({ users: rows, rolePermissions: ROLE_PERMISSIONS });
  },
);

// POST /api/governance/role-matrix/:userId/role
const roleChangeSchema = z.object({
  role: z.enum(["venue_owner", "manager", "staff", "brand_partner", "customer"]),
});

router.post(
  "/role-matrix/:userId/role",
  requireAuth,
  requireRole("super_admin", "venue_owner"),
  async (req: AuthRequest, res: Response) => {
    const userId = String(req.params["userId"] ?? "");
    const parsed = roleChangeSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid role" }); return; }

    const [user] = await db
      .select({ id: usersTable.id, role: usersTable.role, name: usersTable.name, venueId: usersTable.venueId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Venue owners can only manage users in their own venue
    if (req.user!.role === "venue_owner" && user.venueId !== req.user!.venueId) {
      res.status(403).json({ error: "Cannot manage users outside your venue" });
      return;
    }

    await db.update(usersTable)
      .set({ role: parsed.data.role })
      .where(eq(usersTable.id, userId));

    await logAudit(req, {
      action:     "governance.role.change",
      entityType: "user",
      entityId:   userId,
      before:     { role: user.role },
      after:      { role: parsed.data.role },
      venueId:    user.venueId ?? null,
    });

    res.json({ id: userId, name: user.name, role: parsed.data.role });
  },
);

// GET /api/governance/permissions
router.get(
  "/permissions",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({ rolePermissions: ROLE_PERMISSIONS });
  },
);

// GET /api/governance/automation-queue
router.get(
  "/automation-queue",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({ items: approvalQueue });
  },
);

// POST /api/governance/automation-queue/:id
const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

router.post(
  "/automation-queue/:id",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id     = String(req.params["id"] ?? "");
    const item   = approvalQueue.find(a => a.id === id);
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    if (item.status !== "pending") {
      res.status(409).json({ error: "Item already decided" });
      return;
    }

    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid decision" }); return; }

    item.status    = parsed.data.decision;
    item.decidedAt = new Date().toISOString();
    item.decidedBy = req.user!.name ?? req.user!.email;

    await logAudit(req, {
      action:     `governance.automation.${parsed.data.decision}`,
      entityType: "automation_trigger",
      entityId:   item.id,
      before:     { status: "pending" },
      after:      { status: parsed.data.decision, decidedBy: item.decidedBy },
      venueId:    req.user!.venueId ?? null,
    });

    res.json(item);
  },
);

// GET /api/governance/health
router.get(
  "/health",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const isSuper = req.user!.role === "super_admin";
    const venueId = req.user!.venueId;

    // Recent audit entries count
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentAuditRows = await db
      .select({ id: auditLogTable.id })
      .from(auditLogTable)
      .where(
        isSuper
          ? sql`${auditLogTable.createdAt} >= ${since}::timestamptz`
          : and(
              sql`${auditLogTable.createdAt} >= ${since}::timestamptz`,
              venueId ? sql`${auditLogTable.venueId} = ${venueId}::uuid` : undefined,
            ),
      )
      .limit(500);

    // Pending automation approvals
    const pendingCount = approvalQueue.filter(a => a.status === "pending").length;

    // Kill switch overrides
    const disabledSwitches = await db
      .select({ name: featureFlagsTable.name })
      .from(featureFlagsTable)
      .where(and(eq(featureFlagsTable.enabled, false), isNull(featureFlagsTable.venueId)));

    res.json({
      auditActionsLast24h: recentAuditRows.length,
      pendingApprovals:    pendingCount,
      disabledSwitches:    disabledSwitches.map(r => r.name),
      systemStatus:        disabledSwitches.some(r => r.name === "maintenance-mode") ? "maintenance"
                         : disabledSwitches.some(r => r.name === "payments-enabled")  ? "degraded"
                         : "operational",
    });
  },
);

export default router;
