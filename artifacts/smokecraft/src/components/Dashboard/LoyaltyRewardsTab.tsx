/**
 * LoyaltyRewardsTab — admin view for managing the rewards catalogue and redemptions.
 *
 * Sections:
 *  1. Create / edit rewards (name, type, cost, level gate, active toggle)
 *  2. Active rewards catalogue
 *  3. Pending redemptions queue (mark fulfilled / cancelled)
 */

import { useState, useEffect, useCallback }  from "react";
import { motion, AnimatePresence }            from "framer-motion";
import {
  Gift, Plus, RefreshCw, Check, X, ChevronDown,
  Crown, Zap, Star, ToggleLeft, ToggleRight, Pencil,
} from "lucide-react";
import {
  fetchAllRewards, createReward, updateReward, toggleRewardActive,
  fetchAdminRedemptions, updateRedemptionStatus,
  type RewardItem, type RedemptionItem,
} from "@/services/api";

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.55)";
const MUTED    = "rgba(180,155,100,0.4)";

const TYPE_LABELS: Record<string, string> = {
  discount:   "Discount",
  free_item:  "Free Item",
  experience: "Experience",
};

const LEVEL_LABELS = ["Explorer", "Enthusiast", "Aficionado", "Connoisseur", "Maestro del Fuego"];
const STATUS_COLORS: Record<string, string> = {
  pending:   "rgba(212,139,0,0.85)",
  fulfilled: "rgba(100,200,120,0.75)",
  cancelled: "rgba(200,80,80,0.6)",
};

// ── Reward form ────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  name: "", description: "", type: "discount" as "discount" | "free_item" | "experience",
  pointsCost: 100, levelRequired: 0, active: true,
};

function RewardForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<typeof BLANK_FORM>;
  onSave:   (data: typeof BLANK_FORM) => void;
  onCancel: () => void;
  saving:   boolean;
}) {
  const [form, setForm] = useState({ ...BLANK_FORM, ...initial });
  const set = <K extends keyof typeof BLANK_FORM>(k: K, v: (typeof BLANK_FORM)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-xl p-5 space-y-4"
      style={{ background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.18)" }}>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-[8px] uppercase tracking-[0.18em] block mb-1" style={{ color: MUTED }}>Name *</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Free Cigar Pairing"
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.9)", outline: "none" }} />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[8px] uppercase tracking-[0.18em] block mb-1" style={{ color: MUTED }}>Description</label>
          <input value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Short description shown to users"
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.9)", outline: "none" }} />
        </div>

        <div>
          <label className="text-[8px] uppercase tracking-[0.18em] block mb-1" style={{ color: MUTED }}>Type</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value as typeof form.type)}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.9)", outline: "none" }}>
            <option value="discount">Discount</option>
            <option value="free_item">Free Item</option>
            <option value="experience">Experience</option>
          </select>
        </div>

        <div>
          <label className="text-[8px] uppercase tracking-[0.18em] block mb-1" style={{ color: MUTED }}>Points Cost</label>
          <input type="number" min={1} value={form.pointsCost}
            onChange={(e) => set("pointsCost", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.9)", outline: "none" }} />
        </div>

        <div>
          <label className="text-[8px] uppercase tracking-[0.18em] block mb-1" style={{ color: MUTED }}>Min. Level Required</label>
          <select value={form.levelRequired} onChange={(e) => set("levelRequired", parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.9)", outline: "none" }}>
            {LEVEL_LABELS.map((l, i) => (
              <option key={i} value={i}>{i} — {l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={() => set("active", !form.active)}
          className="flex items-center gap-2 text-xs"
          style={{ color: form.active ? "rgba(100,200,120,0.75)" : MUTED }}>
          {form.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {form.active ? "Active" : "Inactive"}
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs rounded-lg"
            style={{ background: "rgba(26,26,27,0.06)", color: MUTED }}>
            Cancel
          </button>
          <motion.button
            onClick={() => onSave(form)}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 text-xs rounded-lg uppercase tracking-[0.12em]"
            style={{ background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.3)", color: GOLD_DIM }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {saving ? "Saving…" : "Save Reward"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Redemption row ─────────────────────────────────────────────────────────────

function RedemptionRow({ r, onUpdate }: { r: RedemptionItem; onUpdate: (id: string, status: string) => void }) {
  return (
    <motion.div className="flex items-center gap-3 py-3 flex-wrap"
      style={{ borderBottom: "1px solid rgba(26,26,27,0.06)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-xs" style={{ color: "rgba(210,190,155,0.85)" }}>{r.rewardName}</p>
        <p className="text-[8px] mt-0.5" style={{ color: MUTED }}>
          {r.pointsSpent} pts · {new Date(r.createdAt).toLocaleDateString()}
        </p>
      </div>
      <span className="text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ color: STATUS_COLORS[r.status] ?? MUTED, border: `1px solid ${STATUS_COLORS[r.status] ?? MUTED}30`, background: `${STATUS_COLORS[r.status] ?? MUTED}10` }}>
        {r.status}
      </span>
      {r.status === "pending" && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onUpdate(r.id, "fulfilled")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(100,200,120,0.08)", border: "1px solid rgba(100,200,120,0.2)" }}
            title="Mark fulfilled">
            <Check size={11} style={{ color: "rgba(100,200,120,0.75)" }} />
          </button>
          <button onClick={() => onUpdate(r.id, "cancelled")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(200,80,80,0.06)", border: "1px solid rgba(200,80,80,0.15)" }}
            title="Cancel">
            <X size={11} style={{ color: "rgba(200,80,80,0.6)" }} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LoyaltyRewardsTab() {
  const [rewards,      setRewards]      = useState<RewardItem[]>([]);
  const [redemptions,  setRedemptions]  = useState<RedemptionItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<RewardItem | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [section,      setSection]      = useState<"rewards" | "redemptions">("rewards");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, rd] = await Promise.all([fetchAllRewards(), fetchAdminRedemptions()]);
      setRewards(r);
      setRedemptions(rd);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async (data: {
    name: string; description: string; type: "discount" | "free_item" | "experience";
    pointsCost: number; levelRequired: number; active: boolean;
  }) => {
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateReward(editTarget.id, data);
        setRewards((r) => r.map((x) => x.id === updated.id ? updated : x));
      } else {
        const created = await createReward(data);
        setRewards((r) => [created, ...r]);
      }
      setShowForm(false);
      setEditTarget(null);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleToggle = async (reward: RewardItem) => {
    const updated = await toggleRewardActive(reward.id, !reward.active);
    setRewards((r) => r.map((x) => x.id === updated.id ? updated : x));
  };

  const handleRedemptionUpdate = async (id: string, status: string) => {
    const updated = await updateRedemptionStatus(id, status);
    setRedemptions((r) => r.map((x) => x.id === updated.id ? updated : x));
  };

  const pendingCount = redemptions.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Loyalty &amp; Rewards
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            Reward catalogue · Redemption queue · Point perks
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={load}
            className="p-2 rounded-lg" whileTap={{ scale: 0.95 }}
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }}>
            <RefreshCw size={12} />
          </motion.button>
          {section === "rewards" && !showForm && (
            <motion.button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs uppercase tracking-[0.12em]"
              style={{ background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.28)", color: GOLD_DIM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Plus size={12} />Add Reward
            </motion.button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg w-fit"
        style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)" }}>
        {([
          { id: "rewards",     label: "Rewards",     icon: <Gift size={10} />  },
          { id: "redemptions", label: `Queue${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: <Check size={10} /> },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] uppercase tracking-[0.12em] transition-all duration-200"
            style={section === t.id
              ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)", color: GOLD_DIM }
              : { color: MUTED }
            }>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* Perks guide */}
      <div className="rounded-xl p-4" style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
        <p className="text-[7px] uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>Level-Based Perks</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-center">
          {[
            { tier: "Explorer",          perk: "Welcome bonus 50 pts",     color: "rgba(160,140,110,0.7)" },
            { tier: "Enthusiast",        perk: "5% discount rewards",       color: "rgba(180,155,100,0.8)" },
            { tier: "Aficionado",        perk: "Early product access",      color: "rgba(200,165,80,0.85)" },
            { tier: "Connoisseur",       perk: "VIP &amp; priority perks",  color: "rgba(212,139,0,0.9)"  },
            { tier: "Maestro del Fuego", perk: "Elite access + events",     color: "rgba(212,139,0,1)"    },
          ].map(({ tier, perk, color }) => (
            <div key={tier} className="rounded-lg p-2.5" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
              <p className="text-[8px] font-serif" style={{ color }}>{tier}</p>
              <p className="text-[7px] mt-1 leading-snug" style={{ color: "rgba(180,155,100,0.5)" }}
                dangerouslySetInnerHTML={{ __html: perk }} />
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <motion.div className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ── Rewards section ──────────────────────────────────────────── */}
          {section === "rewards" && (
            <motion.div key="rewards" className="space-y-4"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Create / edit form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div key="form" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <RewardForm
                      initial={editTarget ? {
                        name:          editTarget.name,
                        description:   editTarget.description ?? undefined,
                        type:          editTarget.type,
                        pointsCost:    editTarget.pointsCost,
                        levelRequired: editTarget.levelRequired,
                        active:        editTarget.active,
                      } : undefined}
                      onSave={handleSave}
                      onCancel={() => { setShowForm(false); setEditTarget(null); }}
                      saving={saving}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {rewards.length === 0 && !showForm && (
                <div className="py-12 text-center">
                  <Gift size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
                  <p className="text-xs" style={{ color: MUTED }}>No rewards yet — click Add Reward to create one</p>
                </div>
              )}

              {rewards.map((reward, i) => (
                <motion.div key={reward.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: reward.active ? "rgba(26,26,27,0.04)" : "rgba(26,26,27,0.03)",
                    border: reward.active ? "1px solid rgba(26,26,27,0.10)" : "1px solid rgba(26,26,27,0.06)",
                    opacity: reward.active ? 1 : 0.55,
                  }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: reward.active ? 1 : 0.55, y: 0 }}
                  transition={{ delay: i * 0.04 }}>

                  {/* Type icon */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)" }}>
                    {reward.type === "experience" ? <Star size={13} style={{ color: GOLD_DIM }} />
                      : reward.type === "free_item" ? <Gift size={13} style={{ color: GOLD_DIM }} />
                      : <Zap size={13} style={{ color: GOLD_DIM }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.9)" }}>{reward.name}</p>
                      <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)", color: GOLD_DIM }}>
                        {TYPE_LABELS[reward.type] ?? reward.type}
                      </span>
                      {reward.levelRequired > 0 && (
                        <span className="flex items-center gap-1 text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(212,139,0,0.05)", border: "1px solid rgba(212,139,0,0.15)", color: MUTED }}>
                          <Crown size={8} />{LEVEL_LABELS[reward.levelRequired]}+
                        </span>
                      )}
                    </div>
                    {reward.description && (
                      <p className="text-[8px] mt-0.5 truncate" style={{ color: MUTED }}>{reward.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-serif text-base" style={{ color: GOLD_DIM, fontWeight: 300 }}>{reward.pointsCost}</p>
                      <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>pts</p>
                    </div>
                    <button onClick={() => handleToggle(reward)} title={reward.active ? "Deactivate" : "Activate"}
                      className="transition-colors">
                      {reward.active
                        ? <ToggleRight size={18} style={{ color: "rgba(100,200,120,0.65)" }} />
                        : <ToggleLeft  size={18} style={{ color: MUTED }} />
                      }
                    </button>
                    <button onClick={() => { setEditTarget(reward); setShowForm(true); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)" }}>
                      <Pencil size={11} style={{ color: MUTED }} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Redemptions section ───────────────────────────────────────── */}
          {section === "redemptions" && (
            <motion.div key="redemptions"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-xl p-5"
                style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}>
                {redemptions.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: MUTED }}>No redemptions yet</p>
                ) : (
                  redemptions.map((r) => (
                    <RedemptionRow key={r.id} r={r} onUpdate={handleRedemptionUpdate} />
                  ))
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}
    </div>
  );
}
