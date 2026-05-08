import { motion } from "framer-motion";

const MOODS = [
  "Relaxed",
  "Celebration",
  "Late Night",
  "Bold",
  "Smooth",
  "Adventurous",
  "Social",
  "Luxury",
];

interface Props {
  accent?: string;
  onSelect: (mood: string) => void;
}

export function MoodDiscovery({ accent = "#D48B00", onSelect }: Props) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
      padding: "24px 0",
    }}>
      {MOODS.map((mood, i) => (
        <motion.button
          key={mood}
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(mood)}
          style={{
            padding: "14px 24px",
            borderRadius: 999,
            background: "rgba(245,242,237,0.08)",
            border: `1px solid rgba(245,242,237,0.15)`,
            color: "#F5F2ED",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.1em",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "background 0.3s, border-color 0.3s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${accent}25`;
            (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}60`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,242,237,0.08)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,242,237,0.15)";
          }}
        >
          {mood}
        </motion.button>
      ))}
    </div>
  );
}

export default MoodDiscovery;
