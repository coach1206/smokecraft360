/**
 * Axiom360 — AXIOM 360 Experience OS / Hardware-First Landing.
 * Route: /
 *
 * Two operating layers sharing one screen:
 *
 *   PATRON MODE  — Immersive craft selection with Lounge Pulse ambient.
 *                  4 large premium cards (SmokeCraft, PourCraft, BrewCraft,
 *                  VapeCraft) on a dark-leather, brushed-graphite canvas.
 *
 *   STAFF MODE   — Chrome Staff Dashboard slides in from the right.
 *                  Patron UI blurs and recedes. Triggered by a 3-second
 *                  long-press on the venue logo (The Secret Handoff).
 *
 * Design system: Hardware-First
 *   - BG: #0d0b09 (warm ultra-charcoal)
 *   - Leather grain: CSS repeating-gradient overlay
 *   - Brushed graphite cards: horizontal micro-line texture
 *   - Recessed buttons: deep inner shadow pressed into metal plate
 *   - Amber glow: #C9A84C / #D4AF37
 *   - Typography: Cormorant Garamond (display) + Inter (UI)
 *
 * State: useAxiom360 (Zustand, persisted to localStorage)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation }                              from "wouter";
import { motion, AnimatePresence, useAnimation }    from "framer-motion";
import {
  Settings, CreditCard, BookOpen, BarChart3,
  DollarSign, Package, Shield, ChevronLeft,
  Zap, Clock, Activity,
} from "lucide-react";
import { useAxiom360 }  from "@/store/axiom360Store";
import type { CraftType } from "@/store/axiom360Store";

// ── Design tokens ─────────────────────────────────────────────────────────────

const H = {
  bg:         "#0d0b09",
  surface:    "#181411",
  card:       "#161210",
  cardHover:  "#1e1a15",
  border:     "rgba(255,255,255,0.07)",
  borderGold: "rgba(201,168,76,0.35)",
  amber:      "#C9A84C",
  amberBright:"#D4AF37",
  amberDim:   "rgba(201,168,76,0.5)",
  amberGlow:  "rgba(201,168,76,0.12)",
  text:       "#F0E8D4",
  textMuted:  "rgba(240,232,212,0.45)",
  textDim:    "rgba(240,232,212,0.25)",
  chrome:     "#1c1916",
  chromeBright:"#242018",
};

// Brushed-graphite stripe texture — simulates horizontal metal lines
const BRUSHED = [
  "repeating-linear-gradient(0deg,",
  "transparent, transparent 3px,",
  "rgba(255,255,255,0.012) 3px,",
  "rgba(255,255,255,0.012) 4px)",
].join(" ");

// Leather grain diagonal overlay
const LEATHER = [
  "repeating-linear-gradient(45deg,",
  "rgba(0,0,0,0.22), rgba(0,0,0,0.22) 1px,",
  "transparent 1px, transparent 6px),",
  "repeating-linear-gradient(-45deg,",
  "rgba(0,0,0,0.14), rgba(0,0,0,0.14) 1px,",
  "transparent 1px, transparent 6px)",
].join(" ");

// Recessed button inner shadow — looks pressed into a metal plate
const RECESSED =
  "inset 0 3px 8px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.03)";

// ── Craft definitions ─────────────────────────────────────────────────────────

const CRAFTS: {
  id:      CraftType & string;
  label:   string;
  tagline: string;
  sub:     string;
  color:   string;
  route:   string;
  glyph:   string;
}[] = [
  {
    id:      "smoke",
    label:   "SmokeCraft",
    tagline: "Premium Tobacco",
    sub:     "Curated reserve experience",
    color:   "#C9A84C",
    route:   "/experience/smoke",
    glyph:   "◈",
  },
  {
    id:      "pour",
    label:   "PourCraft",
    tagline: "Curated Spirits",
    sub:     "Single-malt discovery engine",
    color:   "#9B7FD4",
    route:   "/experience/pour",
    glyph:   "◇",
  },
  {
    id:      "brew",
    label:   "BrewCraft",
    tagline: "Artisan Beer",
    sub:     "Small-batch craft selections",
    color:   "#3BBFA3",
    route:   "/experience/brew",
    glyph:   "◎",
  },
  {
    id:      "vape",
    label:   "VapeCraft",
    tagline: "Next-Gen Vapor",
    sub:     "Precision vapor experiences",
    color:   "#5BC4F5",
    route:   "/experience/vape",
    glyph:   "◉",
  },
];

// ── Ambient particles ─────────────────────────────────────────────────────────

const PTCLS = Array.from({ length: 18 }, (_, i) => ({
  id:      i,
  x:       Math.random() * 100,
  y:       Math.random() * 100,
  r:       0.8 + Math.random() * 2,
  dur:     9 + Math.random() * 12,
  delay:   Math.random() * 8,
  opacity: 0.05 + Math.random() * 0.12,
}));

function AmbientParticles() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {PTCLS.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: H.amber,
            opacity: p.opacity,
          }}
          animate={{
            y:       [0, -22, 6, -14, 0],
            x:       [0, 8, -6, 11, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity * 0.4, p.opacity * 1.6, p.opacity],
            scale:   [1, 1.3, 0.7, 1.2, 1],
          }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Lounge Pulse — breathing amber cloud ──────────────────────────────────────

function LoungePulse({ activeCraft }: { activeCraft: string | null }) {
  const ctrl  = useAnimation();
  const burst = useAnimation();

  useEffect(() => {
    void ctrl.start({
      scale:   [1, 1.05, 1],
      opacity: [0.07, 0.16, 0.07],
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
    });
  }, [ctrl]);

  useEffect(() => {
    if (!activeCraft) return;
    void burst.start({
      scale:   [1, 1.18, 1.02],
      opacity: [0.38, 0.52, 0.12],
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    });
  }, [activeCraft, burst]);

  const craft = CRAFTS.find((c) => c.id === activeCraft);
  const color = craft?.color ?? H.amber;

  return (
    <div style={{
      position: "absolute",
      top: "38%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: "70vw", maxWidth: 560,
      height: "42vh",
      pointerEvents: "none",
      zIndex: 1,
    }}>
      {/* Base breathing cloud */}
      <motion.div
        animate={ctrl}
        style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${H.amberGlow} 0%, transparent 70%)`,
          filter: "blur(32px)",
        }}
      />
      {/* Burst layer — reacts to craft taps */}
      <motion.div
        animate={burst}
        style={{
          position: "absolute", inset: "10%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${color}22 0%, transparent 70%)`,
          filter: "blur(24px)",
        }}
      />
    </div>
  );
}

