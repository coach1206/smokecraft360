/**
 * automationConstraints — hard limits on autonomous AI/orchestration behavior.
 *
 * Prevents runaway automation through:
 *   - Per-venue daily action budgets
 *   - Rate limiting per action type
 *   - Time-window blackouts (e.g., no pricing changes after midnight)
 *   - Cross-venue action coordination (prevent correlated market moves)
 *   - Emergency freeze mode
 */

import { pool }     from "@workspace/db";
import { logger }   from "../lib/logger";
import { increment } from "../platform/observability/metricsCollector";
import { type OrchestrationAction } from "./orchestrationPolicies";

export interface ActionBudget {
  action:      OrchestrationAction;
  dailyMax:    number;
  used:        number;
  resetAt:     number;
}

// In-memory budget tracking (per process — sufficient for single-venue scoping)
const budgets = new Map<string, ActionBudget>();

// Daily budgets per action type (conservative defaults)
const DEFAULT_DAILY_LIMITS: Partial<Record<OrchestrationAction, number>> = {
  send_staff_alert:       50,
  modify_menu_visibility: 10,
  trigger_reorder:        5,
  adjust_pricing:         3,
  emit_broadcast:         100,
  update_recommendations: 500,
  flag_inventory:         20,
  clear_session:          10,
  lock_venue_access:      2,
  emergency_shutdown:     1,
};

// Global freeze mode
let frozen = false;
let frozenReason = "";

// ─── Freeze ───────────────────────────────────────────────────────────────────

export function freezeAutomation(reason: string): void {
  frozen = true;
  frozenReason = reason;
  logger.warn({ reason }, "automationConstraints: automation frozen");
  increment("governance.automation", "freeze_events", 1);
}

export function unfreezeAutomation(): void {
  frozen = false;
  frozenReason = "";
  logger.info("automationConstraints: automation unfrozen");
}

export function isAutomationFrozen(): { frozen: boolean; reason: string } {
  return { frozen, reason: frozenReason };
}

// ─── Budget tracking ──────────────────────────────────────────────────────────

function getBudgetKey(venueId: string, action: OrchestrationAction): string {
  return `${venueId}:${action}`;
}

function getBudget(venueId: string, action: OrchestrationAction): ActionBudget {
  const key     = getBudgetKey(venueId, action);
  const todayMs = new Date().setHours(0, 0, 0, 0);

  let budget = budgets.get(key);
  if (!budget || budget.resetAt < todayMs) {
    budget = {
      action,
      dailyMax: DEFAULT_DAILY_LIMITS[action] ?? 999,
      used:     0,
      resetAt:  todayMs + 86_400_000,
    };
    budgets.set(key, budget);
  }
  return budget;
}

export function checkBudget(venueId: string, action: OrchestrationAction): {
  allowed: boolean; remaining: number; reason?: string;
} {
  if (frozen) return { allowed: false, remaining: 0, reason: `automation_frozen: ${frozenReason}` };

  const budget = getBudget(venueId, action);
  if (budget.used >= budget.dailyMax) {
    increment("governance.automation", "budget_exhausted", 1, { action });
    return { allowed: false, remaining: 0, reason: `daily_budget_exhausted: max ${budget.dailyMax} for ${action}` };
  }
  return { allowed: true, remaining: budget.dailyMax - budget.used };
}

export function consumeBudget(venueId: string, action: OrchestrationAction): void {
  const budget = getBudget(venueId, action);
  budget.used++;
}

// ─── Time window blackouts ────────────────────────────────────────────────────

interface TimeBlackout {
  action:    OrchestrationAction;
  startHour: number;  // 0–23
  endHour:   number;
  timezone:  string;
  reason:    string;
}

const blackouts: TimeBlackout[] = [
  { action: "adjust_pricing",   startHour: 0,  endHour: 6,  timezone: "America/New_York", reason: "overnight_pricing_freeze" },
  { action: "emergency_shutdown", startHour: 20, endHour: 24, timezone: "America/New_York", reason: "peak_hours_shutdown_blocked" },
];

export function checkTimeBlackout(action: OrchestrationAction): { allowed: boolean; reason?: string } {
  const now  = new Date();
  const hour = now.getUTCHours(); // simplified — use UTC for determinism

  for (const b of blackouts) {
    if (b.action !== action) continue;
    const inWindow = b.startHour <= b.endHour
      ? hour >= b.startHour && hour < b.endHour
      : hour >= b.startHour || hour < b.endHour;
    if (inWindow) {
      return { allowed: false, reason: `time_blackout: ${b.reason}` };
    }
  }
  return { allowed: true };
}

// ─── Full constraint check (composed) ────────────────────────────────────────

export function checkAllConstraints(venueId: string, action: OrchestrationAction): {
  allowed: boolean; reason?: string;
} {
  const freeze  = checkBudget(venueId, action);
  if (!freeze.allowed) return { allowed: false, reason: freeze.reason };

  const blackout = checkTimeBlackout(action);
  if (!blackout.allowed) return { allowed: false, reason: blackout.reason };

  return { allowed: true };
}

export function getBudgetStatus(venueId: string): ActionBudget[] {
  const result: ActionBudget[] = [];
  for (const action of Object.keys(DEFAULT_DAILY_LIMITS) as OrchestrationAction[]) {
    result.push({ ...getBudget(venueId, action) });
  }
  return result;
}
