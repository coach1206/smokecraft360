/**
 * EnvironmentalOrchestrator — Axiom OS Atmospheric Entry System
 * Route: /
 *
 * De-applicationization: zero visible tiles, cards, or navigation.
 * The 4 craft environments ARE the interface — guests drift into them.
 *
 * Interaction model:
 *   Touch/hover a zone → atmosphere intensifies → craft name emerges (500ms)
 *   Hold for 1.5s     → cinematic expansion     → navigate to experience
 *   Release before     → atmosphere resets       → no navigation
 *
 * Layout:
 *   ┌──────────────┬──────────────┐
 *   │   SMOKE      │     POUR     │
 *   │  (ember)     │  (whiskey)   │
 *   ├──────────────┼──────────────┤
 *   │   BREW       │     VAPE     │
 *   │  (copper)    │  (vapor)     │
 *   └──────────────┴──────────────┘
 *   No borders. Zones bleed into each other.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useGuestProfile } from "@/contexts/GuestProfileContext";

// ── Craft zone definitions ─────────────────────────────────────────────────────

interface CraftZone {
  id:       string;
  name:     string;
  tagline:  string;
  route:    string;
  image:    string;
  primary:  string;   // main glow color
  ember:    string;   // particle color
  dark:     string;   // deep tone
  fog:      string;   // background atmosphere gradient
}

const ZONES: CraftZone[] = [
  {
    id:      "smoke",
    name:    "SmokeCraft",
    tagline: "Molecular Leaf Intelligence",
    route:   "/experience/smoke",
    image:   "/images/scenes/smokecraft-card.jpg",
    primary: "#D4682E",
    ember:   "#F4A03A",
    dark:    "#1A0800",
    fog:     "radial-gradient(ellipse at 30% 60%, #6B2A0E30 0%, #1A080000 70%)",
  },
  {
    id:      "pour",
    name:    "PourCraft",
    tagline: "Vessel Geometry · Spirit Sync",
    route:   "/experience/pour",
    image:   "/images/scenes/pourcraft-card.jpg",
    primary: "#D48B00",
    ember:   "#E8C060",
    dark:    "#100A00",
    fog:     "radial-gradient(ellipse at 70% 40%, #8B5C0030 0%, #10080000 70%)",
  },
  {
    id:      "brew",
    name:    "BrewCraft",
    tagline: "Fermentation Lab · Craft Intelligence",
    route:   "/experience/brew",
    image:   "/images/scenes/brewcraft-card.jpg",
    primary: "#C4782A",
    ember:   "#E8A050",
    dark:    "#0E0700",
    fog:     "radial-gradient(ellipse at 25% 70%, #6B3A0830 0%, #0E070000 70%)",
  },
  {
    id:      "vape",
    name:    "VapeCraft",
    tagline: "Cloud Architecture · Vapor Sync",
    route:   "/experience/vape",
    image:   "/images/scenes/vapecraft-card.jpg",
    primary: "#7C5CF6",
    ember:   "#A08EFF",
    dark:    "#06020F",
    fog:     "radial-gradient(ellipse at 75% 75%, #4A1E9030 0%, #06020F00 70%)",
  },
];

// ── Keyframe CSS for particle animations ──────────────────────────────────────

const ATMOSPHERE_CSS = `
  @keyframes drift-smoke {
    0%   { transform: translate(0px, 0px) scale(1);      opacity: 0;    }
    15%  { opacity: 1; }
    85%  { opacity: 0.6; }
    100% { transform: translate(var(--dx), -90px) scale(0.4); opacity: 0; }
  }
  @keyframes drift-pour {
    0%   { transform: translate(0px, 0px) skewX(0deg);  opacity: 0;    }
    20%  { opacity: 0.8; }
    100% { transform: translate(var(--dx), 30px) skewX(8deg); opacity: 0; }
  }
  @keyframes drift-brew {
    0%   { transform: translate(0, 0) scale(1);    opacity: 0;   }
    25%  { opacity: 0.7; }
    100% { transform: translate(var(--dx), -60px) scale(0.6); opacity: 0; }
  }
  @keyframes drift-vape {
    0%   { transform: translate(0, 0) scale(1) blur(0px);   opacity: 0;   }
    20%  { opacity: 0.5; }
    60%  { transform: translate(var(--dx), var(--dy)) scale(2.5); }
    100% { transform: translate(var(--dx2), var(--dy2)) scale(4); opacity: 0; }
  }
  @keyframes shimmer-pour {
    0%   { transform: translateX(-100%) rotate(25deg); opacity: 0;   }
    30%  { opacity: 0.15; }
    70%  { opacity: 0.08; }
    100% { transform: translateX(200%) rotate(25deg);  opacity: 0;   }
  }
  @keyframes env-breathe {
    0%, 100% { opacity: 0.06; }
    50%       { opacity: 0.18; }
  }
`;

// ── Smoke particle system ──────────────────────────────────────────────────────
// Upward drifting ember fragments with heat wobble

const SMOKE_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id:    i,
  x:     10 + Math.random() * 80,
  delay: Math.random() * 7,
  dur:   5 + Math.random() * 6,
  size:  2 + Math.random() * 4,
  dx:    (Math.random() - 0.5) * 30,
  hue:   Math.random() > 0.5 ? "#F4A03A" : "#D4682E",
}));

function SmokeAtmosphere({ active }: { active: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {SMOKE_PARTICLES.map(p => (
        <div
          key={p.id}
          style={{
            position:     "absolute",
            left:         `${p.x}%`,
            bottom:       "8%",
            width:        p.size,
            height:       p.size,
            borderRadius: "50%",
            background:   p.hue,
            boxShadow:    `0 0 ${p.size * 3}px ${p.hue}`,
            // @ts-ignore
            "--dx":        `${p.dx}px`,
            animationName: "drift-smoke",
            animationDuration:        `${p.dur}s`,
            animationDelay:           `${p.delay}s`,
            animationTimingFunction:  "ease-out",
            animationIterationCount:  "infinite",
            animationFillMode:        "both",
            opacity:       active ? 1 : 0.35,
            transition:    "opacity 0.8s ease",
          }}
        />
      ))}
      {/* Heat shimmer layer */}
      <motion.div
        animate={{ opacity: active ? [0.06, 0.18, 0.06] : [0.02, 0.05, 0.02] }}
        transition={{ duration: active ? 2.2 : 4.5, repeat: Infinity }}
        style={{
          position:   "absolute",
          bottom:     0,
          left:       "10%",
          right:      "10%",
          height:     "40%",
          background: "radial-gradient(ellipse at bottom, #D4682E22 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

// ── Pour particle system ───────────────────────────────────────────────────────
// Diagonal whiskey-amber light streaks + liquid shimmer reflections

const POUR_STREAKS = Array.from({ length: 6 }, (_, i) => ({
  id:    i,
  top:   10 + Math.random() * 80,
  delay: i * 1.4 + Math.random() * 2,
  dur:   3.5 + Math.random() * 3,
  width: 40 + Math.random() * 80,
}));

function PourAtmosphere({ active }: { active: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Diagonal light streaks */}
      {POUR_STREAKS.map(s => (
        <div
          key={s.id}
          style={{
            position:   "absolute",
            top:        `${s.top}%`,
            left:       0,
            width:      s.width,
            height:     1.5,
            background: "linear-gradient(90deg, transparent, #E8C06080, #D48B0040, transparent)",
            animationName:            "shimmer-pour",
            animationDuration:        `${s.dur}s`,
            animationDelay:           `${s.delay}s`,
            animationTimingFunction:  "ease-in-out",
            animationIterationCount:  "infinite",
            opacity:    active ? 1 : 0.3,
            transition: "opacity 0.9s ease",
          }}
        />
      ))}
      {/* Amber environmental glow */}
      <motion.div
        animate={{ opacity: active ? [0.08, 0.22, 0.08] : [0.02, 0.06, 0.02] }}
        transition={{ duration: active ? 2.8 : 5, repeat: Infinity }}
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse at 65% 45%, #D48B0025 0%, transparent 60%)",
        }}
      />
      {/* Liquid refraction pool at base */}
      <motion.div
        animate={{ scaleX: active ? [1, 1.08, 1] : 1, opacity: active ? 0.18 : 0.06 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       "12%",
          left:         "20%",
          right:        "20%",
          height:       3,
          borderRadius: "50%",
          background:   "#E8C060",
          filter:       "blur(4px)",
        }}
      />
    </div>
  );
}

