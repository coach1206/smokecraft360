/**
 * AssetVault — /inventory
 * Premium obsidian glass inventory ledger · FileReader image upload per SKU · SVG charts.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Package2, Camera, X, Upload } from "lucide-react";

// ── Inventory data ─────────────────────────────────────────────────────────────

interface StockItem {
  id:          string;
  name:        string;
  brand:       string;
  category:    "CIGAR" | "SPIRIT" | "WINE";
  qty:         number;
  par:         number;
  price:       number;
  origin:      string;
  gradient:    string;
  accentColor: string;
  presetBg:    string;
}

const STOCK: StockItem[] = [
  {
    id: "c1", name: "1926 Serie No. 6", brand: "PADRÓN", category: "CIGAR",
    qty: 24, par: 48, price: 45, origin: "Jalapa, Nicaragua",
    gradient: "linear-gradient(135deg, #2a1a06 0%, #1a0e02 50%, #0e0802 100%)",
    accentColor: "#d4840a",
    presetBg: "radial-gradient(ellipse at 30% 20%, #5c3a0e 0%, #2a1a06 40%, #0e0802 100%)",
  },
  {
    id: "c2", name: "Fuente Fuente Opus X", brand: "ARTURO FUENTE", category: "CIGAR",
    qty: 11, par: 36, price: 65, origin: "Chateau de la Fuente, D.R.",
    gradient: "linear-gradient(135deg, #1e0a0a 0%, #140606 50%, #0c0404 100%)",
    accentColor: "#c0250a",
    presetBg: "radial-gradient(ellipse at 70% 30%, #6b1a10 0%, #1e0a0a 50%, #0c0404 100%)",
  },
  {
    id: "s1", name: "Macallan 18yr Sherry Oak", brand: "THE MACALLAN", category: "SPIRIT",
    qty: 6, par: 12, price: 220, origin: "Speyside, Scotland",
    gradient: "linear-gradient(135deg, #0e1a28 0%, #081018 50%, #040a10 100%)",
    accentColor: "#4a90d9",
    presetBg: "radial-gradient(ellipse at 50% 10%, #1a3a5c 0%, #0e1a28 50%, #040a10 100%)",
  },
  {
    id: "s2", name: "Pappy Van Winkle 23yr", brand: "OLD RIP VAN WINKLE", category: "SPIRIT",
    qty: 3, par: 6, price: 340, origin: "Buffalo Trace, Kentucky",
    gradient: "linear-gradient(135deg, #1a1006 0%, #100a02 50%, #080600 100%)",
    accentColor: "#c88c20",
    presetBg: "radial-gradient(ellipse at 40% 0%, #5c3a08 0%, #1a1006 50%, #080600 100%)",
  },
  {
    id: "w1", name: "Opus One 2020", brand: "OPUS ONE", category: "WINE",
    qty: 18, par: 24, price: 120, origin: "Oakville, Napa Valley",
    gradient: "linear-gradient(135deg, #180a1e 0%, #0e0612 50%, #080408 100%)",
    accentColor: "#9b59b6",
    presetBg: "radial-gradient(ellipse at 60% 20%, #3a1050 0%, #180a1e 50%, #080408 100%)",
  },
  {
    id: "w2", name: "Château Pétrus 2016", brand: "POMEROL ESTATE", category: "WINE",
    qty: 4, par: 12, price: 280, origin: "Pomerol, Bordeaux",
    gradient: "linear-gradient(135deg, #1e0a14 0%, #140610 50%, #0c0408 100%)",
    accentColor: "#c0406a",
    presetBg: "radial-gradient(ellipse at 30% 10%, #5c1830 0%, #1e0a14 50%, #0c0408 100%)",
  },
];

// ── SVG Charts ────────────────────────────────────────────────────────────────

const HOURLY = [12, 18, 9, 24, 31, 28, 40, 52, 47, 38, 55, 61];
const CW = 290; const CH = 90;

function SalesLineChart() {
  const max = Math.max(...HOURLY);
  const pts = HOURLY.map((v, i) => {
    const x = (i / (HOURLY.length - 1)) * CW;
    const y = CH - (v / max) * CH * 0.88 - 4;
    return `${x},${y}`;
  }).join(" ");
  const area =
    `0,${CH} ` +
    HOURLY.map((v, i) => {
      const x = (i / (HOURLY.length - 1)) * CW;
      const y = CH - (v / max) * CH * 0.88 - 4;
      return `${x},${y}`;
    }).join(" ") +
    ` ${CW},${CH}`;
  return (
    <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffb300" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#ffb300" stopOpacity="0"    />
        </linearGradient>
        <filter id="gl">
          <feGaussianBlur stdDeviation="2.5" result="cb" />
          <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points={area} fill="url(#lg)" />
      <polyline points={pts} fill="none" stroke="#ffb300" strokeWidth="3" strokeLinejoin="round" filter="url(#gl)" />
      {HOURLY.map((v, i) => {
        const x = (i / (HOURLY.length - 1)) * CW;
        const y = CH - (v / max) * CH * 0.88 - 4;
        return <circle key={i} cx={x} cy={y} r="4" fill="#ffb300" filter="url(#gl)" />;
      })}
    </svg>
  );
}

const DONUT_DATA = [
  { label: "SECO",   value: 40, color: "#ffb300" },
  { label: "VISO",   value: 35, color: "#e8860a" },
  { label: "LIGERO", value: 25, color: "#a05a04" },
];
function DonutChart() {
  const R = 46; const CX = 58; const CY = 58; const inset = 18;
  const total = DONUT_DATA.reduce((s, d) => s + d.value, 0);
  let off = -90;
  const segs = DONUT_DATA.map(d => {
    const angle = (d.value / total) * 360;
    const s = off; off += angle;
    const rad = (a: number) => (a * Math.PI) / 180;
    return {
      ...d, angle,
      x1: CX + R * Math.cos(rad(s)),      y1: CY + R * Math.sin(rad(s)),
      x2: CX + R * Math.cos(rad(s + angle)), y2: CY + R * Math.sin(rad(s + angle)),
      large: angle > 180 ? 1 : 0,
    };
  });
  return (
    <svg width={116} height={116} viewBox="0 0 116 116">
      <defs>
        <filter id="gd">
          <feGaussianBlur stdDeviation="2" result="cb" />
          <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {segs.map(s => (
        <path key={s.label} filter="url(#gd)" opacity={0.92}
          d={`M ${CX} ${CY} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`}
          fill={s.color}
        />
      ))}
      <circle cx={CX} cy={CY} r={R - inset} fill="#080808" />
      <text x={CX} y={CY + 5} textAnchor="middle" fill="#ffb300"
        fontSize="10" fontWeight="900" fontFamily="monospace">BLEND</text>
    </svg>
  );
}

// ── Product image silhouettes ──────────────────────────────────────────────────

function CigarSilhouette({ color }: { color: string }) {
  return (
    <div className="flex items-end justify-center gap-1.5 pb-2">
      {[72, 88, 96, 88, 72].map((h, i) => (
        <div key={i} className="rounded-full" style={{
          width: 7, height: h,
          background: `linear-gradient(180deg, ${color} 0%, ${color}55 60%, ${color}22 100%)`,
          boxShadow: `0 0 10px ${color}66`,
        }} />
      ))}
    </div>
  );
}

function SpiritSilhouette({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center justify-end pb-1" style={{ height: 110 }}>
      {/* Stopper */}
      <div className="rounded-full mb-0.5" style={{ width: 12, height: 10, background: color, boxShadow: `0 0 8px ${color}` }} />
      {/* Neck */}
      <div className="rounded-t-xl" style={{ width: 14, height: 22, background: `linear-gradient(180deg, ${color}cc 0%, ${color}88 100%)` }} />
      {/* Shoulder */}
      <div style={{ width: 32, height: 10, background: `linear-gradient(180deg, ${color}88 0%, ${color}aa 100%)`, borderRadius: "40% 40% 0 0" }} />
      {/* Body */}
      <div className="rounded-b-2xl" style={{
        width: 44, height: 64,
        background: `linear-gradient(135deg, ${color}55 0%, ${color}cc 40%, ${color}44 100%)`,
        boxShadow: `0 0 24px ${color}55`,
      }} />
    </div>
  );
}

