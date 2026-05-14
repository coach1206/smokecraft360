/**
 * CraftHub — NOVEE OS cinematic command portal.
 * Route: / and /craft-hub
 *
 * Visual target: luxury hospitality operating system entrance.
 * Dark atmospheric canvas with 4 cinematic craft portals, ambient
 * intelligence indicators, and breathing particle layer.
 *
 * All engine logic (DynamicCard weighted scene rotation, UserProfile,
 * PreferenceContext, LiveEngineController) is preserved exactly.
 * Only the visual shell is rebuilt.
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ExperienceFlowEngine } from "@/lib/experienceFlowEngine";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Sparkles, Cpu, Activity, RotateCcw, X } from "lucide-react";
import { AudioWaveToggle } from "@/contexts/AudioContext";
import { PreferenceProvider }   from "@/contexts/PreferenceContext";
import { UserProfileProvider }  from "@/contexts/UserProfileContext";
import MoodControls             from "@/components/DynamicCard/MoodControls";
import LiveEngineController     from "@/components/DynamicCard/LiveEngineController";
import { CRAFT_MODULES }        from "@/data/craftScenes";
import { useGuestProfile }         from "@/contexts/GuestProfileContext";
import { SovereignLogoutBadge }   from "@/components/SovereignLogoutBadge";
import TickerTape                 from "@/components/TickerTape";
import LogoAnchor                 from "@/components/LogoAnchor";
import EnvironmentPulseOverlay    from "@/components/EnvironmentPulseOverlay";
import { useKioskLock }           from "@/hooks/useKioskLock";
import TitanEngine                from "@/engines/titan_engine";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       "#080604",
  surface:  "rgba(255,255,255,0.04)",
  border:   "rgba(255,255,255,0.07)",
  gold:     "#D48B00",
  goldDim:  "rgba(212,139,0,0.55)",
  goldGlow: "rgba(212,139,0,0.14)",
  text:     "#F0E8D4",
  muted:    "rgba(245,235,215,0.38)",
  dim:      "rgba(245,235,215,0.22)",
};

// ── Time-gated cinematic video background ─────────────────────────────────────
function CinematicVideo() {
  const hour = new Date().getHours();
  const src  = hour >= 6 && hour < 17  ? "/videos/lounge-day.mp4"
             : hour >= 17 && hour < 22 ? "/videos/lounge-evening.mp4"
             :                           "/videos/lounge-night.mp4";
  return (
    <video
      key={src}
      autoPlay
      muted
      loop
      playsInline
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        objectFit:     "cover",
        zIndex:        0,
        opacity:       0.18,
        pointerEvents: "none",
      }}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

// ── Ambient particle layer ────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  1 + Math.random() * 2.5,
  dur: 8 + Math.random() * 14,
  delay: Math.random() * 10,
  opacity: 0.08 + Math.random() * 0.18,
}));

function AmbientParticles() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
    }}>
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width:  p.r * 2,
            height: p.r * 2,
            borderRadius: "50%",
            background: C.gold,
            opacity: p.opacity,
          }}
          animate={{
            y:       [0, -28, 8, -18, 0],
            x:       [0, 10, -8, 14, 0],
            opacity: [p.opacity, p.opacity * 2.2, p.opacity * 0.4, p.opacity * 1.6, p.opacity],
            scale:   [1, 1.4, 0.7, 1.2, 1],
          }}
          transition={{
            duration:   p.dur,
            delay:      p.delay,
            repeat:     Infinity,
            ease:       "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── AI intelligence status strip ──────────────────────────────────────────────

const AI_NODES = [
  { label: "RECOMMENDATION ENGINE",  state: "ACTIVE",  color: "#4ade80" },
  { label: "INVENTORY SYNC",         state: "LIVE",    color: "#60a5fa" },
  { label: "TASTE PROFILE",          state: "READY",   color: C.gold    },
  { label: "REVENUE BRAIN",          state: "ONLINE",  color: "#a78bfa" },
];

function IntelStatusBar() {
  return (
    <div style={{
      display:       "flex",
      alignItems:    "center",
      gap:           28,
      padding:       "10px 28px",
      borderTop:     `1px solid ${C.border}`,
      borderBottom:  `1px solid ${C.border}`,
      background:    "rgba(26,26,27,0.05)",
      backdropFilter: "blur(10px)",
      overflowX:     "auto",
      flexShrink:    0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <Cpu size={12} color={C.goldDim} />
        <span style={{ fontSize: 9, letterSpacing: "0.22em", color: C.dim, textTransform: "uppercase" }}>
          NOVEE Intelligence
        </span>
      </div>
      {AI_NODES.map(n => (
        <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <motion.div
            style={{ width: 5, height: 5, borderRadius: "50%", background: n.color }}
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.4 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{ fontSize: 8.5, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            {n.label}
          </span>
          <span style={{ fontSize: 8.5, color: n.color, letterSpacing: "0.1em", fontWeight: 700 }}>
            {n.state}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Activity size={11} color={C.goldDim} />
        <span style={{ fontSize: 8.5, color: C.dim, letterSpacing: "0.12em" }}>
          {CRAFT_MODULES.reduce((s, m) => s + m.scenes.length, 0)} curated scenes
        </span>
      </div>
    </div>
  );
}

// ── Per-craft background image pool ──────────────────────────────────────────

const TILE_BG: Record<string, string[]> = {
  smoke: [
    "/images/scenes/smokecraft-card.jpg",
    "/images/scenes/bold.jpg",
    "/images/scenes/craft-hub.jpg",
    "/images/scenes/reflective.jpg",
  ],
  pour: [
    "/images/scenes/pourcraft-card.jpg",
    "/images/scenes/relaxed.jpg",
    "/images/scenes/social.jpg",
    "/images/scenes/reflective.jpg",
  ],
  brew: [
    "/images/scenes/brewcraft-card.jpg",
    "/images/scenes/social.jpg",
    "/images/scenes/bold.jpg",
    "/images/scenes/craft-hub.jpg",
  ],
  vape: [
    "/images/scenes/vapecraft-card.jpg",
    "/images/scenes/reflective.jpg",
    "/images/scenes/social.jpg",
    "/images/scenes/bold.jpg",
  ],
};

const KB_MOVES = [
  { scale: [1.08, 1.18], x: ["0%", "-3%"], y: ["0%", "-2%"] },
  { scale: [1.10, 1.06], x: ["-2%", "2%"], y: ["0%", "2%"]  },
  { scale: [1.06, 1.14], x: ["2%", "-2%"], y: ["-2%", "0%"] },
  { scale: [1.12, 1.07], x: ["0%", "3%"],  y: ["2%", "-2%"] },
];

function LiquidTileBg({ craftId, color }: { craftId: string; color: string }) {
  const pool     = TILE_BG[craftId] ?? TILE_BG.smoke;
  const seed     = useMemo(() => Math.floor(Math.random() * pool.length), [pool.length]);
  const [idx, setIdx] = useState(seed);
  const kbRef    = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % pool.length);
      kbRef.current = (kbRef.current + 1) % KB_MOVES.length;
    }, 5000);
    return () => clearInterval(id);
  }, [pool.length]);

  const kb = KB_MOVES[kbRef.current]!;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 22, zIndex: 0, pointerEvents: "none" }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.40 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <motion.div
            animate={{ scale: kb.scale, x: kb.x, y: kb.y }}
            transition={{ duration: 6.4, ease: "linear" }}
            style={{
              width:              "115%",
              height:             "115%",
              position:           "absolute",
              top:                "-7%",
              left:               "-7%",
              backgroundImage:    `url(${pool[idx]})`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
            }}
          />
        </motion.div>
      </AnimatePresence>
      {/* Craft-color liquid gradient overlay */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: `linear-gradient(160deg, ${color}28 0%, transparent 55%, rgba(8,6,4,0.82) 100%)`,
        zIndex:     1,
      }} />
    </div>
  );
}

