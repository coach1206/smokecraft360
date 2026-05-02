import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ProductResult } from "../services/api";
import { useState } from "react";

interface SwipeableCardProps {
  product: ProductResult;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  index: number;
  isHero?: boolean;
}

export function SwipeableCard({ product, onSwipe, isTop, index, isHero = false }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [exitX, setExitX] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const opacity = useTransform(x, [-200, -120, 0, 120, 200], [0.4, 1, 1, 1, 0.4]);

  const likeOpacity  = useTransform(x, [0, 80],  [0, 1]);
  const skipOpacity  = useTransform(x, [0, -80], [0, 1]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const threshold = 90;
    if (info.offset.x > threshold || info.velocity.x > 450) {
      setExitX(350);
      onSwipe("right");
    } else if (info.offset.x < -threshold || info.velocity.x < -450) {
      setExitX(-350);
      onSwipe("left");
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } });
    }
  };

  const scale   = isTop ? 1 : 0.94 - index * 0.04;
  const yOffset = isTop ? 0 : index * 12;

  const matchScore = Math.min(Math.round((product.score / 14) * 100), 99);

  const cardClass = isHero ? "glass-card-hero" : "glass-card";

  return (
    <motion.div
      className="absolute inset-0 w-full h-[480px] origin-bottom"
      style={{
        x: exitX !== null ? exitX : x,
        rotate,
        opacity: exitX !== null ? 0 : opacity,
        zIndex: 10 - index,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={handleDragEnd}
      animate={isTop ? controls : { scale, y: yOffset, opacity: 1 }}
      initial={{ scale: 0.82, opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => isTop && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      data-testid={`swipe-card-${product.id}`}
    >
      {/* Hero glow behind card */}
      {isHero && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(212,175,55,0.15) 0%, transparent 70%)",
            filter: "blur(12px)",
            transform: "translateY(8px) scale(0.95)",
          }}
          animate={{ opacity: isHovered ? 1 : 0.6 }}
          transition={{ duration: 0.5 }}
        />
      )}

      <motion.div
        className={`w-full h-full rounded-2xl overflow-hidden flex flex-col relative ${cardClass}`}
        animate={{
          y: isTop && isHovered ? -6 : 0,
          boxShadow: isTop && isHovered
            ? "0 28px 70px rgba(0,0,0,0.75), 0 0 40px rgba(212,175,55,0.15)"
            : isHero
              ? "0 20px 55px rgba(0,0,0,0.7), 0 0 25px rgba(212,175,55,0.08)"
              : "0 12px 40px rgba(0,0,0,0.6)",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Top gold accent line */}
        {isHero && (
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }}
          />
        )}

        {/* Like / Skip indicators */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-7 right-7 z-20 rotate-12 pointer-events-none">
          <div
            className="border-2 font-bold text-xl px-4 py-1.5 uppercase tracking-widest rounded-lg font-serif"
            style={{
              borderColor: "rgba(74,222,128,0.9)",
              color: "rgba(74,222,128,0.9)",
              boxShadow: "0 0 24px rgba(34,197,94,0.45)",
            }}
          >
            Reserve
          </div>
        </motion.div>

        <motion.div style={{ opacity: skipOpacity }} className="absolute top-7 left-7 z-20 -rotate-12 pointer-events-none">
          <div
            className="border-2 font-bold text-xl px-4 py-1.5 uppercase tracking-widest rounded-lg font-serif"
            style={{
              borderColor: "rgba(239,68,68,0.9)",
              color: "rgba(239,68,68,0.9)",
              boxShadow: "0 0 24px rgba(239,68,68,0.4)",
            }}
          >
            Pass
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-8 flex flex-col h-full">
          {/* Header row */}
          <div className="flex justify-between items-start mb-2">
            <span
              className="text-[10px] uppercase tracking-[0.2em] font-medium px-3 py-1 rounded-full"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.25)",
                color: "rgba(212,175,55,0.8)",
              }}
            >
              {product.category}
            </span>
            <span className="text-sm font-serif italic" style={{ color: "rgba(212,175,55,0.7)" }} data-testid={`score-${product.id}`}>
              {matchScore}% match
            </span>
          </div>

          {/* Hero label */}
          {isHero && (
            <motion.p
              className="text-[10px] uppercase tracking-[0.25em] mb-3 font-medium"
              style={{ color: "rgba(212,175,55,0.55)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Recommended for you
            </motion.p>
          )}

          {/* Product name */}
          <h2
            className="font-serif leading-tight mb-5 text-foreground"
            style={{ fontSize: isHero ? "2.1rem" : "1.7rem", fontWeight: 500 }}
          >
            {product.name}
          </h2>

          {/* Strength dots */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,160,120,0.7)" }}>
              Strength
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    background: s <= product.strength
                      ? "linear-gradient(135deg, hsl(48 90% 60%), hsl(43 85% 50%))"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: s <= product.strength ? "0 0 6px rgba(212,175,55,0.5)" : "none",
                  }}
                />
              ))}
            </div>
            <span
              className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(180,160,120,0.6)" }}
            >
              {product.tier}
            </span>
          </div>

          {/* Tasting notes */}
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(180,160,120,0.6)" }}>
              Tasting Notes
            </p>
            <div className="flex flex-wrap gap-2">
              {product.flavorNotes.map((note) => (
                <span
                  key={note}
                  className="px-3 py-1 text-xs rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(220,200,170,0.85)",
                  }}
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Mood tags */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex flex-wrap gap-2">
              {product.moodTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] italic capitalize"
                  style={{ color: "rgba(180,155,100,0.6)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
