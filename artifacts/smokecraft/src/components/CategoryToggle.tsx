import { motion } from "framer-motion";
import { haptic } from "../utils/haptics";

interface CategoryToggleProps {
  value: "cigar" | "alcohol";
  onChange: (value: "cigar" | "alcohol") => void;
}

/* Premium SVG icons — no emojis */
function CigarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="13" x2="18" y2="13" />
      <line x1="18" y1="13" x2="22" y2="9" />
      <line x1="2" y1="13" x2="2" y2="11" />
      <path d="M6 11 Q8 7 12 8 Q16 9 18 13" />
    </svg>
  );
}

function SpiritsIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22h8" />
      <path d="M12 11v11" />
      <path d="M5 3l2 8h10l2-8H5z" />
      <path d="M5 3h14" />
    </svg>
  );
}

const LABELS = { cigar: "Cigar", alcohol: "Spirits" };

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div
      className="flex w-full p-1.5 rounded-2xl"
      style={{
        background: "rgba(245,235,221,0.95)",
        border:     "2px solid rgba(184,137,26,0.32)",
        boxShadow:  "0 4px 20px rgba(26,26,27,0.05), inset 0 1px 3px rgba(26,26,27,0.02)",
      }}
      data-testid="category-toggle"
    >
      {(["cigar", "alcohol"] as const).map((cat) => {
        const isSelected = value === cat;
        return (
          <button
            key={cat}
            data-testid={`category-btn-${cat}`}
            onClick={() => { if (!isSelected) haptic.select(); onChange(cat); }}
            className="relative flex-1 flex items-center justify-center gap-2.5 rounded-xl font-serif font-bold uppercase tracking-[0.12em] transition-colors duration-400 z-10"
            style={{
              minHeight: 68,
              fontSize:  19,
              color: isSelected ? "#1A1410" : "#7B5A1E",
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
          >
            {isSelected && (
              <motion.div
                layoutId="category-bg"
                className="absolute inset-0 rounded-xl -z-10"
                style={{
                  background: "linear-gradient(135deg, #b07c14, #D48B00)",
                  boxShadow:  "0 0 24px rgba(212,139,0,0.40), 0 4px 14px rgba(26,26,27,0.04)",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            )}
            {cat === "cigar" ? <CigarIcon /> : <SpiritsIcon />}
            {LABELS[cat]}
          </button>
        );
      })}
    </div>
  );
}