// ── Logo long-press handoff trigger ───────────────────────────────────────────

const HOLD_MS   = 3000;
const TICK_MS   = 40;
const RING_R    = 24;
const RING_CIRC = 2 * Math.PI * RING_R;

function LogoLongPress({ onHandoff }: { onHandoff: () => void }) {
  const [progress, setProgress] = useState(0);
  const [pressing, setPressing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed     = useRef(0);

  const startPress = useCallback(() => {
    elapsed.current = 0;
    setPressing(true);
    intervalRef.current = setInterval(() => {
      elapsed.current += TICK_MS;
      const p = Math.min(elapsed.current / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        setPressing(false);
        setProgress(0);
        elapsed.current = 0;
        onHandoff();
      }
    }, TICK_MS);
  }, [onHandoff]);

  const cancelPress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPressing(false);
    setProgress(0);
    elapsed.current = 0;
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <motion.div
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      style={{
        position: "relative",
        width: 56, height: 56,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", userSelect: "none", touchAction: "none", flexShrink: 0,
      }}
      whileTap={{ scale: 0.93 }}
    >
      {/* Progress ring SVG */}
      <svg
        width={56} height={56}
        style={{ position: "absolute", inset: 0 }}
        viewBox="0 0 56 56"
      >
        {/* Track */}
        <circle cx={28} cy={28} r={RING_R} fill="none"
          stroke={pressing ? "rgba(201,168,76,0.2)" : "rgba(201,168,76,0.08)"}
          strokeWidth={2} />
        {/* Fill */}
        {pressing && (
          <motion.circle
            cx={28} cy={28} r={RING_R}
            fill="none"
            stroke={H.amber}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px" }}
          />
        )}
      </svg>

      {/* Logo mark */}
      <div style={{
        width: 40, height: 40,
        background: `linear-gradient(135deg, ${H.chromeBright}, ${H.surface})`,
        border: `1px solid ${pressing ? H.borderGold : H.border}`,
        borderRadius: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: RECESSED,
        transition: "border-color 0.2s",
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 8, fontWeight: 800,
          color: pressing ? H.amber : H.textDim,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          lineHeight: 1.1,
          textAlign: "center",
          transition: "color 0.2s",
        }}>
          AX<br />360
        </div>
      </div>

      {/* Hold hint */}
      <AnimatePresence>
        {pressing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: "50%",
              transform: "translateX(-50%)",
              fontSize: 8, color: H.amber, letterSpacing: "0.18em",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            Hold…
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Individual craft card ─────────────────────────────────────────────────────

function CraftCard({ craft, onTap, idx }: {
  craft: typeof CRAFTS[0];
  onTap: () => void;
  idx:   number;
}) {
  const [hovered, setHovered] = useState(false);
  const [tapped,  setTapped]  = useState(false);

  function handleTap() {
    setTapped(true);
    setTimeout(() => setTapped(false), 450);
    onTap();
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + idx * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onTap={handleTap}
      style={{
        position:    "relative",
        overflow:    "hidden",
        background:  `${H.card}, ${BRUSHED}`,
        border:      `1px solid ${hovered ? `${craft.color}50` : H.border}`,
        borderRadius: 20,
        cursor:      "pointer",
        padding:     0,
        textAlign:   "left",
        boxShadow:   tapped
          ? `inset 0 4px 16px rgba(0,0,0,0.9), 0 0 0 1px ${craft.color}30`
          : `0 6px 32px rgba(0,0,0,0.55), 0 0 0 1px ${craft.color}12`,
        transition:  "box-shadow 0.2s, border-color 0.25s",
        outline:     "none",
        minHeight:   0,
      }}
    >
      {/* Ambient color bleed from bottom */}
      <motion.div
        animate={{
          opacity: hovered ? 0.22 : 0.10,
        }}
        transition={{ duration: 0.4 }}
        style={{
          position:     "absolute",
          bottom: -8, left: "10%", right: "10%", height: 40,
          borderRadius: "50%",
          background:   craft.color,
          filter:       "blur(22px)",
          pointerEvents: "none",
          zIndex:       0,
        }}
      />

      {/* Breathing glow ring */}
      <motion.div
        animate={{ opacity: [0.08, 0.22, 0.08] }}
        transition={{ duration: 3.5 + idx * 0.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute", inset: 0,
          borderRadius: 20,
          border:       `1px solid ${craft.color}`,
          pointerEvents: "none",
          zIndex:       1,
        }}
      />

      {/* Tap flash */}
      <AnimatePresence>
        {tapped && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "absolute", inset: 0,
              background: craft.color,
              borderRadius: 20,
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        )}
      </AnimatePresence>

      {/* Card content */}
      <div style={{
        position: "relative", zIndex: 3,
        padding: "clamp(16px, 2.5vw, 28px)",
        height: "100%",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Glyph */}
        <motion.div
          animate={{ opacity: [0.18, 0.38, 0.18] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.5 }}
          style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            color: craft.color,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {craft.glyph}
        </motion.div>

        {/* Labels */}
        <div>
          <div style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(18px, 2.6vw, 26px)",
            fontWeight:    700,
            color:         H.text,
            letterSpacing: "0.03em",
            lineHeight:    1.1,
            marginBottom:  4,
          }}>
            {craft.label}
          </div>
          <div style={{
            fontSize:      "clamp(9px, 1.1vw, 11px)",
            color:         craft.color,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight:    700,
            marginBottom:  4,
          }}>
            {craft.tagline}
          </div>
          <div style={{ fontSize: "clamp(9px, 1vw, 10px)", color: H.textDim, letterSpacing: "0.06em" }}>
            {craft.sub}
          </div>
        </div>

        {/* Arrow */}
        <motion.div
          animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 10, color: craft.color,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 10,
          }}
        >
          Enter ›
        </motion.div>
      </div>
    </motion.button>
  );
}

