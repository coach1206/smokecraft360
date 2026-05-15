/**
 * CinematicCraftBg — GPU-accelerated cinemagraph simulation per craft.
 *
 * Renders as position:absolute inset:0 inside a position:relative/absolute
 * parent card. Each craft variant is a looping, seamless animation that
 * simulates high-fidelity video: smoke plume, liquid pour, lager fill,
 * wine pour.
 *
 * Overlay contract: caller is responsible for the
 *   linear-gradient(to bottom, rgba(0,0,0,0.4), #000000)
 * label overlay on top of this component.
 */

import { motion } from "framer-motion";

interface Props { craft: string }

// ── SMOKECRAFT ──────────────────────────────────────────────────────────────
// Lit Maduro Churchill cigar in a crystal ashtray. Thick, consistent
// blue-grey plume curling upward from the lit end.

function SmokecraftBg() {
  const volumes = [
    { left: "46%", blur: 90,  w: 180, h: 260, op: 0.22, dur: 9,  delay: 0   },
    { left: "52%", blur: 110, w: 220, h: 320, op: 0.18, dur: 12, delay: 2.5 },
    { left: "44%", blur: 75,  w: 150, h: 220, op: 0.20, dur: 8,  delay: 5   },
    { left: "48%", blur: 130, w: 260, h: 380, op: 0.14, dur: 15, delay: 1   },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base — warm obsidian with mahogany undertone */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(165deg, #0C0603 0%, #010101 45%, #0A0604 100%)",
      }} />

      {/* Deep amber lounge ambient — bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "45%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(180,100,10,0.09) 0%, transparent 72%)",
        pointerEvents: "none",
      }} />

      {/* Smoke volumes — blue-grey, blurred, rising */}
      {volumes.map((v, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: v.left, bottom: "26%",
            width: v.w, height: v.h,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(175,168,160,1) 0%, rgba(140,130,120,0.6) 40%, transparent 72%)",
            filter: `blur(${v.blur}px)`,
            opacity: v.op,
            transform: "translateX(-50%)",
            willChange: "transform, opacity",
          }}
          animate={{
            y:       [-30, -110, -30],
            x:       [0, 10, -6, 0],
            opacity: [v.op, v.op * 1.55, v.op * 0.7, v.op],
            scaleX:  [1, 1.18, 0.88, 1],
          }}
          transition={{ duration: v.dur, repeat: Infinity, ease: "easeInOut", delay: v.delay }}
        />
      ))}

      {/* Crystal ashtray — obsidian oval with gold-inlaid rim */}
      <svg
        style={{ position: "absolute", bottom: "18%", left: "50%", transform: "translateX(-50%)", opacity: 0.28 }}
        width="140" height="36" viewBox="0 0 140 36"
      >
        <ellipse cx="70" cy="22" rx="62" ry="14" fill="#1A1008" stroke="#8B6914" strokeWidth="1.2" />
        <ellipse cx="70" cy="20" rx="55" ry="10" fill="#0E0905" />
        <line x1="15" y1="20" x2="125" y2="20" stroke="rgba(180,140,30,0.25)" strokeWidth="1" />
      </svg>

      {/* Cigar — horizontal, resting in ashtray */}
      <svg
        style={{ position: "absolute", bottom: "22%", left: "50%", transform: "translateX(-50%) rotate(-3deg)", opacity: 0.42 }}
        width="130" height="26" viewBox="0 0 130 26"
      >
        {/* Foot cap */}
        <ellipse cx="12" cy="13" rx="10" ry="8" fill="#2E1808" />
        {/* Body */}
        <rect x="10" y="5" width="100" height="16" rx="8" fill="#3A1E0A" />
        {/* Binder wrap lines */}
        <line x1="18" y1="5"  x2="14" y2="21" stroke="rgba(90,50,15,0.55)" strokeWidth="1" />
        <line x1="30" y1="5"  x2="26" y2="21" stroke="rgba(90,50,15,0.45)" strokeWidth="1" />
        <line x1="42" y1="5"  x2="38" y2="21" stroke="rgba(90,50,15,0.40)" strokeWidth="1" />
        <line x1="54" y1="5"  x2="50" y2="21" stroke="rgba(90,50,15,0.35)" strokeWidth="1" />
        {/* Gold band */}
        <rect x="65" y="4" width="18" height="18" rx="3" fill="#8B6914" opacity="0.7" />
        <rect x="67" y="6" width="14" height="14" rx="2" fill="#6B4F10" />
        <text x="74" y="16" fontSize="5" fill="rgba(212,180,60,0.8)" textAnchor="middle" fontFamily="serif">SC</text>
        {/* Head / cap */}
        <ellipse cx="112" cy="13" rx="8" ry="8" fill="#2A1408" />
        {/* Lit end ember */}
        <motion.ellipse
          cx="118" cy="13" rx="6" ry="6"
          fill="#C84B08"
          animate={{ fill: ["#C84B08", "#E8780A", "#FF9B20", "#C84B08"], r: [6, 7, 5.5, 6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.ellipse
          cx="118" cy="13" rx="4" ry="4"
          fill="#FFB830"
          animate={{ opacity: [0.85, 1, 0.65, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Crystal ashtray facet shimmer */}
      <motion.div style={{
        position: "absolute", bottom: "19%", left: "46%",
        width: 30, height: 6, borderRadius: 4,
        background: "linear-gradient(90deg, transparent, rgba(255,240,200,0.22), transparent)",
        filter: "blur(2px)",
      }}
        animate={{ opacity: [0.3, 0.8, 0.3], x: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── POURCRAFT ───────────────────────────────────────────────────────────────
// Slow-motion amber whiskey pour over a single hand-carved ice sphere
// in a heavy-bottomed crystal rocks glass. Gold light refracting through liquid.

function PourcraftBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base — near-black with deep amber undertone */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #060402 0%, #010101 40%, #080500 100%)",
      }} />

      {/* Ambient amber glow — light source above glass */}
      <div style={{
        position: "absolute", top: "8%", left: "30%", right: "30%", height: "30%",
        background: "radial-gradient(ellipse, rgba(212,139,0,0.14) 0%, transparent 70%)",
        filter: "blur(30px)",
        pointerEvents: "none",
      }} />

      {/* Whiskey pour stream — viscous, cascading */}
      <motion.div style={{
        position: "absolute",
        top: 0, left: "43%", right: "43%",
        height: "58%",
        background: "linear-gradient(180deg, rgba(190,100,8,0.0) 0%, rgba(200,115,10,0.55) 20%, rgba(180,95,8,0.38) 55%, rgba(160,80,6,0.15) 80%, transparent 100%)",
        filter: "blur(5px)",
        transformOrigin: "top center",
        willChange: "transform, opacity",
      }}
        animate={{
          scaleX:  [1, 1.22, 0.88, 1.15, 1],
          opacity: [0.55, 0.78, 0.38, 0.70, 0.55],
          y:       [0, 8, -4, 6, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Secondary pour wisp */}
      <motion.div style={{
        position: "absolute",
        top: "5%", left: "40%", right: "40%",
        height: "45%",
        background: "linear-gradient(180deg, transparent 0%, rgba(210,130,15,0.22) 30%, transparent 100%)",
        filter: "blur(12px)",
        willChange: "transform, opacity",
      }}
        animate={{ scaleX: [1, 0.75, 1.35, 1], opacity: [0.3, 0.55, 0.2, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Rocks glass — heavy bottom crystal */}
      <svg
        style={{ position: "absolute", bottom: "12%", left: "50%", transform: "translateX(-50%)", opacity: 0.22 }}
        width="110" height="120" viewBox="0 0 110 120"
      >
        {/* Glass body */}
        <path d="M 20 10 L 90 10 L 100 115 L 10 115 Z" fill="rgba(200,220,255,0.06)" stroke="rgba(200,220,255,0.22)" strokeWidth="1.5" />
        {/* Heavy base */}
        <rect x="8" y="108" width="94" height="10" rx="3" fill="rgba(200,220,255,0.12)" stroke="rgba(200,220,255,0.20)" strokeWidth="1" />
        {/* Whiskey level */}
        <path d="M 22 62 L 88 62 L 97 115 L 13 115 Z" fill="rgba(190,100,8,0.18)" />
        {/* Light refraction highlight */}
        <line x1="30" y1="15" x2="25" y2="112" stroke="rgba(255,240,200,0.10)" strokeWidth="6" />
      </svg>

      {/* Ice sphere — perfectly clear, hand-carved */}
      <motion.div style={{
        position: "absolute",
        bottom: "24%", left: "50%", transform: "translateX(-50%)",
        width: 72, height: 72, borderRadius: "50%",
        background: "radial-gradient(circle at 34% 30%, rgba(220,238,255,0.60) 0%, rgba(180,210,250,0.28) 45%, rgba(140,185,235,0.10) 100%)",
        border: "1px solid rgba(210,230,255,0.22)",
        boxShadow: "0 0 30px rgba(160,210,255,0.08), inset 0 0 20px rgba(200,225,255,0.05)",
        willChange: "opacity",
      }}
        animate={{ opacity: [0.72, 0.92, 0.72] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Refracted gold light through ice/glass */}
      <motion.div style={{
        position: "absolute",
        bottom: "20%", left: "28%", right: "28%", height: "38%",
        background: "radial-gradient(ellipse at 50% 60%, rgba(212,139,0,0.16) 0%, rgba(180,100,5,0.08) 50%, transparent 75%)",
        filter: "blur(22px)",
        willChange: "transform, opacity",
      }}
        animate={{ scale: [1, 1.18, 0.94, 1], opacity: [0.6, 0.95, 0.5, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom glass pool — amber liquid glow */}
      <div style={{
        position: "absolute", bottom: 0, left: "15%", right: "15%", height: "32%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(200,110,10,0.10) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── BEERCRAFT ───────────────────────────────────────────────────────────────
// Chilled pilsner glass being filled with crisp golden lager.
// Condensation on glass, dense creamy foam head forming at top.

function BeercraftBg() {
  const bubbles = Array.from({ length: 14 }, (_, i) => ({
    left:  `${26 + (i % 6) * 9}%`,
    delay: i * 0.38,
    dur:   2.4 + (i % 4) * 0.7,
    size:  1.5 + (i % 3) * 1.2,
    opMax: 0.35 + (i % 3) * 0.15,
  }));

  const condensation = Array.from({ length: 8 }, (_, i) => ({
    left:  `${20 + i * 9}%`,
    top:   `${20 + (i % 3) * 18}%`,
    h:     8 + (i % 4) * 6,
    dur:   3 + (i % 3) * 1.2,
    delay: i * 0.5,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base — very dark cool charcoal/blue */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #030508 0%, #010101 45%, #040608 100%)",
      }} />

      {/* Golden lager fill — rising animated gradient */}
      <motion.div style={{
        position: "absolute",
        bottom: "12%", left: "22%", right: "22%",
        height: "52%",
        background: "linear-gradient(0deg, rgba(200,158,20,0.28) 0%, rgba(180,140,15,0.18) 55%, rgba(160,120,10,0.06) 85%, transparent 100%)",
        filter: "blur(4px)",
        transformOrigin: "bottom",
        willChange: "transform",
      }}
        animate={{ scaleY: [0.88, 1.04, 0.92, 1.06, 0.88] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Pilsner glass outline */}
      <svg
        style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", opacity: 0.18 }}
        width="100" height="220" viewBox="0 0 100 220"
      >
        {/* Tapered pilsner body */}
        <path d="M 28 8 L 72 8 L 88 215 L 12 215 Z" fill="rgba(200,220,255,0.05)" stroke="rgba(200,210,240,0.30)" strokeWidth="1.5" />
        {/* Foam top */}
        <ellipse cx="50" cy="8" rx="22" ry="9" fill="rgba(245,245,235,0.14)" stroke="rgba(245,245,235,0.20)" strokeWidth="1" />
        {/* Stem */}
        <rect x="44" y="210" width="12" height="8" rx="2" fill="rgba(200,210,240,0.12)" />
      </svg>

      {/* Foam head — creamy white, dense */}
      <motion.div style={{
        position: "absolute",
        top: "14%", left: "24%", right: "24%", height: 28,
        background: "radial-gradient(ellipse, rgba(245,245,232,0.24) 0%, rgba(235,235,220,0.10) 65%, transparent 100%)",
        filter: "blur(7px)",
        willChange: "transform, opacity",
      }}
        animate={{ scaleX: [1, 1.08, 0.95, 1.05, 1], opacity: [0.7, 1, 0.6, 0.9, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rising bubbles */}
      {bubbles.map((b, i) => (
        <motion.div key={i}
          style={{
            position: "absolute",
            left: b.left, bottom: "12%",
            width: b.size, height: b.size,
            borderRadius: "50%",
            background: `rgba(215,195,80,${b.opMax})`,
            boxShadow: `0 0 ${b.size * 2.5}px rgba(200,175,50,0.25)`,
            willChange: "transform, opacity",
          }}
          animate={{ y: [0, -(130 + i * 8)], opacity: [0, b.opMax, b.opMax * 0.6, 0] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: "easeOut", repeatDelay: 0.2 }}
        />
      ))}

      {/* Condensation droplets on glass */}
      {condensation.map((c, i) => (
        <motion.div key={i}
          style={{
            position: "absolute",
            left: c.left, top: c.top,
            width: 1.5, height: c.h,
            background: "linear-gradient(180deg, rgba(200,220,255,0.35) 0%, transparent 100%)",
            borderRadius: 2,
            filter: "blur(0.8px)",
          }}
          animate={{ y: [0, c.h * 0.8, 0], opacity: [0, 0.6, 0.4, 0.6, 0] }}
          transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Golden amber bottom glow */}
      <div style={{
        position: "absolute", bottom: 0, left: "10%", right: "10%", height: "35%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(190,145,15,0.09) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── WINECRAFT / VAPECRAFT ───────────────────────────────────────────────────
// Deep ruby red wine poured into a large crystal Bordeaux glass.
// Shows the 'legs' of the wine and aeration of the liquid.

function WinecraftBg() {
  const legs = [22, 33, 58, 69, 78];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base — near-black with deep crimson undertone */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(170deg, #070103 0%, #010101 42%, #080104 100%)",
      }} />

      {/* Deep ruby ambient glow */}
      <motion.div style={{
        position: "absolute",
        top: "18%", left: "18%", right: "18%", height: "50%",
        background: "radial-gradient(ellipse, rgba(160,12,22,0.18) 0%, rgba(120,8,16,0.08) 55%, transparent 80%)",
        filter: "blur(25px)",
        willChange: "transform, opacity",
      }}
        animate={{ scale: [1, 1.14, 0.96, 1], opacity: [0.65, 1, 0.55, 0.65] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Wine pour stream — deep ruby cascade */}
      <motion.div style={{
        position: "absolute",
        top: 0, left: "42%", right: "42%",
        height: "55%",
        background: "linear-gradient(180deg, rgba(140,8,18,0.0) 0%, rgba(155,10,20,0.60) 18%, rgba(140,9,18,0.35) 55%, rgba(120,6,15,0.12) 82%, transparent 100%)",
        filter: "blur(5px)",
        transformOrigin: "top center",
        willChange: "transform, opacity",
      }}
        animate={{
          scaleX:  [1, 1.25, 0.85, 1.18, 1],
          opacity: [0.58, 0.80, 0.35, 0.72, 0.58],
          y:       [0, 6, -3, 5, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bordeaux glass — large crystal bowl */}
      <svg
        style={{ position: "absolute", bottom: "6%", left: "50%", transform: "translateX(-50%)", opacity: 0.20 }}
        width="120" height="200" viewBox="0 0 120 200"
      >
        {/* Wide bowl */}
        <path d="M 10 10 Q 10 100 60 120 Q 110 100 110 10 Z" fill="rgba(200,220,255,0.04)" stroke="rgba(200,210,240,0.28)" strokeWidth="1.5" />
        {/* Wine fill level */}
        <path d="M 25 65 Q 25 118 60 120 Q 95 118 95 65 Z" fill="rgba(150,10,20,0.20)" />
        {/* Stem */}
        <line x1="60" y1="120" x2="60" y2="185" stroke="rgba(200,210,240,0.22)" strokeWidth="2" />
        {/* Base */}
        <ellipse cx="60" cy="186" rx="28" ry="8" fill="rgba(200,210,240,0.08)" stroke="rgba(200,210,240,0.18)" strokeWidth="1" />
        {/* Rim highlight */}
        <path d="M 10 10 Q 12 4 60 2 Q 108 4 110 10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      </svg>

      {/* Wine legs — thin crimson streams running down glass walls */}
      {legs.map((left, i) => (
        <motion.div key={i}
          style={{
            position: "absolute",
            left: `${left}%`, top: "28%",
            width: 1.2,
            background: "linear-gradient(180deg, rgba(150,10,18,0.58) 0%, rgba(130,8,15,0.20) 60%, transparent 100%)",
            filter: "blur(0.5px)",
            transformOrigin: "top",
            willChange: "transform, opacity",
          }}
          animate={{
            height: [32, 68, 42, 60, 32],
            opacity: [0.28, 0.55, 0.20, 0.48, 0.28],
          }}
          transition={{ duration: 5 + i * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
        />
      ))}

      {/* Aeration swirl at fill level */}
      <motion.div style={{
        position: "absolute",
        top: "42%", left: "30%", right: "30%", height: 24,
        background: "radial-gradient(ellipse, rgba(160,12,22,0.22) 0%, transparent 68%)",
        filter: "blur(8px)",
        willChange: "transform, opacity",
      }}
        animate={{ scaleX: [1, 1.35, 0.75, 1.20, 1], opacity: [0.4, 0.7, 0.25, 0.55, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Crimson bottom glow */}
      <div style={{
        position: "absolute", bottom: 0, left: "10%", right: "10%", height: "35%",
        background: "radial-gradient(ellipse at 50% 100%, rgba(160,10,20,0.11) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ── Router ──────────────────────────────────────────────────────────────────

export default function CinematicCraftBg({ craft }: Props) {
  switch (craft) {
    case "smokecraft": return <SmokecraftBg />;
    case "pourcraft":  return <PourcraftBg />;
    case "beercraft":  return <BeercraftBg />;
    default:           return <WinecraftBg />;
  }
}
