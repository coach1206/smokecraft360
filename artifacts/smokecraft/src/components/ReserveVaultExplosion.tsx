/**
 * ReserveVaultExplosion — The Reserve Vault cinematic reveal.
 *
 * Full-screen gold particle burst triggered when guest confirms
 * their Spirit Construction build. Plays for ~2.8s then calls onComplete.
 * box-shadow: 0 0 100px #D4AF37 on the outer ring.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id:     number;
  angle:  number;
  radius: number;
  size:   number;
  delay:  number;
  dur:    number;
  color:  string;
}

const GOLD_PALETTE = [
  "#D4AF37", "#FFBF00", "#FFD700", "#C8960C",
  "#E8C84A", "#F5E27A", "#B8860B", "#FFE066",
];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id:     i,
    angle:  Math.random() * 360,
    radius: 30 + Math.random() * 200,
    size:   2 + Math.random() * 9,
    delay:  Math.random() * 0.4,
    dur:    0.9 + Math.random() * 1.4,
    color:  GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)]!,
  }));
}

interface Props {
  onComplete: () => void;
}

export default function ReserveVaultExplosion({ onComplete }: Props) {
  const particles = useRef<Particle[]>(makeParticles(120));
  const onDoneRef = useRef(onComplete);
  onDoneRef.current = onComplete;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         600,
        background:     "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0.96) 70%)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        overflow:       "hidden",
      }}
    >
      {/* Outer containment ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6, 1.4], opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:     "absolute",
          width:        340,
          height:       340,
          borderRadius: "50%",
          border:       "1px solid #D4AF37",
          boxShadow:    "0 0 100px #D4AF37, inset 0 0 60px rgba(212,175,55,0.3)",
        }}
      />

      {/* Inner burst ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2.8, 2.6], opacity: [0, 0.6, 0] }}
        transition={{ duration: 1.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position:     "absolute",
          width:        180,
          height:       180,
          borderRadius: "50%",
          border:       "1px solid rgba(212,175,55,0.6)",
          boxShadow:    "0 0 60px rgba(212,175,55,0.55)",
        }}
      />

      {/* Gold particles */}
      {particles.current.map(p => {
        const rad = (p.angle * Math.PI) / 180;
        const tx  = Math.cos(rad) * p.radius;
        const ty  = Math.sin(rad) * p.radius;
        return (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0.3 }}
            transition={{ duration: p.dur, delay: p.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position:     "absolute",
              width:        p.size,
              height:       p.size,
              borderRadius: p.size > 6 ? "50%" : 2,
              background:   p.color,
              boxShadow:    `0 0 ${p.size * 3}px ${p.color}`,
              pointerEvents:"none",
            }}
          />
        );
      })}

      {/* Central "VAULT SEALED" text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.9] }}
        transition={{ duration: 2.4, times: [0, 0.2, 0.75, 1], ease: "easeInOut" }}
        style={{ position: "relative", textAlign: "center" }}
      >
        <div style={{
          fontSize: 11, letterSpacing: "0.35em", fontWeight: 800,
          color: "#D4AF37", textTransform: "uppercase", marginBottom: 8,
          fontFamily: "monospace",
        }}>
          Reserve Vault
        </div>
        <div style={{
          fontSize: "clamp(26px,6vw,44px)", fontWeight: 900,
          color: "#FFE066",
          fontFamily: "'Playfair Display', serif",
          letterSpacing: "0.08em",
          textShadow: "0 0 40px #D4AF37, 0 0 80px rgba(212,175,55,0.6)",
        }}>
          Sealed
        </div>
      </motion.div>
    </motion.div>
  );
}
