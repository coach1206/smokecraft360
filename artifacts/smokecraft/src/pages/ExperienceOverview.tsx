/**
 * ExperienceOverview — EXPERIENCE_OVERVIEW step (Step 3 of the Ritual).
 * Route: /experience-overview/:type
 *
 * Single-column layout with 4 distinct interactive blocks.
 * EmberHeartbeat persists from the Cinematic Intro through this page.
 * "ENTER THE EXPERIENCE" advances via ExperienceFlowEngine.
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Flame, Brain, Zap, ArrowRight, Check, Wind, Beer, Cigarette, Sparkles, Activity } from "lucide-react";
import { getCraftTheme } from "@/lib/craftThemes";
import { ExperienceFlowEngine } from "@/lib/experienceFlowEngine";
import EmberHeartbeat from "@/components/EmberHeartbeat";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     "#060402",
  card:   "rgba(20,16,10,0.92)",
  border: "rgba(212,175,55,0.16)",
  gold:   "#D4AF37",
  ink:    "#F0E8D4",
  muted:  "rgba(240,232,212,0.50)",
  dim:    "rgba(240,232,212,0.25)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
};

// ── Per-craft overview config ─────────────────────────────────────────────────

interface OverviewConfig {
  craftLabel:  string;
  engine:      string;
  atmosphere:  string;
  icon:        React.ReactNode;
  ritualSteps: string[];
  intelligenceLines: string[];
}

function getCraftConfig(type: string, accent: string): OverviewConfig {
  const iconProps = { size: 22, color: accent };
  const configs: Record<string, OverviewConfig> = {
    smoke: {
      craftLabel: "SmokeCraft 360",
      engine:     "Connoisseur Intelligence Engine",
      atmosphere: "Aged cedar · Ember warmth · Reserve humidor",
      icon:       <Cigarette {...iconProps} />,
      ritualSteps: ["Swipe right to ADD", "Swipe left to SKIP", "Your choices train the AI in real time", "Confirm your session at the reveal"],
      intelligenceLines: ["Flavor affinity vectors: ARMED", "Reserve stock sync: LIVE", "Mentor scoring: CALIBRATED", "Pairing intelligence: ACTIVE"],
    },
    pour: {
      craftLabel: "PourCraft 360",
      engine:     "Sommelier Intelligence Engine",
      atmosphere: "Single malt · Rare spirits · Barrel-aged craft",
      icon:       <Sparkles {...iconProps} />,
      ritualSteps: ["Swipe right to ADD", "Swipe left to SKIP", "Palate signals refine with each card", "Your pour selection unlocks at the reveal"],
      intelligenceLines: ["Palate profile vectors: ARMED", "Vintage inventory sync: LIVE", "Sommelier scoring: CALIBRATED", "Pairing intelligence: ACTIVE"],
    },
    brew: {
      craftLabel: "BrewCraft 360",
      engine:     "Craft Intelligence Engine",
      atmosphere: "Barrel-aged · Craft hop profiles · Limited releases",
      icon:       <Beer {...iconProps} />,
      ritualSteps: ["Swipe right to ADD", "Swipe left to SKIP", "Hop and malt signals refine in real time", "Your brew selection reveals at the end"],
      intelligenceLines: ["Hop profile vectors: ARMED", "Tap inventory sync: LIVE", "Brew master scoring: CALIBRATED", "Pairing intelligence: ACTIVE"],
    },
    vape: {
      craftLabel: "VapeCraft 360",
      engine:     "Sensory Intelligence Engine",
      atmosphere: "Flavor clouds · Premium hardware · Elevated ritual",
      icon:       <Wind {...iconProps} />,
      ritualSteps: ["Swipe right to ADD", "Swipe left to SKIP", "Flavor and intensity signals refine live", "Your device selection unlocks at the reveal"],
      intelligenceLines: ["Flavor cloud vectors: ARMED", "Device inventory sync: LIVE", "Artisan scoring: CALIBRATED", "Pairing intelligence: ACTIVE"],
    },
  };
  return configs[type] ?? configs.smoke;
}

// ── Block components ──────────────────────────────────────────────────────────

function Block({
  index, title, accent, confirmed, onConfirm, children,
}: {
  index:     number;
  title:     string;
  accent:    string;
  confirmed: boolean;
  onConfirm: () => void;
  children:  React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:   confirmed ? `${accent}0A` : C.card,
        border:       `1px solid ${confirmed ? accent + "40" : C.border}`,
        borderRadius: 16,
        padding:      "22px 24px",
        position:     "relative",
        overflow:     "hidden",
        transition:   "border-color 0.3s, background 0.3s",
      }}
    >
      {/* Confirmed glow */}
      {confirmed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, color: `${accent}90`, fontFamily: C.mono, letterSpacing: "0.24em" }}>
            0{index + 1}
          </span>
          <span style={{ fontSize: 11, color: confirmed ? accent : C.muted, fontFamily: C.mono, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
            {title}
          </span>
        </div>
        <AnimatePresence>
          {confirmed ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              style={{ width: 22, height: 22, borderRadius: "50%", background: `${accent}20`, border: `1px solid ${accent}60`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={12} color={accent} />
            </motion.div>
          ) : (
            <motion.button key="btn" whileTap={{ scale: 0.94 }} onClick={onConfirm}
              style={{ fontSize: 8, color: C.dim, fontFamily: C.mono, letterSpacing: "0.16em", background: "none", border: `1px solid rgba(240,232,212,0.14)`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", textTransform: "uppercase" }}>
              CONFIRM
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {children}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ExperienceOverview() {
  const params   = useParams<{ type: string }>();
  const type     = params.type ?? "smoke";
  const [, navigate] = useLocation();
  const theme    = getCraftTheme(type);
  const accent   = theme.accent;
  const cfg      = getCraftConfig(type, accent);

  // One confirmed state per block
  const [confirmed, setConfirmed] = useState([false, false, false, false]);
  const allConfirmed = confirmed.every(Boolean);

  // Ember-bridge transition state
  const [transitioning, setTransitioning] = useState(false);
  const ctaControls = useAnimation();

  // Biometric heartbeat sync — reacts to scroll + hover
  const [bioPulse, setBioPulse] = useState(false);
  const scrollRef = useRef(0);
  const bioTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Wire EFE on mount
  useEffect(() => {
    ExperienceFlowEngine.goTo("EXPERIENCE_OVERVIEW");
    ExperienceFlowEngine.setCraft(type);
  }, [type]);

  // Scroll → trigger biometric heartbeat flash
  useEffect(() => {
    function onScroll() {
      scrollRef.current += 1;
      setBioPulse(true);
      if (bioTimer.current) clearTimeout(bioTimer.current);
      bioTimer.current = setTimeout(() => setBioPulse(false), 900);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (bioTimer.current) clearTimeout(bioTimer.current);
    };
  }, []);

  // Listen for EFE env_update events and flash bioPulse
  useEffect(() => {
    function onEnvUpdate() { setBioPulse(true); setTimeout(() => setBioPulse(false), 900); }
    window.addEventListener("efe:env_update", onEnvUpdate);
    return () => window.removeEventListener("efe:env_update", onEnvUpdate);
  }, []);

  // Time-of-day atmosphere
  const hour = new Date().getHours();
  const timeLabel = hour < 6 ? "LATE NIGHT" : hour < 12 ? "MORNING SESSION" : hour < 17 ? "AFTERNOON" : hour < 21 ? "EVENING PRIME" : "NIGHT RITUAL";
  const timeDesc  = hour < 6 ? "The lounge is at its most intimate" : hour < 12 ? "A rare morning ritual — focused and sharp" : hour < 17 ? "Refined and unhurried" : hour < 21 ? "Peak energy — the lounge is alive" : "The night belongs to the ritual";

  function confirm(i: number) {
    setConfirmed(prev => { const n = [...prev]; n[i] = true; return n; });
  }

  /**
   * Ember-bridge: On Click → ember flare animation → 400ms fade out →
   * SmokeCraftFlow.next() (CHALLENGE_SELECTION) → enter Synchronization path.
   */
  function handleEnter() {
    if (transitioning) return;
    setTransitioning(true);
    // 1. Ember flare — scale burst
    ctaControls.start({
      scale: [1, 1.06, 1],
      boxShadow: [
        `0 0 20px ${accent}40`,
        `0 0 60px ${accent}90`,
        `0 0 20px ${accent}40`,
      ],
      transition: { duration: 0.4 },
    }).catch(() => { /* ignore */ });
    // 2. After 400ms — fade out and navigate to Synchronization
    setTimeout(() => {
      ExperienceFlowEngine.enterSynchronization();
      navigate(`/synchronization/${type}`);
    }, 400);
  }

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.ink, fontFamily: C.mono, position: "relative", overflowX: "hidden" }}>

      {/* Ambient top glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 180, background: `radial-gradient(ellipse, ${accent}10 0%, transparent 70%)`, pointerEvents: "none", zIndex: 1 }} />

      {/* Ember persists from Cinematic Intro */}
      <EmberHeartbeat color={accent} corner="bottom-left" size={7} />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 20px 60px", position: "relative", zIndex: 2 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ paddingTop: 36, paddingBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 8, color: `${accent}80`, letterSpacing: "0.32em", marginBottom: 10, textTransform: "uppercase" }}>
            STEP 3 OF 8 · EXPERIENCE OVERVIEW
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 10 }}>
            {cfg.icon}
            <h1 style={{ margin: 0, fontFamily: C.serif, fontSize: "clamp(22px,4.5vw,34px)", fontWeight: 700, color: C.ink, letterSpacing: "0.04em" }}>
              {cfg.craftLabel}
            </h1>
          </div>
          <div style={{ fontSize: 9, color: accent, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 6 }}>
            {cfg.engine}
          </div>
          <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
            {cfg.atmosphere}
          </p>
        </motion.div>

        {/* Step progress bar — 8 steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: "flex", gap: 4, marginBottom: 28, justifyContent: "center" }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ width: i === 2 ? 20 : 6, height: 3, borderRadius: 2, background: i <= 2 ? accent : "rgba(240,232,212,0.12)", transition: "width 0.3s" }} />
          ))}
        </motion.div>

        {/* ── 4 blocks ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Block 1: Atmosphere */}
          <Block index={0} title="Atmosphere" accent={accent} confirmed={confirmed[0]} onConfirm={() => confirm(0)}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Flame size={18} color={accent} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, color: accent, fontFamily: C.serif, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>
                  {timeLabel}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                  {timeDesc}
                </div>
                <div style={{ marginTop: 10, fontSize: 9, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  ENVIRONMENT SYNC ACTIVE · BIOMETRICS READY
                </div>
              </div>
            </div>
          </Block>

          {/* Block 2: Flavor Profile */}
          <Block index={1} title="Flavor Profile" accent={accent} confirmed={confirmed[1]} onConfirm={() => confirm(1)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["BOLD", "SMOOTH", "BALANCED", "ADVENTUROUS"].map(label => (
                <motion.button key={label} whileTap={{ scale: 0.94 }}
                  onClick={() => confirm(1)}
                  style={{ padding: "8px 14px", borderRadius: 8, background: confirmed[1] ? `${accent}14` : "rgba(240,232,212,0.05)", border: `1px solid ${confirmed[1] ? accent + "35" : "rgba(240,232,212,0.12)"}`, color: confirmed[1] ? accent : C.muted, fontSize: 9, fontFamily: C.mono, letterSpacing: "0.14em", cursor: "pointer", fontWeight: 600 }}>
                  {label}
                </motion.button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: C.dim, lineHeight: 1.6 }}>
              Your selection calibrates the AI's initial recommendation vector.
            </div>
          </Block>

          {/* Block 3: Intelligence Brief */}
          <Block index={2} title="Intelligence Brief" accent={accent} confirmed={confirmed[2]} onConfirm={() => confirm(2)}>
            <Brain size={16} color={accent} style={{ marginBottom: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {cfg.intelligenceLines.map((line, i) => (
                <motion.div key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="sovereign-breath" style={{ fontSize: 7, color: accent }}>●</span>
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.10em" }}>{line}</span>
                </motion.div>
              ))}
            </div>
          </Block>

          {/* Block 4: The Swipe Ritual */}
          <Block index={3} title="The Swipe Ritual" accent={accent} confirmed={confirmed[3]} onConfirm={() => confirm(3)}>
            <Zap size={16} color={accent} style={{ marginBottom: 12 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cfg.ritualSteps.map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 8, color: `${accent}70`, fontFamily: C.mono, minWidth: 16 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </Block>

        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: transitioning ? 0 : 1, y: 0 }}
          transition={{ delay: transitioning ? 0 : 0.7, duration: 0.4 }}
          style={{ marginTop: 28, position: "relative" }}
        >
          {/* Ember flare burst — fires on CTA click */}
          {transitioning && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{ scale: 3.2, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                position:      "absolute",
                inset:         0,
                borderRadius:  14,
                background:    `radial-gradient(ellipse, ${accent}60 0%, transparent 70%)`,
                pointerEvents: "none",
                zIndex:        5,
              }}
            />
          )}

          <motion.button
            animate={ctaControls}
            whileTap={allConfirmed && !transitioning ? { scale: 0.97 } : {}}
            onClick={allConfirmed ? handleEnter : undefined}
            style={{
              width:         "100%",
              padding:       "18px 0",
              background:    allConfirmed
                ? `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`
                : "rgba(240,232,212,0.04)",
              border:        `1.5px solid ${allConfirmed ? accent : "rgba(240,232,212,0.12)"}`,
              borderRadius:  14,
              color:         allConfirmed ? "#060402" : C.dim,
              fontSize:      12,
              fontWeight:    700,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              fontFamily:    C.mono,
              cursor:        allConfirmed && !transitioning ? "pointer" : "not-allowed",
              boxShadow:     allConfirmed ? `0 0 32px ${accent}30` : "none",
              transition:    "all 0.35s ease",
              display:       "flex",
              alignItems:    "center",
              justifyContent:"center",
              gap:           10,
            } as React.CSSProperties}
          >
            {allConfirmed ? (
              <><ArrowRight size={15} /> ENTER THE EXPERIENCE</>
            ) : (
              `CONFIRM ALL BLOCKS TO CONTINUE (${confirmed.filter(Boolean).length}/4)`
            )}
          </motion.button>

          {/* Quick bypass for returning guests */}
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnter}
            style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", cursor: "pointer", fontSize: 9, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: C.mono, padding: "6px 12px" }}
          >
            Skip Overview →
          </motion.button>
        </motion.div>
      </div>

      {/* ── Biometric Heartbeat Sync indicator — reacts to scroll + EFE events ── */}
      <motion.div
        animate={bioPulse ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.88 }}
        transition={{ duration: 0.25 }}
        style={{
          position:      "fixed",
          top:           22,
          right:         22,
          zIndex:        9600,
          display:       "flex",
          alignItems:    "center",
          gap:           6,
          background:    "rgba(6,4,2,0.82)",
          border:        `1px solid ${accent}35`,
          borderRadius:  8,
          padding:       "6px 10px",
          backdropFilter:"blur(10px)",
          pointerEvents: "none",
        }}
      >
        <motion.div
          animate={bioPulse ? {
            scale:     [1, 1.5, 1],
            opacity:   [1, 0.5, 1],
          } : {}}
          transition={{ duration: 0.5 }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: accent }}
        />
        <Activity size={10} color={accent} />
        <span style={{ fontSize: 7, color: accent, fontFamily: C.mono, letterSpacing: "0.18em" }}>
          BIOMETRIC SYNC
        </span>
      </motion.div>
    </div>
  );
}
