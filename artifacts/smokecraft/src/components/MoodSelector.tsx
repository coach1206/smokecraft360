import { motion } from "framer-motion";

interface MoodSelectorProps {
  selected: string;
  onChange: (mood: string) => void;
}

const MOODS = ["relaxed", "bold", "social", "reflective", "celebratory", "focused", "adventurous", "intense"];

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" data-testid="mood-selector">
      {MOODS.map((mood, i) => {
        const isSelected = selected === mood;
        return (
          <motion.button
            key={mood}
            data-testid={`mood-btn-${mood}`}
            onClick={() => onChange(mood)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="py-3 px-4 rounded font-serif text-sm capitalize tracking-wider transition-all duration-400"
            style={
              isSelected
                ? {
                    background: "linear-gradient(135deg, rgba(180,130,30,0.35), rgba(212,175,55,0.2))",
                    border: "1px solid rgba(212,175,55,0.55)",
                    color: "rgba(235,200,120,0.95)",
                    boxShadow: "0 0 20px rgba(212,175,55,0.18), 0 4px 12px rgba(0,0,0,0.3)",
                  }
                : {
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(180,155,120,0.6)",
                  }
            }
          >
            {mood}
          </motion.button>
        );
      })}
    </div>
  );
}
