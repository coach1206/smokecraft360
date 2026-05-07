/**
 * ProgressTab — user-facing My Progress + Loyalty Points + Rewards dashboard.
 *
 * Sections:
 *  1. Points balance card — spendable loyalty points
 *  2. Level card — tier, XP bar, next-tier requirements
 *  3. Available rewards — redeem with one click
 *  4. Stats grid — orders, cigars, drinks, food, blends, unique products
 *  5. Achievement badges — milestones computed from progression data
 *  6. Humidor preview — last 6 verified purchases
 *  7. Earn guide — XP + points schedule
 */

import { useState, useEffect, useCallback }  from "react";
import { motion, AnimatePresence }            from "framer-motion";
import { toast }                              from "sonner";
import {
  Crown, Flame, RefreshCw, Lock, CheckCircle2,
  Cigarette, GlassWater, UtensilsCrossed, Star,
  Palette, Trophy, Target, Zap, Award, Gift, CheckCircle, Clock,
} from "lucide-react";
import {
  fetchProgression, fetchLoyalty, redeemReward,
  type UserProgressionData, type LoyaltyData, type RewardItem,
} from "@/services/api";
import { LEVEL_TIERS, levelProgress, nextTier } from "@/lib/levels";

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.55)";
const MUTED    = "rgba(107,94,78,0.40)";

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
  // Blend
  {
    id: "first_blend", label: "Blend Initiate", category: "blend",
    desc: "Create your first signature cigar blend",
    icon: <Palette size={14} />,
    unlocked: (p) => (p.blendsCreated ?? 0) >= 1,
  },
  {
    id: "five_blends", label: "Master Blender", category: "blend",
    desc: "5 signature blends crafted",
    icon: <Palette size={14} />,
    unlocked: (p) => (p.blendsCreated ?? 0) >= 5,
  },
  // XP
  {
    id: "xp_100", label: "Rising Smoke", category: "xp",
    desc: "Earn 100 XP",
    icon: <Zap size={14} />,
    unlocked: (p) => p.xp >= 100,
  },
  {
    id: "xp_350", label: "Smoke Signals", category: "xp",
    desc: "Earn 350 XP",
    icon: <Zap size={14} />,
    unlocked: (p) => p.xp >= 350,
  },
  {
    id: "xp_700", label: "Grand Reserve", category: "xp",
    desc: "Earn 700 XP — Maestro territory",
    icon: <Zap size={14} />,
    unlocked: (p) => p.xp >= 700,
  },
  // Elite
  {
    id: "maestro", label: "Maestro del Fuego", category: "elite",
    desc: "Reach the highest tier — Signature Cigar Creator unlocked",
    icon: <Crown size={14} />,
    unlocked: (p) => p.level.index >= 4,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  orders:     "Orders",
  collection: "Collection",
  blend:      "Blends",
  xp:         "XP",
  elite:      "Elite",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <motion.div className="rounded-xl p-4"
      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-1.5" style={{ color }}>
        {icon}
        <span className="text-[7px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
      </div>
      <p className="font-serif text-2xl" style={{ color, fontWeight: 300 }}>
        {value.toLocaleString()}
      </p>
    </motion.div>
  );
}

