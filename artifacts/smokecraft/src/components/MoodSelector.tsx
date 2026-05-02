import { motion } from "framer-motion";

interface MoodSelectorProps {
  selected: string;
  onChange: (mood: string) => void;
}

const MOODS = [
  { value: "relaxed",     label: "Relaxed",     icon: "🌙" },
  { value: "bold",        label: "Bold",         icon: "🔥" },
  { value: "social",      label: "Social",       icon: "🥂" },
  { value: "reflective",  label: "Reflective",   icon: "🎭" },
  { value: "celebratory", label: "Celebratory",  icon: "✨" },
  { value: "focused",     label: "Focused",      icon: "🎯" },
  { value: "adventurous", label: "Adventurous",  icon: "🌿" },
  { value: "intense",     label: "Intense",      icon: "⚡" },
];

const MOOD_DESCRIPTIONS: Record<string, string> = {
  relaxed:     "Smooth and easy — perfect for winding down",
  bold:        "Strong character — full-bodied and powerful",
  social:      "Great for sharing and conversation",
  reflective:  "Complex and contemplative",
  celebratory: "Special occasion — premium selection",
  focused:     "Clean and clear — helps you stay sharp",
  adventurous: "Something different — exciting and unique",
  intense:     "Rich and commanding — not for the faint-hearted",
};

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div className="space-y-4" data-testid="mood-selector">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MOODS.map(({ value, label, icon }, i) => {
          const isSelected = selected === value;
          return (
            <motion.button
              key={value}
              data-testid={`mood-btn-${value}`}
              onClick={() => onChange(value)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center gap-1.5 rounded-xl font-medium capitalize transition-all duration-300"
              style={{
                minHeight:  64,
                padding:    "14px 10px",
                fontSize:   16,
                ...(isSelected ? {
                  background: "linear-gradient(135deg, rgba(180,130,30,0.38), rgba(212,175,55,0.22))",
                  border:     "1.5px solid rgba(212,175,55,0.60)",
                  color:      "rgba(245,220,140,0.98)",
                  boxShadow:  "0 0 22px rgba(212,175,55,0.20), 0 4px 14px rgba(0,0,0,0.3)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border:     "1px solid rgba(255,255,255,0.10)",
                  color:      "rgba(190,165,120,0.70)",
                }),
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Selection feedback */}
      {selected && MOOD_DESCRIPTIONS[selected] && (
        <motion.p
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium"
          style={{ color: "rgba(212,175,55,0.72)" }}
        >
          ✓ {MOOD_DESCRIPTIONS[selected]}
        </motion.p>
      )}
    </div>
  );
}
