/**
 * AchievementUnlock — cinematic achievement badge reveal.
 * Full-screen momentary overlay (2.4s) with particle burst.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Achievement {
  achievementId:           string;
  achievementName:         string;
  achievementDescription:  string;
  xpValue:                 number;
  iconSlug?:               string;
}

interface Props {
  achievement: Achievement | null;
  onDismiss:   () => void;
}

const ICON_MAP: Record<string, string> = {
  star:     "✦",
  compass:  "◈",
  crown:    "♛",
  bolt:     "⚡",
  fire:     "◉",
  cigar:    "▣",
  glass:    "◇",
  hops:     "✿",
  vapor:    "≋",
  axiom:    "◬",
  universe: "⊕",
};

// Particle definitions
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  angle:    (i / 18) * 360,
  distance: 60 + Math.random() * 80,
  size:     3 + Math.random() * 5,
  delay:    Math.random() * 0.3,
}));

export default function AchievementUnlock({ achievement, onDismiss }: Props) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         200,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "rgba(10,10,11,0.78)",
            backdropFilter: "blur(6px)",
            cursor:         "pointer",
          }}
        >
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Particle burst */}
            {PARTICLES.map((p, i) => {
              const rad = (p.angle * Math.PI) / 180;
              const dx  = Math.cos(rad) * p.distance;
              const dy  = Math.sin(rad) * p.distance;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1     }}
                  animate={{ x: dx, y: dy, opacity: 0, scale: 0.3  }}
                  transition={{ duration: 1.0, delay: p.delay, ease: "easeOut" }}
                  style={{
                    position:     "absolute",
                    width:        `${p.size}px`,
                    height:       `${p.size}px`,
                    borderRadius: "50%",
                    background:   i % 3 === 0 ? "#D48B00" : i % 3 === 1 ? "#fff9e6" : "#8a6d3b",
                    top:          "50%",
                    left:         "50%",
                    marginTop:    `-${p.size / 2}px`,
                    marginLeft:   `-${p.size / 2}px`,
                  }}
                />
              );
            })}

            {/* Expanding ring */}
            <motion.div
              initial={{ width: 80,  height: 80,  opacity: 0.8, borderWidth: 3 }}
              animate={{ width: 220, height: 220, opacity: 0,   borderWidth: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                position:     "absolute",
                top:          "50%",
                left:         "50%",
                transform:    "translate(-50%, -50%)",
                borderRadius: "50%",
                border:       "3px solid #D48B00",
                pointerEvents:"none",
              }}
            />

            {/* Badge circle */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.15, 1.0], opacity: 1 }}
              transition={{ duration: 0.6, times: [0, 0.6, 1], ease: "easeOut" }}
              style={{
                width:          "96px",
                height:         "96px",
                borderRadius:   "50%",
                background:     "radial-gradient(circle at 35% 35%, #fff9e6, #d4af37 45%, #8a6d3b)",
                border:         "2px solid #D48B00",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "38px",
                boxShadow:      "0 0 40px #D48B0088, 0 0 80px #D48B0033",
                position:       "relative",
                zIndex:         1,
              }}
            >
              {ICON_MAP[achievement.iconSlug ?? "star"] ?? "✦"}
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0  }}
              transition={{ delay: 0.45, duration: 0.5 }}
              style={{ textAlign: "center", marginTop: "20px", position: "relative", zIndex: 1 }}
            >
              <div style={{
                fontFamily:    "'Cormorant Garamond', serif",
                fontSize:      "11px",
                letterSpacing: "0.2em",
                color:         "#D48B00",
                textTransform: "uppercase",
                marginBottom:  "6px",
              }}>
                Achievement Unlocked
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   "26px",
                fontWeight: 600,
                color:      "#F5F2ED",
                marginBottom: "6px",
              }}>
                {achievement.achievementName}
              </div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   "14px",
                color:      "#BFB49A",
                fontStyle:  "italic",
                marginBottom: "12px",
              }}>
                {achievement.achievementDescription}
              </div>
              <div style={{
                display:        "inline-block",
                padding:        "4px 16px",
                borderRadius:   "20px",
                background:     "rgba(212,139,0,0.15)",
                border:         "1px solid rgba(212,139,0,0.35)",
                fontFamily:     "'Cormorant Garamond', serif",
                fontSize:       "13px",
                color:          "#D48B00",
                letterSpacing:  "0.05em",
              }}>
                +{achievement.xpValue} XP
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
