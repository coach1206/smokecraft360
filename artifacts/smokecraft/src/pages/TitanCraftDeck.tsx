/**
 * TitanCraftDeck — Axiom OS Luminous Hardware Terminal.
 * Route: /titan-hub
 *
 * Identity: machined cockpit meets luxury hospitality intelligence OS.
 * Layout: top ticker → header → seamless 2×2 hardware grid + AxiomCore → bottom ticker
 */

import { useEffect, useState }     from "react";
import { useLocation }             from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CRAFT_MODULES }           from "@/data/craftScenes";

// ── Craft hero images ─────────────────────────────────────────────────────────

const CRAFT_IMAGES: Record<string, string> = {
  smoke: "/images/scenes/smokecraft-card.jpg",
  pour:  "/images/scenes/pourcraft-card.jpg",
  brew:  "/images/scenes/brewcraft-card.jpg",
  vape:  "/images/scenes/vapecraft-card.jpg",
};

const CRAFT_SUBS: Record<string, string> = {
  smoke: "Molecular Leaf Lab · Ritual Prep",
  pour:  "Vessel Geometry · Spirit Sync",
  brew:  "Fermentation Lab · Craft Intelligence",
  vape:  "Cloud Architecture · Vapor Sync",
};

// ── Ticker content ────────────────────────────────────────────────────────────

const TOP_ITEMS = [
  "AXIOM INTELLIGENCE",
  "REVENUE ENGINE ACTIVE",
  "INVENTORY SYNC LIVE",
  "TASTE PROFILE READY",
  "RECOMMENDATION ENGINE ONLINE",
  "REVENUE BRAIN ACTIVE",
  "GUEST PROFILES LOADED",
  "SYSTEM STATUS: SOVEREIGN",
];

const BOTTOM_ITEMS = [
  ">>> DAYONE 360 ADV",
  "REVENUE OPTIMIZED",
  "LIVE UPDATE: 25% OFF EXOTIC VAPOR ATELIER",
  "SYSTEM STATUS: SOVEREIGN",
  "AXIOM NODE: CONNECTED",
  "INVENTORY SYNC: LIVE",
  ">>> DAYONE 360 ADV",
  "RECOMMENDATION ENGINE: READY",
  "SYSTEM LINK: STABLE",
];

// ── Material constants ────────────────────────────────────────────────────────

const GOLD_LUSTER: React.CSSProperties = {
  background:           "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  filter:               "drop-shadow(0 0 10px rgba(212,175,55,.45))",
};

const SILVER: React.CSSProperties = {
  background:           "linear-gradient(180deg, #f0f0f2 0%, #c8c8d0 55%, #909098 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// Reflective titanium border — appears machined
const TITANIUM_BORDER = "linear-gradient(to right, #6b5428, #fff9e6, #d4af37, #fff9e6, #6b5428) 1";

// ── Keyframe styles ───────────────────────────────────────────────────────────

const STYLES = `
  @keyframes axiom-top-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes axiom-bot-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes axiom-core-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.12), 0 0 0 1px rgba(212,175,55,0.50); transform: scale(1); }
    50%       { box-shadow: 0 0 40px rgba(212,175,55,0.55), 0 0 100px rgba(212,175,55,0.25), 0 0 0 1px rgba(255,249,230,0.90); transform: scale(1.06); }
  }
  @keyframes gold-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes card-edge-shimmer {
    0%   { opacity: 0.55; }
    50%  { opacity: 0.95; }
    100% { opacity: 0.55; }
  }
  .axiom-top-track {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    animation: axiom-top-scroll 38s linear infinite;
    will-change: transform;
  }
  .axiom-bot-track {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    animation: axiom-bot-scroll 52s linear infinite;
    will-change: transform;
  }
  .axiom-core-orb {
    animation: axiom-core-pulse 3.2s ease-in-out infinite;
  }
  .craft-label-gold {
    background: linear-gradient(90deg, #8a6d3b 0%, #fff9e6 22%, #d4af37 48%, #fff9e6 74%, #8a6d3b 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gold-shimmer 4.5s linear infinite;
    filter: drop-shadow(0 0 10px rgba(212,175,55,0.55));
  }
  .craft-label-silver {
    background: linear-gradient(to bottom, rgba(255,255,255,0.98) 0%, rgba(200,200,215,0.72) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 6px rgba(255,255,255,0.30));
  }
  /* Metallic titanium top edge on each card */
  .card-titanium-top {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1.5px;
    background: linear-gradient(to right, #6b5428, #fff9e6, #d4af37, #fff9e6, #6b5428);
    z-index: 20;
  }
`;

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display:      "inline-block",
        width:        5,
        height:       5,
        borderRadius: "50%",
        background:   color,
        boxShadow:    `0 0 7px ${color}cc`,
        flexShrink:   0,
      }}
    />
  );
}

