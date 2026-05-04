import { Router, type IRouter, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, touchscreenFlowSessionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { allowOnly } from "../middleware/sanitize";
import { logAudit } from "../lib/audit";
import { getFlowsForRole, getFlowById, type FlowDefinition } from "../services/flowEngine";

const router: IRouter = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AdminHomeData {
  sections: { id: string; label: string; description: string; icon: string; route: string }[];
}

interface VenueHomeData {
  sections: { id: string; label: string; description: string; icon: string; route: string }[];
}

interface VendorHomeData {
  sections: { id: string; label: string; description: string; icon: string; route: string }[];
}

router.get(
  "/context",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const role = req.user!.role;
    const flows = getFlowsForRole(role);

    const activeSessions = await db
      .select()
      .from(touchscreenFlowSessionsTable)
      .where(
        and(
          eq(touchscreenFlowSessionsTable.userId, req.user!.id),
          eq(touchscreenFlowSessionsTable.status, "in_progress"),
        ),
      )
      .orderBy(desc(touchscreenFlowSessionsTable.updatedAt))
      .limit(5);

    res.json({
      role,
      venueId: req.user!.venueId ?? null,
      flows: flows.map((f: FlowDefinition) => ({
        flowId: f.flowId,
        label: f.label,
        description: f.description,
        icon: f.icon,
        category: f.category,
        stepCount: f.steps.length,
      })),
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        flowId: s.flowId,
        currentStep: s.currentStep,
        status: s.status,
        updatedAt: s.updatedAt,
      })),
    });
  },
);

router.get(
  "/flows",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const role = req.user!.role;
    const flows = getFlowsForRole(role);
    res.json({ flows });
  },
);

router.post(
  "/flows/start",
  requireAuth,
  allowOnly("flowId", "deviceId", "sessionId", "metadata"),
  async (req: AuthRequest, res: Response) => {
    const { flowId, deviceId, sessionId, metadata } = req.body as {
      flowId?: string;
      deviceId?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!flowId || typeof flowId !== "string") {
      res.status(400).json({ error: '"flowId" is required' });
      return;
    }

    const flow = getFlowById(flowId);
    if (!flow) {
      res.status(404).json({ error: "Flow not found" });
      return;
    }

    const role = req.user!.role;
    if (!flow.roles.includes(role) && role !== "super_admin") {
      res.status(403).json({ error: "Not authorized for this flow" });
      return;
    }

    const [session] = await db
      .insert(touchscreenFlowSessionsTable)
      .values({
        flowId,
        role,
        userId: req.user!.id,
        venueId: req.user!.venueId ?? null,
        deviceId: typeof deviceId === "string" ? deviceId : null,
        sessionId: typeof sessionId === "string" && sessionId.length <= 200 ? sessionId : null,
        currentStep: "0",
        progress: {},
        metadata: metadata && typeof metadata === "object" ? metadata : {},
        status: "in_progress",
      })
      .returning();

    await logAudit(req, {
      action: "touchscreen.flow_started",
      entityType: "touchscreen_flow",
      entityId: session.id,
      after: { flowId, role } as unknown as Record<string, unknown>,
    });

    res.status(201).json({
      session: {
        id: session.id,
        flowId: session.flowId,
        currentStep: session.currentStep,
        status: session.status,
        progress: session.progress,
      },
      flow: {
        label: flow.label,
        steps: flow.steps,
      },
    });
  },
);

