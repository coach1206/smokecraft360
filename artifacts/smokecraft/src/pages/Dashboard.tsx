import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Package, Sparkles, Zap,
  Check, BarChart3, RefreshCw, LogOut, User, Shield, ImagePlus,
} from "lucide-react";
import { LiveOrders } from "@/components/Dashboard/LiveOrders";
import {
  fetchInventory, fetchAnalytics, updateInventoryItem, uploadProductImage,
  type InventoryItem, type AnalyticsSummary,
} from "@/services/api";
import { DEMO_MODE, DEMO_ANALYTICS } from "@/config/demo";
import { cloudinaryOptimize } from "@/components/ProductImage";
import { AmbientBackground } from "@/components/AmbientBackground";
import { LoginModal }        from "@/components/Auth/LoginModal";
import { useAuth }           from "@/contexts/AuthContext";
import { canAccessDashboard } from "@/services/auth";

type CategoryFilter = "all" | "cigar" | "alcohol";

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [filter,    setFilter]    = useState<CategoryFilter>("all");
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState<Record<string, boolean>>({});
  const [saved,     setSaved]     = useState<Record<string, boolean>>({});
  const [error,     setError]     = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const authorized = user && canAccessDashboard(user.role);

  const load = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    setError(null);
    try {
      // In demo mode, use rich sample analytics so the dashboard always looks impressive.
      // Inventory is still fetched live so real product data (boosts, images) shows through.
      const [inv, ana] = await Promise.all([
        fetchInventory().catch(() => [] as InventoryItem[]),
        DEMO_MODE
          ? Promise.resolve(DEMO_ANALYTICS as AnalyticsSummary)
          : fetchAnalytics(),
      ]);
      setInventory(inv);
      setAnalytics(ana);
    } catch (e) {
      if (DEMO_MODE) {
        // Never show errors in demo mode — fall back to demo analytics
        setAnalytics(DEMO_ANALYTICS as AnalyticsSummary);
      } else {
        setError(e instanceof Error ? e.message : "Could not load data");
      }
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => { load(); }, [load]);

  const handleBoostChange = async (item: InventoryItem, boostLevel: number) => {
    setInventory((prev) => prev.map((p) => p.id === item.id ? { ...p, boostLevel } : p));
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      await updateInventoryItem(item.id, { boostLevel });
      setSaved((s) => ({ ...s, [item.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [item.id]: false })), 1800);
    } catch { load(); }
    setSaving((s) => ({ ...s, [item.id]: false }));
  };

  const handleSponsoredChange = async (item: InventoryItem, sponsored: boolean) => {
    setInventory((prev) => prev.map((p) => p.id === item.id ? { ...p, sponsored } : p));
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      await updateInventoryItem(item.id, { sponsored });
      setSaved((s) => ({ ...s, [item.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [item.id]: false })), 1800);
    } catch { load(); }
    setSaving((s) => ({ ...s, [item.id]: false }));
  };

  const handleImageUpload = async (item: InventoryItem, file: File) => {
    setSaving((s) => ({ ...s, [item.id]: true }));
    try {
      const url = await uploadProductImage(file);
      await updateInventoryItem(item.id, { imageUrl: url });
      setInventory((prev) => prev.map((p) => p.id === item.id ? { ...p, imageUrl: url } : p));
      setSaved((s) => ({ ...s, [item.id]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [item.id]: false })), 1800);
    } catch {
      // Non-critical — silently fail, image stays unchanged
    }
    setSaving((s) => ({ ...s, [item.id]: false }));
  };

  const filtered = inventory.filter((p) => filter === "all" || p.category === filter);
  const stats    = analytics?.summary;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col relative" style={{ background: "hsl(22 18% 4%)" }}>
      <AmbientBackground />

      <AnimatePresence>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </AnimatePresence>

      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <motion.div className="flex items-center gap-3 mb-1"
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <a href="/" className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors duration-200"
                style={{ color: "rgba(180,155,100,0.45)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.75)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,155,100,0.45)")}>
                <ArrowLeft size={11} />SmokeCraft
              </a>
            </motion.div>
            <motion.h1 className="font-serif text-3xl" style={{ fontWeight: 300, color: "rgba(230,210,175,0.9)" }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
              Partner Dashboard
            </motion.h1>
            <motion.p className="text-[10px] uppercase tracking-[0.3em] mt-1" style={{ color: "rgba(212,175,55,0.4)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              Product Visibility & Analytics
            </motion.p>
          </div>

          <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
                  <User size={12} style={{ color: "rgba(212,175,55,0.55)" }} />
                  <span className="text-[10px]" style={{ color: "rgba(210,185,140,0.7)" }}>{user.name}</span>
                  <span className="text-[8px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(212,175,55,0.1)", color: "rgba(212,175,55,0.6)" }}>
                    {user.role.replace("_", " ")}
                  </span>
                </div>
                <motion.button onClick={load}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs uppercase tracking-[0.15em] transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.5)" }}
                  whileHover={{ borderColor: "rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.7)" }}
                  whileTap={{ scale: 0.97 }}>
                  <RefreshCw size={12} />
                </motion.button>
                <motion.button onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(180,155,100,0.4)" }}
                  whileHover={{ borderColor: "rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.6)" }}
                  whileTap={{ scale: 0.97 }}>
                  <LogOut size={12} />
                </motion.button>
              </>
            ) : (
              <motion.button onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em]"
                style={{
                  background: "linear-gradient(135deg, rgba(180,130,30,0.2), rgba(212,175,55,0.1))",
                  border: "1px solid rgba(212,175,55,0.3)", color: "rgba(212,175,55,0.8)",
                }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Shield size={12} />Sign In
              </motion.button>
            )}
          </motion.div>
        </div>

        <div className="mb-10 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)" }} />

        {/* Auth loading */}
        {authLoading && (
          <div className="flex-1 flex items-center justify-center">
            <motion.div className="w-8 h-8 rounded-full border-2" animate={{ rotate: 360 }}
              style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          </div>
        )}

        {/* Not authenticated */}
        {!authLoading && !user && (
          <motion.div className="flex-1 flex flex-col items-center justify-center gap-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center p-10 rounded-2xl max-w-md"
              style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}>
              <Shield size={32} className="mx-auto mb-4" style={{ color: "rgba(212,175,55,0.4)" }} />
              <h3 className="font-serif text-xl mb-2" style={{ color: "rgba(220,200,165,0.8)", fontWeight: 300 }}>
                Restricted Area
              </h3>
              <p className="text-sm mb-6" style={{ color: "rgba(180,155,100,0.5)" }}>
                Sign in with a partner account to access product visibility controls and analytics.
              </p>
              <motion.button onClick={() => setShowLogin(true)}
                className="px-6 py-3 rounded-xl text-sm uppercase tracking-[0.15em]"
                style={{ background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "hsl(22 18% 6%)" }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <span className="flex items-center gap-2"><Shield size={13} />Sign In to Dashboard</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Wrong role */}
        {!authLoading && user && !authorized && (
          <motion.div className="flex-1 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center p-8 rounded-xl max-w-sm"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="font-serif text-lg mb-2" style={{ color: "rgba(230,180,180,0.8)", fontWeight: 300 }}>Access Denied</p>
              <p className="text-sm" style={{ color: "rgba(239,68,68,0.6)" }}>
                Your role ({user.role.replace("_", " ")}) does not have dashboard access.
              </p>
            </div>
          </motion.div>
        )}

        {/* Dashboard content */}
        {!authLoading && authorized && (
          loading ? (
            <div className="flex-1 flex items-center justify-center">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.div className="w-10 h-10 rounded-full mx-auto mb-4 border-2"
                  style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "rgba(212,175,55,0.8)" }}
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                <p className="text-[10px] uppercase tracking-[0.25em] text-center" style={{ color: "rgba(180,155,100,0.4)" }}>Loading…</p>
              </motion.div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-8 rounded-xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-sm" style={{ color: "rgba(239,68,68,0.8)" }}>{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-10">

              {/* Stats */}
              {stats && (
                <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-4"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                  <StatCard icon={<Package size={16} />}    label="Total Products"         value={stats.totalProducts}        />
                  <StatCard icon={<Zap size={16} />}        label="Boosted"                value={stats.boostedProducts}      accent />
                  <StatCard icon={<Sparkles size={16} />}   label="Sponsored"              value={stats.sponsoredProducts}    gold />
                  <StatCard icon={<BarChart3 size={16} />}  label="Total Impressions"      value={stats.totalImpressions}     />
                  <StatCard icon={<TrendingUp size={16} />} label="Sponsored Impressions"  value={stats.sponsoredImpressions} gold />
                  <StatCard icon={<TrendingUp size={16} />} label="Featured Impressions"   value={stats.featuredImpressions}  accent />
                </motion.div>
              )}

              {/* Live Orders */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="rounded-xl p-6" style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.12)" }}>
                  <LiveOrders />
                </div>
              </motion.div>

              {/* Product Controls */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>Product Visibility</h2>
                    <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
                      Adjust boost, sponsored placement, and product images
                    </p>
                  </div>
                  <div className="flex rounded-full p-0.5 gap-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {(["all", "cigar", "alcohol"] as CategoryFilter[]).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className="px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] rounded-full transition-all duration-200"
                        style={filter === f
                          ? { background: "rgba(212,175,55,0.15)", color: "rgba(212,175,55,0.85)", border: "1px solid rgba(212,175,55,0.3)" }
                          : { color: "rgba(180,155,100,0.5)" }
                        }>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((item, i) => (
                      <motion.div key={item.id} layout
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ delay: i * 0.04 }}>
                        <ProductRow
                          item={item}
                          isSaving={saving[item.id] ?? false}
                          justSaved={saved[item.id] ?? false}
                          onBoostChange={(lvl) => handleBoostChange(item, lvl)}
                          onSponsoredChange={(s) => handleSponsoredChange(item, s)}
                          onImageUpload={(file) => handleImageUpload(item, file)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Analytics */}
              {analytics && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <div className="mb-6">
                    <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>Performance Analytics</h2>
                    <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>Persistent across server restarts</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[9px] uppercase tracking-[0.22em] mb-4" style={{ color: "rgba(180,155,100,0.45)" }}>Top Impressions</p>
                      {analytics.topPerformers.length === 0
                        ? <p className="text-xs italic" style={{ color: "rgba(180,155,100,0.3)" }}>No impressions yet — run some recommendations</p>
                        : <div className="space-y-3">{analytics.topPerformers.map((p) => (
                            <ImpressionBar key={p.id} item={p} max={analytics.topPerformers[0]?.impressions || 1} />
                          ))}</div>
                      }
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}>
                      <p className="text-[9px] uppercase tracking-[0.22em] mb-4 flex items-center gap-2" style={{ color: "rgba(212,175,55,0.55)" }}>
                        <Sparkles size={9} />Sponsored Performance
                      </p>
                      {analytics.sponsored.length === 0
                        ? <p className="text-xs italic" style={{ color: "rgba(180,155,100,0.35)" }}>No sponsored products yet</p>
                        : <div className="space-y-3">{analytics.sponsored.map((p) => (
                            <ImpressionBar key={p.id} item={p} max={Math.max(...analytics.sponsored.map((s) => s.impressions), 1)} gold />
                          ))}</div>
                      }
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent, gold }: {
  icon: React.ReactNode; label: string; value: number; accent?: boolean; gold?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl flex items-center gap-3"
      style={{
        background: gold ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.025)",
        border: gold ? "1px solid rgba(212,175,55,0.18)" : accent ? "1px solid rgba(212,175,55,0.1)" : "1px solid rgba(255,255,255,0.06)",
      }}>
      <div style={{ color: gold ? "rgba(212,175,55,0.7)" : "rgba(180,155,100,0.5)" }}>{icon}</div>
      <div>
        <p className="text-xl font-serif" style={{ color: gold ? "rgba(230,210,175,0.9)" : "rgba(210,190,155,0.8)", fontWeight: 300 }}>{value}</p>
        <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.4)" }}>{label}</p>
      </div>
    </div>
  );
}