function BadgeCard({ badge, unlocked }: { badge: Achievement; unlocked: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300"
      style={{
        background: unlocked ? "rgba(212,139,0,0.05)" : "rgba(26,26,27,0.04)",
        border:     unlocked ? "1px solid rgba(212,139,0,0.2)" : "1px solid rgba(26,26,27,0.07)",
        opacity:    unlocked ? 1 : 0.45,
      }}
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: unlocked ? 1 : 0.45, y: 0 }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: unlocked ? "rgba(212,139,0,0.12)" : "rgba(26,26,27,0.06)",
          border:     unlocked ? "1px solid rgba(212,139,0,0.3)"  : "1px solid rgba(26,26,27,0.10)",
          color:      unlocked ? GOLD_DIM : "rgba(107,94,78,0.25)",
        }}>
        {unlocked ? badge.icon : <Lock size={12} />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-serif leading-tight" style={{ color: unlocked ? "rgba(220,200,165,0.9)" : MUTED }}>
          {badge.label}
        </p>
        <p className="text-[7px] mt-0.5 leading-snug truncate" style={{ color: "rgba(107,94,78,0.35)" }}>
          {badge.desc}
        </p>
      </div>
      {unlocked && (
        <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: "rgba(212,139,0,0.6)" }} />
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
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.09)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.9), rgba(212,139,0,1))" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[7px] uppercase tracking-widest" style={{ color: "rgba(107,94,78,0.30)" }}>
          Progress
        </span>
        <span className="text-[7px] tabular-nums" style={{ color: MUTED }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Reward card (user-facing) ──────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  discount:   "Discount",
  free_item:  "Free Item",
  experience: "Experience",
};

const LEVEL_LABELS = ["Explorer", "Enthusiast", "Aficionado", "Connoisseur", "Maestro del Fuego"];

