import { motion, AnimatePresence } from "framer-motion";

interface FlavorChipsProps {
  category: "cigar" | "alcohol";
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CIGAR_FLAVORS   = ["smoky", "sweet", "earthy", "cedar", "spicy", "creamy", "nutty", "leather", "cocoa", "floral"];
const ALCOHOL_FLAVORS = ["vanilla", "caramel", "spicy", "smoky", "fruity", "oak", "peaty", "sweet", "cocoa", "pepper"];

/* Short descriptions shown after selection — keeps user informed at a glance */
const DESCRIPTIONS: Record<string, string> = {
  smoky:   "bold and rich",     sweet:   "smooth and mellow",
  earthy:  "grounded and deep", cedar:   "woody and clean",
  spicy:   "warm and lively",   creamy:  "soft and luxurious",
  nutty:   "rich and toasty",   leather: "classic and refined",
  cocoa:   "dark and complex",  floral:  "light and fragrant",
  vanilla: "smooth and sweet",  caramel: "rich and buttery",
  fruity:  "bright and fresh",  oak:     "robust and dry",
  peaty:   "smoky and earthy",  pepper:  "bold and warming",
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
    ? `${lastSelected.charAt(0).toUpperCase() + lastSelected.slice(1)} selected — ${DESCRIPTIONS[lastSelected]}`
    : null;

  return (
    <div className="space-y-4" data-testid="flavor-chips">
      {/* Chips grid */}
      <div className="flex flex-wrap gap-3">
        {flavors.map((flavor, i) => {
          const isSelected = selected.includes(flavor);
          return (
            <motion.button
              key={flavor}
              data-testid={`flavor-chip-${flavor}`}
              onClick={() => toggle(flavor)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.35 }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.94 }}
              className="capitalize font-medium transition-all duration-250"
              style={{
                minHeight:    52,
                padding:      "0 22px",
                borderRadius: 999,
                fontSize:     16,
                letterSpacing: "0.02em",
                ...(isSelected ? {
                  background: "linear-gradient(135deg, rgba(180,130,30,0.32), rgba(212,175,55,0.18))",
                  border:     "1.5px solid rgba(212,175,55,0.6)",
                  color:      "rgba(245,220,140,0.98)",
                  boxShadow:  "0 0 18px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.07)",
                } : {
                  background: "rgba(255,255,255,0.05)",
                  border:     "1px solid rgba(255,255,255,0.12)",
                  color:      "rgba(200,175,135,0.75)",
                }),
              }}
            >
              {flavor}
            </motion.button>
          );
        })}
      </div>

      {/* Selection feedback */}
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.p
            key={feedback}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium"
            style={{ color: "rgba(212,175,55,0.72)", minHeight: 22 }}
          >
            ✓ {feedback}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