function ProductRow({ item, isSaving, justSaved, onBoostChange, onSponsoredChange, onImageUpload }: {
  item: InventoryItem;
  isSaving: boolean;
  justSaved: boolean;
  onBoostChange: (l: number) => void;
  onSponsoredChange: (s: boolean) => void;
  onImageUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbUrl = item.imageUrl
    ? cloudinaryOptimize(item.imageUrl, 96, 96)
    : null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl"
      style={{
        background: item.sponsored ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.025)",
        border:     item.sponsored ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(255,255,255,0.06)",
      }}>

      {/* Image thumbnail + upload trigger */}
      <div className="relative flex-shrink-0 group/img" style={{ width: 52, height: 52 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); e.target.value = ""; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isSaving}
          className="w-full h-full rounded-lg overflow-hidden relative"
          style={{
            background: thumbUrl ? "transparent" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          title="Upload product image"
        >
          {thumbUrl ? (
            <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={16} className="absolute inset-0 m-auto" style={{ color: "rgba(212,175,55,0.3)" }} />
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 rounded-lg"
            style={{ background: "rgba(10,6,2,0.65)" }}>
            <ImagePlus size={14} style={{ color: "rgba(212,175,55,0.85)" }} />
          </div>
        </button>
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-serif text-sm truncate" style={{ color: "rgba(220,200,165,0.85)" }}>{item.name}</p>
          {item.sponsored && (
            <span className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.75)" }}>
              <Sparkles size={7} />Sponsored
            </span>
          )}
          {item.imageUrl && (
            <span className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "rgba(100,200,120,0.08)", border: "1px solid rgba(100,200,120,0.2)", color: "rgba(100,200,120,0.6)" }}>
              ✓ Image
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "rgba(180,155,100,0.4)" }}>{item.category}</span>
          <span style={{ color: "rgba(180,155,100,0.2)" }}>·</span>
          <span className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "rgba(180,155,100,0.4)" }}>{item.tier}</span>
          {item.impressions > 0 && (
            <><span style={{ color: "rgba(180,155,100,0.2)" }}>·</span>
            <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.38)" }}>{item.impressions} impressions</span></>
          )}
        </div>
      </div>

      {/* Boost selector */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.35)" }}>Boost</p>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((lvl) => (
            <button key={lvl} onClick={() => onBoostChange(lvl)}
              className="w-7 h-7 rounded text-xs font-medium transition-all duration-200"
              style={item.boostLevel === lvl
                ? { background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.5)", color: "rgba(212,175,55,0.9)" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(180,155,100,0.45)" }
              }>{lvl}</button>
          ))}
        </div>
      </div>

      {/* Sponsored toggle */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.35)" }}>Sponsored</p>
        <button onClick={() => onSponsoredChange(!item.sponsored)}
          className="relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0"
          style={{ background: item.sponsored ? "linear-gradient(90deg, hsl(43 75% 42%), hsl(45 85% 52%))" : "rgba(255,255,255,0.08)" }}>
          <motion.div className="absolute top-0.5 w-4 h-4 rounded-full"
            style={{ background: item.sponsored ? "hsl(22 18% 6%)" : "rgba(180,155,100,0.5)" }}
            animate={{ left: item.sponsored ? "calc(100% - 18px)" : "2px" }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          />
        </button>
      </div>

      {/* Save indicator */}
      <div className="w-5 flex-shrink-0">
        <AnimatePresence>
          {justSaved && !isSaving && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check size={14} style={{ color: "rgba(100,200,120,0.8)" }} />
            </motion.div>
          )}
          {isSaving && (
            <motion.div className="w-3.5 h-3.5 rounded-full border"
              style={{ borderColor: "rgba(212,175,55,0.4)", borderTopColor: "transparent" }}
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ImpressionBar({ item, max, gold }: { item: InventoryItem; max: number; gold?: boolean }) {
  const pct = max > 0 ? (item.impressions / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-serif truncate w-32 flex-shrink-0" style={{ color: "rgba(210,190,155,0.7)" }}>{item.name}</p>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: gold ? "linear-gradient(90deg, hsl(36 70% 40%), hsl(43 85% 52%))" : "rgba(180,155,100,0.4)" }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }} />
      </div>
      <span className="text-[9px] tabular-nums w-6 text-right flex-shrink-0" style={{ color: "rgba(180,155,100,0.45)" }}>{item.impressions}</span>
    </div>
  );
}