// ── Top kinetic ticker ────────────────────────────────────────────────────────

function TopTicker() {
  const doubled = [...TOP_ITEMS, ...TOP_ITEMS];
  return (
    <div style={{
      height:       24,
      background:   "linear-gradient(180deg, #040404 0%, #0a0a0c 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      overflow:     "hidden",
      flexShrink:   0,
      display:      "flex",
      alignItems:   "center",
      position:     "relative",
    }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:48, zIndex:2, pointerEvents:"none", background:"linear-gradient(to right, #040404, transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:48, zIndex:2, pointerEvents:"none", background:"linear-gradient(to left, #040404, transparent)" }} />

      <div className="axiom-top-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            <span style={{
              fontSize:      12,
              letterSpacing: "0.48em",
              textTransform: "uppercase",
              color:         "rgba(195,200,215,0.55)",
              fontWeight:    500,
              paddingInline: 8,
            }}>
              {item}
            </span>
            <span style={{ color:"rgba(180,180,200,0.18)", fontSize:8, paddingInline:10 }}>//</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bottom kinetic ticker ─────────────────────────────────────────────────────

function BottomTicker() {
  const doubled = [...BOTTOM_ITEMS, ...BOTTOM_ITEMS];
  return (
    <div style={{
      height:     40,
      background: "#030303",
      borderTop:  "1px solid rgba(212,175,55,0.18)",
      overflow:   "hidden",
      flexShrink: 0,
      display:    "flex",
      alignItems: "center",
      position:   "relative",
    }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none", background:"linear-gradient(to right, #030303, transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none", background:"linear-gradient(to left, #030303, transparent)" }} />

      <div className="axiom-bot-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            <span style={{
              fontSize:      13,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              fontWeight:    item.startsWith(">>>") ? 800 : 500,
              paddingInline: 10,
              ...(item.startsWith(">>>") ? GOLD_LUSTER : { color:"rgba(212,175,55,0.72)" }),
            }}>
              {item}
            </span>
            <span style={{ color:"rgba(212,175,55,0.24)", fontSize:8, paddingInline:8 }}>///</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Axiom Core — center intelligence orb ─────────────────────────────────────

function AxiomCore() {
  return (
    <div style={{
      position:      "absolute",
      top:           "50%",
      left:          "50%",
      transform:     "translate(-50%, -50%)",
      zIndex:        100,
      pointerEvents: "none",
    }}>
      {/* Outer radial halo — bleeds into all four cards */}
      <div style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%, -50%)",
        width:        160,
        height:       160,
        borderRadius: "50%",
        background:   "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 72%)",
        pointerEvents:"none",
      }} />

      {/* Breathing orb */}
      <div
        className="axiom-core-orb"
        style={{
          width:        14,
          height:       14,
          borderRadius: "50%",
          background:   "radial-gradient(circle, #fff9e6 0%, #d4af37 55%, #8a6d3b 100%)",
          position:     "relative",
        }}
      />
    </div>
  );
}

// ── Zone bleed — inner-corner gradient per card ───────────────────────────────

function ZoneBleed({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const origins: Record<string, string> = {
    tl: "100% 100%",
    tr: "0% 100%",
    bl: "100% 0%",
    br: "0% 0%",
  };
  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      zIndex:        30,
      pointerEvents: "none",
      background:    `radial-gradient(ellipse 55% 55% at ${origins[position]}, rgba(0,0,0,0.72) 0%, transparent 65%)`,
    }} />
  );
}

