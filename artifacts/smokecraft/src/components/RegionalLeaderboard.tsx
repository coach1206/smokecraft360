/**
 * RegionalLeaderboard — Compact live leaderboard widget for RevealPage.
 *
 * Shows the guest's rank in their region alongside the top 5 connoisseurs.
 * Calls GET /api/mastery/leaderboard?region=&guestId= and renders a
 * compact gold-accent card with animated position indicator.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LeaderEntry {
  rank:         number;
  guestId:      string;
  firstName:    string;
  lastInitial:  string;
  totalMastery: number;
  masteryTier:  string;
  region:       string | null;
}

interface LeaderboardData {
  entries:   LeaderEntry[];
  guestRank: number | null;
}

const TIER_COLORS: Record<string, string> = {
  grand_master: "#D48B00",
  sommelier:    "#f59e0b",
  craftsman:    "#a78bfa",
  apprentice:   "#60a5fa",
  explorer:     "#94a3b8",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchLeaderboard(region: string | null, guestId: string | null): Promise<LeaderboardData> {
  const params = new URLSearchParams();
  if (region)  params.set("region",  region);
  if (guestId) params.set("guestId", guestId);
  const res = await fetch(`${BASE}/api/mastery/leaderboard?${params.toString()}`);
  if (!res.ok) throw new Error("leaderboard failed");
  return res.json();
}

interface RegionalLeaderboardProps {
  guestId:    string;
  region:     string | null;
  accentColor: string;
}

export default function RegionalLeaderboard({ guestId, region, accentColor }: RegionalLeaderboardProps) {
  const [data,    setData]    = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(region, guestId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [guestId, region]);

  if (loading || !data || data.entries.length === 0) return null;

  const label = region ? `${region} Leaderboard` : "Global Leaderboard";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 220, damping: 26 }}
      style={{
        margin:     "0 20px 24px",
        background: "rgba(8,6,4,0.72)",
        border:     `1px solid ${accentColor}22`,
        borderRadius: 18,
        overflow:   "hidden",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div style={{
        padding:       "14px 18px 10px",
        display:       "flex",
        alignItems:    "center",
        justifyContent: "space-between",
        borderBottom:  "1px solid rgba(240,232,216,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ fontSize: 14, color: accentColor }}
          >
            ◈
          </motion.span>
          <span style={{
            fontSize:      10,
            fontWeight:    800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         accentColor,
          }}>
            {label}
          </span>
        </div>
        {data.guestRank !== null && (
          <span style={{
            fontSize:   11,
            color:      "rgba(240,232,216,0.38)",
            fontWeight: 600,
          }}>
            Your rank: <span style={{ color: accentColor, fontWeight: 800 }}>#{data.guestRank}</span>
          </span>
        )}
      </div>

      {/* Entries */}
      <div style={{ padding: "8px 0 12px" }}>
        {data.entries.slice(0, 5).map((entry, i) => {
          const isGuest   = entry.guestId === guestId;
          const tierColor = TIER_COLORS[entry.masteryTier] ?? "#94a3b8";
          return (
            <motion.div
              key={entry.guestId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, type: "spring", stiffness: 240, damping: 26 }}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           12,
                padding:       "8px 18px",
                background:    isGuest ? `${accentColor}0a` : "transparent",
                borderLeft:    isGuest ? `2px solid ${accentColor}` : "2px solid transparent",
              }}
            >
              {/* Rank */}
              <span style={{
                fontSize:    12,
                fontWeight:  800,
                color:       entry.rank <= 3 ? accentColor : "rgba(240,232,216,0.28)",
                minWidth:    20,
                textAlign:   "center",
              }}>
                {entry.rank <= 3 ? ["✦", "◆", "◇"][entry.rank - 1] : `${entry.rank}`}
              </span>

              {/* Name */}
              <span style={{
                fontSize:   13,
                fontWeight: isGuest ? 700 : 500,
                color:      isGuest ? "#f0e8d8" : "rgba(240,232,216,0.55)",
                flex:       1,
              }}>
                {entry.firstName} {entry.lastInitial}.
                {isGuest && (
                  <span style={{
                    fontSize:   9,
                    color:      accentColor,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginLeft: 6,
                  }}>You</span>
                )}
              </span>

              {/* Tier dot + mastery */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width:        6,
                  height:       6,
                  borderRadius: "50%",
                  background:   tierColor,
                  boxShadow:    `0 0 5px ${tierColor}`,
                }} />
                <span style={{
                  fontSize:   11,
                  fontWeight: 700,
                  color:      tierColor,
                  minWidth:   32,
                  textAlign:  "right",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {entry.totalMastery.toFixed(1)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
