/**
 * CompetitionModule — live, daily, weekly, venue, and grand craft tournaments.
 * Route: /competition
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Zap, Calendar, Users,
  ChevronRight, Medal, Crown, Star, RefreshCw, BarChart2, MapPin,
} from "lucide-react";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";
import { useVenueContext } from "@/contexts/VenueContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type TournamentType = "live" | "daily" | "weekly" | "venue" | "grand";
type TournamentStatus = "upcoming" | "active" | "scoring" | "completed" | "cancelled";

interface Tournament {
  id: string;
  title: string;
  description: string | null;
  type: TournamentType;
  craftType: string | null;
  status: TournamentStatus;
  startAt: string;
  endAt: string;
  maxEntrants: number | null;
  prizeFirst: string | null;
  prizeSecond: string | null;
  prizeThird: string | null;
  featured: boolean;
  entrantCount: number;
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string | null;
  score: number;
  rank: number | null;
  joinedAt: string;
}

interface CraftLeaderEntry {
  rank: number;
  name: string;
  score: number;
  craft: string;
}

interface LoungeEntry {
  loungeId: string | null;
  loungeName: string;
  score: number;
  rank: number;
  isSelf: boolean;
}

interface LiveContext {
  craftLeaderboard: CraftLeaderEntry[];
  loungeLeague: LoungeEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<TournamentType, { label: string; color: string; icon: React.FC<{ size?: number; color?: string }> }> = {
  live:    { label: "Live Sprint",  color: "#ef4444", icon: Zap },
  daily:   { label: "Daily",        color: "#f59e0b", icon: Calendar },
  weekly:  { label: "Weekly",       color: "#8b5cf6", icon: Trophy },
  venue:   { label: "Venue Champ",  color: "#06b6d4", icon: Star },
  grand:   { label: "Grand Master", color: "#d4af37", icon: Crown },
};

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(endAt: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(endAt).getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, new Date(endAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  const s = Math.floor(remaining / 1000);
  const days    = Math.floor(s / 86400);
  const hours   = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  return { days, hours, minutes, seconds, expired: remaining === 0 };
}

// ── Countdown Display ─────────────────────────────────────────────────────────

function CountdownDisplay({ endAt, color }: { endAt: string; color: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(endAt);

  if (expired) return <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>ENDED</span>;

  const parts = days > 0
    ? [{ v: days, l: "d" }, { v: hours, l: "h" }, { v: minutes, l: "m" }]
    : [{ v: hours, l: "h" }, { v: minutes, l: "m" }, { v: seconds, l: "s" }];

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      {parts.map(({ v, l }) => (
        <span key={l} style={{ fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{String(v).padStart(2, "0")}</span>
          <span style={{ fontSize: 11, color: "rgba(232,224,200,0.45)", marginLeft: 2 }}>{l}</span>
        </span>
      ))}
    </div>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = { 1: "#d4af37", 2: "#9ca3af", 3: "#b87333" };
  const c = colors[rank] ?? "rgba(232,224,200,0.3)";
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", background: `${c}20`,
      border: `2px solid ${c}`, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
      {rank <= 3
        ? <Medal size={14} color={c} />
        : <span style={{ fontSize: 11, fontWeight: 700, color: c }}>#{rank}</span>}
    </div>
  );
}

// ── Tournament Card ───────────────────────────────────────────────────────────

function TournamentCard({
  tournament,
  onSelect,
}: {
  tournament: Tournament;
  onSelect: (t: Tournament) => void;
}) {
  const meta = TYPE_META[tournament.type];
  const Icon = meta.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(tournament)}
      style={{
        display: "flex", flexDirection: "column", gap: 12,
        padding: 20, borderRadius: 16, textAlign: "left",
        background: `${meta.color}08`,
        border: `1px solid ${meta.color}35`,
        cursor: "pointer", width: "100%",
        position: "relative", overflow: "hidden",
      }}
    >
      {tournament.featured && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
          color: meta.color, background: `${meta.color}18`,
          border: `1px solid ${meta.color}35`, padding: "2px 8px", borderRadius: 999,
        }}>Featured</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={20} color={meta.color} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e0c8", marginBottom: 2 }}>
            {tournament.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase",
              color: meta.color, background: `${meta.color}18`,
              border: `1px solid ${meta.color}30`, padding: "1px 7px", borderRadius: 999,
            }}>{meta.label}</span>
            {tournament.craftType && (
              <span style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "capitalize" }}>
                · {tournament.craftType}
              </span>
            )}
          </div>
        </div>
      </div>

      {tournament.description && (
        <div style={{ fontSize: 12, color: "rgba(232,224,200,0.55)", lineHeight: 1.5 }}>
          {tournament.description}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Time Remaining
          </div>
          <CountdownDisplay endAt={tournament.endAt} color={meta.color} />
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            <Users size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />
            Entrants
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e0c8" }}>
            {tournament.entrantCount}
          </div>
        </div>
      </div>

      {tournament.prizeFirst && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)",
        }}>
          <Trophy size={12} color="#d4af37" />
          <span style={{ fontSize: 11, color: "rgba(232,224,200,0.65)" }}>
            1st: <span style={{ color: "#d4af37", fontWeight: 600 }}>{tournament.prizeFirst}</span>
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ChevronRight size={16} color="rgba(232,224,200,0.3)" />
      </div>
    </motion.button>
  );
}

// ── Leaderboard Panel ─────────────────────────────────────────────────────────

function LeaderboardPanel({
  tournament,
  entries,
  loading,
  onEnter,
  entering,
  onClose,
}: {
  tournament: Tournament;
  entries: LeaderboardEntry[];
  loading: boolean;
  onEnter: () => void;
  entering: boolean;
  onClose: () => void;
}) {
  const meta = TYPE_META[tournament.type];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        background: "rgba(10,8,6,0.95)",
        border: `1px solid ${meta.color}30`, borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${meta.color}20`,
        background: `${meta.color}06`, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(232,224,200,0.5)", cursor: "pointer", fontSize: 12,
            }}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            disabled={entering || tournament.status !== "active"}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 12,
              background: tournament.status === "active" ? meta.color : "rgba(255,255,255,0.06)",
              border: "none", cursor: tournament.status === "active" && !entering ? "pointer" : "not-allowed",
              color: tournament.status === "active" ? "#000" : "rgba(232,224,200,0.3)",
              fontWeight: 700, fontSize: 13,
              opacity: entering ? 0.7 : 1,
            }}
          >
            {entering ? "Entering…" : tournament.status === "active" ? "Enter Competition" : "Not Active"}
          </motion.button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={24} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e0c8" }}>{tournament.title}</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.45)", marginTop: 2 }}>
              {tournament.description}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Ends In</div>
            <CountdownDisplay endAt={tournament.endAt} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Entrants</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#e8e0c8" }}>{tournament.entrantCount}</div>
          </div>
        </div>

        {(tournament.prizeFirst || tournament.prizeSecond || tournament.prizeThird) && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tournament.prizeFirst && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥇</span>
                <span style={{ fontSize: 11, color: "#d4af37", fontWeight: 600 }}>{tournament.prizeFirst}</span>
              </div>
            )}
            {tournament.prizeSecond && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥈</span>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{tournament.prizeSecond}</span>
              </div>
            )}
            {tournament.prizeThird && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(184,115,51,0.08)", border: "1px solid rgba(184,115,51,0.2)" }}>
                <span style={{ fontSize: 10 }}>🥉</span>
                <span style={{ fontSize: 11, color: "#b87333", fontWeight: 600 }}>{tournament.prizeThird}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "rgba(232,224,200,0.4)",
          textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12,
        }}>
          Live Leaderboard
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <RefreshCw size={20} color="rgba(232,224,200,0.3)" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            padding: "40px 20px", color: "rgba(232,224,200,0.3)", textAlign: "center",
          }}>
            <Trophy size={32} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>No entries yet</div>
            <div style={{ fontSize: 12 }}>Be the first to compete!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map((entry, i) => {
              const rank = entry.rank ?? i + 1;
              const rankColors: Record<number, string> = { 1: "#d4af37", 2: "#9ca3af", 3: "#b87333" };
              const c = rankColors[rank] ?? "rgba(232,224,200,0.6)";
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12,
                    background: rank <= 3 ? `${c}08` : "rgba(255,255,255,0.02)",
                    border: rank <= 3 ? `1px solid ${c}30` : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <RankBadge rank={rank} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e0c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.userName ?? "Guest"}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(232,224,200,0.35)", marginTop: 2 }}>
                      Entered {new Date(entry.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{entry.score}</div>
                    <div style={{ fontSize: 9, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>pts</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CompetitionModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected]       = useState<Tournament | null>(null);
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB]     = useState(false);
  const [entering, setEntering]       = useState(false);
  const [filterType, setFilterType]   = useState<TournamentType | "all">("all");
  const [toast, setToast]             = useState<string | null>(null);
  const [liveCtx, setLiveCtx]         = useState<LiveContext | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadTournaments = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiFetch("/competitions");
      setTournaments(data);
    } catch {
      // best-effort
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadLiveContext = useCallback(async () => {
    try {
      // Craft leaderboard: uses /api/craft/leaderboard (public, same data source as tournament scoring)
      const craftData: CraftLeaderEntry[] = await apiFetch("/craft/leaderboard?limit=5")
        .catch(() => []);

      // Lounge league: uses /api/lounge-league (auth-protected, applies venue anonymization)
      const loungeData: LoungeEntry[] = await apiFetch("/lounge-league")
        .catch(() => []);

      setLiveCtx({
        craftLeaderboard: craftData,
        loungeLeague: (Array.isArray(loungeData) ? loungeData : []).slice(0, 5),
      });
    } catch {
      // best-effort — non-critical sidebar panel
    }
  }, []);

  const loadLeaderboard = useCallback(async (id: string) => {
    setLoadingLB(true);
    try {
      const data = await apiFetch(`/competitions/${id}/leaderboard`);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoadingLB(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
    loadLiveContext();
  }, [loadTournaments, loadLiveContext]);

  useEffect(() => {
    if (!selected) return;
    loadLeaderboard(selected.id);
    const id = setInterval(() => loadLeaderboard(selected.id), 15_000);
    return () => clearInterval(id);
  }, [selected, loadLeaderboard]);

  async function handleEnter() {
    if (!selected) return;
    setEntering(true);
    try {
      await apiFetch(`/competitions/${selected.id}/enter`, { method: "POST" });
      // Immediately sync the authoritative craft-build score from the DB
      await apiFetch(`/competitions/${selected.id}/sync-score`, { method: "POST" })
        .catch(() => { /* best-effort — entry still succeeded */ });
      showToast("You're in! Your craft score has been recorded.");
      await loadLeaderboard(selected.id);
      await loadTournaments();
      setSelected(prev => prev
        ? { ...prev, entrantCount: prev.entrantCount + 1 }
        : prev
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not enter";
      if (msg.includes("409")) {
        showToast("Already entered — may the best score win!");
      } else {
        showToast("Sign in to enter a competition.");
      }
    } finally {
      setEntering(false);
    }
  }

  const visible = filterType === "all"
    ? tournaments
    : tournaments.filter(t => t.type === filterType);

  const featured   = visible.filter(t => t.featured);
  const nonfeatured = visible.filter(t => !t.featured);

  return (
    <BackgroundLayer
      image={getBackground("dashboard")}
      style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,8,6,0.85)", backdropFilter: "blur(8px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(232,224,200,0.5)", cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>Competitions</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Craft Tournaments · Live Leaderboards</div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={loadTournaments}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(232,224,200,0.5)", cursor: "pointer",
          }}
        >
          <RefreshCw size={16} />
        </motion.button>
      </div>

      {/* Filter chips */}
      <div style={{
        display: "flex", gap: 8, padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(10,8,6,0.6)", flexShrink: 0, overflowX: "auto",
      }}>
        {(["all", "live", "daily", "weekly", "venue", "grand"] as const).map(t => {
          const active = filterType === t;
          const color  = t === "all" ? "#d4af37" : TYPE_META[t].color;
          return (
            <motion.button
              key={t}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterType(t)}
              style={{
                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                textTransform: "capitalize", whiteSpace: "nowrap",
                background: active ? `${color}20` : "rgba(255,255,255,0.03)",
                border: active ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.08)",
                color: active ? color : "rgba(232,224,200,0.4)",
              }}
            >
              {t === "all" ? "All" : TYPE_META[t].label}
            </motion.button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Tournament list */}
        <div style={{
          flex: selected ? "0 0 380px" : "1",
          overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
          transition: "flex 0.3s ease",
          maxWidth: selected ? 380 : "100%",
        }}>
          {loadingList ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <RefreshCw size={24} color="rgba(232,224,200,0.3)" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : visible.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
              padding: "64px 20px", color: "rgba(232,224,200,0.3)", textAlign: "center",
            }}>
              <Trophy size={40} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>No active tournaments</div>
              <div style={{ fontSize: 12 }}>Check back soon — competitions reset regularly.</div>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "rgba(212,175,55,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.2em",
                  }}>
                    ⭐ Featured
                  </div>
                  {featured.map((t, i) => (
                    <motion.div key={t.id} transition={{ delay: i * 0.05 }}>
                      <TournamentCard tournament={t} onSelect={setSelected} />
                    </motion.div>
                  ))}
                </>
              )}
              {nonfeatured.length > 0 && (
                <>
                  {featured.length > 0 && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: "rgba(232,224,200,0.3)",
                      textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 4,
                    }}>
                      All Competitions
                    </div>
                  )}
                  {nonfeatured.map((t, i) => (
                    <motion.div key={t.id} transition={{ delay: i * 0.05 }}>
                      <TournamentCard tournament={t} onSelect={setSelected} />
                    </motion.div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Right panel: leaderboard (if tournament selected) or live context */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              style={{
                flex: 1, padding: "16px 20px",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <LeaderboardPanel
                tournament={selected}
                entries={entries}
                loading={loadingLB}
                onEnter={handleEnter}
                entering={entering}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          ) : liveCtx && (liveCtx.craftLeaderboard.length > 0 || liveCtx.loungeLeague.length > 0) ? (
            <motion.div
              key="context"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                width: 300, flexShrink: 0,
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                overflowY: "auto", padding: "16px 16px",
                display: "flex", flexDirection: "column", gap: 20,
              }}
            >
              {/* Craft Leaderboard context */}
              {liveCtx.craftLeaderboard.length > 0 && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                    fontSize: 10, fontWeight: 700, color: "rgba(232,224,200,0.4)",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                  }}>
                    <BarChart2 size={11} />
                    Craft Leaderboard
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {liveCtx.craftLeaderboard.slice(0, 5).map((entry, i) => {
                      const rankColors: Record<number, string> = { 1: "#d4af37", 2: "#9ca3af", 3: "#b87333" };
                      const c = rankColors[i + 1] ?? "rgba(232,224,200,0.4)";
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 10px", borderRadius: 10,
                          background: i < 3 ? `${c}08` : "rgba(255,255,255,0.02)",
                          border: i < 3 ? `1px solid ${c}25` : "1px solid rgba(255,255,255,0.04)",
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: `${c}15`, border: `1px solid ${c}40`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: c }}>#{i + 1}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600, color: "#e8e0c8",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{entry.name}</div>
                            <div style={{ fontSize: 9, color: "rgba(232,224,200,0.35)", textTransform: "capitalize" }}>
                              {entry.craft} craft
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{entry.score}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lounge League context */}
              {liveCtx.loungeLeague.length > 0 && (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                    fontSize: 10, fontWeight: 700, color: "rgba(232,224,200,0.4)",
                    textTransform: "uppercase", letterSpacing: "0.15em",
                  }}>
                    <MapPin size={11} />
                    Lounge League
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {liveCtx.loungeLeague.map((lounge, i) => {
                      const c = i === 0 ? "#d4af37" : "rgba(232,224,200,0.4)";
                      return (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 10px", borderRadius: 10,
                          background: i === 0 ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                          border: i === 0 ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.04)",
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: c, width: 20, textAlign: "center" }}>
                            #{lounge.rank}
                          </span>
                          <div style={{
                            flex: 1, fontSize: 12, fontWeight: 600, color: "#e8e0c8",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {lounge.loungeName}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{lounge.score.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            style={{
              position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
              background: "rgba(30,25,18,0.95)", border: "1px solid rgba(212,175,55,0.4)",
              borderRadius: 14, padding: "12px 24px",
              fontSize: 13, fontWeight: 600, color: "#e8e0c8",
              zIndex: 1000, backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </BackgroundLayer>
  );
}
