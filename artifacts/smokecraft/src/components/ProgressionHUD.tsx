/**
 * ProgressionHUD — persistent XP bar and tier display.
 * Floats at the top of the experience view, always visible.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Achievement } from "./AchievementUnlock";

interface TierInfo {
  tier:     string;
  label:    string;
  next:     number;
  progress: number;
}

interface Props {
  guestProfileId: string | null;
  craftType:      "smoke" | "pour" | "brew" | "vape";
  localXp:        number; // optimistic local XP (from swipes before server confirms)
  onAchievement:  (a: Achievement) => void;
}

const TIER_COLORS: Record<string, string> = {
  explorer:    "#6B8A9A",
  enthusiast:  "#7EC8A0",
  specialist:  "#D48B00",
  aficionado:  "#CE93D8",
  golden_box:  "#FFD700",
};

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#E85D26",
  pour:  "#D4AF37",
  brew:  "#D97706",
  vape:  "#A855F7",
};

export default function ProgressionHUD({ guestProfileId, craftType, localXp, onAchievement }: Props) {
  const [serverXp,  setServerXp]  = useState<number | null>(null);
  const [tierInfo,  setTierInfo]  = useState<TierInfo | null>(null);
  const [prevTotal, setPrevTotal] = useState(0);
  const [bump,      setBump]      = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const displayXp  = serverXp !== null ? serverXp + localXp : localXp;
  const accent      = CRAFT_ACCENT[craftType] ?? "#D48B00";

  // Fetch from server
  async function fetchSummary() {
    if (!guestProfileId) return;
    try {
      const res  = await fetch(`/api/xp/summary/${guestProfileId}`);
      if (!res.ok) return;
      const data = await res.json() as { total: number; tier: TierInfo; achievements: Achievement[] };
      setServerXp(data.total);
      setTierInfo(data.tier);

      // Detect new achievements
      if (data.achievements?.length) {
        const newest = data.achievements[0];
        if (newest && newest.xpValue > 0) onAchievement(newest);
      }
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    fetchSummary();
    pollRef.current = setInterval(fetchSummary, 15_000);
    return () => { if (pollRef.current !== undefined) clearInterval(pollRef.current); };
  }, [guestProfileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bump animation on XP change
  useEffect(() => {
    if (displayXp !== prevTotal) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 600);
      setPrevTotal(displayXp);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [displayXp]); // eslint-disable-line react-hooks/exhaustive-deps

  const tier     = tierInfo?.tier     ?? "explorer";
  const label    = tierInfo?.label    ?? "Curious Explorer";
  const progress = tierInfo?.progress ?? Math.min(99, Math.round(displayXp / 2.1));
  const tierColor = TIER_COLORS[tier] ?? "#D48B00";

  return (
    <motion.div
      animate={bump ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position:       "absolute",
        top:            "12px",
        left:           "50%",
        transform:      "translateX(-50%)",
        width:          "min(88vw, 340px)",
        background:     "rgba(26,26,27,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border:         `1px solid ${accent}28`,
        borderRadius:   "10px",
        padding:        "8px 14px",
        zIndex:         50,
        pointerEvents:  "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
        {/* Tier badge */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "6px",
        }}>
          <div style={{
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   tierColor,
            boxShadow:    `0 0 6px ${tierColor}`,
          }} />
          <span style={{
            fontFamily:    "'Cormorant Garamond', serif",
            fontSize:      "11px",
            letterSpacing: "0.1em",
            color:         tierColor,
            textTransform: "uppercase",
          }}>
            {label}
          </span>
        </div>

        {/* XP counter */}
        <AnimatePresence mode="wait">
          <motion.span
            key={displayXp}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y:  6 }}
            transition={{ duration: 0.25 }}
            style={{
              fontFamily:    "'Cormorant Garamond', serif",
              fontSize:      "12px",
              color:         accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {displayXp.toLocaleString()} XP
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div style={{
        height:       "3px",
        borderRadius: "2px",
        background:   "rgba(255,255,255,0.08)",
        overflow:     "hidden",
      }}>
        <motion.div
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            height:     "100%",
            borderRadius: "2px",
            background: `linear-gradient(90deg, ${accent}88, ${accent})`,
            boxShadow:  `0 0 6px ${accent}66`,
          }}
        />
      </div>
    </motion.div>
  );
}
