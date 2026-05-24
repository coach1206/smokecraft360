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
import { SovereignOrchestrator } from "@/lib/SovereignExperienceOrchestrator";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Activity, Cpu, RotateCcw, Sparkles, X } from "lucide-react";
import craftHubLogo from "@assets/0E1669EB-2BD9-41AE-9549-BA48F6D0EFBB_1779139780515.png";
import eatLogo from "@assets/C8BC12ED-E541-4EC4-A879-A25E40D9E908_1779139780515.png";
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
  bg:       "#0D0D11",
  surface:  "rgba(255,255,255,0.025)",
  border:   "rgba(255,255,255,0.06)",
  gold:     "#D4AF37",
  goldDim:  "rgba(212,175,55,0.42)",
  goldGlow: "rgba(212,175,55,0.12)",
  text:     "#F0E8D4",
  muted:    "rgba(245,235,215,0.42)",
  dim:      "rgba(245,235,215,0.24)",
};

// ── Per-genre accent palettes (genre-isolated, no cross-bleed) ────────────────
const GENRE = {
  smoke: {
    accent:    "#D4AF37",
    accentDim: "rgba(212,175,55,0.16)",
    accentGlow:"rgba(212,175,55,0.22)",
    border:    "rgba(212,175,55,0.10)",
    bg:        "rgba(212,175,55,0.05)",
    label:     "CIGAR RITUAL",
  },
  pour: {
    accent:    "#C8762A",
    accentDim: "rgba(200,118,42,0.16)",
    accentGlow:"rgba(200,118,42,0.22)",
    border:    "rgba(200,118,42,0.10)",
    bg:        "rgba(200,118,42,0.05)",
    label:     "SPIRITS",
  },
  brew: {
    accent:    "#B8882A",
    accentDim: "rgba(184,136,42,0.16)",
    accentGlow:"rgba(184,136,42,0.22)",
    border:    "rgba(184,136,42,0.10)",
    bg:        "rgba(184,136,42,0.05)",
    label:     "CRAFT BEER",
  },
  wine: {
    accent:    "#9B2335",
    accentDim: "rgba(155,35,53,0.16)",
    accentGlow:"rgba(155,35,53,0.22)",
    border:    "rgba(155,35,53,0.10)",
    bg:        "rgba(155,35,53,0.05)",
    label:     "FINE WINE",
  },
} as const;

// ── Global tactility: 100ms micro-compression + 3 400 Hz acoustic burst ──────
function playTactile() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 3400; o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.10);
  } catch { /* non-blocking */ }
}

// ── Cinematic background: high-res image + 70% dark overlay + breathing video ─
function CinematicBackground() {
  const hour = new Date().getHours();
  const src  = hour >= 6 && hour < 17  ? "/videos/lounge-day.mp4"
             : hour >= 17 && hour < 22 ? "/videos/lounge-evening.mp4"
             :                           "/videos/lounge-night.mp4";
  return (
    <>
      {/* Layer 0 — pure black base */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "#000000" }} />

      {/* Layer 1 — high-res lounge photograph */}
      <div style={{
        position:           "absolute",
        inset:              0,
        zIndex:             1,
        backgroundImage:    "url('/images/scenes/craft-hub.jpg')",
        backgroundSize:     "cover",
        backgroundPosition: "center 30%",
        backgroundRepeat:   "no-repeat",
      }} />

      {/* Layer 2 — 72% dark gradient overlay (keeps text legible) */}
      <div style={{
        position:  "absolute",
        inset:     0,
        zIndex:    2,
        background: "linear-gradient(160deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.82) 100%)",
        pointerEvents: "none",
      }} />

      {/* Layer 3 — time-gated atmosphere video at low opacity over the photo */}
      <video
        key={src}
        autoPlay muted loop playsInline
        style={{
          position:      "absolute",
          inset:         0,
          width:         "100%",
          height:        "100%",
          objectFit:     "cover",
          zIndex:        3,
          opacity:       0.12,
          pointerEvents: "none",
        }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Layer 4 — gold ambient top glow */}
      <div style={{
        position:  "absolute",
        inset:     0,
        zIndex:    4,
        background: "radial-gradient(ellipse 80% 30% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
    </>
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
      display:              "flex",
      alignItems:           "center",
      gap:                  28,
      padding:              "10px 28px",
      borderBottom:         "1px solid rgba(212,175,55,0.18)",
      background:           "rgba(0,0,0,0.72)",
      backdropFilter:       "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      overflowX:            "auto",
      flexShrink:           0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Cpu size={15} color={C.goldDim} />
        <span style={{ fontSize: 14, letterSpacing: "0.18em", color: C.dim, textTransform: "uppercase", fontWeight: 700 }}>
          NOVEE Intelligence
        </span>
      </div>
      {AI_NODES.map(n => (
        <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <motion.div
            style={{ width: 9, height: 9, borderRadius: "50%", background: n.color, boxShadow: `0 0 6px ${n.color}88` }}
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.4 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{ fontSize: 14, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {n.label}
          </span>
          <span style={{ fontSize: 14, color: n.color, letterSpacing: "0.08em", fontWeight: 800 }}>
            {n.state}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Activity size={14} color={C.goldDim} />
        <span style={{ fontSize: 14, color: C.dim, letterSpacing: "0.10em" }}>
          {CRAFT_MODULES.reduce((s, m) => s + m.scenes.length, 0)} curated scenes
        </span>
      </div>
    </div>
  );
}

// ── Per-genre scene image pools — strictly isolated, no cross-bleed ──────────

const TILE_BG: Record<string, string[]> = {
  // SmokeCraft: cigar lounge atmosphere — sophisticated people in leather chairs, amber lighting, premium rituals
  smoke: [
    "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1559056961-1f3b601c9b60?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=85",
  ],
  // PourCraft: elite spirits, master mixology, VIP bar scenes
  pour: [
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&w=1600&q=85",
  ],
  // BeerCraft: artisanal taproom, rooftop brewery, craft draft culture
  brew: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1536700503279-b8f893bd8a9e?auto=format&fit=crop&w=1600&q=85",
  ],
  // WineCraft: stone-walled cellar, sommelier service, intimate date-night
  wine: [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=1600&q=85",
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1600&q=85",
  ],
};

// CSS gradient fallback per genre — renders when image fails to load
const TILE_FALLBACK: Record<string, string> = {
  smoke: "linear-gradient(145deg, #0d0d11 0%, #1a1200 60%, #0d0d11 100%)",
  pour:  "linear-gradient(145deg, #0d0d11 0%, #1a1000 60%, #0d0d11 100%)",
  brew:  "linear-gradient(145deg, #0d0d11 0%, #181200 60%, #0d0d11 100%)",
  wine:  "linear-gradient(145deg, #0d0d11 0%, #180008 60%, #0d0d11 100%)",
};

// ── Per-genre SVG silhouettes (shown when no photo loads) ─────────────────────

function SilhouetteCigar({ color }: { color: string }) {
  const bars = [52, 64, 72, 68, 56];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 7, opacity: 0.22, padding: "0 4px" }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 7, height: h, borderRadius: "3px 3px 1px 1px",
          background: `linear-gradient(to top, #3A2213, #7A4E2A, ${color}99)`,
          boxShadow: `0 0 6px ${color}22`,
        }} />
      ))}
      {/* ember tip */}
      <div style={{ width: 4, height: 8, borderRadius: "50% 50% 40% 40%",
        background: "radial-gradient(circle,#ff6a00,#ff450066)", marginLeft: -2 }} />
    </div>
  );
}

