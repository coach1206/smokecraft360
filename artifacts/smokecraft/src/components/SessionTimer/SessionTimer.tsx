/**
 * SessionTimer — compact pill showing countdown + streak for CraftFlow.
 *
 * Visual states:
 *  active     — craft accent color, normal display
 *  idle       — amber amber pulse animation (>60 s no interaction)
 *  countdown  — red pulse (≤5 min remaining)
 *  expired    — dimmed
 */

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Props {
  totalSecs:     number;
  remainingSecs: number;
  streakCount:   number;
  isIdle:        boolean;
  isCountdown:   boolean;
  isExpired:     boolean;
  accentColor:   string;
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const RING_RADIUS     = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function SessionTimer({
  totalSecs,
  remainingSecs,
  streakCount,
  isIdle,
  isCountdown,
  isExpired,
  accentColor,
}: Props) {
  const pct  = totalSecs > 0 ? remainingSecs / totalSecs : 0;
  const dash = RING_CIRCUMFERENCE * pct;

  const ringColor =
    isExpired   ? "rgba(232,224,200,0.18)" :
    isCountdown ? "#EF4444" :
    isIdle      ? "#F59E0B" :
    accentColor;

  const textColor =
    isExpired   ? "rgba(232,224,200,0.28)" :
    isCountdown ? "#EF4444" :
    isIdle      ? "#F59E0B" :
    "#FFFFFF";

  const pulseAnim = isCountdown
    ? { opacity: [1, 0.55, 1] }
    : isIdle
      ? { opacity: [1, 0.6, 1] }
      : { opacity: 1 };

  const pulseTransition = (isCountdown || isIdle)
    ? { repeat: Infinity, duration: isCountdown ? 1.2 : 1.8, ease: "easeInOut" as const }
    : {};

  return (
    <motion.div
      animate={pulseAnim}
      transition={pulseTransition}
      style={{
        display:           "inline-flex",
        alignItems:        "center",
        gap:               8,
        padding:           "5px 14px 5px 5px",
        background:        "rgba(10,8,6,0.6)",
        border:            `1px solid ${ringColor}35`,
        borderRadius:      999,
        backdropFilter:    "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* SVG arc ring + time text */}
      <div style={{ position: "relative", width: 46, height: 46, flexShrink: 0 }}>
        <svg
          width={46} height={46}
          viewBox="0 0 46 46"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={23} cy={23} r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={2.5}
          />
          <motion.circle
            cx={23} cy={23} r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animate={{
              strokeDashoffset: RING_CIRCUMFERENCE - dash,
              stroke: ringColor,
            }}
            transition={{ duration: 0.8, ease: "linear" }}
          />
        </svg>
        <div style={{
          position:   "absolute",
          inset:      0,
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize:   10,
          fontWeight: 700,
          color:      textColor,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.01em",
        }}>
          {isExpired ? "0:00" : fmtTime(remainingSecs)}
        </div>
      </div>

      {/* Streak flame */}
      {streakCount > 0 && (
        <motion.div
          key={streakCount}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        3,
            fontSize:   12,
            color:      "#F59E0B",
            fontWeight: 700,
          }}
        >
          <Flame size={13} color="#F59E0B" />
          {streakCount}
        </motion.div>
      )}
    </motion.div>
  );
}
