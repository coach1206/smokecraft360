/**
 * EATConsole — Unified E.A.T. (Environment · Asset · Transaction) Console
 * Routes: /inventory  /environment  /transaction  (all funnel here via defaultTab)
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, Upload, X, Zap, Map,
  TrendingUp, Package2, Trash2, CheckCircle2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "ASSET" | "ENVIRONMENT" | "TRANSACTION";
type AssetCategory = "CIGAR" | "SPIRIT" | "WINE";
type CategoryFilter = "ALL" | AssetCategory;
type AssetType = "CIRCULAR TABLE" | "SQUARE BOOTH" | "VIP LOUNGE COUCH" | "MAIN BAR MODULE";

interface StockItem {
  id: string; name: string; brand: string; category: AssetCategory;
  qty: number; par: number; price: number; origin: string;
  gradient: string; accentColor: string; presetBg: string;
}

interface FloorItem {
  id: string; type: AssetType; x: number; y: number; label: string; seats: number;
}

interface CartLine { item: StockItem; qty: number; }

// ── Stock data ─────────────────────────────────────────────────────────────────

const STOCK: StockItem[] = [
  { id: "c1", name: "1926 Serie No. 6",       brand: "PADRÓN",             category: "CIGAR",
    qty: 24, par: 48, price: 45,  origin: "Jalapa, Nicaragua",
    gradient: "linear-gradient(135deg,#2a1a06 0%,#0e0802 100%)",
    accentColor: "#d4840a", presetBg: "radial-gradient(ellipse at 30% 20%,#5c3a0e 0%,#0e0802 100%)" },
  { id: "c2", name: "Fuente Fuente Opus X",    brand: "ARTURO FUENTE",      category: "CIGAR",
    qty: 11, par: 36, price: 65,  origin: "Chateau de la Fuente, D.R.",
    gradient: "linear-gradient(135deg,#1e0a0a 0%,#0c0404 100%)",
    accentColor: "#c0250a", presetBg: "radial-gradient(ellipse at 70% 30%,#6b1a10 0%,#0c0404 100%)" },
  { id: "s1", name: "Macallan 18yr Sherry Oak", brand: "THE MACALLAN",      category: "SPIRIT",
    qty: 6,  par: 12, price: 220, origin: "Speyside, Scotland",
    gradient: "linear-gradient(135deg,#0e1a28 0%,#040a10 100%)",
    accentColor: "#4a90d9", presetBg: "radial-gradient(ellipse at 50% 10%,#1a3a5c 0%,#040a10 100%)" },
  { id: "s2", name: "Pappy Van Winkle 23yr",   brand: "OLD RIP VAN WINKLE", category: "SPIRIT",
    qty: 3,  par: 6,  price: 340, origin: "Buffalo Trace, Kentucky",
    gradient: "linear-gradient(135deg,#1a1006 0%,#080600 100%)",
    accentColor: "#c88c20", presetBg: "radial-gradient(ellipse at 40% 0%,#5c3a08 0%,#080600 100%)" },
  { id: "w1", name: "Opus One 2020",           brand: "OPUS ONE",           category: "WINE",
    qty: 18, par: 24, price: 120, origin: "Oakville, Napa Valley",
    gradient: "linear-gradient(135deg,#180a1e 0%,#080408 100%)",
    accentColor: "#9b59b6", presetBg: "radial-gradient(ellipse at 60% 20%,#3a1050 0%,#080408 100%)" },
  { id: "w2", name: "Château Pétrus 2016",     brand: "POMEROL ESTATE",     category: "WINE",
    qty: 4,  par: 12, price: 280, origin: "Pomerol, Bordeaux",
    gradient: "linear-gradient(135deg,#1e0a14 0%,#0c0408 100%)",
    accentColor: "#c0406a", presetBg: "radial-gradient(ellipse at 30% 10%,#5c1830 0%,#0c0408 100%)" },
];

const ASSET_META: Record<AssetType, { icon: string; color: string }> = {
  "CIRCULAR TABLE":   { icon: "⬤", color: "#d4af37" },
  "SQUARE BOOTH":     { icon: "■", color: "#c0a030" },
  "VIP LOUNGE COUCH": { icon: "▬", color: "#ffb300" },
  "MAIN BAR MODULE":  { icon: "═", color: "#e8c040" },
};
const ASSET_TYPES: AssetType[] = ["CIRCULAR TABLE","SQUARE BOOTH","VIP LOUNGE COUCH","MAIN BAR MODULE"];

const HOURLY = [12,18,9,24,31,28,40,52,47,38,55,61];
const LEAF   = [{ label:"SECO",value:40,color:"#ffb300" },{ label:"VISO",value:35,color:"#e8860a" },{ label:"LIGERO",value:25,color:"#a05a04" }];

// ── Audio ──────────────────────────────────────────────────────────────────────

function playClick() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 3400;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09);
  } catch { /* silent */ }
}

