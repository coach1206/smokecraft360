/**
 * TitanCraftDeck — Axiom OS operational command center.
 * Route: / and /titan-hub
 *
 * Identity: intelligent luxury hospitality OS running inside a premium machine.
 * Layout: telemetry strip → 3-col header → 2×2 craft grid → footer status strip → ticker
 */

import { useEffect, useState }        from "react";
import { useLocation }                from "wouter";
import { motion, AnimatePresence }    from "framer-motion";
import { CRAFT_MODULES }              from "@/data/craftScenes";
import TickerTape                     from "@/components/TickerTape";

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

// ── Telemetry strip data ──────────────────────────────────────────────────────

const TELEMETRY: { label: string; status: string; gold: boolean }[] = [
  { label: "AXIOM INTELLIGENCE",    status: "ACTIVE",  gold: true  },
  { label: "RECOMMENDATION ENGINE", status: "READY",   gold: false },
  { label: "INVENTORY SYNC",        status: "LIVE",    gold: true  },
  { label: "TASTE PROFILE",         status: "LOADED",  gold: false },
  { label: "REVENUE BRAIN",         status: "ONLINE",  gold: true  },
];

const FOOTER_STATUS = [
  "DayOne 360 ADV",
  "LIVE STATUS: ACTIVE",
  "SYSTEM LINK: STABLE",
  "AXIOM NODE: CONNECTED",
  "RECOMMENDATION ENGINE: READY",
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

// ── Craft card — premium metallic tile ────────────────────────────────────────

interface CardProps {
  id:    string;
  title: string;
  color: string;
  route: string;
  badge: string;
}

function CraftCard({ id, title, color, route, badge }: CardProps) {
  const [, navigate]  = useLocation();
  const [hov, setHov] = useState(false);
  const img   = CRAFT_IMAGES[id]  ?? CRAFT_IMAGES["smoke"]!;
  const sub   = CRAFT_SUBS[id]    ?? "";
  const isSm  = id === "smoke";

  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={() => navigate(route)}
      animate={{
        y:         hov ? -4 : 0,
        boxShadow: hov
          ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px ${color}55, 0 16px 40px rgba(0,0,0,0.85), 0 0 28px ${color}18`
          : `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(180,160,80,0.16), 0 4px 20px rgba(0,0,0,0.70)`,
      }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        position:     "relative",
        overflow:     "hidden",
        borderRadius: 14,
        background:   "#0c0c0e",
        cursor:       "pointer",
        height:       "100%",
      }}
    >
      {/* Hero image — raw, no filter, no animation */}
      <img
        src={img}
        alt={title}
        style={{
          position:       "absolute",
          inset:          0,
          width:          "100%",
          height:         "100%",
          objectFit:      "cover",
          objectPosition: "center",
          display:        "block",
          filter:         "none",
          transform:      "scale(1)",
        }}
      />

      {/* Bottom legibility gradient — text zone only, no fog */}
      <div style={{
        position:   "absolute",
        inset:      0,
        zIndex:     10,
        background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.28) 38%, transparent 62%)",
      }} />

      {/* Metallic top accent line */}
      <motion.div
        style={{
          position:   "absolute",
          top:        0, left: 0, right: 0,
          height:     2,
          zIndex:     20,
          background: color,
        }}
        animate={{ opacity: hov ? [0.9, 1, 0.9] : [0.4, 0.65, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Corner highlights on hover — metallic reflection */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        15,
          pointerEvents: "none",
          background:    `radial-gradient(ellipse 45% 35% at 2% 2%, rgba(255,255,255,0.05) 0%, transparent 55%),
                          radial-gradient(ellipse 30% 25% at 98% 98%, ${color}0c 0%, transparent 55%)`,
        }}
      />

      {/* Badge — top right */}
      <div style={{
        position:      "absolute",
        top:           12,
        right:         14,
        zIndex:        25,
        background:    "rgba(0,0,0,0.65)",
        border:        `1px solid ${color}50`,
        borderRadius:  6,
        padding:       "3px 9px",
        backdropFilter:"blur(8px)",
      }}>
        <span style={{
          fontSize:      "7px",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color:         "rgba(220,210,180,0.8)",
          fontWeight:    700,
        }}>
          {badge.replace(/[^\x20-\x7E]/g, "").trim()}
        </span>
      </div>

      {/* Bottom text */}
      <div style={{
        position:  "absolute",
        bottom:    0,
        left:      0,
        width:     "100%",
        padding:   "18px 20px",
        zIndex:    20,
      }}>
        <h2 style={{
          fontSize:      "clamp(0.78rem, 1.2vw, 1.2rem)",
          fontStyle:     "italic",
          letterSpacing: "0.45em",
          marginBottom:  5,
          lineHeight:    1,
          textTransform: "uppercase",
          fontWeight:    900,
          whiteSpace:    "nowrap",
          ...(isSm
            ? {
                background:           "linear-gradient(90deg, #8a6d3b 0%, #fff9e6 25%, #d4af37 50%, #fff9e6 75%, #8a6d3b 100%)",
                backgroundSize:       "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
                filter:               "drop-shadow(0 0 8px rgba(212,175,55,.5))",
                animation:            "gold-shimmer 5s linear infinite",
              }
            : {
                background:           "linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(195,195,205,0.65) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }),
        }}>
          {title}
        </h2>
        <p style={{
          fontSize:      "7.5px",
          letterSpacing: ".38em",
          textTransform: "uppercase",
          color:         "rgba(220,210,180,0.45)",
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
    <AnimatePresence>
      {mounted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
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

          {/* ── 1. Top telemetry strip ────────────────────────────────── */}
          <div style={{
            height:        28,
            background:    "#050505",
            borderBottom:  "1px solid rgba(212,175,55,0.13)",
            display:       "flex",
            alignItems:    "center",
            paddingInline: 20,
            gap:           0,
            flexShrink:    0,
            overflow:      "hidden",
          }}>
            {TELEMETRY.map((t, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <PulseDot color={t.gold ? "#D4AF37" : "#5ab85a"} />
                <span style={{
                  fontSize:      "7px",
                  letterSpacing: "0.30em",
                  textTransform: "uppercase",
                  color:         t.gold ? "rgba(212,175,55,0.70)" : "rgba(190,190,200,0.50)",
                  fontWeight:    600,
                }}>
                  {t.label}
                </span>
                <span style={{
                  fontSize:      "6.5px",
                  letterSpacing: "0.20em",
                  color:         t.gold ? "rgba(212,175,55,0.45)" : "rgba(190,190,200,0.30)",
                  marginLeft:    2,
                }}>
                  {t.status}
                </span>
                {i < TELEMETRY.length - 1 && (
                  <span style={{
                    color:       "rgba(212,175,55,0.18)",
                    fontSize:    "7px",
                    marginInline: 12,
                  }}>◆</span>
                )}
              </span>
            ))}
          </div>

          {/* ── 2. Header ─────────────────────────────────────────────── */}
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
                color:         "rgba(200,180,120,0.38)",
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
                color:         "rgba(200,180,120,0.38)",
                marginTop:     4,
              }}>
                Powered by CraftHub
              </div>
            </div>

            {/* Right — operational indicators */}
            <div style={{ minWidth: 150, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              {[
                { label: `${CRAFT_MODULES.length} Craft Modules`, color: "#D4AF37" },
                { label: "12 Curated Scenes",                     color: "#5ab85a" },
                { label: "Intelligence Active",                    color: "#D4AF37" },
              ].map(({ label, color }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize:      "6.5px",
                    letterSpacing: "0.30em",
                    textTransform: "uppercase",
                    color:         "rgba(200,180,120,0.42)",
                  }}>
                    {label}
                  </span>
                  <PulseDot color={color} />
                </div>
              ))}
            </div>
          </header>

          {/* ── 3. 2×2 Craft grid ─────────────────────────────────────── */}
          <main style={{
            display:             "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows:    "1fr 1fr",
            gap:                 14,
            flex:                "1 1 0",
            minHeight:           0,
            padding:             14,
          }}>
            {CRAFT_MODULES.map(mod => (
              <CraftCard
                key={mod.id}
                id={mod.id}
                title={mod.title}
                color={mod.color}
                route={mod.route}
                badge={mod.badge}
              />
            ))}
          </main>

          {/* ── 4. Footer status strip ────────────────────────────────── */}
          <div style={{
            height:        40,
            background:    "#050505",
            borderTop:     "1px solid rgba(212,175,55,0.10)",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"space-between",
            paddingInline: 22,
            flexShrink:    0,
            marginBottom:  36,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {FOOTER_STATUS.map((item, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                  <span style={{
                    fontSize:      "7.5px",
                    letterSpacing: "0.30em",
                    textTransform: "uppercase",
                    fontWeight:    i === 0 ? 800 : 500,
                    ...(i === 0
                      ? GOLD_LUSTER
                      : { color: "rgba(200,180,120,0.42)" }),
                  }}>
                    {item}
                  </span>
                  {i < FOOTER_STATUS.length - 1 && (
                    <span style={{ color: "rgba(212,175,55,0.18)", fontSize: "6.5px", marginInline: 12 }}>◆</span>
                  )}
                </span>
              ))}
            </div>

            {/* Right — live timestamp + entry links */}
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <button
                onClick={() => navigate("/enrollment")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "7px", letterSpacing: "0.38em",
                  textTransform: "uppercase", color: "rgba(200,180,120,0.30)",
                  fontFamily: "inherit", padding: 0,
                }}
              >
                New Guest
              </button>
              <button
                onClick={() => navigate("/craft-hub")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "7px", letterSpacing: "0.38em",
                  textTransform: "uppercase", color: "rgba(200,180,120,0.30)",
                  fontFamily: "inherit", padding: 0,
                }}
              >
                Returning?
              </button>
              <div style={{
                fontSize:      "7px",
                letterSpacing: "0.25em",
                color:         "rgba(200,180,120,0.30)",
                textTransform: "uppercase",
                fontVariantNumeric: "tabular-nums",
              }}>
                {date} · {time}
              </div>
            </div>
          </div>

          {/* ── 5. TickerTape — live brand feed ───────────────────────── */}
          <TickerTape position="bottom" />

        </motion.div>
      )}
    </AnimatePresence>
  );
}
