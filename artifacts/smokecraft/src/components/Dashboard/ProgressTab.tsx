/**
 * ProgressTab — user-facing My Progress dashboard.
 *
 * Sections:
 *  1. Level card — tier, XP bar, next-tier requirements
 *  2. Stats grid — orders, cigars, drinks, food, blends, unique products
 *  3. Achievement badges — milestones computed from progression data
 *  4. Humidor preview — last 6 verified purchases
 *  5. XP Breakdown guide — how points are earned
 */

import { useState, useEffect, useCallback }  from "react";
import { motion, AnimatePresence }            from "framer-motion";
import {
  Crown, Flame, RefreshCw, Lock, CheckCircle2,
  Cigarette, GlassWater, UtensilsCrossed, Star,
  Palette, Trophy, Target, Zap, Award,
} from "lucide-react";
import { fetchProgression, type UserProgressionData } from "@/services/api";
import { LEVEL_TIERS, levelProgress, nextTier }       from "@/lib/levels";

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.55)";
const MUTED    = "rgba(180,155,100,0.4)";

// ── Achievement definitions ────────────────────────────────────────────────────

interface Achievement {
  id:       string;
  label:    string;
  desc:     string;
  icon:     React.ReactNode;
  unlocked: (p: UserProgressionData) => boolean;
  category: "orders" | "collection" | "blend" | "xp" | "elite";
}

const ACHIEVEMENTS: Achievement[] = [
  // Orders
  {
    id: "first_order", label: "First Light", category: "orders",
    desc: "Complete your first verified lounge order",
    icon: <Flame size={14} />,
    unlocked: (p) => p.totalVerifiedOrders >= 1,
  },
  {
    id: "five_orders", label: "Smoke Ring", category: "orders",
    desc: "5 verified lounge experiences",
    icon: <Flame size={14} />,
    unlocked: (p) => p.totalVerifiedOrders >= 5,
  },
  {
    id: "fifteen_orders", label: "The Circuit", category: "orders",
    desc: "15 verified lounge experiences",
    icon: <Flame size={14} />,
    unlocked: (p) => p.totalVerifiedOrders >= 15,
  },
  {
    id: "thirty_orders", label: "Veteran", category: "orders",
    desc: "30 verified lounge experiences",
    icon: <Trophy size={14} />,
    unlocked: (p) => p.totalVerifiedOrders >= 30,
  },
  {
    id: "sixty_orders", label: "Legend", category: "orders",
    desc: "60 verified lounge experiences — Maestro territory",
    icon: <Crown size={14} />,
    unlocked: (p) => p.totalVerifiedOrders >= 60,
  },
  // Collection
  {
    id: "first_drink", label: "Cocktail Hour", category: "collection",
    desc: "First drink pairing ordered",
    icon: <GlassWater size={14} />,
    unlocked: (p) => p.totalDrinksTried >= 1,
  },
  {
    id: "five_drinks", label: "Smoke & Sip", category: "collection",
    desc: "5 different spirit pairings sampled",
    icon: <GlassWater size={14} />,
    unlocked: (p) => p.totalDrinksTried >= 5,
  },
  {
    id: "first_food", label: "The Spread", category: "collection",
    desc: "First food pairing ordered",
    icon: <UtensilsCrossed size={14} />,
    unlocked: (p) => p.totalFoodOrders >= 1,
  },
  {
    id: "ten_unique", label: "Explorer's Pack", category: "collection",
    desc: "10 unique products tried",
    icon: <Target size={14} />,
    unlocked: (p) => p.uniqueProductsTried >= 10,
  },
  {
    id: "twentyfive_unique", label: "Collector", category: "collection",
    desc: "25 unique products tried",
    icon: <Star size={14} />,
    unlocked: (p) => p.uniqueProductsTried >= 25,
  },
  // Blends
  {
    id: "first_blend", label: "Blend Apprentice", category: "blend",
    desc: "Create your first custom blend",
    icon: <Palette size={14} />,
    unlocked: (p) => p.blendsCreated >= 1,
  },
  {
    id: "five_blends", label: "Blend Master", category: "blend",
    desc: "5 unique blends created",
    icon: <Palette size={14} />,
    unlocked: (p) => p.blendsCreated >= 5,
  },
  // XP
  {
    id: "xp_100", label: "XP Warrior", category: "xp",
    desc: "Earn 100 XP from verified orders",
    icon: <Zap size={14} />,
    unlocked: (p) => p.xp >= 100,
  },
  {
    id: "xp_500", label: "XP Champion", category: "xp",
    desc: "Earn 500 XP from verified orders",
    icon: <Zap size={14} />,
    unlocked: (p) => p.xp >= 500,
  },
  // Elite
  {
    id: "elite_status", label: "Elite Status", category: "elite",
    desc: "Reach Connoisseur tier",
    icon: <Crown size={14} />,
    unlocked: (p) => p.level.index >= 3,
  },
  {
    id: "maestro", label: "Maestro del Fuego", category: "elite",
    desc: "Reach the highest tier — unlock Signature Cigar Creator",
    icon: <Crown size={14} />,
    unlocked: (p) => p.level.index >= 4,
  },
];