function SilhouetteDecanter({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 84" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: 38, height: 66, opacity: 0.22 }}>
      {/* stopper */}
      <rect x="19" y="0" width="10" height="6" rx="2" stroke={color} strokeWidth="1.2" />
      {/* neck */}
      <rect x="21" y="6" width="6" height="14" rx="1" stroke={color} strokeWidth="1.2" />
      {/* shoulder */}
      <path d="M21 20 Q12 28 10 42 L10 78 Q10 82 24 82 Q38 82 38 78 L38 42 Q36 28 27 20 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}14`} />
      {/* liquid line */}
      <path d="M12 55 Q24 58 36 55" stroke={color} strokeWidth="0.8" opacity="0.5" />
      {/* label rect */}
      <rect x="14" y="58" width="20" height="14" rx="2"
        stroke={color} strokeWidth="0.8" fill={`${color}0A`} />
    </svg>
  );
}

function SilhouetteBeerGlass({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 76" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: 32, height: 62, opacity: 0.22 }}>
      {/* foam */}
      <ellipse cx="20" cy="8" rx="16" ry="7" stroke={color} strokeWidth="1.2" fill={`${color}28`} />
      {/* body */}
      <path d="M6 14 L10 72 Q10 74 20 74 Q30 74 30 72 L34 14 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}10`} />
      {/* bubbles */}
      <circle cx="14" cy="45" r="2" stroke={color} strokeWidth="0.7" opacity="0.5" />
      <circle cx="22" cy="34" r="1.5" stroke={color} strokeWidth="0.7" opacity="0.5" />
      <circle cx="18" cy="57" r="1" stroke={color} strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

function SilhouetteWineGlass({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 88" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: 34, height: 70, opacity: 0.22 }}>
      {/* bowl */}
      <path d="M8 4 Q4 26 16 40 Q20 46 22 46 Q24 46 28 40 Q40 26 36 4 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}12`} />
      {/* wine fill */}
      <path d="M12 26 Q14 34 22 38 Q30 34 32 26 Q22 30 12 26 Z"
        fill={`${color}28`} />
      {/* stem */}
      <line x1="22" y1="46" x2="22" y2="76" stroke={color} strokeWidth="1.2" />
      {/* base */}
      <path d="M10 76 Q10 80 22 80 Q34 80 34 76 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}18`} />
    </svg>
  );
}

const SILHOUETTES: Record<string, (color: string) => React.ReactNode> = {
  smoke: (c) => <SilhouetteCigar color={c} />,
  pour:  (c) => <SilhouetteDecanter color={c} />,
  brew:  (c) => <SilhouetteBeerGlass color={c} />,
  wine:  (c) => <SilhouetteWineGlass color={c} />,
};

const KB_MOVES = [
  { scale: [1.08, 1.18], x: ["0%", "-3%"], y: ["0%", "-2%"] },
  { scale: [1.10, 1.06], x: ["-2%", "2%"], y: ["0%", "2%"]  },
  { scale: [1.06, 1.14], x: ["2%", "-2%"], y: ["-2%", "0%"] },
  { scale: [1.12, 1.07], x: ["0%", "3%"],  y: ["2%", "-2%"] },
];

function LiquidTileBg({ craftId, color }: { craftId: string; color: string }) {
  const pool     = TILE_BG[craftId] ?? TILE_BG.smoke!;
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
              backgroundPosition: "center 30%",
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

// ── Mood options ──────────────────────────────────────────────────────────────

// ── Mood mark SVGs — premium engraved marks, no emoji ────────────────────────
function MoodMark({ id, color }: { id: string; color: string }) {
  if (id === "chill") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="4.5" stroke={color} strokeWidth="1.2" />
      {[0,45,90,135,180,225,270,315].map(deg => {
        const r = deg * Math.PI / 180;
        const x1 = 9 + 5.5 * Math.cos(r); const y1 = 9 + 5.5 * Math.sin(r);
        const x2 = 9 + 7.5 * Math.cos(r); const y2 = 9 + 7.5 * Math.sin(r);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" strokeLinecap="round" />;
      })}
    </svg>
  );
  if (id === "deep") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M13.5 9.5C13.5 12.538 11.037 15 8 15C4.962 15 2.5 12.538 2.5 9.5C2.5 6.735 4.518 4.45 7.18 4.03C6.5 5.02 6.1 6.21 6.1 7.5C6.1 10.538 8.562 13 11.6 13C12.26 13 12.9 12.882 13.5 12.67C13.5 11.96 13.5 10.73 13.5 9.5Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
  if (id === "premium") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L10.5 6.5H15.5L11.5 9.5L13 14L9 11L5 14L6.5 9.5L2.5 6.5H7.5L9 2Z" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6.5" cy="9" r="2.5" stroke={color} strokeWidth="1.1" />
      <circle cx="11.5" cy="9" r="2.5" stroke={color} strokeWidth="1.1" />
      <line x1="9" y1="9" x2="9" y2="9" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}

const MOOD_OPTIONS = [
  { id: "chill",   label: "Chill Mode"   },
  { id: "deep",    label: "Deep Session" },
  { id: "premium", label: "Premium"      },
  { id: "social",  label: "Social"       },
];

// ── CraftCard — premium genre-isolated portal tile ───────────────────────────

function CraftCard({
  mod,
  isPrimary = false,
  onTrigger,
}: {
  mod:        { id: string; title: string; tagline: string; badge: string; route: string; color: string };
  isPrimary?: boolean;
  onTrigger:  () => void;
}) {
  const [pressed,  setPressed]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const pool      = TILE_BG[mod.id] ?? TILE_BG.smoke!;
  const [sceneIdx, setSceneIdx] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const swipeX    = useRef(0);
  const genre     = GENRE[mod.id as keyof typeof GENRE] ?? GENRE.smoke;
  const fallback  = TILE_FALLBACK[mod.id] ?? TILE_FALLBACK.smoke!;

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSceneIdx(i => (i + 1) % pool.length);
      setImgError(false);
    }, 6000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  return (
    <motion.div
      style={{
        position:                "relative",
        height:                  "100%",
        minHeight:               0,
        overflow:                "hidden",
        cursor:                  "pointer",
        touchAction:             "pan-y",
        userSelect:              "none",
        WebkitTapHighlightColor: "transparent",
        background:              "#000000",
      }}
      animate={{ scale: pressed ? 0.985 : 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      onPointerDown={(e) => { setPressed(true); swipeX.current = e.clientX; playTactile(); }}
      onPointerUp={(e) => {
        setPressed(false);
        const dx = e.clientX - swipeX.current;
        if (Math.abs(dx) > 44) {
          setSceneIdx(i => dx < 0 ? (i + 1) % pool.length : (i - 1 + pool.length) % pool.length);
          setImgError(false);
          resetTimer();
        } else {
          onTrigger();
        }
      }}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      {/* ── Background: high-res scene image with CSS gradient fallback ── */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${mod.id}-${sceneIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        >
          {imgError ? (
            /* Genre silhouette — elegant minimal outline on deep obsidian */
            <div style={{
              position: "absolute", inset: 0,
              background: fallback,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <motion.div
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {(SILHOUETTES[mod.id] ?? SILHOUETTES.smoke)!(genre.accent)}
              </motion.div>
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1.04, 1.10], x: ["0%", "-2%"], y: ["0%", "-2%"] }}
              transition={{ duration: 7, ease: "linear" }}
              style={{
                width: "112%", height: "112%",
                position: "absolute", top: "-6%", left: "-6%",
                backgroundImage:    `url(${pool[sceneIdx]})`,
                backgroundSize:     "cover",
                backgroundPosition: "center 30%",
              }}
              onError={() => setImgError(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Genre-tinted dark overlay (60–75%) ── */}
      <div style={{
        position:      "absolute",
        inset:         0,
        zIndex:        2,
        background:    `linear-gradient(170deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.48) 45%, rgba(0,0,0,0.78) 100%)`,
        pointerEvents: "none",
      }} />

      {/* ── Genre accent glow — bottom edge ── */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     "50%",
        zIndex:     3,
        background: `linear-gradient(0deg, ${genre.accentGlow} 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* ── Top-left: Obsidian Glass genre badge chip ── */}
      <div style={{
        position:             "absolute",
        top:                  18,
        left:                 18,
        zIndex:               6,
        display:              "flex",
        alignItems:           "center",
        gap:                  7,
        background:           "rgba(0,0,0,0.72)",
        backdropFilter:       "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius:         24,
        padding:              "6px 16px",
        border:               `1px solid ${genre.border}`,
        boxShadow:            `0 0 14px ${genre.accentDim}`,
      }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: genre.accent,
            boxShadow: `0 0 8px ${genre.accent}`,
            flexShrink: 0,
          }}
        />
        <span style={{
          fontSize:      14,
          color:         genre.accent,
          fontWeight:    800,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          fontFamily:    "inherit",
          whiteSpace:    "nowrap",
        }}>
          {genre.label}
        </span>
      </div>

      {/* ── Scene progress dots — top right ── */}
      <div style={{
        position:   "absolute",
        top:        24,
        right:      18,
        zIndex:     6,
        display:    "flex",
        gap:        5,
        alignItems: "center",
      }}>
        {pool.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === sceneIdx ? 20 : 6, opacity: i === sceneIdx ? 1 : 0.35 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{
              height:       5,
              borderRadius: 3,
              background:   genre.accent,
            }}
          />
        ))}
      </div>

      {/* ── Bottom: Obsidian Glass content panel ── */}
      <div style={{
        position:             "absolute",
        bottom:               0,
        left:                 0,
        right:                0,
        zIndex:               6,
        padding:              isPrimary ? "28px 28px 32px" : "18px 20px 22px",
        background:           "linear-gradient(to top, rgba(8,8,12,0.90) 0%, rgba(8,8,12,0.62) 100%)",
        backdropFilter:       "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop:            "1px solid rgba(255,255,255,0.06)",
      }}>
        <h3 style={{
          margin:        0,
          fontFamily:    "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
          fontSize:      isPrimary ? "clamp(32px, 3.6vw, 46px)" : "clamp(22px, 2.4vw, 32px)",
          fontWeight:    300,
          color:         genre.accent,
          letterSpacing: "0.22em",
          textTransform: "uppercase" as const,
          lineHeight:    1.05,
          textShadow:    `0 0 40px ${genre.accentGlow}`,
        }}>
          {mod.title}
        </h3>
        <p style={{
          margin:        "8px 0 0",
          fontSize:      isPrimary ? 16 : 13,
          color:         "rgba(245,235,215,0.32)",
          letterSpacing: "0.18em",
          lineHeight:    1.5,
          fontWeight:    400,
          textTransform: "uppercase" as const,
        }}>
          {mod.tagline}
        </p>
        {isPrimary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           10,
              marginTop:     18,
              padding:       "12px 24px",
              background:    genre.bg,
              border:        `1px solid ${genre.border}`,
              borderRadius:  8,
              backdropFilter:"blur(12px)",
            }}
          >
            <Sparkles size={16} color={genre.accent} />
            <span style={{
              fontSize:      16,
              fontWeight:    700,
              color:         genre.accent,
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
            }}>
              BEGIN EXPERIENCE
            </span>
          </motion.div>
        )}
      </div>

      {/* ── COMING SOON overlay — secondary tiles only ── */}
      {!isPrimary && (
        <div style={{
          position:             "absolute",
          top:                  0, left: 0, right: 0, bottom: 0,
          zIndex:               8,
          pointerEvents:        "none",
          display:              "flex",
          flexDirection:        "column",
          alignItems:           "center",
          justifyContent:       "center",
          background:           "rgba(0,0,0,0.38)",
          backdropFilter:       "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}>
          <div style={{
            display:              "flex",
            alignItems:           "center",
            gap:                  8,
            background:           "rgba(0,0,0,0.72)",
            backdropFilter:       "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border:               "1px solid rgba(184,138,0,0.40)",
            borderRadius:         6,
            padding:              "6px 16px",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#B88A00", opacity: 0.7 }} />
            <span style={{
              fontSize:      10,
              fontWeight:    800,
              letterSpacing: "0.30em",
              color:         "#B88A00",
              textTransform: "uppercase" as const,
              fontFamily:    "inherit",
            }}>
              COMING SOON
            </span>
          </div>
        </div>
      )}

      {/* ── Razor-thin genre accent border ring ── */}
      <GlowRing color={genre.accent} />
    </motion.div>
  );
}


// ── Craft portal glow ring ────────────────────────────────────────────────────

function GlowRing({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position:    "absolute",
        inset:       0,
        borderRadius: 0,
        border:       `1px solid ${color}18`,
        pointerEvents: "none",
        zIndex:       10,
      }}
      animate={{ opacity: [0.4, 0.9, 0.4] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
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

// ── HTML5 SmokeCanvas — drifting smoke particles, z-9996 ─────────────────────
function SmokeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function resize() { canvas!.width = canvas!.offsetWidth; canvas!.height = canvas!.offsetHeight; }
    resize();
    window.addEventListener("resize", resize);
    type Particle = { x: number; y: number; r: number; opacity: number; vx: number; vy: number };
    const W = () => canvas!.width || 1280;
    const H = () => canvas!.height || 900;
    const particles: Particle[] = Array.from({ length: 52 }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      r: 30 + Math.random() * 70, opacity: 0.012 + Math.random() * 0.032,
      vx: (Math.random() - 0.5) * 0.22, vy: -0.38 - Math.random() * 0.65,
    }));
    let rafId: number;
    function draw() {
      ctx!.clearRect(0, 0, W(), H());
      for (const p of particles) {
        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(232,224,208,${p.opacity})`);
        g.addColorStop(1, "rgba(232,224,208,0)");
        ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx!.fill();
        p.x += p.vx; p.y += p.vy; p.r += 0.22; p.opacity -= 0.00022;
        if (p.y < -p.r || p.opacity <= 0) {
          p.x = Math.random() * W(); p.y = H() + 30;
          p.r = 22 + Math.random() * 48; p.opacity = 0.018 + Math.random() * 0.028;
        }
      }
      rafId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 9996, pointerEvents: "none" }} />;
}

// ── Ambient burning cigar at absolute bottom ──────────────────────────────────
function AmbientCigar() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 9997, pointerEvents: "none" }}>
      <div style={{ position: "relative", width: 200, height: 22 }}>
        <div style={{ position: "absolute", left: 20, top: 7, width: 155, height: 8, background: "linear-gradient(90deg,#3d1a08 0%,#6b3a1a 28%,#8b5e30 58%,#c8a06a 100%)", borderRadius: "2px 0 0 2px" }} />
        <div style={{ position: "absolute", right: 0, top: 5, width: 26, height: 12, background: "linear-gradient(90deg,#c8a06a,#e8c88a)", borderRadius: "0 8px 8px 0" }} />
        <div style={{ position: "absolute", left: 4, top: 6, width: 20, height: 10, background: "linear-gradient(90deg,transparent,#bab6b0,#e0ddd8)", borderRadius: "2px 0 0 2px", opacity: 0.9 }} />
        <motion.div
          animate={{ opacity: [0.55, 1, 0.5, 0.9, 0.55], scale: [1, 1.25, 0.88, 1.1, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: -4, top: 2, width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle,#ff6a00 0%,#ff4500 42%,transparent 80%)", boxShadow: "0 0 14px 5px rgba(255,100,0,0.55)" }}
        />
      </div>
    </div>
  );
}

// ── Generic cinematic landing overlay — PourCraft / BrewCraft / WineCraft ─────
interface CraftLandingConfig {
  genreKey:   "pour" | "brew" | "wine";
  title:      string;
  subtitle:   string;
  cta:        string;
  bgImage:    string;
  fallback:   string;
  accent:     string;
  accentRgba: string;
  borderRgba: string;
}

const CRAFT_LANDING_CONFIG: Record<"pour" | "brew" | "wine", CraftLandingConfig> = {
  pour: {
    genreKey:   "pour",
    title:      "The Craft of the Pour",
    subtitle:   "NOVEE OS · PourCraft 360",
    cta:        "BEGIN SPIRITS JOURNEY",
    bgImage:    "/images/craft/pour-1.png",
    fallback:   "linear-gradient(135deg, #050404 0%, #110907 50%, #050404 100%)",
    accent:     "#C8762A",
    accentRgba: "rgba(200,118,42,0.11)",
    borderRgba: "rgba(200,118,42,0.75)",
  },
  brew: {
    genreKey:   "brew",
    title:      "The Craft of the Brew",
    subtitle:   "NOVEE OS · BrewCraft 360",
    cta:        "BEGIN BREW JOURNEY",
    bgImage:    "/images/craft/brew-1.png",
    fallback:   "linear-gradient(135deg, #040403 0%, #0f0c05 50%, #040403 100%)",
    accent:     "#B8882A",
    accentRgba: "rgba(184,136,42,0.11)",
    borderRgba: "rgba(184,136,42,0.75)",
  },
  wine: {
    genreKey:   "wine",
    title:      "The Craft of the Vine",
    subtitle:   "NOVEE OS · WineCraft 360",
    cta:        "BEGIN WINE JOURNEY",
    bgImage:    "/images/craft/wine-1.png",
    fallback:   "linear-gradient(135deg, #040203 0%, #0e0407 50%, #040203 100%)",
    accent:     "#9B2335",
    accentRgba: "rgba(155,35,53,0.11)",
    borderRgba: "rgba(155,35,53,0.75)",
  },
};

function CraftLandingOverlay({ genreKey, onClose, onBegin }: { genreKey: "pour" | "brew" | "wine"; onClose: () => void; onBegin: () => void }) {
  const cfg = CRAFT_LANDING_CONFIG[genreKey];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9995, overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: cfg.fallback,
      }}
    >
      {/* Layer 1: Background photo */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          backgroundImage: `url(${cfg.bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center 55%",
          filter: "saturate(1.05) contrast(1.08) brightness(0.82)",
        }}
      />

      {/* Layer 2: Cinematic gradient overlay — max 0.25 opacity */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      {/* Edge vignette — max 0.25 opacity */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      {/* Layer 3: Diffused genre glow core */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -52%)",
          width: "80vw", height: "55vh",
          background: `radial-gradient(ellipse at center, ${cfg.accentRgba.replace("0.11)", "0.18)")} 0%, transparent 65%)`,
          filter: "blur(72px)",
          zIndex: 3, pointerEvents: "none",
        }}
      />

      {/* Layer 4: UI foreground */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 520, padding: "0 36px" }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.9 }}
          style={{ fontSize: 13, letterSpacing: "0.52em", textTransform: "uppercase", color: cfg.accent.replace(")", ",0.55)").replace("rgb", "rgba"), marginBottom: 20, fontFamily: "inherit" }}
        >
          {cfg.subtitle}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: "var(--app-font-serif,'Cormorant Garamond',Georgia,serif)", fontSize: "clamp(2.4rem,5.5vw,4.4rem)", fontWeight: 300, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F0E8D4", margin: "0 0 48px", lineHeight: 1.05, textShadow: `0 2px 48px ${cfg.accentRgba}` }}
        >
          {cfg.title}
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.8 }}
          whileHover={{ scale: 1.02, boxShadow: `0 0 64px ${cfg.accentRgba},0 4px 28px rgba(0,0,0,0.6)` }}
          whileTap={{ scale: 0.97, y: 2 }}
          onClick={() => { playTactile(); onBegin(); }}
          style={{ display: "block", width: "100%", padding: "28px 40px", marginBottom: 18, background: `linear-gradient(135deg,${cfg.accentRgba} 0%,rgba(0,0,0,0.18) 100%)`, border: `2px solid ${cfg.borderRgba}`, borderRadius: 14, cursor: "pointer", fontSize: 18, fontWeight: 900, color: cfg.accent, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "inherit", boxShadow: `0 0 44px ${cfg.accentRgba},0 4px 20px rgba(0,0,0,0.5)`, minHeight: 86, touchAction: "manipulation", backdropFilter: "blur(12px)" }}
        >
          {cfg.cta}
        </motion.button>
      </div>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        onClick={onClose}
        style={{ position: "absolute", top: 22, left: 22, background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 14px", zIndex: 20 }}
      >
        ← Back
      </motion.button>
    </motion.div>
  );
}

// ── Glassmorphic PIN authentication modal overlay ────────────────────────────

function PinModal({ onClose }: { onClose: () => void }) {
  const [, navigate]   = useLocation();
  // pinRef is the authoritative value — always current, immune to stale closures
  const pinRef         = useRef("");
  const [pinLen,       setPinLen]    = useState(0);   // drives dot display only
  const [error,        setError]     = useState(false);
  const submittingRef  = useRef(false);
  const [flashGreen,   setFlashGreen] = useState(false);
  const MAX = 4;

  function playKey() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 3400; o.type = "sine";
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.08);
    } catch { /* silent */ }
  }

  async function submit(fullPin: string) {
    submittingRef.current = true; setError(false);

    if (import.meta.env.DEV && fullPin === "2501") {
      localStorage.setItem("axiom_token", "dev_token_2501");
      setFlashGreen(true);
      setTimeout(() => { onClose(); navigate("/transaction"); }, 300);
      return;
    }

    try {
      const res  = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      const data = await res.json() as { ok: boolean; token?: string; dest?: string };
      if (data.ok && data.token) {
        localStorage.setItem("axiom_token", data.token);
        setFlashGreen(true);
        setTimeout(() => { onClose(); navigate(data.dest ?? "/operations"); }, 300);
      } else {
        setError(true);
        pinRef.current = ""; setPinLen(0);
        submittingRef.current = false;
        setTimeout(() => setError(false), 900);
      }
    } catch {
      setError(true);
      pinRef.current = ""; setPinLen(0);
      submittingRef.current = false;
      setTimeout(() => setError(false), 900);
    }
  }

  // onPointerDown fires once per physical press (no synthetic re-fire on touch)
  function pressDigit(e: React.PointerEvent, d: string) {
    e.preventDefault();
    if (submittingRef.current || pinRef.current.length >= MAX) return;
    playKey();
    const next = pinRef.current + d;
    pinRef.current = next;
    setPinLen(next.length);
    if (next.length === MAX) void submit(next);
  }

  function pressBack(e: React.PointerEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    const next = pinRef.current.slice(0, -1);
    pinRef.current = next;
    setPinLen(next.length);
  }

  const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","⌫"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onPointerDown={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(0,0,0,0.86)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onPointerDown={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440,
          background: "#0A0704",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: "22px 22px 0 0",
          padding: "32px 28px 48px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
          boxShadow: "0 -16px 56px rgba(0,0,0,0.72), 0 -4px 24px rgba(212,175,55,0.10)",
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.36em", color: "rgba(212,175,55,0.40)", textTransform: "uppercase" }}>NOVEE OS · Enterprise</p>
            <h3 style={{ margin: "5px 0 0", fontSize: 18, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.10em", textTransform: "uppercase" }}>[ TRANSACTION ] ACCESS</h3>
          </div>
          <button
            onPointerDown={e => { e.stopPropagation(); onClose(); }}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "rgba(255,255,255,0.35)" }}>
            <X size={16} />
          </button>
        </div>

        {/* PIN dots */}
        <motion.div
          animate={error ? { x: [-8, 8, -6, 6, -4, 4, 0] } : flashGreen ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.32 }}
          style={{ display: "flex", gap: 20, marginBottom: 36 }}
        >
          {Array.from({ length: MAX }).map((_, i) => (
            <div key={i} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: flashGreen ? "#4ade80" : error ? "#ef4444" : i < pinLen ? "#D4AF37" : "transparent",
              border: `2px solid ${flashGreen ? "#4ade80" : error ? "#ef4444" : i < pinLen ? "#D4AF37" : "rgba(212,175,55,0.25)"}`,
              transition: "background 0.12s, border-color 0.12s",
              boxShadow: i < pinLen ? `0 0 12px ${flashGreen ? "#4ade8070" : "#D4AF3760"}` : "none",
            }} />
          ))}
        </motion.div>

        {/* Keypad — plain buttons, CSS only (no GPU compositing layers) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: "100%" }}>
          {KEYS.map(k => (
            <KeyPad
              key={k}
              label={k}
              onPointerDown={k === "⌫" ? pressBack : k === "*" ? undefined : (e) => pressDigit(e, k)}
            />
          ))}
        </div>

        {submittingRef.current && !flashGreen && (
          <p style={{ marginTop: 22, fontSize: 11, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase" }}>Authenticating…</p>
        )}
      </motion.div>
    </motion.div>
  );
}

function KeyPad({ label, onPointerDown }: {
  label:         string;
  onPointerDown: ((e: React.PointerEvent) => void) | undefined;
}) {
  const blank = label === "*";
  if (blank) return <div style={{ height: 66 }} />;

  return (
    <button
      onPointerDown={onPointerDown}
      style={{
        height: 66, borderRadius: 12,
        border: "1px solid rgba(212,175,55,0.22)",
        background: "rgba(212,175,55,0.05)",
        cursor: "pointer",
        color: label === "⌫" ? "rgba(212,175,55,0.75)" : "#F0E8D4",
        fontSize: 22, fontWeight: 700, fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "manipulation", userSelect: "none",
        transition: "background 0.07s, transform 0.07s",
      }}
      onPointerEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.14)"; }}
      onPointerLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.05)"; }}
    >
      {label}
    </button>
  );
}

// ── Main hub page ─────────────────────────────────────────────────────────────

function CraftHubInner() {
  const [, navigate]   = useLocation();
  const glowCtrl       = useAnimation();
  const { guestProfile } = useGuestProfile();
  const [showReturn,   setShowReturn]  = useState(false);
  const [portal,       setPortal]      = useState<{ route: string; color: string } | null>(null);
  const [craftOverlay, setCraftOverlay] = useState<{ genreKey: "pour" | "brew" | "wine"; route: string; color: string } | null>(null);
  const [mood,         setMood]        = useState("deep");
  const [showPinModal, setShowPinModal] = useState(false);

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
      position:        "fixed",
      inset:           0,
      overflow:        "hidden",
      backgroundColor: "#000000",
      color:           C.text,
      fontFamily:      "var(--app-font-sans, system-ui, sans-serif)",
    }}>

      {/* ── Cinematic background stack: black base + photo + 72% overlay + video ── */}
      <CinematicBackground />

      {/* ── Floating particles ── */}
      <AmbientParticles />

      {/* ── Top OS header — 3-Zone E.A.T. Command Bar ── */}
      <header style={{
        position:       "absolute",
        top:            0,
        left:           0,
        right:          0,
        zIndex:         10,
        display:        "flex",
        alignItems:     "center",
        minHeight:      90,
        padding:        "0 28px",
        borderBottom:   "1px solid rgba(212,175,55,0.35)",
        background:     "rgba(0,0,0,0.88)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        gap:            0,
        pointerEvents:  "none",
      }}>

        {/* ── Left Console Zone: Brand logo mark + live engine dot ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" as const, gap: 5, pointerEvents: "auto", paddingRight: 32, borderRight: "1px solid rgba(255,255,255,0.08)", marginRight: 28 }}>
          {/* SMOKECRAFT 360 — cockpit wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   C.gold,
              flexShrink:   0,
              boxShadow:    `0 0 8px ${C.goldDim}`,
            }} />
            <span style={{
              color:         C.gold,
              fontSize:      17,
              fontWeight:    900,
              letterSpacing: "0.30em",
              textTransform: "uppercase" as const,
              fontFamily:    "inherit",
              whiteSpace:    "nowrap" as const,
            }}>
              SMOKECRAFT 360
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Primary brand mark — CraftHub logo asset */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
            >
              <img
                src={craftHubLogo}
                alt="CraftHub"
                style={{
                  height:       52,
                  width:        "auto",
                  objectFit:    "contain",
                  objectPosition: "left center",
                  filter:       "brightness(1.08) contrast(1.05) drop-shadow(0 0 8px rgba(212,175,55,0.30))",
                  maxWidth:     200,
                }}
              />
            </motion.div>
            {/* Separator hairline */}
            <div style={{ width: 1, height: 36, background: "rgba(212,175,55,0.22)", flexShrink: 0 }} />
            {/* E.A.T. logo + status stack */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <motion.div
                  animate={{ opacity: [1, 0.22, 1], scale: [1, 1.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 12px #4ade80cc", flexShrink: 0 }}
                />
                <img
                  src={eatLogo}
                  alt="E.A.T. Console"
                  style={{
                    height:    22,
                    width:     "auto",
                    objectFit: "contain",
                    filter:    "brightness(1.05) drop-shadow(0 0 5px rgba(212,175,55,0.22))",
                    maxWidth:  140,
                  }}
                />
              </div>
              <span style={{ color: "#4ade80", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontWeight: 700, paddingLeft: 18, whiteSpace: "nowrap" }}>
                REVENUE ENGINE: ACTIVE
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Central E.A.T. Gateway — 3 large touchscreen command badges ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, pointerEvents: "auto" }}>
          {([
            { code: "ENVIRONMENT",  label: "AMBIENCE & LIGHTING",    action: () => navigate("/environment")  },
            { code: "ASSET VAULT",  label: "INVENTORY LEDGER",        action: () => navigate("/inventory")    },
            { code: "TRANSACTION",  label: "SOMMELIER UP-SELL",       action: () => setShowPinModal(true)     },
          ] as Array<{ code: string; label: string; action: () => void }>).map(badge => (
            <motion.button
              key={badge.code}
              whileHover={{ scale: 1.04, background: "rgba(212,175,55,0.16)", boxShadow: "0 0 28px rgba(212,175,55,0.18)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { playTactile(); badge.action(); }}
              style={{
                background:    "rgba(212,175,55,0.07)",
                border:        "1px solid rgba(212,175,55,0.45)",
                borderRadius:  12,
                padding:       "16px 32px",
                cursor:        "pointer",
                display:       "flex",
                flexDirection: "column" as const,
                alignItems:    "center",
                gap:           6,
                minWidth:      150,
                fontFamily:    "inherit",
                touchAction:   "manipulation",
                boxShadow:     "0 0 14px rgba(212,175,55,0.06)",
              }}>
              <span style={{ color: C.gold, fontSize: 22, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                [ {badge.code} ]
              </span>
              <span style={{ color: C.muted, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                {badge.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Right Console Zone: status + identity + gate ── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 5, paddingLeft: 32, borderLeft: "1px solid rgba(255,255,255,0.08)", marginLeft: 28, pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {guestProfile ? (
              <SovereignLogoutBadge guestProfile={guestProfile} accent={C.gold} />
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ background: "rgba(212,175,55,0.10)" }}
                onClick={() => setShowReturn(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: `1px solid ${C.goldDim}`, borderRadius: 8, padding: "10px 18px", color: C.muted, fontSize: 16, letterSpacing: "0.10em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit" }}>
                <RotateCcw size={14} color={C.goldDim} />
                Returning?
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ boxShadow: "0 0 28px rgba(212,175,55,0.30)" }}
              onClick={() => navigate("/gate")}
              style={{ background: "rgba(212,175,55,0.12)", border: "1.5px solid rgba(212,175,55,0.60)", borderRadius: 10, cursor: "pointer", fontSize: 20, fontWeight: 900, color: C.gold, letterSpacing: "0.09em", textTransform: "uppercase" as const, padding: "10px 20px", fontFamily: "inherit", whiteSpace: "nowrap", touchAction: "manipulation" }}>
              GATE
            </motion.button>
            <AudioWaveToggle />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              animate={{ opacity: [1, 0.32, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 10, height: 10, borderRadius: "50%", background: C.gold, flexShrink: 0, boxShadow: `0 0 10px ${C.goldDim}` }}
            />
            <span style={{ color: C.muted, fontSize: 16, letterSpacing: "0.20em", textTransform: "uppercase" as const, fontWeight: 700, whiteSpace: "nowrap" }}>
              SOVEREIGN STATUS // ONLINE
            </span>
          </div>
        </motion.div>
      </header>

      {/* ── AI intelligence status bar — floating strip below header ── */}
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
        <IntelStatusBar />
      </div>

      {/* ── Level 3: SMOKECRAFT 360 full top + 3 portals bottom row ── */}
      <div
        style={{
          position:      "absolute",
          top:           140,
          bottom:        48,
          left:          0,
          right:         0,
          display:       "flex",
          flexDirection: "column",
          zIndex:        5,
        }}
      >
        {/* SMOKECRAFT 360 — full width, primary hero (~56%) */}
        <div style={{ flex: "0 0 56%", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <CraftCard
            mod={CRAFT_MODULES[0]!}
            isPrimary
            onTrigger={() => {
              navigate("/master-blender");
              try { ExperienceFlowEngine.startCraft(CRAFT_MODULES[0]!.id); } catch { /* non-blocking */ }
              try { SovereignOrchestrator.startCraft("smoke"); void SovereignOrchestrator.transitionTo("ritual_intro"); } catch { /* non-blocking */ }
            }}
          />
        </div>

        {/* POURCRAFT · BEERCRAFT · WINECRAFT — bottom row (~44%) */}
        <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "row" }}>
          {CRAFT_MODULES.slice(1).map((mod, i) => (
            <div
              key={mod.id}
              style={{
                flex:        "1 1 0",
                position:    "relative",
                overflow:    "hidden",
                borderRight: i < CRAFT_MODULES.slice(1).length - 1
                  ? `1px solid rgba(212,175,55,0.12)`
                  : "none",
              }}
            >
              <CraftCard
                mod={mod}
                onTrigger={() => {
                  ExperienceFlowEngine.startCraft(mod.id);
                  if (mod.id === "pour" || mod.id === "brew" || mod.id === "wine") {
                    navigate(mod.route);
                  } else {
                    setPortal({ route: mod.route, color: mod.color });
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Partner LogoAnchors — float just above ticker ── */}
      <div style={{ position: "absolute", bottom: 36, left: 0, right: 0, zIndex: 11, pointerEvents: "none" }}>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1 }}>
            <LogoAnchor partner="DayOne360" variant="bar" />
          </div>
          <div style={{ flex: 1 }}>
            <LogoAnchor partner="WifeX" variant="bar" />
          </div>
        </div>
      </div>


      {/* ── Fast Return Modal ── */}
      <AnimatePresence>
        {showReturn && <FastReturnModal onClose={() => setShowReturn(false)} />}
      </AnimatePresence>

      {/* ── PIN Authentication modal — fires on [TRANSACTION] badge tap ── */}
      <AnimatePresence>
        {showPinModal && <PinModal onClose={() => setShowPinModal(false)} />}
      </AnimatePresence>

      {/* ── Genre landing overlays — fire on PourCraft / BrewCraft / WineCraft tap ── */}
      <AnimatePresence>
        {craftOverlay && (
          <CraftLandingOverlay
            genreKey={craftOverlay.genreKey}
            onClose={() => setCraftOverlay(null)}
            onBegin={() => { setCraftOverlay(null); setPortal({ route: craftOverlay.route, color: craftOverlay.color }); }}
          />
        )}
      </AnimatePresence>

      {/* ── Fixed Sovereign Gate FAB — always visible on all screen sizes ── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.93 }}
        whileHover={{ boxShadow: "0 0 40px rgba(212,175,55,0.40), 0 4px 20px rgba(0,0,0,0.6)" }}
        onClick={() => navigate("/gate")}
        style={{
          position:             "fixed",
          bottom:               80,
          right:                24,
          zIndex:               120,
          background:           "rgba(0,0,0,0.82)",
          border:               "1.5px solid rgba(212,175,55,0.72)",
          borderRadius:         16,
          cursor:               "pointer",
          padding:              "16px 22px",
          display:              "flex",
          flexDirection:        "column" as const,
          alignItems:           "center",
          gap:                  5,
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:            "0 0 28px rgba(212,175,55,0.24), 0 4px 14px rgba(0,0,0,0.55)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginBottom: 2 }}>
          <polygon points="10,2 17.3,6 17.3,14 10,18 2.7,14 2.7,6" stroke={C.gold} strokeWidth="1.2" fill="none" />
          <polygon points="10,5 14.5,7.5 14.5,12.5 10,15 5.5,12.5 5.5,7.5" stroke={C.gold} strokeWidth="0.7" fill="none" opacity="0.45" />
        </svg>
        <span style={{
          fontSize:      14,
          fontWeight:    800,
          color:         C.gold,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
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