// ── Craft card — luminous hardware tile ──────────────────────────────────────

interface CardProps {
  id:       string;
  title:    string;
  color:    string;
  route:    string;
  position: "tl" | "tr" | "bl" | "br";
}

function CraftCard({ id, title, color, route, position }: CardProps) {
  const [, navigate]  = useLocation();
  const [hov, setHov] = useState(false);
  const img           = CRAFT_IMAGES[id] ?? CRAFT_IMAGES["smoke"]!;
  const sub           = CRAFT_SUBS[id]   ?? "";
  const label         = `[ ${title.toUpperCase()} 360 ]`;
  const isSmoke       = id === "smoke";
  const isGold        = isSmoke;

  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={() => navigate(route)}
      animate={{
        filter: hov ? "brightness(1.06)" : "brightness(1.0)",
      }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor:   "pointer",
        height:   "100%",
      }}
    >
      {/* Hero image — full visibility, no dark veil */}
      <img
        src={img}
        alt={title}
        style={{
          position:       "absolute",
          inset:          0,
          width:          "100%",
          height:         "100%",
          objectFit:      "cover",
          objectPosition: "top",
          display:        "block",
          // Smoke gets a luster boost — embers and gold must pop
          filter:         isSmoke
            ? "saturate(1.2) brightness(1.1)"
            : "saturate(1.0) brightness(1.0)",
        }}
      />

      {/* Legibility gradient — only at bottom third, not a full fog */}
      <div style={{
        position:   "absolute",
        inset:      0,
        zIndex:     10,
        background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.20) 30%, transparent 52%)",
      }} />

      {/* Zone bleed — inner corner dark gradient for seamless grid merge */}
      <ZoneBleed position={position} />

      {/* Titanium top edge — reflective machined bar */}
      <div className="card-titanium-top" />

      {/* Inner vertical edge — left or right titanium bar for grid seams */}
      {(position === "tl" || position === "bl") && (
        <div style={{
          position:   "absolute",
          top:        0, bottom:0, right:0,
          width:      1.5,
          zIndex:     25,
          background: "linear-gradient(to bottom, #6b5428, #fff9e6, #d4af37, #fff9e6, #6b5428)",
        }} />
      )}

      {/* Craft color accent line — top, breathing */}
      <motion.div
        style={{
          position:   "absolute",
          top:        0, left:0, right:0,
          height:     2,
          zIndex:     21,
          background: color,
          opacity:    0,
        }}
        animate={{ opacity: hov ? [0.9, 1, 0.9] : [0.30, 0.55, 0.30] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner metallic reflection on hover */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        15,
          pointerEvents: "none",
          background:    `radial-gradient(ellipse 55% 40% at 0% 0%, rgba(255,255,255,0.065) 0%, transparent 55%),
                          radial-gradient(ellipse 35% 25% at 100% 100%, ${color}14 0%, transparent 55%)`,
        }}
      />

      {/* Bottom text — laser-etched precision */}
      <div style={{
        position: "absolute",
        bottom:   0,
        left:     0,
        width:    "100%",
        padding:  "14px 18px",
        zIndex:   35,
      }}>
        <h2
          className={isGold ? "craft-label-gold" : "craft-label-silver"}
          style={{
            fontSize:      "clamp(0.70rem, 1.0vw, 1.05rem)",
            fontStyle:     "italic",
            letterSpacing: "0.50em",
            marginBottom:  5,
            lineHeight:    1,
            textTransform: "uppercase",
            fontWeight:    900,
            whiteSpace:    "nowrap",
          }}
        >
          {label}
        </h2>
        <p style={{
          fontSize:      "6.5px",
          letterSpacing: "0.40em",
          textTransform: "uppercase",
          color:         "rgba(220,210,180,0.44)",
          marginBottom:  0,
        }}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const POSITIONS: Record<number, "tl" | "tr" | "bl" | "br"> = {
  0: "tl",
  1: "tr",
  2: "bl",
  3: "br",
};

