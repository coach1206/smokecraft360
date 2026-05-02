import { motion, AnimatePresence } from "framer-motion";

interface FlavorChipsProps {
  category: "cigar" | "alcohol";
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CIGAR_FLAVORS   = ["Smoky", "Sweet", "Earthy", "Cedar", "Spicy", "Creamy", "Nutty", "Leather", "Cocoa", "Floral"];
const ALCOHOL_FLAVORS = ["Vanilla", "Caramel", "Spicy", "Smoky", "Fruity", "Oak", "Peaty", "Sweet", "Cocoa", "Pepper"];

const DESCRIPTIONS: Record<string, string> = {
  Smoky:   "bold and rich",     Sweet:   "smooth and mellow",
  Earthy:  "grounded and deep", Cedar:   "woody and clean",
  Spicy:   "warm and lively",   Creamy:  "soft and luxurious",
  Nutty:   "rich and toasty",   Leather: "classic and refined",
  Cocoa:   "dark and complex",  Floral:  "light and fragrant",
  Vanilla: "smooth and sweet",  Caramel: "rich and buttery",
  Fruity:  "bright and fresh",  Oak:     "robust and dry",
  Peaty:   "smoky and earthy",  Pepper:  "bold and warming",
};

export function FlavorChips({ category, selected, onChange }: FlavorChipsProps) {
  const flavors = category === "cigar" ? CIGAR_FLAVORS : ALCOHOL_FLAVORS;

  const toggle = (flavor: string) => {
    onChange(
      selected.includes(flavor)
        ? selected.filter((f) => f !== flavor)
        : [...selected, flavor],
    );
  };

  const lastSelected = selected[selected.length - 1];
  const feedback = lastSelected && DESCRIPTIONS[lastSelected]
    ? `${lastSelected} selected — ${DESCRIPTIONS[lastSelected]}`
    : null;

  return (
    <div className="space-y-4" data-testid="flavor-chips">
      <div className="flex flex-wrap gap-2.5">
        {flavors.map((flavor, i) => {
          const isSelected = selected.includes(flavor);
          return (
            <motion.button
              key={flavor}
              data-testid={`flavor-chip-${flavor.toLowerCase()}`}
              onClick={() => toggle(flavor)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.35 }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.93 }}
              style={{
                minHeight:     52,
                padding:       "0 20px",
                borderRadius:  999,
                fontSize:      15,
                fontWeight:    600,
                letterSpacing: "0.02em",
                cursor:        "pointer",
                transition:    "all 0.22s ease",
                ...(isSelected ? {
                  background: "linear-gradient(135deg, #b07c14, #D4AF37)",
                  border:     "2px solid #D4AF37",
                  color:      "#1A1410",
                  boxShadow:  "0 0 18px rgba(212,175,55,0.35), 0 2px 8px rgba(0,0,0,0.12)",
                } : {
                  background: "rgba(26,20,16,0.07)",
                  border:     "1.5px solid rgba(90,60,30,0.25)",
                  color:      "#3D2712",
                }),
              }}
            >
              {flavor}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28 }}
            style={{ fontSize: 14, fontWeight: 600, color: "#7B5A1E", minHeight: 22 }}
          >
            ✓ {feedback}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
