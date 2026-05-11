/**
 * CraftCinematicOpening — Per-craft 3-second cinematic intro.
 *
 * Renders as a full-screen overlay before the CraftEntryChamber.
 * Each craft gets a unique living animation:
 *   smoke — ember ignites, smoke wisps drift upward
 *   pour  — liquid cascade, amber splash
 *   brew  — carbonation bubbles rise, foam crowns
 *   vape  — vapor cloud burst, neon pulse
 *
 * Shows once per craft per session (sessionStorage flag).
 * Auto-advances after 3.2s. Tap/click to skip immediately.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence }     from "framer-motion";

// ── CSS animations ────────────────────────────────────────────────────────────

const CINEMATIC_CSS = `
  /* Smoke wisps */
  @keyframes smoke-drift {
    0%   { transform: translateY(0px) translateX(0px) scale(0.6); opacity: 0; }
    15%  { opacity: 0.35; }
    80%  { opacity: 0.18; }
    100% { transform: translateY(-120px) translateX(var(--sx, 20px)) scale(1.6); opacity: 0; }
  }
  .smoke-wisp {
    position: absolute;
    border-radius: 50%;
    background: rgba(180,160,140,0.22);
    filter: blur(12px);
    animation: smoke-drift var(--sd, 3s) ease-out forwards;
    animation-delay: var(--sdel, 0s);
  }

  /* Pour liquid */
  @keyframes pour-flow {
    0%   { height: 0; opacity: 0; }
    20%  { opacity: 1; }
    100% { height: 160px; }
  }
  @keyframes pour-splash {
    0%   { transform: scale(0.1); opacity: 0; }
    30%  { opacity: 0.55; }
    100% { transform: scale(1.8); opacity: 0; }
  }

  /* Brew bubbles */
  @keyframes brew-bubble {
    0%   { transform: translateY(0) scale(1); opacity: 0.7; }
    100% { transform: translateY(-200px) scale(0.2); opacity: 0; }
  }
  @keyframes brew-foam {
    0%   { transform: scaleX(0.1); opacity: 0; }
    50%  { opacity: 0.9; }
    100% { transform: scaleX(1); opacity: 0.85; }
  }

  /* Vape vapor */
  @keyframes vape-cloud {
    0%   { transform: scale(0.2) translateY(10px); opacity: 0; }
    25%  { opacity: 0.45; }
    100% { transform: scale(2.2) translateY(-30px); opacity: 0; }
  }
  @keyframes vape-neon {
    0%,100% { opacity: 0.15; }
    50%     { opacity: 0.80; }
  }
