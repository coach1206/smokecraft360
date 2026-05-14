/**
 * IntelligencePanel — NOVEE OS Intelligence Engine UI
 * Route: /intelligence
 *
 * Tabs:
 *   Live Feed    — pending triggers awaiting approval + auto-fired log
 *   Rule Matrix  — all IF/THEN rules, their status and cooldown
 *   Venue Signal — live snapshot meters (traffic, loyalty, inventory, etc.)
 *
 * Design: Apple × Tesla × Star Trek hospitality OS.
 * OLED dark, cinematic imagery, tactile raised controls. No flat UI.
 */

import { useState } from "react";
import { useLocation }  from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Brain, Activity, CheckCircle2, X,
  AlertTriangle, ChevronRight, RotateCcw, Clock,
  Eye, Layers, TrendingUp, Package, Heart, Star,
  Cpu, Radio,
} from "lucide-react";
import { useAxiomIntelligence }  from "@/contexts/AxiomIntelligenceContext";
import { usePosContext }         from "@/contexts/PosContext";
import { useCommandCenter }     from "@/contexts/CommandCenterContext";
import {
  INTELLIGENCE_RULES,
  SEVERITY_COLOR, SEVERITY_LABEL,
  CATEGORY_COLOR, CHANNEL_LABEL, CHANNEL_COLOR,
  type TriggerEvent, type TriggerCategory,
} from "@/lib/axiomIntelligence";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:       "#F5F2ED",
  glass:    "rgba(255,255,255,0.028)",
  glassMid: "rgba(26,26,27,0.06)",
  border:   "rgba(26,26,27,0.09)",
  gold:     "#D48B00",
  goldDim:  "rgba(212,139,0,0.50)",
  text:     "#1A1A1B",
  muted:    "rgba(240,232,212,0.48)",
  dim:      "rgba(240,232,212,0.26)",
};

type Tab = "feed" | "rules" | "signal";

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <motion.div
      style={{ width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
      transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Tactile tab button ─────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        padding:       "9px 18px",
        borderRadius:  10,
        border:        `1px solid ${active ? `${C.gold}40` : C.border}`,
        background:    active ? `${C.gold}12` : "transparent",
        color:         active ? C.gold : C.muted,
        fontSize:      12,
        fontWeight:    active ? 700 : 500,
        letterSpacing: "0.04em",
        cursor:        "pointer",
        boxShadow:     active ? `0 4px 16px ${C.gold}14, inset 0 1px 0 ${C.gold}18` : "none",
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Channel badge ──────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const color = CHANNEL_COLOR[channel as keyof typeof CHANNEL_COLOR] ?? C.muted;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase",
      color, padding: "3px 8px", borderRadius: 6,
      background: `${color}12`, border: `1px solid ${color}28`,
    }}>
      {CHANNEL_LABEL[channel as keyof typeof CHANNEL_LABEL] ?? channel}
    </span>
  );
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, accent }: { score: number; accent: string }) {
  const r   = 14;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  return (
    <svg width={34} height={34} style={{ flexShrink: 0 }}>
      <circle cx={17} cy={17} r={r} fill="none" stroke={`${accent}18`} strokeWidth={3} />
      <motion.circle
        cx={17} cy={17} r={r} fill="none"
        stroke={accent} strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: dash }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "17px 17px", transform: "rotate(-90deg)" }}
      />
      <text x={17} y={21} textAnchor="middle" fontSize={8} fontWeight={700} fill={accent}>
        {score}
      </text>
    </svg>
  );
}

// ── Trigger event card ─────────────────────────────────────────────────────────

interface EventCardProps {
  event:   TriggerEvent;
  onApprove?: () => void;
  onDismiss?: () => void;
  delay?:  number;
}

