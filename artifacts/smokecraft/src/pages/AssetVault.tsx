/**
 * AssetVault — /inventory
 * VAULT · DESIGNER · TERMINAL — luxury obsidian inventory console.
 */
import { useState, useRef, type MouseEvent, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StockItem {
  id:             string;
  name:           string;
  brand:          string;
  category:       "CIGAR" | "SPIRIT" | "WINE";
  qty:            number;
  par:            number;
  price:          number;
  origin:         string;
  specifications: string;
  accentColor:    string;
}

type CategoryFilter = "ALL" | "CIGAR" | "SPIRIT" | "WINE";
type ActiveTab      = "VAULT" | "DESIGNER" | "TERMINAL";

// ── Data ───────────────────────────────────────────────────────────────────────

const STOCK: StockItem[] = [
  {
    id: "c1", name: "1926 Serie No. 6", brand: "PADRÓN", category: "CIGAR",
    qty: 24, par: 48, price: 45, origin: "Jalapa, Nicaragua",
    specifications: "Maduro wrapper · Full body · Aged 5 years",
    accentColor: "#D4AF37",
  },
  {
    id: "c2", name: "Fuente Fuente Opus X", brand: "ARTURO FUENTE", category: "CIGAR",
    qty: 11, par: 36, price: 65, origin: "Chateau de la Fuente, D.R.",
    specifications: "Dominican Rosado · Rare limited batch · 54 ring gauge",
    accentColor: "#C8762A",
  },
  {
    id: "s1", name: "Sherry Oak 18 Year", brand: "THE MACALLAN", category: "SPIRIT",
    qty: 6, par: 12, price: 220, origin: "Speyside, Scotland",
    specifications: "Oloroso seasoned casks · Dried fruits & ginger",
    accentColor: "#C8762A",
  },
  {
    id: "s2", name: "Pappy Van Winkle 23yr", brand: "OLD RIP VAN WINKLE", category: "SPIRIT",
    qty: 3, par: 6, price: 340, origin: "Buffalo Trace, Kentucky",
    specifications: "Kentucky straight · Single barrel · 95.6 proof",
    accentColor: "#C8A84B",
  },
  {
    id: "w1", name: "Opus One 2020", brand: "OPUS ONE", category: "WINE",
    qty: 18, par: 24, price: 120, origin: "Oakville, Napa Valley",
    specifications: "Cabernet Sauvignon · 14.5% ABV · 97pts WS",
    accentColor: "#9B2335",
  },
  {
    id: "w2", name: "Château Pétrus 2016", brand: "POMEROL ESTATE", category: "WINE",
    qty: 4, par: 12, price: 280, origin: "Pomerol, Bordeaux",
    specifications: "Merlot dominant · Grand Cru · 100pts RP",
    accentColor: "#7B1E35",
  },
];

const HOURLY_BARS = [25, 40, 35, 55, 30, 70, 45, 80, 60];

const BLEND_MATRIX = [
  { label: "SECO (LIGHT LEAF)",   pct: 40 },
  { label: "VISO (MID LEAF)",     pct: 35 },
  { label: "LIGERO (STRONG LEAF)", pct: 25 },
];

// ── Silhouettes ────────────────────────────────────────────────────────────────

function CigarSilhouette({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, opacity: 0.55 }}>
      {[52, 64, 72, 68, 56].map((h, i) => (
        <div key={i} style={{
          width: 6, height: h, borderRadius: "3px 3px 1px 1px",
          background: `linear-gradient(to top, #3A2213, #7A4E2A, ${color}AA)`,
          boxShadow: `0 0 6px ${color}33`,
        }} />
      ))}
      <div style={{
        width: 4, height: 7, borderRadius: "50% 50% 40% 40%",
        background: "radial-gradient(circle, #ff6a00, #ff450066)", marginLeft: -2,
      }} />
    </div>
  );
}

