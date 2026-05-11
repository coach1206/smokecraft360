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
import { useUnifiedCognitive } from "@/contexts/UnifiedCognitiveContext";
import type { LoungeMood } from "@/lib/groupEnergyEngine";

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

/* ── Per-craft atmosphere config ─────────────────────────────────────────── */
type BlobCfg = {
  w: number; h: number; left: string; bottom: string;
  color: string; blur: number; dur: string; delay: string; anim: string;
};
type AtmosphereCfg = { video: string; filter: string; blobs: BlobCfg[] };

const ATMOSPHERE: Record<string, AtmosphereCfg> = {
  smoke: {
    video:  "/videos/lounge-night.mp4",
    filter: "contrast(110%) brightness(72%)",
    blobs: [
      { w: 440, h: 340, left: "10%", bottom: "-5%", color: "rgba(201,168,76,0.20)", blur: 44, dur: "20s", delay: "0s",   anim: "cb-rise-0" },
      { w: 380, h: 290, left: "40%", bottom: "-5%", color: "rgba(201,168,76,0.16)", blur: 38, dur: "26s", delay: "-8s",  anim: "cb-rise-1" },
      { w: 500, h: 380, left: "65%", bottom: "-5%", color: "rgba(201,168,76,0.18)", blur: 50, dur: "32s", delay: "-15s", anim: "cb-rise-2" },
    ],
  },
  pour: {
    video:  "/videos/lounge-evening.mp4",
    filter: "contrast(108%) brightness(75%) sepia(12%)",
    blobs: [
      { w: 420, h: 320, left: "8%",  bottom: "-5%", color: "rgba(212,178,90,0.22)", blur: 42, dur: "18s", delay: "0s",   anim: "cb-rise-0" },
      { w: 360, h: 270, left: "38%", bottom: "-5%", color: "rgba(212,178,90,0.18)", blur: 36, dur: "22s", delay: "-6s",  anim: "cb-rise-1" },
      { w: 480, h: 360, left: "67%", bottom: "-5%", color: "rgba(212,178,90,0.20)", blur: 48, dur: "26s", delay: "-12s", anim: "cb-rise-2" },
    ],
  },
  brew: {
    video:  "/videos/lounge-day.mp4",
    filter: "contrast(112%) brightness(78%) saturate(110%)",
    blobs: [
      { w: 400, h: 300, left: "12%", bottom: "-5%", color: "rgba(200,120,40,0.24)", blur: 40, dur: "15s", delay: "0s",   anim: "cb-rise-0" },
      { w: 340, h: 260, left: "42%", bottom: "-5%", color: "rgba(200,120,40,0.18)", blur: 34, dur: "18s", delay: "-5s",  anim: "cb-rise-1" },
      { w: 460, h: 340, left: "64%", bottom: "-5%", color: "rgba(200,120,40,0.20)", blur: 46, dur: "22s", delay: "-10s", anim: "cb-rise-2" },
    ],
  },
  vape: {
    video:  "/videos/lounge-night.mp4",
    filter: "contrast(105%) brightness(65%) hue-rotate(12deg)",
    blobs: [
      { w: 520, h: 410, left: "5%",  bottom: "-8%", color: "rgba(170,155,210,0.22)", blur: 58, dur: "38s", delay: "0s",   anim: "cb-rise-0" },
      { w: 440, h: 350, left: "28%", bottom: "-6%", color: "rgba(155,140,200,0.18)", blur: 52, dur: "44s", delay: "-10s", anim: "cb-rise-1" },
      { w: 380, h: 290, left: "52%", bottom: "-5%", color: "rgba(180,160,215,0.20)", blur: 46, dur: "32s", delay: "-20s", anim: "cb-rise-2" },
      { w: 500, h: 400, left: "70%", bottom: "-8%", color: "rgba(160,145,205,0.16)", blur: 56, dur: "48s", delay: "-6s",  anim: "cb-rise-3" },
      { w: 300, h: 240, left: "20%", bottom: "-3%", color: "rgba(175,158,212,0.14)", blur: 40, dur: "28s", delay: "-16s", anim: "cb-rise-0" },
    ],
  },
};

