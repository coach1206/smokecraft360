import { motion } from "framer-motion";

interface FlavorChipsProps {
  category: "cigar" | "alcohol";
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CIGAR_FLAVORS = ["smoky", "sweet", "earthy", "cedar", "spicy", "creamy", "nutty", "leather", "cocoa", "floral"];
const ALCOHOL_FLAVORS = ["vanilla", "caramel", "spicy", "smoky", "fruity", "oak", "peaty", "sweet", "cocoa", "pepper"];

export function FlavorChips({ category, selected, onChange }: FlavorChipsProps) {
  const flavors = category === "cigar" ? CIGAR_FLAVORS : ALCOHOL_FLAVORS;

  const toggle = (flavor: string) => {
    if (selected.includes(flavor)) {
      onChange(selected.filter((f) => f !== flavor));
    } else {
      onChange([...selected, flavor]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="flavor-chips">
      {flavors.map((flavor) => {
        const isSelected = selected.includes(flavor);
        return (
          <button
            key={flavor}
            data-testid={`flavor-chip-${flavor}`}
            onClick={() => toggle(flavor)}
            className={`px-4 py-2 rounded-full border transition-all duration-300 text-sm font-medium ${
              isSelected
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(200,150,50,0.1)]"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {flavor}
          </button>
        );
      })}
    </div>
  );
}