function SpiritSilhouette({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 84" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: 36, height: 64, opacity: 0.55 }}>
      <rect x="19" y="0" width="10" height="6" rx="2" stroke={color} strokeWidth="1.2" />
      <rect x="21" y="6" width="6" height="14" rx="1" stroke={color} strokeWidth="1.2" />
      <path d="M21 20 Q12 28 10 42 L10 78 Q10 82 24 82 Q38 82 38 78 L38 42 Q36 28 27 20 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}14`} />
      <path d="M12 55 Q24 58 36 55" stroke={color} strokeWidth="0.8" opacity="0.5" />
      <rect x="14" y="58" width="20" height="14" rx="2" stroke={color} strokeWidth="0.8" fill={`${color}0A`} />
    </svg>
  );
}

function WineSilhouette({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 44 88" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: 32, height: 66, opacity: 0.55 }}>
      <path d="M8 4 Q4 26 16 40 Q20 46 22 46 Q24 46 28 40 Q40 26 36 4 Z"
        stroke={color} strokeWidth="1.2" fill={`${color}12`} />
      <path d="M12 26 Q14 34 22 38 Q30 34 32 26 Q22 30 12 26 Z" fill={`${color}28`} />
      <line x1="22" y1="46" x2="22" y2="76" stroke={color} strokeWidth="1.2" />
      <path d="M10 76 Q10 80 22 80 Q34 80 34 76 Z" stroke={color} strokeWidth="1.2" fill={`${color}18`} />
    </svg>
  );
}

function GenreSilhouette({ category, color }: { category: StockItem["category"]; color: string }) {
  if (category === "CIGAR")  return <CigarSilhouette color={color} />;
  if (category === "SPIRIT") return <SpiritSilhouette color={color} />;
  return <WineSilhouette color={color} />;
}

// ── Token helpers ──────────────────────────────────────────────────────────────

const T = {
  bg:      "#060608",
  surface: "#0C0C10",
  card:    "#0C0C10",
  border:  "#16161F",
  borderMid: "#1A1A22",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.55)",
  text:    "#D1D1D6",
  muted:   "#6C6C7D",
  faint:   "#444452",
  dimmer:  "#525261",
};

// ── Product card ───────────────────────────────────────────────────────────────

interface VaultCardProps {
  item:          StockItem;
  uploadedImage: string | undefined;
  onUpload:      (e: MouseEvent, id: string) => void;
  fileRef:       (el: HTMLInputElement | null) => void;
  onFileChange:  (e: ChangeEvent<HTMLInputElement>, id: string) => void;
}

