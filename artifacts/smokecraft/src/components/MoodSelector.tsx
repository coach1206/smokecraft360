import { motion } from "framer-motion";

interface MoodSelectorProps {
  selected: string;
  onChange: (mood: string) => void;
}

const MOODS = [
  { value: "relaxed",     label: "Relaxed"     },
  { value: "bold",        label: "Bold"         },
  { value: "social",      label: "Social"       },
  { value: "reflective",  label: "Reflective"   },
  { value: "celebratory", label: "Celebratory"  },
  { value: "focused",     label: "Focused"      },
  { value: "adventurous", label: "Adventurous"  },
  { value: "intense",     label: "Intense"      },
];

const MOOD_DESCRIPTIONS: Record<string, string> = {
  relaxed:     "Smooth and easy — perfect for winding down",
  bold:        "Strong character — full-bodied and powerful",
  social:      "Great for sharing and good conversation",
  reflective:  "Complex and contemplative",
  celebratory: "Special occasion — premium selection",
  focused:     "Clean and clear — helps you stay sharp",
  adventurous: "Something different — exciting and unique",
  intense:     "Rich and commanding — for the experienced",
};

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div className="space-y-4" data-testid="mood-selector">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {MOODS.map(({ value, label }, i) => {
          const isSelected = selected === value;
          return (
            <motion.button
              key={value}
              data-testid={`mood-btn-${value}`}
              onClick={() => onChange(value)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.38 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                minHeight:     60,
                padding:       "14px 8px",
                borderRadius:  10,
                fontSize:      15,
                fontWeight:    600,
                fontFamily:    "var(--app-font-serif)",
                letterSpacing: "0.03em",
                cursor:        "pointer",
                display:       "flex",
                alignItems:    "center",
                justifyContent: "center",
                transition:    "all 0.22s ease",
                ...(isSelected ? {
                  background: "linear-gradient(135deg, #b07c14, #D48B00)",
                  border:     "2px solid #D48B00",
                  color:      "#1A1410",
                  boxShadow:  "0 0 18px rgba(212,139,0,0.28), 0 3px 10px rgba(26,26,27,0.03)",
                } : {
                  background: "rgba(26,20,16,0.06)",
                  border:     "1.5px solid rgba(90,60,30,0.22)",
                  color:      "#3D2712",
                }),
              }}
            >
              {label}
            </motion.button>
          );
        })}
      </div>

      {selected && MOOD_DESCRIPTIONS[selected] && (
        <motion.p
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={{ fontSize: 13, fontWeight: 600, color: "#7B5A1E" }}
        >
          {MOOD_DESCRIPTIONS[selected]}
        </motion.p>
      )}
    </div>
  );
}
