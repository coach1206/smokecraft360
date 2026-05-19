/**
 * AssetVault — /inventory
 * Premium obsidian glass inventory ledger with SVG revenue charts.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Package2 } from "lucide-react";

// ── Simulated inventory data ───────────────────────────────────────────────────

interface StockItem {
  id:       string;
  name:     string;
  brand:    string;
  category: "CIGAR" | "SPIRIT" | "WINE";
  qty:      number;
  par:      number;
  price:    number;
  origin:   string;
  gradient: string;
  accentColor: string;
}

const STOCK: StockItem[] = [
  {
    id: "c1", name: "1926 Serie No. 6", brand: "PADRÓN", category: "CIGAR",
    qty: 24, par: 48, price: 45, origin: "Jalapa, Nicaragua",
    gradient: "linear-gradient(135deg, #2a1a06 0%, #1a0e02 50%, #0e0802 100%)",
    accentColor: "#d4840a",
  },
  {
    id: "c2", name: "Fuente Fuente Opus X", brand: "ARTURO FUENTE", category: "CIGAR",
    qty: 11, par: 36, price: 65, origin: "Chateau de la Fuente, D.R.",
    gradient: "linear-gradient(135deg, #1e0a0a 0%, #140606 50%, #0c0404 100%)",
    accentColor: "#c0250a",
  },
  {
    id: "s1", name: "Macallan 18yr Sherry Oak", brand: "THE MACALLAN", category: "SPIRIT",
    qty: 6, par: 12, price: 220, origin: "Speyside, Scotland",
    gradient: "linear-gradient(135deg, #0e1a28 0%, #081018 50%, #040a10 100%)",
    accentColor: "#4a90d9",
  },
  {
    id: "s2", name: "Pappy Van Winkle 23yr", brand: "OLD RIP VAN WINKLE", category: "SPIRIT",
    qty: 3, par: 6, price: 340, origin: "Buffalo Trace, Kentucky",
    gradient: "linear-gradient(135deg, #1a1006 0%, #100a02 50%, #080600 100%)",
    accentColor: "#c88c20",
  },
  {
    id: "w1", name: "Opus One 2020", brand: "OPUS ONE", category: "WINE",
    qty: 18, par: 24, price: 120, origin: "Oakville, Napa Valley",
    gradient: "linear-gradient(135deg, #180a1e 0%, #0e0612 50%, #080408 100%)",
    accentColor: "#9b59b6",
  },
  {
    id: "w2", name: "Château Pétrus 2016", brand: "POMEROL ESTATE", category: "WINE",
    qty: 4, par: 12, price: 280, origin: "Pomerol, Bordeaux",
    gradient: "linear-gradient(135deg, #1e0a14 0%, #140610 50%, #0c0408 100%)",
    accentColor: "#c0406a",
  },
];

// ── SVG Charts ────────────────────────────────────────────────────────────────

const HOURLY = [12, 18, 9, 24, 31, 28, 40, 52, 47, 38, 55, 61];
const W = 320; const H = 80;
function SalesLineChart() {
  const max = Math.max(...HOURLY);
  const pts = HOURLY.map((v, i) => {
    const x = (i / (HOURLY.length - 1)) * W;
    const y = H - (v / max) * H * 0.9 - 4;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${H} ` + HOURLY.map((v, i) => {
    const x = (i / (HOURLY.length - 1)) * W;
    const y = H - (v / max) * H * 0.9 - 4;
    return `${x},${y}`;
  }).join(" ") + ` ${W},${H}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb300" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffb300" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points={area} fill="url(#lineGrad)" />
      <polyline points={pts} fill="none" stroke="#ffb300" strokeWidth="2.5" strokeLinejoin="round" filter="url(#glow)" />
      {HOURLY.map((v, i) => {
        const x = (i / (HOURLY.length - 1)) * W;
        const y = H - (v / max) * H * 0.9 - 4;
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#ffb300" filter="url(#glow)" />;
      })}
    </svg>
  );
}

const DONUT = [
  { label: "SECO",   value: 40, color: "#ffb300" },
  { label: "VISO",   value: 35, color: "#e8860a" },
  { label: "LIGERO", value: 25, color: "#a05a04" },
];
function DonutChart() {
  const R = 48; const CX = 60; const CY = 60; const stroke = 16;
  const total = DONUT.reduce((s, d) => s + d.value, 0);
  let offset = -90;
  const segments = DONUT.map(d => {
    const pct   = d.value / total;
    const angle = pct * 360;
    const start = offset;
    offset += angle;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = CX + R * Math.cos(toRad(start));
    const y1 = CY + R * Math.sin(toRad(start));
    const x2 = CX + R * Math.cos(toRad(start + angle));
    const y2 = CY + R * Math.sin(toRad(start + angle));
    const large = angle > 180 ? 1 : 0;
    return { ...d, x1, y1, x2, y2, large, cx: CX + (R + stroke * 0.5 + 4) * Math.cos(toRad(start + angle / 2)), cy: CY + (R + stroke * 0.5 + 4) * Math.sin(toRad(start + angle / 2)) };
  });

  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <defs>
        <filter id="glowD">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {segments.map(s => (
        <path
          key={s.label}
          d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
          fill={s.color}
          filter="url(#glowD)"
          opacity={0.9}
        />
      ))}
      <circle cx={CX} cy={CY} r={R - stroke} fill="#080808" />
      <text x={CX} y={CY + 5} textAnchor="middle" fill="#ffb300" fontSize="11" fontWeight="900" fontFamily="monospace">BLEND</text>
    </svg>
  );
}

// ── Category filter bar ───────────────────────────────────────────────────────
type CategoryFilter = "ALL" | "CIGAR" | "SPIRIT" | "WINE";

export default function AssetVault() {
  const [, navigate]   = useLocation();
  const [filter,       setFilter]   = useState<CategoryFilter>("ALL");
  const [expandedId,   setExpandedId] = useState<string | null>(null);

  const visible = filter === "ALL" ? STOCK : STOCK.filter(s => s.category === filter);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-black select-none">

      {/* Header */}
      <header className="flex items-center justify-between px-6 border-b-2 border-[#1c1c1c] bg-[#060606]"
        style={{ minHeight: 70 }}>
        <div className="flex items-center gap-5">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#d4af37] font-mono font-black text-lg tracking-widest border border-[#d4af37]/35 rounded-xl px-5 py-2.5 hover:bg-[#d4af37]/10 transition-all active:scale-95">
            <ArrowLeft size={18} /> BACK
          </button>
          <div>
            <span className="text-[#d4af37] font-mono font-black text-3xl tracking-widest">[ ASSET VAULT ]</span>
            <span className="text-[#444] font-mono text-xl ml-3 tracking-widest">LIVE INVENTORY LEDGER</span>
          </div>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-[#ffb300] shadow-[0_0_10px_#ffb30099]"
          />
        </div>
        <div className="flex items-center gap-3">
          {(["ALL","CIGAR","SPIRIT","WINE"] as CategoryFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`font-mono font-black text-base tracking-widest px-4 py-2 rounded-xl border transition-all ${
                filter === f
                  ? "border-[#ffb300] text-[#ffb300] bg-[#ffb300]/10"
                  : "border-[#222] text-[#444] hover:border-[#444]"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Left — stock grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {visible.map(item => {
                const stockPct = item.qty / item.par;
                const low = stockPct < 0.35;
                const isOpen = expandedId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="rounded-2xl border-2 overflow-hidden cursor-pointer transition-colors"
                    style={{
                      background:   item.gradient,
                      borderColor:  isOpen ? item.accentColor : "#222",
                      boxShadow:    isOpen ? `0 0 28px ${item.accentColor}44` : "none",
                    }}
                  >
                    {/* Simulated luxury product visual */}
                    <div className="h-28 relative overflow-hidden flex items-center justify-center"
                      style={{ background: item.gradient }}>
                      {/* Abstract product silhouette */}
                      {item.category === "CIGAR" && (
                        <div className="flex items-center gap-2 opacity-70">
                          <div className="w-2 h-20 rounded-full" style={{ background: `linear-gradient(180deg, ${item.accentColor} 0%, ${item.accentColor}44 100%)` }} />
                          <div className="w-2 h-24 rounded-full" style={{ background: `linear-gradient(180deg, ${item.accentColor} 0%, ${item.accentColor}22 100%)` }} />
                          <div className="w-2 h-20 rounded-full" style={{ background: `linear-gradient(180deg, ${item.accentColor} 0%, ${item.accentColor}44 100%)` }} />
                          <div className="w-2 h-16 rounded-full" style={{ background: `linear-gradient(180deg, ${item.accentColor} 0%, ${item.accentColor}33 100%)` }} />
                        </div>
                      )}
                      {item.category === "SPIRIT" && (
                        <div className="relative">
                          <div className="w-10 h-24 rounded-b-2xl rounded-t-xl mx-auto"
                            style={{ background: `linear-gradient(180deg, ${item.accentColor}30 0%, ${item.accentColor}90 100%)`, boxShadow: `0 0 30px ${item.accentColor}55` }} />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
                            style={{ background: item.accentColor }} />
                        </div>
                      )}
                      {item.category === "WINE" && (
                        <div className="relative">
                          <div className="w-8 h-28 rounded-b-3xl mx-auto"
                            style={{ background: `linear-gradient(180deg, ${item.accentColor}25 0%, ${item.accentColor}88 100%)`, boxShadow: `0 0 24px ${item.accentColor}44` }} />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-6 rounded-t-full"
                            style={{ background: item.accentColor }} />
                        </div>
                      )}
                      {/* Brand label overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="font-mono font-black text-xs tracking-widest opacity-60" style={{ color: item.accentColor }}>{item.brand}</p>
                      </div>
                      {/* Low stock alert */}
                      {low && (
                        <motion.div
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="absolute top-2 right-2 bg-red-900/80 border border-red-600/50 text-red-400 font-mono font-black text-xs tracking-widest px-2 py-1 rounded-lg">
                          LOW STOCK
                        </motion.div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-mono font-black text-xs tracking-widest" style={{ color: item.accentColor }}>{item.brand}</span>
                          <h3 className="text-white font-sans font-black text-xl tracking-wide leading-tight mt-0.5">{item.name}</h3>
                          <p className="text-[#3a3a3a] font-mono text-sm tracking-wide mt-1">{item.origin}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-3xl" style={{ color: "#ffb300" }}>{item.qty}</span>
                          <p className="text-[#444] font-mono text-sm">/ {item.par} par</p>
                        </div>
                      </div>

                      {/* Stock bar */}
                      <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stockPct * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: low ? "#c0250a" : item.accentColor, boxShadow: `0 0 8px ${item.accentColor}88` }}
                        />
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="mt-4 pt-4 border-t flex justify-between items-center overflow-hidden"
                            style={{ borderColor: `${item.accentColor}30` }}
                          >
                            <div>
                              <p className="text-[#444] font-mono text-sm tracking-widest">UNIT PRICE</p>
                              <p className="font-mono font-black text-2xl" style={{ color: "#ffb300" }}>${item.price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[#444] font-mono text-sm tracking-widest">LEDGER VALUE</p>
                              <p className="font-mono font-black text-2xl" style={{ color: "#ffb300" }}>${(item.price * item.qty).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[#444] font-mono text-sm tracking-widest">STATUS</p>
                              <p className={`font-mono font-black text-lg ${low ? "text-red-500" : "text-emerald-400"}`}>
                                {low ? "REORDER" : "OK"}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right — charts sidebar */}
        <div className="w-80 border-l-2 border-[#141414] bg-[#070707] flex flex-col overflow-y-auto">

          {/* Sales Curve */}
          <div className="p-6 border-b border-[#141414]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#ffb300]" />
              <h3 className="text-[#ffb300] font-mono font-black text-lg tracking-widest">SALES CURVE</h3>
            </div>
            <p className="text-[#333] font-mono text-sm tracking-widest mb-4">HOURLY SOMMELIER TRANSACTIONS</p>
            <SalesLineChart />
            <div className="flex justify-between mt-3">
              {["12A","2","4","6","8","10","12P","2","4","6","8","10"].map((h, i) => (
                i % 2 === 0
                  ? <span key={i} className="text-[#2a2a2a] font-mono text-xs">{h}</span>
                  : null
              ))}
            </div>
          </div>

          {/* Product Velocity */}
          <div className="p-6 border-b border-[#141414]">
            <div className="flex items-center gap-2 mb-4">
              <Package2 size={20} className="text-[#ffb300]" />
              <h3 className="text-[#ffb300] font-mono font-black text-lg tracking-widest">LEAF VELOCITY</h3>
            </div>
            <p className="text-[#333] font-mono text-sm tracking-widest mb-4">MANUFACTURING BLEND DISTRIBUTION</p>
            <div className="flex items-center gap-6">
              <DonutChart />
              <div className="flex flex-col gap-3">
                {DONUT.map(d => (
                  <div key={d.label} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }} />
                    <div>
                      <p className="text-white font-mono font-black text-base">{d.label}</p>
                      <p className="font-mono font-black text-lg" style={{ color: d.color }}>{d.value}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="p-6 flex flex-col gap-4">
            <h3 className="text-[#ffb300] font-mono font-black text-lg tracking-widest">VAULT METRICS</h3>
            {[
              { label: "TOTAL SKUs",       value: String(STOCK.length)  },
              { label: "TOTAL ITEMS",      value: String(STOCK.reduce((s, i) => s + i.qty, 0)) },
              { label: "VAULT VALUE",      value: `$${STOCK.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}` },
              { label: "LOW STOCK ALERTS", value: String(STOCK.filter(i => i.qty / i.par < 0.35).length) },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-3 border-b border-[#141414]">
                <span className="text-[#444] font-mono font-bold text-base tracking-widest">{m.label}</span>
                <span className="text-[#ffb300] font-mono font-black text-2xl">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
