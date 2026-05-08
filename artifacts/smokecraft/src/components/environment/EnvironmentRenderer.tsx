import { motion } from "framer-motion";

const CRAFT_CONFIG: Record<string, {
  label: string;
  glowColor: string;
  rings: number;
}> = {
  smoke:   { label: "Reserve Lounge", glowColor: "#C8A96E", rings: 3 },
  pour:    { label: "Spirit Bar",     glowColor: "#E8C870", rings: 3 },
  brew:    { label: "Brew Hall",      glowColor: "#5E9E6E", rings: 2 },
  vape:    { label: "Vapor Lounge",   glowColor: "#9B8EC4", rings: 4 },
};

interface Props {
  craftType?: string;
}

export function EnvironmentRenderer({ craftType = "smoke" }: Props) {
  const cfg = CRAFT_CONFIG[craftType] ?? CRAFT_CONFIG.smoke;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 3,
      pointerEvents: "none",
      overflow: "hidden",
    }}>
      {/* Concentric ambient rings */}
      {[...Array(cfg.rings)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width:  `${280 + i * 160}px`,
            height: `${280 + i * 160}px`,
            marginLeft: `-${140 + i * 80}px`,
            marginTop:  `-${140 + i * 80}px`,
            borderRadius: "50%",
            border: `1px solid ${cfg.glowColor}${Math.round(18 - i * 5).toString(16).padStart(2, "0")}`,
          }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{
            duration: 5 + i * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.7,
          }}
        />
      ))}

      {/* Venue label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        style={{
          position: "absolute",
          bottom: 32,
          right: 36,
          fontSize: 9,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: `${cfg.glowColor}60`,
          fontWeight: 600,
        }}
      >
        {cfg.label}
      </motion.div>
    </div>
  );
}

export default EnvironmentRenderer;
