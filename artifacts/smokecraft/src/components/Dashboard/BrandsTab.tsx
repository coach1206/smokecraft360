/**
 * BrandsTab — "Brands & Distributors" section of the Partner Dashboard.
 *
 * Shows a two-column hierarchy:
 *   Left  — distributor directory with brand counts
 *   Right — brand cards with products + performance data
 *
 * Clicking a brand expands a mini product-impression table.
 * A "Campaigns" future-ready panel sits at the bottom.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Tag, ChevronDown, ChevronRight,
  Globe, Mail, MapPin, Package, TrendingUp,
  Sparkles, Zap, Plus, Megaphone, Clock,
} from "lucide-react";
import {
  fetchBrands, fetchDistributors, fetchBrandPerformance,
  type Brand, type Distributor, type BrandPerformance,
} from "@/services/api";

export function BrandsTab() {
  const [brands,       setBrands]       = useState<Brand[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  const [expandedBrand,  setExpandedBrand]  = useState<string | null>(null);
  const [brandPerf,      setBrandPerf]      = useState<Record<string, BrandPerformance>>({});
  const [perfLoading,    setPerfLoading]    = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [b, d] = await Promise.all([fetchBrands(), fetchDistributors()]);
        setBrands(b);
        setDistributors(d);
        if (d.length > 0) setSelectedDistId(d[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load brand data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExpandBrand = async (brandId: string) => {
    if (expandedBrand === brandId) { setExpandedBrand(null); return; }
    setExpandedBrand(brandId);
    if (brandPerf[brandId]) return;
    setPerfLoading((p) => ({ ...p, [brandId]: true }));
    try {
      const perf = await fetchBrandPerformance(brandId);
      setBrandPerf((p) => ({ ...p, [brandId]: perf }));
    } catch { /* non-critical */ }
    finally { setPerfLoading((p) => ({ ...p, [brandId]: false })); }
  };

  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorBox msg={error} />;

  const selectedDist    = distributors.find((d) => d.id === selectedDistId);
  const filteredBrands  = selectedDistId
    ? brands.filter((b) => b.distributorId === selectedDistId)
    : brands;
  const unassignedBrands = brands.filter((b) => !b.distributorId);

  const totalProducts   = brands.reduce((s, b) => s + b.productCount, 0);
  const totalImpressions= brands.reduce((s, b) => s + b.impressions,  0);

  return (
    <div className="space-y-8">

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <MiniStat icon={<Building2 size={14} />} label="Distributors" value={distributors.length} />
        <MiniStat icon={<Tag size={14} />}       label="Brands"       value={brands.length} />
        <MiniStat icon={<Package size={14} />}   label="Products"     value={totalProducts} gold />
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">

        {/* Left — distributor sidebar */}
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(107,94,78,0.40)" }}>
            Distributors
          </p>

          {distributors.length === 0 ? (
            <EmptySlate
              icon={<Building2 size={20} />}
              label="No distributors yet"
              sub="Add distributors to organise your brand partners"
            />
          ) : (
            distributors.map((d) => (
              <button key={d.id} onClick={() => setSelectedDistId(selectedDistId === d.id ? null : d.id)}
                className="w-full text-left px-3 py-3 rounded-xl transition-all duration-200"
                style={selectedDistId === d.id
                  ? { background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.3)" }
                  : { background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }
                }>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-sm" style={{ color: selectedDistId === d.id ? "rgba(230,210,175,0.9)" : "rgba(200,180,145,0.7)" }}>
                    {d.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-2"
                    style={{ background: "rgba(212,139,0,0.08)", color: "rgba(212,139,0,0.6)" }}>
                    {d.brandCount}
                  </span>
                </div>
                {d.state && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={9} style={{ color: "rgba(107,94,78,0.35)" }} />
                    <span className="text-[9px]" style={{ color: "rgba(107,94,78,0.40)" }}>{d.state}</span>
                  </div>
                )}
              </button>
            ))
          )}

          {unassignedBrands.length > 0 && (
            <button onClick={() => setSelectedDistId(null)}
              className="w-full text-left px-3 py-3 rounded-xl transition-all duration-200 mt-2"
              style={selectedDistId === null
                ? { background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.2)" }
                : { background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.07)" }
              }>
              <span className="text-[11px] italic" style={{ color: "rgba(107,94,78,0.50)" }}>
                All brands ({brands.length})
              </span>
            </button>
          )}
        </div>

        {/* Right — brand cards */}
        <div className="space-y-3">
          {selectedDist && (
            <div className="p-4 rounded-xl mb-4 flex gap-4 flex-wrap"
              style={{ background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.12)" }}>
              <DistributorDetail distributor={selectedDist} />
            </div>
          )}

          <p className="text-[9px] uppercase tracking-[0.25em] mb-2" style={{ color: "rgba(107,94,78,0.40)" }}>
            {selectedDist ? `Brands under ${selectedDist.name}` : "All Brands"}
            <span className="ml-2 text-[8px]" style={{ color: "rgba(212,139,0,0.35)" }}>
              — {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""}
              {" · "}
              {filteredBrands.reduce((s, b) => s + b.impressions, 0).toLocaleString()} total impressions
            </span>
          </p>

          {filteredBrands.length === 0 ? (
            <EmptySlate
              icon={<Tag size={20} />}
              label="No brands linked"
              sub={selectedDist ? `No brands assigned to ${selectedDist.name} yet` : "No brands found"}
            />
          ) : (
            <AnimatePresence initial={false}>
              {filteredBrands.map((brand, i) => (
                <motion.div key={brand.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <BrandCard
                    brand={brand}
                    expanded={expandedBrand === brand.id}
                    perf={brandPerf[brand.id]}
                    perfLoading={perfLoading[brand.id] ?? false}
                    onToggle={() => handleExpandBrand(brand.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Campaigns — future-ready panel */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="rounded-xl p-6 relative overflow-hidden"
          style={{ background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.15)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(212,139,0,0.04), transparent 60%)" }} />
          <div className="relative flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Megaphone size={16} style={{ color: "rgba(212,139,0,0.55)" }} />
                <h3 className="font-serif text-lg" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
                  Sponsored Campaigns
                </h3>
                <span className="text-[8px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)", color: "rgba(212,139,0,0.5)" }}>
                  <Clock size={7} />Coming Soon
                </span>
              </div>
              <p className="text-[11px] leading-relaxed max-w-lg" style={{ color: "rgba(107,94,78,0.50)" }}>
                Brand partners and distributors will be able to create time-boxed sponsored campaigns —
                setting impression goals, budgets, and promotion windows so their products surface
                at the top of recommendations during the campaign period.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap shrink-0">
              <FeatureChip icon={<Zap size={10} />}      label="Priority Boost" />
              <FeatureChip icon={<TrendingUp size={10} />} label="Impression Goals" />
              <FeatureChip icon={<Sparkles size={10} />} label="Budget Controls" />
            </div>
          </div>
          <div className="mt-5 pt-5 border-t grid grid-cols-3 gap-4" style={{ borderColor: "rgba(212,139,0,0.08)" }}>
            {["Draft", "Active", "Completed"].map((status) => (
              <div key={status} className="p-3 rounded-lg text-center"
                style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.07)" }}>
                <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(107,94,78,0.35)" }}>{status}</p>
                <p className="font-serif text-xl mt-1" style={{ color: "rgba(107,94,78,0.20)", fontWeight: 300 }}>—</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bottom summary row */}
      {brands.length > 0 && (
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <SummaryCard label="Total Impressions"      value={totalImpressions.toLocaleString()} />
          <SummaryCard label="Linked Products"        value={totalProducts.toString()} />
          <SummaryCard label="Sponsored Brands"
            value={brands.filter((b) => b.sponsoredImpressions > 0).length.toString()} gold />
          <SummaryCard label="Distributor Partners"   value={distributors.length.toString()} />
        </motion.div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BrandCard({ brand, expanded, perf, perfLoading, onToggle }: {
  brand:       Brand;
  expanded:    boolean;
  perf?:       BrandPerformance;
  perfLoading: boolean;
  onToggle:    () => void;
}) {
  const convRate = brand.impressions > 0
    ? Math.round((brand.sponsoredImpressions / brand.impressions) * 100)
    : 0;

  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: expanded ? "rgba(212,139,0,0.05)" : "rgba(26,26,27,0.04)",
        border:     expanded ? "1px solid rgba(212,139,0,0.2)" : "1px solid rgba(26,26,27,0.08)",
      }}>

      {/* Header row */}
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={onToggle}>
        {/* Category badge */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.15)" }}>
          <span className="text-[10px] uppercase tracking-wider"
            style={{ color: "rgba(212,139,0,0.65)" }}>
            {brand.category.slice(0, 3)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.88)" }}>{brand.name}</p>
            <span className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.50)" }}>
              {brand.category}
            </span>
            {brand.sponsoredImpressions > 0 && (
              <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.7)" }}>
                <Sparkles size={7} />Sponsored
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <Metric label="products"    value={brand.productCount} />
            <Metric label="impressions" value={brand.impressions.toLocaleString()} />
            {brand.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] transition-colors"
                style={{ color: "rgba(107,94,78,0.35)" }}
                onClick={(e) => e.stopPropagation()}>
                <Globe size={8} />{brand.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        {/* Impression bar */}
        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 w-28">
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.07)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (brand.impressions / Math.max(...[brand.impressions, 1])) * 100)}%`,
                background: "linear-gradient(90deg, rgba(212,139,0,0.6), rgba(212,139,0,0.8))",
              }} />
          </div>
          <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.35)" }}>
            {convRate}% sponsored
          </span>
        </div>

        {/* Expand chevron */}
        <div style={{ color: "rgba(107,94,78,0.35)" }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Expanded product table */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid rgba(212,139,0,0.08)" }}>
              {perfLoading ? (
                <div className="flex items-center justify-center py-4">
                  <motion.div className="w-5 h-5 rounded-full border"
                    style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.6)" }}
                    animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                </div>
              ) : !perf ? (
                <p className="text-xs py-3 text-center italic" style={{ color: "rgba(107,94,78,0.35)" }}>
                  No performance data available
                </p>
              ) : perf.products.length === 0 ? (
                <p className="text-xs py-3 text-center italic" style={{ color: "rgba(107,94,78,0.35)" }}>
                  No products linked to this brand
                </p>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="flex gap-4 flex-wrap py-3 mb-3"
                    style={{ borderBottom: "1px solid rgba(26,26,27,0.06)" }}>
                    <PerfStat label="Total Impressions"      value={perf.summary.totalImpressions.toLocaleString()} />
                    <PerfStat label="Sponsored Impressions"  value={perf.summary.sponsoredImpressions.toLocaleString()} gold />
                    <PerfStat label="Boosted Products"       value={perf.summary.boostedCount.toString()} />
                    <PerfStat label="Sponsored Products"     value={perf.summary.sponsoredCount.toString()} gold />
                  </div>

                  {/* Product rows */}
                  <div className="space-y-2">
                    <p className="text-[8px] uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(107,94,78,0.35)" }}>
                      Products ({perf.products.length})
                    </p>
                    {perf.products.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                        style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.06)" }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-xs truncate" style={{ color: "rgba(210,190,155,0.8)" }}>{p.name}</span>
                            {p.sponsored && <Sparkles size={9} style={{ color: "rgba(212,139,0,0.6)", flexShrink: 0 }} />}
                            {p.boostLevel > 0 && <Zap size={9} style={{ color: "rgba(212,139,0,0.5)", flexShrink: 0 }} />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.40)" }}>{p.tier}</span>
                            <span style={{ color: "rgba(107,94,78,0.20)" }}>·</span>
                            <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.40)" }}>{p.category}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-serif" style={{ color: "rgba(212,139,0,0.75)", fontWeight: 300 }}>
                            {p.impressions.toLocaleString()}
                          </p>
                          <p className="text-[8px]" style={{ color: "rgba(107,94,78,0.35)" }}>impressions</p>
                        </div>
                        {/* Mini impression bar */}
                        <div className="w-16 h-1 rounded-full overflow-hidden flex-shrink-0"
                          style={{ background: "rgba(26,26,27,0.06)" }}>
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (p.impressions / Math.max(perf.summary.totalImpressions, 1)) * 100)}%`,
                              background: p.sponsored
                                ? "rgba(212,139,0,0.7)"
                                : "rgba(107,94,78,0.40)",
                            }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DistributorDetail({ distributor }: { distributor: Distributor }) {
  return (
    <>
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>Distributor</p>
        <p className="font-serif text-base" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>{distributor.name}</p>
      </div>
      {distributor.state && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>State</p>
          <div className="flex items-center gap-1">
            <MapPin size={10} style={{ color: "rgba(107,94,78,0.40)" }} />
            <p className="text-xs" style={{ color: "rgba(200,180,145,0.75)" }}>{distributor.state}</p>
          </div>
        </div>
      )}
      {distributor.contactEmail && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>Contact</p>
          <div className="flex items-center gap-1">
            <Mail size={10} style={{ color: "rgba(107,94,78,0.40)" }} />
            <p className="text-xs" style={{ color: "rgba(200,180,145,0.75)" }}>{distributor.contactEmail}</p>
          </div>
        </div>
      )}
      {distributor.website && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>Website</p>
          <a href={distributor.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: "rgba(107,94,78,0.58)" }}>
            <Globe size={10} />{distributor.website.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}
    </>
  );
}

function MiniStat({ icon, label, value, gold }: { icon: React.ReactNode; label: string; value: number; gold?: boolean }) {
  return (
    <div className="p-3 rounded-xl flex items-center gap-2.5"
      style={{
        background: gold ? "rgba(212,139,0,0.06)" : "rgba(26,26,27,0.04)",
        border:     gold ? "1px solid rgba(212,139,0,0.18)" : "1px solid rgba(26,26,27,0.08)",
      }}>
      <div style={{ color: gold ? "rgba(212,139,0,0.65)" : "rgba(107,94,78,0.45)" }}>{icon}</div>
      <div>
        <p className="text-lg font-serif" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>{value}</p>
        <p className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(107,94,78,0.40)" }}>{label}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="p-3 rounded-xl text-center"
      style={{
        background: "rgba(26,26,27,0.04)",
        border: gold ? "1px solid rgba(212,139,0,0.15)" : "1px solid rgba(26,26,27,0.07)",
      }}>
      <p className="font-serif text-xl" style={{ color: gold ? "rgba(212,139,0,0.8)" : "rgba(200,180,145,0.75)", fontWeight: 300 }}>{value}</p>
      <p className="text-[8px] uppercase tracking-[0.18em] mt-0.5" style={{ color: "rgba(107,94,78,0.35)" }}>{label}</p>
    </div>
  );
}

function PerfStat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <p className="text-xs font-serif" style={{ color: gold ? "rgba(212,139,0,0.75)" : "rgba(200,180,145,0.8)", fontWeight: 300 }}>{value}</p>
      <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(107,94,78,0.38)" }}>{label}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="text-[9px]" style={{ color: "rgba(107,94,78,0.45)" }}>
      <span style={{ color: "rgba(210,190,155,0.65)" }}>{value}</span> {label}
    </span>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: "rgba(212,139,0,0.06)", border: "1px solid rgba(212,139,0,0.15)" }}>
      <span style={{ color: "rgba(212,139,0,0.5)" }}>{icon}</span>
      <span className="text-[9px] uppercase tracking-[0.12em]" style={{ color: "rgba(107,94,78,0.52)" }}>{label}</span>
    </div>
  );
}

function EmptySlate({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="py-10 flex flex-col items-center gap-3 text-center">
      <div style={{ color: "rgba(107,94,78,0.20)" }}>{icon}</div>
      <p className="text-sm font-serif" style={{ color: "rgba(200,180,145,0.45)", fontWeight: 300 }}>{label}</p>
      <p className="text-[10px] max-w-xs" style={{ color: "rgba(107,94,78,0.30)" }}>{sub}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <motion.div className="w-8 h-8 rounded-full border-2"
        style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="p-6 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
      <p className="text-sm" style={{ color: "rgba(239,68,68,0.75)" }}>{msg}</p>
    </div>
  );
}