function WineSilhouette({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center justify-end pb-1" style={{ height: 110 }}>
      {/* Cork */}
      <div className="rounded-t-full" style={{ width: 10, height: 12, background: "#8B6914" }} />
      {/* Long neck */}
      <div style={{ width: 11, height: 38, background: `linear-gradient(180deg, ${color}99 0%, ${color}cc 100%)` }} />
      {/* Shoulder flare */}
      <div style={{ width: 34, height: 12, background: `linear-gradient(180deg, ${color}aa 0%, ${color}cc 100%)`, borderRadius: "50% 50% 0 0" }} />
      {/* Body */}
      <div className="rounded-b-3xl" style={{
        width: 40, height: 54,
        background: `linear-gradient(135deg, ${color}44 0%, ${color}cc 45%, ${color}33 100%)`,
        boxShadow: `0 0 20px ${color}44`,
      }} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type CategoryFilter = "ALL" | "CIGAR" | "SPIRIT" | "WINE";

export default function AssetVault() {
  const [, navigate]       = useLocation();
  const [filter,           setFilter]      = useState<CategoryFilter>("ALL");
  const [expandedId,       setExpandedId]  = useState<string | null>(null);
  const [uploadedImages,   setUploadedImages] = useState<Record<string, string>>({});
  const [uploadHover,      setUploadHover] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const visible = filter === "ALL" ? STOCK : STOCK.filter(s => s.category === filter);

  function triggerUpload(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    fileInputRefs.current[id]?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setUploadedImages(prev => ({ ...prev, [id]: result }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearImage(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setUploadedImages(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-black select-none">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 border-b-2 border-[#1c1c1c] bg-[#060606]"
        style={{ minHeight: 72 }}>
        <div className="flex items-center gap-5">
          <button onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#d4af37] font-mono font-black text-xl tracking-widest border border-[#d4af37]/35 rounded-xl px-5 py-2.5 hover:bg-[#d4af37]/10 transition-all active:scale-95">
            <ArrowLeft size={20} /> BACK
          </button>
          <div>
            <span className="text-[#d4af37] font-mono font-black text-4xl tracking-widest">[ ASSET VAULT ]</span>
            <span className="text-[#444] font-mono text-2xl ml-4 tracking-widest">LIVE INVENTORY LEDGER</span>
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
              className={`font-mono font-black text-xl tracking-widest px-5 py-2.5 rounded-xl border transition-all ${
                filter === f
                  ? "border-[#ffb300] text-[#ffb300] bg-[#ffb300]/10"
                  : "border-[#222] text-[#444] hover:border-[#555]"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left — product grid ── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {visible.map(item => {
                const stockPct = item.qty / item.par;
                const low      = stockPct < 0.35;
                const isOpen   = expandedId === item.id;
                const imgSrc   = uploadedImages[item.id];
                const hovering = uploadHover === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="rounded-2xl border-2 overflow-hidden cursor-pointer"
                    style={{
                      background:  item.gradient,
                      borderColor: isOpen ? item.accentColor : "#252525",
                      boxShadow:   isOpen ? `0 0 32px ${item.accentColor}44` : "none",
                    }}
                  >
                    {/* ── Image zone ── */}
                    <div
                      className="relative overflow-hidden flex items-center justify-center"
                      style={{ height: 148, background: imgSrc ? "transparent" : item.presetBg }}
                      onMouseEnter={() => setUploadHover(item.id)}
                      onMouseLeave={() => setUploadHover(null)}
                    >

                      {/* Uploaded photo */}
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ filter: "brightness(0.88) contrast(1.08)" }}
                        />
                      ) : (
                        /* Preset silhouette */
                        <div className="relative z-0 flex items-center justify-center w-full h-full">
                          {item.category === "CIGAR"  && <CigarSilhouette  color={item.accentColor} />}
                          {item.category === "SPIRIT" && <SpiritSilhouette color={item.accentColor} />}
                          {item.category === "WINE"   && <WineSilhouette   color={item.accentColor} />}
                        </div>
                      )}

                      {/* Brand watermark */}
                      {!imgSrc && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="font-mono font-black text-sm tracking-[0.25em] opacity-20"
                            style={{ color: item.accentColor }}>{item.brand}</span>
                        </div>
                      )}

                      {/* Upload overlay — visible on hover or when no image */}
                      <AnimatePresence>
                        {(hovering || !imgSrc) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                            style={{ background: imgSrc ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.35)" }}
                          >
                            <motion.button
                              onClick={e => triggerUpload(e, item.id)}
                              whileTap={{ scale: 0.94 }}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-mono font-black text-base tracking-widest transition-all"
                              style={{
                                borderColor: item.accentColor,
                                color:       item.accentColor,
                                background:  "rgba(0,0,0,0.72)",
                                boxShadow:   hovering ? `0 0 18px ${item.accentColor}55` : "none",
                              }}
                            >
                              {imgSrc
                                ? <><Upload size={16} /> REPLACE IMAGE</>
                                : <><Camera size={16} /> UPLOAD PRODUCT IMAGE</>
                              }
                            </motion.button>

                            {imgSrc && (
                              <motion.button
                                onClick={e => clearImage(e, item.id)}
                                whileTap={{ scale: 0.94 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black text-sm tracking-widest text-red-500 border-red-800/50 bg-black/60 hover:bg-red-900/30 transition-all"
                              >
                                <X size={13} /> CLEAR IMAGE
                              </motion.button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Low-stock pulse */}
                      {low && (
                        <motion.div
                          animate={{ opacity: [1, 0.35, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="absolute top-2 right-2 z-10 bg-red-900/85 border border-red-600/60 text-red-400 font-mono font-black text-sm tracking-widest px-2.5 py-1 rounded-lg pointer-events-none"
                        >
                          LOW STOCK
                        </motion.div>
                      )}

                      {/* Hidden file input */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => { fileInputRefs.current[item.id] = el; }}
                        onChange={e => handleFileChange(e, item.id)}
                        className="hidden"
                      />
                    </div>

                    {/* ── Card body ── */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="font-mono font-black text-sm tracking-widest"
                            style={{ color: item.accentColor }}>{item.brand}</span>
                          <h3 className="text-white font-sans font-black text-2xl tracking-wide leading-tight mt-1">{item.name}</h3>
                          <p className="text-[#3a3a3a] font-mono text-base tracking-wide mt-1">{item.origin}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-4xl" style={{ color: "#ffb300" }}>{item.qty}</span>
                          <p className="text-[#444] font-mono text-base mt-0.5">/ {item.par} par</p>
                        </div>
                      </div>

                      {/* Stock bar */}
                      <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stockPct * 100}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{
                            background: low ? "#c0250a" : item.accentColor,
                            boxShadow:  `0 0 10px ${item.accentColor}88`,
                          }}
                        />
                      </div>

                      {/* Expanded metrics */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="mt-5 pt-5 border-t grid grid-cols-3 gap-2 overflow-hidden"
                            style={{ borderColor: `${item.accentColor}30` }}
                          >
                            {[
                              { label: "UNIT PRICE",    value: `$${item.price.toFixed(2)}`              },
                              { label: "LEDGER VALUE",  value: `$${(item.price * item.qty).toFixed(2)}` },
                              { label: "STATUS",        value: low ? "REORDER" : "OK",
                                cls: low ? "text-red-500" : "text-emerald-400" },
                            ].map(m => (
                              <div key={m.label} className="text-center">
                                <p className="text-[#444] font-mono text-xs tracking-widest mb-1">{m.label}</p>
                                <p className={`font-mono font-black text-2xl ${m.cls ?? ""}`}
                                  style={!m.cls ? { color: "#ffb300" } : {}}>
                                  {m.value}
                                </p>
                              </div>
                            ))}
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

        {/* ── Right — charts sidebar ── */}
        <div className="w-84 border-l-2 border-[#141414] bg-[#070707] flex flex-col overflow-y-auto"
          style={{ width: 320 }}>

          {/* Sales Curve */}
          <div className="p-6 border-b border-[#141414]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={22} className="text-[#ffb300]" />
              <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest">SALES CURVE</h3>
            </div>
            <p className="text-[#333] font-mono text-base tracking-widest mb-4">HOURLY SOMMELIER TRANSACTIONS</p>
            <SalesLineChart />
            <div className="flex justify-between mt-3">
              {["12A","","4","","8","","12P","","4","","8",""].map((h, i) => (
                h ? <span key={i} className="text-[#2a2a2a] font-mono text-xs">{h}</span> : null
              ))}
            </div>
          </div>

          {/* Leaf Velocity */}
          <div className="p-6 border-b border-[#141414]">
            <div className="flex items-center gap-2 mb-3">
              <Package2 size={22} className="text-[#ffb300]" />
              <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest">LEAF VELOCITY</h3>
            </div>
            <p className="text-[#333] font-mono text-base tracking-widest mb-4">MANUFACTURING BLEND DISTRIBUTION</p>
            <div className="flex items-center gap-5">
              <DonutChart />
              <div className="flex flex-col gap-4">
                {DONUT_DATA.map(d => (
                  <div key={d.label} className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ background: d.color, boxShadow: `0 0 10px ${d.color}` }} />
                    <div>
                      <p className="text-white font-mono font-black text-lg leading-none">{d.label}</p>
                      <p className="font-mono font-black text-xl leading-none mt-0.5"
                        style={{ color: d.color }}>{d.value}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vault metrics */}
          <div className="p-6 flex flex-col gap-3">
            <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest mb-1">VAULT METRICS</h3>
            {[
              { label: "TOTAL SKUs",       value: String(STOCK.length) },
              { label: "TOTAL ITEMS",      value: String(STOCK.reduce((s, i) => s + i.qty, 0)) },
              { label: "VAULT VALUE",      value: `$${STOCK.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}` },
              { label: "LOW STOCK ALERTS", value: String(STOCK.filter(i => i.qty / i.par < 0.35).length) },
            ].map(m => (
              <div key={m.label} className="flex justify-between items-center py-3 border-b border-[#141414]">
                <span className="text-[#444] font-mono font-bold text-base tracking-widest">{m.label}</span>
                <span className="text-[#ffb300] font-mono font-black text-3xl">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
