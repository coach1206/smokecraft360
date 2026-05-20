import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XPFeedbackProps {
  amount: number;
  type: "merit" | "points";
  onComplete: () => void;
}

export const XPFeedback: React.FC<XPFeedbackProps> = ({ amount, type, onComplete }) => {
  const isGain = amount > 0;
  const isBig = Math.abs(amount) >= 10;
  const label = type === "merit" ? "MERIT" : "XP";

  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.2, y: -50 }}
        className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center"
      >
        {/* Big gain background effects */}
        {isGain && isBig && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.5, 0], scale: [1, 2, 2.5] }}
            transition={{ duration: 1.5 }}
            className="absolute w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl"
          />
        )}

        {/* Big loss background effects */}
        {!isGain && isBig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.5, repeat: 1 }}
            className="absolute inset-0 bg-red-900/20 border-4 border-red-600/50"
          />
        )}

        <div className="relative flex flex-col items-center">
          <motion.div
            animate={!isGain ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.2, repeat: 2 }}
            className={`
              text-5xl font-bold tracking-tighter
              ${isGain ? "text-yellow-500" : "text-red-500"}
              [text-shadow:0_0_20px_rgba(0,0,0,0.5)]
            `}
          >
            {isGain ? "+" : ""}
            {amount} {label}
          </motion.div>

          {isGain && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              className="mt-4"
            >
              <div className="w-8 h-8 bg-yellow-500 rotate-45 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.6)]" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
