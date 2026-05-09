/**
 * EeisOverlay — XEI + EEIS Operational Nervous System
 *
 * Surfaces over the guest experience via a cinematic ripple-wave transition
 * when staff triggers a handoff. The guest route stays fully mounted underneath
 * — no navigation, no reload, complete session continuity.
 *
 * Layout (landscape-first):
 *   ┌─────────────────────────────────────────────────────┐
 *   │  AXIOM OS · OPERATIONAL MODE                 [EXIT] │  ← Brushed Graphite header
 *   ├──────────────┬───────────────┬───────────────────────┤
 *   │ GUEST JOURNEY│ XEI INTEL     │  SIGNAL VISUALIZATION │
 *   │ STATE        │ LAYER         │                       │
 *   ├──────────────┴───────────────┤                       │
 *   │ VENUE INTELLIGENCE           │                       │
 *   └──────────────────────────────┴───────────────────────┘
 *
 * Material: Brushed Graphite (#2A2A2A) header, smoked-titanium panels,
 * Warm Honey Amber (#D48B00) accents, cream typography.
 */

import { useRef, useEffect, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandoff } from "@/contexts/HandoffContext";
import { useOrchestrator } from "@/contexts/OrchestratorContext";
import { useAxiomIntelligence } from "@/contexts/AxiomIntelligenceContext";
import { useGuestProfile } from "@/contexts/GuestProfileContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useCraftExperience } from "@/contexts/CraftExperienceContext";

// ── Design tokens ──────────────────────────────────────────────────────────────

const GOLD      = "#D48B00";
const GRAPHITE  = "#2A2A2A";
const OBSIDIAN  = "#1A1A1B";
const CREAM     = "#F5F2ED";
const PARCHMENT = "#EFEBE0";
const MUTED     = "#6B5E4E";
const PANEL_BG  = "rgba(30,28,25,0.92)";
const BORDER    = `${GOLD}28`;

// ── Engine nodes for signal visualization ──────────────────────────────────────

const ENGINE_NODES = [
  { id: "pred",  label: "PredictiveIntent",    x: 80,  y: 60  },
  { id: "tel",   label: "Telemetry",           x: 220, y: 40  },
  { id: "venue", label: "VenueDNA",            x: 320, y: 110 },
  { id: "rec",   label: "Recommendation",      x: 180, y: 160 },
  { id: "sess",  label: "SessionPersistence",  x: 60,  y: 180 },
  { id: "env",   label: "Environmental",       x: 260, y: 220 },
  { id: "hand",  label: "HandoffState",        x: 130, y: 280 },
  { id: "rev",   label: "RevenueAttribution",  x: 300, y: 300 },
] as const;

// Connections between nodes
const EDGES: [string, string][] = [
  ["pred", "tel"],  ["tel",  "venue"], ["venue", "rec"],
  ["rec",  "sess"], ["sess", "hand"],  ["hand",  "rev"],
  ["pred", "rec"],  ["env",  "rec"],   ["tel",  "hand"],
  ["venue","env"],  ["rev",  "env"],
];

function getNode(id: string) {
  return ENGINE_NODES.find(n => n.id === id)!;
}

// ── Venue Heartbeat Orb ────────────────────────────────────────────────────────
// Breathing metallic orb representing live venue energy.

