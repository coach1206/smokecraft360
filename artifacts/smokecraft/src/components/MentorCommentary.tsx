/**
 * MentorCommentary — swipe-time mentor speech overlay.
 *
 * Appears briefly after each ADD swipe as a fixed bottom overlay.
 * Shows the mentor's contextual line + optional "Why This Works" chemistry note.
 * Auto-dismissed by parent after a timeout; AnimatePresence handles the transition.
 *
 * Designed to feel sparse and experienced — not a notification, more like
 * a quiet word from someone standing beside you.
 */

import { motion } from "framer-motion";
import type { Mentor } from "@/contexts/GuestProfileContext";

interface Props {
  mentor:       Mentor;
  line:         string;
  whyNote:      string | null;
  accentColor:  string;
}

export default function MentorCommentary({ mentor, line, whyNote, accentColor }: Props) {
  const initials = mentor.name
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:        "fixed",
        bottom:          110,
        left:            "50%",
        transform:       "translateX(-50%)",
        zIndex:          60,
        width:           "min(340px, 88vw)",
        background:      "rgba(8,5,2,0.88)",
        border:          `1px solid ${accentColor}28`,
        borderRadius:    14,
        padding:         "13px 16px 13px 14px",
        backdropFilter:  "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        display:         "flex",
        gap:             12,
        alignItems:      "flex-start",
        boxShadow:       `0 16px 48px rgba(26,26,27,0.34), 0 0 0 1px ${accentColor}10`,
      }}
    >
      {/* Mentor monogram chip */}
      <div style={{
        flexShrink:      0,
        width:           34,
        height:          34,
        borderRadius:    "50%",
        background:      `radial-gradient(135deg, ${accentColor}18 0%, rgba(245,242,237,0.7) 100%)`,
        border:          `1px solid ${accentColor}40`,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        fontFamily:      "'Cormorant Garamond', Georgia, serif",
        fontSize:        13,
        fontWeight:      300,
        color:           accentColor,
        letterSpacing:   "0.04em",
        marginTop:       1,
      }}>
        {initials}
      </div>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Mentor name label */}
        <div style={{
          fontSize:      8,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color:         `${accentColor}60`,
          fontWeight:    600,
          marginBottom:  4,
        }}>
          {mentor.name}
        </div>

        {/* Main mentor line */}
        <p style={{
          margin:      0,
          fontFamily:  "'Cormorant Garamond', Georgia, serif",
          fontSize:    15,
          fontWeight:  300,
          lineHeight:  1.45,
          color:       "rgba(240,232,212,0.88)",
          fontStyle:   "italic",
        }}>
          "{line}"
        </p>

        {/* Why This Works note */}
        {whyNote && (
          <motion.p
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.25 }}
            style={{
              margin:      "7px 0 0",
              fontSize:    11,
              color:       "rgba(26,26,27,0.38)",
              lineHeight:  1.55,
              fontStyle:   "normal",
              letterSpacing: "0.01em",
              borderLeft:  `1.5px solid ${accentColor}25`,
              paddingLeft: 9,
            }}
          >
            {whyNote}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