// ── Brew particle system ───────────────────────────────────────────────────────
// Rising copper bubbles with slow industrial warmth

const BREW_BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  id:    i,
  x:     15 + Math.random() * 70,
  delay: Math.random() * 9,
  dur:   6 + Math.random() * 7,
  size:  3 + Math.random() * 8,
  dx:    (Math.random() - 0.5) * 18,
}));

function BrewAtmosphere({ active }: { active: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {BREW_BUBBLES.map(b => (
        <div
          key={b.id}
          style={{
            position:     "absolute",
            left:         `${b.x}%`,
            bottom:       "5%",
            width:        b.size,
            height:       b.size,
            borderRadius: "50%",
            border:       `1px solid #C4782A80`,
            background:   "transparent",
            // @ts-ignore
            "--dx":        `${b.dx}px`,
            animationName: "drift-brew",
            animationDuration:        `${b.dur}s`,
            animationDelay:           `${b.delay}s`,
            animationTimingFunction:  "ease-out",
            animationIterationCount:  "infinite",
            animationFillMode:        "both",
            opacity:    active ? 0.8 : 0.2,
            transition: "opacity 0.9s ease",
          }}
        />
      ))}
      {/* Copper industrial glow */}
      <motion.div
        animate={{ opacity: active ? [0.07, 0.20, 0.07] : [0.02, 0.05, 0.02] }}
        transition={{ duration: active ? 3.5 : 6, repeat: Infinity }}
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse at 30% 80%, #C4782A28 0%, transparent 55%)",
        }}
      />
    </div>
  );
}

