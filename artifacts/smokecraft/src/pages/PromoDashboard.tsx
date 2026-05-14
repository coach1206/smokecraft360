/**
 * PromoDashboard — Revenue Control Center for Axiom OS Ad Engine.
 *
 * Three tabs:
 *   1. Asset Manager     — create / edit / deactivate sponsor ticker campaigns.
 *                          Logo URL input with preview, scrolling text, CTA link,
 *                          craft type targeting, region targeting, reveal content.
 *   2. Campaign Controls — set start/end dates, Prestige Multiplier, priority.
 *   3. Analytics         — live impression counters, CTR bars, add-to-draft and
 *                          nudge-to-purchase conversion metrics per campaign.
 *
 * Design: Brushed Graphite (#2A2A2A) header bezels + Smoked Cream (#F5F2ED) body.
 * Access: venue_owner | manager | super_admin (enforced server-side; UI warns guests).
 */

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import { motion, AnimatePresence }                              from "framer-motion";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:         "#F5F2ED",
  card:       "#EFEBE0",
  obs:        "#1A1A1B",
  amber:      "#D48B00",
  graphite:   "#2A2A2A",
  muted:      "#6B5E4E",
  border:     "rgba(107,94,78,0.18)",
  amberBorder:"rgba(212,139,0,0.30)",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TickerRow {
  id:                 string;
  brandName:          string;
  logoUrl:            string | null;
  promoText:          string;
  promoLink:          string | null;
  revealContent:      string | null;
  craftTypes:         string | null;
  targetRegion:       string | null;
  pointBonus:         number;
  prestigeMultiplier: number;
  priority:           number;
  active:             boolean;
  startsAt:           string | null;
  endsAt:             string | null;
  venueId:            string | null;
  // analytics fields (from /api/ads/analytics)
  impressions?:       number;
  clicks?:            number;
  addToDraft?:        number;
  nudgeConverted?:    number;
  ctr?:              number;
}

interface AnalyticsTotals {
  impressions:      number;
  clicks:           number;
  addToDraft:       number;
  ctr:              number;
  nudgeConversions: number;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN = () => localStorage.getItem("axiom_token") ?? "";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN()}`, ...init?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const CRAFT_OPTIONS = ["smoke", "pour", "brew", "vape"];
const REGION_OPTIONS = [
  { value: "", label: "Global (all venues)" },
  { value: "US-GA", label: "Georgia, USA" },
  { value: "US-FL", label: "Florida, USA" },
  { value: "US-NY", label: "New York, USA" },
  { value: "US-TX", label: "Texas, USA" },
  { value: "US-CA", label: "California, USA" },
  { value: "US-IL", label: "Illinois, USA" },
];

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${C.border}`, background: "#fff",
  fontSize: "0.82rem", color: C.obs, outline: "none",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.68rem", fontWeight: 700,
  letterSpacing: "0.08em", color: C.muted, textTransform: "uppercase",
  marginBottom: 5,
};

// ── Logo Upload Zone ──────────────────────────────────────────────────────────

interface LogoUploadZoneProps {
  currentUrl:   string;
  token:        string;
  onUploaded:   (url: string) => void;
  onUrlChange:  (url: string) => void;
}

function LogoUploadZone({ currentUrl, token, onUploaded, onUrlChange }: LogoUploadZoneProps) {
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploading(true); setUploadError("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`${BASE}/api/ads/upload-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { url: string };
      onUploaded(data.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 16px", borderRadius: 10, cursor: "pointer",
          border: `2px dashed ${dragging ? C.amber : C.amberBorder}`,
          background: dragging ? "rgba(212,139,0,0.06)" : "rgba(212,139,0,0.02)",
          transition: "all 0.15s",
        }}
      >
        {/* Logo preview or placeholder */}
        <div style={{
          width: 52, height: 52, borderRadius: 8, flexShrink: 0,
          background: "rgba(212,139,0,0.08)", border: `1px solid ${C.amberBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {uploading ? (
            <div style={{ width: 20, height: 20, border: `2px solid ${C.amber}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          ) : currentUrl ? (
            <img src={currentUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
          ) : (
            <span style={{ fontSize: "1.4rem", opacity: 0.4 }}>⬆</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: C.obs, marginBottom: 2 }}>
            {uploading ? "Uploading to Cloudinary…" : "Drop PNG / SVG here, or click to browse"}
          </div>
          <div style={{ fontSize: "0.64rem", color: C.muted }}>
            Max 4 MB · Automatically cropped to 200×200 · Stored on Cloudinary
          </div>
          {uploadError && <div style={{ fontSize: "0.64rem", color: "#dc2626", marginTop: 4 }}>{uploadError}</div>}
        </div>

        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }} onChange={handleFile} />
      </div>

      {/* URL fallback */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ height: 1, flex: 1, background: C.border }} />
        <span style={{ fontSize: "0.60rem", color: C.muted, letterSpacing: "0.06em" }}>or paste URL</span>
        <div style={{ height: 1, flex: 1, background: C.border }} />
      </div>
      <input
        value={currentUrl}
        onChange={e => onUrlChange(e.target.value)}
        style={inputStyle}
        placeholder="https://res.cloudinary.com/…/logo.png"
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Empty ticker form ─────────────────────────────────────────────────────────

