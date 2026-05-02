import { motion } from "framer-motion";

interface CategoryToggleProps {
  value: "cigar" | "alcohol";
  onChange: (value: "cigar" | "alcohol") => void;
}

const LABELS = { cigar: "Cigar", alcohol: "Spirits" };
const ICONS  = { cigar: "🚬", alcohol: "🥃" };

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div
      className="flex w-full p-1.5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border:     "1px solid rgba(255,255,255,0.10)",
        boxShadow:  "inset 0 2px 8px rgba(0,0,0,0.5)",
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
            className="relative flex-1 flex items-center justify-center gap-2.5 rounded-xl font-serif font-semibold uppercase tracking-[0.12em] transition-colors duration-400 z-10"
            style={{
              minHeight: 68,
              fontSize:  20,
              color: isSelected ? "hsl(22 18% 5%)" : "rgba(190,165,120,0.55)",
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="category-bg"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, hsl(48 90% 56%), hsl(43 85% 46%))",
                  boxShadow:  "0 0 24px rgba(212,175,55,0.35), 0 4px 14px rgba(0,0,0,0.4)",
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