const CATEGORY_LABELS: Record<Achievement["category"], string> = {
  orders:     "Experience",
  collection: "Collection",
  blend:      "Creation",
  xp:         "XP",
  elite:      "Elite",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: string;
}) {
  return (
    <motion.div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
      whileHover={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
      </div>
      <span className="font-serif text-2xl" style={{ color, fontWeight: 300 }}>{value.toLocaleString()}</span>
    </motion.div>
  );
}

function BadgeCard({ badge, unlocked }: { badge: Achievement; unlocked: boolean }) {
  return (
    <motion.div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        background: unlocked ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.02)",
        border: unlocked ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.06)",
        opacity: unlocked ? 1 : 0.5,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: unlocked ? 1 : 0.5, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: unlocked ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
          color: unlocked ? GOLD : MUTED,
        }}
      >
        {unlocked ? badge.icon : <Lock size={12} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-serif truncate" style={{ color: unlocked ? "rgba(220,200,165,0.9)" : MUTED }}>
          {badge.label}
        </p>
        <p className="text-[8px] mt-0.5 leading-relaxed" style={{ color: "rgba(180,155,100,0.35)" }}>
          {badge.desc}
        </p>
      </div>
      {unlocked && (
        <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: "rgba(212,175,55,0.6)" }} />
      )}
    </motion.div>
  );
}