function RewardCard({
  reward, balance, levelIndex, onRedeem, redeeming,
}: {
  reward:    RewardItem;
  balance:   number;
  levelIndex: number;
  onRedeem:  (id: string) => void;
  redeeming: string | null;
}) {
  const canAfford  = balance >= reward.pointsCost;
  const levelMet   = levelIndex >= reward.levelRequired;
  const canRedeem  = canAfford && levelMet;
  const isRedeeming = redeeming === reward.id;

  return (
    <motion.div
      className="rounded-xl p-4 flex items-center gap-4"
      style={{
        background: canRedeem ? "rgba(212,139,0,0.04)" : "rgba(26,26,27,0.04)",
        border: canRedeem ? "1px solid rgba(212,139,0,0.2)" : "1px solid rgba(26,26,27,0.08)",
        opacity: levelMet ? 1 : 0.5,
      }}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: levelMet ? 1 : 0.5, y: 0 }}>

      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)" }}>
        <Gift size={14} style={{ color: GOLD_DIM }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm leading-tight" style={{ color: "rgba(220,200,165,0.88)" }}>
          {reward.name}
        </p>
        {reward.description && (
          <p className="text-[8px] mt-0.5 truncate" style={{ color: MUTED }}>{reward.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.18)", color: GOLD_DIM }}>
            {TYPE_LABELS[reward.type] ?? reward.type}
          </span>
          {reward.levelRequired > 0 && (
            <span className="text-[7px]" style={{ color: MUTED }}>
              Requires: {LEVEL_LABELS[reward.levelRequired]}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="text-right">
          <p className="font-serif text-base" style={{ color: canAfford ? GOLD_DIM : "rgba(107,94,78,0.35)", fontWeight: 300 }}>
            {reward.pointsCost}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>pts</p>
        </div>

        {!levelMet ? (
          <span className="flex items-center gap-1 text-[7px] px-2 py-1 rounded-lg"
            style={{ background: "rgba(26,26,27,0.05)", color: MUTED, border: "1px solid rgba(26,26,27,0.09)" }}>
            <Lock size={9} /> Locked
          </span>
        ) : (
          <motion.button
            onClick={() => onRedeem(reward.id)}
            disabled={!canAfford || isRedeeming}
            className="px-3 py-1.5 rounded-lg text-[8px] uppercase tracking-[0.12em] transition-colors"
            style={canAfford
              ? { background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.3)", color: GOLD_DIM }
              : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: MUTED, cursor: "not-allowed" }
            }
            whileHover={canAfford ? { scale: 1.03 } : {}}
            whileTap={canAfford ? { scale: 0.97 } : {}}>
            {isRedeeming ? "…" : canAfford ? "Redeem" : "Need more pts"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProgressTab() {
  const [data,       setData]       = useState<UserProgressionData | null>(null);
  const [loyalty,    setLoyalty]    = useState<LoyaltyData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [redeeming,  setRedeeming]  = useState<string | null>(null);
  const [catFilter,  setCatFilter]  = useState<Achievement["category"] | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prog, loy] = await Promise.allSettled([fetchProgression(), fetchLoyalty()]);
      if (prog.status === "fulfilled") setData(prog.value);
      if (loy.status  === "fulfilled") setLoyalty(loy.value);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRedeem = async (rewardId: string) => {
    if (!loyalty) return;
    setRedeeming(rewardId);
    try {
      const res = await redeemReward(rewardId);
      setLoyalty((prev) => prev
        ? {
            ...prev,
            pointsBalance:     res.newBalance,
            pointsRedeemed:    prev.pointsRedeemed + (prev.pointsBalance - res.newBalance),
            recentRedemptions: [res.redemption, ...prev.recentRedemptions.slice(0, 9)],
          }
        : prev
      );
      toast("Reward claimed!", {
        description: "Show this to a staff member — it's pending fulfilment.",
        duration: 5000,
        style: {
          background: "hsl(22 18% 8%)",
          border:     "1px solid rgba(212,139,0,0.35)",
          color:      "rgba(220,200,165,0.95)",
        },
      });
    } catch (err) {
      toast("Could not redeem", {
        description: err instanceof Error ? err.message : "Please try again",
        duration: 4000,
      });
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center">
        <Award size={28} className="mx-auto mb-3" style={{ color: "rgba(107,94,78,0.20)" }} />
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

  const balance    = loyalty?.pointsBalance ?? 0;
  const levelIndex = data.level.index;

  // Rewards: split into affordable (highlight) and locked-by-points
  const available  = loyalty?.available ?? [];
  const nextReward = available.find((r) => r.pointsCost > balance);
  const ptsToNext  = nextReward ? nextReward.pointsCost - balance : null;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            My Progress
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            Points · XP · Rewards · Achievements
          </p>
        </div>
        <motion.button onClick={load}
          className="p-2 rounded-lg"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }}
          whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.95 }}>
          <RefreshCw size={12} />
        </motion.button>
      </div>

      {/* ── Points Balance Card ───────────────────────────────────────────────── */}
      {loyalty && (
        <motion.div className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(120,80,5,0.14), rgba(212,139,0,0.04))",
            border: "1px solid rgba(212,139,0,0.22)",
            boxShadow: "0 0 32px rgba(212,139,0,0.04)",
          }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <Gift size={20} style={{ color: GOLD_DIM }} />
              <div>
                <h3 className="font-serif text-lg" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>
                  Loyalty Points
                </h3>
                <p className="text-[8px] uppercase tracking-[0.2em] mt-0.5" style={{ color: MUTED }}>
                  Earned from verified purchases
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl" style={{ color: GOLD, fontWeight: 300 }}>
                {balance.toLocaleString()}
              </p>
              <p className="text-[7px] uppercase tracking-[0.2em] mt-0.5" style={{ color: MUTED }}>available</p>
            </div>
          </div>

          {/* Mini breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total Earned",  value: loyalty.totalPoints },
              { label: "Redeemed",      value: loyalty.pointsRedeemed },
              { label: "Balance",       value: loyalty.pointsBalance },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3 text-center"
                style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.08)" }}>
                <p className="font-serif text-base" style={{ color: GOLD_DIM, fontWeight: 300 }}>{value.toLocaleString()}</p>
                <p className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Progress to next reward */}
          {ptsToNext !== null && nextReward && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px]" style={{ color: MUTED }}>
                <span>Progress to <span style={{ color: "rgba(210,190,155,0.65)" }}>{nextReward.name}</span></span>
                <span>{balance} / {nextReward.pointsCost} pts</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.09)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (balance / nextReward.pointsCost) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.8), rgba(212,139,0,0.9))" }} />
              </div>
              <p className="text-[7px]" style={{ color: "rgba(107,94,78,0.30)" }}>
                {ptsToNext} more pts to unlock this reward
              </p>
            </div>
          )}

          {ptsToNext === null && available.length > 0 && (
            <p className="text-[8px]" style={{ color: "rgba(100,200,120,0.55)" }}>
              ✓ You can afford {available.filter((r) => r.pointsCost <= balance).length} reward{available.filter((r) => r.pointsCost <= balance).length !== 1 ? "s" : ""} — scroll down to redeem
            </p>
          )}
        </motion.div>
      )}

      {/* ── Level Card ───────────────────────────────────────────────────────── */}
      <motion.div
        className="rounded-2xl p-6"
        style={{
          background: isElite
            ? "linear-gradient(135deg, rgba(120,80,5,0.18), rgba(212,139,0,0.06))"
            : "rgba(26,26,27,0.04)",
          border: `1px solid ${currentTier.borderColor}`,
          boxShadow: isElite ? "0 0 40px rgba(212,139,0,0.06)" : "none",
        }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>

        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {isElite ? (
              <Crown size={20} style={{ color: currentTier.color, filter: isMaestro ? "drop-shadow(0 0 6px rgba(212,139,0,0.5))" : "none" }} />
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
          <div className="flex flex-col items-end gap-1">
            <span className="text-[7px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>Tier</span>
            <div className="flex gap-1">
              {LEVEL_TIERS.map((t) => (
                <div key={t.index} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: t.index <= data.level.index ? t.color : "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          </div>
        </div>

        <XpBar current={data.xp} next={next?.minXp ?? null} pct={pct} />

        {next && (
          <p className="text-[8px] mt-3" style={{ color: "rgba(107,94,78,0.35)" }}>
            Next: <span style={{ color: MUTED }}>{next.title}</span> · Needs {next.minOrders} orders + {next.minXp} XP
          </p>
        )}
        {!next && (
          <p className="text-[8px] mt-3" style={{ color: "rgba(212,139,0,0.5)" }}>
            You have reached the highest tier. Signature Cigar Creator unlocked.
          </p>
        )}
      </motion.div>

      {/* ── Available Rewards ─────────────────────────────────────────────────── */}
      {available.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Available Rewards</p>
            <p className="text-[7px]" style={{ color: MUTED }}>{balance.toLocaleString()} pts balance</p>
          </div>
          <div className="space-y-2">
            {available.map((r) => (
              <RewardCard key={r.id} reward={r} balance={balance} levelIndex={levelIndex}
                onRedeem={handleRedeem} redeeming={redeeming} />
            ))}
          </div>
        </div>
      )}

      {loyalty && available.length === 0 && (
        <div className="rounded-xl p-6 text-center"
          style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
          <Gift size={24} className="mx-auto mb-2" style={{ color: "rgba(107,94,78,0.20)" }} />
          <p className="text-xs" style={{ color: MUTED }}>No rewards available yet — keep earning points</p>
        </div>
      )}

      {/* ── Recent Redemptions ───────────────────────────────────────────────── */}
      {loyalty && loyalty.recentRedemptions.length > 0 && (
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>Recent Redemptions</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(26,26,27,0.09)" }}>
            {loyalty.recentRedemptions.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? "1px solid rgba(26,26,27,0.06)" : "none",
                  background: i % 2 === 0 ? "rgba(26,26,27,0.03)" : "transparent" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif" style={{ color: "rgba(210,190,155,0.8)" }}>{r.rewardName}</p>
                  <p className="text-[7px] mt-0.5" style={{ color: MUTED }}>
                    {r.pointsSpent} pts · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.status === "fulfilled"
                    ? <CheckCircle size={11} style={{ color: "rgba(100,200,120,0.65)" }} />
                    : r.status === "cancelled"
                      ? <span style={{ color: "rgba(200,80,80,0.5)", fontSize: "10px" }}>✕</span>
                      : <Clock size={11} style={{ color: GOLD_DIM }} />
                  }
                  <span className="text-[7px] uppercase tracking-wider" style={{
                    color: r.status === "fulfilled" ? "rgba(100,200,120,0.65)"
                      : r.status === "cancelled"    ? "rgba(200,80,80,0.5)"
                      : GOLD_DIM,
                  }}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Grid ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>Lifetime Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Verified Orders"    value={data.totalVerifiedOrders} icon={<Trophy size={13} />}          color="rgba(212,139,0,0.85)" />
          <StatCard label="Cigars Smoked"      value={data.totalCigarsSmoked}   icon={<Cigarette size={13} />}       color="rgba(200,165,80,0.8)"  />
          <StatCard label="Drinks Tried"       value={data.totalDrinksTried}    icon={<GlassWater size={13} />}      color="rgba(107,94,78,0.78)" />
          <StatCard label="Food Orders"        value={data.totalFoodOrders}     icon={<UtensilsCrossed size={13} />} color="rgba(160,140,110,0.7)" />
          <StatCard label="Blends Created"     value={data.blendsCreated}       icon={<Palette size={13} />}         color="rgba(212,139,0,0.7)"  />
          <StatCard label="Unique Products"    value={data.uniqueProductsTried} icon={<Star size={13} />}            color="rgba(200,165,80,0.75)" />
        </div>
      </div>

      {/* ── Achievements ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Achievements</p>
            <p className="text-[7px] mt-0.5" style={{ color: "rgba(107,94,78,0.30)" }}>
              {earnedCount} / {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "orders", "collection", "blend", "xp", "elite"] as const).map((cat) => (
              <button key={cat}
                onClick={() => setCatFilter(cat)}
                className="px-2.5 py-1 rounded-full text-[7px] uppercase tracking-[0.12em] transition-all duration-150"
                style={catFilter === cat
                  ? { background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.3)", color: GOLD_DIM }
                  : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: MUTED }
                }>
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="h-0.5 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(26,26,27,0.08)" }}>
          <motion.div className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.8), rgba(212,139,0,0.9))" }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={catFilter} className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            {[...visibleBadges].sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0)).map((badge) => (
              <BadgeCard key={badge.id} badge={badge} unlocked={badge.earned} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Humidor ──────────────────────────────────────────────────────────── */}
      {data.humidor.length > 0 && (
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>
            Personal Humidor · {data.humidor.length} product{data.humidor.length !== 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.humidor.slice(0, 6).map((item, i) => (
              <motion.div key={item.productId} className="rounded-xl p-3"
                style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <p className="text-xs font-serif leading-tight" style={{ color: "rgba(210,190,155,0.82)" }}>
                  {item.productName ?? "Unknown"}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>{item.category}</span>
                  <span className="text-[7px] tabular-nums" style={{ color: GOLD_DIM }}>×{item.quantityPurchased}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Earn Guide ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl p-5" style={{ background: "rgba(212,139,0,0.02)", border: "1px solid rgba(212,139,0,0.1)" }}>
        <p className="text-[8px] uppercase tracking-[0.2em] mb-4" style={{ color: MUTED }}>How XP & Points are Earned</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6">
          {[
            { label: "Cigar purchase",        xp: "+10 XP", pts: "+10 pts" },
            { label: "Drink pairing",         xp: "+8 XP",  pts: "+8 pts"  },
            { label: "Food order",            xp: "+4 XP",  pts: "+5 pts"  },
            { label: "Full combo (all 3)",    xp: "+20 XP", pts: "+25 pts" },
            { label: "New product first try", xp: "+5 XP",  pts: "—"       },
            { label: "Welcome (first order)", xp: "—",      pts: "+50 pts" },
          ].map(({ label, xp, pts }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[9px]" style={{ color: "rgba(107,94,78,0.52)" }}>{label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[8px] font-medium" style={{ color: GOLD_DIM }}>{xp}</span>
                <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.40)" }}>·</span>
                <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.68)" }}>{pts}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[7px] mt-4 pt-3" style={{ color: "rgba(107,94,78,0.28)", borderTop: "1px solid rgba(26,26,27,0.07)" }}>
          XP and points are only awarded on staff-verified orders. Unverified orders do not count.
        </p>
      </div>

    </div>
  );
}
