/**
 * LevelUpCeremony — Cinematic full-screen tier elevation celebration.
 *
 * Triggered when evolveMastery() returns a newTier !== oldTier, or when
 * the neural:identity_evolved socket event signals a tier change.
 *
 * Auto-dismisses after 5.5 s. User can dismiss early.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIER_LABELS: Record<string, string> = {
  explorer:    "Explorer",
  apprentice:  "Apprentice",
  craftsman:   "Craftsman",
  sommelier:   "Sommelier",
  grand_master: "Grand Master",
};

const TIER_COLORS: Record<string, string> = {
  explorer:    "#94a3b8",
  apprentice:  "#60a5fa",
  craftsman:   "#a78bfa",
  sommelier:   "#f59e0b",
  grand_master: "#D48B00",
};

const TIER_QUOTES: Record<string, string> = {
  apprentice:  "The palate awakens. Your journey has begun in earnest.",
  craftsman:   "Complexity is no longer a mystery — it is your language.",
  sommelier:   "Few reach this clarity. The room notices when you order.",
  grand_master: "The Golden Box is yours. A proprietary label awaits.",
};

interface LevelUpCeremonyProps {
  oldTier:       string;
  newTier:       string;
  masteryGain:   number;
  goldenBoxPct:  number;
  guestName:     string;
  newBadges:     { badgeId: string; label?: string }[];
  onDismiss:     () => void;
}

function Particles({ color }: { color: string }) {
  const count = 18;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const angle  = (i / count) * 360;
        const dist   = 80 + Math.random() * 140;
        const tx     = Math.cos((angle * Math.PI) / 180) * dist;
        const ty     = Math.sin((angle * Math.PI) / 180) * dist;
        const size   = 3 + Math.random() * 5;
        const delay  = Math.random() * 0.4;
        const dur    = 0.8 + Math.random() * 0.8;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: tx, y: ty, scale: 0 }}
            transition={{ delay, duration: dur, ease: "easeOut" }}
            style={{
              position:     "absolute",
              left:         "50%",
              top:          "42%",
              width:        size,
              height:       size,
              borderRadius: "50%",
              background:   color,
              boxShadow:    `0 0 6px ${color}`,
              marginLeft:   -size / 2,
              marginTop:    -size / 2,
            }}
          />
        );
      })}
    </div>
  );
}

export default function LevelUpCeremony({
  oldTier, newTier, masteryGain, goldenBoxPct,
  guestName, newBadges, onDismiss,
}: LevelUpCeremonyProps) {
  const color     = TIER_COLORS[newTier] ?? "#D48B00";
  const label     = TIER_LABELS[newTier] ?? newTier;
  const oldLabel  = TIER_LABELS[oldTier] ?? oldTier;
  const quote     = TIER_QUOTES[newTier] ?? "Your craft has deepened.";

  useEffect(() => {
    const t = setTimeout(onDismiss, 5500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45 } }}
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        200,
        display:       "flex",
        alignItems:    "center",
        justifyContent: "center",
        background:    "rgba(4, 2, 1, 0.92)",
        backdropFilter: "blur(14px)",
        padding:       24,
      }}
      onClick={onDismiss}
    >
      <Particles color={color} />

      {/* Ambient radial */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          position:      "absolute",
          inset:         0,
          background:    `radial-gradient(ellipse at 50% 42%, ${color}22 0%, transparent 62%)`,
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ scale: 0.78, opacity: 0, y: 40 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 280, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          position:   "relative",
          background: "rgba(10, 7, 3, 0.95)",
          border:     `1px solid ${color}40`,
          borderRadius: 28,
          padding:    "44px 36px 36px",
          maxWidth:   380,
          width:      "100%",
          textAlign:  "center",
          boxShadow:  `0 32px 100px rgba(0,0,0,0.60), 0 0 80px ${color}18`,
        }}
      >
        {/* Tier icon ring */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.28, type: "spring", stiffness: 300, damping: 20 }}
          style={{
            width:        88,
            height:       88,
            borderRadius: "50%",
            background:   `${color}14`,
            border:       `2px solid ${color}`,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            margin:       "0 auto 24px",
          }}
        >
          <motion.div
            animate={{ boxShadow: [`0 0 0px ${color}00`, `0 0 32px ${color}70`, `0 0 0px ${color}00`] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: 34 }}
          >
            ✦
          </motion.div>
        </motion.div>

        {/* Tier transition */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div style={{
            fontSize:      10,
            fontWeight:    800,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color:         "rgba(240,232,216,0.30)",
            marginBottom:  8,
          }}>
            {oldLabel} → {label}
          </div>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontSize:    38,
            fontWeight:  700,
            color:       color,
            margin:      "0 0 6px",
            lineHeight:  1.1,
          }}>
            {label}
          </h2>

          <p style={{
            fontSize:   14,
            color:      "#f0e8d8",
            fontWeight: 600,
            margin:     "0 0 6px",
          }}>
            {guestName}
          </p>
        </motion.div>

        {/* Quote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize:    17,
            fontStyle:   "italic",
            color:       "rgba(240,232,216,0.55)",
            margin:      "16px 0 20px",
            lineHeight:  1.55,
          }}
        >
          "{quote}"
        </motion.p>

        {/* Mastery gain chip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65, type: "spring", stiffness: 220, damping: 22 }}
          style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           6,
            background:    `${color}12`,
            border:        `1px solid ${color}30`,
            borderRadius:  20,
            padding:       "6px 16px",
            fontSize:      12,
            color:         color,
            fontWeight:    700,
            marginBottom:  20,
          }}
        >
          +{masteryGain.toFixed(2)} Mastery
        </motion.div>

        {/* Golden Box progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "center",
            marginBottom:   6,
          }}>
            <span style={{ fontSize: 10, color: "rgba(212,139,0,0.55)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Golden Box
            </span>
            <span style={{ fontSize: 10, color: "rgba(212,139,0,0.55)", fontWeight: 700 }}>
              {Math.round(goldenBoxPct)}%
            </span>
          </div>
          <div style={{
            height:       6,
            borderRadius: 3,
            background:   "rgba(212,139,0,0.10)",
            overflow:     "hidden",
          }}>
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${goldenBoxPct}%` }}
              transition={{ delay: 0.85, duration: 1.2, ease: "easeOut" }}
              style={{
                height:     "100%",
                borderRadius: 3,
                background: "linear-gradient(90deg, #D48B00, #f0a820)",
                boxShadow:  "0 0 8px #D48B0060",
              }}
            />
          </div>
        </motion.div>

        {/* New badges */}
        {newBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.35 }}
            style={{ marginBottom: 20 }}
          >
            <div style={{
              fontSize:      9,
              fontWeight:    800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color:         "rgba(240,232,216,0.28)",
              marginBottom:  8,
            }}>
              New Badge{newBadges.length > 1 ? "s" : ""} Earned
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {newBadges.map(b => (
                <span
                  key={b.badgeId}
                  style={{
                    background:    "rgba(212,139,0,0.10)",
                    border:        "1px solid rgba(212,139,0,0.28)",
                    borderRadius:  20,
                    padding:       "4px 12px",
                    fontSize:      11,
                    color:         "#D48B00",
                    fontWeight:    600,
                  }}
                >
                  {b.label ?? b.badgeId}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <button
          onClick={onDismiss}
          style={{
            width:        "100%",
            padding:      "13px",
            borderRadius: 12,
            background:   `linear-gradient(135deg, ${color}, ${color}cc)`,
            border:       "none",
            color:        "#F5F2ED",
            fontSize:     14,
            fontWeight:   700,
            cursor:       "pointer",
            letterSpacing: "0.06em",
          }}
        >
          Continue the Journey
        </button>

        <p style={{
          fontSize:  10,
          color:     "rgba(240,232,216,0.18)",
          marginTop: 10,
          cursor:    "pointer",
        }}>
          Tap anywhere to dismiss
        </p>
      </motion.div>
    </motion.div>
  );
}
