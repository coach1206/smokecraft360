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
      display:        "flex",
      alignItems:     "center",
      gap:            24,
      padding:        "12px 28px",
      borderTop:      `1px solid ${C.border}`,
      borderBottom:   `1px solid ${C.border}`,
      background:     "rgba(26,26,27,0.08)",
      backdropFilter: "blur(10px)",
      overflowX:      "auto",
      flexShrink:     0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <Cpu size={14} color={C.goldDim} />
        <span style={{ fontSize: 12, letterSpacing: "0.18em", color: C.dim, textTransform: "uppercase", fontWeight: 600 }}>
          NOVEE Intelligence
        </span>
      </div>
      {AI_NODES.map(n => (
        <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <motion.div
            style={{ width: 8, height: 8, borderRadius: "50%", background: n.color }}
            animate={{ opacity: [1, 0.35, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.4 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{ fontSize: 12, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {n.label}
          </span>
          <span style={{ fontSize: 12, color: n.color, letterSpacing: "0.08em", fontWeight: 700 }}>
            {n.state}
          </span>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <Activity size={13} color={C.goldDim} />
        <span style={{ fontSize: 12, color: C.dim, letterSpacing: "0.10em" }}>
          {CRAFT_MODULES.reduce((s, m) => s + m.scenes.length, 0)} curated scenes
        </span>
      </div>
    </div>
  );
}

// ── Per-craft background image pool ──────────────────────────────────────────

const TILE_BG: Record<string, string[]> = {
  smoke: [
    "/images/craft/smoke-1.png",
    "/images/craft/smoke-2.png",
    "/images/craft/smoke-3.png",
  ],
  pour: [
    "/images/craft/pour-1.png",
    "/images/craft/pour-2.png",
    "/images/craft/pour-3.png",
  ],
  brew: [
    "/images/craft/brew-1.png",
    "/images/craft/brew-2.png",
    "/images/craft/brew-3.png",
  ],
  vape: [
    "/images/craft/pour-1.png",
    "/images/craft/pour-2.png",
    "/images/craft/pour-3.png",
  ],
  wine: [
    "/images/craft/wine-1.png",
    "/images/craft/wine-2.png",
    "/images/craft/wine-3.png",
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

const MOOD_OPTIONS = [
  { id: "chill",   label: "Chill Mode",   icon: "☀️" },
  { id: "deep",    label: "Deep Session", icon: "🌙" },
  { id: "premium", label: "Premium",      icon: "✦"  },
  { id: "social",  label: "Social",       icon: "🎭" },
];

// ── CraftCard — full-bleed 2×2 grid card with scene rotation ─────────────────

function CraftCard({
  mod,
  onTrigger,
}: {
  mod:       { id: string; title: string; tagline: string; badge: string; route: string; color: string };
  onTrigger: () => void;
}) {
  const [pressed,  setPressed]  = useState(false);
  const pool      = TILE_BG[mod.id] ?? TILE_BG.smoke;
  const [sceneIdx, setSceneIdx] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setSceneIdx(i => (i + 1) % pool.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pool.length]);

  return (
    <div
      style={{
        position:                   "relative",
        height:                     "100%",
        minHeight:                  0,
        borderRadius:               0,
        overflow:                   "hidden",
        cursor:                     "pointer",
        border:                     "none",
        background:                 "#0a0807",
        transform:                  pressed ? "scale(0.99)" : "scale(1)",
        transition:                 "transform 0.12s ease",
        touchAction:                "manipulation",
        userSelect:                 "none",
        WebkitTapHighlightColor:    "transparent",
      }}
      onPointerDown={() => { setPressed(true); playTactile(); }}
      onPointerUp={() => { setPressed(false); onTrigger(); }}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      {/* Cinematic background — scene rotation every 5s */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={sceneIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        >
          <motion.div
            animate={{ scale: [1.04, 1.10], x: ["0%", "-2%"], y: ["0%", "-2%"] }}
            transition={{ duration: 6, ease: "linear" }}
            style={{
              width: "110%", height: "110%",
              position: "absolute", top: "-5%", left: "-5%",
              backgroundImage:    `url(${pool[sceneIdx]})`,
              backgroundSize:     "cover",
              backgroundPosition: "center 30%",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Craft-color tinted gradient overlay */}
      <div style={{
        position:      "absolute",
        inset:         0,
        zIndex:        2,
        background:    `linear-gradient(160deg, ${mod.color}18 0%, transparent 40%, rgba(0,0,0,0.80) 100%)`,
        pointerEvents: "none",
      }} />

      {/* Top-left: craft badge chip */}
      <div style={{
        position:              "absolute",
        top:                   14,
        left:                  14,
        zIndex:                5,
        display:               "flex",
        alignItems:            "center",
        background:            "rgba(0,0,0,0.70)",
        backdropFilter:        "blur(10px)",
        WebkitBackdropFilter:  "blur(10px)",
        borderRadius:          20,
        padding:               "4px 11px",
        border:                `1px solid ${mod.color}44`,
      }}>
        <span style={{
          fontSize:      9,
          color:         mod.color,
          fontWeight:    700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontFamily:    "'Space Mono', monospace",
        }}>
          {mod.badge}
        </span>
      </div>

      {/* Top-right: scene rotation dot indicators */}
      <div style={{
        position:  "absolute",
        top:       16,
        right:     14,
        zIndex:    5,
        display:   "flex",
        gap:       4,
        alignItems: "center",
      }}>
        {pool.map((_, i) => (
          <div
            key={i}
            style={{
              width:      i === sceneIdx ? 16 : 5,
              height:     5,
              borderRadius: 3,
              background: i === sceneIdx ? mod.color : "rgba(255,255,255,0.28)",
              transition: "width 0.35s ease, background 0.35s ease",
            }}
          />
        ))}
      </div>

      {/* Bottom: craft title + tagline */}
      <div style={{ position: "absolute", bottom: 18, left: 18, right: 18, zIndex: 5 }}>
        <h3 style={{
          margin:        0,
          fontFamily:    "var(--app-font-serif, 'Cormorant Garamond', Georgia, serif)",
          fontSize:      "clamp(15px, 2vw, 22px)",
          fontWeight:    700,
          color:         C.gold,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          lineHeight:    1.1,
        }}>
          {mod.title}
        </h3>
        <p style={{
          margin:        "5px 0 0",
          fontSize:      10,
          color:         C.muted,
          letterSpacing: "0.03em",
          lineHeight:    1.4,
        }}>
          {mod.tagline}
        </p>
      </div>

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

// ── Art of the Cigar overlay — fires on SMOKECRAFT 360 tap ───────────────────
function ArtOfCigarOverlay({ onClose, onBegin, onReturning }: { onClose: () => void; onBegin: () => void; onReturning: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.85 }}
      style={{ position: "fixed", inset: 0, zIndex: 9995, background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      <SmokeCanvas />
      <AmbientCigar />

      <div style={{ position: "relative", zIndex: 9998, textAlign: "center", maxWidth: 500, padding: "0 32px" }}>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.9 }}
          style={{ fontSize: 8, letterSpacing: "0.52em", textTransform: "uppercase", color: "rgba(212,175,55,0.48)", marginBottom: 18, fontFamily: "inherit" }}
        >
          NOVEE OS · SmokeCraft 360
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: "var(--app-font-serif,'Cormorant Garamond',Georgia,serif)", fontSize: "clamp(2rem,5vw,4rem)", fontWeight: 300, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F0E8D4", margin: "0 0 44px", lineHeight: 1.1 }}
        >
          The Art of the Cigar
        </motion.h1>

        {/* BEGIN MASTERCLASS JOURNEY — oversized primary gold action block */}
        <motion.button
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 56px rgba(212,175,55,0.38),0 4px 24px rgba(0,0,0,0.5)" }}
          whileTap={{ scale: 0.97, y: 2 }}
          onClick={() => { playTactile(); onBegin(); }}
          style={{ display: "block", width: "100%", padding: "26px 40px", marginBottom: 16, background: "linear-gradient(135deg,rgba(212,175,55,0.24) 0%,rgba(212,139,0,0.16) 100%)", border: "2px solid rgba(212,175,55,0.75)", borderRadius: 14, cursor: "pointer", fontSize: 17, fontWeight: 900, color: "#D4AF37", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "inherit", boxShadow: "0 0 40px rgba(212,175,55,0.28),0 4px 18px rgba(0,0,0,0.45)", minHeight: 82, touchAction: "manipulation" }}
        >
          BEGIN MASTERCLASS JOURNEY
        </motion.button>

        {/* RETURNING MASTERCLASS GUEST */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReturning}
          style={{ display: "block", width: "100%", padding: "16px 32px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.28)", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(240,232,212,0.58)", fontFamily: "inherit", touchAction: "manipulation" }}
        >
          RETURNING MASTERCLASS GUEST
        </motion.button>
      </div>

      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        onClick={onClose}
        style={{ position: "absolute", top: 20, left: 20, background: "none", border: "none", color: "rgba(255,255,255,0.18)", cursor: "pointer", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", padding: "8px 12px", zIndex: 9999 }}
      >
        ← Back
      </motion.button>
    </motion.div>
  );
}

// ── Glassmorphic PIN authentication modal overlay ────────────────────────────

function PinModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [pin,        setPin]        = useState("");
  const [error,      setError]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const MAX = 4;

  function playKey() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 3400; o.type = "sine";
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.09);
    } catch { /* silent */ }
  }

  async function submit(fullPin: string) {
    if (submitting) return;
    setSubmitting(true); setError(false);
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin }),
      });
      const data = await res.json() as { ok: boolean; token?: string; name?: string; role?: string; dest?: string };
      if (data.ok && data.token) {
        localStorage.setItem("axiom_token", data.token);
        setFlashGreen(true);
        setTimeout(() => { onClose(); navigate(data.dest ?? "/operations"); }, 300);
      } else {
        setError(true); setPin(""); setSubmitting(false);
        setTimeout(() => setError(false), 900);
      }
    } catch { setError(true); setPin(""); setSubmitting(false); setTimeout(() => setError(false), 900); }
  }

  function pressDigit(d: string) {
    if (submitting || pin.length >= MAX) return;
    playKey();
    const next = pin + d;
    setPin(next);
    if (next.length === MAX) void submit(next);
  }

  function backspace() {
    if (submitting) return;
    setPin(p => p.slice(0, -1));
  }

  const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","⌫"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, background: "rgba(14,10,4,0.97)", backdropFilter: "blur(28px)",
          border: "1px solid rgba(212,175,55,0.28)", borderRadius: "22px 22px 0 0",
          padding: "32px 28px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
          boxShadow: "0 -12px 48px rgba(212,175,55,0.12), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.36em", color: "rgba(212,175,55,0.45)", textTransform: "uppercase" }}>NOVEE OS · Enterprise</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.10em", textTransform: "uppercase" }}>[ TRANSACTION ] ACCESS</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "rgba(255,255,255,0.35)" }}>
            <X size={16} />
          </button>
        </div>

        {/* PIN dots */}
        <motion.div
          animate={error ? { x: [-8, 8, -6, 6, -4, 4, 0] } : flashGreen ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 0.35 }}
          style={{ display: "flex", gap: 18, marginBottom: 32 }}
        >
          {Array.from({ length: MAX }).map((_, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: flashGreen ? "#4ade80" : error ? "#ef4444" : i < pin.length ? "#D4AF37" : "transparent",
              border: `2px solid ${flashGreen ? "#4ade80" : error ? "#ef4444" : i < pin.length ? "#D4AF37" : "rgba(212,175,55,0.28)"}`,
              transition: "background 0.15s, border-color 0.15s",
              boxShadow: i < pin.length ? `0 0 10px ${flashGreen ? "#4ade8066" : "#D4AF3766"}` : "none",
            }} />
          ))}
        </motion.div>

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%" }}>
          {KEYS.map(k => (
            <KeyPad key={k} label={k} onPress={() => k === "⌫" ? backspace() : k === "*" ? {} : pressDigit(k)} disabled={submitting} />
          ))}
        </div>

        {submitting && (
          <p style={{ marginTop: 20, fontSize: 11, letterSpacing: "0.22em", color: "rgba(212,175,55,0.60)", textTransform: "uppercase" }}>Authenticating…</p>
        )}
      </motion.div>
    </motion.div>
  );
}

