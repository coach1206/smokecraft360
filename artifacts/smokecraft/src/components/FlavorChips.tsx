import { motion } from "framer-motion";

interface FlavorChipsProps {
  category: "cigar" | "alcohol";
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CIGAR_FLAVORS    = ["smoky", "sweet", "earthy", "cedar", "spicy", "creamy", "nutty", "leather", "cocoa", "floral"];
const ALCOHOL_FLAVORS  = ["vanilla", "caramel", "spicy", "smoky", "fruity", "oak", "peaty", "sweet", "cocoa", "pepper"];

export function FlavorChips({ category, selected, onChange }: FlavorChipsProps) {
  const flavors = category === "cigar" ? CIGAR_FLAVORS : ALCOHOL_FLAVORS;

  const toggle = (flavor: string) => {
    onChange(
      selected.includes(flavor)
        ? selected.filter((f) => f !== flavor)
        : [...selected, flavor],
    );
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="flavor-chips">
      {flavors.map((flavor, i) => {
        const isSelected = selected.includes(flavor);
        return (
          <motion.button
            key={flavor}
            data-testid={`flavor-chip-${flavor}`}
            onClick={() => toggle(flavor)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035, duration: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={
              isSelected
                ? {
                    background: "linear-gradient(135deg, rgba(180,130,30,0.28), rgba(212,175,55,0.16))",
                    border: "1px solid rgba(212,175,55,0.5)",
                    color: "rgba(212,175,55,0.95)",
                    boxShadow: "0 0 14px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }
                : {
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(180,155,120,0.65)",
                  }
            }
          >
            {flavor}
          </motion.button>
        );
      })}
    </div>
  );
}
