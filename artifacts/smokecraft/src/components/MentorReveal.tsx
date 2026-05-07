/**
 * MentorReveal — cinematic mentor introduction screen.
 *
 * Shown after enrollment (new guest) or fast return recognition.
 * Displays the assigned mentor's name, philosophy, origin, and
 * a personal greeting.  The user taps "Begin Session" to continue.
 *
 * Props:
 *   mentor      — Mentor object from GuestProfileContext
 *   guestName   — firstName of the guest for personalised greeting
 *   isReturning — changes copy from "meet your mentor" to "welcome back"
 *   onBegin     — called when user taps Begin Session
 */

import { useEffect, useState } from "react";
import { motion }              from "framer-motion";
import { Sparkles }            from "lucide-react";
import type { Mentor }         from "@/contexts/GuestProfileContext";

interface MentorRevealProps {
  mentor:      Mentor;
  guestName:   string;
  isReturning: boolean;
  onBegin:     () => void;
  /** Memory-aware opening line for returning guests (computed from flavorHistory). */
  memoryLine?: string;
}

// ── Craft accent colours ──────────────────────────────────────────────────────

const CRAFT_ACCENT: Record<string, string> = {
  smoke: "#D48B00",
  pour:  "#c87820",
  brew:  "#e6c76a",
  vape:  "#8b5cf6",
};

// ── Monogram avatar ───────────────────────────────────────────────────────────

function MentorAvatar({ name, accent }: { name: string; accent: string }) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 28px" }}>
      {/* Glow ring */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          inset:        -8,
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${accent}40 0%, transparent 70%)`,
        }}
      />
      {/* Circle */}
      <div style={{
        width:          "100%",
        height:         "100%",
        borderRadius:   "50%",
        background:     `radial-gradient(135deg, ${accent}18 0%, rgba(4,3,2,0.7) 100%)`,
        border:         `1px solid ${accent}50`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "1.8rem",
          fontWeight:    300,
          color:         accent,
          letterSpacing: "0.05em",
        }}>
          {initials}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MentorReveal({ mentor, guestName, isReturning, onBegin, memoryLine }: MentorRevealProps) {
  const accent     = CRAFT_ACCENT[mentor.craftType] ?? "#D48B00";
  const [ready, setReady] = useState(false);

  // Slight delay before showing the Begin button — feels more intentional
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          600,
        background:      `radial-gradient(ellipse at 50% 40%, ${accent}08 0%, transparent 60%), rgba(4,3,2,0.97)`,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "32px 24px",
        textAlign:       "center",
      }}
    >
      {/* Header label */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      "0.65rem",
          fontWeight:    500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         `${accent}80`,
          marginBottom:  28,
        }}
      >
        {isReturning ? `Welcome back, ${guestName}` : `Your mentor has been selected`}
      </motion.p>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <MentorAvatar name={mentor.name} accent={accent} />
      </motion.div>

      {/* Mentor name */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(2rem, 5vw, 2.8rem)",
          fontWeight:    300,
          color:         "rgba(240,232,212,0.96)",
          letterSpacing: "-0.02em",
          marginBottom:  6,
        }}
      >
        {mentor.name}
      </motion.h2>

      {/* Origin */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          fontFamily:    "'Inter', sans-serif",
          fontSize:      "0.7rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color:         `${accent}60`,
          marginBottom:  12,
        }}
      >
        {mentor.origin}
      </motion.p>

      {/* Philosophy */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "1.05rem",
          fontStyle:     "italic",
          fontWeight:    300,
          color:         "rgba(240,232,212,0.5)",
          marginBottom:  32,
          letterSpacing: "0.01em",
        }}
      >
        {mentor.philosophy}
      </motion.p>

      {/* Memory line label (returning guests only) */}
      {isReturning && memoryLine && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.92 }}
          style={{
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.62rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color:         `${accent}45`,
            marginBottom:  10,
          }}
        >
          What I remember
        </motion.p>
      )}

      {/* Greeting / Memory line */}
      <motion.blockquote
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        style={{
          maxWidth:      440,
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(1.1rem, 2.5vw, 1.4rem)",
          fontWeight:    300,
          lineHeight:    1.55,
          color:         "rgba(240,232,212,0.78)",
          borderLeft:    `2px solid ${accent}40`,
          paddingLeft:   18,
          textAlign:     "left",
          marginBottom:  44,
        }}
      >
        "{isReturning && memoryLine ? memoryLine : mentor.greeting}"
      </motion.blockquote>

      {/* Begin button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 10 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: `0 0 28px ${accent}30` }}
          whileTap={{ scale: 0.97 }}
          onClick={onBegin}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           10,
            background:    `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
            border:        `1px solid ${accent}50`,
            borderRadius:  10,
            padding:       "14px 36px",
            color:         accent,
            fontFamily:    "'Inter', sans-serif",
            fontSize:      "0.78rem",
            fontWeight:    500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor:        "pointer",
          }}
        >
          <Sparkles size={14} /> Begin Session
        </motion.button>
      </motion.div>

      {/* Trait chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        style={{
          display:    "flex",
          gap:        8,
          marginTop:  24,
          flexWrap:   "wrap",
          justifyContent: "center",
        }}
      >
        {mentor.traits.map(trait => (
          <span
            key={trait}
            style={{
              fontFamily:    "'Inter', sans-serif",
              fontSize:      "0.62rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color:         `${accent}55`,
              border:        `1px solid ${accent}20`,
              borderRadius:  20,
              padding:       "3px 10px",
            }}
          >
            {trait}
          </span>
        ))}
      </motion.div>
    </motion.div>
  );
}
