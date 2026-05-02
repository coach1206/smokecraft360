import { useState } from "react";
import { ProductResult } from "../services/api";
import { SwipeableCard } from "./SwipeableCard";
import { X, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface CardStackProps {
  recommendations: ProductResult[];
  onComplete: () => void;
  onSwipe?: () => void;
}

export function CardStack({ recommendations, onComplete, onSwipe }: CardStackProps) {
  const [cards, setCards] = useState<ProductResult[]>(recommendations);

  const handleSwipe = (_dir: "left" | "right") => {
    onSwipe?.();
    setTimeout(() => {
      const remaining = cards.slice(1);
      setCards(remaining);
      if (remaining.length === 0) onComplete();
    }, 320);
  };

  if (cards.length === 0) return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-20">
      <p className="font-serif text-xl italic" style={{ color: "rgba(212,175,55,0.5)" }}>
        All selections reviewed
      </p>
    </div>
  );

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-md mx-auto relative z-10"
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      data-testid="card-stack"
    >
      <div className="relative w-full h-[480px] mb-10">
        <AnimatePresence>
          {cards.map((card, idx) => (
            <SwipeableCard
              key={card.id}
              product={card}
              isTop={idx === 0}
              index={idx}
              isHero={idx === 0 && cards.length === recommendations.length}
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Swipe hint */}
      <p className="text-[10px] uppercase tracking-[0.25em] mb-6" style={{ color: "rgba(180,155,100,0.4)" }}>
        Swipe to explore · or use buttons below
      </p>

      {/* Control buttons */}
      <div className="flex justify-center gap-8">
        <motion.button
          data-testid="btn-skip"
          onClick={() => handleSwipe("left")}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(180,155,120,0.6)",
          }}
          whileHover={{
            scale: 1.08,
            borderColor: "rgba(239,68,68,0.5)",
            color: "rgba(239,68,68,0.85)",
            boxShadow: "0 0 20px rgba(239,68,68,0.15)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={22} />
        </motion.button>

        <motion.button
          data-testid="btn-like"
          onClick={() => handleSwipe("right")}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, rgba(180,130,30,0.25), rgba(212,175,55,0.15))",
            border: "1px solid rgba(212,175,55,0.4)",
            color: "rgba(212,175,55,0.9)",
            boxShadow: "0 0 18px rgba(212,175,55,0.12)",
          }}
          whileHover={{
            scale: 1.08,
            boxShadow: "0 0 28px rgba(212,175,55,0.28)",
            borderColor: "rgba(212,175,55,0.7)",
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Heart size={22} fill="currentColor" />
        </motion.button>
      </div>
    </motion.div>
  );
}