`;

// ── Per-craft smoke wisps ─────────────────────────────────────────────────────

const WISPS = Array.from({ length: 8 }, (_, i) => ({
  left:  35 + (i % 3) * 12 + "%",
  size:  28 + (i % 4) * 18,
  dur:   2.2 + i * 0.4,
  del:   i * 0.22,
  sx:    (-20 + (i % 5) * 12) + "px",
}));

function SmokeOpening() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Ember core */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.85] }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:     "absolute",
          bottom:       "30%", left: "50%",
          width:        18, height: 18,
          marginLeft:   -9,
          borderRadius: "50%",
          background:   "radial-gradient(circle, #ff6b2b 0%, #e85d26 50%, transparent 75%)",
          boxShadow:    "0 0 30px #e85d2688, 0 0 60px #e85d2644",
          zIndex:       2,
        }}
      />
      {/* Ember pulse */}
      <motion.div
        animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        style={{
          position:     "absolute",
          bottom:       "30%", left: "50%",
          width:        18, height: 18,
          marginLeft:   -9,
          borderRadius: "50%",
          background:   "rgba(232,93,38,0.3)",
          zIndex:       1,
        }}
      />
      {/* Smoke wisps */}
      {WISPS.map((w, i) => (
        <div
          key={i}
          className="smoke-wisp"
          style={{
            left:   w.left,
            bottom: "32%",
            width:  w.size,
            height: w.size,
            "--sd":   `${w.dur}s`,
            "--sdel": `${w.del}s`,
            "--sx":   w.sx,
          } as React.CSSProperties}
        />
      ))}
      {/* Ambient lounge warm glow */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     "50%",
        background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(232,93,38,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── Pour opening ──────────────────────────────────────────────────────────────

function PourOpening() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Liquid stream */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 160, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:   "absolute",
          top:        "22%",
          width:      8,
          borderRadius: 4,
          background: "linear-gradient(to bottom, rgba(212,175,55,0.90), rgba(180,100,20,0.70))",
          boxShadow:  "0 0 12px rgba(212,175,55,0.50)",
        }}
      />
      {/* Splash rings */}
      {[0, 0.5, 1.0].map((del, i) => (
        <motion.div
          key={i}
          animate={{ scale: [0.1, 2.2], opacity: [0.55, 0] }}
          transition={{ delay: 1.0 + del, duration: 0.9, ease: "easeOut", repeat: 1, repeatDelay: 0.8 }}
          style={{
            position:     "absolute",
            top:          "calc(22% + 160px)",
            width:        80, height: 22,
            borderRadius: "50%",
            border:       `1px solid rgba(212,175,55,${0.5 - i * 0.15})`,
          }}
        />
      ))}
      {/* Amber glow pool */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ delay: 0.8, duration: 1.0, ease: "easeOut" }}
        style={{
          position:     "absolute",
          top:          "calc(22% + 155px)",
          width:        120, height: 32,
          borderRadius: "50%",
          background:   "radial-gradient(ellipse, rgba(212,175,55,0.40) 0%, transparent 70%)",
          filter:       "blur(6px)",
        }}
      />
      {/* Crystal reflections */}
      {["-20%", "20%"].map((x, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ delay: 1.2 + i * 0.3, duration: 1.5, repeat: 1 }}
          style={{
            position:     "absolute",
            left:         `calc(50% + ${x})`,
            top:          "40%",
            width:        3,
            height:       40,
            background:   "linear-gradient(to bottom, rgba(255,255,255,0.7), transparent)",
            borderRadius: 2,
            transform:    `rotate(${i === 0 ? -20 : 20}deg)`,
          }}
        />
      ))}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(212,175,55,0.10) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── Brew opening ──────────────────────────────────────────────────────────────

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  left:  `${8 + (i * 5.2) % 80}%`,
  size:  3 + (i % 4) * 3,
  dur:   1.2 + (i % 5) * 0.5,
  del:   i * 0.15,
}));

function BrewOpening() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Bubbles rising */}
      {BUBBLES.map((b, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, opacity: 0.7 }}
          animate={{ y: -220, opacity: 0 }}
          transition={{ delay: 0.3 + b.del, duration: b.dur, ease: "easeOut", repeat: 2, repeatDelay: 0.4 }}
          style={{
            position:     "absolute",
            bottom:       "25%",
            left:         b.left,
            width:        b.size,
            height:       b.size,
            borderRadius: "50%",
            background:   `rgba(251,191,36,${0.35 + (i % 3) * 0.15})`,
            boxShadow:    `0 0 4px rgba(251,191,36,0.5)`,
          }}
        />
      ))}
      {/* Foam crown */}
      <motion.div
        initial={{ scaleX: 0.05, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.88 }}
        transition={{ delay: 0.8, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:   "absolute",
          bottom:     "28%",
          left:       "20%",
          right:      "20%",
          height:     28,
          borderRadius: "50% 50% 0 0",
          background: "linear-gradient(to bottom, rgba(255,252,245,0.92), rgba(251,191,36,0.50))",
          boxShadow:  "0 -4px 20px rgba(251,191,36,0.25)",
        }}
      />
      {/* Glass body */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        style={{
          position:   "absolute",
          bottom:     "8%",
          left:       "30%",
          right:      "30%",
          height:     "22%",
          background: "linear-gradient(to bottom, rgba(217,119,6,0.55), rgba(180,80,10,0.40))",
          borderRadius: "4px 4px 12px 12px",
          border:     "1px solid rgba(251,191,36,0.25)",
        }}
      />
      {/* Copper glow */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(217,119,6,0.12) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── Vape opening ──────────────────────────────────────────────────────────────

const VAPOR_CLOUDS = Array.from({ length: 6 }, (_, i) => ({
  left:  `${20 + i * 12}%`,
  size:  60 + i * 25,
  dur:   2.0 + i * 0.4,
  del:   i * 0.28,
  color: i % 2 === 0 ? "rgba(168,85,247," : "rgba(99,102,241,",
}));

function VapeOpening() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Vapor clouds */}
      {VAPOR_CLOUDS.map((c, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.15, opacity: 0, y: 20 }}
          animate={{ scale: 2.4, opacity: [0, 0.40, 0], y: -40 }}
          transition={{ delay: 0.3 + c.del, duration: c.dur, ease: "easeOut", repeat: 1, repeatDelay: 0.5 }}
          style={{
            position:     "absolute",
            bottom:       "25%",
            left:         c.left,
            width:        c.size,
            height:       c.size,
            borderRadius: "50%",
            background:   `${c.color}0.28)`,
            filter:       "blur(14px)",
          }}
        />
      ))}
      {/* Device silhouette glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.75, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:     "absolute",
          bottom:       "20%",
          left:         "50%",
          width:        16, height: 80,
          marginLeft:   -8,
          borderRadius: 8,
          background:   "linear-gradient(to top, rgba(168,85,247,0.80), rgba(99,102,241,0.60))",
          boxShadow:    "0 0 20px rgba(168,85,247,0.60), 0 0 40px rgba(99,102,241,0.30)",
        }}
      />
      {/* Neon ring */}
      <motion.div
        animate={{ opacity: [0.15, 0.80, 0.15] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          bottom:       "calc(20% + 75px)",
          left:         "50%",
          width:        48, height: 48,
          marginLeft:   -24, marginBottom: -24,
          borderRadius: "50%",
          border:       "2px solid rgba(168,85,247,0.75)",
          boxShadow:    "0 0 16px rgba(168,85,247,0.50), inset 0 0 12px rgba(99,102,241,0.25)",
        }}
      />
      {/* LED atmosphere */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(168,85,247,0.10) 0%, rgba(30,0,60,0.30) 60%, transparent 85%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── Craft configs ─────────────────────────────────────────────────────────────

const OPENING_CONFIG = {
  smoke: {
    bg:      "#040100",
    accent:  "#e85d26",
    cta:     "ENTER THE PRIVATE LOUNGE",
    lines: [
      "Every smoke carries a ritual.",
      "SmokeCraft is not simply smoking.",
      "It is the art of sovereign construction.",
      "Obsidian.   Ember.   Pacing.   Legacy.",
    ],
    Opening: SmokeOpening,
  },
  pour: {
    bg:      "#040200",
    accent:  "#d4af37",
    cta:     "ENTER THE PRIVATE SOCIETY",
    lines: [
      "Every pour carries a story.",
      "PourCraft is not simply drinking.",
      "It is the art of liquid memory.",
      "Time.   Amber.   Complexity.   Reverence.",
    ],
    Opening: PourOpening,
  },
  brew: {
    bg:      "#030200",
    accent:  "#d97706",
    cta:     "ENTER THE MASTER ROASTERY",
    lines: [
      "Every brew carries intention.",
      "BrewCraft is not simply tasting.",
      "It is the science of the craft pour.",
      "Grain.   Copper.   Fire.   Precision.",
    ],
    Opening: BrewOpening,
  },
  vape: {
    bg:      "#020008",
    accent:  "#a855f7",
    cta:     "ENTER THE DISTILLED ESSENCE",
    lines: [
      "Every vapor carries frequency.",
      "VapeCraft is not simply cloud.",
      "It is atmosphere as architecture.",
      "Silence.   Density.   Frequency.   Void.",
    ],
    Opening: VapeOpening,
  },
} as const;

const SESSION_KEY = (type: string) => `axiom_cinematic_${type}`;

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  type:       string;
  onComplete: () => void;
}

export function CraftCinematicOpening({ type, onComplete }: Props) {
  const [visible, setVisible] = useState(true);
  const cfg = OPENING_CONFIG[type as keyof typeof OPENING_CONFIG] ?? OPENING_CONFIG.smoke;
  const { Opening, lines, cta } = cfg;

  // Each text line appears every LINE_STEP seconds; button appears after all lines
  const LINE_STEP   = 1.4;
  const buttonDelay = 0.5 + lines.length * LINE_STEP + 0.8;

  function handleEnter() {
    setVisible(false);
    setTimeout(onComplete, 500);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            position: "fixed",
            inset:    0,
            background: cfg.bg,
            zIndex:   200,
            overflow: "hidden",
          }}
        >
          <style>{CINEMATIC_CSS}</style>

          {/* Per-craft ambient animation */}
          <Opening />

          {/* Cinematic vignette so text reads cleanly */}
          <div style={{
            position:      "absolute",
            inset:         0,
            background:    "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
            pointerEvents: "none",
            zIndex:        5,
          }} />

          {/* Sequential text reveal + CTA button */}
          <div style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "flex-end",
            paddingBottom:  "16%",
            zIndex:         10,
            gap:            0,
          }}>
            {/* Text lines — staggered fade-in */}
            <div style={{
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              gap:           16,
              marginBottom:  36,
            }}>
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * LINE_STEP, duration: 0.9, ease: "easeOut" }}
                  style={{
                    fontSize:      i === lines.length - 1 ? 10 : 15,
                    letterSpacing: i === lines.length - 1 ? "0.32em" : "0.10em",
                    fontStyle:     i === 0 ? "italic" : "normal",
                    fontWeight:    i === lines.length - 1 ? 700 : 300,
                    color:         i === lines.length - 1
                      ? `${cfg.accent}bb`
                      : "rgba(240,228,208,0.90)",
                    textAlign:     "center",
                    maxWidth:      340,
                    fontFamily:    i === 0
                      ? "'Cormorant Garamond', Georgia, serif"
                      : "monospace",
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </div>

            {/* ENTER button — appears after all lines */}
            <motion.button
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: buttonDelay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEnter}
              style={{
                padding:       "18px 56px",
                background:    `linear-gradient(180deg, ${cfg.accent} 0%, ${cfg.accent}99 100%)`,
                border:        "none",
                color:         "#060402",
                fontSize:      12,
                fontWeight:    800,
                letterSpacing: "0.30em",
                textTransform: "uppercase",
                cursor:        "pointer",
                fontFamily:    "monospace",
                boxShadow:     `0 0 36px ${cfg.accent}55, 0 4px 24px rgba(0,0,0,0.65)`,
              }}
            >
              {cta}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * useShouldShowCinematic — returns true if the cinematic should show for this
 * craft type (once per session), then marks it as seen.
 */
export function useShouldShowCinematic(type: string): boolean {
  const key = SESSION_KEY(type);
  if (typeof window === "undefined") return false;
  const seen = sessionStorage.getItem(key);
  if (!seen) {
    sessionStorage.setItem(key, "1");
    return true;
  }
  return false;
}
