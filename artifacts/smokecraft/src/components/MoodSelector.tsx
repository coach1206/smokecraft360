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
        {MOODS.map(({ value, label, icon }, i) => {
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
                minHeight:     64,
                padding:       "12px 8px",
                borderRadius:  12,
                fontSize:      15,
                fontWeight:    600,
                cursor:        "pointer",
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                gap:           6,
                transition:    "all 0.25s ease",
                ...(isSelected ? {
                  background: "linear-gradient(135deg, #b07c14, #D4AF37)",
                  border:     "2px solid #D4AF37",
                  color:      "#1A1410",
                  boxShadow:  "0 0 20px rgba(212,175,55,0.30), 0 4px 12px rgba(0,0,0,0.10)",
                } : {
                  background: "rgba(26,20,16,0.07)",
                  border:     "1.5px solid rgba(90,60,30,0.22)",
                  color:      "#3D2712",
                }),
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
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
          style={{ fontSize: 14, fontWeight: 600, color: "#7B5A1E" }}
        >
          ✓ {MOOD_DESCRIPTIONS[selected]}
        </motion.p>
      )}
    </div>
  );
}