router.patch(
  "/flows/:sessionId",
  requireAuth,
  allowOnly("currentStep", "progress", "metadata"),
  async (req: AuthRequest, res: Response) => {
    const sessionId = String(req.params.sessionId ?? "");
    if (!UUID_RE.test(sessionId)) {
      res.status(400).json({ error: "Invalid session ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(touchscreenFlowSessionsTable)
      .where(eq(touchscreenFlowSessionsTable.id, sessionId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (existing.userId !== req.user!.id && req.user!.role !== "super_admin") {
      res.status(403).json({ error: "Not your session" });
      return;
    }

    if (existing.status !== "in_progress") {
      res.status(400).json({ error: "Session is not in progress" });
      return;
    }

    const { currentStep, progress, metadata } = req.body as {
      currentStep?: string;
      progress?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };

    const updates: Partial<typeof touchscreenFlowSessionsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof currentStep === "string") updates.currentStep = currentStep;
    if (progress && typeof progress === "object") {
      updates.progress = { ...(existing.progress as Record<string, unknown>), ...progress };
    }
    if (metadata && typeof metadata === "object") {
      updates.metadata = { ...(existing.metadata as Record<string, unknown>), ...metadata };
    }

    const [updated] = await db
      .update(touchscreenFlowSessionsTable)
      .set(updates)
      .where(eq(touchscreenFlowSessionsTable.id, sessionId))
      .returning();

    await logAudit(req, {
      action: "touchscreen.flow_updated",
      entityType: "touchscreen_flow",
      entityId: sessionId,
      after: { flowId: updated.flowId, currentStep: updated.currentStep } as unknown as Record<string, unknown>,
    });

    res.json({
      session: {
        id: updated.id,
        flowId: updated.flowId,
        currentStep: updated.currentStep,
        status: updated.status,
        progress: updated.progress,
      },
    });
  },
);

router.post(
  "/flows/:sessionId/complete",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const sessionId = String(req.params.sessionId ?? "");
    if (!UUID_RE.test(sessionId)) {
      res.status(400).json({ error: "Invalid session ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(touchscreenFlowSessionsTable)
      .where(eq(touchscreenFlowSessionsTable.id, sessionId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (existing.userId !== req.user!.id && req.user!.role !== "super_admin") {
      res.status(403).json({ error: "Not your session" });
      return;
    }

    const [updated] = await db
      .update(touchscreenFlowSessionsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(touchscreenFlowSessionsTable.id, sessionId))
      .returning();

    await logAudit(req, {
      action: "touchscreen.flow_completed",
      entityType: "touchscreen_flow",
      entityId: sessionId,
      after: { flowId: updated.flowId, completedAt: updated.completedAt } as unknown as Record<string, unknown>,
    });

    res.json({ session: { id: updated.id, flowId: updated.flowId, status: updated.status } });
  },
);

router.get(
  "/admin-home",
  requireAuth,
  requireRole("super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const data: AdminHomeData = {
      sections: [
        { id: "live_venues", label: "Live Venues", description: "Monitor active venue sessions", icon: "venues", route: "/analytics" },
        { id: "revenue", label: "Revenue Flow", description: "Real-time revenue metrics", icon: "revenue", route: "/analytics" },
        { id: "campaigns", label: "Campaign Control", description: "Manage active campaigns", icon: "campaigns", route: "/experiences" },
        { id: "alerts", label: "System Alerts", description: "View system notifications", icon: "alerts", route: "/settings" },
        { id: "devices", label: "Device Control", description: "Monitor and manage devices", icon: "devices", route: "/devices" },
        { id: "partners", label: "Brand Partners", description: "Vendor and brand management", icon: "partners", route: "/vendors" },
        { id: "fraud", label: "Fraud Review", description: "Risk and abuse detection", icon: "fraud", route: "/analytics" },
        { id: "demo", label: "Demo Mode", description: "Launch investor demo", icon: "demo", route: "/demo" },
      ],
    };
    res.json(data);
  },
);

router.get(
  "/venue-home",
  requireAuth,
  requireRole("venue_owner", "manager", "staff"),
  async (req: AuthRequest, res: Response) => {
    const data: VenueHomeData = {
      sections: [
        { id: "experience", label: "Start Experience", description: "Begin a customer journey", icon: "experience", route: "/intro" },
        { id: "orders", label: "Today's Orders", description: "View and manage orders", icon: "orders", route: "/pos" },
        { id: "inventory", label: "Inventory", description: "Check stock levels", icon: "inventory", route: "/pos" },
        { id: "rewards", label: "Rewards", description: "Manage loyalty rewards", icon: "rewards", route: "/pos" },
        { id: "staff", label: "Staff Mode", description: "Quick staff actions", icon: "staff", route: "/staff" },
        { id: "campaigns", label: "Campaigns", description: "Active promotions", icon: "campaigns", route: "/analytics" },
        { id: "devices", label: "Devices", description: "Manage venue devices", icon: "devices", route: "/devices" },
      ],
    };
    res.json(data);
  },
);

router.get(
  "/vendor-home",
  requireAuth,
  requireRole("vendor", "brand_partner"),
  async (_req: AuthRequest, res: Response) => {
    const data: VendorHomeData = {
      sections: [
        { id: "add_product", label: "Add Product", description: "Submit a new product", icon: "product", route: "/pos" },
        { id: "my_products", label: "My Products", description: "View your product catalog", icon: "catalog", route: "/pos" },
        { id: "performance", label: "Campaign Performance", description: "Track campaign metrics", icon: "performance", route: "/analytics" },
        { id: "payouts", label: "Payouts", description: "View commission payouts", icon: "payouts", route: "/analytics" },
        { id: "assets", label: "Brand Assets", description: "Manage brand materials", icon: "assets", route: "/settings" },
        { id: "campaigns", label: "Sponsored Campaigns", description: "Create and manage campaigns", icon: "campaigns", route: "/experiences" },
      ],
    };
    res.json(data);
  },
);

router.get(
  "/demo-session/:sessionId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const sessionId = String(req.params.sessionId ?? "");
    if (!sessionId || sessionId.length > 200) {
      res.status(400).json({ error: "Invalid session ID" });
      return;
    }

    const [session] = await db
      .select()
      .from(touchscreenFlowSessionsTable)
      .where(
        and(
          eq(touchscreenFlowSessionsTable.sessionId, sessionId),
          eq(touchscreenFlowSessionsTable.flowId, "demo_experience"),
        ),
      )
      .orderBy(desc(touchscreenFlowSessionsTable.createdAt))
      .limit(1);

    if (!session) {
      res.status(404).json({ error: "Demo session not found" });
      return;
    }

    res.json({
      id: session.id,
      flowId: session.flowId,
      currentStep: session.currentStep,
      status: session.status,
      progress: session.progress,
      createdAt: session.createdAt,
    });
  },
);

export default router;
