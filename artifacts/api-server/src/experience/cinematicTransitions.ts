/**
 * cinematicTransitions — generates context-aware transition parameters
 * for the frontend experience layer.
 *
 * Transitions adapt to venue atmosphere, social energy, and operational state.
 */

export type TransitionStyle =
  | "ambient_drift" | "decisive_cut" | "luxury_fade" | "energy_surge"
  | "intimate_dissolve" | "social_bloom" | "alert_flash" | "idle_breathe";

export type ContextState = {
  atmosphere:   number; // 0–1
  moodScore:    number; // 0–1
  socialEnergy: number; // 0–1
  riskLevel:    "low" | "medium" | "high" | "critical";
  craftType?:   string;
  timeOfDay:    number; // 0–23
};

export interface TransitionParams {
  style:        TransitionStyle;
  durationMs:   number;
  easing:       string;
  blur:         number;   // px
  scale:        number;   // multiplier
  opacity:      [number, number]; // from → to
  color?:       string;   // accent overlay
  particleIntensity: number; // 0–1
  soundHint?:   string;
}

const BASE_EASINGS: Record<TransitionStyle, string> = {
  ambient_drift:    "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  decisive_cut:     "linear",
  luxury_fade:      "cubic-bezier(0.4, 0, 0.2, 1)",
  energy_surge:     "cubic-bezier(0.22, 1, 0.36, 1)",
  intimate_dissolve:"cubic-bezier(0.65, 0, 0.35, 1)",
  social_bloom:     "cubic-bezier(0.34, 1.56, 0.64, 1)",
  alert_flash:      "cubic-bezier(0.7, 0, 0.84, 0)",
  idle_breathe:     "ease-in-out",
};

function selectStyle(ctx: ContextState): TransitionStyle {
  if (ctx.riskLevel === "critical" || ctx.riskLevel === "high") return "alert_flash";
  if (ctx.socialEnergy > 0.75)  return "social_bloom";
  if (ctx.moodScore   < 0.35)   return "energy_surge";
  if (ctx.atmosphere  > 0.8)    return "luxury_fade";
  if (ctx.timeOfDay   >= 22)    return "intimate_dissolve";
  if (ctx.atmosphere  < 0.4)    return "decisive_cut";
  if (ctx.moodScore   > 0.7)    return "ambient_drift";
  return "idle_breathe";
}

export function generateTransition(ctx: ContextState): TransitionParams {
  const style = selectStyle(ctx);

  const durationBase: Record<TransitionStyle, number> = {
    ambient_drift:     800,
    decisive_cut:      150,
    luxury_fade:       600,
    energy_surge:      400,
    intimate_dissolve: 900,
    social_bloom:      500,
    alert_flash:       200,
    idle_breathe:      2000,
  };

  const blurMap: Record<TransitionStyle, number> = {
    ambient_drift: 4, decisive_cut: 0, luxury_fade: 8, energy_surge: 2,
    intimate_dissolve: 12, social_bloom: 3, alert_flash: 0, idle_breathe: 6,
  };

  const accentColors: Record<string, string> = {
    smoke: "#8B6914", pour: "#6B3F0F", brew: "#3D5A1A", vape: "#1A3D5A",
  };
  const color = ctx.craftType ? accentColors[ctx.craftType] : undefined;

  return {
    style,
    durationMs:        durationBase[style] + Math.round(ctx.atmosphere * 200),
    easing:            BASE_EASINGS[style],
    blur:              blurMap[style],
    scale:             style === "social_bloom" ? 1.02 : style === "energy_surge" ? 0.98 : 1.0,
    opacity:           style === "decisive_cut" ? [1, 1] : [0, 1],
    color,
    particleIntensity: ctx.socialEnergy * 0.7 + ctx.atmosphere * 0.3,
    soundHint:         style === "alert_flash" ? "alert_chime" : style === "social_bloom" ? "social_rise" : undefined,
  };
}

export function ambientBreathParams(intensity: number): TransitionParams {
  return {
    style:             "idle_breathe",
    durationMs:        3000 - intensity * 1500,
    easing:            "ease-in-out",
    blur:              Math.round(intensity * 8),
    scale:             1.0 + intensity * 0.01,
    opacity:           [0.8, 1.0],
    particleIntensity: intensity,
  };
}

export function operationalFlashParams(severity: "info" | "warn" | "critical"): TransitionParams {
  const durations = { info: 300, warn: 200, critical: 100 };
  const colors    = { info: "#3B82F6", warn: "#F59E0B", critical: "#EF4444" };
  return {
    style:             "alert_flash",
    durationMs:        durations[severity],
    easing:            BASE_EASINGS.alert_flash,
    blur:              0,
    scale:             severity === "critical" ? 1.03 : 1.0,
    opacity:           [0.3, 1],
    color:             colors[severity],
    particleIntensity: 0,
    soundHint:         severity === "critical" ? "critical_alert" : undefined,
  };
}
