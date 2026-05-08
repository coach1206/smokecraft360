/**
 * ExperienceRecap — Stage 9 of the Universal Experience Flow.
 *
 * Cinematic end-of-session recap. Shows what was explored, flavor notes
 * discovered, unlocks earned, and encourages return visits.
 *
 * Appears as a full-screen overlay after the reveal phase when the
 * user clicks "Complete Session". Handles all craft types.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronRight, Sparkles } from "lucide-react";

type CraftType = "smoke" | "pour" | "brew" | "vape";

interface Props {
  craftType:     CraftType;
  accent:        string;
  accentSoft:    string;
  styleTitle?:   string;
  moodTitle?:    string;
  flavorNotes:   string[];
  featuredName?: string;
  score:         number;
  onRestart:     () => void;
  onClose:       () => void;
}

const RECAP_CONFIG: Record<CraftType, {
  sessionLabel:   string;
  recapIntro:     string[];
  unlockLabel:    string;
  unlocks:        string[];
  returnPrompt:   string;
}> = {
  pour: {
    sessionLabel: "Tonight's Pour",
    recapIntro:   ["Tonight you explored", "the art of the spirit."],
    unlockLabel:  "What You Discovered",
    unlocks:      ["Flavor Cartography", "Terroir Awareness", "Reserve Access Opening"],
    returnPrompt: "Your palate signature is evolving. Return to unlock the next level.",
  },
  brew: {
    sessionLabel: "Tonight's Flight",
    recapIntro:   ["You uncovered layers", "in every drop."],
    unlockLabel:  "What You Unlocked",
    unlocks:      ["Barrel Character Profile", "Hop Spectrum Mapping", "Flight Builder Access"],
    returnPrompt: "Your flavor horizon is expanding. The cellared reserves await.",
  },
  vape: {
    sessionLabel: "Tonight's Atmosphere",
    recapIntro:   ["You evolved your", "sensory signature."],
    unlockLabel:  "What You Built",
    unlocks:      ["Cloud Profile Activated", "Flavor Frequency Mapped", "Ambient Sync Calibrated"],
    returnPrompt: "Your atmosphere identity is deepening. Return to unlock hidden frequencies.",
  },
  smoke: {
    sessionLabel: "Tonight's Selection",
    recapIntro:   ["The finest experiences", "leave their mark."],
    unlockLabel:  "What You Discovered",
    unlocks:      ["Palate Profile Deepened", "Reserve Access Advancing", "Blend Mastery Progressing"],
    returnPrompt: "Your connoisseur identity is evolving. The reserve room is waiting.",
  },
};

const SCORE_TIER = (s: number) =>
  s >= 85 ? { label: "Reserve Grade", color: "#FFD700" } :
  s >= 70 ? { label: "Connoisseur",   color: "#D48B00" } :
  s >= 50 ? { label: "Explorer",      color: "#8A7060" } :
            { label: "First Steps",   color: "#6B5E4E" };

export function ExperienceRecap({
  craftType, accent, accentSoft,
  styleTitle, moodTitle, flavorNotes,
  featuredName, score, onRestart, onClose,
}: Props) {
  const cfg = RECAP_CONFIG[craftType];
  const tier = SCORE_TIER(score);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1_500),
      setTimeout(() => setStep(4), 2_200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: craftType === "vape"
          ? "radial-gradient(ellipse 70% 50% at 50% 20%, #1c0044 0%, #030008 100%)"
          : "radial-gradient(ellipse 70% 50% at 50% 20%, #1e0d02 0%, #060402 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 28px 48px",
        overflowY: "auto",
      }}
    >
      {/* Ambient top glow */}
      <motion.div
        animate={{ opacity: [0.2, 0.42, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "45%",
          background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${accent}22 0%, transparent 80%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 540, position: "relative" }}>

        {/* Session label */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                textAlign: "center", marginBottom: 8,
                fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase",
                color: accent, fontWeight: 600, opacity: 0.65,
              }}
            >
              {cfg.sessionLabel} · Complete
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intro lines */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              style={{ textAlign: "center", marginBottom: 32 }}
            >
              {cfg.recapIntro.map((line, i) => (
                <div key={i} style={{
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                  fontSize: "clamp(22px, 4vw, 36px)",
                  fontWeight: 700,
                  color: i === cfg.recapIntro.length - 1 ? "rgba(240,232,212,0.92)" : accent,
                  lineHeight: 1.2,
                }}>
                  {line}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score & tier badge */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45 }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${accent}35`,
                borderRadius: 18, padding: "20px 24px",
                marginBottom: 16,
                display: "flex", alignItems: "center", gap: 20,
              }}
            >
              {/* Score ring */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                background: `conic-gradient(${accent} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: craftType === "vape" ? "#030008" : "#060402",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: accent, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 8, color: "rgba(240,232,212,0.3)", letterSpacing: "0.1em" }}>pts</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
                  color: "rgba(240,232,212,0.35)", marginBottom: 4,
                }}>Session Rating</div>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: tier.color, marginBottom: 4,
                  fontFamily: "var(--app-font-serif, Georgia, serif)",
                }}>{tier.label}</div>
                {featuredName && (
                  <div style={{ fontSize: 12, color: "rgba(240,232,212,0.45)" }}>
                    Featured: <span style={{ color: "rgba(240,232,212,0.72)", fontWeight: 600 }}>{featuredName}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flavor notes discovered */}
        <AnimatePresence>
          {step >= 3 && flavorNotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, padding: "18px 20px",
                marginBottom: 14,
              }}
            >
              <div style={{
                fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
                color: "rgba(240,232,212,0.32)", marginBottom: 10, fontWeight: 600,
              }}>Flavor Profiles Explored</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {[
                  ...(styleTitle ? [styleTitle] : []),
                  ...(moodTitle  ? [moodTitle]  : []),
                  ...flavorNotes.slice(0, 5),
                ].map(n => (
                  <span key={n} style={{
                    fontSize: 11, padding: "5px 13px", borderRadius: 999,
                    background: `${accent}14`, border: `1px solid ${accent}38`,
                    color: "rgba(240,232,212,0.72)", fontWeight: 600,
                  }}>{n}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unlocks */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              style={{
                background: `${accent}0c`,
                border: `1px solid ${accent}28`,
                borderRadius: 16, padding: "18px 20px",
                marginBottom: 28,
              }}
            >
              <div style={{
                fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
                color: accent, opacity: 0.6, marginBottom: 10, fontWeight: 600,
              }}>
                <Sparkles size={10} style={{ display: "inline", marginRight: 5 }} />
                {cfg.unlockLabel}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cfg.unlocks.map(u => (
                  <div key={u} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 12, color: "rgba(240,232,212,0.62)",
                  }}>
                    <span style={{ color: accent, fontSize: 10 }}>✓</span>
                    {u}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Return prompt + CTA buttons */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{ textAlign: "center" }}
            >
              <p style={{
                margin: "0 0 24px", fontSize: 13, lineHeight: 1.65,
                color: "rgba(240,232,212,0.38)",
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontStyle: "italic",
              }}>
                {cfg.returnPrompt}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accentSoft})`,
                    border: "none", borderRadius: 999,
                    padding: "17px 40px",
                    color: "#060402", fontWeight: 800,
                    fontSize: 12, letterSpacing: "0.24em", textTransform: "uppercase",
                    cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
                    boxShadow: `0 16px 48px ${accent}45`,
                  }}
                >
                  Explore Further <ChevronRight size={14} />
                </motion.button>

                <button
                  type="button"
                  onClick={onRestart}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 999, padding: "14px 36px",
                    color: "rgba(240,232,212,0.38)",
                    fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    fontWeight: 600,
                  }}
                >
                  <RotateCcw size={12} /> New Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
