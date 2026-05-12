/**
 * EEIE Staff Cockpit — Guest management, AI recommendations, rotating brand carousel.
 * Cigar brands rotate every 5 s · Liquor brands rotate every 6.5 s.
 * AnimatePresence crossfade on every image transition.
 * Touch-first: 56 px+ button targets throughout.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, Coffee, Utensils, ShoppingCart, Users, Eye, Star,
  Send, ClipboardList, Bell, BookOpen, ChevronRight, Pause, Play,
} from "lucide-react";
import "@/styles/eeie-motion.css";
import {
  type Theme, type GuestSession, type CartItem,
  Badge, Meter, Panel, TouchButton, RadarChart, DonutRing, LiveDot,
  MOCK_SESSIONS, TIER_C, STATUS_COLOR, triggerHaptic,
} from "./shared";

const FLAVOR_LABELS = ["Creamy","Sweet","Nutty","Earthy","Spicy","Woody","Pepper","Citrus"];

interface FoodItem {
  name: string; category: string; price: number;
  pairing: string; prepTime: string; image: string;
}
const FOOD_ITEMS: Record<string, FoodItem> = {
  Creamy:  { name: "Smoked Short Rib Sliders",  category: "Small Plates", price: 18, pairing: "Deepens oak, cocoa, and charred-sweet finish in the blend.", prepTime: "12 min", image: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=600&q=80" },
  Sweet:   { name: "Vanilla Crème Brûlée",       category: "Dessert",      price: 14, pairing: "Amplifies the vanilla and caramel notes, softens the finish.", prepTime: "5 min",  image: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80" },
  Spicy:   { name: "Truffle Charcuterie Board",  category: "Boards",       price: 28, pairing: "Earthy umami grounds the spice and leather notes beautifully.", prepTime: "8 min",  image: "https://images.unsplash.com/photo-1546039907-7fa05f864c02?auto=format&fit=crop&w=600&q=80" },
  default: { name: "Aged Cheese Flight",          category: "Boards",       price: 22, pairing: "Neutral creamy base bridges any flavor profile gracefully.", prepTime: "6 min",  image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80" },
};
function getFoodRec(flavors: string[]): FoodItem {
  for (const f of flavors) if (FOOD_ITEMS[f]) return FOOD_ITEMS[f];
  return FOOD_ITEMS.default;
}

interface CatalogProduct {
  id: string; name: string; brand: string; category: string;
  price: number; matchScore: number; flavorTags: string[];
  description: string; strength: string; image: string;
}

function timeSince(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : `${m}m`;
}

function RotDots({ count, current, color }: { count: number; current: number; color: string }) {
  if (count < 2) return null;
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 14 : 5, height: 5, borderRadius: 3,
          background: i === current ? color : `${color}35`,
          transition: "width 0.35s ease, background 0.35s ease",
        }} />
      ))}
    </div>
  );
}

interface ProductCardProps {
  title: string;
  icon: React.ReactNode;
  badge: string;
  accentColor: string;
  T: Theme;
  product: CatalogProduct | null;
  rotIdx: number;
  totalCount: number;
  onAdd: () => void;
  onShow: () => void;
  fallbackIcon: React.ReactNode;
  priceLabel?: string;
}

function RotatingProductCard({
  title, icon, badge, accentColor, T,
  product, rotIdx, totalCount,
  onAdd, onShow, fallbackIcon, priceLabel,
}: ProductCardProps) {
  const c = accentColor;
  return (
    <Panel title={title} icon={icon} badge={badge} T={T} accentColor={c}>
      <div style={{ padding: "10px", borderRadius: 12, background: `${c}06`, border: `1px solid ${c}18` }}>
        <div
          className="eeie-image-shimmer"
          style={{ height: 168, borderRadius: 10, overflow: "hidden", marginBottom: 10, position: "relative", background: `${c}12` }}
        >
          <AnimatePresence mode="wait">
            {product ? (
              <motion.img
                key={product.name}
                src={product.image}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <motion.div
                key="fallback"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {fallbackIcon}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 52%)", pointerEvents: "none", zIndex: 2 }} />

          {product && (
            <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, zIndex: 3 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{product.name}</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>{product.brand} · {priceLabel ?? product.strength}</div>
            </div>
          )}

          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.48)", borderRadius: 20, padding: "3px 8px", backdropFilter: "blur(6px)" }}>
            <div className="eeie-status-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 7, color: c, fontWeight: 700, letterSpacing: "0.14em" }}>LIVE</span>
          </div>
        </div>

        <RotDots count={totalCount} current={rotIdx} color={c} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          {product && <DonutRing pct={product.matchScore} color={c} size={46} label={`${product.matchScore}%`} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 5 }}>
              {(product?.flavorTags ?? []).map(f => <Badge key={f} label={f} color={c} bg={`${c}0E`} />)}
            </div>
            <div style={{ fontSize: 9, color: T.textSub, lineHeight: 1.55 }}>
              {product?.description ? `${product.description.slice(0, 70)}…` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <motion.button
            whileTap={{ scale: 0.94 }} className="eeie-button-press"
            onClick={onAdd} disabled={!product}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: c, color: "#fff", cursor: product ? "pointer" : "not-allowed", fontSize: 10, fontWeight: 700, boxShadow: `0 4px 14px ${c}38`, opacity: product ? 1 : 0.4 }}
          >
            + Add {product ? `$${product.price}` : ""}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onShow}
            style={{ padding: "11px 13px", borderRadius: 10, border: `1px solid ${c}30`, background: `${c}0C`, color: c, cursor: "pointer" }}
          >
            <Eye size={13} />
          </motion.button>
        </div>
      </div>
    </Panel>
  );
}

interface Props { T: Theme; }

export function StaffCockpit({ T }: Props) {
  const [sessions, setSessions] = useState<GuestSession[]>(MOCK_SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_SESSIONS[0].id);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showGuestPreview, setShowGuestPreview] = useState(false);

  const [cigarProducts, setCigarProducts] = useState<CatalogProduct[]>([]);
  const [liquorProducts, setLiquorProducts] = useState<CatalogProduct[]>([]);
  const [cigarIdx, setCigarIdx] = useState(0);
  const [liquorIdx, setLiquorIdx] = useState(0);

  useEffect(() => {
    fetch("/api/eeie/products", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { products: CatalogProduct[] } | null) => {
        if (!data?.products) return;
        setCigarProducts(data.products.filter(p => p.category === "Cigar"));
        setLiquorProducts(data.products.filter(p =>
          ["Bourbon","Scotch","Cognac","Spirit","Whiskey"].includes(p.category)
        ));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cigarProducts.length < 2) return;
    const t = setInterval(() => setCigarIdx(i => (i + 1) % cigarProducts.length), 5000);
    return () => clearInterval(t);
  }, [cigarProducts.length]);

  useEffect(() => {
    if (liquorProducts.length < 2) return;
    const t = setInterval(() => setLiquorIdx(i => (i + 1) % liquorProducts.length), 6500);
    return () => clearInterval(t);
  }, [liquorProducts.length]);

  const rotCigar  = cigarProducts.length  > 0 ? cigarProducts[cigarIdx   % cigarProducts.length]  : null;
  const rotLiquor = liquorProducts.length > 0 ? liquorProducts[liquorIdx  % liquorProducts.length] : null;

  const selected  = sessions.find(s => s.id === selectedId) ?? null;
  const foodRec   = selected ? getFoodRec(selected.flavors) : FOOD_ITEMS.default;

  function showToast(msg: string) {
    triggerHaptic("success");
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }
  function togglePause(id: string) {
    triggerHaptic("softTap");
    setSessions(p => p.map(s => s.id === id ? { ...s, status: s.status === "paused" ? "active" : "paused" } : s));
  }
  function addToCart(session: GuestSession, item: CartItem) {
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [...s.cart, item] } : s));
    showToast(`${item.name} added to order`);
  }
  function removeFromCart(sessionId: string, idx: number) {
    setSessions(p => p.map(s => s.id === sessionId ? { ...s, cart: s.cart.filter((_, i) => i !== idx) } : s));
  }
  function sendToPOS(session: GuestSession) {
    if (session.cart.length === 0) return;
    showToast(`${session.cart.length} item(s) sent to Commerce Infrastructure`);
    setSessions(p => p.map(s => s.id === session.id ? { ...s, cart: [] } : s));
    triggerHaptic("managerAlert");
  }
  function applyReward(session: GuestSession) {
    showToast(`Loyalty reward applied for ${session.guestName}`);
    triggerHaptic("success");
  }

  const moodTagColor = (tag: string) => ({
    Premium: T.accent, "High Energy": T.cyan, Social: T.green,
    "VIP Active": T.purple, Calm: "#38BDF8", Slow: "#C084FC",
  }[tag] ?? T.accent);

  return (
    <div style={{ display: "flex", gap: 16, height: "100%", padding: "16px 20px" }}>

      {/* ── LEFT: Table List ── */}
      <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.22em", color: T.textFaint, fontFamily: T.mono, marginBottom: 6 }}>
          ACTIVE TABLES
        </div>
        {sessions.map(s => {
          const sc = STATUS_COLOR(s.status, T);
          const isSel = selectedId === s.id;
          return (
            <motion.div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              className={`eeie-hover-lift${isSel ? " eeie-live-card" : ""}`}
              style={{
                background: isSel ? `${T.accent}0E` : T.card,
                border: `1px solid ${isSel ? T.borderHi : T.border}`,
                borderLeft: `3px solid ${sc}`,
                borderRadius: 12, padding: "11px 13px", cursor: "pointer",
                boxShadow: isSel ? `0 0 0 2px ${T.accent}22` : T.shadow,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.textFaint, fontFamily: T.mono }}>{s.table.toUpperCase()}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {s.cart.length > 0 && (
                    <div style={{ background: T.accent, color: "#fff", borderRadius: 999, fontSize: 8, fontWeight: 800, padding: "1px 5px" }}>{s.cart.length}</div>
                  )}
                  <LiveDot color={sc} size={6} />
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{s.guestName}</div>
              <div style={{ fontSize: 9, color: T.textSub, marginTop: 3, display: "flex", gap: 8 }}>
                <span>{timeSince(s.startedAt)}</span>
                <span>{s.loyaltyTier}</span>
              </div>
              {s.status === "attention" && (
                <div style={{ marginTop: 5, fontSize: 8.5, color: T.yellow, fontWeight: 700, fontFamily: T.mono }}>⚠ NEEDS ATTENTION</div>
              )}
              {s.status === "paused" && (
                <div style={{ marginTop: 5, fontSize: 8.5, color: T.accent, fontFamily: T.mono }}>⏸ EXPERIENCE PAUSED</div>
              )}
            </motion.div>
          );
        })}

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.16em", color: T.textFaint, fontFamily: T.mono, marginBottom: 6 }}>KIOSK MODE</div>
          {["Staff Assist","Guest View","Manager Control","Kiosk Lock"].map(mode => (
            <motion.button key={mode} whileTap={{ scale: 0.95 }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8, border: "none", background: mode === "Staff Assist" ? `${T.accent}12` : "transparent", color: mode === "Staff Assist" ? T.accent : T.textSub, cursor: "pointer", fontSize: 10, fontWeight: mode === "Staff Assist" ? 700 : 400, marginBottom: 2, textAlign: "left" as const }}>
              <ChevronRight size={10} />
              {mode}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── CENTER: Guest Detail ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {!selected ? (
          <div style={{ color: T.textSub, textAlign: "center", padding: "80px 0", fontSize: 13 }}>
            <Users size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>Select a table to view guest session</div>
          </div>
        ) : (
          <>
            {/* Guest header */}
            <div className="eeie-live-card" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: T.shadow }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${T.accent}14`, border: `2px solid ${T.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
                  {selected.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{selected.guestName}</span>
                    {selected.returning && <Badge label="RETURNING" color={T.accent} bg={`${T.accent}12`} />}
                    <Badge label={selected.loyaltyTier} color={TIER_C[selected.loyaltyTier] ?? T.accent} bg={`${TIER_C[selected.loyaltyTier] ?? T.accent}12`} />
                    <Badge label={selected.moodTag.toUpperCase()} color={moodTagColor(selected.moodTag)} bg={`${moodTagColor(selected.moodTag)}12`} />
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    {[
                      { l: "XP",       v: selected.xp.toLocaleString() },
                      { l: "STRENGTH", v: selected.strength.toUpperCase(), c: T.accent },
                      { l: "AI MATCH", v: `${selected.aiMatchScore}%`,     c: T.green },
                      { l: "ACTIVE",   v: timeSince(selected.startedAt) },
                    ].map(m => (
                      <div key={m.l}>
                        <span style={{ fontSize: 8.5, color: T.textFaint, fontFamily: T.mono }}>{m.l} </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.c ?? T.text }}>{m.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {selected.flavors.map(f => <Badge key={f} label={f} color={T.purple} bg={`${T.purple}0C`} />)}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.93 }} onClick={() => togglePause(selected.id)}
                  style={{
                    padding: "10px 16px", borderRadius: 10,
                    border: `1px solid ${selected.status === "paused" ? `${T.green}40` : `${T.yellow}40`}`,
                    background: selected.status === "paused" ? `${T.green}12` : `${T.yellow}10`,
                    color: selected.status === "paused" ? T.green : T.yellow,
                    cursor: "pointer", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  }}>
                  {selected.status === "paused"
                    ? <><Play size={12} /> Resume</>
                    : <><Pause size={12} /> Pause</>
                  }
                </motion.button>
              </div>
            </div>

            {/* Blend Intelligence radar */}
            <Panel title="SmokeCraft Blend Intelligence" subtitle="Guest flavor radar profile" icon={<Star size={14} />} T={T} accentColor={T.purple}>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <RadarChart labels={FLAVOR_LABELS} values={Object.values(selected.blendProfile)} color={T.purple} size={150} />
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {FLAVOR_LABELS.map((label, i) => {
                    const val = Object.values(selected.blendProfile)[i] ?? 0;
                    return (
                      <div key={label}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.textSub, marginBottom: 3 }}>
                          <span>{label}</span><span style={{ color: T.purple, fontWeight: 700 }}>{val}</span>
                        </div>
                        <Meter pct={val} color={T.purple} height={4} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {[
                    { l: "Wrapper",  v: "Connecticut Shade" },
                    { l: "Binder",   v: "Honduran" },
                    { l: "Filler",   v: "Nicaraguan" },
                    { l: "Size",     v: "Robusto" },
                    { l: "Cut",      v: "Straight" },
                    { l: "Strength", v: selected.strength },
                  ].map(m => (
                    <div key={m.l}>
                      <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* ── AI Recommendations — rotating carousel ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

              <RotatingProductCard
                title="AI Cigar Match"
                icon={<Leaf size={13} />}
                badge="LIVE ROTATION"
                accentColor={T.green}
                T={T}
                product={rotCigar}
                rotIdx={cigarIdx}
                totalCount={cigarProducts.length}
                onAdd={() => rotCigar && addToCart(selected, { name: rotCigar.name, type: "cigar",  price: rotCigar.price,  qty: 1 })}
                onShow={() => rotCigar && showToast(`${rotCigar.name} shown to ${selected.guestName}`)}
                fallbackIcon={<Leaf size={36} color={`${T.green}60`} />}
              />

              <RotatingProductCard
                title="Liquor Pairing"
                icon={<Coffee size={13} />}
                badge="LIVE ROTATION"
                accentColor={T.purple}
                T={T}
                product={rotLiquor}
                rotIdx={liquorIdx}
                totalCount={liquorProducts.length}
                onAdd={() => rotLiquor && addToCart(selected, { name: rotLiquor.name, type: "liquor", price: rotLiquor.price, qty: 1 })}
                onShow={() => rotLiquor && showToast(`${rotLiquor.name} shown to ${selected.guestName}`)}
                fallbackIcon={<Coffee size={36} color={`${T.purple}60`} />}
                priceLabel="2 oz pour"
              />

              {/* Food Pairing — static (flavor-matched) */}
              <Panel title="Food Pairing" icon={<Utensils size={13} />} badge="SUGGESTED" T={T} accentColor={T.yellow}>
                <div style={{ padding: "10px", borderRadius: 12, background: `${T.yellow}06`, border: `1px solid ${T.yellow}18` }}>
                  <div className="eeie-image-shimmer" style={{ height: 168, borderRadius: 10, overflow: "hidden", marginBottom: 10, position: "relative", background: `${T.yellow}12` }}>
                    <img
                      src={foodRec.image}
                      alt={foodRec.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 52%)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: 10, left: 12, right: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>{foodRec.name}</div>
                      <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.78)", marginTop: 2 }}>{foodRec.category} · ${foodRec.price} · {foodRec.prepTime}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: T.textSub, lineHeight: 1.6, marginBottom: 10, fontStyle: "italic" }}>"{foodRec.pairing}"</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.94 }} className="eeie-button-press"
                      onClick={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: T.yellow, color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 700, boxShadow: `0 4px 14px ${T.yellow}38` }}>
                      + Add ${foodRec.price}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.94 }}
                      onClick={() => showToast(`Food recommendation shown to ${selected.guestName}`)}
                      style={{ padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.yellow}30`, background: `${T.yellow}0C`, color: T.yellow, cursor: "pointer" }}>
                      <Eye size={13} />
                    </motion.button>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Staff Nudge System */}
            <Panel title="Staff Nudge System" subtitle="AI-suggested service script" icon={<ClipboardList size={14} />} T={T} accentColor={T.accent}>
              <div style={{ padding: "14px", borderRadius: 12, background: `${T.accent}06`, border: `1px solid ${T.accent}18`, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <Star size={13} color={T.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11, color: T.text, lineHeight: 1.7, fontStyle: "italic" }}>
                    "Say: <strong>This pairing brings out the {selected.flavors[0]?.toLowerCase() ?? "creamy"} and {selected.flavors[1]?.toLowerCase() ?? "nutty"} notes in your blend. The {(rotLiquor?.brand ?? "spirit").split(" ")[0]} lifts the finish beautifully — would you like a pour tonight?</strong>"
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { l: "Opportunity", v: "Premium Pairing Upsell" },
                    { l: "Timing",      v: "Now — guest at mid-session" },
                    { l: "Confidence",  v: `${selected.aiMatchScore}%` },
                    { l: "Pace",        v: "Curated · Unhurried" },
                  ].map(m => (
                    <div key={m.l}>
                      <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{m.l}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                <TouchButton icon={<Star size={16} />}          label="APPLY REWARD"    color={T.green}  variant="glass" onClick={() => applyReward(selected)} />
                <TouchButton icon={<ClipboardList size={16} />}  label="ADD NOTE"        color={T.accent} variant="glass" />
                <TouchButton icon={<Eye size={16} />}            label="SHOW VISUALS"    color={T.purple} variant="glass" onClick={() => showToast(`Visuals shown to ${selected.guestName}`)} />
                <TouchButton icon={<Leaf size={16} />}           label="ADD CIGAR"       color={T.green}  variant="glass" onClick={() => rotCigar  && addToCart(selected, { name: rotCigar.name,  type: "cigar",  price: rotCigar.price,  qty: 1 })} />
                <TouchButton icon={<Coffee size={16} />}         label="ADD DRINK"       color={T.purple} variant="glass" onClick={() => rotLiquor && addToCart(selected, { name: rotLiquor.name, type: "liquor", price: rotLiquor.price, qty: 1 })} />
                <TouchButton icon={<Utensils size={16} />}       label="ADD FOOD"        color={T.yellow} variant="glass" onClick={() => addToCart(selected, { name: foodRec.name, type: "food", price: foodRec.price, qty: 1 })} />
                <TouchButton icon={<Bell size={16} />}           label="NOTIFY MGR"      color={T.yellow} variant="glass" onClick={() => showToast("Manager notified")} />
                <TouchButton icon={<Send size={16} />}           label="NOTIFY BAR"      color={T.cyan}   variant="glass" onClick={() => showToast("Bar notified")} />
                <TouchButton icon={<BookOpen size={16} />}       label="NOTIFY KITCHEN"  color={T.accent} variant="glass" onClick={() => showToast("Kitchen notified")} />
                <TouchButton icon={<ShoppingCart size={16} />}   label="SEND TO POS"     color={T.green}  variant="solid" size="md" onClick={() => sendToPOS(selected)} />
                <TouchButton icon={<Play size={16} />}           label="RETURN TO GUEST" color={T.accent} variant="solid" size="md" onClick={() => togglePause(selected.id)} />
              </div>

              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a staff note for this table..."
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,60,180,0.03)", color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
              />
            </Panel>

            {/* Cart */}
            {selected.cart.length > 0 && (
              <Panel title={`Current Order · ${selected.cart.length} item${selected.cart.length > 1 ? "s" : ""}`} icon={<ShoppingCart size={14} />} T={T} accentColor={T.green}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.cart.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: `${T.green}06`, border: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: T.textSub, textTransform: "capitalize" as const }}>{item.type}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.green }}>${item.price}</div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(selected.id, i)}
                          style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕
                        </motion.button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 4px", borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>Total</span>
                    <span style={{ fontWeight: 800, color: T.green, fontSize: 18 }}>${selected.cart.reduce((s, i) => s + i.price * i.qty, 0)}</span>
                  </div>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => sendToPOS(selected)}
                    style={{ width: "100%", padding: "16px", borderRadius: 12, background: T.green, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: `0 4px 18px ${T.green}40`, marginTop: 4 }}>
                    Send to Commerce Infrastructure
                  </motion.button>
                </div>
              </Panel>
            )}

            {/* Guest Experience Preview */}
            <Panel title="Guest Experience Preview" subtitle="What the guest sees on kiosk" icon={<Eye size={14} />} T={T} accentColor={T.cyan}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowGuestPreview(p => !p)}
                style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1px solid ${T.cyan}28`, background: `${T.cyan}08`, color: T.cyan, cursor: "pointer", fontSize: 11, fontWeight: 700, marginBottom: showGuestPreview ? 12 : 0 }}>
                {showGuestPreview ? "▲ Hide Preview" : "▼ View Guest Screen"}
              </motion.button>
              <AnimatePresence>
                {showGuestPreview && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                    <div style={{ padding: "16px", borderRadius: 14, background: T.dark ? "#0A1428" : "#F8FAFF", border: `1px solid ${T.cyan}25` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: T.cyan, fontFamily: T.mono, marginBottom: 2 }}>SMOKECRAFT BY SOVEREIGN</div>
                      <div style={{ fontSize: 9, color: T.textFaint, marginBottom: 12 }}>Step 3 of 5 · Flavor Discovery</div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                        {[1,2,3,4,5].map(s => (
                          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= 3 ? T.cyan : T.border }} />
                        ))}
                      </div>
                      <div style={{ textAlign: "center" as const, padding: "20px", borderRadius: 12, background: T.dark ? "rgba(0,200,255,0.06)" : "rgba(0,130,180,0.05)", border: `1px solid ${T.cyan}18` }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Your Blend Profile</div>
                        <div style={{ fontSize: 11, color: T.textSub, marginBottom: 12 }}>AI Match Score: <strong style={{ color: T.green }}>{selected.aiMatchScore}%</strong></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" as const }}>
                          {selected.flavors.map(f => <Badge key={f} label={f} color={T.cyan} bg={`${T.cyan}0E`} />)}
                        </div>
                        {selected.status === "paused" && (
                          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, background: `${T.yellow}0E`, border: `1px solid ${T.yellow}25`, fontSize: 10, color: T.yellow, fontWeight: 700 }}>
                            Your experience is paused — your concierge will return shortly
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Panel>
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: T.green, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${T.green}50` }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
