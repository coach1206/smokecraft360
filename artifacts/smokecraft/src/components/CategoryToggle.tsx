import { motion } from "framer-motion";

interface CategoryToggleProps {
  value: "cigar" | "alcohol";
  onChange: (value: "cigar" | "alcohol") => void;
}

export function CategoryToggle({ value, onChange }: CategoryToggleProps) {
  return (
    <div className="flex w-full bg-card rounded-full p-1 border border-border shadow-inner" data-testid="category-toggle">
      {(["cigar", "alcohol"] as const).map((cat) => {
        const isSelected = value === cat;
        return (
          <button
            key={cat}
            data-testid={`category-btn-${cat}`}
            onClick={() => onChange(cat)}
            className={`relative flex-1 py-4 text-lg font-serif tracking-wider uppercase transition-colors duration-500 rounded-full z-10 ${
              isSelected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="category-bg"
                className="absolute inset-0 bg-primary rounded-full -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            {cat}
          </button>
        );
      })}
    </div>
  );
}
