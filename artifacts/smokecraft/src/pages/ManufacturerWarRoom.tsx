/**
 * ManufacturerWarRoom — /manufacturer-war-room
 * Phase 1 & 3: Product Sentiment Intelligence + Shadow Testing Control Panel
 *
 * Tab 1 — Sentiment: look up product behavioral KPIs (revealRate, hesitation, etc.)
 * Tab 2 — Shadow Tests: view active INVISIBLE_ACTIVE tests, initiate new ones
 * Tab 3 — Network: cross-venue product performance
 *
 * Pulls from /api/manufacturer-war-room/* — no mocks.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation }             from "wouter";

const C = {
  bg:      "#F5F2ED",
  glass:   "rgba(26,26,27,0.04)",
  glassMd: "rgba(26,26,27,0.07)",
  border:  "rgba(26,26,27,0.09)",
  gold:    "#D48B00",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.52)",
  dim:     "rgba(26,26,27,0.30)",
  green:   "#4ade80",
  red:     "#f87171",
  orange:  "#fb923c",
  purple:  "#a78bfa",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const getToken = () => localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}
async function apiPost(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}
async function apiPatch(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.glass, border: `1px solid ${accent ? accent + "33" : C.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: accent ? `0 0 20px ${accent}14` : "none", ...style }}>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}
function Bar({ pct, color = C.gold }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: "rgba(26,26,27,0.09)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.7 }} style={{ height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ color: C.muted, fontSize: 13, padding: "48px 0", textAlign: "center" }}>{msg}</div>;
}

// ── Sentiment types ────────────────────────────────────────────────────────────

type Sentiment = {
  productId: string; regionId: string | null; computedAt: string; sampleSize: number;
  revealRate: number; hesitationMetric: number; emotionalMatch: number;
  pairingSuccess: number; competitiveRank: number;
  signals: { revealCount: number; totalEvents: number; hesitationCount: number; shownCount: number; acceptedCount: number; productOrders: number; totalOrders: number };
};

type ShadowTest = {
  id: string; productId: string; demographic: Record<string, unknown>;
  status: string; startTime: string; endTime: string | null;
  results: Record<string, unknown> | null;
};

// ── Sentiment tab ──────────────────────────────────────────────────────────────

function SentimentTab() {
  const [productId, setProductId] = useState("");
  const [regionId, setRegionId]   = useState("");
  const [data, setData]           = useState<Sentiment | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const lookup = async () => {
    if (!productId.trim()) return;
    setLoading(true); setError(""); setData(null);
    try {
      const qs = regionId.trim() ? `?regionId=${encodeURIComponent(regionId)}` : "";
      const d = await apiGet(`/api/manufacturer-war-room/products/${encodeURIComponent(productId.trim())}/sentiment${qs}`);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? (e.message === "401" ? "Authentication required — super_admin role needed" : e.message) : "Unknown error");
    } finally { setLoading(false); }
  };

  const kpis: { label: string; value: string; bar: number; color: string }[] = data ? [
    { label: "Reveal Rate",      value: (data.revealRate * 100).toFixed(1) + "%",     bar: data.revealRate * 100,      color: C.gold },
    { label: "Pairing Success",  value: (data.pairingSuccess * 100).toFixed(1) + "%", bar: data.pairingSuccess * 100,  color: C.green },
    { label: "Emotional Match",  value: data.emotionalMatch.toFixed(0) + " / 100",    bar: data.emotionalMatch,        color: C.purple },
    { label: "Competitive Rank", value: (data.competitiveRank * 100).toFixed(2) + "% share", bar: data.competitiveRank * 100, color: C.orange },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Lookup form */}
      <GlassCard>
        <Label>Product Sentiment Lookup</Label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={productId} onChange={e => setProductId(e.target.value)}
            placeholder="Product ID or SKU"
            onKeyDown={e => e.key === "Enter" && lookup()}
            style={{ flex: 2, minWidth: 160, padding: "9px 14px", background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }}
          />
          <input
            value={regionId} onChange={e => setRegionId(e.target.value)}
            placeholder="Region / Venue ID (optional)"
            style={{ flex: 1, minWidth: 120, padding: "9px 14px", background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }}
          />
          <button onClick={lookup} disabled={loading}
            style={{ padding: "9px 22px", background: C.gold, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
            {loading ? "SCANNING…" : "ANALYZE"}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{error}</div>}
      </GlassCard>

      {/* Results */}
      <AnimatePresence>
        {data && (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* KPI grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {kpis.map(k => (
                <GlassCard key={k.label} accent={k.color}>
                  <Label>{k.label}</Label>
                  <div style={{ fontSize: 26, fontWeight: 700, color: k.color, fontFamily: "'Cormorant Garamond', serif" }}>{k.value}</div>
                  <Bar pct={k.bar} color={k.color} />
                </GlassCard>
              ))}
            </div>
            {/* Hesitation signal */}
            <GlassCard accent={data.hesitationMetric > 10_000 ? C.red : C.gold}>
              <Label>Hesitation Metric (Price Friction Signal)</Label>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: data.hesitationMetric > 10_000 ? C.red : C.gold, fontFamily: "'Cormorant Garamond', serif" }}>
                  {data.hesitationMetric > 0 ? (data.hesitationMetric / 1000).toFixed(1) + "s" : "No signal"}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>avg dwell without selection</div>
              </div>
              {data.hesitationMetric > 10_000 && (
                <div style={{ marginTop: 8, fontSize: 12, color: C.red }}>⚠ High price friction — consider repositioning or bundling this product</div>
              )}
            </GlassCard>
            {/* Raw signals */}
            <GlassCard>
              <Label>Raw Signals · Sample Size: {data.sampleSize} events</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  ["Views", data.signals.revealCount],
                  ["Hesitations", data.signals.hesitationCount],
                  ["Shown in Recs", data.signals.shownCount],
                  ["Accepted Recs", data.signals.acceptedCount],
                  ["Orders", data.signals.productOrders],
                  ["Total Orders (region)", data.signals.totalOrders],
                ].map(([l, v]) => (
                  <div key={l as string} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{l as string}</div>
                    <div style={{ fontSize: 20, color: C.gold, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>{v as number}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 10 }}>Computed: {new Date(data.computedAt).toLocaleString()}</div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shadow Tests tab ───────────────────────────────────────────────────────────

const CRAFT_TYPES = ["smoke", "pour", "brew", "vape"] as const;

function ShadowTestsTab() {
  const [tests, setTests]           = useState<ShadowTest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ productId: "", craftType: "smoke", experienceLevel: "", region: "" });
  const [statusFilter, setFilter]   = useState("INVISIBLE_ACTIVE");
  const [closingId, setClosingId]   = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiGet(`/api/manufacturer-war-room/shadow-tests?status=${statusFilter}&limit=50`)
      .then(d => setTests(d.tests ?? []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const initiate = async () => {
    if (!form.productId.trim()) return;
    setCreating(true);
    try {
      await apiPost("/api/manufacturer-war-room/shadow-tests", {
        productId: form.productId.trim(),
        demographic: {
          craftType:       form.craftType,
          experienceLevel: form.experienceLevel || undefined,
          region:          form.region          || undefined,
        },
      });
      setShowForm(false);
      setForm({ productId: "", craftType: "smoke", experienceLevel: "", region: "" });
      load();
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const conclude = async (id: string, status: "CONCLUDED" | "CANCELLED") => {
    setClosingId(id);
    try { await apiPatch(`/api/manufacturer-war-room/shadow-tests/${id}/status`, { status }); load(); }
    catch { /* ignore */ } finally { setClosingId(null); }
  };

  const statusColor: Record<string, string> = { INVISIBLE_ACTIVE: C.purple, ACTIVE: C.green, CONCLUDED: C.muted, CANCELLED: C.red };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Controls */}
      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["INVISIBLE_ACTIVE", "ACTIVE", "CONCLUDED", "CANCELLED"].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "5px 12px", borderRadius: 20, border: `1px solid ${statusFilter === s ? statusColor[s] + "88" : C.border}`,
                background: statusFilter === s ? `${statusColor[s]}18` : "none",
                color: statusFilter === s ? statusColor[s] : C.muted,
                fontSize: 10, letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit",
              }}>{s.replace("_", " ")}</button>
            ))}
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{ padding: "8px 18px", background: C.gold, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {showForm ? "— CANCEL" : "+ INITIATE TEST"}
          </button>
        </div>
      </GlassCard>

      {/* New test form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard accent={C.purple}>
              <Label>Initiate Shadow Test — Product Injection Protocol</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  placeholder="Product ID *"
                  style={{ padding: "9px 14px", background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <select value={form.craftType} onChange={e => setForm(f => ({ ...f, craftType: e.target.value }))}
                    style={{ flex: 1, padding: "9px 14px", background: "#F5F2ED", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }}>
                    {CRAFT_TYPES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  <input value={form.experienceLevel} onChange={e => setForm(f => ({ ...f, experienceLevel: e.target.value }))}
                    placeholder="Experience level (optional)"
                    style={{ flex: 1, padding: "9px 14px", background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }} />
                </div>
                <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  placeholder="Target region (optional)"
                  style={{ padding: "9px 14px", background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, fontFamily: "inherit", outline: "none" }} />
                <button onClick={initiate} disabled={creating || !form.productId.trim()}
                  style={{ padding: "10px 22px", background: C.purple, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: creating ? 0.7 : 1 }}>
                  {creating ? "INJECTING…" : "INJECT INTO SHADOW STREAM"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test list */}
      {loading && <Empty msg="Loading shadow tests…" />}
      {!loading && tests.length === 0 && <Empty msg={`No ${statusFilter.replace("_", " ").toLowerCase()} tests found.`} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tests.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <GlassCard accent={statusColor[t.status]}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.productId}</div>
                    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, border: `1px solid ${statusColor[t.status]}44`, color: statusColor[t.status], background: `${statusColor[t.status]}14`, letterSpacing: "0.1em" }}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.muted }}>
                    <span>Started: {new Date(t.startTime).toLocaleDateString()}</span>
                    {!!t.demographic?.craftType && <span>Craft: {String(t.demographic.craftType)}</span>}
                    {!!t.demographic?.region && <span>Region: {String(t.demographic.region)}</span>}
                  </div>
                </div>
                {(t.status === "INVISIBLE_ACTIVE" || t.status === "ACTIVE") && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => conclude(t.id, "CONCLUDED")} disabled={closingId === t.id}
                      style={{ padding: "5px 12px", background: "none", border: `1px solid ${C.green}44`, color: C.green, borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                      CONCLUDE
                    </button>
                    <button onClick={() => conclude(t.id, "CANCELLED")} disabled={closingId === t.id}
                      style={{ padding: "5px 12px", background: "none", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                      CANCEL
                    </button>
                  </div>
                )}
              </div>
              {t.id && <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>ID: {t.id}</div>}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Tab = "sentiment" | "shadow" | "network";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "sentiment", label: "Sentiment Intel",  icon: "◈" },
  { id: "shadow",    label: "Shadow Tests",     icon: "◑" },
  { id: "network",   label: "Network Feed",     icon: "◎" },
];

