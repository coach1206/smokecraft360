import { motion } from "framer-motion";

interface Props {
  craftTitle: string;
  accent?: string;
}

const RULES = [
  "This experience is designed for exploration, discovery, and sensory immersion.",
  "Every journey evolves your 360 profile, unlocks hidden experiences, and adapts to your preferences.",
  "Curiosity unlocks progression. Exploration unlocks mastery.",
];

export function RulesIntro({ craftTitle, accent = "#D48B00" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      style={{
        maxWidth: 860,
        margin: "0 auto",
        textAlign: "center",
        padding: "64px 32px",
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontWeight: 300,
          color: "#F5F2ED",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          marginBottom: 48,
        }}
      >
        {craftTitle}
      </motion.h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {RULES.map((rule, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.18 }}
            style={{
              fontSize: 17,
              color: "rgba(245,242,237,0.65)",
              lineHeight: 1.75,
              letterSpacing: "0.02em",
            }}
          >
            {rule}
          </motion.p>
        ))}
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 0.9 }}
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
          marginTop: 48,
          transformOrigin: "center",
        }}
      />
    </motion.div>
  );
}

export default RulesIntro;
