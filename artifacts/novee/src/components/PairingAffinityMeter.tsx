import React from "react";
import { motion } from "framer-motion";

interface PairingAffinityMeterProps {
  score: number;
  label: string;
}

export const PairingAffinityMeter: React.FC<PairingAffinityMeterProps> = ({ score, label }) => {
  const getColor = (s: number) => {
    if (s >= 85) return "#D4AF37"; // Gold
    if (s >= 60) return "#C8762A"; // Amber
    return "#C8322A"; // Red/Discord
  };

  const color = getColor(score);

  return (
    <div style={{ width: "100%", marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ 
          fontSize: 12, 
          letterSpacing: "0.2em", 
          color: "rgba(240,232,212,0.5)", 
          textTransform: "uppercase", 
          fontWeight: 800 
        }}>
          Pairing Affinity
        </span>
        <motion.span 
          key={label}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            fontSize: 12, 
            letterSpacing: "0.2em", 
            color, 
            textTransform: "uppercase", 
            fontWeight: 900 
          }}
        >
          {label}
        </motion.span>
      </div>

      <div style={{ 
        height: 6, 
        background: "rgba(255,255,255,0.05)", 
        borderRadius: 3, 
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)"
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${color}33, ${color})`,
            boxShadow: `0 0 10px ${color}40`,
            borderRadius: 3
          }}
        />
      </div>
    </div>
  );
};
