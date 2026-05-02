import { motion } from "framer-motion";

interface CategoryToggleProps {
  value: "cigar" | "alcohol";
  onChange: (value: "cigar" | "alcohol") => void;
}

const LABELS = { cigar: "Cigar",   alcohol: "Spirits" };
const ICONS  = { cigar: "🚬",      alcohol: "🥃" };

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div
      className="flex w-full p-1.5 rounded-2xl"
      style={{
        background: "rgba(245,235,221,0.95)",
        border:     "1.5px solid rgba(184,137,26,0.35)",
        boxShadow:  "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 3px rgba(0,0,0,0.08)",
      }}
      data-testid="category-toggle"
    >
      {(["cigar", "alcohol"] as const).map((cat) => {
        const isSelected = value === cat;
        return (
          <button
            key={cat}
            data-testid={`category-btn-${cat}`}
            onClick={() => onChange(cat)}
            className="relative flex-1 flex items-center justify-center gap-2.5 rounded-xl font-serif font-bold uppercase tracking-[0.12em] transition-colors duration-400 z-10"
            style={{
              minHeight: 68,
              fontSize:  20,
              color: isSelected ? "#1A1410" : "#7B5A1E",
              cursor: "pointer",
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="category-bg"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, #b07c14, #D4AF37)",
                  boxShadow:  "0 0 24px rgba(212,175,55,0.40), 0 4px 14px rgba(0,0,0,0.18)",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            )}
            <span style={{ fontSize: 22 }}>{ICONS[cat]}</span>
            {LABELS[cat]}
          </button>
        );
      })}
    </div>
  );
}
