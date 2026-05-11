/**
 * EEIE Product Wall
 * Luxury visual selling layer — real product images from backend.
 * Filter, sort, add-to-cart, show-to-guest, manager picks, AI recs.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Eye, Star, Zap, RefreshCw, Filter,
  Leaf, Coffee, Utensils, TrendingUp, Package,
} from "lucide-react";
import { type Theme, Badge, Meter, Panel, DonutRing, triggerHaptic } from "./shared";
import "@/styles/eeie-motion.css";

// ── Types ─────────────────────────────────────────────────────

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

interface Product {
  id: string; name: string; brand: string; category: string;
  price: number; matchScore: number; stock: StockStatus;
  flavorTags: string[]; pairingTags: string[];
  isAIRec: boolean; isManagerPick: boolean;
  image: string; imageColor: string;
  description: string; strength: string;
}

type SortKey = "match" | "price_asc" | "price_desc" | "name";

// ── Auth fetch ────────────────────────────────────────────────

function getToken() { return localStorage.getItem("SOVEREIGN_SESSION") ?? ""; }

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(path, { credentials: "include", headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

async function apiPost<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const r = await fetch(path, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return null;
    return r.json() as Promise<T>;
  } catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────

function stockBadge(stock: StockStatus, T: Theme) {
  return {
    in_stock:    { label: "In Stock",    color: T.green },
    low_stock:   { label: "Low Stock",   color: T.yellow },
    out_of_stock:{ label: "Out of Stock", color: T.red },
  }[stock];
}

function categoryIcon(cat: string, color: string) {
  if (cat === "Cigar")   return <Leaf size={14} color={color} />;
  if (cat.includes("Food") || cat.includes("Dessert")) return <Utensils size={14} color={color} />;
  return <Coffee size={14} color={color} />;
}

const CATEGORIES = ["all", "Cigar", "Bourbon", "Scotch", "Cognac", "Food", "Dessert"];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "match",      label: "Best Match" },
  { key: "price_desc", label: "Price: High" },
  { key: "price_asc",  label: "Price: Low"  },
  { key: "name",       label: "Name"        },
];

interface CartItem { productId: string; name: string; price: number; qty: number; }

interface Props { T: Theme; }

export function ProductWallTab({ T }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [catFilter, setCat]     = useState("all");
  const [sort, setSort]         = useState<SortKey>("match");
  const [stockFilter, setStock] = useState("all");
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [focusProduct, setFocus] = useState<Product | null>(null);
  const [log, setLog]           = useState<string[]>([]);

  function addLog(msg: string) { setLog(prev => [msg, ...prev].slice(0, 15)); }

  function showToast(msg: string, ok = true) {
    triggerHaptic(ok ? "success" : "warning");
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ products: Product[] }>("/api/eeie/products");
    if (res) setProducts(res.products);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function addToCart(p: Product) {
    if (p.stock === "out_of_stock") { showToast(`${p.name} is out of stock`, false); return; }
    setCart(prev => {
      const ex = prev.find(c => c.productId === p.id);
      if (ex) return prev.map(c => c.productId === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { productId: p.id, name: p.name, price: p.price, qty: 1 }];
    });
    addLog(`+ Added ${p.name} to order cart`);
    showToast(`${p.name} added`);
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.productId !== productId));
  }

  function showToGuest(p: Product) {
    addLog(`👁 Shown to guest: ${p.name}`);
    showToast(`${p.name} shown to guest`);
  }

  async function sendToPOS() {
    if (cart.length === 0) { showToast("Cart is empty", false); return; }
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    addLog(`✓ ${cart.length} item(s) — $${total} sent to POS`);
    showToast(`${cart.length} item(s) sent to Commerce`);
    setCart([]);
    // Also call the API if authenticated
    await apiPost("/api/eeie/staff/sessions/s1/send-pos");
  }

  // Filter + sort
  let filtered = products;
  if (catFilter !== "all") filtered = filtered.filter(p => p.category === catFilter);
  if (stockFilter !== "all") filtered = filtered.filter(p => p.stock === stockFilter);
  filtered = [...filtered].sort((a, b) => {
    if (sort === "match")      return b.matchScore - a.matchScore;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "price_asc")  return a.price - b.price;
    return a.name.localeCompare(b.name);
  });

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const aiRecs = products.filter(p => p.isAIRec);
  const managerPicks = products.filter(p => p.isManagerPick);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Header KPIs ── */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { l: "PRODUCTS",     v: String(products.length),  c: T.text },
          { l: "AI RECS",      v: String(aiRecs.length),    c: T.purple },
          { l: "MGR PICKS",    v: String(managerPicks.length), c: T.yellow },
          { l: "LOW STOCK",    v: String(products.filter(p => p.stock === "low_stock").length), c: T.yellow },
          { l: "CART ITEMS",   v: String(cart.reduce((s, c) => s + c.qty, 0)), c: T.accent },
          { l: "CART TOTAL",   v: `$${cartTotal}`, c: T.green },
        ].map(m => (
          <div key={m.l} style={{ flex: 1, padding: "13px 14px", borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
            <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.16em", marginBottom: 4 }}>{m.l}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: m.c }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* ── Controls + Product grid ── */}
      <Panel title="Visual Product Wall" subtitle="Luxury selling layer · Tap to act on any product" icon={<Package size={14} />} T={T} accentColor={T.accent}>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" as const, alignItems: "center" }}>
          <Filter size={12} color={T.textFaint} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
            {CATEGORIES.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.94 }} onClick={() => setCat(cat)}
                style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${catFilter === cat ? T.accent : T.border}`, background: catFilter === cat ? `${T.accent}14` : "transparent", color: catFilter === cat ? T.accent : T.textSub, cursor: "pointer", fontSize: 9, fontFamily: T.mono }}>
                {cat.toUpperCase()}
              </motion.button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
            {SORT_OPTIONS.map(s => (
              <motion.button key={s.key} whileTap={{ scale: 0.94 }} onClick={() => setSort(s.key)}
                style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${sort === s.key ? T.borderHi : T.border}`, background: sort === s.key ? `${T.accent}10` : "transparent", color: sort === s.key ? T.accent : T.textSub, cursor: "pointer", fontSize: 8.5, fontFamily: T.mono }}>
                {s.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stock filter pills */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {[
            { k: "all",          l: "All Stock",    c: T.textSub },
            { k: "in_stock",     l: "In Stock",     c: T.green   },
            { k: "low_stock",    l: "Low Stock",    c: T.yellow  },
            { k: "out_of_stock", l: "Out of Stock", c: T.red     },
          ].map(s => (
            <motion.button key={s.k} whileTap={{ scale: 0.94 }} onClick={() => setStock(s.k)}
              style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${stockFilter === s.k ? s.c : T.border}`, background: stockFilter === s.k ? `${s.c}12` : "transparent", color: stockFilter === s.k ? s.c : T.textSub, cursor: "pointer", fontSize: 8.5, fontFamily: T.mono }}>
              {s.l}
            </motion.button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" as const, color: T.textFaint }}>
            <RefreshCw size={22} color={T.accent} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 12 }}>Loading product catalog…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" as const }}>
            <Package size={40} color={T.textFaint} style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSub, marginBottom: 6 }}>No products match this filter</div>
            <div style={{ fontSize: 11, color: T.textFaint }}>Try a different category or stock filter.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 13 }}>
            {filtered.map((p, i) => {
              const sb = stockBadge(p.stock, T);
              const inCart = cart.find(c => c.productId === p.id);
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ boxShadow: `0 8px 32px ${p.imageColor}22` }}
                  className="eeie-module-card eeie-hover-lift"
                  style={{ borderRadius: 16, border: `1px solid ${inCart ? `${T.green}40` : T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
                >
                  {/* Real product image */}
                  <div style={{ height: 120, position: "relative", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => setFocus(p)}>
                    <img
                      src={p.image} alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s" }}
                      onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = "scale(1.06)"; }}
                      onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = "scale(1)"; }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = "none";
                        const parent = img.parentElement!;
                        parent.style.background = `${p.imageColor}12`;
                        parent.style.display = "flex";
                        parent.style.alignItems = "center";
                        parent.style.justifyContent = "center";
                      }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />

                    {/* Badges */}
                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                      {p.isAIRec && <Badge label="AI" color={T.purple} bg={`${T.purple}28`} />}
                      {p.isManagerPick && <Badge label="PICK" color={T.yellow} bg={`${T.yellow}28`} />}
                    </div>
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <Badge label={sb.label} color={sb.color} bg={`${sb.color}28`} />
                    </div>

                    {/* Category icon */}
                    <div style={{ position: "absolute", bottom: 8, left: 8 }}>
                      {categoryIcon(p.category, "rgba(255,255,255,0.8)")}
                    </div>

                    {/* Cart indicator */}
                    {inCart && (
                      <div style={{ position: "absolute", bottom: 8, right: 8, background: T.green, color: "#fff", borderRadius: 999, padding: "2px 7px", fontSize: 8.5, fontWeight: 800 }}>
                        {inCart.qty}×
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "12px 13px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: T.textSub, marginBottom: 8 }}>{p.brand} · {p.category} · {p.strength}</div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: T.text }}>${p.price}</span>
                      <DonutRing pct={p.matchScore} color={T.green} size={42} label={`${p.matchScore}%`} />
                    </div>

                    <Meter pct={p.matchScore} color={T.green} height={4} />

                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3, marginTop: 7, marginBottom: 10 }}>
                      {p.flavorTags.slice(0, 3).map(tag => <Badge key={tag} label={tag} color={T.accent} bg={`${T.accent}0A`} />)}
                    </div>

                    <div style={{ display: "flex", gap: 5 }}>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => showToGuest(p)}
                        style={{ padding: "9px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 9, width: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Eye size={11} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.92 }}
                        disabled={p.stock === "out_of_stock"}
                        onClick={() => addToCart(p)}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", background: p.stock === "out_of_stock" ? T.border : inCart ? T.green : T.accent, color: "#fff", cursor: p.stock === "out_of_stock" ? "not-allowed" : "pointer", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, opacity: p.stock === "out_of_stock" ? 0.4 : 1 }}>
                        <ShoppingCart size={11} /> {inCart ? `${inCart.qty} Added` : "Add"}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Live Cart ── */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <Panel title={`Active Cart · ${cart.reduce((s, c) => s + c.qty, 0)} item(s) · $${cartTotal}`}
              icon={<ShoppingCart size={14} />} T={T} accentColor={T.green} badge="READY TO SEND">
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {cart.map(item => (
                  <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", borderRadius: 10, background: `${T.green}06`, border: `1px solid ${T.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: T.textSub }}>Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.green }}>${item.price * item.qty}</div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(item.productId)}
                      style={{ padding: "5px 7px", borderRadius: 7, border: `1px solid ${T.red}25`, background: `${T.red}08`, color: T.red, cursor: "pointer", fontSize: 9 }}>
                      ✕
                    </motion.button>
                  </div>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => void sendToPOS()}
                className="eeie-active-breathe"
                style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 20px ${T.green}40` }}>
                <ShoppingCart size={15} /> Send ${cartTotal} to Commerce Infrastructure
              </motion.button>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Activity Log ── */}
      {log.length > 0 && (
        <Panel title="Session Activity Log" subtitle="Actions this session" icon={<TrendingUp size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {log.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", borderRadius: 7, background: i === 0 ? `${T.accent}06` : "transparent" }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: i === 0 ? T.accent : T.textFaint, flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 9.5, color: T.textSub }}>{entry}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Product Focus Lightbox ── */}
      <AnimatePresence>
        {focusProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFocus(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ scale: 0.88, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88 }}
              onClick={e => e.stopPropagation()}
              style={{ borderRadius: 20, overflow: "hidden", background: T.card, border: `1px solid ${T.border}`, maxWidth: 440, width: "90%" }}>
              <div style={{ height: 220, position: "relative" }}>
                <img src={focusProduct.image} alt={focusProduct.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 16, left: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{focusProduct.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{focusProduct.brand} · {focusProduct.category}</div>
                </div>
              </div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: 14 }}>{focusProduct.description}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 14 }}>
                  {focusProduct.flavorTags.map(t => <Badge key={t} label={t} color={T.accent} bg={`${T.accent}10`} />)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => { showToGuest(focusProduct); setFocus(null); }}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Eye size={13} /> Show Guest
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.93 }}
                    disabled={focusProduct.stock === "out_of_stock"}
                    onClick={() => { addToCart(focusProduct); setFocus(null); }}
                    style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none", background: focusProduct.stock === "out_of_stock" ? T.border : T.accent, color: "#fff", cursor: focusProduct.stock === "out_of_stock" ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: focusProduct.stock === "out_of_stock" ? 0.4 : 1 }}>
                    <ShoppingCart size={13} /> Add ${focusProduct.price} to Cart
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: toast.ok ? T.accent : T.yellow, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${toast.ok ? T.accent : T.yellow}50` }}>
            {toast.ok ? "✓" : "⚠"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
