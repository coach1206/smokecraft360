/**
 * TitanCraftDeck — Axiom OS Sovereign Environmental Core.
 * Route: /titan-hub
 *
 * Identity: 3D Environmental HUD. Not a website. Not a card grid.
 * A luxury hospitality machine — full-bleed, full-environment, full-sovereign.
 */

import { useEffect, useState }     from "react";
import { useLocation }             from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CRAFT_MODULES }           from "@/data/craftScenes";

// ── Craft images ──────────────────────────────────────────────────────────────

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

// Bottom items — ">>>" prefix marks gold-sweep items
const BOTTOM_ITEMS = [
  { text: "DAYONE 360 ADV", hero: true },
  { text: "REVENUE ENGINE: OPTIMIZED", hero: false },
  { text: "LIVE UPDATE: 25% OFF EXOTIC VAPOR ATELIER", hero: false },
  { text: "SYSTEM STATUS: SOVEREIGN", hero: false },
  { text: "AXIOM NODE: CONNECTED", hero: false },
  { text: "INVENTORY SYNC: LIVE", hero: false },
  { text: "DAYONE 360 ADV", hero: true },
  { text: "RECOMMENDATION ENGINE: READY", hero: false },
  { text: "SYSTEM LINK: STABLE", hero: false },
];

// ── Material tokens — spec-exact ─────────────────────────────────────────────

// Gold hardware: vertical luster, polished metal catching overhead light
const GOLD_TEXT: React.CSSProperties = {
  background:           "linear-gradient(to bottom, #FFF9E6 0%, #D4AF37 40%, #B8860B 70%, #8A6D3B 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
  filter:               "drop-shadow(0 0 10px rgba(212,175,55,0.55))",
};

// Silver chassis: white highlight crown, brushed aluminum mid, dark shadow base
const SILVER_TEXT: React.CSSProperties = {
  background:           "linear-gradient(to bottom, #FFFFFF 0%, #C0C0C0 50%, #4D4D4D 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// ── Keyframes + CSS classes ────────────────────────────────────────────────────

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
  @keyframes hud-pulse {
    0%, 100% { opacity: 0.72; }
    50%       { opacity: 1.00; }
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
  /* Gold hardware label — spec gradient */
  .gold-label {
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
  /* Hero ticker items — gold luster */
  .ticker-hero {
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
        width:        5, height: 5,
        borderRadius: "50%",
        background:   color,
        boxShadow:    `0 0 7px ${color}`,
        flexShrink:   0,
      }}
    />
  );
}

// ── Top HUD ticker — projected silver telemetry ────────────────────────────────

function TopTicker() {
  const doubled = [...TOP_ITEMS, ...TOP_ITEMS];
  return (
    <div style={{
      position:   "absolute",
      top:        0, left:0, right:0,
      height:     28,
      zIndex:     80,
      overflow:   "hidden",
      display:    "flex",
      alignItems: "center",
      background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)",
    }}>
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

// ── Bottom HUD ticker — obsidian frosted strip, gold kinetic feed ─────────────

function BottomTicker() {
  const doubled = [...BOTTOM_ITEMS, ...BOTTOM_ITEMS];
  return (
    <div style={{
      position:             "absolute",
      bottom:               0, left:0, right:0,
      height:               40,
      zIndex:               80,
      overflow:             "hidden",
      display:              "flex",
      alignItems:           "center",
      background:           "rgba(0, 0, 0, 0.42)",
      backdropFilter:       "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to right, rgba(0,0,0,0.70), transparent)" }} />
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, zIndex:2, pointerEvents:"none",
        background:"linear-gradient(to left, rgba(0,0,0,0.70), transparent)" }} />

      {/* Hair-line gold rule above feed */}
      <div style={{
        position:   "absolute",
        top:        0, left:"8%", right:"8%",
        height:     "0.5px",
        background: "linear-gradient(to right, transparent, rgba(212,175,55,0.50) 20%, rgba(255,249,230,0.80) 50%, rgba(212,175,55,0.50) 80%, transparent)",
        zIndex:     3,
      }} />

      <div className="titan-bot-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center" }}>
            {item.hero ? (
              <span className="ticker-hero" style={{
                fontSize:      13,
                letterSpacing: "0.6em",
                textTransform: "uppercase",
                fontWeight:    800,
                paddingInline: 10,
              }}>
                {/* Chevrons as JSX entities to avoid parse errors */}
                {"\u203A\u203A\u203A"} {item.text}
              </span>
            ) : (
              <span style={{
                fontSize:      13,
                letterSpacing: "0.6em",
                textTransform: "uppercase",
                fontWeight:    600,
                paddingInline: 10,
                color:         "rgba(212,175,55,0.75)",
              }}>
                {item.text}
              </span>
            )}
            <span style={{ color:"rgba(212,175,55,0.28)", fontSize:8, paddingInline:8 }}>///</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Floating HUD header ────────────────────────────────────────────────────────

