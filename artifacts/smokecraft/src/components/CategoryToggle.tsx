import { motion } from "framer-motion";

interface CategoryToggleProps {
  value: "cigar" | "alcohol";
  onChange: (value: "cigar" | "alcohol") => void;
}

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div
      className="flex w-full p-1 rounded-full"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)",
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
            className="relative flex-1 py-4 font-serif text-lg tracking-[0.18em] uppercase transition-colors duration-500 rounded-full z-10"
            style={{ color: isSelected ? "hsl(22 18% 5%)" : "rgba(180,155,100,0.55)" }}
          >
            {isSelected && (
              <motion.div
                layoutId="category-bg"
                className="absolute inset-0 rounded-full -z-10"
                style={{
                  background: "linear-gradient(135deg, hsl(48 90% 58%), hsl(43 85% 48%))",
                  boxShadow: "0 0 20px rgba(212,175,55,0.3), 0 4px 12px rgba(0,0,0,0.4)",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            )}
            {cat}
          </button>
        );
      })}
    </div>
  );
}