// ── Vape particle system ───────────────────────────────────────────────────────
// Kinetic vapor clouds — reactive, layered, cool haze

const VAPE_CLOUDS = Array.from({ length: 10 }, (_, i) => ({
  id:    i,
  x:     10 + Math.random() * 80,
  y:     20 + Math.random() * 60,
  delay: Math.random() * 8,
  dur:   8 + Math.random() * 10,
  size:  14 + Math.random() * 28,
  dx:    (Math.random() - 0.5) * 40,
  dy:    -20 - Math.random() * 40,
  dx2:   (Math.random() - 0.5) * 70,
  dy2:   -60 - Math.random() * 60,
  hue:   Math.random() > 0.5 ? "#A08EFF40" : "#4A90D940",
}));

function VapeAtmosphere({ active }: { active: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {VAPE_CLOUDS.map(c => (
        <div
          key={c.id}
          style={{
            position:     "absolute",
            left:         `${c.x}%`,
            top:          `${c.y}%`,
            width:        c.size,
            height:       c.size,
            borderRadius: "50%",
            background:   c.hue,
            filter:       "blur(10px)",
            // @ts-ignore
            "--dx":        `${c.dx}px`,
            "--dy":        `${c.dy}px`,
            "--dx2":       `${c.dx2}px`,
            "--dy2":       `${c.dy2}px`,
            animationName: "drift-vape",
            animationDuration:        `${c.dur}s`,
            animationDelay:           `${c.delay}s`,
            animationTimingFunction:  "ease-out",
            animationIterationCount:  "infinite",
            animationFillMode:        "both",
            opacity:    active ? 0.9 : 0.22,
            transition: "opacity 1.2s ease",
          }}
        />
      ))}
      {/* Cool ambient haze */}
      <motion.div
        animate={{ opacity: active ? [0.10, 0.28, 0.10] : [0.02, 0.06, 0.02] }}
        transition={{ duration: active ? 2.4 : 5, repeat: Infinity }}
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse at 70% 60%, #7C5CF628 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

// ── Zone bleeding edge gradients ───────────────────────────────────────────────
// Radial vignette at zone center that bleeds atmosphere outward across borders

function ZoneBleedEdge({ zone }: { zone: CraftZone }) {
  return (
    <div
      aria-hidden
      style={{
        position:   "absolute",
        inset:      0,
        pointerEvents: "none",
        background: zone.fog,
      }}
    />
  );
}

// ── Dwell progress ring ────────────────────────────────────────────────────────

function DwellRing({ progress, color }: { progress: number; color: string }) {
  const R   = 28;
  const C   = 2 * Math.PI * R;
  return (
    <svg
      width={72} height={72}
      viewBox="0 0 72 72"
      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}
    >
      <circle cx={36} cy={36} r={R} fill="none" stroke={`${color}20`} strokeWidth={1.5} />
      <circle
        cx={36} cy={36} r={R}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={C}
        strokeDashoffset={C * (1 - progress)}
        transform="rotate(-90 36 36)"
        style={{ transition: "none", filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

// ── Fast Return Modal (preserved from CraftHub) ───────────────────────────────

function FastReturnModal({ onClose }: { onClose: () => void }) {
  const { fastReturn, guestProfile, mentor } = useGuestProfile();
  const [, navigate]   = useLocation();
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
    setBusy(true); setError("");
    try {
      await fastReturn(firstName.trim(), phoneLast4);
      setSuccess(true);
      setTimeout(() => { onClose(); navigate("/craft-hub"); }, 1200);
    } catch {
      setError("Profile not found. Please try again.");
      setBusy(false);
    }
  }

  const GOLD = "#D48B00";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(6,4,2,0.88)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background:   "rgba(22,16,8,0.96)",
          border:       `1px solid ${GOLD}30`,
          borderRadius: 20,
          padding:      "40px 36px",
          width:        340,
          textAlign:    "center",
          boxShadow:    `0 0 60px ${GOLD}15`,
        }}
      >
        {success && guestProfile ? (
          <div>
            <div style={{ fontSize: 28, color: GOLD, marginBottom: 8 }}>◈</div>
            <div style={{ fontSize: 18, color: "#F0E8D4", fontFamily: "'Cormorant Garamond', serif" }}>
              Welcome back, {guestProfile.firstName}.
            </div>
            {mentor && (
              <div style={{ fontSize: 12, color: `${GOLD}80`, marginTop: 6, letterSpacing: "0.1em" }}>
                {mentor.name} is ready for you.
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, letterSpacing: "0.24em", color: `${GOLD}80`, marginBottom: 20, textTransform: "uppercase" }}>
              Returning Guest
            </div>
            {error && (
              <div style={{ fontSize: 11, color: "#FF6B6B", marginBottom: 12 }}>{error}</div>
            )}
            <input
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={{
                width: "100%", marginBottom: 12, padding: "10px 14px",
                background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}30`,
                borderRadius: 10, color: "#F0E8D4", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              placeholder="Last 4 digits of phone"
              value={phoneLast4}
              maxLength={4}
              onChange={e => setPhoneLast4(e.target.value.replace(/\D/, ""))}
              style={{
                width: "100%", marginBottom: 20, padding: "10px 14px",
                background: "rgba(255,255,255,0.06)", border: `1px solid ${GOLD}30`,
                borderRadius: 10, color: "#F0E8D4", fontSize: 14, outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleReturn}
              disabled={busy}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: GOLD, color: "#0A0600", fontWeight: 700,
                fontSize: 13, letterSpacing: "0.14em", border: "none",
                cursor: busy ? "wait" : "pointer", textTransform: "uppercase",
              }}
            >
              {busy ? "Locating…" : "Resume Session"}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Single atmospheric zone ────────────────────────────────────────────────────

const DWELL_MS = 1500;

function AtmosphericZone({
  zone,
  position,
  onActivated,
  anyActive,
  isActive,
}: {
  zone:       CraftZone;
  position:   "tl" | "tr" | "bl" | "br";
  onActivated: (id: string) => void;
  anyActive:  boolean;
  isActive:   boolean;
}) {
  const [dwelling, setDwelling]   = useState(false);
  const [progress, setProgress]   = useState(0);
  const [revealed, setRevealed]   = useState(false);
  const dwellRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef(0);

  function startDwell() {
    setDwelling(true);
    setProgress(0);
    startRef.current = performance.now();

    function tick() {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / DWELL_MS, 1);
      setProgress(p);
      if (p >= 0.3) setRevealed(true);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onActivated(zone.id);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function cancelDwell() {
    cancelAnimationFrame(rafRef.current);
    if (dwellRef.current) clearTimeout(dwellRef.current);
    setDwelling(false);
    setProgress(0);
    setRevealed(false);
  }

  // Scale/blur rules:
  // - This zone active: scale up, full brightness
  // - Another zone active: scale down, dim
  // - No zone active: neutral
  const scale   = isActive ? 1.04 : anyActive ? 0.97 : 1.0;
  const opacity = anyActive && !isActive ? 0.55 : 1;
  const blur    = anyActive && !isActive ? "blur(1.5px)" : "none";

  return (
    <motion.div
      animate={{ scale, opacity, filter: blur }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={startDwell}
      onMouseLeave={cancelDwell}
      onTouchStart={startDwell}
      onTouchEnd={cancelDwell}
      style={{
        position:   "relative",
        overflow:   "hidden",
        cursor:     "crosshair",
        willChange: "transform, filter",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          backgroundImage: `url(${zone.image})`,
          backgroundSize:  "cover",
          backgroundPosition: "center",
          filter:          `brightness(${isActive ? 0.38 : anyActive ? 0.20 : 0.28})`,
          transition:      "filter 0.8s ease",
          willChange:      "filter",
        }}
      />

      {/* Deep dark base */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: `linear-gradient(160deg, ${zone.dark}CC 0%, ${zone.dark}66 100%)`,
      }} />

      {/* Zone fog atmosphere */}
      <ZoneBleedEdge zone={zone} />

      {/* Atmospheric particle engine — unique per craft */}
      {zone.id === "smoke" && <SmokeAtmosphere active={dwelling || isActive} />}
      {zone.id === "pour"  && <PourAtmosphere  active={dwelling || isActive} />}
      {zone.id === "brew"  && <BrewAtmosphere  active={dwelling || isActive} />}
      {zone.id === "vape"  && <VapeAtmosphere  active={dwelling || isActive} />}

      {/* Active zone ambient glow pulse */}
      <AnimatePresence>
        {(dwelling || isActive) && (
          <motion.div
            key="glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0.16, 0.04] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{
              position:   "absolute",
              inset:      0,
              background: `radial-gradient(ellipse at center, ${zone.primary}30 0%, transparent 65%)`,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Craft name reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:  "absolute",
              inset:     0,
              display:   "flex",
              flexDirection: "column",
              alignItems:    "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{
              fontSize:      32,
              fontFamily:    "'Cormorant Garamond', serif",
              fontWeight:    600,
              color:         "#F5F2ED",
              letterSpacing: "0.08em",
              textShadow:    `0 0 40px ${zone.primary}80, 0 2px 20px rgba(0,0,0,0.8)`,
              marginBottom:  8,
            }}>
              {zone.name}
            </div>
            <div style={{
              fontSize:      10,
              letterSpacing: "0.22em",
              color:         `${zone.ember}CC`,
              textTransform: "uppercase",
              fontFamily:    "'Space Mono', monospace",
            }}>
              {zone.tagline}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dwell progress ring */}
      <AnimatePresence>
        {dwelling && progress > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DwellRing progress={progress} color={zone.primary} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone edge lighting — bleeds color into adjacent zones */}
      <div style={{
        position:   "absolute",
        inset:      0,
        pointerEvents: "none",
        boxShadow:  `inset 0 0 80px ${zone.dark}CC`,
        opacity:    anyActive && !isActive ? 0.9 : 0.6,
        transition: "opacity 0.6s ease",
      }} />
    </motion.div>
  );
}

// ── Cinematic activation overlay ───────────────────────────────────────────────

function ActivationFlash({ zone }: { zone: CraftZone | null }) {
  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          key={zone.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.9, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, times: [0, 0.2, 0.5, 1], ease: "easeOut" }}
          style={{
            position:   "fixed",
            inset:      0,
            zIndex:     700,
            background: `radial-gradient(ellipse at center, ${zone.primary}40 0%, ${zone.dark}F0 100%)`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Cross-zone bleed layer ─────────────────────────────────────────────────────
// Renders ABOVE the grid to blend zone edges and remove visible hard cuts

function CrossZoneBleed() {
  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      pointerEvents: "none",
      zIndex:        5,
      background: `
        radial-gradient(circle at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 60%)
      `,
    }} />
  );
}

// ── Intelligence heartbeat (ambient) ───────────────────────────────────────────

function IntelligencePulse() {
  return (
    <div style={{
      position:      "absolute",
      top:           "50%",
      left:          "50%",
      transform:     "translate(-50%, -50%)",
      zIndex:        10,
      pointerEvents: "none",
    }}>
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [0.12, 0.04, 0.12] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width:        4,
          height:       4,
          borderRadius: "50%",
          background:   "#D48B00",
          boxShadow:    "0 0 20px #D48B0060",
        }}
      />
    </div>
  );
}

// ── AXIOM wordmark (top-center) ───────────────────────────────────────────────

function AxiomWordmark() {
  return (
    <div style={{
      position:   "absolute",
      top:        22,
      left:       "50%",
      transform:  "translateX(-50%)",
      zIndex:     20,
      pointerEvents: "none",
      textAlign:  "center",
    }}>
      <motion.div
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontSize:      10,
          letterSpacing: "0.36em",
          color:         "rgba(212,139,0,0.7)",
          fontFamily:    "'Space Mono', monospace",
          textTransform: "uppercase",
        }}
      >
        NOVEE OS · EXPERIENCE ENGINE
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EnvironmentalOrchestrator() {
  const [, navigate]   = useLocation();
  const [activeId,     setActiveId]   = useState<string | null>(null);
  const [flashZone,    setFlashZone]  = useState<CraftZone | null>(null);
  const [showReturn,   setShowReturn] = useState(false);

  const handleActivated = useCallback((id: string) => {
    const zone = ZONES.find(z => z.id === id)!;
    setFlashZone(zone);
    setTimeout(() => {
      navigate(zone.route);
    }, 420);
  }, [navigate]);

  // Returning guest keyboard shortcut — hold R for 1.5s (kiosk accessible)
  useEffect(() => {
    let rTimer: ReturnType<typeof setTimeout> | null = null;
    function onDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "r" && !rTimer) {
        rTimer = setTimeout(() => setShowReturn(true), 1500);
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "r" && rTimer) {
        clearTimeout(rTimer); rTimer = null;
      }
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
    };
  }, []);

  const positions = ["tl", "tr", "bl", "br"] as const;

  return (
    <>
      <style>{ATMOSPHERE_CSS}</style>

      <div style={{
        position:   "fixed",
        inset:      0,
        display:    "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows:    "1fr 1fr",
        background: "#060402",
        overflow:   "hidden",
      }}>
        {ZONES.map((zone, i) => (
          <AtmosphericZone
            key={zone.id}
            zone={zone}
            position={positions[i]}
            onActivated={handleActivated}
            anyActive={activeId !== null}
            isActive={activeId === zone.id}
          />
        ))}

        {/* Cross-zone bleed — removes hard grid lines visually */}
        <CrossZoneBleed />

        {/* Center intelligence pulse */}
        <IntelligencePulse />

        {/* AXIOM wordmark */}
        <AxiomWordmark />

        {/* Returning guest affordance — bottom center, minimal */}
        <motion.button
          animate={{ opacity: [0.22, 0.45, 0.22] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          onClick={() => setShowReturn(true)}
          style={{
            position:   "absolute",
            bottom:     18,
            left:       "50%",
            transform:  "translateX(-50%)",
            zIndex:     20,
            background: "transparent",
            border:     "1px solid rgba(212,139,0,0.22)",
            borderRadius: 20,
            padding:    "5px 18px",
            color:      "rgba(212,139,0,0.6)",
            fontSize:   9,
            letterSpacing: "0.2em",
            cursor:     "pointer",
            textTransform: "uppercase",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          Returning?
        </motion.button>
      </div>

      {/* Cinematic entry flash */}
      <ActivationFlash zone={flashZone} />

      {/* Fast Return Modal */}
      <AnimatePresence>
        {showReturn && <FastReturnModal onClose={() => setShowReturn(false)} />}
      </AnimatePresence>
    </>
  );
}
