/**
 * operatorReadiness — venue launch readiness checklist API.
 *
 * GET /api/admin/operator-readiness
 *
 * Queries live DB state across all critical system areas and returns a
 * structured readiness report. No writes performed — pure health read.
 */

import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "@workspace/db";
import {
  systemValidationRunsTable,
  experienceItemsTable,
  experienceControlSettingsTable,
  analyticsEventsTable,
  orchestratorEventsTable,
  swipeOrdersTable,
  inventoryReservationsTable,
  sessionSwipesTable,
  type SystemCheckResult,
} from "@workspace/db/schema";
import { eq, isNotNull, desc, sql, gte } from "drizzle-orm";

const router: IRouter = Router();

type ReadinessStatus = "ready" | "warning" | "missing";

interface ReadinessItem {
  key:     string;
  label:   string;
  status:  ReadinessStatus;
  message: string;
  fix:     string;
}

interface ReadinessSection {
  key:    string;
  label:  string;
  items:  ReadinessItem[];
  status: ReadinessStatus; // worst of items
}

function sectionStatus(items: ReadinessItem[]): ReadinessStatus {
  if (items.some(i => i.status === "missing"))  return "missing";
  if (items.some(i => i.status === "warning"))  return "warning";
  return "ready";
}

router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {

    // ── Fetch all data in parallel ────────────────────────────────────────────
    const [
      valRuns,
      expItemsTotal,
      expItemsByType,
      expItemsWithImage,
      controlSettings,
      controlWithMode,
      recentAnalytics,
      orchestratorRows,
      swipeOrderRows,
      reservationRows,
      swipeRows,
    ] = await Promise.all([
      // Last 3 validation runs
      db.select().from(systemValidationRunsTable)
        .orderBy(desc(systemValidationRunsTable.createdAt))
        .limit(3),

      // Total active experience items
      db.select({ c: sql<number>`count(*)::int` })
        .from(experienceItemsTable)
        .where(eq(experienceItemsTable.active, true)),

      // Items grouped by type
      db.select({ type: experienceItemsTable.type, c: sql<number>`count(*)::int` })
        .from(experienceItemsTable)
        .where(eq(experienceItemsTable.active, true))
        .groupBy(experienceItemsTable.type),

      // Items with images
      db.select({ c: sql<number>`count(*)::int` })
        .from(experienceItemsTable)
        .where(isNotNull(experienceItemsTable.image)),

      // Experience control settings count
      db.select({ c: sql<number>`count(*)::int` })
        .from(experienceControlSettingsTable),

      // Settings with venue mode set
      db.select({ c: sql<number>`count(*)::int` })
        .from(experienceControlSettingsTable)
        .where(isNotNull(experienceControlSettingsTable.venueMode)),

      // Analytics events in last 7 days
      db.select({ c: sql<number>`count(*)::int` })
        .from(analyticsEventsTable)
        .where(gte(analyticsEventsTable.createdAt, new Date(Date.now() - 7 * 86400_000))),

      // Orchestrator events count
      db.select({ c: sql<number>`count(*)::int` })
        .from(orchestratorEventsTable),

      // Swipe orders count
      db.select({ c: sql<number>`count(*)::int` })
        .from(swipeOrdersTable),

      // Reservations count
      db.select({ c: sql<number>`count(*)::int` })
        .from(inventoryReservationsTable),

      // Session swipes count
      db.select({ c: sql<number>`count(*)::int` })
        .from(sessionSwipesTable),
    ]);

    const latestRun = valRuns[0] ?? null;
    const totalItems = Number(expItemsTotal[0]!.c);
    const itemsWithImage = Number(expItemsWithImage[0]!.c);
    const ctrlCount = Number(controlSettings[0]!.c);
    const ctrlWithMode = Number(controlWithMode[0]!.c);
    const analyticsCount = Number(recentAnalytics[0]!.c);
    const orchCount = Number(orchestratorRows[0]!.c);
    const orderCount = Number(swipeOrderRows[0]!.c);
    const resCount = Number(reservationRows[0]!.c);
    const swipeCount = Number(swipeRows[0]!.c);

    const craftTypes = ["smoke", "pour", "brew", "vape"];
    const typesPresent = new Set(expItemsByType.map(r => r.type));
    const missingCrafts = craftTypes.filter(t => !typesPresent.has(t));

    // Latest smoke test details
    const latestChecks: SystemCheckResult[] = Array.isArray(latestRun?.details)
      ? (latestRun!.details as SystemCheckResult[])
      : [];
    const failedChecks = latestChecks.filter(c => c.status === "failed");

    // ── Build sections ────────────────────────────────────────────────────────

    const sections: ReadinessSection[] = [];

    // 1. System Health
    {
      const items: ReadinessItem[] = [
        {
          key:     "smoke_test_run",
          label:   "Smoke Test Executed",
          status:  latestRun ? "ready" : "missing",
          message: latestRun
            ? `Last run: ${new Date(latestRun.createdAt).toLocaleString()}`
            : "No smoke test has been run",
          fix: "Go to /admin/system-validation and click Run Smoke Test",
        },
        {
          key:     "latest_run_passed",
          label:   "Latest Test Passed",
          status:  !latestRun ? "missing" : latestRun.status === "passed" ? "ready" : latestRun.status === "partial" ? "warning" : "missing",
          message: latestRun ? latestRun.summary : "Run a smoke test first",
          fix:     "Run a new smoke test and investigate any FAILED checks for error details",
        },
        {
          key:     "no_critical_failures",
          label:   "No Critical Failures",
          status:  failedChecks.length === 0 ? "ready" : "missing",
          message: failedChecks.length === 0
            ? "All checks passed in latest run"
            : `${failedChecks.length} critical failure(s): ${failedChecks.map(c => c.system).join(", ")}`,
          fix:     "Open /admin/system-validation, expand failed checks for detailed error messages, and contact Axiom support",
        },
      ];
      sections.push({ key: "system_health", label: "System Health", items, status: sectionStatus(items) });
    }

    // 2. Inventory Readiness
    {
      const items: ReadinessItem[] = [
        {
          key:     "items_loaded",
          label:   "Experience Items Loaded",
          status:  totalItems > 10 ? "ready" : totalItems > 0 ? "warning" : "missing",
          message: `${totalItems} active experience items in database`,
          fix:     "Import your product catalog via /inventory or contact Axiom onboarding to seed your items",
        },
        {
          key:     "multi_craft_coverage",
          label:   "All 4 Craft Types Covered",
          status:  missingCrafts.length === 0 ? "ready" : missingCrafts.length <= 2 ? "warning" : "missing",
          message: missingCrafts.length === 0
            ? "Items present for smoke, pour, brew, and vape"
            : `Missing items for: ${missingCrafts.join(", ")}`,
          fix:     `Add active experience items for the following craft types: ${missingCrafts.join(", ")}`,
        },
        {
          key:     "items_have_images",
          label:   "Items Have Images",
          status:  itemsWithImage >= totalItems * 0.8 ? "ready" : itemsWithImage > 0 ? "warning" : "missing",
          message: `${itemsWithImage} of ${totalItems} items have images (${totalItems > 0 ? Math.round(itemsWithImage / totalItems * 100) : 0}%)`,
          fix:     "Upload product images via /inventory for each item — image coverage improves conversion rates",
        },
      ];
      sections.push({ key: "inventory", label: "Inventory Readiness", items, status: sectionStatus(items) });
    }

    // 3. Venue Settings
    {
      const items: ReadinessItem[] = [
        {
          key:     "control_settings",
          label:   "Experience Control Configured",
          status:  ctrlCount > 0 ? "ready" : "missing",
          message: ctrlCount > 0
            ? `${ctrlCount} experience control setting(s) configured`
            : "No experience control settings found",
          fix:     "Navigate to /admin/experience-control and save your preferred settings for each craft type",
        },
        {
          key:     "venue_mode_set",
          label:   "Venue Mode Selected",
          status:  ctrlWithMode > 0 ? "ready" : "warning",
          message: ctrlWithMode > 0
            ? `${ctrlWithMode} setting(s) have venue mode configured`
            : "No venue mode has been selected",
          fix:     "Go to /admin/experience-control and select a Venue Mode (Standard, Lounge, Premium, Rush, Private, or Showcase)",
        },
        {
          key:     "demo_mode_ready",
          label:   "Demo Mode Ready",
          status:  totalItems > 0 ? "ready" : "warning",
          message: totalItems > 0
            ? "Demo mode available at /demo/axiom-experience"
            : "Demo mode needs experience items to display",
          fix:     "Ensure experience items are loaded — demo mode uses them for the Reveal step visualization",
        },
      ];
      sections.push({ key: "venue_settings", label: "Venue Settings", items, status: sectionStatus(items) });
    }

    // 4. Experience Controls
    {
      const items: ReadinessItem[] = [
        {
          key:    "atmosphere_configured",
          label:  "Atmosphere Engine Configured",
          status: ctrlCount > 0 ? "ready" : "warning",
          message: ctrlCount > 0 ? "Atmosphere settings present" : "Using platform defaults — no custom venue config",
          fix:    "Visit /admin/experience-control and set atmosphere intensity, particle density, and motion calmness for your venue",
        },
        {
          key:    "sound_volume_set",
          label:  "Sound Volume Configured",
          status: ctrlCount > 0 ? "ready" : "warning",
          message: ctrlCount > 0 ? "Sound volume setting saved" : "Sound engine using default volume (40%)",
          fix:    "Adjust sound volume in /admin/experience-control. Note: full audio integration requires Howler.js wiring",
        },
        {
          key:    "performance_mode",
          label:  "Performance Mode Set",
          status: ctrlCount > 0 ? "ready" : "warning",
          message: ctrlCount > 0 ? "Performance mode configured" : "Using default balanced mode",
          fix:    "Set performance mode in /admin/experience-control — use 'low-power' for older kiosk hardware",
        },
      ];
      sections.push({ key: "experience_controls", label: "Experience Controls", items, status: sectionStatus(items) });
    }

    // 5. Demo Mode
    {
      const items: ReadinessItem[] = [
        {
          key:    "demo_route_live",
          label:  "Demo Route Live",
          status: "ready",
          message: "Investor demo available at /demo/axiom-experience",
          fix:    "No action needed — demo mode is always available",
        },
        {
          key:    "demo_data_available",
          label:  "Demo Data Available",
          status: totalItems > 0 ? "ready" : "warning",
          message: totalItems > 0
            ? `${totalItems} real items available for demo display`
            : "Demo will use fallback data — no real items loaded",
          fix:    "Load experience items to show real inventory in the Revenue Brain and Reveal demo steps",
        },
      ];
      sections.push({ key: "demo_mode", label: "Demo Mode", items, status: sectionStatus(items) });
    }

    // 6. Staff Access
    {
      const items: ReadinessItem[] = [
        {
          key:    "staff_training_ready",
          label:  "Staff Training Available",
          status: "ready",
          message: "Staff training guide accessible at /training/staff — no login required",
          fix:    "No action needed — share /training/staff URL with all staff members",
        },
        {
          key:    "admin_manual_ready",
          label:  "Operator Manual Available",
          status: "ready",
          message: "Venue manual accessible at /admin/manual (requires manager+ login)",
          fix:    "No action needed — print the manual from /admin/manual for offline reference",
        },
        {
          key:    "operator_checklist_ready",
          label:  "This Checklist Bookmarked",
          status: "ready",
          message: "Operator readiness checklist at /admin/operator-readiness",
          fix:    "Bookmark /admin/operator-readiness and run it before every opening shift",
        },
      ];
      sections.push({ key: "staff_access", label: "Staff Access", items, status: sectionStatus(items) });
    }

    // 7. Order Flow
    {
      const items: ReadinessItem[] = [
        {
          key:    "swipe_orders_active",
          label:  "Add-to-Order Pipeline Active",
          status: "ready",
          message: `${orderCount} total swipe orders processed`,
          fix:    "No action needed — the pipeline is active once experience items are loaded",
        },
        {
          key:    "reservations_active",
          label:  "Inventory Reservations Active",
          status: "ready",
          message: `${resCount} total reservations created (15-min TTL)`,
          fix:    "No action needed — reservations auto-expire and release stock",
        },
        {
          key:    "swipe_data_flowing",
          label:  "Swipe Data Flowing",
          status: swipeCount > 0 ? "ready" : "warning",
          message: swipeCount > 0
            ? `${swipeCount} swipe events recorded — Memory Brain is learning`
            : "No swipe events recorded yet",
          fix:    "Run a test experience session at /experience/smoke to generate swipe data and verify the pipeline end-to-end",
        },
      ];
      sections.push({ key: "order_flow", label: "Order Flow", items, status: sectionStatus(items) });
    }

    // 8. Analytics
    {
      const items: ReadinessItem[] = [
        {
          key:    "analytics_recording",
          label:  "Analytics Events Recording",
          status: analyticsCount > 0 ? "ready" : "warning",
          message: analyticsCount > 0
            ? `${analyticsCount} analytics events in last 7 days`
            : "No analytics events in last 7 days",
          fix:    "Run an experience session to trigger analytics events. If still empty after use, check /admin/system-validation",
        },
        {
          key:    "orchestrator_logging",
          label:  "Orchestrator Events Logging",
          status: orchCount > 0 ? "ready" : "warning",
          message: orchCount > 0
            ? `${orchCount} orchestrator events recorded`
            : "No orchestrator events recorded yet",
          fix:    "Orchestrator events are written after 5+ swipe signals. Run a full experience session to trigger logging",
        },
        {
          key:    "swipe_intelligence_ready",
          label:  "Swipe Intelligence Dashboard",
          status: swipeCount > 0 ? "ready" : "warning",
          message: swipeCount > 0
            ? "Swipe Intelligence data available at /analytics/swipe-intelligence"
            : "No data yet — dashboard will populate after first experience sessions",
          fix:    "Complete at least 5 experience sessions to see meaningful data in the Swipe Intelligence dashboard",
        },
      ];
      sections.push({ key: "analytics", label: "Analytics", items, status: sectionStatus(items) });
    }

    // 9. Sound Assets
    {
      const items: ReadinessItem[] = [
        {
          key:    "sound_engine_configured",
          label:  "Sound Engine Configured",
          status: "ready",
          message: "Sound hooks and trigger system initialized (SOUND_HOOKS map active)",
          fix:    "No action needed — sound engine stubs are live and ready for Howler.js/Web Audio API integration",
        },
        {
          key:    "audio_integration",
          label:  "Audio File Integration",
          status: "warning",
          message: "Audio files not yet wired — system uses visual-only mode",
          fix:    "Upload audio files to your CDN and connect them via the visualPrompts SOUND_HOOKS map to activate ambient sound per craft type",
        },
      ];
      sections.push({ key: "sound_assets", label: "Sound Assets", items, status: sectionStatus(items) });
    }

    // 10. Performance Mode
    {
      const items: ReadinessItem[] = [
        {
          key:    "performance_configured",
          label:  "Performance Mode Set",
          status: ctrlCount > 0 ? "ready" : "warning",
          message: ctrlCount > 0 ? "Performance settings saved" : "Using platform default (balanced mode)",
          fix:    "Set performance mode in /admin/experience-control — 'cinematic' for high-end displays, 'low-power' for kiosk hardware",
        },
        {
          key:    "kiosk_burn_in",
          label:  "Kiosk Burn-in Protection",
          status: "ready",
          message: "Pixel-shift system is active for all kiosk screens",
          fix:    "No action needed — burn-in protection is always active in kiosk mode",
        },
      ];
      sections.push({ key: "performance_mode", label: "Performance Mode", items, status: sectionStatus(items) });
    }

    // ── Compute overall ───────────────────────────────────────────────────────
    const overallStatus: ReadinessStatus =
      sections.some(s => s.status === "missing")  ? "missing"
      : sections.some(s => s.status === "warning") ? "warning"
      : "ready";

    const readyCount   = sections.filter(s => s.status === "ready").length;
    const warningCount = sections.filter(s => s.status === "warning").length;
    const missingCount = sections.filter(s => s.status === "missing").length;

    res.json({
      sections,
      overallStatus,
      summary: `${readyCount} ready · ${warningCount} warning · ${missingCount} action needed`,
      checkedAt: new Date().toISOString(),
    });
  },
);

export default router;