const VenueHeartbeatOrb = memo(function VenueHeartbeatOrb({
  energy = 60,
}: { energy?: number }) {
  const rings = [42, 54, 66];
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "12px 0 8px" }}>
      <div style={{ position: "relative", width: 88, height: 88 }}>
        {/* Outer pulse rings */}
        {rings.map((r, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.06 + i * 0.04, 1], opacity: [0.18, 0.35 - i * 0.06, 0.18] }}
            transition={{ duration: 2.8 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
            style={{
              position:     "absolute",
              inset:        `${(88 - r * 2) / 2}px`,
              borderRadius: "50%",
              border:       `1px solid ${GOLD}`,
              pointerEvents: "none",
            }}
          />
        ))}
        {/* Telemetry ring — rotates with energy */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", inset: 6,
            borderRadius: "50%",
            border: `1px dashed ${GOLD}40`,
          }}
        />
        {/* Core orb */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], boxShadow: [
            `0 0 18px ${GOLD}40, 0 0 6px ${GOLD}80`,
            `0 0 36px ${GOLD}70, 0 0 12px ${GOLD}CC`,
            `0 0 18px ${GOLD}40, 0 0 6px ${GOLD}80`,
          ]}}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            inset:        20,
            borderRadius: "50%",
            background:   `radial-gradient(circle at 35% 30%, #C4A85A, ${GOLD} 40%, #7A5A00 80%, #3A2800)`,
            border:       `1px solid ${GOLD}80`,
          }}
        />
        {/* Energy percentage overlay */}
        <div style={{
          position:       "absolute", inset: 0,
          display:        "flex", alignItems: "center", justifyContent: "center",
          fontFamily:     "'Space Mono', monospace",
          fontSize:       10, fontWeight: 700, color: CREAM,
          textShadow:     `0 0 8px ${GOLD}`,
          pointerEvents:  "none",
        }}>
          {energy}
        </div>
      </div>
    </div>
  );
});

// ── Adaptive Staff Nudge ───────────────────────────────────────────────────────
// Detects new vs returning guest and surfaces the right coaching mode.