// ── Patron mode view ──────────────────────────────────────────────────────────

function PatronView({
  onHandoff,
  onCraftSelect,
}: {
  onHandoff:     () => void;
  onCraftSelect: (craft: string) => void;
}) {
  const [, navigate]   = useLocation();
  const [activeCraft, setActiveCraft] = useState<string | null>(null);
  const [portal, setPortal] = useState<{ route: string; color: string } | null>(null);

  function handleCraftTap(craft: typeof CRAFTS[0]) {
    setActiveCraft(craft.id);
    onCraftSelect(craft.id);
    setTimeout(() => setPortal({ route: craft.route, color: craft.color }), 300);
  }

  return (
    <div style={{
      position:      "absolute", inset: 0,
      display:       "flex", flexDirection: "column",
      background:    `${H.bg}, ${LEATHER}`,
      backgroundBlendMode: "multiply",
      color:         H.text,
      fontFamily:    "'Inter', 'SF Pro Display', system-ui, sans-serif",
      overflow:      "hidden",
    }}>
      {/* Leather grain overlay */}
      <div style={{
        position:       "absolute", inset: 0,
        background:     LEATHER,
        opacity:        0.45,
        pointerEvents:  "none",
        zIndex:         0,
      }} />

      <AmbientParticles />

      {/* Lounge Pulse */}
      <LoungePulse activeCraft={activeCraft} />

      {/* ── Header ── */}
      <header style={{
        position:       "relative", zIndex: 10,
        display:        "flex", alignItems: "center",
        padding:        "14px 20px",
        gap:            14,
        borderBottom:   `1px solid ${H.border}`,
        background:     "rgba(13,11,9,0.88)",
        backdropFilter: "blur(18px)",
        flexShrink:     0,
      }}>
        {/* Logo long-press */}
        <LogoLongPress onHandoff={onHandoff} />

        {/* Brand name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontSize:      "clamp(18px, 2.4vw, 24px)",
              fontWeight:    800,
              color:         H.text,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              lineHeight:    1,
            }}
          >
            Axiom 360
          </motion.div>
          <div style={{
            fontSize: 9, color: H.amberDim,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginTop: 3,
          }}>
            Experience OS
          </div>
        </div>

        {/* Live status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399" }}
          />
          <span style={{ fontSize: 9, color: H.textDim, letterSpacing: "0.2em" }}>LIVE</span>

          {/* Clock */}
          <LiveClock />
        </div>
      </header>

      {/* ── OS status strip ── */}
      <div style={{
        position:       "relative", zIndex: 10,
        display:        "flex", alignItems: "center", gap: 24,
        padding:        "8px 22px",
        borderBottom:   `1px solid ${H.border}`,
        background:     "rgba(0,0,0,0.3)",
        overflowX:      "auto",
        scrollbarWidth: "none",
        flexShrink:     0,
      }}>
        {[
          { label: "AI Engine",     state: "ACTIVE",  color: "#4ade80" },
          { label: "Taste Engine",  state: "READY",   color: H.amber   },
          { label: "Revenue Brain", state: "ONLINE",  color: "#a78bfa" },
          { label: "Inventory",     state: "SYNC",    color: "#60a5fa" },
        ].map((n) => (
          <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <motion.div
              style={{ width: 4, height: 4, borderRadius: "50%", background: n.color }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span style={{ fontSize: 8, color: H.textDim, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              {n.label}
            </span>
            <span style={{ fontSize: 8, color: n.color, letterSpacing: "0.1em", fontWeight: 700 }}>
              {n.state}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <Activity size={10} color={H.amberDim} />
        </div>
      </div>

      {/* ── Hero label ── */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "18px 22px 10px",
        flexShrink: 0,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55 }}
          style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(16px, 2.4vw, 22px)",
            fontWeight:    300,
            color:         H.text,
            letterSpacing: "0.02em",
          }}
        >
          Select your{" "}
          <span style={{ color: H.amber, fontWeight: 600 }}>experience.</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ fontSize: 10, color: H.textMuted, marginTop: 5, letterSpacing: "0.06em" }}
        >
          The AI engine curates in real time — tap to begin.
        </motion.div>
      </div>

      {/* ── 4 Craft Cards ── */}
      <div style={{
        flex:    1,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows:    "repeat(2, 1fr)",
        gap:     12,
        padding: "0 18px 16px",
        minHeight: 0,
        position: "relative", zIndex: 10,
      }}>
        {CRAFTS.map((craft, i) => (
          <CraftCard
            key={craft.id}
            craft={craft}
            idx={i}
            onTap={() => handleCraftTap(craft)}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      <footer style={{
        position:       "relative", zIndex: 10,
        display:        "flex", alignItems: "center",
        padding:        "10px 22px",
        borderTop:      `1px solid ${H.border}`,
        background:     "rgba(13,11,9,0.92)",
        backdropFilter: "blur(12px)",
        flexShrink:     0,
        gap:            16,
      }}>
        {CRAFTS.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <motion.div
              style={{ width: 4, height: 4, borderRadius: "50%", background: c.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: CRAFTS.indexOf(c) * 0.5 }}
            />
            <span style={{ fontSize: 8, color: H.textDim, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              {c.id}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 8, color: H.textDim, letterSpacing: "0.14em" }}>
            HOLD LOGO 3s · STAFF ACCESS
          </div>
        </div>
      </footer>

      {/* ── Portal transition curtain ── */}
      <AnimatePresence>
        {portal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 1, 1] }}
            onAnimationComplete={() => navigate(portal.route)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: H.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.05, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                width: 220, height: 220, borderRadius: "50%",
                background: `radial-gradient(circle, ${portal.color}55 0%, transparent 70%)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Live clock ────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 10_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontSize: 10, color: H.textDim, letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums" }}>
      {time}
    </span>
  );
}

// ── System override flash ─────────────────────────────────────────────────────

function SystemOverrideFlash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.72, times: [0, 0.15, 0.75, 1], ease: "easeInOut" }}
      onAnimationComplete={onDone}
      style={{
        position:       "fixed", inset: 0, zIndex: 500,
        background:     `linear-gradient(135deg, #1c1814, ${H.bg})`,
        display:        "flex", flexDirection: "column",
        alignItems:     "center", justifyContent: "center",
        gap:            16,
      }}
    >
      {/* Chrome scan line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "60%", maxWidth: 300, height: 1,
          background: `linear-gradient(90deg, transparent, ${H.amber}, transparent)`,
          marginBottom: 12,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{
          fontSize:      9,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color:         H.amberDim,
        }}
      >
        System Override
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
        style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(28px, 5vw, 44px)",
          fontWeight:    700,
          color:         H.amber,
          letterSpacing: "0.1em",
        }}
      >
        Staff Access
      </motion.div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        style={{
          width: "60%", maxWidth: 300, height: 1,
          background: `linear-gradient(90deg, transparent, ${H.amber}, transparent)`,
          marginTop: 10,
        }}
      />
    </motion.div>
  );
}

// ── Staff dashboard panel ─────────────────────────────────────────────────────

const STAFF_NAV = [
  { label: "Operations",  icon: Settings,     route: "/operations"             },
  { label: "POS Mode",    icon: CreditCard,   route: "/pos"                    },
  { label: "Training",    icon: BookOpen,     route: "/training"               },
  { label: "Analytics",   icon: BarChart3,    route: "/analytics"              },
  { label: "Finance",     icon: DollarSign,   route: "/finance-reconciliation" },
  { label: "Inventory",   icon: Package,      route: "/inventory"              },
  { label: "Audit Log",   icon: Shield,       route: "/operations"             },
  { label: "Revenue",     icon: Zap,          route: "/revenue"                },
  { label: "Devices",     icon: Activity,     route: "/devices"                },
];

function StaffPanel({
  currentCraft,
  lastHandoffAt,
  onExit,
}: {
  currentCraft:  CraftType;
  lastHandoffAt: number | null;
  onExit:        () => void;
}) {
  const [, navigate] = useLocation();

  const craft = CRAFTS.find((c) => c.id === currentCraft);

  function handleNav(route: string) {
    navigate(route);
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
        position:   "fixed", inset: 0, zIndex: 100,
        background: `linear-gradient(160deg, ${H.chromeBright} 0%, ${H.bg} 100%), ${BRUSHED}`,
        color:      H.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        display:    "flex", flexDirection: "column",
        borderLeft: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      {/* Header */}
      <div style={{
        padding:      "28px 28px 22px",
        borderBottom: `1px solid ${H.border}`,
        background:   "rgba(0,0,0,0.25)",
        flexShrink:   0,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: "0.38em", color: H.textDim,
          textTransform: "uppercase", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Shield size={9} color={H.amberDim} />
          Staff Override Active
        </div>
        <div style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(26px, 4vw, 36px)",
          fontWeight:    700,
          color:         H.amber,
          letterSpacing: "0.05em",
          lineHeight:    1.1,
        }}>
          Staff Dashboard
        </div>

        {/* Context badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {craft && (
            <span style={{
              padding: "4px 12px",
              background: `${craft.color}18`,
              border: `1px solid ${craft.color}40`,
              borderRadius: 20,
              fontSize: 10, color: craft.color, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {craft.label} — Patron Was Here
            </span>
          )}
          {lastHandoffAt && (
            <span style={{
              padding: "4px 12px",
              background: H.amberGlow,
              border: `1px solid ${H.borderGold}`,
              borderRadius: 20,
              fontSize: 10, color: H.amberDim,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Clock size={9} />
              {new Date(lastHandoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Nav grid */}
      <div style={{
        flex:    1, minHeight: 0,
        padding: "22px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap:     10,
        overflowY: "auto",
        alignContent: "start",
      }}>
        {STAFF_NAV.map(({ label, icon: Icon, route }) => (
          <button
            key={label}
            onClick={() => handleNav(route)}
            style={{
              background:   `linear-gradient(160deg, ${H.chromeBright}, ${H.surface})`,
              border:       `1px solid ${H.border}`,
              borderRadius: 14,
              padding:      "16px 10px",
              cursor:       "pointer",
              color:        H.textMuted,
              boxShadow:    RECESSED,
              display:      "flex", flexDirection: "column",
              alignItems:   "center", gap: 8,
              transition:   "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = H.borderGold;
              (e.currentTarget as HTMLButtonElement).style.color = H.text;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = H.border;
              (e.currentTarget as HTMLButtonElement).style.color = H.textMuted;
            }}
          >
            <Icon size={16} color={H.amberDim} />
            <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Footer — return button */}
      <div style={{
        padding:   "18px 24px",
        borderTop: `1px solid ${H.border}`,
        flexShrink: 0,
        background: "rgba(0,0,0,0.2)",
        display:   "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={onExit}
          style={{
            display:       "flex", alignItems: "center", gap: 8,
            background:    `linear-gradient(135deg, ${H.chromeBright}, ${H.surface})`,
            border:        `1px solid ${H.borderGold}`,
            borderRadius:  10,
            padding:       "10px 18px",
            cursor:        "pointer",
            color:         H.amber,
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow:     RECESSED,
          }}
        >
          <ChevronLeft size={13} />
          Return to Patron
        </button>

        <div style={{ fontSize: 9, color: H.textDim, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Axiom 360 OS
        </div>
      </div>
    </motion.div>
  );
}

// ── Root orchestrator ─────────────────────────────────────────────────────────

export default function Axiom360() {
  const { activeMode, currentCraft, lastHandoffAt, setMode, setCraft } = useAxiom360();
  const [flashing, setFlashing] = useState(false);

  function triggerHandoff() {
    if (activeMode === "staff") {
      setMode("patron");
      return;
    }
    // Patron → Staff: show override flash, then switch
    setFlashing(true);
  }

  function onFlashDone() {
    setFlashing(false);
    setMode("staff");
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: H.bg }}>

      {/* ── Patron layer — always present, blurs when staff is active ── */}
      <motion.div
        animate={
          activeMode === "staff"
            ? { scale: 0.93, filter: "blur(7px)", opacity: 0.35 }
            : { scale: 1,    filter: "blur(0px)", opacity: 1    }
        }
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <PatronView
          onHandoff={triggerHandoff}
          onCraftSelect={(c) => setCraft(c as CraftType)}
        />
      </motion.div>

      {/* ── Staff panel — slides in from right ── */}
      <AnimatePresence>
        {activeMode === "staff" && !flashing && (
          <StaffPanel
            currentCraft={currentCraft}
            lastHandoffAt={lastHandoffAt}
            onExit={() => setMode("patron")}
          />
        )}
      </AnimatePresence>

      {/* ── System Override flash — shown during the transition ── */}
      <AnimatePresence>
        {flashing && <SystemOverrideFlash onDone={onFlashDone} />}
      </AnimatePresence>
    </div>
  );
}
