/**
 * MasteryScoreHUD — Live session score overlay for the Drafting Lab.
 *
 * Mounts as a fixed right-edge panel during the swipe experience.
 * Shows live session score, current tier badge, and a miniature Golden Box
 * progress indicator. Collapses to a pill when no guest profile is loaded.
 */

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

const TIER_COLORS: Record<string, string> = {
  explorer:    "#94a3b8",
  apprentice:  "#60a5fa",
  craftsman:   "#a78bfa",
  sommelier:   "#f59e0b",
  grand_master: "#D48B00",
};

const TIER_LABELS: Record<string, string> = {
  explorer:    "Explorer",
  apprentice:  "Apprentice",
  craftsman:   "Craftsman",
  sommelier:   "Sommelier",
  grand_master: "Grand Master",
};

interface MasteryScoreHUDProps {
  sessionScore:  number;
  totalMastery:  number;
  masteryTier:   string;
  accentColor:   string;
  guestName:     string;
}

function AnimatedScore({ value, accentColor }: { value: number; accentColor: string }) {
  const spring = useSpring(0, { stiffness: 180, damping: 24 });
  const rounded = useTransform(spring, v => Math.round(v));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span style={{ color: accentColor, fontVariantNumeric: "tabular-nums" }}>
      {rounded}
    </motion.span>
  );
}

export default function MasteryScoreHUD({
  sessionScore, totalMastery, masteryTier, accentColor, guestName,
}: MasteryScoreHUDProps) {
  const tierColor  = TIER_COLORS[masteryTier] ?? accentColor;
  const tierLabel  = TIER_LABELS[masteryTier] ?? "Explorer";
  const scorePct   = Math.min(100, sessionScore);
  const boxPct     = Math.min(100, totalMastery);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 220, damping: 28 }}
      style={{
        position:  "fixed",
        right:     12,
        top:       "50%",
        transform: "translateY(-50%)",
        zIndex:    50,
        display:   "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:       10,
        pointerEvents: "none",
      }}
    >
      {/* Score meter — vertical bar */}
      <div style={{
        background:    "rgba(8,6,4,0.82)",
        border:        `1px solid ${accentColor}28`,
        borderRadius:  16,
        padding:       "14px 10px",
        backdropFilter: "blur(18px)",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           8,
        minWidth:      52,
        boxShadow:     `0 8px 32px rgba(0,0,0,0.52), 0 0 24px ${accentColor}10`,
      }}>
        {/* Label */}
        <span style={{
          fontSize:      7,
          fontWeight:    800,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         "rgba(240,232,216,0.28)",
          textAlign:     "center",
        }}>
          Score
        </span>

        {/* Vertical progress track */}
        <div style={{
          width:        6,
          height:       72,
          borderRadius: 3,
          background:   "rgba(240,232,216,0.06)",
          position:     "relative",
          overflow:     "hidden",
        }}>
          <motion.div
            initial={{ height: "0%" }}
            animate={{ height: `${scorePct}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            style={{
              position:     "absolute",
              bottom:       0,
              left:         0,
              right:        0,
              background:   `linear-gradient(180deg, ${accentColor}, ${accentColor}80)`,
              borderRadius: 3,
              boxShadow:    `0 0 8px ${accentColor}60`,
            }}
          />
        </div>

        {/* Score number */}
        <div style={{
          fontSize:  15,
          fontWeight: 800,
          lineHeight: 1,
        }}>
          <AnimatedScore value={sessionScore} accentColor={accentColor} />
        </div>

        <span style={{
          fontSize:  7,
          color:     "rgba(240,232,216,0.22)",
          letterSpacing: "0.10em",
        }}>
          / 100
        </span>
      </div>

      {/* Tier badge */}
      <motion.div
        animate={{ boxShadow: [`0 0 0px ${tierColor}00`, `0 0 12px ${tierColor}50`, `0 0 0px ${tierColor}00`] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          background:    "rgba(8,6,4,0.82)",
          border:        `1px solid ${tierColor}40`,
          borderRadius:  12,
          padding:       "8px 10px",
          backdropFilter: "blur(18px)",
          textAlign:     "center",
          minWidth:      52,
        }}
      >
        <div style={{
          fontSize:  7,
          fontWeight: 800,
          color:     tierColor,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          lineHeight: 1.2,
        }}>
          {tierLabel}
        </div>
        <div style={{
          fontSize:  9,
          color:     "rgba(240,232,216,0.25)",
          marginTop: 2,
          maxWidth:  44,
          overflow:  "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {guestName}
        </div>
      </motion.div>

      {/* Golden Box mini meter */}
      <div style={{
        background:    "rgba(8,6,4,0.82)",
        border:        `1px solid rgba(212,139,0,0.25)`,
        borderRadius:  12,
        padding:       "10px 8px",
        backdropFilter: "blur(18px)",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           5,
        minWidth:      52,
      }}>
        <span style={{
          fontSize:  6,
          fontWeight: 800,
          color:     "rgba(212,139,0,0.55)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          Box
        </span>

        {/* 5-segment Golden Box */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const segPct = (i + 1) * 20;
            const filled = boxPct >= segPct;
            const partial = !filled && boxPct > i * 20;
            const partialH = partial ? `${Math.round(((boxPct - i * 20) / 20) * 100)}%` : "0%";
            return (
              <div
                key={i}
                style={{
                  width:        20,
                  height:       8,
                  borderRadius: 2,
                  background:   "rgba(212,139,0,0.08)",
                  border:       `1px solid rgba(212,139,0,${filled ? "0.5" : "0.15"})`,
                  position:     "relative",
                  overflow:     "hidden",
                }}
              >
                {(filled || partial) && (
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: filled ? "100%" : partialH }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      position:   "absolute",
                      inset:      0,
                      background: "linear-gradient(90deg, #D48B00, #f0a820)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <span style={{
          fontSize:   8,
          color:      "rgba(212,139,0,0.55)",
          fontWeight: 700,
        }}>
          {Math.round(boxPct)}%
        </span>
      </div>
    </motion.div>
  );
}