function XpBar({ current, next, pct }: { current: number; next: number | null; pct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-serif" style={{ color: GOLD, fontWeight: 300 }}>
          {current.toLocaleString()} XP
        </span>
        {next !== null && (
          <span className="text-[8px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            {next.toLocaleString()} XP next tier
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.9), rgba(212,175,55,1))" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[7px] uppercase tracking-widest" style={{ color: "rgba(180,155,100,0.3)" }}>
          Progress
        </span>
        <span className="text-[7px] tabular-nums" style={{ color: MUTED }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProgressTab() {
  const [data,    setData]    = useState<UserProgressionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<Achievement["category"] | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchProgression());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center">
        <Award size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
        <p className="text-xs" style={{ color: MUTED }}>Could not load progression data</p>
      </div>
    );
  }

  const currentTier = LEVEL_TIERS[data.level.index] ?? LEVEL_TIERS[0]!;
  const next        = nextTier(data.totalVerifiedOrders, data.xp);
  const pct         = levelProgress(data.totalVerifiedOrders, data.xp);
  const isMaestro   = data.level.index >= 4;
  const isElite     = data.level.index >= 3;

  const allAchievements = ACHIEVEMENTS.map((a) => ({ ...a, earned: a.unlocked(data) }));
  const visibleBadges   = catFilter === "all"
    ? allAchievements
    : allAchievements.filter((a) => a.category === catFilter);
  const earnedCount     = allAchievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            My Progress
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            XP · Achievements · Humidor
          </p>
        </div>
        <motion.button onClick={load}
          className="p-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }}
          whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.95 }}>
          <RefreshCw size={12} />
        </motion.button>
      </div>

      {/* Level card */}
      <motion.div
        className="rounded-2xl p-6"
        style={{
          background: isElite
            ? "linear-gradient(135deg, rgba(120,80,5,0.18), rgba(212,175,55,0.06))"
            : "rgba(255,255,255,0.025)",
          border: `1px solid ${currentTier.borderColor}`,
          boxShadow: isElite ? "0 0 40px rgba(212,175,55,0.06)" : "none",
        }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {isElite ? (
              <Crown size={20} style={{ color: currentTier.color, filter: isMaestro ? "drop-shadow(0 0 6px rgba(212,175,55,0.5))" : "none" }} />
            ) : (
              <Flame size={20} style={{ color: currentTier.color }} />
            )}
            <div>
              <h3 className="font-serif text-lg leading-tight" style={{ color: currentTier.color, fontWeight: 300 }}>
                {currentTier.title}
              </h3>
              <p className="text-[8px] uppercase tracking-[0.2em] mt-0.5" style={{ color: MUTED }}>
                {currentTier.subtitle}
              </p>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[7px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>Tier</span>
            <div className="flex gap-1">
              {LEVEL_TIERS.map((t) => (
                <div key={t.index}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: t.index <= data.level.index ? t.color : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <XpBar current={data.xp} next={next?.minXp ?? null} pct={pct} />

        {next && (
          <p className="text-[8px] mt-3" style={{ color: "rgba(180,155,100,0.35)" }}>
            Next: <span style={{ color: MUTED }}>{next.title}</span> · Needs {next.minOrders} orders + {next.minXp} XP
          </p>
        )}
        {!next && (
          <p className="text-[8px] mt-3" style={{ color: "rgba(212,175,55,0.5)" }}>
            You have reached the highest tier. Signature Cigar Creator unlocked.
          </p>
        )}
      </motion.div>

      {/* Stats grid */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>Lifetime Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Verified Orders"    value={data.totalVerifiedOrders} icon={<Trophy size={13} />}          color="rgba(212,175,55,0.85)" />
          <StatCard label="Cigars Smoked"      value={data.totalCigarsSmoked}   icon={<Cigarette size={13} />}       color="rgba(200,165,80,0.8)"  />
          <StatCard label="Drinks Tried"       value={data.totalDrinksTried}    icon={<GlassWater size={13} />}      color="rgba(180,155,100,0.8)" />
          <StatCard label="Food Orders"        value={data.totalFoodOrders}     icon={<UtensilsCrossed size={13} />} color="rgba(160,140,110,0.7)" />
          <StatCard label="Blends Created"     value={data.blendsCreated}       icon={<Palette size={13} />}         color="rgba(212,175,55,0.7)"  />
          <StatCard label="Unique Products"    value={data.uniqueProductsTried} icon={<Star size={13} />}            color="rgba(200,165,80,0.75)" />
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
              Achievements
            </p>
            <p className="text-[7px] mt-0.5" style={{ color: "rgba(180,155,100,0.3)" }}>
              {earnedCount} / {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
          {/* Category filter pills */}
          <div className="flex gap-1 flex-wrap">
            {(["all", "orders", "collection", "blend", "xp", "elite"] as const).map((cat) => (
              <button key={cat}
                onClick={() => setCatFilter(cat)}
                className="px-2.5 py-1 rounded-full text-[7px] uppercase tracking-[0.12em] transition-all duration-150"
                style={catFilter === cat
                  ? { background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.3)", color: GOLD_DIM }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: MUTED }
                }
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar for earned */}
        <div className="h-0.5 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.8), rgba(212,175,55,0.9))" }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={catFilter} className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            {/* Earned first */}
            {[...visibleBadges].sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0)).map((badge) => (
              <BadgeCard key={badge.id} badge={badge} unlocked={badge.earned} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Humidor */}
      {data.humidor.length > 0 && (
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>
            Personal Humidor · {data.humidor.length} product{data.humidor.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.humidor.slice(0, 6).map((item, i) => (
              <motion.div key={item.productId}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              >
                <p className="text-xs font-serif leading-tight" style={{ color: "rgba(210,190,155,0.82)" }}>
                  {item.productName ?? "Unknown"}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>
                    {item.category}
                  </span>
                  <span className="text-[7px] tabular-nums" style={{ color: GOLD_DIM }}>
                    ×{item.quantityPurchased}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* XP Guide */}
      <div className="rounded-xl p-5" style={{ background: "rgba(212,175,55,0.02)", border: "1px solid rgba(212,175,55,0.1)" }}>
        <p className="text-[8px] uppercase tracking-[0.2em] mb-4" style={{ color: MUTED }}>How XP is Earned</p>
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-6">
          {[
            { label: "Cigar purchase",        xp: "+10 XP" },
            { label: "Drink pairing",         xp: "+8 XP"  },
            { label: "Food order",            xp: "+4 XP"  },
            { label: "Full combo (all 3)",    xp: "+20 XP" },
            { label: "New product first try", xp: "+5 XP"  },
          ].map(({ label, xp }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[9px]" style={{ color: "rgba(180,155,100,0.55)" }}>{label}</span>
              <span className="text-[9px] font-medium flex-shrink-0" style={{ color: GOLD_DIM }}>{xp}</span>
            </div>
          ))}
        </div>
        <p className="text-[7px] mt-4 pt-3" style={{ color: "rgba(180,155,100,0.28)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          XP is only awarded on staff-verified orders. Unverified orders do not count.
        </p>
      </div>

    </div>
  );
}
