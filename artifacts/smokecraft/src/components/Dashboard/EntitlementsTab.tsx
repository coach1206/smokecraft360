/**
 * EntitlementsTab — Axiom OS Feature Control Center (super_admin only).
 *
 * Panels:
 *   1. Venue list with current package badge
 *   2. Selected venue: package selector + feature override grid + pricing
 *   3. Audit log for selected venue
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Check, X, ChevronRight, RotateCcw,
  DollarSign, ShieldCheck, Clock, Sparkles, Lock, Unlock,
} from "lucide-react";
import { invalidateFeatureCache } from "@/hooks/useFeature";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeatureDef {
  id: string; name: string; description: string; category: string;
}
interface PackageDef {
  id: string; name: string; description: string; features: string[]; color: string;
}
interface VenueRow {
  venueId: string; venueName: string; venueType: string;
  packageId: string | null; featureCount: number; monthlyPrice: string | null; updatedAt: string | null;
}
interface Override { id: string; enabled: boolean; }
interface VenueDetail {
  venueId: string; packageId: string | null;
  featureOverrides: Override[]; effectiveFeatures: string[];
  monthlyPrice: string | null; transactionFee: string | null; setupFee: string | null;
  updatedAt: string | null; updatedBy: string | null;
}
interface AuditEntry {
  id: string; adminName: string | null; action: string;
  before: Record<string, unknown> | null; after: Record<string, unknown>;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const GOLD  = "rgba(212,175,55,";
const WHITE = "rgba(255,255,255,";
const DARK  = "rgba(0,0,0,";

const CATEGORY_ORDER = ["experience","operations","intelligence","monetization","platform"];
const CATEGORY_LABELS: Record<string,string> = {
  experience: "Experience Modules", operations: "Operations",
  intelligence: "Intelligence", monetization: "Monetization", platform: "Platform",
};

function authHeaders(): Record<string,string> {
  const token = localStorage.getItem("smokecraft_token") ?? localStorage.getItem("axiom_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: authHeaders(), ...opts });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Package Badge ──────────────────────────────────────────────────────────────

function PackageBadge({ packageId, packages }: { packageId: string | null; packages: PackageDef[] }) {
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) return <span className="text-xs" style={{ color: `${WHITE}0.25)` }}>No package</span>;
  return (
    <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${pkg.color}22`, color: pkg.color, border: `1px solid ${pkg.color}44` }}>
      {pkg.name}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function EntitlementsTab() {
  const [features,  setFeatures]  = useState<FeatureDef[]>([]);
  const [packages,  setPackages]  = useState<PackageDef[]>([]);
  const [venues,    setVenues]    = useState<VenueRow[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [detail,    setDetail]    = useState<VenueDetail | null>(null);
  const [audit,     setAudit]     = useState<AuditEntry[]>([]);
  const [panel,     setPanel]     = useState<"features"|"pricing"|"audit">("features");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState<string | null>(null);

  // Editable local state for the selected venue
  const [localPackage,   setLocalPackage]   = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<Override[]>([]);
  const [localMonthly,   setLocalMonthly]   = useState("");
  const [localTxFee,     setLocalTxFee]     = useState("");
  const [localSetupFee,  setLocalSetupFee]  = useState("");

  // ── Load catalog + venue list ──────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      apiFetch<{ features: FeatureDef[]; packages: PackageDef[] }>("/api/admin/entitlements/catalog"),
      apiFetch<{ entitlements: VenueRow[] }>("/api/admin/entitlements"),
    ]).then(([cat, list]) => {
      setFeatures(cat.features);
      setPackages(cat.packages);
      setVenues(list.entitlements);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // ── Load venue detail when selection changes ───────────────────────────────

  const loadDetail = useCallback(async (venueId: string) => {
    setDetail(null); setAudit([]);
    const [d, a] = await Promise.all([
      apiFetch<VenueDetail>(`/api/admin/entitlements/${venueId}`),
      apiFetch<{ logs: AuditEntry[] }>(`/api/admin/entitlements/${venueId}/audit`),
    ]);
    setDetail(d);
    setAudit(a.logs);
    setLocalPackage(d.packageId);
    setLocalOverrides(d.featureOverrides ?? []);
    setLocalMonthly(d.monthlyPrice ?? "");
    setLocalTxFee(d.transactionFee ?? "");
    setLocalSetupFee(d.setupFee ?? "");
  }, []);

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  // ── Compute effective features from local state ────────────────────────────

  const pkgFeatures = packages.find(p => p.id === localPackage)?.features ?? [];
  const effectiveSet = (() => {
    const s = new Set(pkgFeatures);
    for (const o of localOverrides) { if (o.enabled) s.add(o.id); else s.delete(o.id); }
    return s;
  })();

  function getOverride(featureId: string): boolean | null {
    const o = localOverrides.find(x => x.id === featureId);
    return o ? o.enabled : null;
  }

  function toggleOverride(featureId: string) {
    const inPackage = pkgFeatures.includes(featureId);
    const existing  = localOverrides.find(x => x.id === featureId);

    if (!existing) {
      // No override yet: add one that inverts the package default
      setLocalOverrides(prev => [...prev, { id: featureId, enabled: !inPackage }]);
    } else if (existing.enabled === !inPackage) {
      // Override just reverts to package default — remove it (clean state)
      setLocalOverrides(prev => prev.filter(x => x.id !== featureId));
    } else {
      setLocalOverrides(prev => prev.map(x => x.id === featureId ? { ...x, enabled: !x.enabled } : x));
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selected) return;
    setSaving(true); setSaveMsg(null);
    try {
      await apiFetch(`/api/admin/entitlements/${selected}`, {
        method: "PUT",
        body: JSON.stringify({
          packageId:        localPackage,
          featureOverrides: localOverrides,
          monthlyPrice:     localMonthly    ? parseFloat(localMonthly)  : null,
          transactionFee:   localTxFee      ? parseFloat(localTxFee)    : null,
          setupFee:         localSetupFee   ? parseFloat(localSetupFee) : null,
        }),
      });
      invalidateFeatureCache();
      setSaveMsg("Saved");
      // Refresh venue list row
      setVenues(prev => prev.map(v => v.venueId === selected
        ? { ...v, packageId: localPackage, featureCount: effectiveSet.size, monthlyPrice: localMonthly || null }
        : v));
      // Reload audit
      const a = await apiFetch<{ logs: AuditEntry[] }>(`/api/admin/entitlements/${selected}/audit`);
      setAudit(a.logs);
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <motion.div className="w-8 h-8 rounded-full border-2"
          animate={{ rotate: 360 }}
          style={{ borderColor: `${GOLD}0.15)`, borderTopColor: `${GOLD}0.6)` }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
          Feature Control Center
        </h2>
        <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: `${GOLD}0.4)` }}>
          Axiom OS · Entitlement Engine
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">

        {/* ── Venue list ──────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${WHITE}0.07)` }}>
          <div className="px-4 py-3 text-[9px] uppercase tracking-[0.2em]"
            style={{ background: `${WHITE}0.02)`, color: `${GOLD}0.45)`, borderBottom: `1px solid ${WHITE}0.05)` }}>
            Venues ({venues.length})
          </div>
          <div className="divide-y" style={{ borderColor: `${WHITE}0.04)` }}>
            {venues.map(v => (
              <motion.button key={v.venueId} onClick={() => setSelected(v.venueId)}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                style={{
                  background: selected === v.venueId ? `${GOLD}0.06)` : "transparent",
                  borderLeft: selected === v.venueId ? `2px solid ${GOLD}0.5)` : "2px solid transparent",
                }}
                whileHover={{ background: `${GOLD}0.04)` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "rgba(210,190,155,0.85)" }}>
                    {v.venueName}
                  </p>
                  <div className="mt-1">
                    <PackageBadge packageId={v.packageId} packages={packages} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  <span className="text-[10px]" style={{ color: `${WHITE}0.3)` }}>
                    {v.featureCount} features
                  </span>
                  {v.monthlyPrice && (
                    <span className="text-[10px]" style={{ color: `${GOLD}0.45)` }}>
                      ${v.monthlyPrice}/mo
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        <div>
          {!selected ? (
            <div className="flex items-center justify-center py-24 rounded-xl"
              style={{ border: `1px solid ${WHITE}0.05)`, color: `${WHITE}0.2)` }}>
              <div className="text-center">
                <Package size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a venue to configure entitlements</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={selected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">

                {/* Venue header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
                      {venues.find(v => v.venueId === selected)?.venueName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: `${WHITE}0.3)` }}>
                        {effectiveSet.size} features active
                      </span>
                      {saveMsg && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: saveMsg === "Saved" ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
                            color:      saveMsg === "Saved" ? "rgba(52,211,153,0.8)" : "rgba(239,68,68,0.7)",
                          }}>
                          {saveMsg}
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs uppercase tracking-[0.15em]"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD}0.2), ${GOLD}0.1))`,
                      border:     `1px solid ${GOLD}0.35)`,
                      color:      saving ? `${GOLD}0.4)` : `${GOLD}0.8)`,
                    }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <ShieldCheck size={12} />
                    {saving ? "Saving…" : "Save"}
                  </motion.button>
                </div>

                {/* Sub-panel tabs */}
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: `${DARK}0.2)` }}>
                  {(["features","pricing","audit"] as const).map(p => (
                    <button key={p} onClick={() => setPanel(p)}
                      className="flex-1 py-1.5 rounded-md text-[10px] uppercase tracking-[0.12em] transition-all"
                      style={{
                        background: panel === p ? `${GOLD}0.12)` : "transparent",
                        color:      panel === p ? `${GOLD}0.8)` : `${WHITE}0.3)`,
                        border:     panel === p ? `1px solid ${GOLD}0.25)` : "1px solid transparent",
                      }}>
                      {p === "features" ? "Features" : p === "pricing" ? "Pricing" : "Audit Log"}
                    </button>
                  ))}
                </div>

                {/* ── Features panel ──────────────────────────────────────── */}
                {panel === "features" && (
                  <div className="space-y-5">
                    {/* Package selector */}
                    <div className="rounded-xl p-4" style={{ background: `${WHITE}0.025)`, border: `1px solid ${WHITE}0.06)` }}>
                      <p className="text-[9px] uppercase tracking-[0.2em] mb-3" style={{ color: `${GOLD}0.45)` }}>
                        Package
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {packages.map(pkg => (
                          <motion.button key={pkg.id}
                            onClick={() => { setLocalPackage(pkg.id); setLocalOverrides([]); }}
                            className="flex flex-col gap-1 p-3 rounded-lg text-left transition-all"
                            style={{
                              background: localPackage === pkg.id ? `${pkg.color}15` : `${WHITE}0.02)`,
                              border:     `1px solid ${localPackage === pkg.id ? pkg.color + "55" : WHITE + "0.06)"}`,
                            }}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <span className="text-[10px] uppercase tracking-[0.15em] font-medium"
                              style={{ color: localPackage === pkg.id ? pkg.color : `${WHITE}0.5)` }}>
                              {pkg.name}
                            </span>
                            <span className="text-[9px] leading-tight" style={{ color: `${WHITE}0.25)` }}>
                              {pkg.features.length} features
                            </span>
                          </motion.button>
                        ))}
                        <motion.button onClick={() => { setLocalPackage(null); setLocalOverrides([]); }}
                          className="flex flex-col gap-1 p-3 rounded-lg text-left"
                          style={{
                            background: localPackage === null ? "rgba(239,68,68,0.08)" : `${WHITE}0.02)`,
                            border:     `1px solid ${localPackage === null ? "rgba(239,68,68,0.3)" : WHITE + "0.06)"}`,
                          }}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <span className="text-[10px] uppercase tracking-[0.15em]"
                            style={{ color: localPackage === null ? "rgba(239,68,68,0.7)" : `${WHITE}0.35)` }}>
                            No Package
                          </span>
                          <span className="text-[9px]" style={{ color: `${WHITE}0.2)` }}>manual only</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Feature override grid */}
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${WHITE}0.06)` }}>
                      <div className="px-4 py-2.5 flex items-center justify-between"
                        style={{ background: `${WHITE}0.025)`, borderBottom: `1px solid ${WHITE}0.05)` }}>
                        <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: `${GOLD}0.45)` }}>
                          Feature Overrides
                        </span>
                        <button onClick={() => setLocalOverrides([])}
                          className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em]"
                          style={{ color: `${WHITE}0.3)` }}>
                          <RotateCcw size={9} />Reset
                        </button>
                      </div>

                      <div className="divide-y" style={{ borderColor: `${WHITE}0.04)` }}>
                        {CATEGORY_ORDER.map(cat => {
                          const catFeatures = features.filter(f => f.category === cat);
                          if (!catFeatures.length) return null;
                          return (
                            <div key={cat}>
                              <div className="px-4 py-1.5 text-[8px] uppercase tracking-[0.25em]"
                                style={{ background: `${DARK}0.15)`, color: `${WHITE}0.25)` }}>
                                {CATEGORY_LABELS[cat]}
                              </div>
                              {catFeatures.map(f => {
                                const inPkg     = pkgFeatures.includes(f.id);
                                const effective = effectiveSet.has(f.id);
                                const override  = getOverride(f.id);
                                const isOverridden = override !== null;

                                return (
                                  <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs" style={{ color: effective ? "rgba(210,190,155,0.85)" : `${WHITE}0.3)` }}>
                                          {f.name}
                                        </span>
                                        {isOverridden && (
                                          <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                                            style={{ background: `${GOLD}0.1)`, color: `${GOLD}0.6)` }}>
                                            override
                                          </span>
                                        )}
                                        {inPkg && !isOverridden && (
                                          <span className="text-[8px]" style={{ color: `${WHITE}0.18)` }}>
                                            pkg
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[9px] mt-0.5 truncate" style={{ color: `${WHITE}0.2)` }}>
                                        {f.description}
                                      </p>
                                    </div>
                                    <button onClick={() => toggleOverride(f.id)}
                                      className="ml-3 shrink-0 w-8 h-5 rounded-full transition-all relative"
                                      style={{
                                        background: effective ? `${GOLD}0.3)` : `${WHITE}0.08)`,
                                        border:     `1px solid ${effective ? GOLD + "0.5)" : WHITE + "0.12)"}`,
                                      }}>
                                      <motion.div
                                        className="absolute top-0.5 w-3.5 h-3.5 rounded-full"
                                        animate={{ left: effective ? "calc(100% - 18px)" : "2px" }}
                                        transition={{ duration: 0.15 }}
                                        style={{ background: effective ? `${GOLD}0.9)` : `${WHITE}0.25)` }} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Pricing panel ───────────────────────────────────────── */}
                {panel === "pricing" && (
                  <div className="rounded-xl p-5 space-y-5" style={{ background: `${WHITE}0.025)`, border: `1px solid ${WHITE}0.06)` }}>
                    <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: `${GOLD}0.45)` }}>
                      Venue Pricing
                    </p>
                    {[
                      { label: "Monthly Price ($)",  val: localMonthly,  set: setLocalMonthly,  placeholder: "e.g. 299" },
                      { label: "Transaction Fee (%)", val: localTxFee,    set: setLocalTxFee,    placeholder: "e.g. 2.5" },
                      { label: "Setup Fee ($)",       val: localSetupFee, set: setLocalSetupFee, placeholder: "e.g. 500" },
                    ].map(({ label, val, set, placeholder }) => (
                      <div key={label}>
                        <label className="block text-[9px] uppercase tracking-[0.15em] mb-1.5"
                          style={{ color: `${WHITE}0.35)` }}>
                          {label}
                        </label>
                        <div className="relative">
                          <DollarSign size={11} className="absolute left-3 top-1/2 -translate-y-1/2"
                            style={{ color: `${GOLD}0.4)` }} />
                          <input
                            type="number" value={val} placeholder={placeholder}
                            onChange={e => set(e.target.value)}
                            className="w-full pl-7 pr-4 py-2.5 rounded-lg text-sm bg-transparent outline-none transition-colors"
                            style={{
                              background: `${DARK}0.2)`,
                              border:     `1px solid ${WHITE}0.1)`,
                              color:      "rgba(210,190,155,0.85)",
                            }}
                            onFocus={e => (e.target.style.borderColor = `${GOLD}0.35)`)}
                            onBlur={e  => (e.target.style.borderColor = `${WHITE}0.1)`)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Audit log panel ─────────────────────────────────────── */}
                {panel === "audit" && (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${WHITE}0.06)` }}>
                    <div className="px-4 py-2.5 text-[9px] uppercase tracking-[0.2em]"
                      style={{ background: `${WHITE}0.025)`, color: `${GOLD}0.45)`, borderBottom: `1px solid ${WHITE}0.05)` }}>
                      Audit Log ({audit.length})
                    </div>
                    {audit.length === 0 ? (
                      <div className="py-12 text-center text-sm" style={{ color: `${WHITE}0.2)` }}>
                        No changes recorded yet
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: `${WHITE}0.04)` }}>
                        {audit.map(entry => (
                          <div key={entry.id} className="px-4 py-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock size={10} style={{ color: `${GOLD}0.4)` }} />
                                <span className="text-[10px]" style={{ color: `${WHITE}0.5)` }}>
                                  {entry.adminName ?? "Admin"} — {entry.action}
                                </span>
                              </div>
                              <span className="text-[9px]" style={{ color: `${WHITE}0.25)` }}>
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {entry.after["packageId"] !== undefined && (
                              <p className="text-[9px]" style={{ color: `${WHITE}0.3)` }}>
                                Package: {String(entry.before?.packageId ?? "none")} → {String(entry.after["packageId"] ?? "none")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
