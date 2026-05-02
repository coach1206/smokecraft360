import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ProductResult } from "../services/api";
import { useEffect, useState } from "react";

interface SwipeableCardProps {
  product: ProductResult;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  index: number;
}

export function SwipeableCard({ product, onSwipe, isTop, index }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [exitX, setExitX] = useState<number | null>(null);

  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const skipOpacity = useTransform(x, [0, -100], [0, 1]);

  const handleDragEnd = (_e: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if (info.offset.x > threshold || velocity > 500) {
      setExitX(300);
      onSwipe("right");
    } else if (info.offset.x < -threshold || velocity < -500) {
      setExitX(-300);
      onSwipe("left");
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  const scale = isTop ? 1 : 0.95 - (index * 0.05);
  const yOffset = isTop ? 0 : index * 10;

  const matchScore = Math.min(Math.round((product.score / 11) * 100), 99);

  return (
    <motion.div
      className="absolute inset-0 w-full h-[450px] origin-bottom"
      style={{
        x: exitX !== null ? exitX : x,
        rotate,
        opacity: exitX !== null ? 0 : opacity,
        zIndex: 10 - index,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={isTop ? controls : { scale, y: yOffset, opacity: 1 }}
      initial={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.4 }}
      data-testid={`swipe-card-${product.id}`}
    >
      <div className="w-full h-full bg-card border-2 border-card-border rounded-2xl shadow-xl overflow-hidden flex flex-col relative group">
        
        {/* Indicators */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 right-8 z-20 rotate-12 pointer-events-none">
          <div className="border-4 border-green-500 text-green-500 font-bold text-2xl px-4 py-2 uppercase tracking-widest rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.5)]">
            Like
          </div>
        </motion.div>
        
        <motion.div style={{ opacity: skipOpacity }} className="absolute top-8 left-8 z-20 -rotate-12 pointer-events-none">
          <div className="border-4 border-destructive text-destructive font-bold text-2xl px-4 py-2 uppercase tracking-widest rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            Skip
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-8 flex flex-col h-full bg-gradient-to-b from-card to-background">
          <div className="flex justify-between items-start mb-6">
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground border border-border px-3 py-1 rounded-full">
              {product.category}
            </span>
            <span className="text-sm font-serif text-primary" data-testid={`score-${product.id}`}>
              Match: {matchScore}%
            </span>
          </div>

          <h2 className="text-3xl font-serif leading-tight mb-4 text-foreground">{product.name}</h2>
          
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Strength</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full ${s <= product.strength ? "bg-primary" : "bg-border"}`} />
              ))}
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Tasting Notes</p>
            <div className="flex flex-wrap gap-2">
              {product.flavorNotes.map((note) => (
                <span key={note} className="px-3 py-1 text-xs rounded-full bg-secondary text-secondary-foreground border border-border">
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
             <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Perfect for</p>
             <div className="flex flex-wrap gap-2">
              {product.moodTags.map((tag) => (
                <span key={tag} className="text-xs italic text-muted-foreground capitalize">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