// ── TactileCard — touch-first craft portal interaction ────────────────────────

function TactileCard({
  title,
  tagline,
  badge,
  onTrigger,
}: {
  title:     string;
  tagline:   string;
  badge:     string;
  onTrigger: () => void;
}) {
  function press(el: HTMLDivElement) {
    el.style.transform   = "scale(0.96)";
    el.style.borderColor = "rgba(212,139,0,0.80)";
    el.style.boxShadow   = "0 0 32px rgba(212,139,0,0.18)";
  }
  function release(el: HTMLDivElement) {
    el.style.transform   = "scale(1)";
    el.style.borderColor = "rgba(212,139,0,0.20)";
    el.style.boxShadow   = "none";
  }

  return (
    <div
      style={{
        position:               "absolute",
        inset:                  0,
        zIndex:                 5,
        borderRadius:           22,
        border:                 "1px solid rgba(212,139,0,0.20)",
        background:             "rgba(0,0,0,0.40)",
        backdropFilter:         "blur(12px)",
        WebkitBackdropFilter:   "blur(12px)",
        transition:             "transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease",
        display:                "flex",
        flexDirection:          "column",
        justifyContent:         "flex-end",
        padding:                "0 24px 28px",
        cursor:                 "pointer",
        touchAction:            "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      onPointerDown={e => press(e.currentTarget)}
      onPointerUp={e   => { release(e.currentTarget); onTrigger(); }}
      onPointerLeave={e => release(e.currentTarget)}
      onPointerCancel={e => release(e.currentTarget)}
    >
      {/* Craft badge */}
      <div style={{
        fontSize:     9,
        color:        C.goldDim,
        letterSpacing: "0.18em",
        fontFamily:   "'Space Mono', monospace",
        marginBottom: 8,
        textTransform: "uppercase",
      }}>
        {badge}
      </div>

      {/* Title */}
      <h2 style={{
        margin:        0,
        fontFamily:    "var(--app-font-serif, Georgia, serif)",
        fontSize:      "clamp(14px, 2.4vw, 22px)",
        fontWeight:    700,
        color:         C.gold,
        letterSpacing: "0.3em",
        textTransform: "uppercase",
        lineHeight:    1.15,
      }}>
        {title}
      </h2>

      {/* Ritual cue */}
      <p style={{
        margin:        "7px 0 0",
        fontSize:      9,
        color:         C.muted,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontFamily:    "'Space Mono', monospace",
      }}>
        INITIALIZE RITUAL
      </p>

      {/* Tagline */}
      <p style={{
        margin:      "5px 0 0",
        fontSize:    10,
        color:       C.dim,
        lineHeight:  1.5,
        letterSpacing: "0.03em",
      }}>
        {tagline}
      </p>
    </div>
  );
}

// ── Glass shimmer — activates on the focused blade ───────────────────────────

function GlassShimmer({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 3 }}>
      <motion.div
        initial={{ x: "-120%", opacity: 0 }}
        animate={{ x: "130%", opacity: [0, 0.28, 0] }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: 0, bottom: 0,
          width: "45%",
          background: `linear-gradient(105deg, transparent 0%, ${color}1a 50%, transparent 100%)`,
          transform: "skewX(-14deg)",
        }}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 0.65, 0], y: -90 }}
          transition={{ duration: 1.6 + i * 0.25, delay: i * 0.08, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: `${12 + i * 8}%`,
            bottom: `${18 + (i % 4) * 12}%`,
            width: 1.5 + (i % 3),
            height: 1.5 + (i % 3),
            borderRadius: "50%",
            background: color,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

// ── Amber reflection overlay ──────────────────────────────────────────────────

function AmberReflection({ active, color }: { active: boolean; color: string }) {
  return (
    <motion.div
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        position:      "absolute",
        inset:         0,
        zIndex:        2,
        background:    `radial-gradient(ellipse 80% 60% at 50% 80%, ${color}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Single vertical blade portal ─────────────────────────────────────────────

interface BladePortalProps {
  mod:          { id: string; title: string; tagline: string; badge: string; route: string; color: string };
  active:       boolean;
  index:        number;
  total:        number;
  onActivate:   () => void;
  onDeactivate: () => void;
  onTrigger:    () => void;
}

function BladePortal({ mod, active, index, total, onActivate, onDeactivate, onTrigger }: BladePortalProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        position:   "relative",
        flex:        active ? 3.5 : 1,
        minWidth:    active ? 0 : 44,
        transition:  "flex 0.55s cubic-bezier(0.23, 1, 0.32, 1), min-width 0.55s cubic-bezier(0.23, 1, 0.32, 1)",
        overflow:    "hidden",
        cursor:      "pointer",
        borderRight: index < total - 1 ? "1px solid rgba(212,139,0,0.10)" : "none",
        background:  pressed ? `${mod.color}09` : "transparent",
      }}
      onPointerEnter={() => onActivate()}
      onPointerLeave={() => { onDeactivate(); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { if (pressed) { setPressed(false); onTrigger(); } }}
      onPointerCancel={() => setPressed(false)}
    >
      <LiquidTileBg craftId={mod.id} color={mod.color} />
      <AmberReflection active={active} color={mod.color} />
      <GlassShimmer active={active} color={mod.color} />

      {/* Bottom gradient vignette */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 4,
        background: `linear-gradient(0deg,
          rgba(0,0,0,0.92) 0%,
          rgba(0,0,0,0.55) 35%,
          rgba(0,0,0,0.12) 60%,
          transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* ── Collapsed label — vertical craft ID ── */}
      <AnimatePresence>
        {!active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position:       "absolute",
              inset:          0,
              zIndex:         6,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              pointerEvents:  "none",
            }}
          >
            <div style={{
              writingMode:    "vertical-rl",
              textOrientation: "mixed",
              transform:      "rotate(180deg)",
              fontSize:       8,
              letterSpacing:  "0.28em",
              color:          `${mod.color}cc`,
              textTransform:  "uppercase",
              fontFamily:     "'Space Mono', monospace",
              fontWeight:     700,
            }}>
              {mod.id}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded content — visible when blade is active ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:  "absolute",
              bottom: 0, left: 0, right: 0,
              zIndex:    7,
              padding:   "0 20px 30px",
            }}
          >
            <div style={{
              fontSize:      8,
              color:         mod.color,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              fontFamily:    "'Space Mono', monospace",
              marginBottom:  8,
            }}>
              {mod.badge}
            </div>
            <h2 style={{
              margin:        0,
              fontFamily:    "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
              fontSize:      "clamp(16px, 2.2vw, 26px)",
              fontWeight:    800,
              color:         C.gold,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              lineHeight:    1.1,
              marginBottom:  6,
            }}>
              {mod.title}
            </h2>
            <p style={{
              margin:        0,
              fontSize:      9.5,
              color:         C.muted,
              letterSpacing: "0.04em",
              lineHeight:    1.55,
              marginBottom:  18,
            }}>
              {mod.tagline}
            </p>

            {/* Ritual CTA badge */}
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], boxShadow: [`0 0 0px ${mod.color}00`, `0 0 18px ${mod.color}44`, `0 0 0px ${mod.color}00`] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           7,
                padding:       "7px 14px",
                background:    `${mod.color}12`,
                border:        `1px solid ${mod.color}50`,
                borderRadius:  8,
                fontSize:      8,
                fontWeight:    700,
                color:         mod.color,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                fontFamily:    "'Space Mono', monospace",
              }}
            >
              ◈ INITIALIZE RITUAL
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breathing glow ring on border */}
      <GlowRing color={mod.color} />
    </div>
  );
}

