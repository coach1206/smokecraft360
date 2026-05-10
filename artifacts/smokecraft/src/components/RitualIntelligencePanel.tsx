/**
 * RitualIntelligencePanel — Staff HUD surface for the EmotionalContinuityEngine.
 *
 * Designed to slot inside the EEIS Overlay XEI Intelligence Layer panel.
 * Surfaces in real-time:
 *   • Escalation arc  (DORMANT → AWAKENING → RESONATING → IMMERSED → SYNCHRONIZED)
 *   • Ritual state    (CURIOUS · EXPLORING · FOCUSED · IMMERSED · SYNCHRONIZED · FATIGUED)
 *   • Interruption window (OPEN · CAUTION · CLOSED)
 *   • Cognitive staff whispers from EEIS
 *   • Behavioral metric bars (confidence · hesitation · premium intent)
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEmotionalContinuity } from "@/hooks/useEmotionalContinuity";
import type { EscalationLevel, RitualState, InterruptionWindow, StaffWhisper } from "@/lib/emotionalStateStore";

// ── Design tokens (inherits from EeisOverlay palette) ──────────────────────────
const GOLD      = "#D48B00";
const CREAM     = "#F5F2ED";
const MONO      = "'Space Mono', 'Courier New', monospace";

// ── Escalation level config ────────────────────────────────────────────────────

const ESCALATION_ORDER: EscalationLevel[] = [
  "DORMANT", "AWAKENING", "RESONATING", "IMMERSED", "SYNCHRONIZED",
];

const ESCALATION_COLOR: Record<EscalationLevel, string> = {
  DORMANT:      "rgba(245,242,237,0.20)",
  AWAKENING:    "#7A6A3A",
  RESONATING:   "#C8A96E",
  IMMERSED:     GOLD,
  SYNCHRONIZED: "#FFD770",
};

// ── Ritual state config ────────────────────────────────────────────────────────

const STATE_COLOR: Record<RitualState, string> = {
  CURIOUS:      "#5BC4F5",
  EXPLORING:    "#A0C4A0",
  FOCUSED:      "#C8A96E",
  IMMERSED:     GOLD,
  SYNCHRONIZED: "#FFD770",
  FATIGUED:     "#EF8844",
};

const STATE_ICON: Record<RitualState, string> = {
  CURIOUS:      "◌",
  EXPLORING:    "◐",
  FOCUSED:      "◑",
  IMMERSED:     "●",
  SYNCHRONIZED: "◈",
  FATIGUED:     "◗",
};

// ── Interruption window config ────────────────────────────────────────────────

const WINDOW_COLOR: Record<InterruptionWindow, string> = {
  OPEN:    "#7EC8A0",
  CAUTION: GOLD,
  CLOSED:  "#EF4444",
};

const WINDOW_DESC: Record<InterruptionWindow, string> = {
  OPEN:    "Approach recommended",
  CAUTION: "Read the guest first",
  CLOSED:  "Avoid interruption",
};

// ── Urgency color ─────────────────────────────────────────────────────────────

const URGENCY_COLOR: Record<StaffWhisper["urgency"], string> = {
  low:    `${CREAM}50`,
  medium: GOLD,
  high:   "#FFD770",
};

// ── MetricSliver — compact horizontal metric bar ───────────────────────────────

function MetricSliver({ label, value, color = GOLD, invert = false }: {
  label:   string;
  value:   number;   // 0–100
  color?:  string;
  invert?: boolean;  // visual warning when value is high (e.g. hesitation)
}) {
  const pct        = Math.round(value);
  const barColor   = invert && value > 60 ? "#EF8844" : color;

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{
          fontSize:      7.5,
          letterSpacing: "0.10em",
          color:         `${CREAM}55`,
          textTransform: "uppercase",
          fontFamily:    MONO,
        }}>
          {label}
        </span>
        <span style={{
          fontSize:   8.5,
          color:      invert && value > 60 ? "#EF8844" : GOLD,
          fontFamily: MONO,
          fontWeight: 700,
        }}>
          {pct}
        </span>
      </div>
      <div style={{ height: 2.5, background: `${CREAM}0E`, borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${barColor}60, ${barColor})`, borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const RitualIntelligencePanel = memo(function RitualIntelligencePanel() {
  const { emotionalState: es } = useEmotionalContinuity();

  const escalationIdx = ESCALATION_ORDER.indexOf(es.escalationLevel);
  const stateColor    = STATE_COLOR[es.ritualState];
  const windowColor   = WINDOW_COLOR[es.interruptionWindow];

  return (
    <div style={{
      marginTop:    10,
      borderTop:    `1px solid ${GOLD}18`,
      paddingTop:   10,
    }}>

      {/* Section header */}
      <div style={{
        fontSize:      7,
        letterSpacing: "0.22em",
        color:         `${GOLD}70`,
        textTransform: "uppercase",
        fontFamily:    MONO,
        marginBottom:  10,
        display:       "flex",
        alignItems:    "center",
        gap:           6,
      }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }}
        />
        RITUAL INTELLIGENCE · LIVE
      </div>

      {/* Escalation arc — 5-dot progress */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize:      7,
          color:         `${CREAM}38`,
          letterSpacing: "0.14em",
          fontFamily:    MONO,
          marginBottom:  6,
          textTransform: "uppercase",
        }}>
          ESCALATION ARC
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {ESCALATION_ORDER.map((level, i) => {
            const active  = i <= escalationIdx;
            const current = i === escalationIdx;
            const color   = active ? ESCALATION_COLOR[level] : `${CREAM}12`;
            return (
              <div key={level} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {current && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.2, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position:     "absolute",
                        inset:        -3,
                        borderRadius: "50%",
                        background:   color,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <div style={{
                    width:        8,
                    height:       8,
                    borderRadius: "50%",
                    background:   color,
                    border:       `1px solid ${active ? color : `${CREAM}10`}`,
                    position:     "relative",
                    zIndex:       1,
                  }} />
                </div>
                {i < ESCALATION_ORDER.length - 1 && (
                  <div style={{
                    flex:      1,
                    height:    1,
                    background: i < escalationIdx ? `${GOLD}50` : `${CREAM}08`,
                    margin:    "0 2px",
                  }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{
          fontSize:      8,
          color:         ESCALATION_COLOR[es.escalationLevel],
          fontFamily:    MONO,
          letterSpacing: "0.14em",
          marginTop:     6,
          fontWeight:    700,
        }}>
          {es.escalationLevel}
        </div>
      </div>

      {/* Ritual state + interruption window row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>

        {/* Ritual state chip */}
        <div style={{
          flex:         1,
          padding:      "6px 10px",
          borderRadius: 8,
          background:   `${stateColor}10`,
          border:       `1px solid ${stateColor}30`,
        }}>
          <div style={{ fontSize: 6.5, color: `${CREAM}38`, letterSpacing: "0.14em", fontFamily: MONO, marginBottom: 3, textTransform: "uppercase" }}>
            RITUAL STATE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ fontSize: 12, color: stateColor, lineHeight: 1 }}
            >
              {STATE_ICON[es.ritualState]}
            </motion.span>
            <span style={{
              fontSize:      8,
              color:         stateColor,
              fontFamily:    MONO,
              fontWeight:    700,
              letterSpacing: "0.12em",
            }}>
              {es.ritualState}
            </span>
          </div>
        </div>

        {/* Interruption window */}
        <div style={{
          flex:         1,
          padding:      "6px 10px",
          borderRadius: 8,
          background:   `${windowColor}0A`,
          border:       `1px solid ${windowColor}25`,
        }}>
          <div style={{ fontSize: 6.5, color: `${CREAM}38`, letterSpacing: "0.14em", fontFamily: MONO, marginBottom: 3, textTransform: "uppercase" }}>
            INTERRUPT
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: windowColor, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 7.5, color: windowColor, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.10em" }}>
                {es.interruptionWindow}
              </div>
              <div style={{ fontSize: 6.5, color: `${CREAM}30`, fontFamily: MONO, letterSpacing: "0.06em", marginTop: 1 }}>
                {WINDOW_DESC[es.interruptionWindow]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral metric bars */}
      <div style={{ marginBottom: 10 }}>
        <MetricSliver label="Confidence"    value={es.confidence}               color={GOLD} />
        <MetricSliver label="Hesitation"    value={es.hesitationScore}          color={GOLD} invert />
        <MetricSliver label="Premium Intent" value={es.premiumIntentProbability} color="#C4A85A" />
        <MetricSliver label="Immersion"     value={es.immersionDepth}           color="#E8C870" />
      </div>

      {/* Staff cognitive whispers */}
      <AnimatePresence mode="popLayout">
        {es.staffWhispers.length > 0 && (
          <motion.div
            key="whispers-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={{
              fontSize:      6.5,
              letterSpacing: "0.16em",
              color:         `${GOLD}60`,
              textTransform: "uppercase",
              fontFamily:    MONO,
              marginBottom:  6,
            }}>
              ◈ EEIS WHISPERING
            </div>
            {es.staffWhispers.map((w) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          7,
                  marginBottom: 6,
                  paddingLeft:  6,
                  borderLeft:   `2px solid ${URGENCY_COLOR[w.urgency]}`,
                }}
              >
                <span style={{
                  fontSize:      8,
                  color:         URGENCY_COLOR[w.urgency],
                  fontFamily:    "'Cormorant Garamond', Georgia, serif",
                  fontStyle:     "italic",
                  lineHeight:    1.5,
                }}>
                  "{w.message}"
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ritual phase label */}
      <div style={{
        marginTop:     8,
        fontSize:      7,
        color:         `${CREAM}25`,
        letterSpacing: "0.14em",
        fontFamily:    MONO,
        textTransform: "uppercase",
        display:       "flex",
        justifyContent: "space-between",
      }}>
        <span>{es.ritualPhase.replace(/_/g, " ")}</span>
        <span>DEPTH {Math.round(es.ritualDepth)}%</span>
      </div>
    </div>
  );
});

export default RitualIntelligencePanel;
