/**
 * CraftHub — Axiom OS cinematic command portal.
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

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Sparkles, Cpu, Activity, RotateCcw, X } from "lucide-react";
import { PreferenceProvider }   from "@/contexts/PreferenceContext";
import { UserProfileProvider }  from "@/contexts/UserProfileContext";
import MoodControls             from "@/components/DynamicCard/MoodControls";
import DynamicCard              from "@/components/DynamicCard/DynamicCard";
import LiveEngineController     from "@/components/DynamicCard/LiveEngineController";
import { CRAFT_MODULES }        from "@/data/craftScenes";
import { useGuestProfile }      from "@/contexts/GuestProfileContext";
import TickerTape              from "@/components/TickerTape";

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
          Axiom Intelligence
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
  const [showReturn, setShowReturn] = useState(false);
  const [portal, setPortal] = useState<{ route: string; color: string } | null>(null);

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
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        7,
              padding:    "5px 10px",
              background: "rgba(212,139,0,0.07)",
              border:     `1px solid rgba(212,139,0,0.22)`,
              borderRadius: 8,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "rgba(212,139,0,0.15)",
                border: `1px solid rgba(212,139,0,0.4)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, color: C.gold, fontWeight: 700,
              }}>
                {guestProfile.firstName[0]}
              </div>
              <span style={{ fontSize: 10, color: C.goldDim, letterSpacing: "0.06em" }}>
                {guestProfile.publicId}
              </span>
            </div>
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
            Axiom OS
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
            Powered by CraftHub
          </motion.div>
        </div>

        {/* Right — staff button + module count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
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

      {/* ── Hero tagline ── */}
      <div style={{
        position:  "relative",
        zIndex:    10,
        padding:   "20px 28px 12px",
        flexShrink: 0,
        display:   "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap:       16,
        flexWrap:  "wrap",
      }}>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            style={{
              fontFamily:  "var(--app-font-serif, Georgia, serif)",
              fontSize:    "clamp(18px, 2.8vw, 30px)",
              fontWeight:  700,
              color:       C.text,
              margin:      0,
              lineHeight:  1.15,
              letterSpacing: "0.01em",
            }}
          >
            Adaptive Hospitality{" "}
            <span style={{ color: C.gold }}>Intelligence.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 11, color: C.muted, marginTop: 7, letterSpacing: "0.04em" }}
          >
            Select an experience below — the AI engine refines in real time.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MoodControls />
        </motion.div>
      </div>

      {/* ── 4 Craft Portals ── */}
      <div style={{
        flex:    1,
        padding: "0 24px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gridTemplateRows:    "repeat(2, 1fr)",
        gap:     14,
        minHeight: 0,
        position: "relative",
        zIndex:   10,
      }}>
        {CRAFT_MODULES.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12 + i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:     "relative",
              borderRadius: 22,
              overflow:     "hidden",
              minHeight:    0,
              boxShadow:    `0 4px 32px rgba(26,26,27,0.26), 0 0 0 1px ${mod.color}18`,
            }}
          >
            {/* Breathing glow ring */}
            <GlowRing color={mod.color} />

            {/* Bottom ambient glow beneath card */}
            <motion.div
              style={{
                position:   "absolute",
                bottom:     -12,
                left:       "15%",
                right:      "15%",
                height:     24,
                borderRadius: "50%",
                background: mod.color,
                filter:     "blur(18px)",
                opacity:    0.18,
                pointerEvents: "none",
                zIndex:     0,
              }}
              animate={{ opacity: [0.12, 0.32, 0.12] }}
              transition={{ duration: 3.5 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
            />

            <DynamicCard
              module={mod}
              onClick={() => setPortal({ route: mod.route, color: mod.color })}
            />
          </motion.div>
        ))}
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
      </PreferenceProvider>
    </UserProfileProvider>
  );
}