// ── Craft portal glow ring ────────────────────────────────────────────────────

function GlowRing({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position:    "absolute",
        inset:       -1,
        borderRadius: 24,
        border:       `1px solid ${color}`,
        pointerEvents: "none",
        zIndex:       10,
      }}
      animate={{ opacity: [0.15, 0.45, 0.15] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Fast Return Modal ─────────────────────────────────────────────────────────

function FastReturnModal({ onClose }: { onClose: () => void }) {
  const { fastReturn, guestProfile, mentor } = useGuestProfile();
  const [firstName,   setFirstName]  = useState("");
  const [phoneLast4,  setPhoneLast4] = useState("");
  const [busy,        setBusy]       = useState(false);
  const [error,       setError]      = useState("");
  const [success,     setSuccess]    = useState(false);

  async function handleReturn() {
    if (!firstName.trim() || phoneLast4.length !== 4) {
      setError("Please enter your first name and the last 4 digits.");
      return;
    }
    setBusy(true);
    setError("");
    const found = await fastReturn(firstName.trim(), phoneLast4);
    setBusy(false);
    if (!found) {
      setError("No session found. Check your name and digits.");
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 1800);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          300,
        background:      "rgba(245,242,237,0.92)",
        backdropFilter:  "blur(8px)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background:   "rgba(12,8,4,0.95)",
          border:       `1px solid ${C.goldDim}`,
          borderRadius: 16,
          padding:      "32px 28px",
          width:        "100%",
          maxWidth:     360,
          position:     "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position:   "absolute", top: 14, right: 14,
            background: "none", border: "none",
            color:      C.dim, cursor: "pointer", padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center" }}
          >
            <p style={{
              fontFamily:    "'Cormorant Garamond', Georgia, serif",
              fontSize:      "1.6rem",
              fontWeight:    300,
              color:         C.text,
              marginBottom:  8,
            }}>
              Welcome back,<br />{guestProfile?.firstName}.
            </p>
            {mentor && (
              <p style={{
                fontSize:   "0.75rem",
                color:      C.goldDim,
                letterSpacing: "0.08em",
              }}>
                {mentor.name} is ready for you.
              </p>
            )}
          </motion.div>
        ) : (
          <>
            <p style={{
              fontFamily:    "var(--app-font-serif, Georgia, serif)",
              fontSize:      "1.1rem",
              fontWeight:    700,
              color:         C.text,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom:  6,
            }}>
              Return to Session
            </p>
            <p style={{
              fontSize:      11,
              color:         C.muted,
              marginBottom:  24,
              lineHeight:    1.5,
            }}>
              Enter your first name and the last 4 digits of your phone number.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter") handleReturn(); }}
                placeholder="First name"
                style={{
                  background:   "rgba(212,139,0,0.05)",
                  border:       `1px solid rgba(212,139,0,0.2)`,
                  borderRadius: 8,
                  padding:      "11px 14px",
                  color:        C.text,
                  fontFamily:   "inherit",
                  fontSize:     14,
                  outline:      "none",
                  caretColor:   C.gold,
                }}
              />
              <input
                value={phoneLast4}
                maxLength={4}
                onChange={e => {
                  setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                onKeyDown={e => { if (e.key === "Enter") handleReturn(); }}
                placeholder="Last 4 digits"
                inputMode="numeric"
                style={{
                  background:    "rgba(212,139,0,0.05)",
                  border:        `1px solid rgba(212,139,0,0.2)`,
                  borderRadius:  8,
                  padding:       "11px 14px",
                  color:         C.text,
                  fontFamily:    "inherit",
                  fontSize:      14,
                  letterSpacing: "0.3em",
                  outline:       "none",
                  caretColor:    C.gold,
                }}
              />

              {error && (
                <p style={{ fontSize: 11, color: "rgba(220,80,80,0.8)" }}>{error}</p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleReturn}
                disabled={busy}
                style={{
                  background:    `rgba(212,139,0,0.10)`,
                  border:        `1px solid ${C.goldDim}`,
                  borderRadius:  8,
                  padding:       "12px",
                  color:         C.gold,
                  fontFamily:    "inherit",
                  fontSize:      12,
                  fontWeight:    700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor:        busy ? "not-allowed" : "pointer",
                  opacity:       busy ? 0.6 : 1,
                }}
              >
                {busy ? "Searching…" : "Find My Session"}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main hub page ─────────────────────────────────────────────────────────────

function CraftHubInner() {
  const [, navigate]   = useLocation();
  const glowCtrl       = useAnimation();
  const { guestProfile } = useGuestProfile();
  const [showReturn,   setShowReturn]  = useState(false);
  const [portal,       setPortal]      = useState<{ route: string; color: string } | null>(null);
  const [activeBlade,  setActiveBlade] = useState<string | null>(null);

  // ── Kiosk Lock — disables context menu, F-keys, Ctrl shortcuts, back-nav ────
  useKioskLock(true);

  // ── Hardware NFC listener — fires on NOVEE Coin tap ─────────────────────────
  useEffect(() => {
    if (!("NDEFReader" in window)) return;
    const controller = new AbortController();
    (async (): Promise<void> => {
      try {
        type NdefLike = { scan: (opts?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: { serialNumber: string }) => void) | null };
        const ndef = new (window as unknown as { NDEFReader: new () => NdefLike }).NDEFReader();
        await ndef.scan({ signal: controller.signal });
        ndef.onreading = async (event: { serialNumber: string }) => {
          const venueId = ((): string | undefined => {
            for (const k of ["axiom_jwt","auth_token","axiom_token","smokecraft_token"]) {
              const t = localStorage.getItem(k);
              if (t) try { return (JSON.parse(atob(t.split(".")[1]!)) as { venueId?: string }).venueId ?? undefined; } catch { /* next */ }
            }
            return undefined;
          })();
          await TitanEngine.handleNFCTap(event.serialNumber, venueId);
        };
      } catch { /* NFC not permitted or unavailable */ }
    })();
    return () => controller.abort();
  }, []);

  // ── Staff escape hatch — tap the time display 5× to go to /operations ───────
  const staffTaps    = useRef(0);
  const staffTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleStaffTap() {
    staffTaps.current += 1;
    if (staffTimer.current) clearTimeout(staffTimer.current);
    if (staffTaps.current >= 5) {
      staffTaps.current = 0;
      navigate("/operations");
      return;
    }
    staffTimer.current = setTimeout(() => { staffTaps.current = 0; }, 2500);
  }

  // Slow-pulse ambient center glow
  useEffect(() => {
    glowCtrl.start({
      opacity: [0.18, 0.38, 0.18],
      scale:   [1, 1.06, 1],
      transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
    });
  }, [glowCtrl]);

  return (
    <div style={{
      height:        "100dvh",
      background:    C.bg,
      color:         C.text,
      fontFamily:    "var(--app-font-sans, system-ui, sans-serif)",
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
      position:      "relative",
    }}>

      {/* ── Ambient background radial glow ── */}
      <motion.div
        animate={glowCtrl}
        style={{
          position:     "absolute",
          top:          "40%",
          left:         "50%",
          transform:    "translate(-50%, -50%)",
          width:        "70vw",
          height:       "50vh",
          borderRadius: "50%",
          background:   `radial-gradient(ellipse, ${C.goldGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex:       0,
        }}
      />

      {/* ── Cinematic lounge atmosphere — time-gated .mp4 ── */}
      <CinematicVideo />

      {/* ── Floating particles ── */}
      <AmbientParticles />

      {/* ── Top OS header ── */}
      <header style={{
        position:       "relative",
        zIndex:         10,
        display:        "flex",
        alignItems:     "center",
        padding:        "14px 24px",
        borderBottom:   `1px solid ${C.border}`,
        background:     "rgba(8,6,4,0.85)",
        backdropFilter: "blur(16px)",
        flexShrink:     0,
        gap:            16,
      }}>
        {/* Left — returning guest or identity badge */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {guestProfile ? (
            <SovereignLogoutBadge guestProfile={guestProfile} accent={C.gold} />
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowReturn(true)}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           6,
                background:    "none",
                border:        `1px solid rgba(212,139,0,0.18)`,
                borderRadius:  8,
                padding:       "5px 10px",
                color:         C.dim,
                fontSize:      10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor:        "pointer",
              }}
            >
              <RotateCcw size={10} color={C.goldDim} />
              Returning?
            </motion.button>
          )}
        </motion.div>

        {/* Brand identity — center */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              fontFamily:    "var(--app-font-serif, Georgia, serif)",
              fontSize:      "clamp(17px, 2.4vw, 22px)",
              fontWeight:    800,
              color:         C.text,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              lineHeight:    1,
            }}
          >
            NOVEE OS
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontSize:      9,
              color:         C.goldDim,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginTop:     3,
            }}
          >
            Powered by NOVEE Intelligence
          </motion.div>
        </div>

        {/* Right — audio toggle + staff button + module count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <AudioWaveToggle />
          <button
            onClick={() => navigate("/gate")}
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.55)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: "#D4AF37",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 18px",
              fontFamily: "inherit",
              minHeight: 36,
              whiteSpace: "nowrap",
              boxShadow: "0 0 12px rgba(212,175,55,0.15)",
            }}
          >
            ⬡ Sovereign Gate
          </button>
          <button
            onClick={() => navigate("/operations")}
            style={{
              background: "rgba(212,139,0,0.12)",
              border: "1px solid rgba(212,139,0,0.4)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "8px 18px",
              fontFamily: "inherit",
              minHeight: 36,
              whiteSpace: "nowrap",
            }}
          >
            Staff Login
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} color={C.goldDim} />
            <span style={{ fontSize: 10, color: C.dim, letterSpacing: "0.14em" }}>
              {CRAFT_MODULES.length} craft modules
            </span>
          </div>
        </motion.div>
      </header>

      {/* ── AI intelligence status bar ── */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <IntelStatusBar />
      </div>

      {/* ── 4 Vertical Blades ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        style={{
          flex:          1,
          display:       "flex",
          flexDirection: "row",
          position:      "relative",
          zIndex:        10,
          overflow:      "hidden",
          minHeight:     0,
        }}
      >
        {CRAFT_MODULES.map((mod, i) => (
          <BladePortal
            key={mod.id}
            mod={mod}
            active={activeBlade === mod.id}
            index={i}
            total={CRAFT_MODULES.length}
            onActivate={() => setActiveBlade(mod.id)}
            onDeactivate={() => setActiveBlade(null)}
            onTrigger={() => {
              ExperienceFlowEngine.startCraft(mod.id);
              setPortal({ route: mod.route, color: mod.color });
            }}
          />
        ))}
      </motion.div>

      {/* ── Partner LogoAnchors — DayOne360 & WifeX ── */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1 }}>
            <LogoAnchor partner="DayOne360" variant="bar" />
          </div>
          <div style={{ flex: 1 }}>
            <LogoAnchor partner="WifeX" variant="bar" />
          </div>
        </div>
      </div>

      {/* ── Operational status footer ── */}
      <footer style={{
        position:       "relative",
        zIndex:         10,
        padding:        "10px 28px",
        borderTop:      `1px solid ${C.border}`,
        display:        "flex",
        alignItems:     "center",
        gap:            20,
        flexShrink:     0,
        background:     "rgba(245,242,237,0.90)",
        backdropFilter: "blur(12px)",
      }}>
        {CRAFT_MODULES.map(mod => (
          <div key={mod.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              style={{ width: 5, height: 5, borderRadius: "50%", background: mod.color }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: CRAFT_MODULES.indexOf(mod) * 0.6 }}
            />
            <span style={{ fontSize: 9, color: C.dim, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {mod.id}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            onClick={handleStaffTap}
            style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", cursor: "default", userSelect: "none" }}
          >
            OPERATIONAL · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button
            onClick={() => navigate("/gate")}
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.08) 100%)",
              border: "1.5px solid rgba(212,175,55,0.7)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 800,
              color: "#D4AF37",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 16px",
              fontFamily: "inherit",
              minWidth: 80,
              minHeight: 36,
              boxShadow: "0 0 12px rgba(212,175,55,0.2)",
            }}
          >
            ⬡ Gate
          </button>
          <button
            onClick={() => navigate("/operations")}
            style={{
              background: "rgba(212,139,0,0.12)",
              border: "1px solid rgba(212,139,0,0.35)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "8px 16px",
              fontFamily: "inherit",
              minWidth: 80,
              minHeight: 36,
            }}
          >
            Staff ›
          </button>
        </div>
      </footer>

      {/* ── Fast Return Modal ── */}
      <AnimatePresence>
        {showReturn && <FastReturnModal onClose={() => setShowReturn(false)} />}
      </AnimatePresence>

      {/* ── Fixed Sovereign Gate FAB — always visible on all screen sizes ── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => navigate("/gate")}
        style={{
          position:     "fixed",
          bottom:       72,
          right:        20,
          zIndex:       120,
          background:   "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 100%)",
          border:       "1.5px solid rgba(212,175,55,0.65)",
          borderRadius: 14,
          cursor:       "pointer",
          padding:      "12px 18px",
          display:      "flex",
          flexDirection:"column",
          alignItems:   "center",
          gap:           3,
          backdropFilter: "blur(12px)",
          boxShadow:    "0 0 24px rgba(212,175,55,0.22), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>⬡</span>
        <span style={{
          fontSize:      9,
          fontWeight:    800,
          color:         "#D4AF37",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily:    "inherit",
          whiteSpace:    "nowrap",
        }}>
          Gate
        </span>
      </motion.button>

      {/* ── Portal opening curtain — expands when a craft card is clicked ── */}
      <AnimatePresence>
        {portal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.52, ease: [0.4, 0, 1, 1] }}
            onAnimationComplete={() => navigate(portal.route)}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "#060402",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Radial craft-color burst from center */}
            <motion.div
              initial={{ scale: 0.05, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.52, ease: "easeOut" }}
              style={{
                width:        280, height: 280,
                borderRadius: "50%",
                background:   `radial-gradient(circle, ${portal.color}45 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CraftHub() {
  return (
    <UserProfileProvider>
      <PreferenceProvider>
        <LiveEngineController />
        <CraftHubInner />
        <TickerTape position="bottom" />
        <EnvironmentPulseOverlay />
      </PreferenceProvider>
    </UserProfileProvider>
  );
}
