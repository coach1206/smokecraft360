/**
 * CampaignsTab — create, manage, and track sponsored placement campaigns.
 *
 * Layout:
 *   Left panel  — campaign list with status, product count, quick stats, active toggle
 *   Right panel — selected campaign detail: edit form + product assignment + performance
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Plus, Megaphone, CheckCircle2, Circle, PauseCircle,
  XCircle, Clock, ChevronRight, Package, TrendingUp,
  Calendar, DollarSign, Edit3, X, Save, Zap, Award,
} from "lucide-react";
import {
  fetchCampaigns, createCampaign, updateCampaign,
  assignCampaignProducts, fetchCampaignPerformance,
  fetchInventory,
  type Campaign, type CampaignPerformance, type InventoryItem,
} from "@/services/api";

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  draft:     { label: "Draft",     color: "rgba(180,155,100,0.6)",  bg: "rgba(180,155,100,0.07)", Icon: Circle       },
  active:    { label: "Active",    color: "rgba(100,200,120,0.8)",  bg: "rgba(100,200,120,0.07)", Icon: CheckCircle2 },
  paused:    { label: "Paused",    color: "rgba(212,175,55,0.75)",  bg: "rgba(212,175,55,0.07)",  Icon: PauseCircle  },
  completed: { label: "Completed", color: "rgba(130,150,212,0.7)",  bg: "rgba(130,150,212,0.06)", Icon: Award        },
  cancelled: { label: "Cancelled", color: "rgba(239,90,80,0.6)",    bg: "rgba(239,90,80,0.06)",   Icon: XCircle      },
};

const STATUSES = Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>;

// ── Demo data (shown when API is unavailable or returns empty) ─────────────────

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "demo-happy-hour", name: "Happy Hour", status: "active", active: true,
    startDate: "2026-05-01", endDate: "2026-05-31",
    budgetCents: 50000, impressionGoal: 200,
    notes: "4–7 PM daily: 20% off all pour & smoke pairings. Auto-activates at venue open.",
    productCount: 3,
  },
  {
    id: "demo-member-monday", name: "Member Monday", status: "active", active: true,
    startDate: "2026-05-01", endDate: "2026-05-31",
    budgetCents: 30000, impressionGoal: 100,
    notes: "15% off every Monday session for verified members. Loyalty tier: Connoisseur+.",
    productCount: 2,
  },
  {
    id: "demo-cigar-month", name: "Cigar of the Month", status: "paused", active: false,
    startDate: "2026-05-01", endDate: "2026-05-31",
    budgetCents: 20000, impressionGoal: 80,
    notes: "Featured reserve selection — limited run, connoisseur tier only.",
    productCount: 1,
  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function CampaignsTab() {
  const [campaigns,   setCampaigns]  = useState<Campaign[]>([]);
  const [inventory,   setInventory]  = useState<InventoryItem[]>([]);
  const [selected,    setSelected]   = useState<Campaign | null>(null);
  const [perf,        setPerf]       = useState<CampaignPerformance | null>(null);
  const [showCreate,  setShowCreate] = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [camps, inv] = await Promise.all([fetchCampaigns(), fetchInventory()]);
      setCampaigns(camps.length ? camps : DEMO_CAMPAIGNS);
      setInventory(inv);
    } catch {
      setCampaigns(DEMO_CAMPAIGNS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectCampaign = async (c: Campaign) => {
    setSelected(c);
    setPerf(null);
    try {
      const p = await fetchCampaignPerformance(c.id);
      setPerf(p);
    } catch { /* non-critical */ }
  };

  const handleToggleActive = async (c: Campaign) => {
    const newActive = !c.active;
    const newStatus = newActive ? "active" : "paused";
    setSaving(true);
    try {
      const updated = await updateCampaign(c.id, { active: newActive, status: newStatus });
      setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, ...updated } : x));
      if (selected?.id === c.id) setSelected((s) => s ? { ...s, ...updated } : s);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const handleCreate = async (data: Partial<Campaign>) => {
    setSaving(true);
    try {
      const created = await createCampaign(data);
      setCampaigns((prev) => [...prev, created]);
      setShowCreate(false);
      await selectCampaign(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data: Partial<Campaign>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateCampaign(selected.id, data);
      setCampaigns((prev) => prev.map((x) => x.id === selected.id ? { ...x, ...updated } : x));
      setSelected((s) => s ? { ...s, ...updated } : s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update campaign");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <motion.div className="w-8 h-8 rounded-full border-2"
        style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  );

  return (
    <div className="flex gap-5 min-h-[520px]">

      {/* ── Left: Campaign list ────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">

        <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-xs uppercase tracking-[0.15em]"
          style={{
            background: "linear-gradient(135deg, rgba(180,130,30,0.18), rgba(212,175,55,0.08))",
            border: "1px solid rgba(212,175,55,0.3)",
            color: "rgba(212,175,55,0.85)",
          }}>
          <Plus size={13} />New Campaign
        </motion.button>

        {error && (
          <div className="px-3 py-2 rounded-lg text-[10px]"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,120,100,0.8)" }}>
            {error}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3"
            style={{ border: "1px dashed rgba(212,175,55,0.12)", borderRadius: 12 }}>
            <Megaphone size={24} style={{ color: "rgba(212,175,55,0.25)" }} />
            <p className="text-[9px] uppercase tracking-[0.2em] text-center" style={{ color: "rgba(180,155,100,0.35)" }}>
              No campaigns yet
            </p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {campaigns.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
              const Icon = cfg.Icon;
              const isSelected = selected?.id === c.id;
              return (
                <motion.button key={c.id}
                  onClick={() => selectCampaign(c)}
                  className="w-full text-left p-3.5 rounded-xl transition-all duration-200"
                  style={{
                    background: isSelected ? "rgba(212,175,55,0.07)" : "rgba(255,255,255,0.025)",
                    border: isSelected ? "1px solid rgba(212,175,55,0.28)" : "1px solid rgba(255,255,255,0.065)",
                  }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                      <span className="font-serif text-sm leading-tight" style={{ color: "rgba(220,200,165,0.88)" }}>
                        {c.name}
                      </span>
                    </div>
                    {isSelected && <ChevronRight size={11} style={{ color: "rgba(212,175,55,0.5)" }} />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {/* Active toggle */}
                    <button onClick={(e) => { e.stopPropagation(); handleToggleActive(c); }}
                      disabled={saving}
                      className="text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full transition-all"
                      style={c.active
                        ? { background: "rgba(100,200,120,0.1)", border: "1px solid rgba(100,200,120,0.25)", color: "rgba(100,200,120,0.75)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.4)" }
                      }>
                      {c.active ? "Live" : "Off"}
                    </button>
                  </div>
                  {c.productCount !== undefined && c.productCount > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Package size={9} style={{ color: "rgba(180,155,100,0.35)" }} />
                      <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.38)" }}>
                        {c.productCount} product{c.productCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right: Detail / Edit panel ────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">

          {showCreate && (
            <motion.div key="create"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <CampaignForm
                mode="create"
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                saving={saving}
              />
            </motion.div>
          )}

          {!showCreate && selected && (
            <motion.div key={selected.id} className="space-y-5"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>

              {/* Performance cards */}
              {perf && <PerformancePanel perf={perf} />}

              {/* Edit form */}
              <CampaignForm
                mode="edit"
                initial={selected}
                onSubmit={handleUpdate}
                saving={saving}
              />

              {/* Product assignment */}
              <ProductAssignPanel
                campaignId={selected.id}
                inventory={inventory}
                onAssign={async (ids) => {
                  await assignCampaignProducts(selected.id, ids, true);
                  await load();
                }}
              />
            </motion.div>
          )}

          {!showCreate && !selected && (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full py-20 gap-4">
              <Megaphone size={36} style={{ color: "rgba(212,175,55,0.2)" }} />
              <p className="font-serif text-base" style={{ color: "rgba(220,200,165,0.45)", fontWeight: 300 }}>
                Select a campaign to view details
              </p>
              <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.3)" }}>
                or create a new one to get started
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Performance panel ──────────────────────────────────────────────────────────

function PerformancePanel({ perf }: { perf: CampaignPerformance }) {
  const { performance: p, pacing } = perf;

  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.14)" }}>
      <p className="text-[9px] uppercase tracking-[0.22em] mb-3 flex items-center gap-2"
        style={{ color: "rgba(212,175,55,0.5)" }}>
        <TrendingUp size={10} />Performance
      </p>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <PerfCard label="Impressions" value={p.impressions} icon={<Zap size={13} />} />
        <PerfCard label="Clicks"      value={p.clicks}      icon={<Award size={13} />}
          sub={p.impressions > 0 ? `${p.ctr}% CTR` : undefined} />
        <PerfCard label="Conversions" value={p.conversions} icon={<TrendingUp size={13} />}
          sub={p.clicks > 0 ? `${p.cvr}% CVR` : undefined} gold />
      </div>
      {pacing && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[8px]" style={{ color: "rgba(180,155,100,0.45)" }}>
            <span>Campaign progress — day {pacing.daysElapsed}/{pacing.daysTotal}</span>
            <span>{pacing.pct}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }} animate={{ width: `${pacing.pct}%` }}
              transition={{ duration: 0.7 }}
              style={{ background: "linear-gradient(90deg, rgba(180,130,30,0.7), rgba(212,175,55,0.85))" }} />
          </div>
          {pacing.impressionGoalPct !== null && (
            <>
              <div className="flex justify-between text-[8px]" style={{ color: "rgba(180,155,100,0.4)" }}>
                <span>Impression goal progress</span>
                <span>{pacing.impressionGoalPct}%</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${pacing.impressionGoalPct}%` }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                  style={{ background: "rgba(100,200,120,0.65)" }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PerfCard({ label, value, icon, sub, gold }: {
  label: string; value: number; icon: React.ReactNode; sub?: string; gold?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg"
      style={{
        background: gold ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.025)",
        border: gold ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(255,255,255,0.06)",
      }}>
      <div className="mb-1" style={{ color: gold ? "rgba(212,175,55,0.55)" : "rgba(180,155,100,0.4)" }}>{icon}</div>
      <p className="text-2xl font-serif" style={{ color: gold ? "rgba(230,210,175,0.9)" : "rgba(210,190,155,0.82)", fontWeight: 300 }}>
        {value.toLocaleString()}
      </p>
      <p className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>{label}</p>
      {sub && <p className="text-[8px] mt-1" style={{ color: gold ? "rgba(212,175,55,0.65)" : "rgba(180,155,100,0.5)" }}>{sub}</p>}
    </div>
  );
}

// ── Campaign form (create + edit) ──────────────────────────────────────────────

function CampaignForm({
  mode, initial, onSubmit, onCancel, saving,
}: {
  mode:       "create" | "edit";
  initial?:   Partial<Campaign>;
  onSubmit:   (data: Partial<Campaign>) => void;
  onCancel?:  () => void;
  saving:     boolean;
}) {
  const [name,      setName]      = useState(initial?.name      ?? "");
  const [status,    setStatus]    = useState(initial?.status    ?? "draft");
  const [budget,    setBudget]    = useState(initial?.budgetCents != null ? String(initial.budgetCents / 100) : "");
  const [impGoal,   setImpGoal]   = useState(initial?.impressionGoal != null ? String(initial.impressionGoal) : "");
  const [startDate, setStartDate] = useState(initial?.startDate ? new Date(initial.startDate).toISOString().slice(0,10) : "");
  const [endDate,   setEndDate]   = useState(initial?.endDate   ? new Date(initial.endDate).toISOString().slice(0,10)   : "");
  const [notes,     setNotes]     = useState(initial?.notes     ?? "");
  const [active,    setActive]    = useState(initial?.active    ?? false);

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name:           name.trim(),
      status:         status as Campaign["status"],
      budgetCents:    budget   ? Math.round(parseFloat(budget) * 100) : undefined,
      impressionGoal: impGoal  ? parseInt(impGoal, 10)                : undefined,
      startDate:      startDate || undefined,
      endDate:        endDate   || undefined,
      notes:          notes     || undefined,
      active,
    });
  };

  const title = mode === "create" ? "New Campaign" : "Edit Campaign";

  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-base" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
          <Edit3 size={13} className="inline mr-2" style={{ color: "rgba(212,175,55,0.5)" }} />
          {title}
        </h3>
        {onCancel && (
          <button onClick={onCancel} style={{ color: "rgba(180,155,100,0.4)" }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Campaign Name *</Label>
          <Input value={name} onChange={setName} placeholder="e.g. Montecristo Summer Placement" />
        </div>

        <div>
          <Label>Status</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(200,180,145,0.8)", outline: "none",
            }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Live</Label>
          <button onClick={() => setActive((a) => !a)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-xs transition-all"
            style={active
              ? { background: "rgba(100,200,120,0.08)", border: "1px solid rgba(100,200,120,0.25)", color: "rgba(100,200,120,0.8)" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,155,100,0.5)" }
            }>
            {active ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            {active ? "Active — boosting products" : "Inactive"}
          </button>
        </div>

        <div>
          <Label>Budget ($)</Label>
          <Input value={budget} onChange={setBudget} type="number" placeholder="0.00" />
        </div>

        <div>
          <Label>Impression Goal</Label>
          <Input value={impGoal} onChange={setImpGoal} type="number" placeholder="10000" />
        </div>

        <div>
          <Label>Start Date</Label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(200,180,145,0.8)", outline: "none", colorScheme: "dark",
            }} />
        </div>

        <div>
          <Label>End Date</Label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(200,180,145,0.8)", outline: "none", colorScheme: "dark",
            }} />
        </div>

        <div className="col-span-2">
          <Label>Notes</Label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Internal campaign notes…"
            className="w-full px-3 py-2 rounded-lg text-xs resize-none"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(200,180,145,0.8)", outline: "none",
            }} />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        {onCancel && (
          <button onClick={onCancel}
            className="px-3 py-2 rounded-lg text-xs"
            style={{ color: "rgba(180,155,100,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            Cancel
          </button>
        )}
        <motion.button onClick={submit} disabled={saving || !name.trim()}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-[0.13em]"
          style={{
            background: "linear-gradient(135deg, hsl(43 75% 40%), hsl(45 85% 50%))",
            color: "hsl(22 18% 6%)",
            opacity: saving || !name.trim() ? 0.5 : 1,
          }}>
          <Save size={11} />
          {saving ? "Saving…" : mode === "create" ? "Create Campaign" : "Save Changes"}
        </motion.button>
      </div>
    </div>
  );
}

// ── Product assignment panel ───────────────────────────────────────────────────

function ProductAssignPanel({
  campaignId, inventory, onAssign,
}: {
  campaignId: string;
  inventory:  InventoryItem[];
  onAssign:   (ids: string[]) => Promise<void>;
}) {
  const assigned    = inventory.filter((p) => p.campaignId === campaignId).map((p) => p.id);
  const [selected2, setSelected2] = useState<Set<string>>(new Set(assigned));
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Sync when assigned list changes
  useEffect(() => {
    setSelected2(new Set(assigned));
  }, [campaignId]);

  const toggle = (id: string) => {
    setSelected2((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await onAssign([...selected2]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-base" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            <Package size={13} className="inline mr-2" style={{ color: "rgba(212,175,55,0.5)" }} />
            Assign Products
          </h3>
          <p className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>
            Select products to include in this campaign — they'll receive the campaign score boost
          </p>
        </div>
        <motion.button onClick={save} disabled={saving}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs uppercase tracking-[0.13em]"
          style={{
            background: saved ? "rgba(100,200,120,0.12)" : "rgba(212,175,55,0.1)",
            border: saved ? "1px solid rgba(100,200,120,0.3)" : "1px solid rgba(212,175,55,0.28)",
            color: saved ? "rgba(100,200,120,0.8)" : "rgba(212,175,55,0.8)",
          }}>
          <Save size={10} />
          {saving ? "Saving…" : saved ? "Saved!" : `Save (${selected2.size})`}
        </motion.button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {inventory.map((item) => {
          const isChecked = selected2.has(item.id);
          return (
            <button key={item.id} onClick={() => toggle(item.id)}
              className="flex items-center gap-2 p-2.5 rounded-lg text-left transition-all"
              style={isChecked
                ? { background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }
                : { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }
              }>
              <div className="w-3 h-3 rounded-sm flex-shrink-0 flex items-center justify-center"
                style={isChecked
                  ? { background: "rgba(212,175,55,0.3)", border: "1px solid rgba(212,175,55,0.6)" }
                  : { border: "1px solid rgba(180,155,100,0.3)" }
                }>
                {isChecked && <div className="w-1.5 h-1.5 rounded-sm" style={{ background: "rgba(212,175,55,0.9)" }} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate font-serif" style={{ color: isChecked ? "rgba(220,200,165,0.9)" : "rgba(200,180,140,0.7)" }}>
                  {item.name}
                </p>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(180,155,100,0.38)" }}>
                  {item.category} · {item.tier}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Small form helpers ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(180,155,100,0.45)" }}>
      {children}
    </p>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-xs"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(200,180,145,0.8)",
        outline: "none",
      }}
    />
  );
}
