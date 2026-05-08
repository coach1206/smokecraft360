/**
 * TitanCraftDeck — Axiom OS operational command center.
 * Route: / and /titan-hub
 *
 * Identity: intelligent luxury hospitality OS running inside a premium machine.
 * Layout: top kinetic ticker → 3-col header → 2×2 craft grid → bottom kinetic ticker
 */

import { useEffect, useState }        from "react";
import { useLocation }                from "wouter";
import { motion, AnimatePresence }    from "framer-motion";
import { CRAFT_MODULES }              from "@/data/craftScenes";

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

const TOP_TICKER_ITEMS = [
  "AXIOM INTELLIGENCE",
  "REVENUE ENGINE ACTIVE",
  "INVENTORY SYNC LIVE",
  "TASTE PROFILE READY",
  "RECOMMENDATION ENGINE ONLINE",
  "REVENUE BRAIN ACTIVE",
  "GUEST PROFILES LOADED",
  "SYSTEM STATUS: SOVEREIGN",
];

const BOTTOM_TICKER_ITEMS = [
  ">>> DAYONE 360 ADV",
  "REVENUE ENGINE: OPTIMIZED",
  "LIVE UPDATE: 25% OFF EXOTIC VAPOR ATELIER FOR NEXT 30 MIN",
  "SYSTEM STATUS: SOVEREIGN",
  "AXIOM NODE: CONNECTED",
  "INVENTORY SYNC: LIVE",
  ">>> DAYONE 360 ADV",
  "RECOMMENDATION ENGINE: READY",
  "SYSTEM LINK: STABLE",
];

// ── Shared style constants ────────────────────────────────────────────────────

const GOLD_LUSTER: React.CSSProperties = {
  background:           "linear-gradient(180deg, #fff9e6 0%, #d4af37 45%, #8a6d3b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  filter:               "drop-shadow(0 0 10px rgba(212,175,55,.4))",
};

const SILVER: React.CSSProperties = {
  background:           "linear-gradient(180deg, #f0f0f2 0%, #b8b8c0 60%, #888898 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// ── Keyframe styles ───────────────────────────────────────────────────────────

const TICKER_STYLES = `
  @keyframes axiom-top-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes axiom-bot-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
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
  @keyframes gold-shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`;

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.35, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display:      "inline-block",
        width:        5,
        height:       5,
        borderRadius: "50%",
        background:   color,
        boxShadow:    `0 0 6px ${color}cc`,
        flexShrink:   0,
      }}
    />
  );
}

// ── Top kinetic ticker ────────────────────────────────────────────────────────

