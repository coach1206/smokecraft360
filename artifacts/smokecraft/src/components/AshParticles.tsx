import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  speedX: number;
  life: number;
}

export const AshParticles: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (particles.length < 12) {
        const newParticle: Particle = {
          id: Date.now() + Math.random(),
          x: Math.random() * 40 - 20, // Drift around ember
          y: 0,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.2 + 0.1,
          speedY: Math.random() * 0.5 + 0.2,
          speedX: (Math.random() - 0.5) * 0.3,
          life: 1,
        };
        setParticles((prev) => [...prev, newParticle]);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [particles.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y - p.speedY,
            x: p.x + p.speedX,
            life: p.life - 0.005,
            opacity: p.opacity * 0.99,
          }))
          .filter((p) => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 40,
        right: 60,
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: p.opacity }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: "#E5E5E5",
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