// ── Silhouettes ────────────────────────────────────────────────────────────────

function CigarSVG({ c }: { c: string }) {
  return (
    <div className="flex items-end justify-center gap-1.5 pb-2 opacity-70">
      {[68,82,92,82,68].map((h,i) => (
        <div key={i} className="rounded-full" style={{ width:7, height:h,
          background:`linear-gradient(180deg,${c} 0%,${c}44 100%)`,
          boxShadow:`0 0 10px ${c}66` }} />
      ))}
    </div>
  );
}
function SpiritSVG({ c }: { c: string }) {
  return (
    <div className="flex flex-col items-center justify-end pb-1" style={{ height:108 }}>
      <div className="rounded-full mb-0.5" style={{ width:12, height:10, background:c, boxShadow:`0 0 8px ${c}` }} />
      <div className="rounded-t-xl" style={{ width:14, height:22, background:`linear-gradient(180deg,${c}cc 0%,${c}88 100%)` }} />
      <div style={{ width:32, height:10, background:`linear-gradient(180deg,${c}88 0%,${c}aa 100%)`, borderRadius:"40% 40% 0 0" }} />
      <div className="rounded-b-2xl" style={{ width:44, height:60, background:`linear-gradient(135deg,${c}55 0%,${c}cc 40%,${c}44 100%)`, boxShadow:`0 0 24px ${c}55` }} />
    </div>
  );
}
function WineSVG({ c }: { c: string }) {
  return (
    <div className="flex flex-col items-center justify-end pb-1" style={{ height:108 }}>
      <div className="rounded-t-full" style={{ width:10, height:12, background:"#8B6914" }} />
      <div style={{ width:11, height:36, background:`linear-gradient(180deg,${c}99 0%,${c}cc 100%)` }} />
      <div style={{ width:34, height:12, background:`linear-gradient(180deg,${c}aa 0%,${c}cc 100%)`, borderRadius:"50% 50% 0 0" }} />
      <div className="rounded-b-3xl" style={{ width:40, height:52, background:`linear-gradient(135deg,${c}44 0%,${c}cc 45%,${c}33 100%)`, boxShadow:`0 0 20px ${c}44` }} />
    </div>
  );
}

// ── Mini SVG line chart ────────────────────────────────────────────────────────

