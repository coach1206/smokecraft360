/**
 * adaptiveExperienceEngine — adapts UI behaviour in real time based on
 * orchestration context, guest profile, and environmental state.
 *
 * Produces a ContextualUIDirective that the frontend can consume
 * to alter layout density, interaction model, and content priority.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";
import { pgPubSub } from "../realtime/pgPubSub";
import { generateTransition } from "./cinematicTransitions";
import type { ContextState } from "./cinematicTransitions";

export type UIMode = "kiosk" | "staff" | "patron" | "ambient" | "maintenance";
export type LayoutDensity = "minimal" | "standard" | "rich" | "immersive";

export interface ContextualUIDirective {
  venueId:       string;
  uiMode:        UIMode;
  layoutDensity: LayoutDensity;
  primaryAction: string;
  hiddenPanels:  string[];
  accentColor:   string;
  transition:    ReturnType<typeof generateTransition>;
  recommendations: string[];
  alertBanner?:  { message: string; severity: "info" | "warn" | "critical" };
  generatedAt:   number;
}

const ACCENT_BY_ATMOSPHERE: Array<[number, string]> = [
  [0.8,  "#D48B00"], // Warm Honey Amber — premium
  [0.55, "#6B5E4E"], // Warm Brown — standard
  [0.3,  "#3B82F6"], // Blue — energize
  [0.0,  "#9A8A7A"], // Muted — low energy
];

function accentForAtmosphere(a: number): string {
  return (ACCENT_BY_ATMOSPHERE.find(([thresh]) => a >= thresh) ?? ACCENT_BY_ATMOSPHERE[3])[1];
}

function layoutForContext(ctx: ContextState, mode: UIMode): LayoutDensity {
  if (mode === "ambient")      return "immersive";
  if (mode === "kiosk")        return ctx.atmosphere > 0.7 ? "rich" : "standard";
  if (ctx.socialEnergy > 0.8)  return "minimal"; // distraction-free for high social
  if (ctx.atmosphere   > 0.75) return "rich";
  return "standard";
}

export async function generateDirective(
  venueId: string,
  mode:    UIMode,
  ctx:     ContextState,
): Promise<ContextualUIDirective> {
  const transition   = generateTransition(ctx);
  const accentColor  = accentForAtmosphere(ctx.atmosphere);
  const density      = layoutForContext(ctx, mode);

  // Determine which panels to hide based on context
  const hiddenPanels: string[] = [];
  if (ctx.riskLevel === "critical") hiddenPanels.push("analytics", "settings");
  if (mode === "kiosk")             hiddenPanels.push("admin", "finance");
  if (ctx.moodScore < 0.3)          hiddenPanels.push("upsell");

  // Primary action based on operational state
  const primaryAction =
    ctx.riskLevel === "critical"   ? "ALERT_RESPONSE" :
    ctx.socialEnergy > 0.8         ? "GROUP_ORDER" :
    ctx.atmosphere   > 0.75        ? "PREMIUM_RECOMMEND" :
    ctx.moodScore    < 0.35        ? "ENGAGEMENT_BOOST" :
                                     "STANDARD_FLOW";

  // Context-driven recommendations
  const recommendations: string[] = [];
  if (ctx.atmosphere < 0.4)   recommendations.push("Consider adjusting ambient scene to boost atmosphere");
  if (ctx.socialEnergy > 0.8) recommendations.push("High social energy detected — enable group ordering");
  if (ctx.moodScore < 0.35)   recommendations.push("Low mood score — staff check-in recommended");

  const directive: ContextualUIDirective = {
    venueId, uiMode: mode, layoutDensity: density,
    primaryAction, hiddenPanels, accentColor, transition,
    recommendations, generatedAt: Date.now(),
  };

  // Publish for real-time frontend consumption
  await pgPubSub.publish("intelligence", {
    event: "UI_DIRECTIVE", venueId, directive,
  }).catch(() => {});

  return directive;
}

export async function getLatestContext(venueId: string): Promise<ContextState | null> {
  const { rows } = await pool.query(
    `SELECT mood_score, atmosphere_score, social_energy, risk_level
     FROM operational_awareness_scores
     WHERE venue_id = $1
     ORDER BY calculated_at DESC LIMIT 1`,
    [venueId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    atmosphere:   r.atmosphere_score  ?? 0.5,
    moodScore:    r.mood_score         ?? 0.5,
    socialEnergy: r.social_energy      ?? 0.5,
    riskLevel:    r.risk_level         ?? "low",
    timeOfDay:    new Date().getHours(),
  };
}
