/**
 * LiveLeaderboard — Real-time craft leaderboard panel.
 *
 * Subscribes to `leaderboard_update` via Socket.io.
 * Shows top entries with animated rank changes, craft score bars,
 * and tier badges. Compact enough to overlay RevealPage or ExperiencePage.
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LeaderEntry {
  rank:           number;
  guestProfileId: string | null;
  firstName:      string;
  lastInitial:    string;
  craftScore:     number;
  totalXp:        number;
  achievementCnt: number;
  tier:           string;
  tierLabel:      string;
  tierColor:      string;
}

interface Props {
  craftType?:     string;
  guestId?:       string;
  accentColor?:   string;
  compact?:       boolean;
  limit?:         number;
}

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#D48B00",
  pour:  "#c87820",
  brew:  "#e6c76a",
  vape:  "#a855f7",
  global: "#D48B00",
};

export default function LiveLeaderboard({
  craftType = "global",
  guestId,
  accentColor,
  compact = false,
  limit = 10,
}: Props) {
  const [entries,     setEntries]     = useState<LeaderEntry[]>([]);
  const [guestRank,   setGuestRank]   = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const prevRanks = useRef<Map<string, number>>(new Map());
  const accent    = accentColor ?? CRAFT_ACCENT[craftType] ?? "#D48B00";

  async function fetchLeaderboard() {
    try {
      const url = craftType === "global"
        ? `${BASE}/api/leaderboard?limit=${limit}`
        : `${BASE}/api/leaderboard/craft/${craftType}?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { entries: LeaderEntry[] };
      applyEntries(data.entries ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  function applyEntries(incoming: LeaderEntry[]) {
    setEntries(prev => {
      incoming.forEach(e => {
        if (e.guestProfileId) {
          prevRanks.current.set(e.guestProfileId, e.rank);
        }
      });
      return incoming.slice(0, limit);
    });
    if (guestId) {
      const found = incoming.find(e => e.guestProfileId === guestId);
      if (found) setGuestRank(found.rank);
    }
    setLastUpdated(Date.now());
  }

  useEffect(() => {
    fetchLeaderboard();

    function onUpdate(data: { craftType: string; entries: LeaderEntry[] }) {
      if (data.craftType !== craftType && craftType !== "global") return;
      applyEntries(data.entries ?? []);
    }

    socket.on("leaderboard_update", onUpdate);
    return () => { socket.off("leaderboard_update", onUpdate); };
  }, [craftType, guestId]);

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontFamily: "'Cormorant Garamond', serif", color: accent, fontSize: "13px", letterSpacing: "0.2em" }}
        >
          CALIBRATING RANKINGS
        </motion.div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div style={{
      background:   "rgba(10,8,6,0.82)",
      backdropFilter: "blur(16px) saturate(0.9)",
      border:       `1px solid ${accent}30`,
      borderRadius: compact ? "12px" : "16px",
      padding:      compact ? "12px" : "20px",
      width:        "100%",
      maxWidth:     compact ? "280px" : "360px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? "10px" : "16px" }}>
        <div style={{
          fontFamily:    "'Cormorant Garamond', serif",
          fontSize:      compact ? "11px" : "10px",
          letterSpacing: "0.25em",
          color:         accent,
          textTransform: "uppercase",
          fontWeight:    600,
        }}>
          {craftType === "global" ? "Global Rankings" : `${craftType.charAt(0).toUpperCase() + craftType.slice(1)}Craft`}
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: "50%", background: accent }}
        />
      </div>

      {/* Entries */}
      <AnimatePresence mode="popLayout">
        {entries.map((entry, idx) => {
          const isGuest  = entry.guestProfileId === guestId;
          const prevRank = prevRanks.current.get(entry.guestProfileId ?? "") ?? entry.rank;
          const moved    = prevRank - entry.rank;

          return (
            <motion.div
              key={entry.guestProfileId ?? `anon-${idx}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              style={{
                display:       "flex",
                alignItems:    "center",
                gap:           "10px",
                padding:       compact ? "6px 8px" : "8px 10px",
                borderRadius:  "8px",
                marginBottom:  "4px",
                background:    isGuest ? `${accent}15` : "transparent",
                border:        isGuest ? `1px solid ${accent}40` : "1px solid transparent",
              }}
            >
              {/* Rank */}
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   compact ? "13px" : "16px",
                fontWeight: 700,
                color:      idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "#6B5E4E",
                width:      "22px",
                textAlign:  "center",
                flexShrink: 0,
              }}>
                {entry.rank}
              </div>

              {/* Name + tier */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily:   "'Cormorant Garamond', serif",
                  fontSize:     compact ? "13px" : "14px",
                  color:        isGuest ? "#F5F2ED" : "#C8B89A",
                  fontWeight:   isGuest ? 600 : 400,
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {entry.firstName} {entry.lastInitial}.
                  {isGuest && <span style={{ color: accent, marginLeft: "6px", fontSize: "10px" }}>YOU</span>}
                </div>
                {!compact && (
                  <div style={{
                    fontSize: "10px",
                    color:    entry.tierColor,
                    fontFamily: "'Cormorant Garamond', serif",
                    letterSpacing: "0.1em",
                  }}>
                    {entry.tierLabel} · {entry.achievementCnt} badges
                  </div>
                )}
              </div>

              {/* Score bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {moved !== 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: moved > 0 ? 4 : -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: "9px",
                      color:    moved > 0 ? "#7EC8A0" : "#E85D26",
                    }}
                  >
                    {moved > 0 ? `↑${moved}` : `↓${Math.abs(moved)}`}
                  </motion.div>
                )}
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize:   compact ? "13px" : "15px",
                    fontWeight: 700,
                    color:      entry.tierColor,
                  }}>
                    {entry.craftScore}
                  </div>
                  {!compact && (
                    <div style={{
                      width: "48px", height: "3px",
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "2px",
                      overflow: "hidden",
                      marginTop: "2px",
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${entry.craftScore}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.06 }}
                        style={{ height: "100%", background: entry.tierColor, borderRadius: "2px" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Guest rank footer (if not in top list) */}
      {guestRank && !entries.find(e => e.guestProfileId === guestId) && (
        <div style={{
          borderTop: `1px solid ${accent}20`,
          marginTop: "10px",
          paddingTop: "10px",
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "12px",
          color: "#BFB49A",
        }}>
          Your rank: #{guestRank}
        </div>
      )}

      {/* Live indicator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "6px", marginTop: compact ? "8px" : "12px",
      }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 4, height: 4, borderRadius: "50%", background: accent }}
        />
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "9px", letterSpacing: "0.2em",
          color: "#6B5E4E", textTransform: "uppercase",
        }}>
          Live
        </span>
      </div>
    </div>
  );
}
