import { motion } from "framer-motion";

const TILES = [
  {
    title: "Collaborative Journeys",
    body:  "Build experiences together, one selection at a time.",
  },
  {
    title: "Table Unlocks",
    body:  "Unlock shared sensory experiences reserved for groups.",
  },
  {
    title: "Flavor Challenges",
    body:  "Discover and compete socially across the table.",
  },
];

interface Props {
  accent?: string;
}

export function GroupExperiencePanel({ accent = "#D48B00" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85 }}
      style={{
        borderRadius: 28,
        background: "rgba(245,242,237,0.06)",
        border: "1px solid rgba(245,242,237,0.1)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        padding: "32px 28px",
      }}
    >
      <h2 style={{
        fontSize: 26,
        fontWeight: 300,
        color: "#F5F2ED",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: 28,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}>
        Group Experience
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {TILES.map((tile, i) => (
          <motion.div
            key={tile.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
            style={{
              background: "rgba(245,242,237,0.05)",
              borderRadius: 18,
              padding: "24px 20px",
              border: `1px solid ${accent}20`,
            }}
          >
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              color: accent,
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}>
              {tile.title}
            </h3>
            <p style={{ fontSize: 13, color: "rgba(245,242,237,0.55)", lineHeight: 1.65 }}>
              {tile.body}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default GroupExperiencePanel;
