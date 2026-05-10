/**
 * MentorWhisper — Invisible guidance overlay triggered by hesitation detection.
 *
 * Appears after the EnvironmentalInfluenceEngine fires the onHesitation callback.
 * Subtly highlights the suggested card and shows a cinematic mentor prompt.
 * Auto-dismisses after 7 seconds or on any card selection.
 */

import { useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD   = "#D4AF37";
const CREAM  = "#F0E8D4";
const MONO   = "'Space Mono', 'Courier New', monospace";
const SERIF  = "'Cormorant Garamond', Georgia, serif";

// Per-flavor mentor prompts — supportive, never pushy
const WHISPERS: Record<string, string> = {
  earthy:  "Guests drawn to earth and cedar often find their ritual here. Trust your instincts.",
  cedar:   "Cedar carries the oldest aromatics — a foundation chosen by artisans for centuries.",
  leather: "Rich and powerful. Guests who choose leather rarely look back.",
  spiced:  "Bold complexity for a discerning palate. This archetype rarely disappoints.",
  default: "Every foundation leads somewhere remarkable. Follow what calls to you.",
};

interface Props {
  visible:         boolean;
  suggestedCardId: string | null;
  onDismiss:       () => void;
}

const MentorWhisper = memo(function MentorWhisper({ visible, suggestedCardId, onDismiss }: Props) {
  // Auto-dismiss after 7 s
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  const message = suggestedCardId
    ? (WHISPERS[suggestedCardId] ?? WHISPERS.default)
    : WHISPERS.default;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mentor-whisper"
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1    }}
          exit={{    opacity: 0, y: 8,  scale: 0.98 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position:       "fixed",
            bottom:         100,
            left:           "50%",
            transform:      "translateX(-50%)",
            zIndex:         8000,
            maxWidth:       480,
            width:          "calc(100% - 48px)",
            padding:        "16px 22px",
            borderRadius:   16,
            background:     "rgba(10, 8, 4, 0.86)",
            border:         `1px solid ${GOLD}30`,
            backdropFilter: "blur(18px)",
            display:        "flex",
            gap:            14,
            alignItems:     "flex-start",
            pointerEvents:  "none",   // never blocks card touches
          }}
        >
          {/* Animated mentor sigil */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              fontSize:   22,
              lineHeight: 1,
              color:      GOLD,
              flexShrink: 0,
              marginTop:  2,
            }}
          >
            ◈
          </motion.div>

          <div>
            {/* Label */}
            <div style={{
              fontSize:      8,
              letterSpacing: "0.20em",
              color:         `${GOLD}80`,
              textTransform: "uppercase",
              fontFamily:    MONO,
              marginBottom:  6,
            }}>
              Mentor Whisper · Your instincts are being read
            </div>

            {/* Message */}
            <div style={{
              fontSize:   14,
              color:      CREAM,
              fontFamily: SERIF,
              fontStyle:  "italic",
              lineHeight: 1.6,
            }}>
              "{message}"
            </div>

            {/* Scan progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 7, ease: "linear" }}
              style={{
                height:       1.5,
                background:   GOLD,
                borderRadius: 1,
                marginTop:    10,
                opacity:      0.35,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default MentorWhisper;