function EventCard({ event, onApprove, onDismiss, delay = 0 }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sevColor  = SEVERITY_COLOR[event.severity];
  const catColor  = CATEGORY_COLOR[event.category];
  const isPending = event.status === "pending";
  const isApproved = event.status === "approved";
  const isFired   = event.status === "fired";
  const isDismissed = event.status === "dismissed";

  const borderColor = isPending ? `${sevColor}35`
                    : isApproved ? "#22c55e35"
                    : isFired   ? `${catColor}25`
                    : C.border;

  const bgColor = isPending ? `${sevColor}08`
                : isApproved ? "rgba(34,197,94,0.06)"
                : isFired   ? `${catColor}06`
                : "rgba(26,26,27,0.02)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: isDismissed ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      layout
      style={{
        borderRadius:   16,
        border:         `1px solid ${borderColor}`,
        background:     bgColor,
        backdropFilter: "blur(12px)",
        overflow:       "hidden",
        boxShadow:      isPending ? `0 6px 28px ${sevColor}12` : "none",
      }}
    >
      {/* Header */}
      <div
        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <ScoreRing score={event.metaScore} accent={sevColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            {/* Severity badge */}
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: sevColor, padding: "2px 8px", borderRadius: 20,
              background: `${sevColor}12`, border: `1px solid ${sevColor}25`,
            }}>
              {SEVERITY_LABEL[event.severity]}
            </span>
            {/* Category */}
            <span style={{
              fontSize: 8, fontWeight: 600, letterSpacing: "0.14em",
              textTransform: "uppercase", color: catColor,
            }}>
              {event.category}
            </span>
            {/* Auto / Approval badge */}
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: event.firingMode === "auto" ? "#22c55e" : "#f59e0b",
              padding: "2px 7px", borderRadius: 20,
              background: event.firingMode === "auto" ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.10)",
              border: `1px solid ${event.firingMode === "auto" ? "#22c55e28" : "#f59e0b28"}`,
            }}>
              {event.firingMode === "auto" ? "Auto-Fire" : "Approval Required"}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>
            {event.title}
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
            {event.insight}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {/* Status indicator */}
          {isPending  && <PulseDot color={sevColor} />}
          {isApproved && <CheckCircle2 size={14} color="#22c55e" />}
          {isFired    && <Zap size={13} color={catColor} />}
          {isDismissed && <X size={13} color={C.dim} />}
          <ChevronRight
            size={13} color={C.dim}
            style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          />
        </div>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px" }}>
              {/* Rationale */}
              <div style={{
                padding: "10px 13px", borderRadius: 10, marginBottom: 12,
                background: "rgba(26,26,27,0.04)",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
                  Why this trigger fired
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>
                  {event.rationale}
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                  Recommended Actions
                </div>
                {event.actions.map(a => (
                  <div key={a.id} style={{
                    padding: "10px 13px", borderRadius: 10, marginBottom: 7,
                    background: `${CHANNEL_COLOR[a.channel] ?? C.gold}07`,
                    border: `1px solid ${CHANNEL_COLOR[a.channel] ?? C.gold}18`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <ChannelBadge channel={a.channel} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{a.label}</span>
                    </div>
                    <div style={{
                      fontSize: 11, color: C.muted, lineHeight: 1.5, fontStyle: "italic",
                      padding: "7px 10px", borderRadius: 7,
                      background: "rgba(26,26,27,0.04)",
                      border: `1px solid ${C.border}`,
                      marginBottom: 5,
                    }}>
                      "{a.messageBody}"
                    </div>
                    <div style={{ fontSize: 10, color: C.dim }}>
                      CTA: <span style={{ color: C.gold, fontWeight: 600 }}>{a.cta}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Approve / Dismiss (pending only) */}
              {isPending && (
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
                    style={{
                      flex: 1, padding: "11px", borderRadius: 10,
                      border: "1px solid #22c55e35",
                      background: "rgba(34,197,94,0.10)",
                      color: "#22c55e", fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(34,197,94,0.14), inset 0 1px 0 rgba(34,197,94,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Approve &amp; Fire
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
                    style={{
                      padding: "11px 18px", borderRadius: 10,
                      border: "1px solid rgba(239,68,68,0.22)",
                      background: "rgba(239,68,68,0.06)",
                      color: "rgba(239,68,68,0.70)", fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <X size={13} />
                    Dismiss
                  </motion.button>
                </div>
              )}

              {/* Fired timestamp */}
              {(isFired || isApproved) && event.autoFiredAt && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 10, color: C.dim,
                }}>
                  <Clock size={10} />
                  {event.firingMode === "auto" ? "Auto-fired" : "Approved"} at{" "}
                  {new Date(event.autoFiredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Tab: Live Feed ─────────────────────────────────────────────────────────────

function LiveFeedTab() {
  const { events, pending, autoFired, approve, dismiss, clearFired, forceEval, lastTick } =
    useAxiomIntelligence();
  const [filter, setFilter] = useState<"all" | "pending" | "fired" | "dismissed">("all");

  const filtered = events.filter(e => {
    if (filter === "pending")   return e.status === "pending";
    if (filter === "fired")     return e.status === "fired" || e.status === "approved";
    if (filter === "dismissed") return e.status === "dismissed";
    return true;
  });

  return (
    <div>
      {/* Controls bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "fired", "dismissed"] as const).map(f => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 13px", borderRadius: 20,
                border: `1px solid ${filter === f ? `${C.gold}40` : C.border}`,
                background: filter === f ? `${C.gold}10` : "transparent",
                color: filter === f ? C.gold : C.dim,
                fontSize: 11, fontWeight: filter === f ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {f === "all" ? `All (${events.length})`
               : f === "pending" ? `Pending (${pending.length})`
               : f === "fired"   ? `Executed (${autoFired.filter(e => e.status === "fired" || e.status === "approved").length})`
               : `Dismissed`}
            </motion.button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {autoFired.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={clearFired}
              style={{
                padding: "7px 13px", borderRadius: 10,
                border: `1px solid rgba(239,68,68,0.20)`,
                background: "rgba(239,68,68,0.06)",
                color: "rgba(239,68,68,0.65)", fontSize: 11, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <X size={11} /> Clear Log
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={forceEval}
            style={{
              padding: "7px 13px", borderRadius: 10,
              border: `1px solid ${C.gold}30`,
              background: `${C.gold}08`,
              color: C.gold, fontSize: 11, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <RotateCcw size={11} /> Re-evaluate
          </motion.button>
        </div>
      </div>

      {/* Last tick */}
      {lastTick && (
        <div style={{
          fontSize: 10, color: C.dim,
          marginBottom: 14, display: "flex", alignItems: "center", gap: 5,
        }}>
          <Radio size={9} />
          Last evaluated: {new Date(lastTick).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{
          padding: "32px", borderRadius: 16, textAlign: "center",
          border: `1px dashed ${C.border}`,
          background: "rgba(26,26,27,0.03)",
        }}>
          <Brain size={28} color={C.dim} style={{ margin: "0 auto 10px" }} />
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
            {filter === "pending" ? "No pending triggers — the venue is operating normally."
             : filter === "dismissed" ? "No dismissed triggers."
             : "Intelligence engine is monitoring. Triggers appear when conditions are met."}
          </div>
          <div style={{ fontSize: 11, color: C.dim }}>
            Click Re-evaluate to force a check against current venue data.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((e, i) => (
            <EventCard
              key={e.id}
              event={e}
              delay={i * 0.04}
              onApprove={() => approve(e.id)}
              onDismiss={() => dismiss(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Rule Matrix ───────────────────────────────────────────────────────────

function RuleMatrixTab() {
  const { events } = useAxiomIntelligence();

  const ruleStatus = (ruleId: string) => {
    const ev = events.find(e => e.ruleId === ruleId);
    if (!ev) return "idle";
    return ev.status;
  };

  const groupedRules: Record<TriggerCategory, typeof INTELLIGENCE_RULES> = {} as never;
  for (const rule of INTELLIGENCE_RULES) {
    if (!groupedRules[rule.category]) groupedRules[rule.category] = [];
    groupedRules[rule.category].push(rule);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {(Object.entries(groupedRules) as [TriggerCategory, typeof INTELLIGENCE_RULES][]).map(([cat, rules]) => {
        const catColor = CATEGORY_COLOR[cat];
        return (
          <div key={cat}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 9,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColor }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
                textTransform: "uppercase", color: catColor,
              }}>
                {cat}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rules.map(rule => {
                const status = ruleStatus(rule.id);
                const sevColor = SEVERITY_COLOR[rule.severity];
                const isActive = status === "pending" || status === "fired" || status === "approved";

                return (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display:     "flex",
                      alignItems:  "center",
                      gap:         12,
                      padding:     "11px 14px",
                      borderRadius: 11,
                      border:      `1px solid ${isActive ? `${sevColor}28` : C.border}`,
                      background:  isActive ? `${sevColor}06` : C.glass,
                    }}
                  >
                    {/* Mode indicator */}
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: rule.firingMode === "auto" ? "#22c55e" : "#f59e0b",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? C.text : C.muted, marginBottom: 2 }}>
                        {rule.id.replace(/\./g, " · ").replace(/_/g, " ")}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 8, color: sevColor,
                          background: `${sevColor}10`, border: `1px solid ${sevColor}20`,
                          padding: "1px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        }}>
                          {rule.severity}
                        </span>
                        <span style={{
                          fontSize: 8, color: rule.firingMode === "auto" ? "#22c55e" : "#f59e0b",
                          background: rule.firingMode === "auto" ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                          border: `1px solid ${rule.firingMode === "auto" ? "#22c55e22" : "#f59e0b22"}`,
                          padding: "1px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        }}>
                          {rule.firingMode === "auto" ? "Auto" : "Approval"}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                        color: status === "pending"   ? "#f59e0b"
                             : status === "fired"     ? "#22c55e"
                             : status === "approved"  ? "#34d399"
                             : status === "dismissed" ? C.dim
                             : C.dim,
                      }}>
                        {status === "idle" ? "MONITORING" : status.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 9, color: C.dim }}>
                        {Math.round(rule.cooldownMs / 60000)}m cooldown
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, padding: "12px 14px", borderRadius: 12,
        border: `1px solid ${C.border}`, background: C.glass,
        flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", alignSelf: "center" }}>
          Legend
        </div>
        {[
          { label: "Auto-Fire", color: "#22c55e" },
          { label: "Approval Required", color: "#f59e0b" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 10, color: C.muted }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Venue Signal ──────────────────────────────────────────────────────────

interface MeterBarProps {
  label:  string;
  value:  number;
  max:    number;
  accent: string;
  unit?:  string;
  warn?:  boolean;
}

function MeterBar({ label, value, max, accent, unit = "", warn }: MeterBarProps) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const color = warn && pct > 60 ? "#ef4444" : accent;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: "rgba(26,26,27,0.08)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%", borderRadius: 3,
            background: `linear-gradient(90deg, ${color}55, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

function SignalCard({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 16,
      border: `1px solid ${accent}18`,
      background: `${accent}05`,
      backdropFilter: "blur(12px)",
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
        textTransform: "uppercase", color: `${accent}70`, marginBottom: 14,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function VenueSignalTab() {
  const { snapshot } = useAxiomIntelligence();
  const pos = usePosContext();
  const cc  = useCommandCenter();

  if (!snapshot) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: C.dim }}>
        <Cpu size={24} style={{ marginBottom: 8 }} />
        <div>Building venue snapshot…</div>
      </div>
    );
  }

  const hour = snapshot.hourOfDay;
  const timeLabel = hour < 6  ? "Late Night" : hour < 12 ? "Morning"
                  : hour < 17 ? "Afternoon"  : hour < 21 ? "Evening" : "Night";

  const dows = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const totalRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0)
                     + pos.orders.reduce((s, o) => s + o.total, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

      {/* Time context */}
      <SignalCard title="Time Context" accent="#60a5fa">
        <div style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>
          {timeLabel}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          {dows[snapshot.dayOfWeek]} · {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </div>
        <MeterBar label="Hour of Day" value={hour} max={23} accent="#60a5fa" />
      </SignalCard>

      {/* Revenue */}
      <SignalCard title="Revenue Signal" accent={C.gold}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.gold, marginBottom: 4 }}>
          ${totalRevenue.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          {snapshot.totalOrdersToday} orders · avg ${Math.round(snapshot.avgOrderValue)}
        </div>
        <MeterBar label="Orders Today" value={snapshot.totalOrdersToday} max={20} accent={C.gold} />
        <MeterBar label="Avg Order Value" value={Math.round(snapshot.avgOrderValue)} max={100} accent={C.gold} unit="$" />
      </SignalCard>

      {/* Loyalty signal */}
      <SignalCard title="Loyalty Signal" accent="#34d399">
        <div style={{ fontSize: 24, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>
          {Math.round(snapshot.rewardConvRate * 100)}%
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Reward conversion · {snapshot.rewardTriggered} triggered
        </div>
        <MeterBar label="Conv. Rate" value={Math.round(snapshot.rewardConvRate * 100)} max={100} accent="#34d399" unit="%" />
      </SignalCard>

      {/* Inventory signal */}
      <SignalCard title="Inventory Signal" accent="#f97316">
        <div style={{ fontSize: 24, fontWeight: 700, color: snapshot.outOfStockCount > 0 ? "#ef4444" : "#f97316", marginBottom: 4 }}>
          {snapshot.outOfStockCount > 0 ? `${snapshot.outOfStockCount} Out` : `${snapshot.lowStockCount} Low`}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          {pos.products.length} total SKUs monitored
        </div>
        <MeterBar label="Out of Stock" value={snapshot.outOfStockCount} max={pos.products.length || 1} accent="#ef4444" warn />
        <MeterBar label="Low Stock"    value={snapshot.lowStockCount}   max={pos.products.length || 1} accent="#f97316" />
      </SignalCard>

      {/* Guest activity */}
      <SignalCard title="Guest Activity" accent="#a78bfa">
        <div style={{ fontSize: 24, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>
          {snapshot.activeGuests}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Active guests · {snapshot.onlineDevices}/{snapshot.totalDevices} devices online
        </div>
        <MeterBar label="Active Guests" value={snapshot.activeGuests} max={20} accent="#a78bfa" />
        <MeterBar label="Devices Online" value={snapshot.onlineDevices} max={Math.max(snapshot.totalDevices, 1)} accent="#60a5fa" />
      </SignalCard>

      {/* Campaign signal */}
      <SignalCard title="Campaign Signal" accent="#ec4899">
        <div style={{ fontSize: 24, fontWeight: 700, color: "#ec4899", marginBottom: 4 }}>
          {snapshot.activeCampaigns}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Active · {snapshot.campaignCount} total campaigns
        </div>
        <MeterBar label="Active Campaigns" value={snapshot.activeCampaigns} max={Math.max(snapshot.campaignCount, 1)} accent="#ec4899" />
        <MeterBar label="Campaign Coverage" value={snapshot.campaignCount} max={10} accent="#ec4899" />
      </SignalCard>

    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IntelligencePanel() {
  const [, navigate]   = useLocation();
  const [tab, setTab]  = useState<Tab>("feed");
  const { pending, autoFired, lastTick, snapshot } = useAxiomIntelligence();

  const pendingCount = pending.length;
  const firedCount   = autoFired.length;

  return (
    <div style={{
      position:      "relative",
      minHeight:     "100dvh",
      background:    C.bg,
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
      color:         C.text,
    }}>

      {/* Full-bleed ambient */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/images/scenes/reflective.jpg)",
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.05, filter: "blur(4px) saturate(0.4)", transform: "scale(1.04)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(212,139,0,0.05) 0%, transparent 65%)," +
            "linear-gradient(180deg, transparent 0%, rgba(6,4,10,0.9) 100%)",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #60a5fa35, #D48B0035, #34d39935, transparent)",
        }} />
      </div>

      {/* ── Header ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(6,4,10,0.88)",
        backdropFilter: "blur(20px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(26,26,27,0.06)", border: `1px solid ${C.border}`,
              color: C.muted, cursor: "pointer",
            }}
          >
            <ArrowLeft size={19} />
          </motion.button>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              fontFamily: "'Playfair Display', serif",
              color: C.gold,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Brain size={16} color={C.gold} />
              NOVEE OS Intelligence Engine
            </div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>
              Automated triggers · IF/THEN rules · venue monitoring
            </div>
          </div>
        </div>

        {/* Status KPIs */}
        <div style={{ display: "flex", gap: 10 }}>
          {pendingCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 15px", borderRadius: 12,
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.28)",
              }}
            >
              <AlertTriangle size={13} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{pendingCount}</span>
              <span style={{ fontSize: 10, color: "#f59e0b80", letterSpacing: "0.1em", textTransform: "uppercase" }}>Awaiting Approval</span>
            </motion.div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 15px", borderRadius: 12,
            background: "rgba(34,197,94,0.07)",
            border: "1px solid rgba(34,197,94,0.22)",
          }}>
            <Zap size={13} color="#22c55e" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{firedCount}</span>
            <span style={{ fontSize: 10, color: "rgba(34,197,94,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Auto-Fired</span>
          </div>
          {lastTick && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 12,
              background: C.glass, border: `1px solid ${C.border}`,
            }}>
              <PulseDot color="#60a5fa" size={5} />
              <span style={{ fontSize: 10, color: C.dim }}>
                {new Date(lastTick).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── System signal bar ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: 20,
        padding: "8px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(26,26,27,0.07)", backdropFilter: "blur(12px)",
        overflowX: "auto", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Activity size={10} color={C.goldDim} />
          <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: C.dim, textTransform: "uppercase" }}>
            Intelligence
          </span>
        </div>
        {[
          { label: "RULE ENGINE",     state: "ACTIVE",   color: "#22c55e" },
          { label: "TRAFFIC MONITOR", state: "LIVE",     color: "#60a5fa" },
          { label: "LOYALTY WATCH",   state: "ONLINE",   color: "#34d399" },
          { label: "INVENTORY SCAN",  state: "SYNCED",   color: "#f97316" },
          { label: "SOCIAL PULSE",    state: "TRACKING", color: "#a78bfa" },
          { label: "VIP DETECTION",   state: "READY",    color: "#D48B00" },
        ].map(n => (
          <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <motion.div
              style={{ width: 5, height: 5, borderRadius: "50%", background: n.color }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
              transition={{ duration: 2.2 + Math.random() * 0.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.13em", textTransform: "uppercase" }}>{n.label}</span>
            <span style={{ fontSize: 8, color: n.color, fontWeight: 700, letterSpacing: "0.08em" }}>{n.state}</span>
          </div>
        ))}
        {snapshot && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <Eye size={9} color={C.goldDim} />
            <span style={{ fontSize: 8, color: C.dim }}>
              {INTELLIGENCE_RULES.length} rules · {snapshot.totalOrdersToday} orders · {snapshot.activeGuests} guests
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", gap: 8, padding: "14px 20px 0",
        flexShrink: 0,
      }}>
        <TabBtn label={`Live Feed${pendingCount > 0 ? ` (${pendingCount})` : ""}`} active={tab === "feed"}   onClick={() => setTab("feed")}   />
        <TabBtn label={`Rule Matrix (${INTELLIGENCE_RULES.length})`}               active={tab === "rules"}  onClick={() => setTab("rules")}  />
        <TabBtn label="Venue Signal"                                                active={tab === "signal"} onClick={() => setTab("signal")} />
      </div>

      {/* ── Content ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1, overflowY: "auto",
        padding: "16px 20px 28px",
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "feed"   && <LiveFeedTab />}
            {tab === "rules"  && <RuleMatrixTab />}
            {tab === "signal" && <VenueSignalTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "8px 20px",
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.16em",
        background: "rgba(6,4,10,0.80)", backdropFilter: "blur(14px)", flexShrink: 0,
      }}>
        <span>
          <Brain size={9} style={{ marginRight: 5, verticalAlign: "middle" }} />
          NOVEE OS · Intelligence Engine · {INTELLIGENCE_RULES.length} rules active
        </span>
        <span>Hybrid firing · 90s evaluation cycle</span>
      </div>
    </div>
  );
}
