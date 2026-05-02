import { useState } from "react";
import { ProductResult } from "../services/api";
import { SwipeableCard } from "./SwipeableCard";
import { X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CardStackProps {
  recommendations: ProductResult[];
  onComplete: () => void;
}

export function CardStack({ recommendations, onComplete }: CardStackProps) {
  const [cards, setCards] = useState<ProductResult[]>(recommendations);

  const handleSwipe = (dir: "left" | "right") => {
    setTimeout(() => {
      const remaining = cards.slice(1);
      setCards(remaining);
      if (remaining.length === 0) {
        onComplete();
      }
    }, 300);
  };

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto relative z-10" data-testid="card-stack">
      <div className="relative w-full h-[450px] mb-8">
        <AnimatePresence>
          {cards.map((card, idx) => (
            <SwipeableCard
              key={card.id}
              product={card}
              isTop={idx === 0}
              index={idx}
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <button
          data-testid="btn-skip"
          onClick={() => handleSwipe("left")}
          className="w-16 h-16 rounded-full bg-card border-2 border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
        >
          <X size={28} />
        </button>
        <button
          data-testid="btn-like"
          onClick={() => handleSwipe("right")}
          className="w-16 h-16 rounded-full bg-card border-2 border-primary flex items-center justify-center text-primary shadow-[0_0_15px_rgba(200,150,50,0.2)] hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          <Heart size={28} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
