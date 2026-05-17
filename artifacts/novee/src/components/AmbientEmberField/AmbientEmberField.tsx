import { motion } from "framer-motion";
import { useMemo } from "react";

const COUNT = 32;

function lcgRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
  color: string;
}

export function AmbientEmberField() {
  const particles = useMemo<Particle[]>(() => {
    const r = lcgRand(0xdeadbeef);
    const colors = ["#D48B00", "#C4610A", "#E8A020", "#B05508", "#F0C040"];
    return Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      x: r() * 100,
      y: r() * 100,
      size: 1.4 + r() * 2.4,
      baseOpacity: 0.10 + r() * 0.22,
      duration: 9 + r() * 16,
      delay: -(r() * 20),
      dx: (r() - 0.5) * 90,
      dy: -(55 + r() * 130),
      color: colors[Math.floor(r() * colors.length)],
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Layered radial depth */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse 110% 50% at 50% -5%, rgba(196,97,10,0.09) 0%, transparent 62%)",
          "radial-gradient(ellipse 55% 35% at 15% 85%, rgba(212,139,0,0.05) 0%, transparent 55%)",
          "radial-gradient(ellipse 45% 28% at 85% 70%, rgba(196,97,10,0.04) 0%, transparent 52%)",
          "radial-gradient(ellipse 30% 20% at 60% 40%, rgba(212,139,0,0.025) 0%, transparent 60%)",
        ].join(", "),
      }} />

      {/* Horizontal amber line pulse — top edge */}
      <motion.div
        style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(196,97,10,0.45) 40%, rgba(212,139,0,0.65) 50%, rgba(196,97,10,0.45) 60%, transparent 100%)",
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Micro-embers */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            willChange: "transform, opacity",
          }}
          animate={{
            x: [0, p.dx * 0.3, p.dx * 0.7, p.dx, p.dx * 0.5, 0],
            y: [0, p.dy * 0.2, p.dy * 0.55, p.dy * 0.8, p.dy, p.dy * 0.35, 0],
            opacity: [0, p.baseOpacity, p.baseOpacity * 1.5, p.baseOpacity, p.baseOpacity * 0.4, 0],
            scale: [0.5, 1, 1.4, 1, 0.7, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