function SalesChart() {
  const W=280; const H=80; const max=Math.max(...HOURLY);
  const pts=HOURLY.map((v,i)=>{ const x=(i/(HOURLY.length-1))*W; const y=H-(v/max)*H*0.88-4; return `${x},${y}`; }).join(" ");
  const area=`0,${H} `+HOURLY.map((v,i)=>{ const x=(i/(HOURLY.length-1))*W; const y=H-(v/max)*H*0.88-4; return `${x},${y}`; }).join(" ")+` ${W},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id="slg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffb300" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffb300" stopOpacity="0"   />
        </linearGradient>
        <filter id="sg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <polygon points={area} fill="url(#slg)" />
      <polyline points={pts} fill="none" stroke="#ffb300" strokeWidth="2.5" strokeLinejoin="round" filter="url(#sg)" />
      {HOURLY.map((v,i)=>{ const x=(i/(HOURLY.length-1))*W; const y=H-(v/max)*H*0.88-4; return <circle key={i} cx={x} cy={y} r="3.5" fill="#ffb300" filter="url(#sg)" />; })}
    </svg>
  );
}

// ── Main console ───────────────────────────────────────────────────────────────

// ── Ambient background layer ───────────────────────────────────────────────────

function AmbientBG() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Deep scan-line overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 4px)",
        backgroundSize: "100% 4px",
      }} />
      {/* Primary amber orb — top-right */}
      <motion.div
        animate={{ scale:[1,1.2,1], opacity:[0.55,0.82,0.55], x:[0,30,0], y:[0,-22,0] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut" }}
        className="absolute"
        style={{ right:"-6%", top:"-14%", width:700, height:700,
          background:"radial-gradient(circle, rgba(212,155,10,0.70) 0%, rgba(180,100,5,0.30) 40%, transparent 72%)",
          filter:"blur(55px)", mixBlendMode:"screen" }}
      />
      {/* Deep ember orb — bottom-left */}
      <motion.div
        animate={{ scale:[1,1.25,1], opacity:[0.45,0.70,0.45], x:[0,-34,0], y:[0,28,0] }}
        transition={{ duration:12, repeat:Infinity, ease:"easeInOut", delay:3.2 }}
        className="absolute"
        style={{ left:"-12%", bottom:"-16%", width:800, height:800,
          background:"radial-gradient(circle, rgba(200,80,5,0.55) 0%, rgba(140,50,0,0.25) 45%, transparent 72%)",
          filter:"blur(60px)", mixBlendMode:"screen" }}
      />
      {/* Mid-field whisper — centre */}
      <motion.div
        animate={{ opacity:[0.20,0.40,0.20], scale:[1,1.08,1] }}
        transition={{ duration:7, repeat:Infinity, ease:"easeInOut", delay:1.5 }}
        className="absolute inset-0"
        style={{ background:"radial-gradient(ellipse 55% 40% at 52% 50%, rgba(212,155,10,0.28) 0%, transparent 78%)" }}
      />
      {/* Soft third orb — top-left accent */}
      <motion.div
        animate={{ scale:[1,1.15,1], opacity:[0.25,0.42,0.25], x:[0,18,0] }}
        transition={{ duration:11, repeat:Infinity, ease:"easeInOut", delay:5 }}
        className="absolute"
        style={{ left:"-5%", top:"15%", width:450, height:450,
          background:"radial-gradient(circle, rgba(255,180,30,0.35) 0%, transparent 68%)",
          filter:"blur(45px)", mixBlendMode:"screen" }}
      />
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.10]"
        style={{ backgroundImage:"radial-gradient(rgba(212,175,55,0.9) 1px, transparent 1px)", backgroundSize:"30px 30px" }} />
      {/* Vertical column lines — lounge panelling */}
      <div className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage:"repeating-linear-gradient(90deg, #d4af37 0px, #d4af37 1px, transparent 1px, transparent 110px)" }} />
    </div>
  );
}

export default function EATConsole({ defaultTab = "ASSET" }: { defaultTab?: Tab }) {
  const [, navigate]      = useLocation();
  const [tab,             setTab]           = useState<Tab>(defaultTab);
  // ASSET state
  const [filter,          setFilter]        = useState<CategoryFilter>("ALL");
  const [expandedId,      setExpandedId]    = useState<string | null>(null);
  const [uploadedImages,  setUploadedImages] = useState<Record<string, string>>({});
  const [imgHover,        setImgHover]      = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // ENVIRONMENT state
  const [tables,          setTables]        = useState<FloorItem[]>([]);
  const [activeFloorId,   setActiveFloorId] = useState<string | null>(null);
  const [drawerTable,     setDrawerTable]   = useState<FloorItem | null>(null);
  const [isDragOver,      setIsDragOver]    = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  // TRANSACTION state
  const [cart,            setCart]          = useState<CartLine[]>([]);
  const [tableNum,        setTableNum]      = useState("01");
  const [confirmed,       setConfirmed]     = useState(false);

  // ── ASSET handlers ────────────────────────────────────────────────────────

  function triggerUpload(e: React.MouseEvent, id: string) {
    e.stopPropagation(); fileRefs.current[id]?.click();
  }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { const s = ev.target?.result; if (typeof s === "string") setUploadedImages(p => ({ ...p, [id]: s })); };
    r.readAsDataURL(f); e.target.value = "";
  }
  function clearImg(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setUploadedImages(p => { const n = { ...p }; delete n[id]; return n; });
  }

  // ── ENVIRONMENT handlers ──────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false);
    const type = e.dataTransfer.getData("assetType") as AssetType;
    if (!type || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left - 56, rect.width  - 128));
    const y = Math.max(0, Math.min(e.clientY - rect.top  - 56, rect.height - 128));
    const n = tables.length + 1;
    const id = `tbl_${Date.now()}`;
    const label = `TABLE ${String(n).padStart(2,"0")}`;
    playClick();
    setTables(p => [...p, { id, type, x, y, label, seats: 4 }]);
    setActiveFloorId(id);
  }

  function tapFloorTable(e: React.MouseEvent, t: FloorItem) {
    e.stopPropagation(); playClick();
    setActiveFloorId(t.id); setDrawerTable(t);
  }

  function goToTransaction(t: FloorItem) {
    playClick();
    const num = t.label.replace("TABLE ","").trim();
    setTableNum(num.padStart(2,"0"));
    setDrawerTable(null);
    setTab("TRANSACTION");
  }

  // ── TRANSACTION handlers ──────────────────────────────────────────────────

  function addToCart(s: StockItem) {
    playClick();
    setCart(p => { const ex = p.find(l => l.item.id === s.id); return ex ? p.map(l => l.item.id === s.id ? { ...l, qty: l.qty+1 } : l) : [...p, { item:s, qty:1 }]; });
  }
  function decCart(id: string) { setCart(p => p.flatMap(l => l.item.id !== id ? [l] : l.qty<=1 ? [] : [{ ...l, qty:l.qty-1 }])); }
  function delCart(id: string) { setCart(p => p.filter(l => l.item.id !== id)); }

  const subtotal = cart.reduce((s,l) => s + l.item.price * l.qty, 0);
  const tax      = subtotal * 0.0875;
  const total    = subtotal + tax;

  function authorize() {
    if (!cart.length) return; playClick();
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); setCart([]); }, 2800);
  }

  // ── Shared header ─────────────────────────────────────────────────────────

  const TAB_LABELS: Record<Tab, string> = { ASSET:"ASSET VAULT", ENVIRONMENT:"ENV DESIGNER", TRANSACTION:"TRANSACTION" };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#060607] text-white overflow-hidden select-none">
      <AmbientBG />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 border-b-2 border-[#181820] bg-[#08080B]/95 backdrop-blur-md relative z-10"
        style={{ minHeight: 70, flexShrink: 0 }}>
        <div className="flex items-center gap-6">
          {/* Back */}
          <button onClick={() => navigate("/craft-hub")}
            className="flex items-center gap-2 text-[#d4af37] font-mono font-black text-lg tracking-widest border border-[#d4af37]/30 rounded-xl px-5 py-2.5 hover:bg-[#d4af37]/08 transition-all active:scale-95">
            <ArrowLeft size={18}/> BACK
          </button>
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.6, repeat:Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_#d4af3799]" />
            <span className="text-[#d4af37] font-mono font-black text-2xl tracking-[0.25em]">SMOKECRAFT 360</span>
            <span className="text-[#333] font-mono text-xl tracking-widest">// E.A.T. CONSOLE</span>
          </div>
          {/* Tabs */}
          <nav className="flex gap-1 bg-black/50 p-1 rounded-xl border border-[#1a1a22]">
            {(["ASSET","ENVIRONMENT","TRANSACTION"] as Tab[]).map(t => (
              <button key={t} onClick={() => { playClick(); setTab(t); }}
                className={`px-5 py-2 font-mono font-black text-sm tracking-widest rounded-lg transition-all ${
                  tab === t
                    ? "bg-[#15151e] text-[#d4af37] border border-[#2c2c3a] shadow-lg"
                    : "text-[#555566] hover:text-[#aaa] border border-transparent"
                }`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>
        <span className="text-[#252530] font-mono text-sm tracking-widest">SYSTEM CONNECTED // NODE.01</span>
      </header>

      {/* ── Module workspace ── */}
      <main className="flex-1 flex overflow-hidden relative z-10">

        {/* ════════════════════════════════════════════
            TAB 1 — ASSET VAULT
            ════════════════════════════════════════════ */}
        {tab === "ASSET" && (
          <div className="flex-1 flex overflow-hidden">

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Sub-header */}
              <div className="flex justify-between items-center mb-5 border-b border-[#151520] pb-4">
                <div>
                  <h1 className="text-[#d4af37] font-mono font-black text-4xl tracking-widest">[ ASSET VAULT ]</h1>
                  <p className="text-[#444] font-mono text-lg mt-1 tracking-wide">Live luxury inventory ledger · tap to expand · upload product photos</p>
                </div>
                <div className="flex gap-2">
                  {(["ALL","CIGAR","SPIRIT","WINE"] as CategoryFilter[]).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`font-mono font-black text-lg tracking-widest px-4 py-2 rounded-xl border transition-all ${
                        filter === f ? "border-[#ffb300] text-[#ffb300] bg-[#ffb300]/10" : "border-[#222] text-[#444] hover:border-[#555]"
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {(filter === "ALL" ? STOCK : STOCK.filter(s => s.category === filter)).map(item => {
                    const low  = item.qty / item.par < 0.35;
                    const img  = uploadedImages[item.id];
                    const ledger = item.price * item.qty;
                    return (
                      <motion.div key={item.id} layout
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
                        whileHover={{ borderColor:`${item.accentColor}40` }}
                        transition={{ type:"spring", stiffness:320, damping:28 }}
                        className="rounded-2xl overflow-hidden relative"
                        style={{ background:"#0C0C10", border:"1px solid #16161F",
                          boxShadow:"0 4px 24px rgba(0,0,0,0.55)", transition:"border-color 0.3s" }}
                      >
                        {/* Ambient glow corner */}
                        <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                          style={{ background:`radial-gradient(circle at top right, ${item.accentColor}08 0%, transparent 70%)` }} />

                        <div className="p-5">
                          {/* Header: brand + status */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <span className="block font-mono font-bold text-[9px] tracking-[0.22em] mb-1"
                                style={{ color:"rgba(212,175,55,0.55)", textTransform:"uppercase" }}>{item.brand}</span>
                              <h3 className="font-bold text-white leading-tight" style={{ fontSize:14, letterSpacing:"0.04em" }}>{item.name}</h3>
                              <p className="mt-0.5" style={{ fontSize:11, color:"#525261" }}>{item.origin}</p>
                            </div>
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                              style={{
                                letterSpacing:"0.14em",
                                border:`1px solid ${low?"#441C1C":"#1C3A24"}`,
                                background:low?"#2A1212":"#122417",
                                color:low?"#F46C6C":"#61E27F",
                              }}>
                              {low ? "LOW STOCK" : "OK"}
                            </span>
                          </div>

                          {/* Silhouette box */}
                          <div className="relative rounded-xl overflow-hidden flex items-center justify-center mb-4"
                            style={{ height:112, background:"rgba(0,0,0,0.40)", border:"1px solid #16161F" }}>
                            {img
                              ? <img src={img} alt={item.name} className="absolute inset-0 w-full h-full object-cover"
                                  style={{ filter:"brightness(0.85) contrast(1.08)" }} />
                              : <motion.div animate={{ opacity:[0.7,1,0.7] }} transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }}
                                  className="flex items-end justify-center gap-1.5 pb-2">
                                  {item.category==="CIGAR"  && <CigarSVG  c={item.accentColor}/>}
                                  {item.category==="SPIRIT" && <SpiritSVG c={item.accentColor}/>}
                                  {item.category==="WINE"   && <WineSVG   c={item.accentColor}/>}
                                </motion.div>
                            }
                            <span className="absolute bottom-1.5 left-0 right-0 text-center font-mono"
                              style={{ fontSize:8, color:"#3A3A47", letterSpacing:"0.20em", textTransform:"uppercase" }}>
                              MICROCLIMATE MATRIX CORE
                            </span>
                            {/* Tiny upload corner */}
                            <button onClick={e => triggerUpload(e, item.id)}
                              className="absolute top-1.5 right-1.5 font-mono"
                              style={{ background:"rgba(0,0,0,0.72)", border:"1px solid #1A1A22", borderRadius:6,
                                padding:"2px 7px", cursor:"pointer", fontSize:8, color:"#444452",
                                letterSpacing:"0.12em", textTransform:"uppercase" }}>
                              {img ? "SWAP" : "UPLOAD"}
                            </button>
                            <input type="file" accept="image/*" className="hidden"
                              ref={el => { fileRefs.current[item.id] = el; }}
                              onChange={e => handleFile(e, item.id)} />
                          </div>

                          {/* Origin / specifications */}
                          <p className="font-mono italic mb-4" style={{ fontSize:11, color:"#6C6C7D", lineHeight:1.5 }}>
                            {item.category === "CIGAR"  ? "Premium leaf · Aged reserve · Hand-rolled"   :
                             item.category === "SPIRIT" ? "Single cask · Master distillery selection"   :
                                                          "Grand cru · Estate bottled · Limited vintage"}
                          </p>

                          {/* Data blocks */}
                          <div className="grid grid-cols-3 gap-1.5 pt-3" style={{ borderTop:"1px solid #14141A" }}>
                            {[
                              { label:"VALUATION", value:`$${item.price.toFixed(2)}`, gold:true  },
                              { label:"STOCKS",    value:`${item.qty} / ${item.par}`, gold:false },
                              { label:"LEDGER",    value:`$${ledger.toFixed(0)}`,     gold:false },
                            ].map(b => (
                              <div key={b.label} className="text-center rounded" style={{
                                background:"rgba(0,0,0,0.30)", padding:"7px 4px", border:"1px solid #121217" }}>
                                <span className="block font-mono text-[8px] mb-1"
                                  style={{ letterSpacing:"0.18em", color:"#444452", textTransform:"uppercase" }}>{b.label}</span>
                                <span className="font-mono font-bold" style={{ fontSize:12, color:b.gold?"#D4AF37":"#FFFFFF" }}>
                                  {b.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Sidebar charts */}
            <div className="w-80 border-l-2 border-[#121218] bg-[#070709]/80 flex flex-col overflow-y-auto backdrop-blur-sm">
              <div className="p-6 border-b border-[#121218]">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={20} className="text-[#ffb300]"/>
                  <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest">SALES CURVE</h3>
                </div>
                <p className="text-[#2a2a2a] font-mono text-sm tracking-widest mb-4">HOURLY SOMMELIER TRANSACTIONS</p>
                <SalesChart />
              </div>
              <div className="p-6 border-b border-[#121218]">
                <div className="flex items-center gap-2 mb-3">
                  <Package2 size={20} className="text-[#ffb300]"/>
                  <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest">LEAF VELOCITY</h3>
                </div>
                <div className="space-y-3 mt-4">
                  {LEAF.map(d => (
                    <div key={d.label}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-white font-mono font-black text-lg">{d.label}</span>
                        <span className="font-mono font-black text-xl" style={{ color:d.color }}>{d.value}%</span>
                      </div>
                      <div className="w-full bg-[#111] rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${d.value}%`, background:d.color, boxShadow:`0 0 8px ${d.color}88` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <h3 className="text-[#ffb300] font-mono font-black text-xl tracking-widest mb-1">VAULT METRICS</h3>
                {[
                  { l:"TOTAL SKUs",       v:String(STOCK.length) },
                  { l:"TOTAL ITEMS",      v:String(STOCK.reduce((s,i)=>s+i.qty,0)) },
                  { l:"VAULT VALUE",      v:`$${STOCK.reduce((s,i)=>s+i.qty*i.price,0).toLocaleString()}` },
                  { l:"LOW STOCK ALERTS", v:String(STOCK.filter(i=>i.qty/i.par<0.35).length) },
                ].map(m => (
                  <div key={m.l} className="flex justify-between items-center py-3 border-b border-[#141414]">
                    <span className="text-[#444] font-mono font-bold text-sm tracking-widest">{m.l}</span>
                    <span className="text-[#ffb300] font-mono font-black text-3xl">{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB 2 — ENVIRONMENT DESIGNER
            ════════════════════════════════════════════ */}
        {tab === "ENVIRONMENT" && (
          <div className="flex-1 flex overflow-hidden">

            {/* Component drawer */}
            <aside className="w-[34%] flex flex-col border-r-2 border-[#141418] bg-[#07070A]/80 overflow-y-auto backdrop-blur-sm">
              <div className="p-6 border-b border-[#141418]">
                <h2 className="text-[#d4af37] font-mono font-black text-4xl tracking-widest mb-2">ENV DESIGNER</h2>
                <p className="text-[#444] font-mono text-lg leading-relaxed">Drag components onto the grid · tap a placed table to open the passthrough drawer.</p>
              </div>
              <div className="flex flex-col gap-4 p-5">
                {ASSET_TYPES.map(type => {
                  const meta = ASSET_META[type];
                  return (
                    <div key={type} draggable onDragStart={e => e.dataTransfer.setData("assetType", type)}>
                      <motion.div
                        animate={{ boxShadow:["0 0 0px rgba(212,175,55,0)","0 0 22px rgba(212,175,55,0.35)","0 0 0px rgba(212,175,55,0)"] }}
                        transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut" }}
                        whileTap={{ scale:1.05 }} whileHover={{ scale:1.02 }}
                        className="flex items-center justify-between bg-[#0c0c10] border-2 border-[#202028] rounded-2xl px-6 py-5 cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-5">
                          <span className="text-4xl" style={{ color:meta.color }}>{meta.icon}</span>
                          <div>
                            <span className="text-white font-mono font-black text-xl tracking-wide block">{type}</span>
                            <span className="text-[#444] font-mono text-sm tracking-widest">DRAG TO GRID</span>
                          </div>
                        </div>
                        <motion.span animate={{ rotate:[0,180,360] }} transition={{ duration:4, repeat:Infinity, ease:"linear" }}
                          className="text-3xl font-black" style={{ color:meta.color }}>+</motion.span>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
              {/* Active table editor */}
              <AnimatePresence>
                {tables.find(t => t.id === activeFloorId) && (() => {
                  const t = tables.find(t => t.id === activeFloorId)!;
                  return (
                    <motion.div key={t.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }}
                      className="mx-5 mb-5 mt-auto bg-[#0c0c10] border-2 border-[#d4af37]/20 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-mono font-black text-2xl tracking-widest">PARAMETERS</h3>
                        <button onClick={() => { setTables(p => p.filter(x => x.id !== t.id)); setActiveFloorId(null); setDrawerTable(null); }}
                          className="flex items-center gap-2 text-red-500 font-mono font-black text-sm border border-red-900/40 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-all">
                          <Trash2 size={14}/> REMOVE
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#555] font-mono font-bold text-lg">SEATS</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setTables(p => p.map(x => x.id===t.id ? {...x, seats:Math.max(1,x.seats-1)} : x))}
                            className="w-10 h-10 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37]">−</button>
                          <span className="text-[#ffb300] font-mono font-black text-3xl w-9 text-center">{t.seats}</span>
                          <button onClick={() => setTables(p => p.map(x => x.id===t.id ? {...x, seats:Math.min(20,x.seats+1)} : x))}
                            className="w-10 h-10 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37]">+</button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </aside>

            {/* Blueprint grid */}
            <div ref={gridRef}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { setActiveFloorId(null); setDrawerTable(null); }}
              className="flex-1 relative overflow-hidden"
              style={{
                background: isDragOver ? "#0a0800" : "#050507",
                backgroundImage: "radial-gradient(#18181e 1.5px, transparent 1.5px)",
                backgroundSize: "28px 28px",
                boxShadow: isDragOver ? "inset 0 0 60px rgba(212,175,55,0.08)" : "none",
              }}>
              <div className="absolute top-4 right-5 z-10 bg-black/70 px-4 py-2 border border-[#1c1c22] rounded-xl">
                <span className="text-[#444] font-mono text-lg font-bold tracking-widest">{tables.length} ELEMENTS PLACED</span>
              </div>
              {tables.length === 0 && !isDragOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                  <span className="text-[#1c1c22] font-mono font-black text-5xl tracking-widest">VENUE GRID</span>
                  <span className="text-[#202020] font-mono text-2xl tracking-widest">DRAG ELEMENTS FROM LEFT PANEL</span>
                </div>
              )}
              {isDragOver && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <motion.span animate={{ opacity:[0.4,0.9,0.4], scale:[0.97,1.03,0.97] }} transition={{ duration:1.2, repeat:Infinity }}
                    className="text-[#d4af37] font-mono font-black text-5xl tracking-widest">DROP TO PLACE</motion.span>
                </div>
              )}
              <AnimatePresence>
                {tables.map(t => {
                  const meta = ASSET_META[t.type];
                  const active = activeFloorId === t.id;
                  return (
                    <motion.div key={t.id} initial={{ scale:0.6, opacity:0 }} animate={{ scale:1, opacity:1,
                      boxShadow: active
                        ? ["0 0 20px rgba(212,175,55,0.5)","0 0 44px rgba(212,175,55,0.85)","0 0 20px rgba(212,175,55,0.5)"]
                        : "0 0 0px rgba(212,175,55,0)" }}
                      exit={{ scale:0.6, opacity:0 }}
                      transition={active ? { boxShadow:{ duration:1.2, repeat:Infinity }, scale:{ type:"spring", stiffness:400, damping:22 } } : { type:"spring", stiffness:400, damping:22 }}
                      style={{ position:"absolute", left:t.x, top:t.y }}
                      onClick={e => tapFloorTable(e, t)}
                      className={`w-32 h-32 rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 ${
                        active ? "bg-gradient-to-br from-[#1a1200] to-black border-[#ffb300]" : "bg-[#0e0e12] border-[#252525] hover:border-[#404040]"
                      }`}>
                      <span className="text-3xl mb-1" style={{ color:meta.color }}>{meta.icon}</span>
                      <span className="font-mono font-black text-base text-center px-1 leading-tight" style={{ color:"#ffb300" }}>{t.label}</span>
                      <span className="text-[#444] text-xs font-bold tracking-widest mt-1">{t.seats}✦</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Passthrough drawer */}
            <AnimatePresence>
              {drawerTable && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}
                  className="fixed inset-0 z-[9900] flex items-end justify-center"
                  style={{ background:"rgba(0,0,0,0.75)" }}
                  onClick={() => setDrawerTable(null)}>
                  <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
                    transition={{ type:"spring", stiffness:360, damping:36 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-lg bg-[#08080c] border border-[#d4af37]/20 rounded-t-3xl px-8 py-8"
                    style={{ boxShadow:"0 -16px 60px rgba(0,0,0,0.9), 0 -4px 28px rgba(212,175,55,0.12)" }}>
                    <div className="flex items-center justify-between mb-7">
                      <div>
                        <p className="text-[#444] font-mono text-sm tracking-widest uppercase">Floor Table · Active</p>
                        <h3 className="text-[#ffb300] font-mono font-black text-3xl tracking-widest mt-1">{drawerTable.label}</h3>
                        <p className="text-[#444] font-mono text-base mt-1">{drawerTable.type} · {drawerTable.seats} seats</p>
                      </div>
                      <motion.div animate={{ scale:[1,1.3,1], opacity:[1,0.5,1] }} transition={{ duration:1.1, repeat:Infinity }}
                        className="w-4 h-4 rounded-full bg-[#ffb300] shadow-[0_0_12px_#ffb30099]" />
                    </div>
                    <motion.button whileTap={{ scale:0.96 }} onClick={() => goToTransaction(drawerTable)}
                      className="w-full flex items-center justify-center gap-4 py-6 bg-gradient-to-r from-[#1a1000] to-[#0d0900] border-2 border-[#ffb300] rounded-2xl hover:bg-[#ffb300]/10 transition-all"
                      style={{ boxShadow:"0 0 30px rgba(255,179,0,0.20)" }}>
                      <Zap size={28} className="text-[#ffb300]"/>
                      <div className="text-left">
                        <p className="text-[#ffb300] font-mono font-black text-2xl tracking-widest">[ RUN IMMEDIATE TABLE TRANSACTION ]</p>
                        <p className="text-[#555] font-mono text-base mt-1">Jump to {drawerTable.label} checkout — session preserved</p>
                      </div>
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB 3 — TRANSACTION TERMINAL
            ════════════════════════════════════════════ */}
        {tab === "TRANSACTION" && (
          <div className="flex-1 flex overflow-hidden">

            {/* Product matrix */}
            <div className="w-[60%] grid grid-cols-2 gap-4 p-5 overflow-y-auto content-start border-r-2 border-[#111116]">
              {STOCK.map(s => (
                <motion.div key={s.id}
                  whileTap={{ scale:0.93 }}
                  onPointerDown={() => addToCart(s)}
                  className="h-52 rounded-2xl p-6 flex flex-col justify-between cursor-pointer border-2 transition-colors"
                  style={{ background:"#0b0b0f", borderColor:"#1c1c24" }}>
                  <div>
                    <span className={`text-sm font-black tracking-widest border rounded-lg px-3 py-1 font-mono ${
                      s.category==="CIGAR"  ? "text-amber-400 bg-amber-400/10 border-amber-400/25" :
                      s.category==="SPIRIT" ? "text-blue-400 bg-blue-400/10 border-blue-400/25" :
                                               "text-purple-400 bg-purple-400/10 border-purple-400/25"
                    }`}>{s.category}</span>
                    <h3 className="text-white font-black text-2xl tracking-wide mt-4 leading-snug">{s.name}</h3>
                    <p className="text-[#333] font-mono text-base mt-2">{s.brand}</p>
                  </div>
                  <span className="text-[#ffb300] font-mono font-black text-4xl">${s.price.toFixed(2)}</span>
                </motion.div>
              ))}
            </div>

            {/* Invoice */}
            <div className="w-[40%] flex flex-col bg-[#070709]/80 backdrop-blur-sm">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#141418]">
                <h2 className="text-[#ffb300] font-mono font-black text-2xl tracking-widest">
                  LIVE INVOICE · TABLE <input value={tableNum} onChange={e => setTableNum(e.target.value.replace(/\D/g,"").padStart(2,"0").slice(-2))}
                    className="bg-transparent border-b-2 border-[#d4af37]/40 text-[#ffb300] font-mono font-black text-2xl w-12 text-center focus:outline-none focus:border-[#d4af37] inline-block"
                    maxLength={2}/>
                </h2>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-red-600 font-mono text-sm font-bold border border-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-all">CLEAR ALL</button>
                )}
              </div>

              {/* SWAP button */}
              <button onClick={() => { playClick(); setTab("ENVIRONMENT"); }}
                className="flex items-center justify-center gap-3 mx-5 mt-4 py-4 bg-[#0c0c10] border-2 border-[#d4af37]/30 rounded-2xl hover:border-[#d4af37]/60 transition-all active:scale-[0.98] whitespace-nowrap">
                <Map size={20} className="text-[#d4af37] flex-shrink-0"/>
                <span className="text-[#d4af37] font-mono font-black text-xl tracking-widest">[ VENUE FLOOR MAP ]</span>
              </button>

              {/* Line items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 mt-2">
                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
                    <span className="text-[#1c1c22] font-mono font-black text-4xl tracking-widest">TERMINAL EMPTY</span>
                    <span className="text-[#252525] font-mono text-2xl tracking-widest">AWAITING TOUCH INPUT</span>
                  </div>
                ) : cart.map(line => (
                  <div key={line.item.id} className="flex items-center gap-3 bg-[#0d0d12] border border-[#1a1a20] rounded-2xl px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-xl truncate">{line.item.name}</p>
                      <p className="text-[#ffb300] font-mono font-bold text-lg">${line.item.price.toFixed(2)} ea</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => decCart(line.item.id)} className="w-10 h-10 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37]">−</button>
                      <span className="text-white font-mono font-black text-2xl w-9 text-center">{line.qty}</span>
                      <button onClick={() => addToCart(line.item)} className="w-10 h-10 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white font-mono font-black text-2xl flex items-center justify-center hover:border-[#d4af37]">+</button>
                      <button onClick={() => delCart(line.item.id)} className="w-10 h-10 bg-[#160a0a] border border-red-900/30 rounded-xl text-red-600 flex items-center justify-center hover:bg-red-900/20 ml-1"><X size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t-2 border-[#141418] px-6 py-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#444] font-mono font-bold text-xl tracking-widest">SUBTOTAL</span>
                  <span className="text-white font-mono font-black text-2xl">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#444] font-mono font-bold text-xl tracking-widest">TAX 8.75%</span>
                  <span className="text-white font-mono font-black text-2xl">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#1a1a20] pt-4 mt-1">
                  <span className="text-[#888] font-mono font-bold text-2xl tracking-widest">TOTAL DUE</span>
                  <span className="text-[#ffb300] font-mono font-black text-5xl tracking-tight">${total.toFixed(2)}</span>
                </div>
                <motion.button disabled={!cart.length} onPointerDown={authorize} whileTap={{ scale:0.97 }}
                  className="w-full mt-2 py-6 bg-[#ffb300] hover:bg-[#ffc107] disabled:bg-[#141418] disabled:text-[#333] text-black font-mono font-black text-2xl tracking-widest rounded-2xl transition-all shadow-[0_4px_32px_rgba(255,179,0,0.25)] disabled:shadow-none uppercase">
                  AUTHORIZE &amp; CLOSE TRANSACTION
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation overlay */}
      <AnimatePresence>
        {confirmed && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center">
            <motion.div initial={{ scale:0.75, opacity:0 }} animate={{ scale:1, opacity:1 }}
              transition={{ type:"spring", stiffness:380, damping:24 }}
              className="flex flex-col items-center gap-8">
              <CheckCircle2 size={96} className="text-[#ffb300]" strokeWidth={1.5}/>
              <div className="text-center">
                <p className="text-[#ffb300] font-mono font-black text-5xl tracking-widest">TRANSACTION AUTHORIZED</p>
                <p className="text-[#555] font-mono text-2xl tracking-widest mt-3">TABLE {tableNum} · ${total.toFixed(2)} SECURED</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
