/**
 * LivingPortal — Motion-first home portal replacing TitanCraftDeck at "/".
 *
 * Identical layout and navigation behaviour to TitanCraftDeck, but every
 * tile cycles through multiple craft images with:
 *   • Crossfade  — Framer Motion AnimatePresence opacity transition (1.4s)
 *   • Ken Burns  — CSS scale + translate keyframe on each active image
 *   • whileTap   — Framer Motion brightness lift + slight scale pop on press
 *
 * Images rotate every 4 seconds per tile, with each craft starting at a
 * different offset so they never all cross-fade simultaneously.
 *
 * TitanCraftDeck.tsx is NEVER touched — this file is a standalone sibling.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

/* ── Per-craft image pools ─────────────────────────────────────────────────── */
interface CraftConfig {
  id:      string;
  name:    string;
  color:   string;
  tagline: string;
  images:  string[];
}

const CRAFTS: CraftConfig[] = [
  {
    id:      "smoke",
    name:    "SMOKECRAFT",
    color:   "#c8860a",
    tagline: "Aged Leaf · Warm Ember · Sovereign Smoke",
    images: [
      "/images/scenes/smokecraft-card.jpg",
      "/images/smoke/smoke_selection.png",
      "/images/smoke/smoke_urban.png",
    ],
  },
  {
    id:      "pour",
    name:    "POURCRAFT",
    color:   "#d4af37",
    tagline: "Single Malt · Crystal Glass · Liquid Gold",
    images: [
      "/images/scenes/pourcraft-card.jpg",
      "/images/pour/pour_whiskey.png",
      "/images/pour/pour_aged.png",
      "/images/pour/pour_cocktail.png",
      "/images/pour/pour_bar.png",
      "/images/pour/pour_tasting.png",
      "/images/pour/pour_wine.png",
    ],
  },
  {
    id:      "brew",
    name:    "BREWCRAFT",
    color:   "#b87333",
    tagline: "Cold Craft · Copper Warmth · Fresh Pour",
    images: [
      "/images/scenes/brewcraft-card.jpg",
      "/images/brew/brew_taproom.png",
      "/images/brew/brew_pouring.png",
      "/images/brew/brew_flight.png",
      "/images/brew/brew_barrel.png",
      "/images/brew/brew_outdoor.png",
    ],
  },
  {
    id:      "vape",
    name:    "VAPECRAFT",
    color:   "#8b5cf6",
    tagline: "Vapor Drift · Kinetic Haze · Neon Atmosphere",
    images: [
      "/images/scenes/vapecraft-card.jpg",
      "/images/vape/vape_modern.png",
      "/images/vape/vape_social.png",
      "/images/vape/vape_hookah.png",
      "/images/vape/vape_device.png",
    ],
  },
];

/* ── Time-gated cinematic video background ───────────────────────────────── */
function CinematicBackground() {
  const hour = new Date().getHours();
  const src  = hour >= 6 && hour < 17  ? "/videos/lounge-day.mp4"
             : hour >= 17 && hour < 22 ? "/videos/lounge-evening.mp4"
             :                           "/videos/lounge-night.mp4";
  return (
    <video
      key={src}
      autoPlay
      muted
      loop
      playsInline
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        objectFit:     "cover",
        zIndex:        0,
        opacity:       0.20,
        pointerEvents: "none",
      }}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

/* ── Ken Burns keyframes injected once into the document ─────────────────── */
const KB_STYLE = `
@keyframes lp-kb-1 {
  0%   { transform: scale(1.00) translate( 0%,  0%); }
  100% { transform: scale(1.14) translate(-2%, -2%); }
}
@keyframes lp-kb-2 {
  0%   { transform: scale(1.00) translate( 0%,  0%); }
  100% { transform: scale(1.12) translate( 2%, -3%); }
}
@keyframes lp-kb-3 {
  0%   { transform: scale(1.00) translate( 0%,  0%); }
  100% { transform: scale(1.16) translate(-3%,  2%); }
}
@keyframes lp-kb-4 {
  0%   { transform: scale(1.00) translate( 0%,  0%); }
  100% { transform: scale(1.10) translate( 1%,  1%); }
}
`;

