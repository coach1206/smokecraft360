import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useEffect } from "react";

interface EliteUnlockAnimationProps {
  onComplete: () => void;
}

export function EliteUnlockAnimation({ onComplete }: EliteUnlockAnimationProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 4200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(120,80,5,0.6) 0%, rgba(245,242,237,0.97) 65%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1, delay: 0.2 } }}
      transition={{ duration: 0.6 }}
    >
      {/* Particle ring */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const radius = 120;
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ background: `rgba(212,139,0,${0.3 + (i % 4) * 0.15})` }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: tx, y: ty, opacity: [0, 0.9, 0], scale: [0, 1, 0.4] }}
            transition={{
              duration: 1.8,
              delay: 0.4 + i * 0.02,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}

      {/* Crown icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, type: "spring", stiffness: 200, damping: 18 }}
        className="mb-8"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle, rgba(212,139,0,0.3), rgba(212,139,0,0.08))",
            boxShadow: "0 0 40px rgba(212,139,0,0.35), 0 0 80px rgba(212,139,0,0.12)",
            border: "1px solid rgba(212,139,0,0.4)",
          }}
        >
          <Crown size={36} style={{ color: "rgba(212,139,0,0.95)" }} fill="rgba(212,139,0,0.25)" />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h2
        className="font-serif text-4xl text-center mb-3"
        style={{
          fontWeight: 300,
          background: "linear-gradient(135deg, hsl(38 25% 88%), hsl(43 85% 68%), hsl(38 25% 82%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.08em",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        Elite Mode Unlocked
      </motion.h2>

      <motion.p
        className="text-sm uppercase tracking-[0.35em]"
        style={{ color: "rgba(212,139,0,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.8 }}
      >
        You've entered the inner circle
      </motion.p>

      {/* Gold divider */}
      <motion.div
        className="mt-6 h-px w-32 rounded-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.5), transparent)" }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
      />

      {/* Dismiss hint */}
      <motion.button
        onClick={onComplete}
        className="mt-10 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "rgba(107,94,78,0.30)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.6 }}
        whileHover={{ color: "rgba(212,139,0,0.6)" }}
      >
        Continue
      </motion.button>
    </motion.div>
  );
}
