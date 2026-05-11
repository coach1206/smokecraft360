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

import { useState, useEffect, useCallback, useRef } from "react";
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

/* ── Real-time Liquid / Amber Pulse Canvas ───────────────────────────────── */
const AMBER_PALETTE: [number, number, number][] = [
  [200, 134,  10],   // amber
  [212, 175,  55],   // gold
  [180, 100,   5],   // dark amber
  [160,  80,   0],   // deep amber
  [228, 155,  30],   // bright amber
  [255, 180,  40],   // light gold
];

interface AmbOrb {
  x: number; y: number; r: number;
  vx: number; vy: number;
  baseOp: number; phase: number; speed: number;
  ci: number;
}

function LiquidAmberCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const orbs: AmbOrb[] = Array.from({ length: 30 }, () => ({
      x:      Math.random() * window.innerWidth,
      y:      Math.random() * window.innerHeight,
      r:      35 + Math.random() * 95,
      vx:     (Math.random() - 0.5) * 0.28,
      vy:     (Math.random() - 0.5) * 0.20,
      baseOp: 0.05 + Math.random() * 0.12,
      phase:  Math.random() * Math.PI * 2,
      speed:  0.0035 + Math.random() * 0.0065,
      ci:     Math.floor(Math.random() * AMBER_PALETTE.length),
    }));

    let raf: number;
    let tick = 0;

    const draw = () => {
      tick++;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Base: near-black obsidian
      ctx.fillStyle = "#030201";
      ctx.fillRect(0, 0, W, H);

      for (const o of orbs) {
        const op  = o.baseOp * (0.5 + 0.5 * Math.sin(tick * o.speed + o.phase));
        const [r, g, b] = AMBER_PALETTE[o.ci];
        const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        grd.addColorStop(0,   `rgba(${r},${g},${b},${op.toFixed(3)})`);
        grd.addColorStop(0.45,`rgba(${r},${g},${b},${(op * 0.35).toFixed(3)})`);
        grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        o.x += o.vx;
        o.y += o.vy;
        if (o.x < -o.r)  o.x = W + o.r;
        if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r)  o.y = H + o.r;
        if (o.y > H + o.r) o.y = -o.r;
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "fixed",
        inset:         0,
        width:         "100vw",
        height:        "100vh",
        zIndex:        0,
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Craft-specific blob layer (CSS-only, no video assets) ───────────────── */
function CraftBlobLayer({ craftId }: { craftId: string }) {
  const cfg = ATMOSPHERE[craftId] ?? ATMOSPHERE.smoke;
  return (
    <>
      <style>{CB_KEYFRAMES}</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
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

/* ── Single vertical blade panel ─────────────────────────────────────────── */
function BladePanel({
  craft,
  initialOffset,
  active,
  index,
  total,
  onActivate,
  onDeactivate,
  onTrigger,
}: {
  craft:         CraftConfig;
  initialOffset: number;
  active:        boolean;
  index:         number;
  total:         number;
  onActivate:    () => void;
  onDeactivate:  () => void;
  onTrigger:     () => void;
}) {
  const [idx,     setIdx]    = useState(initialOffset % craft.images.length);
  const [kbIdx,   setKbIdx]  = useState(initialOffset % KB_CLASSES.length);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % craft.images.length);
      setKbIdx(i => (i + 1) % KB_CLASSES.length);
    }, 4000);
    return () => clearInterval(t);
  }, [craft.images.length]);

  const kbAnim = KB_CLASSES[kbIdx];

  return (
    <div
      style={{
        position:    "relative",
        flex:         active ? 3.5 : 1,
        minWidth:     active ? 0 : 44,
        transition:   "flex 0.55s cubic-bezier(0.23, 1, 0.32, 1), min-width 0.55s cubic-bezier(0.23, 1, 0.32, 1)",
        overflow:    "hidden",
        cursor:      "pointer",
        background:  "#050505",
        borderRight: index < total - 1 ? "1px solid rgba(212,139,0,0.09)" : "none",
      }}
      onPointerEnter={() => onActivate()}
      onPointerLeave={() => { onDeactivate(); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { if (pressed) { setPressed(false); onTrigger(); } }}
      onPointerCancel={() => setPressed(false)}
    >
      {/* Ken-burns rotating image */}
      <AnimatePresence mode="sync">
        <motion.img
          key={`${craft.id}-${idx}`}
          src={craft.images[idx]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.66 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{
            position:        "absolute",
            inset:           0,
            width:           "100%",
            height:          "100%",
            objectFit:       "cover",
            objectPosition:  "center",
            transformOrigin: "center",
            animation:       `${kbAnim} 8s ease-in-out forwards`,
          }}
          alt={craft.name}
        />
      </AnimatePresence>

      {/* Amber reflection — fades in when active */}
      <motion.div
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          position:   "absolute", inset: 0, zIndex: 2,
          background: `radial-gradient(ellipse 80% 60% at 50% 80%, ${craft.color}14 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Bottom vignette */}
      <div style={{
        position:   "absolute", inset: 0, zIndex: 3,
        background: `linear-gradient(0deg,
          rgba(0,0,0,0.92) 0%,
          rgba(0,0,0,0.52) 35%,
          rgba(0,0,0,0.10) 65%,
          transparent 100%)`,
        pointerEvents: "none",
      }} />

      {/* Craft accent top edge */}
      <div style={{
        position:   "absolute", top: 0, left: 0, right: 0,
        height:     2, zIndex: 4,
        background: `linear-gradient(90deg, transparent, ${craft.color}88, transparent)`,
        pointerEvents: "none",
      }} />

      {/* Glass shimmer sweep — active only */}
      {active && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5 }}>
          <motion.div
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "130%", opacity: [0, 0.22, 0] }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            style={{
              position:   "absolute", top: 0, bottom: 0, width: "45%",
              background: `linear-gradient(105deg, transparent 0%, ${craft.color}18 50%, transparent 100%)`,
              transform:  "skewX(-14deg)",
            }}
          />
        </div>
      )}

      {/* Vertical craft ID — collapsed label */}
      <AnimatePresence>
        {!active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute", inset: 0, zIndex: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{
              writingMode:    "vertical-rl",
              textOrientation: "mixed",
              transform:      "rotate(180deg)",
              fontSize:       8,
              letterSpacing:  "0.28em",
              color:          `${craft.color}cc`,
              textTransform:  "uppercase",
              fontFamily:     "monospace",
              fontWeight:     700,
            }}>
              {craft.id}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content — name, tagline, CTA */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              zIndex:   7,
              padding:  "0 22px 32px",
            }}
          >
            <div style={{
              fontSize:      "clamp(13px, 1.9vw, 21px)",
              fontWeight:    900,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color:         craft.color,
              fontFamily:    "monospace",
              textShadow:    `0 0 24px ${craft.color}88`,
              marginBottom:  6,
            }}>
              {craft.name}
            </div>

            <div style={{
              fontSize:      10,
              letterSpacing: "0.14em",
              color:         "rgba(255,249,230,0.42)",
              fontFamily:    "monospace",
              marginBottom:  18,
            }}>
              {craft.tagline}
            </div>

            <motion.div
              animate={{
                opacity:   [0.6, 1, 0.6],
                boxShadow: [`0 0 0px ${craft.color}00`, `0 0 18px ${craft.color}44`, `0 0 0px ${craft.color}00`],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           7,
                padding:       "7px 14px",
                background:    `${craft.color}12`,
                border:        `1px solid ${craft.color}50`,
                borderRadius:  8,
                fontSize:      8,
                fontWeight:    700,
                color:         craft.color,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                fontFamily:    "monospace",
              }}
            >
              ◈ INITIALIZE RITUAL
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image index pips — shown when active */}
      {active && (
        <div style={{
          position:  "absolute", bottom: 10, right: 14,
          display:   "flex", gap: 4,
          pointerEvents: "none", alignItems: "center", zIndex: 8,
        }}>
          {craft.images.map((_, i) => (
            <div key={i} style={{
              width:        i === idx ? 14 : 5,
              height:       2,
              borderRadius: 2,
              background:   i === idx ? craft.color : "rgba(255,255,255,0.2)",
              transition:   "width 0.4s ease, background 0.4s ease",
            }} />
          ))}
        </div>
      )}
    </div>
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
  const [activeAtmosphere, setActiveAtmosphere] = useState<string>("smoke");
  const [activeBlade,      setActiveBlade]      = useState<string | null>(null);
  const { updateLoungeMood }                    = useUnifiedCognitive();
  const [, navigate]                            = useLocation();

  // Inject Ken Burns keyframes once
  useEffect(() => {
    if (document.getElementById("lp-kb-styles")) return;
    const el = document.createElement("style");
    el.id = "lp-kb-styles";
    el.textContent = KB_STYLE;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

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
      {/* Real-time liquid amber pulse canvas + craft-aware blob layer */}
      <LiquidAmberCanvas />
      <CraftBlobLayer craftId={activeAtmosphere} />

      {/* ── 4 vertical blade portals ── */}
      <div style={{
        display:       "flex",
        flexDirection: "row",
        height:        "100%",
        width:         "100%",
        position:      "relative",
        zIndex:        1,
      }}>
        {CRAFTS.map((craft, i) => (
          <BladePanel
            key={craft.id}
            craft={craft}
            initialOffset={i}
            active={activeBlade === craft.id}
            index={i}
            total={CRAFTS.length}
            onActivate={() => {
              setActiveBlade(craft.id);
              handleCraftActivate(craft.id);
            }}
            onDeactivate={() => setActiveBlade(null)}
            onTrigger={() => {
              handleCraftActivate(craft.id);
              navigate(`/experience/${craft.id}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}