function NetworkTab() {
  return (
    <GlassCard>
      <Label>Cross-Venue Network Intelligence</Label>
      <div style={{ color: C.muted, fontSize: 13, padding: "20px 0" }}>
        Network metrics aggregated from <code style={{ color: C.gold }}>network_intelligence_metrics</code> table.<br /><br />
        Feed populates as venues emit behavioral events. Currently showing: raw table scan.
      </div>
    </GlassCard>
  );
}

export default function ManufacturerWarRoom() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("sentiment");

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Cormorant Garamond', serif", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.8) 40%,rgba(167,139,250,0.8) 60%,transparent)", zIndex: 20 }} />

      <div style={{ padding: "18px 24px 0", position: "sticky", top: 0, zIndex: 15, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <button onClick={() => navigate(-1 as never)} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.muted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", fontFamily: "inherit" }}>← BACK</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(17px,3.5vw,24px)", fontWeight: 500, color: C.purple, letterSpacing: "0.06em" }}>Manufacturer War Room</h1>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.14em", marginTop: 2 }}>AXIOM OS · PHASE 1 & 3 — BRAND INTELLIGENCE</div>
          </div>
          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2.4, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: "50%", background: C.purple }} />
          <span style={{ fontSize: 10, color: C.purple, letterSpacing: "0.1em" }}>ACTIVE</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: "9px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, letterSpacing: "0.06em", fontFamily: "inherit",
              color: tab === t.id ? C.purple : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.purple}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 80px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === "sentiment" && <SentimentTab />}
            {tab === "shadow"    && <ShadowTestsTab />}
            {tab === "network"   && <NetworkTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