export default function TitanCraftDeck() {
  const [, navigate]          = useLocation();
  const [mounted, setMounted] = useState(false);
  const [time, setTime]       = useState("");
  const [date, setDate]       = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDate(now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }));
    };
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{
              height:        "100vh",
              width:         "100%",
              overflow:      "hidden",
              display:       "flex",
              flexDirection: "column",
              background:    "#050505",
              fontFamily:    "var(--app-font-sans, system-ui, sans-serif)",
            }}
          >

            {/* 1. Top kinetic ticker */}
            <TopTicker />

            {/* 2. Header */}
            <header style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "7px 22px",
              background:     "#070709",
              borderBottom:   "1px solid rgba(212,175,55,0.12)",
              flexShrink:     0,
            }}>

              {/* Left — live clock */}
              <div style={{ minWidth: 150 }}>
                <div style={{
                  ...SILVER,
                  fontSize:           "19px",
                  letterSpacing:      "0.12em",
                  fontWeight:         200,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {time}
                </div>
                <div style={{
                  fontSize:      "6px",
                  letterSpacing: "0.36em",
                  color:         "rgba(200,180,120,0.38)",
                  textTransform: "uppercase",
                  marginTop:     2,
                }}>
                  {date}
                </div>
              </div>

              {/* Center — AXIOM OS wordmark */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  ...GOLD_LUSTER,
                  fontSize:      "clamp(16px, 2vw, 24px)",
                  letterSpacing: "0.60em",
                  fontWeight:    900,
                  textTransform: "uppercase",
                }}>
                  Axiom OS
                </div>
                <div style={{
                  fontSize:      "6px",
                  letterSpacing: "0.52em",
                  textTransform: "uppercase",
                  color:         "rgba(200,180,120,0.36)",
                  marginTop:     3,
                }}>
                  Experience Engine
                </div>
              </div>

              {/* Right — status indicators */}
              <div style={{ minWidth: 150, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                {[
                  { label: `${CRAFT_MODULES.length} Craft Modules`, dot: "#D4AF37" },
                  { label: "12 Curated Scenes",                     dot: "#5ab85a" },
                  { label: "Intelligence Active",                    dot: "#D4AF37" },
                ].map(({ label, dot }, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{
                      fontSize:      "6px",
                      letterSpacing: "0.30em",
                      textTransform: "uppercase",
                      color:         "rgba(200,180,120,0.42)",
                    }}>
                      {label}
                    </span>
                    <PulseDot color={dot} />
                  </div>
                ))}
              </div>
            </header>

            {/* 3. 2×2 hardware grid — seamless, gap:0 */}
            <main style={{
              display:             "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows:    "1fr 1fr",
              gap:                 0,
              flex:                "1 1 0",
              minHeight:           0,
              overflow:            "hidden",
              position:            "relative",
              // Outer titanium frame — machined perimeter
              borderTop:   "1.5px solid",
              borderImage: TITANIUM_BORDER,
            }}>

              {CRAFT_MODULES.map((mod, idx) => (
                <CraftCard
                  key={mod.id}
                  id={mod.id}
                  title={mod.title}
                  color={mod.color}
                  route={mod.route}
                  position={POSITIONS[idx] ?? "tl"}
                />
              ))}

              {/* AxiomCore — breathing gold orb at grid center */}
              <AxiomCore />

              {/* Horizontal center seam — titanium bar */}
              <div style={{
                position:      "absolute",
                top:           "50%",
                left:          0,
                right:         0,
                height:        1.5,
                transform:     "translateY(-50%)",
                background:    "linear-gradient(to right, transparent 0%, #6b5428 12%, #fff9e6 30%, #d4af37 50%, #fff9e6 70%, #6b5428 88%, transparent 100%)",
                zIndex:        50,
                pointerEvents: "none",
              }} />

              {/* Vertical center seam — titanium bar */}
              <div style={{
                position:      "absolute",
                top:           0,
                bottom:        0,
                left:          "50%",
                width:         1.5,
                transform:     "translateX(-50%)",
                background:    "linear-gradient(to bottom, transparent 0%, #6b5428 12%, #fff9e6 30%, #d4af37 50%, #fff9e6 70%, #6b5428 88%, transparent 100%)",
                zIndex:        50,
                pointerEvents: "none",
              }} />

            </main>

            {/* 4. Bottom kinetic ticker */}
            <BottomTicker />

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
