/**
 * Live Leaderboard — polls /api/craft/leaderboard every 5 s.
 * Designed as a compact side panel component for the CraftFlow reveal phase.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  name:  string;
  score: number;
  craft: string;
}

const CRAFT_GLYPHS: Record<string, string> = {
  smoke: "🚬",
  brew:  "🍺",
  pour:  "🥃",
  vape:  "💨",
};

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function Leaderboard({ accentColor }: { accentColor: string }) {
  const [data,    setData   ] = useState<LeaderboardEntry[]>([]);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/craft/leaderboard")
        .then(r => r.ok ? r.json() as Promise<LeaderboardEntry[]> : null)
        .then(d => {
          if (d) {
            setData(d.slice(0, 5));
            setUpdated(true);
            setTimeout(() => setUpdated(false), 600);
          }
        })
        .catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (data.length === 0) return null;

  return (
    <div style={{
      padding: "14px",
      borderRadius: 12,
      background: `linear-gradient(145deg, rgba(245,242,237,0.75), ${accentColor}08)`,
      border: `1px solid ${accentColor}25`,
      marginTop: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
        textTransform: "uppercase", color: accentColor, marginBottom: 10,
      }}>
        <Trophy size={11} />
        <span>Top Creators</span>
        <AnimatePresence>
          {updated && (
            <motion.span
              key="dot"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: accentColor, display: "inline-block", marginLeft: 4,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((entry, i) => (
          <motion.div
            key={`${entry.name}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 8,
              background: i === 0 ? `${accentColor}10` : "transparent",
              border: i === 0 ? `1px solid ${accentColor}20` : "1px solid transparent",
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 800, minWidth: 16, textAlign: "center",
              color: RANK_COLORS[i] ?? "rgba(26,26,27,0.40)",
            }}>
              {i === 0 ? "" : i === 1 ? "" : i === 2 ? "" : `#${i + 1}`}
            </span>
            <span style={{ fontSize: 11, color: "rgba(26,26,27,0.82)", flex: 1, fontWeight: i === 0 ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.name}
            </span>
            <span style={{ fontSize: 10, color: "rgba(26,26,27,0.40)", flexShrink: 0 }}>
              {CRAFT_GLYPHS[entry.craft] ?? ""}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              color: i === 0 ? accentColor : "rgba(26,26,27,0.62)",
            }}>
              {entry.score.toFixed(1)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