function TopTicker() {
  const doubled = [...TOP_TICKER_ITEMS, ...TOP_TICKER_ITEMS];
  return (
    <div style={{
      height:       26,
      background:   "#030303",
      borderBottom: "1px solid rgba(200,200,215,0.09)",
      overflow:     "hidden",
      flexShrink:   0,
      display:      "flex",
      alignItems:   "center",
      position:     "relative",
    }}>
      {/* Fade masks */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:40, zIndex:2, pointerEvents:"none", background:"linear-gradient(to right, #030303, transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:40, zIndex:2, pointerEvents:"none", background:"linear-gradient(to left, #030303, transparent)" }} />

      <div className="axiom-top-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:0 }}>
            <span style={{
              fontSize:      13,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color:         "rgba(195,200,215,0.62)",
              fontWeight:    500,
              paddingInline: 6,
            }}>
              {item}
            </span>
            <span style={{ color:"rgba(180,180,200,0.20)", fontSize:9, paddingInline:12 }}>//</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bottom kinetic ticker ─────────────────────────────────────────────────────

function BottomTicker() {
  const doubled = [...BOTTOM_TICKER_ITEMS, ...BOTTOM_TICKER_ITEMS];
  return (
    <div style={{
      height:    40,
      background:"#030303",
      borderTop: "1px solid rgba(212,175,55,0.14)",
      overflow:  "hidden",
      flexShrink:0,
      display:   "flex",
      alignItems:"center",
      position:  "relative",
    }}>
      {/* Fade masks */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:56, zIndex:2, pointerEvents:"none", background:"linear-gradient(to right, #030303, transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:56, zIndex:2, pointerEvents:"none", background:"linear-gradient(to left, #030303, transparent)" }} />

      <div className="axiom-bot-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:0 }}>
            <span style={{
              fontSize:      13,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              fontWeight:    item.startsWith(">>>") ? 800 : 500,
              paddingInline: 8,
              ...(item.startsWith(">>>") ? GOLD_LUSTER : { color:"rgba(212,175,55,0.70)" }),
            }}>
              {item}
            </span>
            <span style={{ color:"rgba(212,175,55,0.22)", fontSize:9, paddingInline:10 }}>///</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Craft card — premium metallic tile ────────────────────────────────────────

interface CardProps {
  id:    string;
  title: string;
  color: string;
  route: string;
}

function CraftCard({ id, title, color, route }: CardProps) {
  const [, navigate]  = useLocation();
  const [hov, setHov] = useState(false);
  const img   = CRAFT_IMAGES[id]  ?? CRAFT_IMAGES["smoke"]!;
  const sub   = CRAFT_SUBS[id]    ?? "";
  const label = `[ ${title.toUpperCase()} ]`;
  const isGold = id === "smoke";

  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={() => navigate(route)}
      animate={{
        y:         hov ? -3 : 0,
        boxShadow: hov
          ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px ${color}60, 0 16px 40px rgba(0,0,0,0.90), 0 0 24px ${color}18`
          : `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(180,160,80,0.14), 0 4px 16px rgba(0,0,0,0.70)`,
      }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        position:     "relative",
        overflow:     "hidden",
        borderRadius: 12,
        background:   "#0c0c0e",
        cursor:       "pointer",
        height:       "100%",
        /* Silver glass glint along the top edge */
        borderTop:    "1.5px solid rgba(255,255,255,0.28)",
      }}
    >
      {/* Hero image — raw, no filter, heads visible */}
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
          filter:         "none",
          transform:      "scale(1)",
        }}
      />

      {/* Bottom legibility ramp — sharp gradient, no fog */}
      <div style={{
        position:   "absolute",
        inset:      0,
        zIndex:     10,
        background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 36%, transparent 58%)",
      }} />

      {/* Top accent line — craft color, breathing */}
      <motion.div
        style={{
          position:   "absolute",
          top:        0, left: 0, right: 0,
          height:     2,
          zIndex:     20,
          background: color,
        }}
        animate={{ opacity: hov ? [0.95, 1, 0.95] : [0.40, 0.65, 0.40] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner metallic reflection on hover */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        15,
          pointerEvents: "none",
          background:    `radial-gradient(ellipse 50% 35% at 0% 0%, rgba(255,255,255,0.055) 0%, transparent 52%),
                          radial-gradient(ellipse 30% 22% at 100% 100%, ${color}0e 0%, transparent 55%)`,
        }}
      />

      {/* Bottom text — precision laser-etched */}
      <div style={{
        position: "absolute",
        bottom:   0,
        left:     0,
        width:    "100%",
        padding:  "16px 18px",
        zIndex:   20,
      }}>
        <h2 style={{
          fontSize:      "clamp(0.72rem, 1.05vw, 1.1rem)",
          fontStyle:     "italic",
          letterSpacing: "0.48em",
          marginBottom:  5,
          lineHeight:    1,
          textTransform: "uppercase",
          fontWeight:    900,
          whiteSpace:    "nowrap",
          ...(isGold
            ? {
                background:           "linear-gradient(90deg, #8a6d3b 0%, #fff9e6 25%, #d4af37 50%, #fff9e6 75%, #8a6d3b 100%)",
                backgroundSize:       "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                filter:               "drop-shadow(0 0 8px rgba(212,175,55,.5))",
                animation:            "gold-shimmer 5s linear infinite",
              }
            : {
                background:           "linear-gradient(to bottom, rgba(255,255,255,0.96) 0%, rgba(190,190,200,0.60) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }),
        }}>
          {label}
        </h2>
        <p style={{
          fontSize:      "7px",
          letterSpacing: ".40em",
          textTransform: "uppercase",
          color:         "rgba(220,210,180,0.42)",
          marginBottom:  0,
        }}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
      <style>{TICKER_STYLES}</style>

      <AnimatePresence>
        {mounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            id="axiom-terminal"
            className="axiom-theme axiom-terminal"
            style={{
              height:        "100vh",
              width:         "100%",
              overflow:      "hidden",
              display:       "flex",
              flexDirection: "column",
              background:    "#080808",
              fontFamily:    "var(--app-font-sans, system-ui, sans-serif)",
            }}
          >

            {/* ── 1. Top kinetic ticker ── */}
            <TopTicker />

            {/* ── 2. Header ── */}
            <header style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "8px 22px",
              background:     "#0a0a0c",
              borderBottom:   "1px solid rgba(212,175,55,0.10)",
              flexShrink:     0,
            }}>

              {/* Left — live clock */}
              <div style={{ minWidth: 150 }}>
                <div style={{
                  ...SILVER,
                  fontSize:          "20px",
                  letterSpacing:     "0.12em",
                  fontWeight:        200,
                  fontVariantNumeric:"tabular-nums",
                }}>
                  {time}
                </div>
                <div style={{
                  fontSize:      "6.5px",
                  letterSpacing: "0.38em",
                  color:         "rgba(200,180,120,0.36)",
                  textTransform: "uppercase",
                  marginTop:     3,
                }}>
                  {date}
                </div>
              </div>

              {/* Center — AXIOM OS wordmark */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  ...GOLD_LUSTER,
                  fontSize:      "clamp(18px, 2vw, 26px)",
                  letterSpacing: "0.58em",
                  fontWeight:    900,
                  textTransform: "uppercase",
                }}>
                  Axiom OS
                </div>
                <div style={{
                  fontSize:      "6.5px",
                  letterSpacing: "0.52em",
                  textTransform: "uppercase",
                  color:         "rgba(200,180,120,0.36)",
                  marginTop:     4,
                }}>
                  Powered by CraftHub
                </div>
              </div>

              {/* Right — operational indicators */}
              <div style={{ minWidth: 150, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                {[
                  { label: `${CRAFT_MODULES.length} Craft Modules`, dot: "#D4AF37" },
                  { label: "12 Curated Scenes",                     dot: "#5ab85a" },
                  { label: "Intelligence Active",                    dot: "#D4AF37" },
                ].map(({ label, dot }, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{
                      fontSize:      "6.5px",
                      letterSpacing: "0.30em",
                      textTransform: "uppercase",
                      color:         "rgba(200,180,120,0.40)",
                    }}>
                      {label}
                    </span>
                    <PulseDot color={dot} />
                  </div>
                ))}
              </div>
            </header>

            {/* ── 3. 2×2 hardware grid ── */}
            <main style={{
              display:             "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows:    "1fr 1fr",
              gap:                 14,
              height:              "calc(100vh - 160px)",
              padding:             14,
              flex:                "1 1 0",
              minHeight:           0,
            }}>
              {CRAFT_MODULES.map(mod => (
                <CraftCard
                  key={mod.id}
                  id={mod.id}
                  title={mod.title}
                  color={mod.color}
                  route={mod.route}
                />
              ))}
            </main>

            {/* ── 4. Bottom kinetic ticker ── */}
            <BottomTicker />

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
