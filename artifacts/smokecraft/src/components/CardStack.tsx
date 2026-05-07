import { useState } from "react";
import { ProductResult } from "../services/api";
import { SwipeableCard } from "./SwipeableCard";
import { X, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface CardStackProps {
  recommendations:  ProductResult[];
  pairings?:        ProductResult[];
  onComplete:       () => void;
  onSwipe?:         (direction: "left" | "right", productId: string) => void;
  onOrder:          () => void;
  onSave:           () => void;
  experienceSaved:  boolean;
}

export function CardStack({
  recommendations, pairings = [], onComplete, onSwipe,
  onOrder, onSave, experienceSaved,
}: CardStackProps) {
  const [cards, setCards] = useState<ProductResult[]>(recommendations);

  const handleSwipe = (dir: "left" | "right") => {
    const topCard = cards[0];
    if (topCard) onSwipe?.(dir, topCard.id);
    setTimeout(() => {
      const remaining = cards.slice(1);
      setCards(remaining);
      if (remaining.length === 0) onComplete();
    }, 320);
  };

  if (cards.length === 0) return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto py-20">
      <p className="font-serif text-xl italic" style={{ color: "rgba(212,139,0,0.5)" }}>
        All selections reviewed
      </p>
    </div>
  );

  /* find matching pairing for the top card (by index) */
  const topIdx    = recommendations.indexOf(cards[0]);
  const topPairing = pairings[topIdx] ?? pairings[0] ?? null;

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-3xl mx-auto relative z-10"
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      data-testid="card-stack"
    >
      {/* Card stack area */}
      <div className="relative w-full mb-8" style={{ height: 420 }}>
        <AnimatePresence>
          {cards.map((card, idx) => (
            <SwipeableCard
              key={card.id}
              product={card}
              pairing={idx === 0 ? topPairing : null}
              isTop={idx === 0}
              index={idx}
              isHero={idx === 0 && cards.length === recommendations.length}
              onSwipe={handleSwipe}
              onOrder={onOrder}
              onSave={onSave}
              experienceSaved={experienceSaved}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Swipe hint */}
      <p className="text-[10px] uppercase tracking-[0.25em] mb-5" style={{ color: "rgba(180,155,100,0.38)" }}>
        Drag the card · or use buttons
      </p>

      {/* Skip / Like controls */}
      <div className="flex justify-center gap-8">
        <motion.button
          data-testid="btn-skip"
          onClick={() => handleSwipe("left")}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(180,155,120,0.55)" }}
          whileHover={{ scale: 1.08, borderColor: "rgba(239,68,68,0.5)", color: "rgba(239,68,68,0.85)", boxShadow: "0 0 18px rgba(239,68,68,0.15)" }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={22} />
        </motion.button>

        <motion.button
          data-testid="btn-like"
          onClick={() => handleSwipe("right")}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(180,130,30,0.22), rgba(212,139,0,0.14))", border: "1px solid rgba(212,139,0,0.4)", color: "rgba(212,139,0,0.9)", boxShadow: "0 0 16px rgba(212,139,0,0.1)" }}
          whileHover={{ scale: 1.08, boxShadow: "0 0 26px rgba(212,139,0,0.28)", borderColor: "rgba(212,139,0,0.7)" }}
          whileTap={{ scale: 0.95 }}
        >
          <Heart size={22} fill="currentColor" />
        </motion.button>
      </div>
    </motion.div>
  );
}
