import { motion } from "framer-motion";

const CRAFT_PALETTE: Record<string, { a: string; b: string }> = {
  smoke:    { a: "#3A2010", b: "#1A1A1B" },
  pour:     { a: "#2A1A08", b: "#1A1208" },
  brew:     { a: "#0F2A18", b: "#0A1A10" },
  vape:     { a: "#1A1030", b: "#0E0A1A" },
  default:  { a: "#1A1A1B", b: "#0A0A0B" },
};

interface Props {
  craftType?: string;
}

export function AtmosphereLayer({ craftType = "default" }: Props) {
  const palette = CRAFT_PALETTE[craftType] ?? CRAFT_PALETTE.default;

  return (
    <>
      {/* Base gradient */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${palette.a}, ${palette.b} 70%)`,
        zIndex: 0,
      }} />

      {/* Ambient particle field */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "rgba(212,139,0,0.4)",
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            zIndex: 1,
          }}
          animate={{
            y: [-12, 12, -12],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Vignette */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        zIndex: 2,
        pointerEvents: "none",
      }} />
    </>
  );
}

export default AtmosphereLayer;
