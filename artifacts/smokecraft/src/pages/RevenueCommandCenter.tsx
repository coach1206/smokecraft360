/**
 * RevenueCommandCenter — Super Admin Revenue God-View.
 *
 * Route: /revenue-command-center
 * Access: super_admin only (client-side gated; server routes are role-gated)
 *
 * Tabs:
 *   Overview       — 12-stream MRR breakdown + total ARR
 *   Forecast       — 12-month projection + churn risks + upgrade opportunities
 *   Hardware       — lease + rental management
 *   Modules        — a la carte module catalog + venue entitlements
 *   Enterprise     — franchise contracts + white-label licenses
 *   Pricing        — dynamic pricing rules engine
 *   AI Billing     — token usage + quota monitoring
 *   Marketplace    — listing approval + transaction feed
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { id: "overview",    label: "Overview"    },
  { id: "forecast",    label: "Forecast"    },
  { id: "hardware",    label: "Hardware"    },
  { id: "modules",     label: "Modules"     },
  { id: "enterprise",  label: "Enterprise"  },
  { id: "pricing",     label: "Pricing"     },
  { id: "ai",          label: "AI Billing"  },
  { id: "marketplace", label: "Marketplace" },
] as const;
type Tab = typeof TABS[number]["id"];

const STREAM_COLORS: Record<string, string> = {
  subscription: "#D48B00", hardware_lease: "#4A8FA8", hardware_rental: "#7EC8A0",
  byod: "#9B7EC8", module: "#E85D26", ai_usage: "#C4A96D", affiliate: "#8A7560",
  marketplace: "#D4AF37", white_label: "#E8A020", enterprise: "#7EC8A0",
  intelligence: "#4A8FA8", consulting: "#D48B00",
};

const USD = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const LIFT_COLOR = (v: number) => v >= 0 ? "#7EC8A0" : "#E85D26";

interface StreamMetric { streamId: string; streamName: string; mrrCents: number; arrCents: number; activeCount: number; churnRisk: string; }
interface PlatformSummary { totalMrrCents: number; totalArrCents: number; totalActiveAccounts: number; streams: StreamMetric[]; generatedAt: string; }
interface ForecastPoint { monthOffset: number; mrrCents: number; netChangeCents: number; }
interface UpgradeOpportunity { venueId: string; currentPlan?: string; suggestedPlan: string; potentialMrrLift: number; }
interface ChurnRisk { venueId: string; riskLevel: string; riskScore: number; suggestedAction: string; }
interface Forecast { currentMrrCents: number; growthRatePct: number; churnRatePct: number; points: ForecastPoint[]; topOpportunities: UpgradeOpportunity[]; churnRisks: ChurnRisk[]; }
interface Module { id: string; name: string; priceCents: number; description: string; }
interface Contract { id: string; entityName: string; contractType: string; totalMonthlyCents: number; locationCount: number; status: string; }
interface WhiteLabel { id: string; clientName: string; tier: string; monthlyLicenseCents: number; activeVenues: number; maxVenues: number; status: string; }
interface PricingRule { id: string; planId: string; ruleType: string; priceCents?: number; multiplier?: number; isActive: boolean; notes?: string; }
interface Listing { id: string; title: string; category: string; priceCents: number; status: string; downloadCount: number; }

const S: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:   "rgba(255,255,255,0.025)",
      border:       "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding:      "20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: "#6B5E4E", textTransform: "uppercase", marginBottom: "4px", ...S }}>{children}</div>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<PlatformSummary | null>(null);

  useEffect(() => {
    fetch("/api/revenue-engine/summary").then(r => r.json()).then(d => setData(d as PlatformSummary)).catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  const maxMrr = Math.max(...data.streams.map(s => s.mrrCents), 1);

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total MRR",      value: USD(data.totalMrrCents),      color: "#D48B00" },
          { label: "Total ARR",      value: USD(data.totalArrCents),      color: "#C4A96D" },
          { label: "Active Accounts",value: String(data.totalActiveAccounts), color: "#F5F2ED" },
        ].map(k => (
          <Card key={k.label}>
            <Label>{k.label}</Label>
            <div style={{ fontSize: "28px", fontWeight: 700, color: k.color, ...S }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Stream breakdown */}
      <Card>
        <Label>12 Revenue Streams</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          {data.streams.map(s => (
            <div key={s.streamId}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "#C4A96D", ...S }}>{s.streamName}</span>
                <div style={{ display: "flex", gap: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#F5F2ED", ...S }}>{USD(s.mrrCents)}<span style={{ color: "#6B5E4E" }}>/mo</span></span>
                  <span style={{ fontSize: "10px", color: "#6B5E4E", ...S, width: "60px", textAlign: "right" }}>{s.activeCount} active</span>
                </div>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${(s.mrrCents / maxMrr) * 100}%` }}
                  transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                  style={{ height: "100%", background: STREAM_COLORS[s.streamId] ?? "#D48B00", borderRadius: 2 }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ForecastTab() {
  const [data, setData] = useState<Forecast | null>(null);

  useEffect(() => {
    fetch("/api/revenue-engine/forecast").then(r => r.json()).then(d => setData(d as Forecast)).catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  const maxMrr = Math.max(...data.points.map(p => p.mrrCents), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
        {[
          { label: "Current MRR",  value: USD(data.currentMrrCents), color: "#D48B00" },
          { label: "Growth Rate",  value: `${data.growthRatePct}%/mo`, color: "#7EC8A0" },
          { label: "Churn Rate",   value: `${data.churnRatePct}%/mo`,  color: "#E85D26" },
        ].map(k => (
          <Card key={k.label}><Label>{k.label}</Label><div style={{ fontSize: "24px", fontWeight: 700, color: k.color, ...S }}>{k.value}</div></Card>
        ))}
      </div>

      {/* 12-month chart */}
      <Card>
        <Label>12-Month MRR Projection</Label>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "100px", marginTop: "12px" }}>
          {data.points.map(p => (
            <div key={p.monthOffset} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <motion.div
                initial={{ height: 0 }} animate={{ height: `${(p.mrrCents / maxMrr) * 80}px` }}
                transition={{ delay: p.monthOffset * 0.05, duration: 0.6 }}
                style={{ width: "100%", background: p.netChangeCents >= 0 ? "#D48B00" : "#E85D26", borderRadius: "2px 2px 0 0" }}
              />
              <span style={{ fontSize: "7px", color: "#6B5E4E", ...S }}>{p.monthOffset}m</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Upgrade opportunities */}
        <Card>
          <Label>Upgrade Opportunities</Label>
          {data.topOpportunities.length === 0
            ? <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No immediate opportunities.</div>
            : data.topOpportunities.map((o, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: "11px", color: "#F5F2ED", ...S }}>{o.venueId.slice(0, 12)}…</div>
                <div style={{ fontSize: "10px", color: "#7EC8A0", ...S }}>
                  {o.currentPlan} → {o.suggestedPlan} <span style={{ color: "#D48B00" }}>+{USD(o.potentialMrrLift)}/mo</span>
                </div>
              </div>
            ))}
        </Card>

        {/* Churn risks */}
        <Card>
          <Label>Churn Risks</Label>
          {data.churnRisks.length === 0
            ? <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No high-risk accounts detected.</div>
            : data.churnRisks.map((c, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "#F5F2ED", ...S }}>{c.venueId.slice(0, 12)}…</span>
                  <span style={{ fontSize: "9px", color: "#E85D26", ...S }}>Risk: {c.riskScore}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#8A7560", ...S }}>{c.suggestedAction}</div>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}

function HardwareTab() {
  const [mrr, setMrr] = useState<{ leaseMrr: number; rentalMrr: number; total: number } | null>(null);
  const [form, setForm] = useState({ venueId: "", deviceType: "", monthlyCents: "", setupFeeCents: "0" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/revenue-engine/hardware/platform/mrr").then(r => r.json()).then(d => setMrr(d as typeof mrr)).catch(() => {});
  }, []);

  const createLease = async () => {
    const res = await fetch("/api/revenue-engine/hardware/leases", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monthlyCents: parseInt(form.monthlyCents, 10) || 0, setupFeeCents: parseInt(form.setupFeeCents, 10) || 0 }),
    });
    setMsg(res.ok ? "Lease created." : "Error creating lease.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {mrr && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
          {[
            { label: "Lease MRR",  value: USD(mrr.leaseMrr)  },
            { label: "Rental MRR", value: USD(mrr.rentalMrr) },
            { label: "Total HW MRR", value: USD(mrr.total)   },
          ].map(k => (
            <Card key={k.label}><Label>{k.label}</Label><div style={{ fontSize: "22px", fontWeight: 700, color: "#4A8FA8", ...S }}>{k.value}</div></Card>
          ))}
        </div>
      )}

      <Card>
        <Label>Create Hardware Lease</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
          {[
            { ph: "Venue ID", key: "venueId" },
            { ph: "Device Type (e.g. AXIOM Tablet)", key: "deviceType" },
            { ph: "Monthly ($cents)", key: "monthlyCents" },
            { ph: "Setup fee ($cents)", key: "setupFeeCents" },
          ].map(f => (
            <input key={f.key} placeholder={f.ph} value={(form as Record<string,string>)[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }}
            />
          ))}
        </div>
        <button onClick={createLease} style={{ marginTop: "10px", background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.3)", color: "#D48B00", padding: "8px 18px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
          Create Lease
        </button>
        {msg && <div style={{ marginTop: "8px", fontSize: "11px", color: "#7EC8A0", ...S }}>{msg}</div>}
      </Card>
    </div>
  );
}

function ModulesTab() {
  const [catalog, setCatalog] = useState<Module[]>([]);
  const [venueId, setVenueId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/revenue-engine/modules/catalog").then(r => r.json()).then((d: { modules: Module[] }) => setCatalog(d.modules)).catch(() => {});
  }, []);

  const activate = async (moduleId: string) => {
    if (!venueId.trim()) { setMsg("Enter a venue ID first."); return; }
    const res = await fetch(`/api/revenue-engine/modules/${venueId}/activate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId }),
    });
    setMsg(res.ok ? `Module ${moduleId} activated.` : "Error activating module.");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <input placeholder="Venue ID for activation" value={venueId} onChange={e => setVenueId(e.target.value)}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif", flex: 1 }}
        />
        {msg && <span style={{ fontSize: "11px", color: "#7EC8A0", ...S }}>{msg}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px" }}>
        {catalog.map(m => (
          <Card key={m.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontWeight: 600, color: "#D48B00", fontSize: "13px", ...S }}>{m.name}</div>
            <div style={{ fontSize: "11px", color: "#8A7560", ...S }}>{m.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#F5F2ED", ...S }}>{USD(m.priceCents)}<span style={{ color: "#6B5E4E", fontSize: "10px" }}>/mo</span></span>
              <button onClick={() => activate(m.id)} style={{ background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)", color: "#D48B00", padding: "5px 12px", borderRadius: "12px", fontSize: "10px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
                Activate
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EnterpriseTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [wls, setWls] = useState<WhiteLabel[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/revenue-engine/enterprise/contracts").then(r => r.json()),
      fetch("/api/revenue-engine/enterprise/white-label").then(r => r.json()),
    ]).then(([c, w]) => {
      setContracts((c as { contracts: Contract[] }).contracts);
      setWls((w as { licenses: WhiteLabel[] }).licenses);
    }).catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <Label>Enterprise & Franchise Contracts ({contracts.length})</Label>
        {contracts.length === 0
          ? <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No contracts yet.</div>
          : contracts.map(c => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#F5F2ED", ...S }}>{c.entityName}</div>
                <div style={{ fontSize: "10px", color: "#6B5E4E", ...S }}>{c.contractType} · {c.locationCount} locations</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#D48B00", ...S }}>{USD(c.totalMonthlyCents)}/mo</div>
                <div style={{ fontSize: "9px", color: c.status === "active" ? "#7EC8A0" : "#E85D26", ...S }}>{c.status}</div>
              </div>
            </div>
          ))}
      </Card>

      <Card>
        <Label>White-Label Licenses ({wls.length})</Label>
        {wls.length === 0
          ? <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No white-label licenses yet.</div>
          : wls.map(w => (
            <div key={w.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#F5F2ED", ...S }}>{w.clientName}</div>
                <div style={{ fontSize: "10px", color: "#6B5E4E", ...S }}>{w.tier} · {w.activeVenues}/{w.maxVenues} venues</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#C4A96D", ...S }}>{USD(w.monthlyLicenseCents)}/mo</div>
                <div style={{ fontSize: "9px", color: w.status === "active" ? "#7EC8A0" : "#E85D26", ...S }}>{w.status}</div>
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}

function PricingTab() {
  const [plans, setPlans] = useState<{ id: string; name: string; base_price_cents: number; stream_type: string }[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [form, setForm] = useState({ planId: "", ruleType: "promo", priceCents: "", multiplier: "", notes: "" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([
      fetch("/api/revenue-engine/plans").then(x => x.json()),
      fetch("/api/revenue-engine/pricing/rules").then(x => x.json()),
    ]);
    setPlans((p as { plans: typeof plans }).plans);
    setRules((r as { rules: PricingRule[] }).rules);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRule = async () => {
    const body: Record<string, unknown> = { planId: form.planId, ruleType: form.ruleType, notes: form.notes };
    if (form.priceCents)  body["priceCents"]  = parseInt(form.priceCents,  10);
    if (form.multiplier)  body["multiplier"]  = parseFloat(form.multiplier);
    const res = await fetch("/api/revenue-engine/pricing/rules", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setMsg(res.ok ? "Rule created." : "Error creating rule."); load();
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/revenue-engine/pricing/rules/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <Label>Create Pricing Rule</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
          <select value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }}>
            <option value="">Select Plan</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.ruleType} onChange={e => setForm(p => ({ ...p, ruleType: e.target.value }))}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }}>
            {["override","seasonal","regional","promo","enterprise","volume"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Price override (cents)" value={form.priceCents} onChange={e => setForm(p => ({ ...p, priceCents: e.target.value }))}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }} />
          <input placeholder="Multiplier (e.g. 0.85 = 15% off)" value={form.multiplier} onChange={e => setForm(p => ({ ...p, multiplier: e.target.value }))}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }} />
        </div>
        <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          style={{ marginTop: "8px", width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 10px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
          <button onClick={createRule} style={{ background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.3)", color: "#D48B00", padding: "8px 18px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
            Create Rule
          </button>
          {msg && <span style={{ fontSize: "11px", color: "#7EC8A0", ...S }}>{msg}</span>}
        </div>
      </Card>

      <Card>
        <Label>Active Pricing Rules ({rules.filter(r => r.isActive).length})</Label>
        {rules.filter(r => r.isActive).map(r => (
          <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#C4A96D", ...S }}>{r.planId}</span>
              <span style={{ fontSize: "10px", color: "#6B5E4E", marginLeft: "8px", ...S }}>{r.ruleType}</span>
              {r.priceCents && <span style={{ fontSize: "11px", color: "#F5F2ED", marginLeft: "8px", ...S }}>→ {USD(r.priceCents)}</span>}
              {r.multiplier && <span style={{ fontSize: "11px", color: "#7EC8A0", marginLeft: "8px", ...S }}>×{r.multiplier}</span>}
            </div>
            <button onClick={() => deactivate(r.id)} style={{ background: "transparent", border: "1px solid rgba(232,93,38,0.3)", color: "#E85D26", padding: "4px 10px", borderRadius: "10px", fontSize: "9px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
              Deactivate
            </button>
          </div>
        ))}
        {rules.filter(r => r.isActive).length === 0 && <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No active pricing rules.</div>}
      </Card>
    </div>
  );
}

function AIBillingTab() {
  const [venueId, setVenueId] = useState("");
  const [quota, setQuota] = useState<{ tier: string; tokensUsed: number; monthlyLimit: number; usagePct: number; warning: boolean } | null>(null);
  const [usage, setUsage] = useState<{ service: string; totalTokens: number; billedUsd: number }[]>([]);

  const load = async () => {
    if (!venueId.trim()) return;
    const [q, u] = await Promise.all([
      fetch(`/api/revenue-engine/ai/quota/${venueId}`).then(r => r.json()),
      fetch(`/api/revenue-engine/ai/usage/${venueId}`).then(r => r.json()),
    ]);
    setQuota(q as typeof quota);
    setUsage((u as { usage: typeof usage }).usage);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input placeholder="Venue ID" value={venueId} onChange={e => setVenueId(e.target.value)}
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "8px 12px", color: "#F5F2ED", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif" }} />
        <button onClick={load} style={{ background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.3)", color: "#D48B00", padding: "8px 18px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
          Load
        </button>
      </div>

      {quota && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <Label>AI Quota — {quota.tier}</Label>
            {quota.warning && <span style={{ fontSize: "9px", color: "#E85D26", ...S }}>⚠ Near limit</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#8A7560", ...S }}>{quota.tokensUsed.toLocaleString()} / {quota.monthlyLimit.toLocaleString()} tokens</span>
            <span style={{ fontSize: "11px", color: "#C4A96D", ...S }}>{quota.usagePct}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <motion.div animate={{ width: `${quota.usagePct}%` }} transition={{ duration: 1 }}
              style={{ height: "100%", background: quota.usagePct > 80 ? "#E85D26" : "#D48B00", borderRadius: 2 }} />
          </div>
        </Card>
      )}

      {usage.length > 0 && (
        <Card>
          <Label>Usage by Service (last 30 days)</Label>
          {usage.map(u => (
            <div key={u.service} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#C4A96D", ...S }}>{u.service}</span>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ fontSize: "11px", color: "#6B5E4E", ...S }}>{u.totalTokens.toLocaleString()} tokens</span>
                <span style={{ fontSize: "11px", color: "#F5F2ED", ...S }}>${u.billedUsd.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function MarketplaceTab() {
  const [listings, setListings] = useState<Listing[]>([]);

  const load = useCallback(async () => {
    const d = await fetch("/api/revenue-engine/marketplace/listings").then(r => r.json()).catch(() => ({ listings: [] })) as { listings: Listing[] };
    setListings(d.listings);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    await fetch(`/api/revenue-engine/marketplace/listings/${id}/approve`, { method: "POST" });
    load();
  };

  return (
    <div>
      <Card>
        <Label>Marketplace Listings ({listings.length})</Label>
        {listings.length === 0
          ? <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "8px", ...S }}>No listings yet.</div>
          : listings.map(l => (
            <div key={l.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#F5F2ED", ...S }}>{l.title}</div>
                <div style={{ fontSize: "10px", color: "#6B5E4E", ...S }}>{l.category} · {l.downloadCount} downloads</div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#D48B00", ...S }}>{USD(l.priceCents)}</span>
                {l.status === "pending" && (
                  <button onClick={() => approve(l.id)} style={{ background: "rgba(126,200,160,0.12)", border: "1px solid rgba(126,200,160,0.3)", color: "#7EC8A0", padding: "4px 10px", borderRadius: "10px", fontSize: "9px", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif" }}>
                    Approve
                  </button>
                )}
                <span style={{ fontSize: "9px", color: l.status === "approved" ? "#7EC8A0" : "#E85D26", ...S }}>{l.status}</span>
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px" }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}
        style={{ fontSize: "12px", color: "#D48B00", letterSpacing: "0.2em", ...S }}>
        Calibrating Revenue Intelligence…
      </motion.div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RevenueCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    overview:    <OverviewTab />,
    forecast:    <ForecastTab />,
    hardware:    <HardwareTab />,
    modules:     <ModulesTab />,
    enterprise:  <EnterpriseTab />,
    pricing:     <PricingTab />,
    ai:          <AIBillingTab />,
    marketplace: <MarketplaceTab />,
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#060504", color: "#F5F2ED", fontFamily: "'Cormorant Garamond', serif", padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.3em", color: "#D48B00", textTransform: "uppercase", marginBottom: "4px" }}>
          Axiom OS — Super Admin
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 600, margin: 0 }}>Revenue Command Center</h1>
        <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "4px" }}>
          12-stream monetization infrastructure · Global pricing control · Enterprise billing
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px", overflowX: "auto", paddingBottom: "2px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding:       "8px 16px",
              borderRadius:  "20px",
              border:        activeTab === t.id ? "1px solid rgba(212,139,0,0.4)" : "1px solid rgba(255,255,255,0.06)",
              background:    activeTab === t.id ? "rgba(212,139,0,0.12)" : "transparent",
              color:         activeTab === t.id ? "#D48B00" : "#6B5E4E",
              fontSize:      "11px",
              cursor:        "pointer",
              whiteSpace:    "nowrap",
              fontFamily:    "'Cormorant Garamond', serif",
              transition:    "all 0.3s ease",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {TAB_CONTENT[activeTab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