function VaultCard({ item, uploadedImage, onUpload, fileRef, onFileChange }: VaultCardProps) {
  const low      = item.qty / item.par < 0.35;
  const ledger   = item.price * item.qty;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      whileHover={{ borderColor: `${item.accentColor}40` }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{
        background:    T.card,
        border:        `1px solid ${T.border}`,
        borderRadius:  16,
        padding:       20,
        display:       "flex",
        flexDirection: "column",
        gap:           0,
        overflow:      "hidden",
        position:      "relative",
        boxShadow:     "0 4px 24px rgba(0,0,0,0.55)",
        transition:    "border-color 0.3s",
      }}
    >
      {/* Ambient gold glow corner */}
      <div style={{
        position:         "absolute", top: 0, right: 0,
        width: 100, height: 100, pointerEvents: "none",
        background:       `radial-gradient(circle at top right, ${item.accentColor}08 0%, transparent 70%)`,
      }} />

      {/* Header: brand + status */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span style={{
            display: "block", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.22em", color: T.goldDim,
            textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4,
          }}>
            {item.brand}
          </span>
          <h3 style={{
            margin: 0, fontSize: 14, fontWeight: 700, color: "#FFFFFF",
            letterSpacing: "0.04em", lineHeight: 1.25,
          }}>
            {item.name}
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: T.dimmer }}>{item.origin}</p>
        </div>
        <span style={{
          padding: "2px 8px", fontSize: 9, fontFamily: "monospace",
          letterSpacing: "0.14em", borderRadius: 4,
          border: `1px solid ${low ? "#441C1C" : "#1C3A24"}`,
          background: low ? "#2A1212" : "#122417",
          color: low ? "#F46C6C" : "#61E27F",
          whiteSpace: "nowrap", flexShrink: 0, marginTop: 2,
        }}>
          {low ? "LOW STOCK" : "OK"}
        </span>
      </div>

      {/* Silhouette box */}
      <div style={{
        height: 112, background: "rgba(0,0,0,0.40)",
        border: `1px solid ${T.border}`, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", marginBottom: 14,
      }}>
        {uploadedImage ? (
          <img src={uploadedImage} alt={item.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              filter: "brightness(0.85) contrast(1.08)" }} />
        ) : (
          <motion.div
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <GenreSilhouette category={item.category} color={item.accentColor} />
          </motion.div>
        )}
        <span style={{
          position: "absolute", bottom: 6, left: 0, right: 0,
          textAlign: "center", fontSize: 8, fontFamily: "monospace",
          color: T.faint, letterSpacing: "0.20em", textTransform: "uppercase",
        }}>
          MICROCLIMATE MATRIX CORE
        </span>
        {/* Upload trigger */}
        <button
          onClick={e => onUpload(e, item.id)}
          style={{
            position: "absolute", top: 6, right: 6,
            background: "rgba(0,0,0,0.72)", border: `1px solid ${T.borderMid}`,
            borderRadius: 6, padding: "3px 7px", cursor: "pointer",
            fontSize: 8, fontFamily: "monospace", color: T.faint,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}
        >
          {uploadedImage ? "SWAP" : "UPLOAD"}
        </button>
        <input
          type="file" accept="image/*"
          ref={fileRef}
          onChange={e => onFileChange(e, item.id)}
          style={{ display: "none" }}
        />
      </div>

      {/* Specifications */}
      <p style={{
        margin: "0 0 14px", fontSize: 11, fontFamily: "monospace",
        color: T.muted, fontStyle: "italic", lineHeight: 1.5,
      }}>
        {item.specifications}
      </p>

      {/* Data blocks */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6,
        borderTop: `1px solid ${T.border}`, paddingTop: 14,
        textAlign: "center",
      }}>
        {[
          { label: "VALUATION", value: `$${item.price.toFixed(2)}`, gold: true },
          { label: "STOCKS",    value: `${item.qty} / ${item.par}`,  gold: false },
          { label: "LEDGER",    value: `$${ledger.toFixed(0)}`,      gold: false },
        ].map(b => (
          <div key={b.label} style={{
            background: "rgba(0,0,0,0.30)", padding: "7px 4px", borderRadius: 6,
            border: `1px solid #121217`,
          }}>
            <span style={{
              display: "block", fontSize: 8, fontFamily: "monospace",
              letterSpacing: "0.18em", color: T.faint,
              textTransform: "uppercase", marginBottom: 3,
            }}>
              {b.label}
            </span>
            <span style={{
              fontSize: 12, fontFamily: "monospace", fontWeight: 700,
              color: b.gold ? T.gold : "#FFFFFF",
            }}>
              {b.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AssetVault() {
  const [, navigate]       = useLocation();
  const [tab,      setTab] = useState<ActiveTab>("VAULT");
  const [filter,   setFilter]   = useState<CategoryFilter>("ALL");
  const [cart,     setCart]     = useState<StockItem[]>([]);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const visible = filter === "ALL" ? STOCK : STOCK.filter(s => s.category === filter);

  function triggerUpload(e: MouseEvent, id: string) {
    e.stopPropagation();
    fileRefs.current[id]?.click();
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>, id: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const r = ev.target?.result;
      if (typeof r === "string") setUploaded(prev => ({ ...prev, [id]: r }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const subtotal = cart.reduce((a, i) => a + i.price, 0);
  const tax      = subtotal * 0.0875;
  const total    = subtotal + tax;

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: T.bg, color: T.text, fontFamily: "system-ui, sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Luxury console header ── */}
      <header style={{
        height: 64, background: "#0B0B0F",
        borderBottom: `1px solid ${T.borderMid}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0, zIndex: 10,
      }}>
        {/* Left: back + identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: `1px solid rgba(212,175,55,0.28)`,
              borderRadius: 8, padding: "7px 14px", cursor: "pointer",
              color: T.gold, fontSize: 12, fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase",
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={14} />
            BACK
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold,
                boxShadow: `0 0 10px ${T.gold}` }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.40em",
              color: T.gold, textTransform: "uppercase" }}>
              SMOKECRAFT 360
            </span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: T.faint,
              letterSpacing: "0.24em" }}>
              // E.A.T. SYSTEM
            </span>
          </div>

          {/* Tab navigation */}
          <nav style={{
            display: "flex", gap: 2,
            background: "rgba(0,0,0,0.50)", padding: 4, borderRadius: 8,
            border: `1px solid #16161D`,
          }}>
            {(["VAULT", "DESIGNER", "TERMINAL"] as ActiveTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 20px", fontSize: 10, fontWeight: 700,
                letterSpacing: "0.20em", borderRadius: 6,
                border: tab === t ? `1px solid #2D2D3A` : "1px solid transparent",
                background: tab === t ? "#1C1C24" : "transparent",
                color: tab === t ? T.gold : T.muted,
                cursor: "pointer", textTransform: "uppercase",
                fontFamily: "inherit", transition: "all 0.2s",
              }}>
                {t}
              </button>
            ))}
          </nav>
        </div>

        <span style={{ fontSize: 10, fontFamily: "monospace", color: T.faint, letterSpacing: "0.16em" }}>
          SECURE NODE // TERMINAL.01
        </span>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* VAULT TAB */}
        <AnimatePresence mode="wait">
          {tab === "VAULT" && (
            <motion.div key="vault"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}
            >
              {/* Product grid */}
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {/* Sub-header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderBottom: `1px solid #14141A`, paddingBottom: 16, marginBottom: 24,
                }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.20em",
                      color: "#FFFFFF", textTransform: "uppercase" }}>
                      LIVE INVENTORY LEDGER
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: T.dimmer }}>
                      Real-time asset allocations and climate tracking indexes.
                    </p>
                  </div>
                  {/* Category filter */}
                  <div style={{
                    display: "flex", background: "rgba(0,0,0,0.60)",
                    border: `1px solid ${T.borderMid}`, borderRadius: 6, padding: 2,
                  }}>
                    {(["ALL", "CIGAR", "SPIRIT", "WINE"] as CategoryFilter[]).map(f => (
                      <button key={f} onClick={() => setFilter(f)} style={{
                        padding: "4px 14px", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.18em", borderRadius: 4,
                        background: filter === f ? "#1C1C24" : "transparent",
                        color: filter === f ? T.gold : T.dimmer,
                        border: "none", cursor: "pointer",
                        textTransform: "uppercase", fontFamily: "inherit",
                        transition: "all 0.2s",
                      }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24 }}>
                  <AnimatePresence mode="popLayout">
                    {visible.map(item => (
                      <VaultCard
                        key={item.id}
                        item={item}
                        uploadedImage={uploaded[item.id]}
                        onUpload={triggerUpload}
                        fileRef={el => { fileRefs.current[item.id] = el; }}
                        onFileChange={handleFile}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right sidebar: metrics */}
              <div style={{
                width: 312, background: "#0B0B0E",
                borderLeft: `1px solid ${T.borderMid}`,
                display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}>
                <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Performance metric bar chart */}
                  <div>
                    <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.20em", color: T.muted, textTransform: "uppercase" }}>
                      // PERFORMANCE METRIC
                    </p>
                    <div style={{
                      background: "rgba(0,0,0,0.40)", border: `1px solid #14141A`,
                      borderRadius: 12, padding: 16, height: 112,
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 9, fontFamily: "monospace",
                        letterSpacing: "0.16em", color: T.faint, textTransform: "uppercase" }}>
                        HOURLY DISTRIBUTION ACCRUAL
                      </span>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, paddingTop: 8 }}>
                        {HOURLY_BARS.map((h, i) => (
                          <motion.div
                            key={i}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.04, duration: 0.4 }}
                            style={{
                              flex: 1, height: `${h}%`,
                              background: `linear-gradient(to top, rgba(138,109,38,0.20), ${T.gold})`,
                              borderRadius: "2px 2px 0 0",
                              transformOrigin: "bottom",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tobacco blend matrix */}
                  <div>
                    <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.20em", color: T.muted, textTransform: "uppercase" }}>
                      // TOBACCO BLEND MATRIX
                    </p>
                    <div style={{
                      background: "rgba(0,0,0,0.40)", border: `1px solid #14141A`,
                      borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12,
                    }}>
                      {BLEND_MATRIX.map(b => (
                        <div key={b.label}>
                          <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontFamily: "monospace",
                              color: T.muted, letterSpacing: "0.10em" }}>
                              {b.label}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: "monospace",
                              fontWeight: 700, color: "#FFFFFF" }}>
                              {b.pct}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: 4, background: "#1a1a1a",
                            borderRadius: 99, overflow: "hidden" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${b.pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              style={{ height: "100%", background: T.gold, borderRadius: 99 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vault totals */}
                  <div>
                    <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.20em", color: T.muted, textTransform: "uppercase" }}>
                      // VAULT TOTALS
                    </p>
                    {[
                      { label: "GLOBAL VAULT ITEMS", value: `${STOCK.reduce((a, s) => a + s.qty, 0)} UNITS` },
                      { label: "VAULT VALUE",         value: `$${STOCK.reduce((a, s) => a + s.qty * s.price, 0).toLocaleString()}` },
                      { label: "LOW STOCK ALERTS",    value: String(STOCK.filter(s => s.qty / s.par < 0.35).length) },
                    ].map(m => (
                      <div key={m.label} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 0", borderBottom: `1px solid ${T.borderMid}`,
                      }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace",
                          color: T.faint, letterSpacing: "0.10em" }}>
                          {m.label}
                        </span>
                        <span style={{ fontSize: 12, fontFamily: "monospace",
                          fontWeight: 700, color: "#FFFFFF" }}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* DESIGNER TAB */}
          {tab === "DESIGNER" && (
            <motion.div key="designer"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                background: "#070709" }}
            >
              <div style={{
                textAlign: "center", padding: 40,
                border: "1px dashed #1C1C24", borderRadius: 16, maxWidth: 380,
              }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700,
                  color: T.gold, letterSpacing: "0.30em", textTransform: "uppercase" }}>
                  BLUEPRINT COMPILATION GRID
                </p>
                <p style={{ margin: 0, fontSize: 11, color: T.dimmer, lineHeight: 1.6 }}>
                  Spatial structural layout mapping engines isolated inside layout node memory layers.
                </p>
              </div>
            </motion.div>
          )}

          {/* TERMINAL TAB */}
          {tab === "TERMINAL" && (
            <motion.div key="terminal"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: "flex", overflow: "hidden" }}
            >
              {/* Product selector */}
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.20em", color: T.muted, textTransform: "uppercase" }}>
                    [ DIRECT INVOICE SELECTION ]
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: T.dimmer }}>
                    Tap live inventory channels to feed items directly into the active checkout manifest.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                  {STOCK.map(p => (
                    <motion.button
                      key={p.id}
                      whileHover={{ borderColor: `${T.gold}66` }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCart(prev => [...prev, p])}
                      style={{
                        background: T.card, border: `1px solid ${T.border}`,
                        borderRadius: 14, padding: 16,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", textAlign: "left",
                        transition: "border-color 0.2s",
                      }}
                    >
                      <div>
                        <span style={{ display: "block", fontSize: 9, fontFamily: "monospace",
                          color: T.goldDim, letterSpacing: "0.18em",
                          textTransform: "uppercase", marginBottom: 3 }}>
                          {p.brand}
                        </span>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: T.gold }}>
                        +${p.price.toFixed(0)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart panel */}
              <div style={{
                width: 380, background: "#0B0B0E",
                borderLeft: `1px solid ${T.borderMid}`,
                display: "flex", flexDirection: "column",
              }}>
                {/* Cart header */}
                <div style={{
                  padding: "14px 16px", borderBottom: `1px solid ${T.borderMid}`,
                  background: "rgba(0,0,0,0.20)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.18em", color: "#FFFFFF", textTransform: "uppercase" }}>
                      ACTIVE MANIFEST
                    </h3>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: T.faint }}>
                      LINKED ROUTE // TABLE-01
                    </span>
                  </div>
                  <button
                    onClick={() => setCart([])}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      fontSize: 9, fontFamily: "monospace", color: "#F46C6C",
                      letterSpacing: "0.14em", textTransform: "uppercase" }}
                  >
                    RESET
                  </button>
                </div>

                {/* Cart items */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <AnimatePresence>
                    {cart.length > 0 ? cart.map((item, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.16 }}
                        style={{
                          background: "rgba(0,0,0,0.40)", border: `1px solid #13131A`,
                          borderRadius: 8, padding: "10px 12px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          fontFamily: "monospace", fontSize: 12, color: "#FFFFFF",
                        }}
                      >
                        <span>{item.name}</span>
                        <span style={{ color: T.gold }}>${item.price.toFixed(2)}</span>
                      </motion.div>
                    )) : (
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        textAlign: "center", padding: 16, fontSize: 11,
                        color: T.faint, fontFamily: "monospace",
                      }}>
                        AWAITING TOUCH INPUT ACCRUAL
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Totals + authorize */}
                <div style={{
                  padding: 16, borderTop: `1px solid ${T.borderMid}`,
                  background: "rgba(0,0,0,0.40)",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6,
                    fontFamily: "monospace", fontSize: 11, color: T.muted, marginBottom: 14 }}>
                    {[
                      { label: "SUBTOTAL ACCRUAL:", value: `$${subtotal.toFixed(2)}`, bold: false },
                      { label: "TAXES (8.75%):",    value: `$${tax.toFixed(2)}`,      bold: false },
                      { label: "TOTAL SETTLEMENT:", value: `$${total.toFixed(2)}`,    bold: true  },
                    ].map(r => (
                      <div key={r.label} style={{
                        display: "flex", justifyContent: "space-between",
                        borderTop: r.bold ? `1px solid ${T.borderMid}` : "none",
                        paddingTop: r.bold ? 8 : 0,
                        color: r.bold ? T.gold : T.muted,
                        fontWeight: r.bold ? 700 : 400,
                        fontSize: r.bold ? 13 : 11,
                      }}>
                        <span>{r.label}</span>
                        <span>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => { alert("Ledger Auth Success."); setCart([]); }}
                    style={{
                      width: "100%", padding: "10px 0",
                      background: cart.length === 0
                        ? T.borderMid
                        : `linear-gradient(to right, #BA962F, #9A8148)`,
                      border: "none", borderRadius: 8, cursor: cart.length === 0 ? "not-allowed" : "pointer",
                      fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                      letterSpacing: "0.20em", textTransform: "uppercase",
                      color: cart.length === 0 ? T.faint : "#000000",
                      transition: "all 0.2s",
                    }}
                  >
                    AUTHORIZE TRANSACTION
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