const KB_CLASSES = ["lp-kb-1", "lp-kb-2", "lp-kb-3", "lp-kb-4"];

/* ── Single animated tile ─────────────────────────────────────────────────── */
function CraftTile({
  craft,
  initialOffset,
  onClick,
}: {
  craft:         CraftConfig;
  initialOffset: number;
  onClick:       () => void;
}) {
  const [idx, setIdx] = useState(initialOffset % craft.images.length);
  const [kbIdx, setKbIdx] = useState(initialOffset % KB_CLASSES.length);

  // Advance to next image every 4 s
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % craft.images.length);
      setKbIdx(i => (i + 1) % KB_CLASSES.length);
    }, 4000);
    return () => clearInterval(t);
  }, [craft.images.length]);

  const kbAnim = KB_CLASSES[kbIdx];

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.978, filter: "brightness(1.25)" }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position:   "relative",
        overflow:   "hidden",
        cursor:     "pointer",
        background: "#050505",
        touchAction:"manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* ── Rotating image layer ── */}
      <AnimatePresence mode="sync">
        <motion.img
          key={`${craft.id}-${idx}`}
          src={craft.images[idx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.62 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{
            position:         "absolute",
            inset:            0,
            width:            "100%",
            height:           "100%",
            objectFit:        "cover",
            objectPosition:   "center",
            transformOrigin:  "center",
            animation:        `${kbAnim} 8s ease-in-out forwards`,
          }}
          alt={craft.name}
        />
      </AnimatePresence>

      {/* ── Vignette gradient ── */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: `linear-gradient(
          to top,
          rgba(5,5,5,0.85) 0%,
          rgba(5,5,5,0.28) 45%,
          rgba(5,5,5,0.08) 100%
        )`,
        pointerEvents: "none",
      }} />

      {/* ── Craft accent top line ── */}
      <div style={{
        position:   "absolute",
        top:        0, left: 0, right: 0,
        height:     2,
        background: `linear-gradient(90deg, transparent, ${craft.color}88, transparent)`,
        pointerEvents: "none",
      }} />

      {/* ── Label ── */}
      <div style={{
        position:   "absolute",
        bottom:     28,
        left:       28,
        zIndex:     10,
      }}>
        <div style={{
          fontSize:      "clamp(12px, 1.8vw, 20px)",
          fontWeight:    900,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color:         craft.color,
          fontFamily:    "monospace",
          textShadow:    `0 0 24px ${craft.color}88`,
          marginBottom:  5,
        }}>
          {craft.name}
        </div>
        <div style={{
          fontSize:      "clamp(8px, 1vw, 11px)",
          letterSpacing: "0.18em",
          color:         "rgba(255,249,230,0.42)",
          fontFamily:    "monospace",
        }}>
          {craft.tagline}
        </div>
      </div>

      {/* ── Image index pip row ── */}
      <div style={{
        position:       "absolute",
        bottom:         10,
        right:          14,
        display:        "flex",
        gap:            4,
        pointerEvents:  "none",
        alignItems:     "center",
      }}>
        {craft.images.map((_, i) => (
          <div
            key={i}
            style={{
              width:        i === idx ? 14 : 5,
              height:       2,
              borderRadius: 2,
              background:   i === idx ? craft.color : "rgba(255,255,255,0.2)",
              transition:   "width 0.4s ease, background 0.4s ease",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Detail / confirmation overlay ────────────────────────────────────────── */
const CRAFT_360_ROUTES: Record<string, string> = {
  smoke: "/smoke-360",
  pour:  "/pour-360",
  brew:  "/brew-360",
  vape:  "/vape-360",
};

function CraftDetail({
  craft,
  onBack,
}: {
  craft:  CraftConfig;
  onBack: () => void;
}) {
  const [, navigate] = useLocation();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % craft.images.length), 3500);
    return () => clearInterval(t);
  }, [craft.images.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      style={{ position: "fixed", inset: 0, zIndex: 400 }}
    >
      {/* Background image */}
      <AnimatePresence mode="sync">
        <motion.img
          key={`detail-${idx}`}
          src={craft.images[idx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            animation: "lp-kb-1 10s ease-in-out forwards",
          }}
          alt=""
        />
      </AnimatePresence>

      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.60)",
      }} />

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute", top: 40, left: 40, zIndex: 10,
          padding: "10px 20px",
          background: "rgba(0,0,0,0.8)",
          border: `1px solid ${craft.color}`,
          color: craft.color,
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.15em",
        }}
      >
        ‹ RETURN TO HUB
      </button>

      {/* Content */}
      <div style={{
        position: "absolute", bottom: "15%",
        width: "100%", textAlign: "center",
      }}>
        <div style={{
          fontSize: "clamp(28px, 6vw, 72px)",
          fontWeight: 900,
          letterSpacing: "0.5em",
          fontFamily: "monospace",
          color: craft.color,
          textShadow: `0 0 40px ${craft.color}88, 0 0 80px ${craft.color}44`,
        }}>
          {craft.name}
        </div>

        <div style={{
          fontSize: "clamp(9px, 1.2vw, 13px)",
          letterSpacing: "0.4em",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "monospace",
          marginTop: 12,
        }}>
          {craft.tagline}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(CRAFT_360_ROUTES[craft.id] ?? `/experience/${craft.id}`)}
          style={{
            marginTop: 28,
            padding: "20px 48px",
            background: `linear-gradient(180deg, ${craft.color} 0%, #8A6D3B 100%)`,
            color: "#000",
            border: "none",
            fontWeight: "bold",
            fontSize: 16,
            cursor: "pointer",
            letterSpacing: "0.2em",
            fontFamily: "monospace",
            boxShadow: `0 0 28px ${craft.color}66`,
            touchAction: "manipulation",
          }}
        >
          ENTER EXPERIENCE ›
        </motion.button>

        <div style={{
          letterSpacing: "0.5em",
          opacity: 0.35,
          marginTop: 18,
          fontSize: "clamp(8px, 1vw, 11px)",
          fontFamily: "monospace",
          color: "#fff",
        }}>
          INITIALIZE SOVEREIGN PROTOCOL
        </div>
      </div>
    </motion.div>
  );
}

/* ── Root component ───────────────────────────────────────────────────────── */
export default function LivingPortal() {
  const [selected, setSelected] = useState<CraftConfig | null>(null);

  // Inject Ken Burns keyframes once
  useEffect(() => {
    if (document.getElementById("lp-kb-styles")) return;
    const el = document.createElement("style");
    el.id = "lp-kb-styles";
    el.textContent = KB_STYLE;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  const handleBack = useCallback(() => setSelected(null), []);

  return (
    <div style={{
      height:          "100vh",
      width:           "100vw",
      backgroundColor: "#050505",
      overflow:        "hidden",
      position:        "relative",
      color:           "#fff",
      fontFamily:      "monospace",
    }}>
      {/* Cinematic lounge atmosphere — time-gated .mp4 */}
      <CinematicBackground />

      {/* 2×2 grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows:    "1fr 1fr",
        height:              "100%",
        width:               "100%",
        gap:                 4,
      }}>
        {CRAFTS.map((craft, i) => (
          <CraftTile
            key={craft.id}
            craft={craft}
            initialOffset={i}
            onClick={() => setSelected(craft)}
          />
        ))}
      </div>

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <CraftDetail
            key={selected.id}
            craft={selected}
            onBack={handleBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
