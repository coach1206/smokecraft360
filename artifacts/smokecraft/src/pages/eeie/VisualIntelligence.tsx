/**
 * EEIE Visual Intelligence Tab — Product Wall, Pairing Bundles, AI Pairing Graphs.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, ShoppingCart, Eye, Repeat, Package, Leaf, Coffee, Utensils } from "lucide-react";
import { type Theme, Badge, Meter, Panel, TouchButton, RadarChart, DonutRing, triggerHaptic } from "./shared";
import "@/styles/eeie-motion.css";

interface Product {
  id: string; name: string; brand: string; category: string;
  price: number; matchScore: number; stock: "in_stock" | "low_stock" | "out_of_stock";
  flavorTags: string[]; pairingTags: string[]; isAIRec: boolean; isManagerPick: boolean;
  imageColor: string;
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Padron 1964 Exclusivo", brand: "Padron", category: "Cigar", price: 42, matchScore: 92, stock: "low_stock", flavorTags: ["Creamy","Nutty","Cocoa"], pairingTags: ["Bourbon","Aged Scotch"], isAIRec: true, isManagerPick: false, imageColor: "#7C3AED" },
  { id: "p2", name: "Woodford Reserve Double Oaked", brand: "Woodford", category: "Bourbon", price: 22, matchScore: 95, stock: "in_stock", flavorTags: ["Vanilla","Oak","Caramel"], pairingTags: ["Full Cigar","Dessert"], isAIRec: true, isManagerPick: true, imageColor: "#D97706" },
  { id: "p3", name: "Arturo Fuente Opus X", brand: "Arturo Fuente", category: "Cigar", price: 45, matchScore: 88, stock: "in_stock", flavorTags: ["Spicy","Leather","Pepper"], pairingTags: ["Cognac","Dark Rum"], isAIRec: false, isManagerPick: true, imageColor: "#059669" },
  { id: "p4", name: "Hennessy VSOP", brand: "Hennessy", category: "Cognac", price: 26, matchScore: 84, stock: "in_stock", flavorTags: ["Dark Fruit","Spice","Oak"], pairingTags: ["Bold Cigar","Chocolate"], isAIRec: false, isManagerPick: false, imageColor: "#B45309" },
  { id: "p5", name: "My Father Le Bijou 1922", brand: "My Father", category: "Cigar", price: 38, matchScore: 96, stock: "in_stock", flavorTags: ["Sweet","Floral","Vanilla"], pairingTags: ["Single Malt","Port"], isAIRec: true, isManagerPick: true, imageColor: "#0891B2" },
  { id: "p6", name: "Balvenie DoubleWood 17", brand: "Balvenie", category: "Scotch", price: 34, matchScore: 91, stock: "low_stock", flavorTags: ["Honey","Toast","Dried Fruit"], pairingTags: ["Light Cigar","Cheese"], isAIRec: true, isManagerPick: false, imageColor: "#7C3AED" },
  { id: "p7", name: "Smoked Short Rib Sliders", brand: "Kitchen", category: "Food", price: 18, matchScore: 87, stock: "in_stock", flavorTags: ["Smoky","Savory","Oak"], pairingTags: ["Full Cigar","Bold Bourbon"], isAIRec: true, isManagerPick: false, imageColor: "#DC2626" },
  { id: "p8", name: "Truffle Charcuterie Board", brand: "Kitchen", category: "Food", price: 28, matchScore: 83, stock: "in_stock", flavorTags: ["Earthy","Umami","Rich"], pairingTags: ["Any Cigar","Scotch"], isAIRec: false, isManagerPick: true, imageColor: "#065F46" },
];

interface Bundle {
  id: string; name: string; items: string[]; totalPrice: number; savings: number;
  matchScore: number; colors: string[]; script: string;
}

const BUNDLES: Bundle[] = [
  { id: "b1", name: "Cream & Oak Experience", items: ["Padron 1964","Woodford Reserve Double Oaked","Smoked Short Rib Sliders"], totalPrice: 76, savings: 6, matchScore: 94, colors: ["#7C3AED","#D97706","#DC2626"], script: "This bundle brings out the creamy, toasted, and cocoa notes across all three — a perfectly aligned progression." },
  { id: "b2", name: "Bold Barrel Pairing", items: ["Arturo Fuente Opus X","Hennessy VSOP","Truffle Charcuterie Board"], totalPrice: 89, savings: 10, matchScore: 88, colors: ["#059669","#B45309","#065F46"], script: "Spice and leather amplified by the dark fruit of the cognac. The charcuterie grounds the experience." },
  { id: "b3", name: "Sweet Finish Session", items: ["My Father Le Bijou","Balvenie DoubleWood 17"], totalPrice: 64, savings: 8, matchScore: 96, colors: ["#0891B2","#7C3AED"], script: "Vanilla and floral notes in perfect harmony with the dried fruit and honey of the Balvenie." },
];

function stockBadge(stock: Product["stock"], T: Theme) {
  return {
    in_stock:    { label: "In Stock",  color: T.green },
    low_stock:   { label: "Low Stock", color: T.yellow },
    out_of_stock:{ label: "Out of Stock", color: T.red },
  }[stock];
}

const categoryIcon = (cat: string) => {
  if (cat === "Cigar") return <Leaf size={12} />;
  if (cat === "Food")  return <Utensils size={12} />;
  return <Coffee size={12} />;
};

const FLAVOR_LABELS = ["Creamy","Sweet","Nutty","Earthy","Spicy","Woody","Pepper","Citrus"];
const ACTIVE_PROFILE = [82, 68, 75, 40, 30, 55, 25, 20];

interface Props { T: Theme; }

export function VisualIntelligenceTab({ T }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  const categories = ["all", "Cigar", "Bourbon", "Scotch", "Cognac", "Food"];
  const filtered = filter === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  function showToast(msg: string) {
    triggerHaptic("success");
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* AI Pairing Graphs */}
      <Panel title="Visual Pairing Engine" subtitle="AI-computed compatibility analysis" icon={<ImageIcon size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, alignItems: "center" }}>
          {/* Radar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>FLAVOR PROFILE</div>
            <RadarChart labels={FLAVOR_LABELS} values={ACTIVE_PROFILE} color={T.accent} size={130} />
            <div style={{ fontSize: 9, color: T.textSub, textAlign: "center" }}>Marcus R. — Table 1</div>
          </div>
          {/* Pairing confidence ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>PAIRING CONFIDENCE</div>
            <DonutRing pct={92} color={T.green} size={90} label="92%" />
            <div style={{ fontSize: 9, color: T.green, fontFamily: T.mono }}>EXCELLENT MATCH</div>
          </div>
          {/* Inventory pressure */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em", marginBottom: 4 }}>INVENTORY PRESSURE</div>
            {[
              { label: "Padron 1964", pct: 80, color: T.yellow },
              { label: "Woodford Reserve", pct: 60, color: T.green },
              { label: "Arturo Fuente", pct: 40, color: T.green },
              { label: "Macallan 18", pct: 15, color: T.red },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.textSub, marginBottom: 3 }}>
                  <span>{m.label}</span><span style={{ color: m.color, fontWeight: 700 }}>{m.pct}%</span>
                </div>
                <Meter pct={m.pct} color={m.color} height={5} />
              </div>
            ))}
          </div>
          {/* Revenue + Mood rings */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>MEDIA COMPLETENESS</div>
              <DonutRing pct={67} color={T.purple} size={72} label="67%" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 9, color: T.textFaint, fontFamily: T.mono }}>COMMERCE HEALTH</div>
              <DonutRing pct={84} color={T.accent} size={72} label="84%" />
            </div>
          </div>
        </div>
      </Panel>

      {/* Pairing Bundles */}
      <Panel title="Visual Pairing Bundles" subtitle="AI-curated experience bundles" icon={<Package size={14} />} T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {BUNDLES.map(b => (
            <motion.div key={b.id}
              className="eeie-live-card eeie-hover-lift eeie-machine-pulse"
              style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.cardAlt, overflow: "hidden", boxShadow: T.shadow }}
            >
              {/* Color strip */}
              <div style={{ height: 6, display: "flex" }}>
                {b.colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 6 }}>{b.name}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                  {b.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: b.colors[i] ?? T.accent }} />
                      <span style={{ fontSize: 10.5, color: T.textMid }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: T.textSub, fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }}>"{b.script}"</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>${b.totalPrice}</div>
                    <div style={{ fontSize: 9, color: T.green }}>Save ${b.savings}</div>
                  </div>
                  <DonutRing pct={b.matchScore} color={T.green} size={52} label={`${b.matchScore}%`} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => showToast(`${b.name} shown to guest`)}
                    style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.accent}30`, background: `${T.accent}0E`, color: T.accent, cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
                    <Eye size={11} style={{ display: "inline", marginRight: 4 }} />Show
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => showToast(`${b.name} sent to Commerce`)}
                    style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 9.5, fontWeight: 700 }}>
                    <ShoppingCart size={11} style={{ display: "inline", marginRight: 4 }} />Add
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Product Wall */}
      <Panel title="Visual Product Wall" subtitle="Luxury selling layer · Tap to act" icon={<ImageIcon size={14} />} T={T}>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {categories.map(cat => (
            <motion.button key={cat} whileTap={{ scale: 0.95 }} onClick={() => setFilter(cat)}
              style={{
                padding: "7px 14px", borderRadius: 999, border: `1px solid ${filter === cat ? T.accent : T.border}`,
                background: filter === cat ? `${T.accent}14` : "transparent", color: filter === cat ? T.accent : T.textSub,
                cursor: "pointer", fontSize: 9.5, fontWeight: filter === cat ? 700 : 400, fontFamily: T.mono,
              }}>
              {cat.toUpperCase()}
            </motion.button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {filtered.map(p => {
            const sb = stockBadge(p.stock, T);
            return (
              <motion.div key={p.id}
                whileHover={{ boxShadow: `0 8px 32px ${p.imageColor}18` }}
                className="eeie-module-card eeie-live-card eeie-hover-lift eeie-machine-pulse"
                style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
              >
                {/* Product image area */}
                <div className="eeie-image-shimmer" style={{
                  height: 100, background: `linear-gradient(135deg, ${p.imageColor}18, ${p.imageColor}08)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderBottom: `1px solid ${T.border}`, position: "relative",
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p.imageColor}20`, border: `1.5px solid ${p.imageColor}40`, display: "flex", alignItems: "center", justifyContent: "center", color: p.imageColor }}>
                    {categoryIcon(p.category)}
                  </div>
                  {p.isAIRec && (
                    <div style={{ position: "absolute", top: 8, left: 8 }}>
                      <Badge label="AI" color={T.purple} bg={`${T.purple}18`} />
                    </div>
                  )}
                  {p.isManagerPick && (
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <Badge label="PICK" color={T.yellow} bg={`${T.yellow}14`} />
                    </div>
                  )}
                </div>

                <div style={{ padding: "12px 12px 10px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: T.textSub, marginBottom: 8 }}>{p.brand} · {p.category}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>${p.price}</span>
                    <Badge label={sb.label} color={sb.color} bg={`${sb.color}12`} />
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: T.textFaint, marginBottom: 3 }}>
                      <span>Match</span><span style={{ color: T.green, fontWeight: 700 }}>{p.matchScore}%</span>
                    </div>
                    <Meter pct={p.matchScore} color={T.green} height={4} />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 10 }}>
                    {p.flavorTags.slice(0, 2).map(tag => <Badge key={tag} label={tag} color={T.accent} bg={`${T.accent}0A`} />)}
                  </div>

                  <div style={{ display: "flex", gap: 5 }}>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => showToast(`${p.name} shown to guest`)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer", fontSize: 9 }}>
                      <Eye size={10} style={{ display: "inline", marginRight: 3 }} />Show
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }}
                      disabled={p.stock === "out_of_stock"}
                      onClick={() => showToast(`${p.name} added to cart`)}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: p.stock === "out_of_stock" ? T.border : T.accent, color: "#fff", cursor: p.stock === "out_of_stock" ? "not-allowed" : "pointer", fontSize: 9, opacity: p.stock === "out_of_stock" ? 0.4 : 1 }}>
                      <ShoppingCart size={10} style={{ display: "inline", marginRight: 3 }} />Add
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.92 }}
                      style={{ padding: "8px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textSub, cursor: "pointer" }}>
                      <Repeat size={10} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ position: "fixed", bottom: 100, right: 32, background: T.accent, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 12, zIndex: 999, boxShadow: `0 4px 20px ${T.accent}50` }}>
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