function emptyForm(): Partial<TickerRow> {
  return {
    brandName: "", promoText: "", logoUrl: "", promoLink: "",
    craftTypes: "", targetRegion: "", pointBonus: 15,
    prestigeMultiplier: 1.0, priority: 100,
    active: true, startsAt: null, endsAt: null,
    revealContent: "",
  };
}

// ════════════════════════════════════════════════════════════════
// ── Tab 1: Asset Manager
// ════════════════════════════════════════════════════════════════

function AssetManager({ tickers, onRefresh }: { tickers: TickerRow[]; onRefresh: () => void }) {
  const [showForm, setShowForm]   = useState(false);
  const [editing,  setEditing]    = useState<TickerRow | null>(null);
  const [form,     setForm]       = useState<Partial<TickerRow>>(emptyForm());
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState("");

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); setError(""); };
  const openEdit   = (t: TickerRow) => { setEditing(t); setForm({ ...t }); setShowForm(true); setError(""); };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const body = {
        brandName:          form.brandName,
        promoText:          form.promoText,
        logoUrl:            form.logoUrl || undefined,
        promoLink:          form.promoLink || undefined,
        revealContent:      form.revealContent || undefined,
        craftTypes:         form.craftTypes || undefined,
        targetRegion:       form.targetRegion || undefined,
        pointBonus:         form.pointBonus,
        prestigeMultiplier: form.prestigeMultiplier,
        priority:           form.priority,
        startsAt:           form.startsAt || undefined,
        endsAt:             form.endsAt   || undefined,
      };
      if (editing) {
        await apiFetch(`/api/ads/ticker/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/api/ads/ticker", { method: "POST", body: JSON.stringify(body) });
      }
      setShowForm(false); onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await apiFetch(`/api/ads/ticker/${id}`, { method: "DELETE" }).catch(() => {});
    onRefresh();
  };

  const set = (key: keyof TickerRow, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: "0.72rem", color: C.muted }}>{tickers.length} campaign{tickers.length !== 1 ? "s" : ""}</div>
        <button onClick={openCreate} style={{
          padding: "8px 18px", borderRadius: 8,
          background: C.amber, border: "none",
          color: "#fff", fontSize: "0.74rem", fontWeight: 700,
          letterSpacing: "0.06em", cursor: "pointer",
        }}>
          + New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tickers.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.muted, fontSize: "0.82rem" }}>
            No campaigns yet. Create one to activate the ticker.
          </div>
        )}
        {tickers.map(t => (
          <div key={t.id} style={{
            background: "#fff", borderRadius: 12, padding: "14px 18px",
            border: `1px solid ${t.active ? C.amberBorder : C.border}`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            {/* Logo preview */}
            <div style={{
              width: 40, height: 40, borderRadius: 8, flexShrink: 0,
              background: "rgba(212,139,0,0.08)", border: `1px solid ${C.amberBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {t.logoUrl
                ? <img src={t.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <span style={{ fontSize: "0.72rem", fontWeight: 800, color: C.amber }}>
                    {t.brandName.slice(0, 2).toUpperCase()}
                  </span>
              }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: C.obs, marginBottom: 2 }}>{t.brandName}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.promoText}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                {t.craftTypes && <span style={{ fontSize: "0.58rem", padding: "1px 6px", borderRadius: 4, background: "rgba(212,139,0,0.10)", color: C.amber, fontWeight: 700 }}>{t.craftTypes}</span>}
                {t.targetRegion && <span style={{ fontSize: "0.58rem", padding: "1px 6px", borderRadius: 4, background: "rgba(107,94,78,0.10)", color: C.muted, fontWeight: 700 }}>{t.targetRegion}</span>}
                <span style={{ fontSize: "0.58rem", padding: "1px 6px", borderRadius: 4, background: t.active ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.10)", color: t.active ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                  {t.active ? "LIVE" : "PAUSED"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => openEdit(t)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", fontSize: "0.72rem", color: C.muted, cursor: "pointer" }}>Edit</button>
              {t.active && <button onClick={() => handleDeactivate(t.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.25)", background: "transparent", fontSize: "0.72rem", color: "#dc2626", cursor: "pointer" }}>Pause</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(26,26,27,0.70)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
                background: C.bg, borderRadius: 16, padding: "28px 28px 24px",
                boxShadow: "0 24px 60px rgba(0,0,0,0.40)",
              }}
            >
              <div style={{ fontSize: "1.0rem", fontWeight: 700, color: C.obs, marginBottom: 20 }}>
                {editing ? "Edit Campaign" : "New Campaign"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Brand Name *</label>
                  <input value={form.brandName ?? ""} onChange={e => set("brandName", e.target.value)} style={inputStyle} placeholder="Macallan" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Promo Text * (≤80 chars)</label>
                  <input value={form.promoText ?? ""} maxLength={80} onChange={e => set("promoText", e.target.value)} style={inputStyle} placeholder="Limited Edition 18yr Pairing — Tonight Only" />
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: 3 }}>{(form.promoText ?? "").length}/80</div>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Brand Logo (PNG / SVG)</label>
                  <LogoUploadZone
                    currentUrl={form.logoUrl ?? ""}
                    token={TOKEN()}
                    onUploaded={url => set("logoUrl", url)}
                    onUrlChange={url => set("logoUrl", url)}
                  />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Destination Link</label>
                  <input value={form.promoLink ?? ""} onChange={e => set("promoLink", e.target.value)} style={inputStyle} placeholder="/promo/macallan or https://..." />
                </div>
                <div>
                  <label style={labelStyle}>Craft Types (comma-sep)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                    {CRAFT_OPTIONS.map(c => {
                      const active = (form.craftTypes ?? "").split(",").map(s => s.trim()).includes(c);
                      return (
                        <button key={c} onClick={() => {
                          const current = (form.craftTypes ?? "").split(",").map(s => s.trim()).filter(Boolean);
                          const next = active ? current.filter(x => x !== c) : [...current, c];
                          set("craftTypes", next.join(","));
                        }} style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer",
                          border: `1px solid ${active ? C.amber : C.border}`,
                          background: active ? "rgba(212,139,0,0.12)" : "transparent",
                          color: active ? C.amber : C.muted,
                        }}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Target Region</label>
                  <select value={form.targetRegion ?? ""} onChange={e => set("targetRegion", e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                    {REGION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Point Bonus (XP)</label>
                  <input type="number" min={0} max={100} value={form.pointBonus ?? 15} onChange={e => set("pointBonus", Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prestige Multiplier (1×–3×)</label>
                  <input type="number" min={1} max={3} step={0.1} value={form.prestigeMultiplier ?? 1} onChange={e => set("prestigeMultiplier", Number(e.target.value))} style={inputStyle} />
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: 3 }}>
                    Effective XP: +{Math.round((form.pointBonus ?? 15) * (form.prestigeMultiplier ?? 1))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="datetime-local" value={form.startsAt?.slice(0, 16) ?? ""} onChange={e => set("startsAt", e.target.value ? new Date(e.target.value).toISOString() : null)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="datetime-local" value={form.endsAt?.slice(0, 16) ?? ""} onChange={e => set("endsAt", e.target.value ? new Date(e.target.value).toISOString() : null)} style={inputStyle} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelStyle}>Special Reveal Content (JSON)</label>
                  <textarea
                    value={form.revealContent ?? ""}
                    onChange={e => set("revealContent", e.target.value)}
                    style={{ ...inputStyle, height: 72, resize: "vertical", fontFamily: "monospace", fontSize: "0.72rem" }}
                    placeholder={'{"headline":"Limited 18yr Pairing","body":"Your mentor selected this...","ctaText":"Add to Draft"}'}
                  />
                </div>
              </div>

              {error && <div style={{ marginTop: 12, fontSize: "0.74rem", color: "#dc2626" }}>{error}</div>}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  background: C.amber, border: "none", color: "#fff",
                  fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                  opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Campaign"}
                </button>
                <button onClick={() => setShowForm(false)} style={{
                  padding: "12px 20px", borderRadius: 10,
                  border: `1px solid ${C.border}`, background: "transparent",
                  fontSize: "0.78rem", color: C.muted, cursor: "pointer",
                }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ── Tab 3: Analytics
// ════════════════════════════════════════════════════════════════

function Analytics({ tickers }: { tickers: TickerRow[] }) {
  const totals: AnalyticsTotals = tickers.reduce(
    (acc, t) => ({
      impressions:      acc.impressions      + (t.impressions  ?? 0),
      clicks:           acc.clicks           + (t.clicks       ?? 0),
      addToDraft:       acc.addToDraft       + (t.addToDraft   ?? 0),
      ctr:              0,
      nudgeConversions: acc.nudgeConversions + (t.nudgeConverted ?? 0),
    }),
    { impressions: 0, clicks: 0, addToDraft: 0, ctr: 0, nudgeConversions: 0 },
  );
  totals.ctr = totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0;

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.10em", color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.obs, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const maxImp = Math.max(...tickers.map(t => t.impressions ?? 0), 1);

  return (
    <div>
      {/* Global summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Impressions"     value={totals.impressions.toLocaleString()} />
        <Stat label="Clicks"          value={totals.clicks.toLocaleString()}      />
        <Stat label="CTR"             value={`${totals.ctr}%`}                    sub="clicks / impressions" />
        <Stat label="Add to Draft"    value={totals.addToDraft.toLocaleString()}  />
        <Stat label="Conversions"     value={totals.nudgeConversions.toLocaleString()} sub="nudge → purchase" />
      </div>

      {/* Per-ticker breakdown */}
      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.10em", color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Per-Campaign Performance</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tickers.length === 0 && <div style={{ color: C.muted, fontSize: "0.82rem", padding: "24px 0" }}>No campaigns to report.</div>}
        {tickers.map(t => {
          const imp = t.impressions  ?? 0;
          const clk = t.clicks       ?? 0;
          const ctr = imp > 0 ? Math.round((clk / imp) * 10000) / 100 : 0;
          const barW = Math.round((imp / maxImp) * 100);
          return (
            <div key={t.id} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: C.obs }}>{t.brandName}</span>
                  {t.targetRegion && <span style={{ marginLeft: 8, fontSize: "0.60rem", color: C.muted }}>📍 {t.targetRegion}</span>}
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: "0.72rem", color: C.muted }}>
                  <span><b style={{ color: C.obs }}>{imp.toLocaleString()}</b> imp</span>
                  <span><b style={{ color: C.obs }}>{clk.toLocaleString()}</b> clk</span>
                  <span><b style={{ color: C.amber }}>{ctr}%</b> CTR</span>
                </div>
              </div>
              {/* Impression bar */}
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${barW}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: C.amber, borderRadius: 2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ── Main page
// ════════════════════════════════════════════════════════════════

const TABS = ["Asset Manager", "Campaign Controls", "Analytics"] as const;
type Tab = typeof TABS[number];

export default function PromoDashboard() {
  const [tab,     setTab]     = useState<Tab>("Asset Manager");
  const [tickers, setTickers] = useState<TickerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ tickers: TickerRow[] }>("/api/ads/analytics");
      setTickers(data.tickers);
    } catch {
      // Not authed — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>
      {/* Brushed Graphite header */}
      <div style={{
        background: C.graphite, padding: "20px 32px",
        borderBottom: "2px solid rgba(212,139,0,0.25)",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.16em", color: "rgba(212,139,0,0.70)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            NOVEE OS · Revenue Control Center
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 600, color: "#F0E8D4" }}>
            Promotion Manager
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(240,232,212,0.50)", marginTop: 4 }}>
            Manage sponsored campaigns, set multipliers, and track ticker performance in real-time.
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, marginBottom: 24, background: C.card, padding: 4, borderRadius: 10, width: "fit-content" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.05em",
                background: tab === t ? "#fff" : "transparent",
                color:      tab === t ? C.obs : C.muted,
                boxShadow:  tab === t ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: "0.82rem" }}>Loading campaigns…</div>
        ) : (
          <>
            {tab === "Asset Manager" && (
              <AssetManager tickers={tickers} onRefresh={fetchData} />
            )}

            {tab === "Campaign Controls" && (
              <div>
                <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: 16 }}>
                  Use the <b>Asset Manager</b> to set start/end dates and the Prestige Multiplier on each campaign.
                  Below is a quick summary of all active schedules.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tickers.filter(t => t.active).length === 0 && (
                    <div style={{ color: C.muted, fontSize: "0.82rem", padding: "24px 0" }}>No active campaigns.</div>
                  )}
                  {tickers.filter(t => t.active).map(t => (
                    <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: `1px solid ${C.amberBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.84rem", color: C.obs }}>{t.brandName}</div>
                        <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 3 }}>
                          {t.startsAt ? new Date(t.startsAt).toLocaleDateString() : "No start"} → {t.endsAt ? new Date(t.endsAt).toLocaleDateString() : "No end"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.amber }}>×{t.prestigeMultiplier.toFixed(1)}</div>
                        <div style={{ fontSize: "0.62rem", color: C.muted }}>multiplier</div>
                        <div style={{ fontSize: "0.68rem", color: C.obs, marginTop: 2 }}>+{Math.round(t.pointBonus * t.prestigeMultiplier)} XP effective</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "Analytics" && <Analytics tickers={tickers} />}
          </>
        )}
      </div>
    </div>
  );
}