function KeyPad({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const [pressed, setPressed] = useState(false);
  function handle() {
    if (disabled || label === "*") return;
    setPressed(true); onPress();
    setTimeout(() => setPressed(false), 100);
  }
  return (
    <motion.button
      animate={{ scale: pressed ? 0.92 : 1 }}
      transition={{ duration: 0.08 }}
      onClick={handle}
      style={{
        height: 66, borderRadius: 12, border: "1px solid rgba(212,175,55,0.22)",
        background: pressed ? "rgba(212,175,55,0.22)" : "rgba(212,175,55,0.05)",
        cursor: label === "*" ? "default" : "pointer",
        color: label === "⌫" ? "rgba(212,175,55,0.70)" : "#F0E8D4",
        fontSize: 22, fontWeight: 700, fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "manipulation", userSelect: "none",
        boxShadow: pressed ? "0 0 18px rgba(212,175,55,0.28)" : "none",
        transition: "background 0.08s, box-shadow 0.08s",
        opacity: label === "*" ? 0 : 1,
        pointerEvents: label === "*" ? "none" : "auto",
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Main hub page ─────────────────────────────────────────────────────────────

function CraftHubInner() {
  const [, navigate]   = useLocation();
  const glowCtrl       = useAnimation();
  const { guestProfile } = useGuestProfile();
  const [showReturn,   setShowReturn]  = useState(false);
  const [portal,       setPortal]      = useState<{ route: string; color: string } | null>(null);
  const [artOfCigar,   setArtOfCigar]  = useState(false);
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
      backgroundColor: "#05070b",
      color:           C.text,
      fontFamily:      "var(--app-font-sans, system-ui, sans-serif)",
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

      {/* ── Top OS header — 3-Zone E.A.T. Command Bar ── */}
      <header style={{
        position:       "absolute",
        top:            0,
        left:           0,
        right:          0,
        zIndex:         10,
        display:        "flex",
        alignItems:     "center",
        minHeight:      76,
        padding:        "0 22px",
        borderBottom:   "2px solid rgba(212,175,55,0.28)",
        background:     "rgba(5,3,1,0.96)",
        backdropFilter: "blur(24px)",
        gap:            0,
        pointerEvents:  "none",
      }}>

        {/* ── Left Console Zone: NOVEÈ OS REVENUE COMMAND + live engine dot ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" as const, gap: 4, pointerEvents: "auto", paddingRight: 28, borderRight: "1px solid rgba(255,255,255,0.07)", marginRight: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div
              animate={{ opacity: [1, 0.22, 1], scale: [1, 1.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 11, height: 11, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 13px #4ade80aa", flexShrink: 0 }}
            />
            <span style={{ color: "#D48B00", fontSize: 23, fontWeight: 900, letterSpacing: "0.07em", textTransform: "uppercase" as const, whiteSpace: "nowrap", fontFamily: "inherit" }}>
              NOVEÈ OS <span style={{ color: "rgba(212,175,55,0.40)", fontWeight: 400 }}>//</span> REVENUE COMMAND
            </span>
          </div>
          <span style={{ color: "#4ade80", fontSize: 14, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontWeight: 700, paddingLeft: 21, whiteSpace: "nowrap" }}>
            REVENUE ENGINE: ACTIVE
          </span>
        </motion.div>

        {/* ── Central E.A.T. Gateway — 3 large touchscreen command badges ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, pointerEvents: "auto" }}>
          {([
            { code: "ENVIRONMENT",  label: "TACTICAL AMBIENCE & LIGHTING",    action: () => navigate("/operations")       },
            { code: "ASSET VAULT",  label: "LIVE INVENTORY LEDGER",           action: () => navigate("/inventory")        },
            { code: "TRANSACTION",  label: "TABLE-SIDE SOMMELIER UP-SELL",    action: () => setShowPinModal(true)         },
          ] as Array<{ code: string; label: string; action: () => void }>).map(badge => (
            <motion.button
              key={badge.code}
              whileHover={{ scale: 1.03, background: "rgba(212,175,55,0.14)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { playTactile(); badge.action(); }}
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1.5px solid rgba(212,175,55,0.38)",
                borderRadius: 10,
                padding: "14px 28px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                gap: 5,
                minWidth: 130,
                fontFamily: "inherit",
                touchAction: "manipulation",
                boxShadow: "0 0 18px rgba(212,175,55,0.06)",
              }}>
              <span style={{ color: "#D4AF37", fontSize: 20, fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
                [ {badge.code} ]
              </span>
              <span style={{ color: "rgba(245,235,215,0.42)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" as const, whiteSpace: "nowrap" }}>
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
          style={{ flex: "0 0 auto", display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4, paddingLeft: 28, borderLeft: "1px solid rgba(255,255,255,0.07)", marginLeft: 24, pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {guestProfile ? (
              <SovereignLogoutBadge guestProfile={guestProfile} accent={C.gold} />
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowReturn(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid rgba(212,139,0,0.20)`, borderRadius: 7, padding: "6px 12px", color: C.dim, fontSize: 14, letterSpacing: "0.10em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit" }}>
                <RotateCcw size={12} color={C.goldDim} />
                Returning?
              </motion.button>
            )}
            <button
              onClick={() => navigate("/gate")}
              style={{ background: "rgba(212,175,55,0.10)", border: "1.5px solid rgba(212,175,55,0.52)", borderRadius: 8, cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.09em", textTransform: "uppercase" as const, padding: "9px 16px", fontFamily: "inherit", whiteSpace: "nowrap", touchAction: "manipulation" }}>
              ⬡ GATE
            </button>
            <AudioWaveToggle />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <motion.div
              animate={{ opacity: [1, 0.32, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 9, height: 9, borderRadius: "50%", background: "#D48B00", flexShrink: 0, boxShadow: "0 0 8px rgba(212,139,0,0.55)" }}
            />
            <span style={{ color: "rgba(245,235,215,0.55)", fontSize: 14, letterSpacing: "0.20em", textTransform: "uppercase" as const, fontWeight: 700, whiteSpace: "nowrap" }}>
              SOVEREIGN STATUS // ONLINE
            </span>
          </div>
        </motion.div>
      </header>

      {/* ── AI intelligence status bar — floating strip below header ── */}
      <div style={{ position: "absolute", top: 74, left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
        <IntelStatusBar />
      </div>

      {/* ── Level 3: SMOKECRAFT 360 full top + 3 portals bottom row ── */}
      <div
        style={{
          position:      "absolute",
          top:           126,
          bottom:        52,
          left:          0,
          right:         0,
          display:       "flex",
          flexDirection: "column",
          zIndex:        1,
        }}
      >
        {/* SMOKECRAFT 360 — full width (~55%) */}
        <div style={{ flex: "0 0 55%", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <CraftCard
            mod={CRAFT_MODULES[0]!}
            onTrigger={() => {
              ExperienceFlowEngine.startCraft(CRAFT_MODULES[0]!.id);
              setArtOfCigar(true);
            }}
          />
        </div>

        {/* POURCRAFT · BEERCRAFT · WINECRAFT — bottom row (~45%) */}
        <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "row" }}>
          {CRAFT_MODULES.slice(1).map((mod, i) => (
            <div
              key={mod.id}
              style={{
                flex:        "1 1 0",
                position:    "relative",
                overflow:    "hidden",
                borderRight: i < CRAFT_MODULES.slice(1).length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <CraftCard
                mod={mod}
                onTrigger={() => {
                  ExperienceFlowEngine.startCraft(mod.id);
                  setPortal({ route: mod.route, color: mod.color });
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

      {/* ── Art of the Cigar overlay — fires on SMOKECRAFT 360 tap ── */}
      <AnimatePresence>
        {artOfCigar && (
          <ArtOfCigarOverlay
            onClose={() => setArtOfCigar(false)}
            onBegin={() => { setArtOfCigar(false); navigate("/master-blender"); }}
            onReturning={() => { setArtOfCigar(false); setShowReturn(true); }}
          />
        )}
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
