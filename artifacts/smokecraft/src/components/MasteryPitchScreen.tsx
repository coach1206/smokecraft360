/**
 * MasteryPitchScreen — Sovereign Initiation pitch shown before EnrollmentFlow.
 *
 * Three glowing bullet cards:
 *   1. The 6-Month Mastery  — Rise from Explorer to Sommelier
 *   2. The Golden Box       — Unlock your proprietary custom brand at 100% Mastery
 *   3. The Leaderboard      — Claim your rank on the Regional & National grid
 *
 * Props:
 *   onContinue — called when guest taps "Begin My Journey"
 *   onSkip     — called when guest taps "Enter anonymously"
 */

import { motion, AnimatePresence } from "framer-motion";
import { Crown, Trophy, Star, ArrowRight, SkipForward } from "lucide-react";
import { useState } from "react";

const C = {
  bg:      "#0A0704",
  gold:    "#D48B00",
  goldDim: "rgba(212,139,0,0.55)",
  goldGlow:"rgba(212,139,0,0.12)",
  text:    "#F0E8D4",
  muted:   "rgba(245,235,215,0.45)",
  border:  "rgba(212,139,0,0.18)",
};

interface Bullet {
  icon:    React.ReactNode;
  title:   string;
  label:   string;
  body:    string;
  delay:   number;
  accent:  string;
}

const BULLETS: Bullet[] = [
  {
    icon:   <Crown size={22} />,
    title:  "The 6-Month Mastery",
    label:  "PROGRESSION",
    body:   "Rise through five tiers — Explorer, Apprentice, Craftsman, Sommelier, Grand Master — guided by your personal AI Sage across every session.",
    delay:  0.2,
    accent: "#D48B00",
  },
  {
    icon:   <Star size={22} />,
    title:  "The Golden Box",
    label:  "ULTIMATE REWARD",
    body:   "Reach 100% Mastery and unlock your own proprietary label — a custom brand built around your exact palate profile.",
    delay:  0.45,
    accent: "#c8a850",
  },
  {
    icon:   <Trophy size={22} />,
    title:  "The Leaderboard",
    label:  "COMPETITION",
    body:   "Your Mix Accuracy and Purchase History are ranked live on the Regional and National grid. Claim your position among the elite.",
    delay:  0.7,
    accent: "#b8860b",
  },
];

interface MasteryPitchScreenProps {
  craftType:   string;
  onContinue:  () => void;
  onSkip:      () => void;
}

function BulletCard({ bullet, index }: { bullet: Bullet; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: bullet.delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      style={{
        background:    hovered ? `rgba(212,139,0,0.08)` : "rgba(255,255,255,0.025)",
        border:        `1px solid ${hovered ? "rgba(212,139,0,0.4)" : C.border}`,
        borderRadius:  14,
        padding:       "20px 22px",
        display:       "flex",
        gap:           18,
        alignItems:    "flex-start",
        cursor:        "default",
        transition:    "background 0.25s, border-color 0.25s",
        position:      "relative",
        overflow:      "hidden",
      }}
    >
      {/* Ambient glow on hover */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position:     "absolute",
            top:          -20, left: -20,
            width:        80, height: 80,
            borderRadius: "50%",
            background:   `radial-gradient(circle, ${bullet.accent}30 0%, transparent 70%)`,
            pointerEvents:"none",
          }}
        />
      )}

      {/* Number */}
      <div style={{
        flexShrink:     0,
        width:          36, height: 36,
        borderRadius:   "50%",
        background:     `radial-gradient(135deg, ${bullet.accent}22 0%, transparent 80%)`,
        border:         `1px solid ${bullet.accent}40`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          bullet.accent,
        marginTop:      2,
      }}>
        {bullet.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      "0.6rem",
          fontWeight:    600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         `${bullet.accent}80`,
          marginBottom:  4,
        }}>
          {bullet.label}
        </p>
        <p style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "1.15rem",
          fontWeight:    500,
          color:         C.text,
          marginBottom:  6,
          letterSpacing: "-0.01em",
        }}>
          {bullet.title}
        </p>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize:   "0.75rem",
          color:      C.muted,
          lineHeight: 1.55,
        }}>
          {bullet.body}
        </p>
      </div>
    </motion.div>
  );
}

export default function MasteryPitchScreen({ craftType, onContinue, onSkip }: MasteryPitchScreenProps) {
  const craftLabel = craftType === "smoke" ? "Smoke" : craftType === "pour" ? "Pour" : craftType === "brew" ? "Brew" : "Vape";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          450,
        background:      `radial-gradient(ellipse at 50% 20%, rgba(212,139,0,0.08) 0%, transparent 55%), ${C.bg}`,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "32px 20px",
        overflowY:       "auto",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 36, maxWidth: 560 }}
      >
        <p style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      "0.6rem",
          fontWeight:    600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color:         C.goldDim,
          marginBottom:  12,
        }}>
          AXIOM OS · {craftLabel.toUpperCase()}CRAFT · SOVEREIGN INITIATION
        </p>

        <h1 style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(2rem, 5vw, 2.8rem)",
          fontWeight:    300,
          color:         C.text,
          letterSpacing: "-0.02em",
          lineHeight:    1.15,
          marginBottom:  14,
        }}>
          This is more than a session.
        </h1>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize:   "0.82rem",
          color:      C.muted,
          lineHeight: 1.6,
          maxWidth:   440,
          margin:     "0 auto",
        }}>
          Every draft you build, every choice you make, feeds an intelligence that knows your palate better than you do. Three things await you.
        </p>
      </motion.div>

      {/* Bullet cards */}
      <div style={{
        width:          "100%",
        maxWidth:       540,
        display:        "flex",
        flexDirection:  "column",
        gap:            12,
        marginBottom:   40,
      }}>
        {BULLETS.map((b, i) => (
          <BulletCard key={b.title} bullet={b} index={i} />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.95, duration: 0.5 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      >
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: `0 0 32px rgba(212,139,0,0.25)` }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           10,
            background:    "linear-gradient(135deg, rgba(212,139,0,0.18) 0%, rgba(212,139,0,0.06) 100%)",
            border:        `1px solid rgba(212,139,0,0.55)`,
            borderRadius:  10,
            padding:       "14px 40px",
            color:         C.gold,
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.78rem",
            fontWeight:    600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor:        "pointer",
          }}
        >
          Begin My Journey <ArrowRight size={14} />
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          onClick={onSkip}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            background:    "none",
            border:        "none",
            color:         "rgba(212,139,0,0.28)",
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.68rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor:        "pointer",
          }}
        >
          <SkipForward size={11} /> Enter anonymously
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
