/**
 * operationalVisualLanguage — defines the visual vocabulary for
 * communicating operational state to staff and operators.
 *
 * Maps internal system states to visual tokens (colors, icons, labels).
 */

export type OperationalState =
  | "nominal"     | "elevated"    | "degraded"
  | "critical"    | "offline"     | "recovering"
  | "learning"    | "optimizing"  | "autonomous";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface VisualToken {
  state:      OperationalState;
  color:      string;
  bgColor:    string;
  icon:       string;    // CSS class or emoji fallback
  label:      string;
  sublabel:   string;
  glowColor?: string;
  animate:    boolean;
  priority:   number;    // 1 (lowest) – 10 (highest)
}

export const OPERATIONAL_TOKENS: Record<OperationalState, VisualToken> = {
  nominal:    { state:"nominal",    color:"#22C55E", bgColor:"rgba(34,197,94,0.12)",  icon:"●",  label:"NOMINAL",     sublabel:"All systems operational",    animate:false, priority:1 },
  elevated:   { state:"elevated",   color:"#F59E0B", bgColor:"rgba(245,158,11,0.12)", icon:"◑",  label:"ELEVATED",    sublabel:"Monitoring active",          animate:false, priority:3 },
  degraded:   { state:"degraded",   color:"#EF4444", bgColor:"rgba(239,68,68,0.12)",  icon:"⚠",  label:"DEGRADED",    sublabel:"Reduced capability",         animate:true,  priority:6 },
  critical:   { state:"critical",   color:"#DC2626", bgColor:"rgba(220,38,38,0.18)",  icon:"✕",  label:"CRITICAL",    sublabel:"Immediate action required",  animate:true,  priority:10 },
  offline:    { state:"offline",    color:"#6B7280", bgColor:"rgba(107,114,128,0.1)", icon:"○",  label:"OFFLINE",     sublabel:"Edge mode active",           animate:false, priority:7 },
  recovering: { state:"recovering", color:"#8B5CF6", bgColor:"rgba(139,92,246,0.12)",icon:"↺",  label:"RECOVERING",  sublabel:"Syncing with cloud",         animate:true,  priority:4 },
  learning:   { state:"learning",   color:"#0EA5E9", bgColor:"rgba(14,165,233,0.12)", icon:"⟳",  label:"LEARNING",    sublabel:"Model training in progress", animate:true,  priority:2 },
  optimizing: { state:"optimizing", color:"#D48B00", bgColor:"rgba(212,139,0,0.12)",  icon:"◈",  label:"OPTIMIZING",  sublabel:"Autonomous optimization",   animate:true,  priority:2 },
  autonomous: { state:"autonomous", color:"#D48B00", bgColor:"rgba(212,139,0,0.15)",  icon:"⬡",  label:"AUTONOMOUS",  sublabel:"Full cognitive operation",  glowColor:"rgba(212,139,0,0.3)", animate:true, priority:5 },
};

export type MetricBadgeStyle = "neutral" | "positive" | "warning" | "danger";

export interface MetricBadge {
  value:   number | string;
  label:   string;
  style:   MetricBadgeStyle;
  suffix?: string;
  trend?:  "up" | "down" | "flat";
}

export function riskToState(risk: RiskLevel): OperationalState {
  const map: Record<RiskLevel, OperationalState> = {
    low: "nominal", medium: "elevated", high: "degraded", critical: "critical",
  };
  return map[risk];
}

export function buildMetricBadge(
  value:     number,
  label:     string,
  threshold: { warn: number; danger: number },
  suffix?:   string,
): MetricBadge {
  const style: MetricBadgeStyle =
    value >= threshold.danger ? "danger" :
    value >= threshold.warn   ? "warning" : "positive";
  return { value, label, style, suffix };
}

export function getTokenForScore(score: number): VisualToken {
  if (score >= 85) return OPERATIONAL_TOKENS.autonomous;
  if (score >= 70) return OPERATIONAL_TOKENS.optimizing;
  if (score >= 55) return OPERATIONAL_TOKENS.nominal;
  if (score >= 40) return OPERATIONAL_TOKENS.elevated;
  if (score >= 25) return OPERATIONAL_TOKENS.degraded;
  return OPERATIONAL_TOKENS.critical;
}
