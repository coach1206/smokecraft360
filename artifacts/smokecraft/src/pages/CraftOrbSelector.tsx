/**
 * CraftOrbSelector — "Choose Your World"
 *
 * Phase 2 of the AXIOM OS experience flow.
 * Four orbiting craft worlds in a 2×2 grid — each breathing, glowing,
 * and reacting to hover before routing to the craft entry chamber.
 *
 * Route: /craft-selector
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CRAFT_MODULES } from "@/data/craftScenes";

// ── Orb visual config ─────────────────────────────────────────────────────────

const ORB_CONFIG = {
  smoke: {
    coreColor:  "#e85d26",
    rimColor:   "#ff9a70",
    glowColor:  "rgba(232,93,38,0.35)",
    ringColor:  "rgba(232,93,38,0.22)",
    label:      "SmokeCraft",
    sub:        "Connoisseur Intelligence",
    floatDur:   4.2,
    ringDur:    22,
  },
  pour: {
    coreColor:  "#d4af37",
    rimColor:   "#fff3c0",
    glowColor:  "rgba(212,175,55,0.38)",
    ringColor:  "rgba(212,175,55,0.20)",
    label:      "PourCraft",
    sub:        "Sommelier Intelligence",
    floatDur:   3.8,
    ringDur:    28,
  },
  brew: {
    coreColor:  "#d97706",
    rimColor:   "#fbbf24",
    glowColor:  "rgba(217,119,6,0.33)",
    ringColor:  "rgba(217,119,6,0.18)",
    label:      "BrewCraft",
    sub:        "Brewmaster Intelligence",
    floatDur:   4.6,
    ringDur:    25,
  },
  vape: {
    coreColor:  "#a855f7",
    rimColor:   "#c4b5fd",
    glowColor:  "rgba(168,85,247,0.38)",
    ringColor:  "rgba(168,85,247,0.20)",
    label:      "VapeCraft",
    sub:        "Sensory Atmosphere Engine",
    floatDur:   3.5,
    ringDur:    18,
  },
} as const;

// ── CSS ───────────────────────────────────────────────────────────────────────

const ORB_CSS = `
  @keyframes orb-ring-spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes orb-ring-spin-rev {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(-360deg); }
  }
  @keyframes star-twinkle {
    0%,100% { opacity: 0.04; }
    50%     { opacity: 0.18; }
  }
`;

// ── Star field ────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x:   (i * 17.3 + 3) % 100,
  y:   (i * 11.9 + 7) % 100,
  s:   i % 7 === 0 ? 2 : 1,
  dur: 2 + (i % 5) * 1.4,
  del: (i % 9) * 0.4,
}));

// ── Single craft orb ──────────────────────────────────────────────────────────

function CraftOrb({ mod }: { mod: typeof CRAFT_MODULES[number] }) {
  const [, navigate] = useLocation();
  const [hov, setHov] = useState(false);
  const cfg = ORB_CONFIG[mod.id as keyof typeof ORB_CONFIG];
  if (!cfg) return null;

  return (
    <motion.div
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      onClick={() => navigate(mod.route)}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        gap:            18,
        cursor:         "pointer",
        position:       "relative",
        padding:        "20px 12px",
      }}
    >
      {/* Outer glow haze */}
      <motion.div
        animate={{
          opacity: hov ? 0.7 : 0.3,
          scale:   hov ? 1.3 : 1.0,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{
          position:     "absolute",
          top:          "50%", left: "50%",
          width:        220, height: 220,
          marginLeft:   -110, marginTop: -130,
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${cfg.glowColor} 0%, transparent 65%)`,
          filter:       "blur(18px)",
          pointerEvents:"none",
          zIndex:       0,
        }}
      />

      {/* Orb container — float animation */}
      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: cfg.floatDur, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative", width: 160, height: 160, zIndex: 1 }}
      >
        {/* Outer orbital ring 1 — slow spin */}
        <div style={{
          position:    "absolute",
          top: "50%", left: "50%",
          width:       196, height: 196,
          borderRadius:"50%",
          border:      `1px solid ${cfg.ringColor}`,
          animation:   `orb-ring-spin ${cfg.ringDur}s linear infinite`,
          pointerEvents:"none",
        }}>
          {/* Ring dot accent */}
          <div style={{
            position:   "absolute",
            top:        -3, left: "50%",
            marginLeft: -3,
            width:      6, height: 6,
            borderRadius:"50%",
            background: cfg.coreColor,
            boxShadow:  `0 0 8px ${cfg.coreColor}`,
          }} />
        </div>

        {/* Outer orbital ring 2 — counter-spin, tilted */}
        <div style={{
          position:    "absolute",
          top: "50%", left: "50%",
          width:       172, height: 172,
          borderRadius:"50%",
          border:      `1px dashed ${cfg.ringColor}`,
          animation:   `orb-ring-spin-rev ${cfg.ringDur * 1.5}s linear infinite`,
          opacity:     0.5,
          pointerEvents:"none",
          transform:   "translate(-50%, -50%) rotateX(60deg)",
        }} />

        {/* Core sphere */}
        <motion.div
          animate={{
            boxShadow: hov
              ? `0 0 0 1px ${cfg.rimColor}30, 0 0 40px ${cfg.glowColor}, inset 0 0 30px ${cfg.coreColor}30`
              : `0 0 0 1px ${cfg.rimColor}18, 0 0 20px ${cfg.glowColor}, inset 0 0 20px ${cfg.coreColor}20`,
            scale: hov ? 1.08 : 1.0,
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position:   "absolute",
            inset:      0,
            borderRadius:"50%",
            background: `
              radial-gradient(ellipse 45% 35% at 30% 28%, ${cfg.rimColor}22 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, ${cfg.coreColor}18 0%, ${cfg.coreColor}08 40%, #050505 75%)
            `,
            border:     `1px solid ${cfg.rimColor}20`,
          }}
        >
          {/* Inner luminance */}
          <motion.div
            animate={{ opacity: hov ? [0.4, 0.9, 0.4] : [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:   "absolute",
              inset:      "25%",
              borderRadius:"50%",
              background: `radial-gradient(circle, ${cfg.coreColor}60 0%, transparent 65%)`,
              filter:     "blur(4px)",
            }}
          />

          {/* Craft acronym at center */}
          <div style={{
            position:       "absolute",
            inset:          0,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}>
            <motion.span
              animate={{ opacity: hov ? 1 : 0.6 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize:      11,
                letterSpacing: "0.38em",
                color:         cfg.rimColor,
                fontWeight:    700,
                textTransform: "uppercase",
                textShadow:    `0 0 16px ${cfg.coreColor}`,
              }}
            >
              360
            </motion.span>
          </div>
        </motion.div>
      </motion.div>

      {/* Label */}
      <motion.div
        animate={{ opacity: hov ? 1 : 0.72 }}
        transition={{ duration: 0.2 }}
        style={{ textAlign: "center", zIndex: 1 }}
      >
        <div style={{
          fontSize:      16,
          fontWeight:    800,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color:         hov ? cfg.rimColor : "rgba(220,215,195,0.88)",
          textShadow:    hov ? `0 0 20px ${cfg.coreColor}` : "none",
          transition:    "all 0.25s ease",
          marginBottom:  5,
        }}>
          {cfg.label}
        </div>
        <div style={{
          fontSize:      7.5,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color:         "rgba(180,165,130,0.42)",
        }}>
          {cfg.sub}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CraftOrbSelector() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      background:     "#030303",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      overflow:       "hidden",
    }}>
      <style>{ORB_CSS}</style>

      {/* Star field */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position:  "fixed",
            left:      `${s.x}%`,
            top:       `${s.y}%`,
            width:     s.s,
            height:    s.s,
            borderRadius: "50%",
            background: "#fff",
            opacity:   0.06,
            animation: `star-twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Ambient center glow */}
      <div style={{
        position:     "fixed",
        top:          "50%", left: "50%",
        width:        600, height: 400,
        marginLeft:   -300, marginTop: -200,
        borderRadius: "50%",
        background:   "radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, transparent 65%)",
        pointerEvents:"none",
      }} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginBottom: 40, zIndex: 1 }}
      >
        <div style={{
          fontSize:      8,
          letterSpacing: "0.65em",
          textTransform: "uppercase",
          color:         "rgba(180,165,130,0.38)",
          marginBottom:  12,
        }}>
          Axiom OS · Craft Hub
        </div>
        <div style={{
          background:           "linear-gradient(180deg, #fff9e6 0%, #d4af37 48%, #8a6d3b 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:  "transparent",
          filter:               "drop-shadow(0 0 14px rgba(212,175,55,0.35))",
          fontSize:             "clamp(20px, 3vw, 30px)",
          fontWeight:           900,
          letterSpacing:        "0.50em",
          textTransform:        "uppercase",
          marginBottom:         8,
        }}>
          Choose Your World
        </div>
        <div style={{
          fontSize:      9,
          letterSpacing: "0.38em",
          color:         "rgba(180,165,130,0.35)",
          textTransform: "uppercase",
        }}>
          Select a craft to enter · Each world is alive
        </div>
      </motion.div>

      {/* 2×2 orb grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 "8px 32px",
          zIndex:              1,
        }}
      >
        {CRAFT_MODULES.map(mod => (
          <CraftOrb key={mod.id} mod={mod} />
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{
          position:  "absolute",
          bottom:    24,
          display:   "flex",
          gap:       28,
          alignItems:"center",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 7.5, letterSpacing: "0.38em", textTransform: "uppercase",
            color: "rgba(180,165,130,0.30)", fontFamily: "inherit", padding: 0,
          }}
        >
          ← Command Center
        </button>
        <span style={{ color: "rgba(212,175,55,0.15)", fontSize: 7 }}>◆</span>
        <button
          onClick={() => navigate("/enrollment")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 7.5, letterSpacing: "0.38em", textTransform: "uppercase",
            color: "rgba(180,165,130,0.30)", fontFamily: "inherit", padding: 0,
          }}
        >
          New Guest →
        </button>
      </motion.div>
    </div>
  );
}