const CB_KEYFRAMES = `
  @keyframes cb-rise-0 { 0% { transform:translateY(0) scale(1.0);  opacity:.70; } 100% { transform:translateY(-100vh) scale(1.4); opacity:0; } }
  @keyframes cb-rise-1 { 0% { transform:translateY(0) scale(0.9);  opacity:.50; } 100% { transform:translateY(-100vh) scale(1.2); opacity:0; } }
  @keyframes cb-rise-2 { 0% { transform:translateY(0) scale(1.1);  opacity:.60; } 100% { transform:translateY(-100vh) scale(1.5); opacity:0; } }
  @keyframes cb-rise-3 { 0% { transform:translateY(0) scale(0.85); opacity:.55; } 100% { transform:translateY(-100vh) scale(1.3); opacity:0; } }
`;

/* ── Craft-aware cinematic background with 1.5s cross-fade ──────────────── */
function CinematicBackground({ craftId }: { craftId: string }) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const cfg      = ATMOSPHERE[craftId] ?? ATMOSPHERE.smoke;
  const videoKey = `${cfg.video}::${craftId}`;

  // Reset loaded flag whenever the target video changes
  useEffect(() => { setVideoLoaded(false); }, [videoKey]);

  return (
    <>
      {/* Inject keyframes once */}
      <style>{CB_KEYFRAMES}</style>

      {/* ── Blob layer — craft-specific, morphs with 1.5s AnimatePresence ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <AnimatePresence mode="sync">
          <motion.div
            key={`blobs-${craftId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {cfg.blobs.map((b, i) => (
              <div key={i} style={{
                position:               "absolute",
                bottom:                 b.bottom,
                left:                   b.left,
                width:                  b.w,
                height:                 b.h,
                borderRadius:           "50%",
                background:             `radial-gradient(ellipse, ${b.color} 0%, transparent 70%)`,
                filter:                 `blur(${b.blur}px)`,
                animationName:          b.anim,
                animationDuration:      `calc(${b.dur} / var(--hb-mult, 1))`,
                animationTimingFunction: "ease-out",
                animationIterationCount: "infinite",
                animationDelay:         b.delay,
                animationFillMode:      "both",
                pointerEvents:          "none",
              }} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Video layer — cross-fades on craft switch ── */}
      <AnimatePresence mode="sync">
        <motion.video
          key={videoKey}
          autoPlay
          muted
          loop
          playsInline
          initial={{ opacity: 0 }}
          animate={{ opacity: videoLoaded ? 0.70 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          onCanPlay={() => setVideoLoaded(true)}
          onError={() => setVideoLoaded(false)}
          style={{
            position:      "fixed",
            top:           0,
            left:          0,
            width:         "100vw",
            height:        "100vh",
            objectFit:     "cover",
            zIndex:        0,
            filter:        cfg.filter,
            pointerEvents: "none",
          }}
        >
          <source src={cfg.video} type="video/mp4" />
        </motion.video>
      </AnimatePresence>
    </>
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
  onHover,
}: {
  craft:         CraftConfig;
  initialOffset: number;
  onClick:       () => void;
  onHover:       () => void;
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
      onPointerEnter={onHover}
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
          onClick={() => navigate(`/experience/${craft.id}`)}
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
const CRAFT_MOOD: Record<string, LoungeMood> = {
  smoke: "MEDITATIVE",
  vape:  "MEDITATIVE",
  pour:  "HIGH_ENERGY",
  brew:  "HIGH_ENERGY",
};

export default function LivingPortal() {
  const [selected, setSelected]               = useState<CraftConfig | null>(null);
  const [activeAtmosphere, setActiveAtmosphere] = useState<string>("smoke");
  const { updateLoungeMood }                  = useUnifiedCognitive();

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

  const handleCraftActivate = useCallback((craftId: string) => {
    setActiveAtmosphere(craftId);
    updateLoungeMood(CRAFT_MOOD[craftId] ?? "FOCUSED");
  }, [updateLoungeMood]);

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
      {/* Cinematic lounge atmosphere — craft-aware .mp4 + blobs */}
      <CinematicBackground craftId={activeAtmosphere} />

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
            onHover={() => handleCraftActivate(craft.id)}
            onClick={() => { handleCraftActivate(craft.id); setSelected(craft); }}
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