function HudHeader({ time, date, craftCount }: { time: string; date: string; craftCount: number }) {
  return (
    <div style={{
      position:       "absolute",
      top:            28, left:0, right:0,
      zIndex:         75,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "6px 24px",
      background:     "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, transparent 100%)",
      pointerEvents:  "none",
    }}>
      {/* Left — clock */}
      <div style={{ minWidth:130 }}>
        <div style={{ ...SILVER_TEXT, fontSize:"18px", letterSpacing:"0.10em", fontWeight:200, fontVariantNumeric:"tabular-nums" }}>
          {time}
        </div>
        <div style={{ fontSize:"6px", letterSpacing:"0.36em", color:"rgba(200,180,120,0.44)", textTransform:"uppercase", marginTop:2 }}>
          {date}
        </div>
      </div>

      {/* Center — wordmark */}
      <div style={{ textAlign:"center" }}>
        <div style={{ ...GOLD_TEXT, fontSize:"clamp(15px,1.8vw,22px)", letterSpacing:"0.65em", fontWeight:900, textTransform:"uppercase" }}>
          Axiom OS
        </div>
        <div style={{ fontSize:"5.5px", letterSpacing:"0.55em", textTransform:"uppercase", color:"rgba(200,180,120,0.38)", marginTop:3 }}>
          Experience Engine
        </div>
      </div>

      {/* Right — status indicators */}
      <div style={{ minWidth:130, display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
        {[
          { label: `${craftCount} Craft Modules`, dot:"#D4AF37" },
          { label: "12 Curated Scenes",           dot:"#5ab85a" },
          { label: "Intelligence Active",          dot:"#D4AF37" },
        ].map(({ label, dot }, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"5.5px", letterSpacing:"0.28em", textTransform:"uppercase", color:"rgba(200,180,120,0.44)" }}>
              {label}
            </span>
            <PulseDot color={dot} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Axiom Core — 12px breathing gold orb at grid center ──────────────────────

function AxiomCore() {
  return (
    <div style={{
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
    }} />
  );
}

// ── Laser-etched center seams — hair-lines fading at edges ───────────────────

function CenterSeams() {
  return (
    <>
      <div style={{
        position:"absolute", top:"50%", left:0, right:0, height:"0.5px",
        transform:"translateY(-50%)",
        background:"linear-gradient(to right, transparent 0%, rgba(212,175,55,0.20) 10%, rgba(255,249,230,0.50) 30%, rgba(212,175,55,0.60) 50%, rgba(255,249,230,0.50) 70%, rgba(212,175,55,0.20) 90%, transparent 100%)",
        zIndex:90, pointerEvents:"none",
      }} />
      <div style={{
        position:"absolute", top:0, bottom:0, left:"50%", width:"0.5px",
        transform:"translateX(-50%)",
        background:"linear-gradient(to bottom, transparent 0%, rgba(212,175,55,0.20) 10%, rgba(255,249,230,0.50) 30%, rgba(212,175,55,0.60) 50%, rgba(255,249,230,0.50) 70%, rgba(212,175,55,0.20) 90%, transparent 100%)",
        zIndex:90, pointerEvents:"none",
      }} />
    </>
  );
}

// ── Environmental quadrant ────────────────────────────────────────────────────

type QuadPos = "tl" | "tr" | "bl" | "br";

// Outer corner = away from grid center — mask keeps this corner sharp
const OUTER_CORNER: Record<QuadPos, string> = {
  tl: "top left", tr: "top right", bl: "bottom left", br: "bottom right",
};

// Rim lighting — Silver Glint on machined perimeter edges
const RIM: Record<QuadPos, React.CSSProperties> = {
  tl: { borderTop:"1.5px solid rgba(255,255,255,0.40)", borderLeft: "1px solid rgba(255,255,255,0.10)" },
  tr: { borderTop:"1.5px solid rgba(255,255,255,0.40)", borderRight:"1px solid rgba(255,255,255,0.10)" },
  bl: { borderBottom:"1.5px solid rgba(255,255,255,0.40)", borderLeft: "1px solid rgba(255,255,255,0.10)" },
  br: { borderBottom:"1.5px solid rgba(255,255,255,0.40)", borderRight:"1px solid rgba(255,255,255,0.10)" },
};

interface QuadProps { id:string; title:string; color:string; route:string; position:QuadPos; }

function EnvironmentQuad({ id, title, color, route, position }: QuadProps) {
  const [, navigate] = useLocation();
  const [hov, setHov] = useState(false);
  const img     = CRAFT_IMAGES[id] ?? CRAFT_IMAGES["smoke"]!;
  const sub     = CRAFT_SUBS[id]   ?? "";
  const label   = `[ ${title.toUpperCase()} 360 ]`;
  const isSmoke = id === "smoke";

  // mask-image: each environment fades from opaque at its outer corner toward
  // transparent at the shared grid center — organic "smoke in a room" merge
  const mask = `radial-gradient(ellipse 105% 105% at ${OUTER_CORNER[position]}, black 45%, transparent 82%)`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(route)}
      style={{
        position:             "relative",
        overflow:             "hidden",
        cursor:               "pointer",
        maskImage:            mask,
        WebkitMaskImage:      mask,
        ...RIM[position],
      }}
    >
      {/* Hero image — full-bleed, heads at top */}
      <img
        src={img}
        alt={title}
        style={{
          position:"absolute", inset:0,
          width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"top",
          display:"block",
          filter: isSmoke ? "saturate(1.5) brightness(1.1)" : "none",
        }}
      />

      {/* Bottom legibility ramp — bottom 28% only */}
      <div style={{
        position:"absolute", inset:0, zIndex:9, pointerEvents:"none",
        background:"linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 28%, transparent 44%)",
      }} />

      {/* Hover tint */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0 }}
        transition={{ duration: 0.28 }}
        style={{
          position:"absolute", inset:0, zIndex:10, pointerEvents:"none",
          background:`radial-gradient(ellipse 60% 40% at 50% 0%, ${color}12 0%, transparent 60%)`,
        }}
      />

      {/* Craft color accent line — top edge, breathing */}
      <motion.div
        style={{ position:"absolute", top:0, left:0, right:0, height:2, zIndex:12, background:color }}
        animate={{ opacity: hov ? [0.95,1,0.95] : [0.22,0.48,0.22] }}
        transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut" }}
      />

      {/* Laser-etched label */}
      <div style={{ position:"absolute", bottom:0, left:0, width:"100%", padding:"12px 18px", zIndex:20, pointerEvents:"none" }}>
        <h2
          className={isSmoke ? "gold-label" : "silver-label"}
          style={{
            fontSize:"clamp(0.68rem,0.95vw,1.0rem)",
            fontStyle:"italic",
            letterSpacing:"0.52em",
            marginBottom:4,
            lineHeight:1,
            textTransform:"uppercase",
            fontWeight:900,
            whiteSpace:"nowrap",
          }}
        >
          {label}
        </h2>
        <p style={{ fontSize:"6px", letterSpacing:"0.40em", textTransform:"uppercase", color:"rgba(220,210,180,0.42)", marginBottom:0 }}>
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
      setTime(now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }));
      setDate(now.toLocaleDateString([], { weekday:"short", month:"short", day:"numeric" }));
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
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.40, ease:"easeInOut" }}
            style={{ position:"relative", height:"100vh", width:"100%", overflow:"hidden", background:"#030303" }}
          >
            {/* Full-bleed 2×2 environmental canvas */}
            <div style={{
              position:"absolute", inset:0,
              display:"grid",
              gridTemplateColumns:"1fr 1fr",
              gridTemplateRows:"1fr 1fr",
              gap:0,
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

            {/* Global amber color grade — unifies four environments */}
            <div style={{ position:"absolute", inset:0, zIndex:5, pointerEvents:"none", background:"rgba(180,120,0,0.07)" }} />

            {/* Laser-etched center seams */}
            <CenterSeams />

            {/* Axiom Core — breathing gold orb */}
            <AxiomCore />

            {/* HUD overlays */}
            <TopTicker />
            <HudHeader time={time} date={date} craftCount={CRAFT_MODULES.length} />
            <BottomTicker />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
