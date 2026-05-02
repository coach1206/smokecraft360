/**
 * LoungeLeagueTab — Lounge League competition dashboard.
 *
 * Sections:
 *  1. Weekly highlight — Top Lounge This Week + Best Experience Venue
 *  2. Full leaderboard with rank, score, badges, trend indicators
 *  3. My Lounge card — user's venue rank + "You helped your lounge" contribution note
 *  4. Badge legend
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Trophy, RefreshCw, Crown, Star, TrendingUp, Users,
  Flame, Medal, Award,
} from "lucide-react";
import { fetchLoungeLeague, fetchMyLoungeStats, type LoungeLeagueEntry } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.55)";
const MUTED    = "rgba(180,155,100,0.4)";

// ── Badge config ───────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  top_rated:      { label: "Top Rated",        icon: <Crown size={10} />,     color: GOLD_DIM                       },
  most_active:    { label: "Most Active",       icon: <Flame size={10} />,     color: "rgba(220,130,60,0.8)"         },
  best_experience:{ label: "Best Experience",   icon: <Star size={10} />,      color: "rgba(130,200,130,0.75)"       },
  trending_venue: { label: "Trending",          icon: <TrendingUp size={10} />,color: "rgba(100,160,255,0.7)"        },
};

// ── Rank medal colors ──────────────────────────────────────────────────────────

function rankColor(rank: number): string {
  if (rank === 1) return GOLD;
  if (rank === 2) return "rgba(192,192,192,0.85)";
  if (rank === 3) return "rgba(205,127,50,0.8)";
  return MUTED;
}

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="h-1 rounded-full overflow-hidden flex-1" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="h-full rounded-full"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.7), rgba(212,175,55,0.85))" }} />
    </div>
  );
}

// ── Badge chips ────────────────────────────────────────────────────────────────

function BadgeChips({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => {
        const cfg = BADGE_CONFIG[b];
        if (!cfg) return null;
        return (
          <span key={b}
            className="flex items-center gap-1 text-[6px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
            {cfg.icon}{cfg.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Leaderboard row ────────────────────────────────────────────────────────────

function LeaderRow({
  entry, maxScore, isMyLounge, index,
}: { entry: LoungeLeagueEntry; maxScore: number; isMyLounge: boolean; index: number }) {
  const rc = rankColor(entry.rank);
  const isTop3 = entry.rank <= 3;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 rounded-xl transition-all"
      style={{
        background:  isMyLounge ? "rgba(212,175,55,0.05)" : isTop3 ? "rgba(255,255,255,0.03)" : "transparent",
        border:      isMyLounge ? "1px solid rgba(212,175,55,0.2)" : isTop3 ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}>

      {/* Rank */}
      <div className="w-8 flex-shrink-0 text-center">
        {isTop3 ? (
          <Medal size={16} style={{ color: rc, margin: "0 auto" }} />
        ) : (
          <span className="font-serif text-sm" style={{ color: rc, fontWeight: 300 }}>{entry.rank}</span>
        )}
      </div>

      {/* Venue name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-serif text-sm leading-tight" style={{ color: isMyLounge ? "rgba(230,210,175,0.92)" : "rgba(210,190,155,0.8)" }}>
            {entry.loungeName}
          </p>
          {isMyLounge && (
            <span className="text-[6px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", color: GOLD_DIM }}>
              Your Lounge
            </span>
          )}
        </div>
        <BadgeChips badges={entry.badges} />
        <div className="flex items-center gap-4 mt-2">
          <ScoreBar score={entry.score} max={maxScore} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="font-serif text-sm" style={{ color: rc, fontWeight: 300 }}>{entry.score.toLocaleString()}</p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>score</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="font-serif text-sm" style={{ color: "rgba(200,180,145,0.7)", fontWeight: 300 }}>{entry.totalVerifiedOrders}</p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>verified</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="font-serif text-sm" style={{ color: "rgba(200,180,145,0.7)", fontWeight: 300 }}>{entry.weeklyOrders}</p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>this week</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-sm" style={{ color: "rgba(200,180,145,0.7)", fontWeight: 300 }}>{entry.totalUsers}</p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>members</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LoungeLeagueTab() {
  const { user }                                     = useAuth();
  const [league,    setLeague]    = useState<LoungeLeagueEntry[]>([]);
  const [myLounge,  setMyLounge]  = useState<(LoungeLeagueEntry & { totalVenues: number }) | null>(null);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.allSettled([fetchLoungeLeague(), fetchMyLoungeStats()]);
      if (l.status === "fulfilled") setLeague(l.value);
      if (m.status === "fulfilled") setMyLounge(m.value);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const maxScore    = Math.max(...league.map((e) => e.score), 1);
  const topLounge   = league[0];
  const bestExp     = league.find((e) => e.badges.includes("best_experience"));
  const trending    = league.find((e) => e.badges.includes("trending_venue"));
  const myVenueId   = user?.venueId;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Lounge League
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            Weekly competition · Experience rankings · Venue prestige
          </p>
        </div>
        <motion.button onClick={load}
          className="p-2 rounded-lg" whileTap={{ scale: 0.95 }}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }}>
          <RefreshCw size={12} />
        </motion.button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14">
          <motion.div className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : (
        <>

          {/* ── Weekly highlights ─────────────────────────────────────────── */}
          {(topLounge ?? bestExp ?? trending) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topLounge && (
                <motion.div className="rounded-2xl p-5"
                  style={{ background: "linear-gradient(135deg, rgba(120,80,5,0.2), rgba(212,175,55,0.06))", border: "1px solid rgba(212,175,55,0.22)" }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={13} style={{ color: GOLD_DIM }} />
                    <p className="text-[7px] uppercase tracking-[0.2em]" style={{ color: GOLD_DIM }}>Top Lounge This Week</p>
                  </div>
                  <p className="font-serif text-lg leading-tight" style={{ color: "rgba(230,210,175,0.9)", fontWeight: 300 }}>
                    {topLounge.loungeName}
                  </p>
                  <p className="text-[8px] mt-1" style={{ color: MUTED }}>{topLounge.score.toLocaleString()} pts · {topLounge.weeklyOrders} orders this week</p>
                </motion.div>
              )}

              {bestExp && (
                <motion.div className="rounded-2xl p-5"
                  style={{ background: "rgba(100,200,120,0.04)", border: "1px solid rgba(100,200,120,0.15)" }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={13} style={{ color: "rgba(130,200,130,0.75)" }} />
                    <p className="text-[7px] uppercase tracking-[0.2em]" style={{ color: "rgba(130,200,130,0.65)" }}>Best Experience Venue</p>
                  </div>
                  <p className="font-serif text-lg leading-tight" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>
                    {bestExp.loungeName}
                  </p>
                  <p className="text-[8px] mt-1" style={{ color: MUTED }}>{bestExp.repeatCustomers} repeat customers</p>
                </motion.div>
              )}

              {trending && (
                <motion.div className="rounded-2xl p-5"
                  style={{ background: "rgba(100,160,255,0.04)", border: "1px solid rgba(100,160,255,0.14)" }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={13} style={{ color: "rgba(100,160,255,0.7)" }} />
                    <p className="text-[7px] uppercase tracking-[0.2em]" style={{ color: "rgba(100,160,255,0.6)" }}>Trending This Week</p>
                  </div>
                  <p className="font-serif text-lg leading-tight" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>
                    {trending.loungeName}
                  </p>
                  <p className="text-[8px] mt-1" style={{ color: MUTED }}>{trending.weeklyOrders} orders this week</p>
                </motion.div>
              )}
            </div>
          )}

          {/* ── My Lounge contribution card ───────────────────────────────── */}
          {myLounge && (
            <motion.div className="rounded-xl p-5 flex items-center gap-5 flex-wrap"
              style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.22)" }}>
                <Users size={18} style={{ color: GOLD_DIM }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
                  You helped <span style={{ color: GOLD_DIM }}>{myLounge.loungeName}</span> rank{" "}
                  <span style={{ color: GOLD }}>#{myLounge.rank}</span> out of {myLounge.totalVenues} lounges
                </p>
                <p className="text-[8px] mt-1" style={{ color: MUTED }}>
                  Your visits contribute to weekly orders, member count, and overall lounge score.
                </p>
                <BadgeChips badges={myLounge.badges} />
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-serif text-2xl" style={{ color: rankColor(myLounge.rank), fontWeight: 300 }}>
                  #{myLounge.rank}
                </p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>this week</p>
              </div>
            </motion.div>
          )}

          {/* ── Scoring guide ─────────────────────────────────────────────── */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[7px] uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>How Lounge Score is Calculated</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[
                { label: "Verified Orders", formula: "×10 pts", icon: <Award size={11} /> },
                { label: "Weekly Orders",   formula: "×25 pts", icon: <TrendingUp size={11} /> },
                { label: "Members",         formula: "×5 pts",  icon: <Users size={11} /> },
                { label: "Repeat Visitors", formula: "×8 pts",  icon: <Crown size={11} /> },
              ].map(({ label, formula, icon }) => (
                <div key={label} className="rounded-lg p-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ color: GOLD_DIM, marginBottom: 4 }}>{icon}</div>
                  <p className="text-[7px] uppercase tracking-wide" style={{ color: MUTED }}>{label}</p>
                  <p className="text-[8px] font-medium mt-1" style={{ color: GOLD_DIM }}>{formula}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Full leaderboard ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Full Rankings</p>
              <p className="text-[7px]" style={{ color: MUTED }}>{league.length} lounges competing</p>
            </div>

            {league.length === 0 ? (
              <div className="py-10 text-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Trophy size={24} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.15)" }} />
                <p className="text-xs" style={{ color: MUTED }}>No lounge data yet — venues will appear here as orders are verified</p>
              </div>
            ) : (
              <div className="space-y-1">
                {league.map((entry, i) => (
                  <LeaderRow
                    key={entry.loungeId}
                    entry={entry}
                    maxScore={maxScore}
                    isMyLounge={entry.loungeId === myVenueId}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Badge legend ──────────────────────────────────────────────── */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[7px] uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>Lounge Badges</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(BADGE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2 rounded-lg p-2.5"
                  style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}>
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  <p className="text-[7px] uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
              ))}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
