/**
 * InsightBubble — Cinematic floating mentor insight card.
 *
 * Replaces the simple MentorCommentary component with a full atmospheric
 * floating bubble that surfaces on each ADD swipe during the Drafting Lab.
 *
 * Props match MentorCommentary for a drop-in swap.
 */

import { motion } from "framer-motion";

interface Mentor {
  id:        string;
  name:      string;
  style:     string;
  craftType: string;
}

interface InsightBubbleProps {
  mentor:     Mentor;
  line:       string;
  whyNote:    string | null;
  accentColor: string;
}

const CRAFT_SIGIL: Record<string, string> = {
  smoke: "◈",
  pour:  "◉",
  brew:  "◎",
  vape:  "◍",
};

export default function InsightBubble({ mentor, line, whyNote, accentColor }: InsightBubbleProps) {
  const sigil = CRAFT_SIGIL[mentor.craftType] ?? "◈";

  return (
    <motion.div
      key="insight-bubble"
      initial={{ opacity: 0, y: 48, scale: 0.88 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: 24, scale: 0.94, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.85 }}
      style={{
        position:   "fixed",
        bottom:     108,
        left:       "50%",
        transform:  "translateX(-50%)",
        zIndex:     60,
        width:      "min(440px, 90vw)",
        pointerEvents: "none",
      }}
    >
      <div style={{
        background:    "rgba(10, 7, 3, 0.88)",
        border:        `1px solid ${accentColor}35`,
        borderLeft:    `3px solid ${accentColor}`,
        borderRadius:  18,
        padding:       "18px 22px 16px",
        backdropFilter: "blur(22px)",
        boxShadow:     `0 16px 64px rgba(0,0,0,0.72), 0 0 48px ${accentColor}14`,
        position:      "relative",
        overflow:      "hidden",
      }}>
        {/* Ambient glow behind */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: `radial-gradient(ellipse at 20% 50%, ${accentColor}0d 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />

        {/* Header row */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          marginBottom:  10,
          position:      "relative",
        }}>
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity }}
            style={{
              fontSize: 13,
              color:    accentColor,
              fontWeight: 700,
            }}
          >
            {sigil}
          </motion.span>
          <span style={{
            fontSize:      10,
            fontWeight:    800,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color:         accentColor,
          }}>
            {mentor.name}
          </span>
          <span style={{
            fontSize: 9,
            color:    "rgba(240,232,216,0.28)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginLeft: "auto",
          }}>
            Mentor Insight
          </span>
        </div>

        {/* Main line */}
        <p style={{
          fontFamily:  "'Cormorant Garamond', 'Playfair Display', serif",
          fontSize:     20,
          fontWeight:   600,
          fontStyle:    "italic",
          color:        "#f0e8d8",
          margin:       "0 0 8px",
          lineHeight:   1.4,
          position:     "relative",
        }}>
          "{line}"
        </p>

        {/* Why this works note */}
        {whyNote && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
            style={{
              fontSize:   12,
              color:      "rgba(240,232,216,0.40)",
              fontStyle:  "italic",
              margin:     0,
              lineHeight: 1.5,
              position:   "relative",
            }}
          >
            {whyNote}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
