/**
 * XPFeedback — cinematic XP/Merit change overlay
 * Big gain  (≥10): golden starburst + smoke pulse ring + shimmer particles
 * Small gain (<10): golden rise
 * Big loss   (≥5):  screen-edge red flash + shake + ash-crack glyph
 * Small loss: red drop
 * Auto-dismisses in 2.2s. pointer-events: none — fully non-blocking.
 */
import React, { useEffect } from "react";
import { motion } from "framer-motion";

const GOLD = "#D4AF37";
const RED  = "#C8322A";

interface XPFeedbackProps {
  amount:     number;
  type:       "merit" | "points";
  onComplete: () => void;
}

export const XPFeedback: React.FC<XPFeedbackProps> = ({ amount, type, onComplete }) => {
  const isGain = amount > 0;
  const isBig  = Math.abs(amount) >= 10;
  const label  = type === "merit" ? "MERIT" : "XP";
  const sign   = isGain ? "+" : "";

  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      pointerEvents: "none", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      {isGain && isBig && (
        <motion.div
          initial={{ opacity: 0.6, scale: 0.6 }}
          animate={{ opacity: 0, scale: 2.8 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          style={{
            position: "absolute", width: 280, height: 280,
            borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            boxShadow: `0 0 40px ${GOLD}44`,
          }}
        />
      )}
      {isGain && isBig && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0] }}
          transition={{ duration: 1.4 }}
          style={{
            position: "absolute", width: 480, height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
          }}
        />
      )}
      {!isGain && isBig && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0.1, 0] }}
          transition={{ duration: 0.7 }}
          style={{
            position: "fixed", inset: 0,
            background: `radial-gradient(ellipse at center, transparent 40%, ${RED}66 100%)`,
            border: `3px solid ${RED}88`,
          }}
        />
      )}
      {isGain && isBig && (
        <motion.svg
          width="320" height="320" viewBox="-160 -160 320 320"
          style={{ position: "absolute" }}
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 45, opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <motion.line
                key={i}
                x1={Math.cos(rad) * 18} y1={Math.sin(rad) * 18}
                x2={Math.cos(rad) * 120} y2={Math.sin(rad) * 120}
                stroke={GOLD} strokeWidth={i % 2 === 0 ? 3 : 1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 1, delay: i * 0.04, ease: "easeOut" }}
              />
            );
          })}
        </motion.svg>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.55, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.15, y: -44 }}
        transition={{ type: "spring", stiffness: 340, damping: 24 }}
        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
      >
        <motion.div
          animate={!isGain ? { x: [-7, 7, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.35 }}
          style={{
            fontSize: isBig ? 64 : 48, fontWeight: 900, letterSpacing: "-0.02em",
            color: isGain ? GOLD : RED,
            textShadow: isGain
              ? `0 0 30px ${GOLD}99, 0 0 60px ${GOLD}44`
              : `0 0 30px ${RED}99, 0 0 60px ${RED}44`,
            lineHeight: 1,
          }}
        >
          {sign}{amount} {label}
        </motion.div>
        {isGain && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: [0, 0.7, 0], scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            style={{
              height: 2, width: isBig ? 240 : 160,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              borderRadius: 1,
            }}
          />
        )}
        {!isGain && isBig && (
          <motion.svg width="180" height="40" viewBox="0 0 180 40"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0.4] }}
            transition={{ duration: 1.2, delay: 0.1 }}
          >
            <motion.polyline
              points="0,20 45,8 90,32 135,6 180,22"
              fill="none" stroke={RED} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </motion.svg>
        )}
        <div style={{
          fontSize: 14, letterSpacing: "0.28em",
          color: isGain ? `${GOLD}99` : `${RED}99`,
          fontWeight: 700, textTransform: "uppercase",
        }}>
          {isGain ? (isBig ? "EXCEPTIONAL BLEND" : "BLEND SCORED") : (isBig ? "BLEND UNSTABLE" : "DEDUCTION")}
        </div>
      </motion.div>
      {isGain && isBig && Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist  = 90 + Math.random() * 60;
        return (
          <motion.div key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: [0, 1.2, 0] }}
            transition={{ duration: 0.9 + i * 0.05, delay: 0.05 * i, ease: "easeOut" }}
            style={{
              position: "absolute", width: 6, height: 6, borderRadius: "50%",
              background: i % 3 === 0 ? GOLD : i % 3 === 1 ? "#FFF8E0" : "#C8A020",
              boxShadow: `0 0 6px ${GOLD}`,
            }}
          />
        );
      })}
    </div>
  );
};
