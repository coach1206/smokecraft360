/**
 * TrainingBanner — Fixed demo-safety indicator.
 * Renders on every /training route to clearly mark synthetic data.
 */

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function TrainingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, padding: "7px 16px",
        background: "rgba(212,139,0,0.08)",
        borderBottom: "1px solid rgba(212,139,0,0.2)",
      }}
    >
      <ShieldCheck size={10} color="rgba(212,139,0,0.8)" />
      <span style={{
        fontSize: 9, fontWeight: 700, color: "rgba(212,139,0,0.8)",
        textTransform: "uppercase", letterSpacing: "0.16em",
      }}>
        Training Mode Active — Synthetic Demo Data Only — No Production Impact
      </span>
      <ShieldCheck size={10} color="rgba(212,139,0,0.8)" />
    </motion.div>
  );
}
