/**
 * LeaderboardTab — Competition & status display.
 *
 * Three boards:
 *  1. Top Creators  — ranked by XP
 *  2. Top Smokers   — ranked by verified orders
 *  3. Trending      — most active in the last 7 days
 *
 * Shows level title, XP, verified order count per entry.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Crown, Flame, TrendingUp, RefreshCw, Trophy,
} from "lucide-react";
import { fetchLeaderboard, type LeaderboardData } from "@/services/api";

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.5)";

const MEDAL_COLORS = [
  "rgba(212,139,0,0.9)",   // 1st — gold
  "rgba(192,192,192,0.8)",  // 2nd — silver
  "rgba(176,120,60,0.8)",   // 3rd — bronze
];

function RankBadge({ rank }: { rank: number }) {
  const color = MEDAL_COLORS[rank - 1];
  if (color) {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium"
        style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
        {rank}
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-6 text-center text-[9px] tabular-nums"
      style={{ color: "rgba(107,94,78,0.35)" }}>
      {rank}
    </span>
  );
}

function LevelPip({ title }: { title: string }) {
  const colors: Record<string, string> = {
    "Explorer":          "rgba(160,140,110,0.65)",
    "Enthusiast":        "rgba(107,94,78,0.72)",
    "Aficionado":        "rgba(200,165,80,0.8)",
    "Connoisseur":       "rgba(212,139,0,0.9)",
    "Maestro del Fuego": "rgba(212,139,0,1)",
  };
  const color = colors[title] ?? "rgba(107,94,78,0.58)";
  return (
    <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
      style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
      {title}
    </span>
  );
}

function LeaderRow({ rank, name, sub, score, label, level, i }: {
  rank: number; name: string; sub: string; score: number;
  label: string; level: { title: string }; i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: "1px solid rgba(26,26,27,0.06)" }}>
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-serif text-xs" style={{ color: "rgba(210,190,155,0.85)" }}>{name}</p>
          <LevelPip title={level.title} />
        </div>
        <p className="text-[8px] mt-0.5" style={{ color: "rgba(107,94,78,0.38)" }}>{sub}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-serif" style={{ color: GOLD_DIM, fontWeight: 300 }}>{score.toLocaleString()}</p>
        <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(107,94,78,0.28)" }}>{label}</p>
      </div>
    </motion.div>
  );
}

function Board({ title, subtitle, icon, children, empty }: {
  title: string; subtitle: string; icon: React.ReactNode;
  children: React.ReactNode; empty: boolean;
}) {
  return (
    <div className="rounded-xl p-5"
      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: GOLD_DIM }}>{icon}</span>
        <div>
          <h3 className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>{title}</h3>
          <p className="text-[7px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(107,94,78,0.35)" }}>{subtitle}</p>
        </div>
      </div>
      {empty
        ? <p className="text-xs text-center py-4" style={{ color: "rgba(107,94,78,0.30)" }}>
            No data yet — verified orders populate the leaderboard
          </p>
        : children
      }
    </div>
  );
}

export function LeaderboardTab() {
  const [data,    setData]    = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"creators" | "smokers" | "trending">("creators");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchLeaderboard());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Leaderboard
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>
            Competition · status · bragging rights
          </p>
        </div>
        <motion.button onClick={load}
          className="p-2 rounded-lg"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.50)" }}
          whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.95 }}>
          <RefreshCw size={12} />
        </motion.button>
      </div>

      {/* Sub-tab selector */}
      <div className="flex gap-1 p-0.5 rounded-lg w-fit"
        style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)" }}>
        {([
          { id: "creators",  label: "Top Creators",  icon: <Crown size={10} />   },
          { id: "smokers",   label: "Top Smokers",   icon: <Flame size={10} />   },
          { id: "trending",  label: "Trending",       icon: <TrendingUp size={10} /> },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] uppercase tracking-[0.12em] transition-all duration-200"
            style={tab === t.id
              ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.85)" }
              : { color: "rgba(107,94,78,0.45)" }
            }>{t.icon}{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : !data ? (
        <div className="py-12 text-center">
          <Trophy size={28} className="mx-auto mb-3" style={{ color: "rgba(107,94,78,0.20)" }} />
          <p className="text-xs" style={{ color: "rgba(107,94,78,0.40)" }}>Could not load leaderboard</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === "creators" && (
            <motion.div key="creators" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <Board title="Top Creators" subtitle="Ranked by total XP earned" icon={<Crown size={14} />}
                empty={data.topCreators.length === 0}>
                {data.topCreators.map((u, i) => (
                  <LeaderRow
                    key={u.userId} rank={i + 1} i={i}
                    name={u.name}
                    sub={`${u.totalVerifiedOrders} verified order${u.totalVerifiedOrders !== 1 ? "s" : ""}`}
                    score={u.xp} label="XP" level={u.level}
                  />
                ))}
              </Board>
            </motion.div>
          )}

          {tab === "smokers" && (
            <motion.div key="smokers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <Board title="Top Smokers" subtitle="Most verified lounge experiences" icon={<Flame size={14} />}
                empty={data.topSmokers.length === 0}>
                {data.topSmokers.map((u, i) => (
                  <LeaderRow
                    key={u.userId} rank={i + 1} i={i}
                    name={u.name}
                    sub={`${u.xp} XP · ${u.totalCigarsSmoked ?? 0} cigars · ${u.totalDrinksTried ?? 0} drinks`}
                    score={u.totalVerifiedOrders} label="orders" level={u.level}
                  />
                ))}
              </Board>
            </motion.div>
          )}

          {tab === "trending" && (
            <motion.div key="trending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <Board title="Trending This Week" subtitle="Most verified orders in the last 7 days" icon={<TrendingUp size={14} />}
                empty={data.trendingUsers.length === 0}>
                {data.trendingUsers.map((u, i) => (
                  <motion.div key={u.userId}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: "1px solid rgba(26,26,27,0.06)" }}>
                    <RankBadge rank={i + 1} />
                    <div className="flex-1">
                      <p className="font-serif text-xs" style={{ color: "rgba(210,190,155,0.85)" }}>{u.name}</p>
                      <p className="text-[8px]" style={{ color: "rgba(107,94,78,0.38)" }}>Trending this week</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-serif" style={{ color: GOLD_DIM, fontWeight: 300 }}>{u.orderCount}</p>
                      <p className="text-[7px] uppercase tracking-[0.1em]" style={{ color: "rgba(107,94,78,0.28)" }}>orders</p>
                    </div>
                  </motion.div>
                ))}
              </Board>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Level guide */}
      <div className="rounded-xl p-5" style={{ background: "rgba(212,139,0,0.02)", border: "1px solid rgba(212,139,0,0.1)" }}>
        <p className="text-[8px] uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(107,94,78,0.40)" }}>Level Progression</p>
        <div className="space-y-2">
          {[
            { title: "Explorer",          orders: "0+",  xp: "0+",   color: "rgba(160,140,110,0.65)" },
            { title: "Enthusiast",        orders: "5+",  xp: "50+",  color: "rgba(107,94,78,0.72)" },
            { title: "Aficionado",        orders: "15+", xp: "150+", color: "rgba(200,165,80,0.8)"   },
            { title: "Connoisseur",       orders: "30+", xp: "350+", color: "rgba(212,139,0,0.9)"   },
            { title: "Maestro del Fuego", orders: "60+", xp: "700+", color: "rgba(212,139,0,1)"     },
          ].map((tier) => (
            <div key={tier.title} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
                <span className="text-[10px] font-serif" style={{ color: tier.color }}>{tier.title}</span>
              </div>
              <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.38)" }}>
                {tier.orders} verified orders · {tier.xp} XP
              </span>
            </div>
          ))}
        </div>
        <p className="text-[8px] mt-3 pt-3" style={{ color: "rgba(107,94,78,0.28)", borderTop: "1px solid rgba(26,26,27,0.07)" }}>
          Maestro del Fuego unlocks: Signature Cigar Creator · Custom Band Designer
        </p>
      </div>
    </div>
  );
}
