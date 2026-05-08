/**
 * TitanCraftDeck — Axiom OS Sovereign Environmental Core.
 * Route: /titan-hub
 *
 * Identity: 3D Environmental HUD. Not a website. Not a card grid.
 * A luxury hospitality machine — full-bleed, full-environment, full-sovereign.
 *
 * Layout: full-screen 2×2 environmental canvas with floating HUD overlays.
 * No rounded corners. No borders. No cards. Four environments bleeding into one.
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

// ── Shared style token ────────────────────────────────────────────────────────

// Spec-exact gold hardware gradient
const GOLD_TEXT: React.CSSProperties = {
  background:           "linear-gradient(to bottom, #FFF9E6 0%, #D4AF37 40%, #B8860B 70%, #8A6D3B 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  filter:               "drop-shadow(0 0 10px rgba(212,175,55,0.55))",
};

// Spec-exact silver chassis gradient
const SILVER_TEXT: React.CSSProperties = {
  background:           "linear-gradient(to bottom, #FFFFFF 0%, #C0C0C0 50%, #4D4D4D 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// ── Keyframes ─────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes titan-top-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes titan-bot-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes axiom-core-breathe {
    0%, 100% {
      box-shadow:
        0 0 0 1px rgba(212,175,55,0.55),
        0 0 12px rgba(212,175,55,0.30),
        0 0 40px rgba(212,175,55,0.15);
      transform: translate(-50%,-50%) scale(1);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(255,249,230,0.95),
        0 0 40px rgba(212,175,55,0.60),
        0 0 100px rgba(212,175,55,0.30),
        0 0 160px rgba(212,175,55,0.12);
      transform: translate(-50%,-50%) scale(1.22);
    }
  }
  @keyframes gold-sweep {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes hud-pulse {
    0%, 100% { opacity: 0.72; }
    50%       { opacity: 1; }
  }
  .titan-top-track {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    animation: titan-top-scroll 40s linear infinite;
    will-change: transform;
  }
  .titan-bot-track {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    animation: titan-bot-scroll 54s linear infinite;
    will-change: transform;
  }
  /* Gold hardware label — spec gradient, animated sweep */
  .gold-label-shimmer {
    background: linear-gradient(to bottom, #FFF9E6 0%, #D4AF37 40%, #B8860B 70%, #8A6D3B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 14px rgba(212,175,55,0.70));
  }
  /* Silver chassis label — spec gradient */
  .silver-label {
    background: linear-gradient(to bottom, #FFFFFF 0%, #C0C0C0 50%, #4D4D4D 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 6px rgba(255,255,255,0.28));
  }
  /* HUD gold — kinetic sweep for >>> items */
  .hud-gold-sweep {
    background: linear-gradient(to bottom, #FFF9E6 0%, #D4AF37 40%, #B8860B 70%, #8A6D3B 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(212,175,55,0.60));
  }
`;

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.28, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display:      "inline-block",
        width:        5,
        height:       5,
        borderRadius: "50%",
        background:   color,
        boxShadow:    `0 0 7px ${color}`,
        flexShrink:   0,
      }}
    />
  );
}

// ── Top HUD ticker — transparent, projected onto scene ────────────────────────

function TopTicker() {
  const doubled = [...TOP_ITEMS, ...TOP_ITEMS];
  return (
    <div style={{
      position:   "absolute",
      top:        0,
      left:       0,
      right:      0,
      height:     28,
      zIndex:     80,
      overflow:   "hidden",
      display:    "flex",
      alignItems: "center",
      // Transparent bar — text projected onto environment below
      background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
    }}>
      {/* Edge fade masks */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to right, rgba(0,0,0,0.60), transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to left, rgba(0,0,0,0.60), transparent)" }} />

      <div className="titan-top-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            <span style={{
              ...SILVER_TEXT,
              fontSize:      12,
              letterSpacing: "0.6em",
              fontWeight:    700,
              textTransform: "uppercase",
              paddingInline: 10,
              animation:     "hud-pulse 4s ease-in-out infinite",
            }}>
              {item}
            </span>
            <span style={{ color:"rgba(212,175,55,0.22)", fontSize:8, paddingInline:8 }}>//</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bottom HUD ticker — gold, projected ───────────────────────────────────────

function BottomTicker() {
  const doubled = [...BOTTOM_ITEMS, ...BOTTOM_ITEMS];
  return (
    <div style={{
      position:       "absolute",
      bottom:         0,
      left:           0,
      right:          0,
      height:         40,
      zIndex:         80,
      overflow:       "hidden",
      display:        "flex",
      alignItems:     "center",
      // Obsidian strip — frosted glass over the environment
      background:     "rgba(0, 0, 0, 0.42)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to right, rgba(0,0,0,0.70), transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to left, rgba(0,0,0,0.70), transparent)" }} />

      {/* Hair-line gold rule above bottom feed */}
      <div style={{
        position:   "absolute",
        top:        0, left: "8%", right: "8%",
        height:     "0.5px",
        background: "linear-gradient(to right, transparent, rgba(212,175,55,0.50) 20%, rgba(255,249,230,0.80) 50%, rgba(212,175,55,0.50) 80%, transparent)",
        zIndex:     3,
      }} />

      <div className="titan-bot-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            <span
              className={item.startsWith(">>>") ? "hud-gold-sweep" : undefined}
              style={{
                fontSize:      13,
                letterSpacing: "0.6em",
                textTransform: "uppercase",
                fontWeight:    item.startsWith(">>>") ? 800 : 600,
                paddingInline: 10,
                ...(!item.startsWith(">>>") ? { color:"rgba(212,175,55,0.75)" } : {}),
              }}
            >
              {item}
            </span>
            <span style={{ color:"rgba(212,175,55,0.28)", fontSize:8, paddingInline:8 }}>///</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Floating header — transparent HUD strip ───────────────────────────────────

function HudHeader({ time, date, craftCount }: { time: string; date: string; craftCount: number }) {
  return (
    <div style={{
      position:       "absolute",
      top:            28,
      left:           0,
      right:          0,
      zIndex:         75,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "6px 24px",
      background:     "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, transparent 100%)",
      pointerEvents:  "none",
    }}>

      {/* Left — clock */}
      <div style={{ minWidth: 130, pointerEvents:"none" }}>
        <div style={{
          ...SILVER_TEXT,
          fontSize:           "18px",
          letterSpacing:      "0.10em",
          fontWeight:         200,
          fontVariantNumeric: "tabular-nums",
        }}>
          {time}
        </div>
        <div style={{
          fontSize:      "6px",
          letterSpacing: "0.36em",
          color:         "rgba(200,180,120,0.44)",
          textTransform: "uppercase",
          marginTop:     2,
        }}>
          {date}
        </div>
      </div>

      {/* Center — wordmark */}
      <div style={{ textAlign:"center", pointerEvents:"none" }}>
        <div style={{
          ...GOLD_TEXT,
          fontSize:      "clamp(15px, 1.8vw, 22px)",
          letterSpacing: "0.65em",
          fontWeight:    900,
          textTransform: "uppercase",
        }}>
          Axiom OS
        </div>
        <div style={{
          fontSize:      "5.5px",
          letterSpacing: "0.55em",
          textTransform: "uppercase",
          color:         "rgba(200,180,120,0.38)",
          marginTop:     3,
        }}>
          Experience Engine
        </div>
      </div>

      {/* Right — indicators */}
      <div style={{ minWidth: 130, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end", pointerEvents:"none" }}>
        {[
          { label: `${craftCount} Craft Modules`, dot: "#D4AF37" },
          { label: "12 Curated Scenes",           dot: "#5ab85a" },
          { label: "Intelligence Active",          dot: "#D4AF37" },
        ].map(({ label, dot }, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{
              fontSize:      "5.5px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color:         "rgba(200,180,120,0.44)",
            }}>
              {label}
            </span>
            <PulseDot color={dot} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Axiom Core — center intelligence orb ─────────────────────────────────────

function AxiomCore() {
  return (
    <div
      style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        zIndex:       100,
        width:        12,
        height:       12,
        borderRadius: "50%",
        background:   "radial-gradient(circle, #fff9e6 0%, #d4af37 48%, #8a6d3b 100%)",
        animation:    "axiom-core-breathe 3s ease-in-out infinite",
        pointerEvents:"none",
      }}
    />
  );
}

// ── Center hair-line seams — laser-etched, fade at edges ──────────────────────

function CenterSeams() {
  return (
    <>
      {/* Horizontal seam — fades at left/right edges */}
      <div style={{
        position:      "absolute",
        top:           "50%",
        left:          0,
        right:         0,
        height:        "0.5px",
        transform:     "translateY(-50%)",
        background:    "linear-gradient(to right, transparent 0%, rgba(212,175,55,0.20) 10%, rgba(255,249,230,0.50) 30%, rgba(212,175,55,0.60) 50%, rgba(255,249,230,0.50) 70%, rgba(212,175,55,0.20) 90%, transparent 100%)",
        zIndex:        90,
        pointerEvents: "none",
      }} />

      {/* Vertical seam — fades at top/bottom edges */}
      <div style={{
        position:      "absolute",
        top:           0,
        bottom:        0,
        left:          "50%",
        width:         "0.5px",
        transform:     "translateX(-50%)",
        background:    "linear-gradient(to bottom, transparent 0%, rgba(212,175,55,0.20) 10%, rgba(255,249,230,0.50) 30%, rgba(212,175,55,0.60) 50%, rgba(255,249,230,0.50) 70%, rgba(212,175,55,0.20) 90%, transparent 100%)",
        zIndex:        90,
        pointerEvents: "none",
      }} />
    </>
  );
}

// ── Environmental quadrant — full-bleed, no card ──────────────────────────────

type QuadPos = "tl" | "tr" | "bl" | "br";

interface QuadProps {
  id:       string;
  title:    string;
  color:    string;
  route:    string;
  position: QuadPos;
}

// Outer corner = the corner pointing away from grid center (stays sharp/visible)
// mask-image fades from opaque at the outer corner → transparent at the inner corner
// Result: each environment is fully visible in its own territory, melts into the
// shared center where the AxiomCore orb lives.
const OUTER_CORNER: Record<QuadPos, string> = {
  tl: "top left",
  tr: "top right",
  bl: "bottom left",
  br: "bottom right",
};

// Rim lighting — Silver Glint spec
const RIM: Record<QuadPos, React.CSSProperties> = {
  tl: { borderTop: "1.5px solid rgba(255,255,255,0.40)", borderLeft:  "1px solid rgba(255,255,255,0.10)" },
  tr: { borderTop: "1.5px solid rgba(255,255,255,0.40)", borderRight: "1px solid rgba(255,255,255,0.10)" },
  bl: { borderBottom: "1.5px solid rgba(255,255,255,0.40)", borderLeft:  "1px solid rgba(255,255,255,0.10)" },
  br: { borderBottom: "1.5px solid rgba(255,255,255,0.40)", borderRight: "1px solid rgba(255,255,255,0.10)" },
};

function EnvironmentQuad({ id, title, color, route, position }: QuadProps) {
  const [, navigate] = useLocation();
  const [hov, setHov] = useState(false);
  const img    = CRAFT_IMAGES[id] ?? CRAFT_IMAGES["smoke"]!;
  const sub    = CRAFT_SUBS[id]   ?? "";
  const label  = `[ ${title.toUpperCase()} 360 ]`;
  const isSmoke = id === "smoke";

  // mask-image: environment is fully visible at its outer corner, fades to
  // transparent toward the grid center — "smoke in a room" organic merge
  const maskValue = `radial-gradient(ellipse 105% 105% at ${OUTER_CORNER[position]}, black 45%, transparent 82%)`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(route)}
      style={{
        position:             "relative",
        overflow:             "hidden",
        cursor:               "pointer",
        // Mask — organic fade from outer corner toward grid center
        maskImage:            maskValue,
        WebkitMaskImage:      maskValue,
        // Rim lighting — Silver Glint on machined edges
        ...RIM[position],
      }}
    >
      {/* ── Environment image — full-bleed, heads visible ── */}
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
          filter: isSmoke
            ? "saturate(1.5) brightness(1.1)"
            : "saturate(1.0) brightness(1.0)",
        }}
      />

      {/* ── Bottom legibility ramp — only bottom 28% ── */}
      <div style={{
        position:      "absolute",
        inset:         0,
        zIndex:        9,
        pointerEvents: "none",
        background:    "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 28%, transparent 44%)",
      }} />

      {/* ── Hover scale hint — subtle, not jarring ── */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.30 }}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        10,
          pointerEvents: "none",
          background:    `radial-gradient(ellipse 60% 40% at 50% 0%, ${color}0d 0%, transparent 60%)`,
        }}
      />

      {/* ── Craft color accent line — top edge breathing ── */}
      <motion.div
        style={{
          position:   "absolute",
          top:        0, left:0, right:0,
          height:     2,
          zIndex:     12,
          background: color,
        }}
        animate={{ opacity: hov ? [0.95, 1, 0.95] : [0.25, 0.50, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Label — laser-etched ── */}
      <div style={{
        position:      "absolute",
        bottom:        0,
        left:          0,
        width:         "100%",
        padding:       "12px 18px",
        zIndex:        20,
        pointerEvents: "none",
      }}>
        <h2
          className={isSmoke ? "gold-label-shimmer" : "silver-label"}
          style={{
            fontSize:      "clamp(0.68rem, 0.95vw, 1.0rem)",
            fontStyle:     "italic",
            letterSpacing: "0.52em",
            marginBottom:  4,
            lineHeight:    1,
            textTransform: "uppercase",
            fontWeight:    900,
            whiteSpace:    "nowrap",
          }}
        >
          {label}
        </h2>
        <p style={{
          fontSize:      "6px",
          letterSpacing: "0.40em",
          textTransform: "uppercase",
          color:         "rgba(220,210,180,0.42)",
          marginBottom:  0,
        }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const QUAD_POSITIONS: QuadPos[] = ["tl", "tr", "bl", "br"];

export default function TitanCraftDeck() {
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
            transition={{ duration: 0.40, ease: "easeInOut" }}
            style={{
              position: "relative",
              height:   "100vh",
              width:    "100%",
              overflow: "hidden",
              background: "#030303",
            }}
          >

            {/* ── Full-bleed 2×2 environmental grid — no gap, no border, no card ── */}
            <div style={{
              position:            "absolute",
              inset:               0,
              display:             "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows:    "1fr 1fr",
              gap:                 0,
            }}>
              {CRAFT_MODULES.map((mod, idx) => (
                <EnvironmentQuad
                  key={mod.id}
                  id={mod.id}
                  title={mod.title}
                  color={mod.color}
                  route={mod.route}
                  position={QUAD_POSITIONS[idx] ?? "tl"}
                />
              ))}
            </div>

            {/* ── Global amber color grade — unifies all four environments ── */}
            <div style={{
              position:      "absolute",
              inset:         0,
              zIndex:        5,
              pointerEvents: "none",
              background:    "rgba(180, 120, 0, 0.07)",
            }} />

            {/* ── Laser-etched center seams ── */}
            <CenterSeams />

            {/* ── Axiom Core — breathing gold orb at grid intersection ── */}
            <AxiomCore />

            {/* ── Floating HUD overlays ── */}
            <TopTicker />
            <HudHeader time={time} date={date} craftCount={CRAFT_MODULES.length} />
            <BottomTicker />

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