function AdaptiveNudge({
  isNew,
  sessionTags,
  swipeCount,
}: { isNew: boolean; sessionTags: string[]; swipeCount: number }) {
  const mode   = isNew ? "EDUCATION" : "PALATE EVOLUTION";
  const accent = isNew ? "#5BC4F5" : GOLD;

  return (
    <div style={{
      marginTop:    8,
      padding:      "8px 10px",
      borderRadius: 8,
      background:   `${accent}0D`,
      border:       `1px solid ${accent}30`,
    }}>
      <div style={{
        fontSize:      7, fontWeight: 700, letterSpacing: "0.18em",
        color:         accent, textTransform: "uppercase",
        fontFamily:    "'Space Mono', monospace", marginBottom: 5,
        display:       "flex", alignItems: "center", gap: 5,
      }}>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 4, height: 4, borderRadius: "50%", background: accent }}
        />
        {mode} MODE
      </div>
      {isNew ? (
        <>
          <div style={{ fontSize: 8, color: `${CREAM}70`, lineHeight: 1.5, fontFamily: "'Space Mono', monospace" }}>
            First-time explorer detected. Lead with sensory education — aroma first, then strength.
          </div>
          <div style={{ marginTop: 5, fontSize: 7, color: accent, letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace" }}>
            → SCRIPT: "Let me walk you through the experience…"
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 8, color: `${CREAM}70`, lineHeight: 1.5, fontFamily: "'Space Mono', monospace" }}>
            {swipeCount} signals logged · Reference their profile chips for continuity.
          </div>
          {sessionTags.slice(0, 3).map(tag => (
            <div key={tag} style={{
              display:      "inline-block", marginRight: 4, marginTop: 4,
              padding:      "2px 7px", borderRadius: 20,
              border:       `1px solid ${GOLD}35`,
              background:   `${GOLD}10`,
              fontSize:     7, color: `${GOLD}CC`,
              fontFamily:   "'Space Mono', monospace", letterSpacing: "0.08em",
            }}>
              {tag}
            </div>
          ))}
          {sessionTags.length > 3 && (
            <div style={{ fontSize: 7, color: `${CREAM}40`, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
              +{sessionTags.length - 3} more signals
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Pairing Live Panel ─────────────────────────────────────────────────────────
// Fetches top pairing match for current session tags and surfaces it with
// confidence score + "luxury sommelier" alchemy text.

interface LiveMatch {
  name:          string;
  category:      string | null;
  price:         string | null;
  affinityScore: number;
}

function PairingLivePanel({ tags }: { tags: string[] }) {
  const [match, setMatch]   = useState<LiveMatch | null>(null);
  const [loading, setLoad]  = useState(false);
  const prevTags            = useRef("");

  useEffect(() => {
    const key = tags.slice().sort().join(",");
    if (!key || key === prevTags.current) return;
    prevTags.current = key;
    setLoad(true);
    fetch(`/api/pairing-engine/suggest?tags=${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then(d => { setMatch(d.suggestions?.[0] ?? null); setLoad(false); })
      .catch(() => setLoad(false));
  }, [tags.join(",")]);

  const confidence = match ? Math.min(98, 60 + match.affinityScore) : 0;

  return (
    <div style={{
      marginTop:    8,
      padding:      "8px 10px",
      borderRadius: 8,
      background:   `${GOLD}08`,
      border:       `1px solid ${GOLD}28`,
    }}>
      <div style={{
        fontSize:   7, fontWeight: 700, letterSpacing: "0.18em",
        color:      `${GOLD}90`, textTransform: "uppercase",
        fontFamily: "'Space Mono', monospace", marginBottom: 6,
      }}>
        ◈ PAIRING INTELLIGENCE
      </div>
      {loading ? (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 8, color: `${CREAM}40`, fontFamily: "'Space Mono', monospace" }}
        >
          Resolving match…
        </motion.div>
      ) : !match || tags.length === 0 ? (
        <div style={{ fontSize: 8, color: `${CREAM}30`, fontFamily: "'Space Mono', monospace" }}>
          Awaiting taste signal…
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize:   13, color: CREAM, marginBottom: 2,
          }}>
            {match.name}
          </div>
          {match.category && (
            <div style={{ fontSize: 7, color: `${CREAM}50`, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>
              {match.category}
            </div>
          )}
          {/* Confidence bar */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 7, color: `${CREAM}50`, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em" }}>CONFIDENCE</span>
              <span style={{ fontSize: 8, color: GOLD, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{confidence}%</span>
            </div>
            <div style={{ height: 2, background: `${CREAM}10`, borderRadius: 1 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}60, ${GOLD})`, borderRadius: 1 }}
              />
            </div>
          </div>
          {/* Alchemy text */}
          <div style={{ fontSize: 7, color: `${GOLD}80`, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
            "A sovereign pairing — the flavor profile aligns with your guest's expressed palate at {confidence}% affinity."
          </div>
          {confidence >= 85 && (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{
                marginTop:    6, padding: "3px 8px", borderRadius: 20,
                border:       `1px solid ${GOLD}50`, background: `${GOLD}15`,
                fontSize:     7, color: GOLD, fontFamily: "'Space Mono', monospace",
                letterSpacing: "0.12em", textTransform: "uppercase", display: "inline-block",
              }}
            >
              ✦ Reserva Exclusive — Suggest Upgrade
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ── Signal Visualization ───────────────────────────────────────────────────────

const SVG_W = 380;
const SVG_H = 340;

const SignalViz = memo(function SignalViz() {
  const [pulse, setPulse] = useState<{ edge: number; t: number }>({ edge: 0, t: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse({ edge: Math.floor(Math.random() * EDGES.length), t: Date.now() });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0 }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <filter id="glow-gold">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="node-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.9" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Static edges */}
        {EDGES.map(([a, b], i) => {
          const na = getNode(a), nb = getNode(b);
          return (
            <line
              key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={`${GOLD}25`} strokeWidth={0.8}
            />
          );
        })}

        {/* Animated pulse dots along edges */}
        <AnimatedPulses pulse={pulse} />

        {/* Nodes */}
        {ENGINE_NODES.map(node => (
          <g key={node.id} filter="url(#glow-gold)">
            <circle cx={node.x} cy={node.y} r={5} fill="url(#node-grad)" />
            <circle cx={node.x} cy={node.y} r={3} fill={GOLD} opacity={0.85} />
            <text
              x={node.x} y={node.y + 16}
              textAnchor="middle"
              fill={`${CREAM}60`}
              fontSize={7.5}
              fontFamily="'Space Mono', monospace"
              letterSpacing="0.05em"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
});

function AnimatedPulses({ pulse }: { pulse: { edge: number; t: number } }) {
  const [dots, setDots] = useState<{ id: number; edge: number; progress: number }[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const id = ++counterRef.current;
    setDots(prev => [...prev.slice(-6), { id, edge: pulse.edge, progress: 0 }]);

    let raf: number;
    const start = performance.now();
    const duration = 1100;

    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      setDots(prev => prev.map(d => d.id === id ? { ...d, progress: t } : d));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDots(prev => prev.filter(d => d.id !== id));
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulse]);

  return (
    <>
      {dots.map(dot => {
        const [a, b] = EDGES[dot.edge] ?? EDGES[0];
        const na = getNode(a), nb = getNode(b);
        const t = dot.progress;
        const x = na.x + (nb.x - na.x) * t;
        const y = na.y + (nb.y - na.y) * t;
        return (
          <circle
            key={dot.id}
            cx={x} cy={y} r={3.5}
            fill={GOLD}
            opacity={Math.sin(t * Math.PI) * 0.9}
          />
        );
      })}
    </>
  );
}

// ── Metric bar ─────────────────────────────────────────────────────────────────

function MetricBar({ label, value, max = 100, color = GOLD }: {
  label: string; value: number; max?: number; color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.12em", color: `${CREAM}70`, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
          {pct}
        </span>
      </div>
      <div style={{ height: 3, background: `${CREAM}10`, borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${color}60, ${color})`, borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

// ── Status chip ────────────────────────────────────────────────────────────────

function Chip({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <div style={{
      display:      "inline-flex",
      alignItems:   "center",
      gap:          5,
      padding:      "3px 9px",
      borderRadius: 20,
      border:       `1px solid ${active ? GOLD : CREAM}25`,
      background:   active ? `${GOLD}12` : `${CREAM}06`,
      marginRight:  5,
      marginBottom: 5,
    }}>
      <motion.div
        animate={{ opacity: active ? [0.5, 1, 0.5] : 0.3 }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ width: 4, height: 4, borderRadius: "50%", background: active ? GOLD : `${CREAM}50` }}
      />
      <span style={{ fontSize: 8, letterSpacing: "0.1em", color: active ? `${GOLD}CC` : `${CREAM}50`, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
        {label}
      </span>
    </div>
  );
}

// ── Panel wrapper ──────────────────────────────────────────────────────────────

function Panel({ title, children, style }: {
  title: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background:   PANEL_BG,
      border:       `1px solid ${BORDER}`,
      borderRadius: 12,
      padding:      "14px 16px",
      backdropFilter: "blur(20px)",
      display:      "flex",
      flexDirection: "column",
      gap:          10,
      ...style,
    }}>
      <div style={{
        fontSize:      8,
        letterSpacing: "0.22em",
        color:         `${GOLD}90`,
        textTransform: "uppercase",
        fontFamily:    "'Space Mono', monospace",
        borderBottom:  `1px solid ${BORDER}`,
        paddingBottom: 8,
        marginBottom:  2,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: 9, color: `${CREAM}55`, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: highlight ? GOLD : `${CREAM}90`, fontFamily: "'Space Mono', monospace", fontWeight: highlight ? 700 : 400 }}>
        {value}
      </span>
    </div>
  );
}

// ── Handoff Trigger ────────────────────────────────────────────────────────────
// Long-press zone rendered in guest mode — bottom-right corner affordance.

export function HandoffTrigger() {
  const { triggerHandoff, ripplePhase } = useHandoff();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  function startPress(x: number, y: number) {
    if (ripplePhase !== "idle") return;
    setPressing(true);
    setProgress(0);
    startRef.current = performance.now();

    function tick() {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / 1400, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPressing(false);
        setProgress(0);
        triggerHandoff(x, y);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelPress() {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
    setProgress(0);
  }

  return (
    <div
      onMouseDown={e => startPress(e.clientX, e.clientY)}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={e => {
        const t = e.touches[0];
        startPress(t.clientX, t.clientY);
      }}
      onTouchEnd={cancelPress}
      style={{
        position:      "fixed",
        bottom:        20,
        right:         20,
        width:         44,
        height:        44,
        zIndex:        900,
        cursor:        "pointer",
        userSelect:    "none",
        touchAction:   "none",
      }}
    >
      {/* Outer ring with progress */}
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ position: "absolute", inset: 0 }}>
        <circle cx={22} cy={22} r={18} fill="none" stroke={`${GOLD}20`} strokeWidth={1.5} />
        {pressing && (
          <circle
            cx={22} cy={22} r={18}
            fill="none"
            stroke={GOLD}
            strokeWidth={1.5}
            strokeDasharray={`${2 * Math.PI * 18}`}
            strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress)}`}
            transform="rotate(-90 22 22)"
            style={{ transition: "none" }}
          />
        )}
      </svg>
      {/* Center glyph */}
      <motion.div
        animate={{ opacity: pressing ? 1 : [0.25, 0.45, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:      "absolute",
          inset:         0,
          display:       "flex",
          alignItems:    "center",
          justifyContent: "center",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          <circle cx={7} cy={7} r={2.5} fill={GOLD} opacity={0.8} />
          <circle cx={7} cy={7} r={5.5} stroke={`${GOLD}60`} strokeWidth={0.8} fill="none" />
          <line x1={7} y1={0} x2={7} y2={3} stroke={`${GOLD}50`} strokeWidth={0.8} />
          <line x1={7} y1={11} x2={7} y2={14} stroke={`${GOLD}50`} strokeWidth={0.8} />
          <line x1={0} y1={7} x2={3} y2={7} stroke={`${GOLD}50`} strokeWidth={0.8} />
          <line x1={11} y1={7} x2={14} y2={7} stroke={`${GOLD}50`} strokeWidth={0.8} />
        </svg>
      </motion.div>
    </div>
  );
}

// ── Ripple layer ───────────────────────────────────────────────────────────────
// clip-path: circle() expands from touch origin → reveals overlay

function RippleLayer({ children }: { children: React.ReactNode }) {
  const { ripplePhase, rippleOrigin, isStaffMode } = useHandoff();

  const visible = ripplePhase !== "idle";

  // Compute a clip-path radius that covers the whole screen from origin
  const maxR = Math.ceil(
    Math.sqrt(
      Math.pow(Math.max(rippleOrigin.x, window.innerWidth  - rippleOrigin.x), 2) +
      Math.pow(Math.max(rippleOrigin.y, window.innerHeight - rippleOrigin.y), 2),
    ) * 100 / Math.min(window.innerWidth, window.innerHeight)
  );

  const clipOrigin = `${rippleOrigin.x}px ${rippleOrigin.y}px`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="eeis-shell"
          initial={{ clipPath: `circle(0% at ${clipOrigin})` }}
          animate={{
            clipPath: ripplePhase === "collapsing"
              ? `circle(0% at ${clipOrigin})`
              : `circle(${maxR}% at ${clipOrigin})`,
          }}
          exit={{ clipPath: `circle(0% at ${clipOrigin})` }}
          transition={{
            clipPath: {
              duration: ripplePhase === "collapsing" ? 0.55 : 0.65,
              ease:     ripplePhase === "collapsing"
                ? [0.76, 0, 0.24, 1]
                : [0.22, 1, 0.36, 1],
            },
          }}
          style={{
            position:  "fixed",
            inset:     0,
            zIndex:    950,
            willChange: "clip-path",
          }}
        >
          {/* Phase-shift distortion — liquid glass shimmer on expand */}
          {ripplePhase === "expanding" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 0.65, ease: "easeInOut" }}
              style={{
                position:   "absolute",
                inset:      0,
                background: `radial-gradient(circle at ${rippleOrigin.x}px ${rippleOrigin.y}px, ${GOLD}30 0%, transparent 60%)`,
                zIndex:     1,
                pointerEvents: "none",
              }}
            />
          )}
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main EEIS Overlay ──────────────────────────────────────────────────────────

export default function EeisOverlay() {
  const { isStaffMode, ripplePhase, releaseHandoff } = useHandoff();
  const { profile } = useOrchestrator();
  const { snapshot, events, lastTick } = useAxiomIntelligence();
  const { guestProfile, mentor } = useGuestProfile();
  const { staff, devices } = useCommandCenter();
  const { sessionTags, swipeHistory } = useCraftExperience();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const activeStaff    = staff.filter(s => s.status === "active").length;
  const onlineDevices  = snapshot?.onlineDevices ?? devices.filter(d => d.status === "online").length;

  const journeyStage = profile
    ? profile.sessionDepth === 0 ? "Discovery"
    : profile.sessionDepth < 4  ? "Exploration"
    : profile.sessionDepth < 8  ? "Immersion"
    : "Mastery"
    : "Awaiting Guest";

  const recentEvents = events.slice(0, 4);
  const lastTickFormatted = lastTick
    ? new Date(lastTick).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  const currentRevenue = snapshot
    ? snapshot.hourlyRevenue[snapshot.hourOfDay] ?? 0
    : 0;

  return (
    <>
      {/* Guest-mode ambient breath + handoff trigger */}
      <EnvironmentalBreathWrapper />
      <HandoffTrigger />

      {/* EEIS Operational Overlay */}
      <RippleLayer>
        <div style={{
          position:        "absolute",
          inset:           0,
          background:      `radial-gradient(ellipse at 20% 0%, ${GRAPHITE}F5 0%, ${OBSIDIAN}F8 60%)`,
          display:         "flex",
          flexDirection:   "column",
          fontFamily:      "'Space Mono', monospace",
          overflow:        "hidden",
        }}>
          {/* ── Header ── */}
          <div style={{
            background:     GRAPHITE,
            borderBottom:   `1px solid ${GOLD}30`,
            padding:        "0 20px",
            height:         52,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexShrink:     0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
              />
              <span style={{ fontSize: 10, letterSpacing: "0.28em", color: `${GOLD}CC`, textTransform: "uppercase" }}>
                AXIOM OS · OPERATIONAL MODE
              </span>
              <span style={{ fontSize: 8, color: `${CREAM}30`, letterSpacing: "0.12em" }}>
                EEIS v2 · XEI ACTIVE
              </span>
            </div>

            {/* Telemetry bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {[
                { label: "STAFF",   val: activeStaff },
                { label: "DEVICES", val: onlineDevices },
                { label: "DEPTH",   val: profile?.sessionDepth ?? 0 },
                { label: "CONF",    val: `${profile?.confidence ?? 0}%` },
              ].map(item => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.1em" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{item.val}</div>
                </div>
              ))}
              <span style={{ fontSize: 8, color: `${CREAM}25`, letterSpacing: "0.1em" }}>{lastTickFormatted}</span>

              {/* Exit */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={releaseHandoff}
                style={{
                  background:   "transparent",
                  border:       `1px solid ${GOLD}40`,
                  borderRadius: 6,
                  padding:      "5px 14px",
                  color:        `${GOLD}CC`,
                  fontSize:     9,
                  letterSpacing: "0.18em",
                  cursor:       "pointer",
                  textTransform: "uppercase",
                }}
              >
                RELEASE ▸
              </motion.button>
            </div>
          </div>

          {/* ── Body grid ── */}
          <div style={{
            flex:    1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.2fr",
            gridTemplateRows:    "1fr 1fr",
            gap:     10,
            padding: "12px 14px",
            minHeight: 0,
            overflow: "hidden",
          }}>

            {/* ① GUEST JOURNEY STATE */}
            <Panel title="◈  GUEST JOURNEY STATE">
              <DataRow label="Identity"
                value={guestProfile ? `${guestProfile.firstName} ${guestProfile.lastInitial}.` : "Anonymous"} highlight />
              <DataRow label="Journey Stage"   value={journeyStage}              highlight />
              <DataRow label="Mentor"          value={mentor?.name ?? "Unassigned"} />
              <DataRow label="Session Depth"   value={profile?.sessionDepth ?? 0} />
              <DataRow label="Mastery Tier"    value={guestProfile?.masteryTier ?? "—"} />
              <DataRow label="Mastery Score"   value={guestProfile?.totalMastery ?? 0} />
              <div style={{ marginTop: 6 }}>
                <MetricBar label="Engagement"       value={profile?.atmosphereIntensity ?? 0} />
                <MetricBar label="Unlock Progress"  value={profile?.confidence ?? 0} />
                <MetricBar label="Premium Intent"   value={profile?.premiumIntent ?? 0} color="#C4A85A" />
              </div>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap" }}>
                <Chip label={profile?.mood ?? "idle"} active={!!profile} />
                <Chip label={profile?.pacing ?? "balanced"} active={!!profile} />
              </div>
              <AdaptiveNudge
                isNew={swipeHistory.length === 0 && !guestProfile?.totalMastery}
                sessionTags={sessionTags}
                swipeCount={swipeHistory.length}
              />
            </Panel>

            {/* ② XEI INTELLIGENCE LAYER */}
            <Panel title="⚡  XEI INTELLIGENCE LAYER">
              <DataRow label="Behavior Pulse"   value={profile ? "ACTIVE" : "STANDBY"}   highlight={!!profile} />
              <DataRow label="Sensory Pacing"   value={profile?.pacing ?? "—"} />
              <DataRow label="Guest Energy"     value={profile ? `${Math.round((profile.atmosphereIntensity + profile.socialEnergy) / 2)}%` : "—"} />
              <DataRow label="Social Energy"    value={`${profile?.socialEnergy ?? 0}%`} />
              <DataRow label="Rec. Pressure"    value={`${profile?.recommendationPressure ?? 0}%`} />
              <DataRow label="Atm. Adaptation"  value={snapshot ? "SYNCED" : "PENDING"} />
              <div style={{ marginTop: 6 }}>
                <MetricBar label="Upsell Timing"     value={profile?.recommendationPressure ?? 0} color="#A89B6E" />
                <MetricBar label="Influence Score"   value={profile?.premiumIntent ?? 0} color={GOLD} />
                <MetricBar label="Atmosphere Sync"   value={profile?.atmosphereIntensity ?? 0} color="#B8975A" />
              </div>
              {/* Recent intelligence events */}
              <div style={{ marginTop: 4 }}>
                {recentEvents.length === 0 ? (
                  <div style={{ fontSize: 8, color: `${CREAM}30`, letterSpacing: "0.1em" }}>NO ACTIVE EVENTS</div>
                ) : recentEvents.map(ev => (
                  <div key={ev.id} style={{
                    fontSize: 8, color: `${GOLD}90`,
                    letterSpacing: "0.06em",
                    marginBottom: 3,
                    paddingLeft: 6,
                    borderLeft: `2px solid ${GOLD}30`,
                  }}>
                    {ev.title} — {ev.insight}
                  </div>
                ))}
              </div>
              <PairingLivePanel tags={sessionTags} />
            </Panel>

            {/* ③ VENUE HEARTBEAT + SIGNAL VISUALIZATION — spans 2 rows */}
            <Panel title="◉  VENUE HEARTBEAT · SIGNAL CORE" style={{ gridRow: "1 / 3", display: "flex", flexDirection: "column" }}>
              {/* Breathing metallic orb — venue energy */}
              <VenueHeartbeatOrb energy={profile?.atmosphereIntensity ?? 60} />

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
                {[
                  { label: "Telemetry", active: true },
                  { label: "AI Routing", active: !!profile },
                  { label: "Revenue Attr", active: true },
                  { label: "Orchestration", active: !!profile },
                ].map(c => <Chip key={c.label} label={c.label} active={c.active} />)}
              </div>

              {/* Animated node network */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <SignalViz />
              </div>

              {/* Live heartbeat bar */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 8, color: `${CREAM}35`, letterSpacing: "0.12em", marginBottom: 6 }}>
                  OPERATIONAL HEARTBEAT
                </div>
                <HeartbeatBar tick={tick} />
              </div>

              {/* Engine status chips */}
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
                {["PredictiveIntent","TelemetryEngine","VenueDNA","RecommendationEngine","SessionPersistence","EnvironmentalMode"].map(e => (
                  <Chip key={e} label={e} active />
                ))}
              </div>
            </Panel>

            {/* ④ VENUE INTELLIGENCE */}
            <Panel title="◎  VENUE INTELLIGENCE" style={{ gridColumn: "1 / 3" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div>
                  <DataRow label="Venue Sync"        value={snapshot ? "SYNCHRONIZED" : "INITIALIZING"} highlight={!!snapshot} />
                  <DataRow label="Active Guests"     value={snapshot?.activeGuests ?? 0} />
                  <DataRow label="Orders Today"      value={snapshot?.totalOrdersToday ?? 0} />
                  <DataRow label="Avg Order Value"   value={snapshot ? `$${snapshot.avgOrderValue.toFixed(2)}` : "—"} />
                  <DataRow label="Low Stock Items"   value={snapshot?.lowStockCount ?? 0} />
                </div>
                <div>
                  <DataRow label="Current Hr Revenue" value={snapshot ? `$${currentRevenue.toFixed(0)}` : "—"} highlight />
                  <DataRow label="Active Campaigns"  value={snapshot?.activeCampaigns ?? 0} />
                  <DataRow label="Reward Conv. Rate" value={snapshot ? `${Math.round(snapshot.rewardConvRate * 100)}%` : "—"} />
                  <DataRow label="Online Devices"    value={onlineDevices} />
                  <DataRow label="Intelligence Tick" value={lastTickFormatted} />
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
                <Chip label="Venue DNA Active"      active />
                <Chip label="Telemetry Flow"        active />
                <Chip label="AI Orchestration"      active={!!profile} />
                <Chip label="Revenue Attribution"   active />
                <Chip label="Session Persistence"   active />
                <Chip label="Handoff State"         active />
              </div>
            </Panel>
          </div>

          {/* ── Telemetry flow strip ── */}
          <TelemetryStrip tick={tick} />
        </div>
      </RippleLayer>
    </>
  );
}

// ── Heartbeat Bar ──────────────────────────────────────────────────────────────

function HeartbeatBar({ tick }: { tick: number }) {
  const BARS = 32;
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 24 }}>
      {Array.from({ length: BARS }, (_, i) => {
        const seed = (i * 7 + tick * 3) % 17;
        const h = 4 + Math.abs(Math.sin(seed + i * 0.4)) * 18;
        const isActive = i === (tick * 2) % BARS || i === ((tick * 2) + 1) % BARS;
        return (
          <motion.div
            key={i}
            animate={{ height: h, opacity: isActive ? 1 : 0.28 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{
              flex:         1,
              background:   isActive ? GOLD : `${GOLD}60`,
              borderRadius: 1,
              minWidth:     2,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Telemetry flow strip ───────────────────────────────────────────────────────

const STREAM_LABELS = [
  "TELEMETRY_WRITE", "REVENUE_ATTR", "SESSION_PERSIST", "PREDICTIVE_INTENT",
  "VENUE_DNA_SYNC", "ENV_MODE_ADAPT", "RECOMMENDATION_SCORE", "HANDOFF_STATE",
  "ORCHESTRATION_TICK", "AI_CACHE_HIT", "SWIPE_SIGNAL", "ENGAGEMENT_LOOP",
];

function TelemetryStrip({ tick }: { tick: number }) {
  return (
    <div style={{
      height:       28,
      background:   `${OBSIDIAN}CC`,
      borderTop:    `1px solid ${GOLD}15`,
      overflow:     "hidden",
      position:     "relative",
      flexShrink:   0,
    }}>
      <motion.div
        animate={{ x: [0, -1600] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ display: "flex", gap: 32, alignItems: "center", height: "100%", whiteSpace: "nowrap", paddingLeft: 20, width: "max-content" }}
      >
        {[...STREAM_LABELS, ...STREAM_LABELS].map((label, i) => (
          <span key={i} style={{
            fontSize:      8,
            letterSpacing: "0.14em",
            color:         i % 4 === 0 ? `${GOLD}80` : `${CREAM}25`,
            fontFamily:    "'Space Mono', monospace",
          }}>
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Wrapper to import EnvironmentalBreath without circular dep ─────────────────

import EnvironmentalBreath from "@/components/EnvironmentalBreath";

function EnvironmentalBreathWrapper() {
  const { isStaffMode } = useHandoff();
  if (isStaffMode) return null;
  return <EnvironmentalBreath />;
}
