import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ProductResult } from "../services/api";
import { ProductImage } from "./ProductImage";
import { useState } from "react";

interface SwipeableCardProps {
  product:  ProductResult;
  onSwipe:  (dir: "left" | "right") => void;
  isTop:    boolean;
  index:    number;
  isHero?:  boolean;
}

const CREAM   = "rgba(245, 235, 220, 0.97)";
const DARK    = "#1A1208";
const BROWN   = "#3D2712";
const MUTED   = "rgba(58, 36, 14, 0.55)";
const GOLD    = "#B8891A";

const strengthLabel = (s: number) => ["Very Mild", "Mild", "Medium", "Full", "Very Full"][Math.min(s - 1, 4)] ?? "Medium";

export function SwipeableCard({ product, onSwipe, isTop, index, isHero = false }: SwipeableCardProps) {
  const x        = useMotionValue(0);
  const controls = useAnimation();
  const [exitX, setExitX] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotate      = useTransform(x, [-220, 220], [-12, 12]);
  const opacity     = useTransform(x, [-200, -120, 0, 120, 200], [0.4, 1, 1, 1, 0.4]);
  const likeOpacity = useTransform(x, [0, 80],  [0, 1]);
  const skipOpacity = useTransform(x, [0, -80], [0, 1]);

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

  return (
    <motion.div
      className="absolute inset-0 w-full h-[520px] origin-bottom"
      style={{
        x:       exitX !== null ? exitX : x,
        rotate,
        opacity: exitX !== null ? 0 : opacity,
        zIndex:  10 - index,
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
      {/* Card glow beneath */}
      {isHero && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 105%, rgba(212,175,55,0.22) 0%, transparent 70%)",
            filter: "blur(18px)",
            transform: "translateY(10px) scale(0.94)",
          }}
          animate={{ opacity: isHovered ? 1 : 0.55 }}
          transition={{ duration: 0.5 }}
        />
      )}

      <motion.div
        className="w-full h-full rounded-2xl overflow-hidden flex flex-col relative"
        style={{
          background: CREAM,
          boxShadow: isTop && isHovered
            ? "0 28px 70px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.2)"
            : isHero
              ? "0 20px 55px rgba(0,0,0,0.65), 0 0 28px rgba(212,175,55,0.12)"
              : "0 12px 40px rgba(0,0,0,0.55)",
        }}
        animate={{ y: isTop && isHovered ? -6 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Hero gold top line */}
        {isHero && (
          <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
            style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.7), transparent)" }} />
        )}

        {/* Product image — full bleed top */}
        <ProductImage
          url={product.imageUrl}
          alt={product.name}
          category={product.category}
          height={200}
          className="rounded-t-2xl"
          lightCard
        />

        {/* Like / Skip indicators */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute top-7 right-7 z-20 rotate-12 pointer-events-none">
          <div className="border-2 font-bold text-xl px-4 py-1.5 uppercase tracking-widest rounded-lg font-serif"
            style={{ borderColor: "rgba(22,163,74,0.9)", color: "rgba(22,163,74,0.9)", boxShadow: "0 0 24px rgba(22,163,74,0.4)" }}>
            Reserve
          </div>
        </motion.div>
        <motion.div style={{ opacity: skipOpacity }} className="absolute top-7 left-7 z-20 -rotate-12 pointer-events-none">
          <div className="border-2 font-bold text-xl px-4 py-1.5 uppercase tracking-widest rounded-lg font-serif"
            style={{ borderColor: "rgba(220,38,38,0.9)", color: "rgba(220,38,38,0.9)", boxShadow: "0 0 24px rgba(220,38,38,0.35)" }}>
            Pass
          </div>
        </motion.div>

        {/* ── Content area — light card ────── */}
        <div className="px-6 pt-4 pb-5 flex flex-col flex-1" style={{ color: DARK }}>

          {/* Category badge + score */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(184,137,26,0.12)", border: "1px solid rgba(184,137,26,0.3)", color: GOLD }}>
              {product.category}
            </span>
            <span className="text-xs font-serif italic" style={{ color: GOLD }} data-testid={`score-${product.id}`}>
              {matchScore}% match
            </span>
          </div>

          {isHero && (
            <p className="text-[9px] uppercase tracking-[0.25em] mb-0.5 font-medium" style={{ color: GOLD }}>
              Recommended for you
            </p>
          )}

          {/* Product name */}
          <h2 className="font-serif leading-tight mb-3" style={{ fontSize: isHero ? "1.65rem" : "1.4rem", fontWeight: 600, color: DARK }}>
            {product.name}
          </h2>

          {/* Strength row */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Strength</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="w-2 h-2 rounded-full transition-all duration-500"
                  style={{
                    background: s <= product.strength
                      ? "linear-gradient(135deg, #B8891A, #D4AF37)"
                      : "rgba(58,36,14,0.15)",
                    boxShadow:  s <= product.strength ? "0 0 5px rgba(184,137,26,0.45)" : "none",
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "rgba(58,36,14,0.08)", color: MUTED }}>
              {strengthLabel(product.strength)}
            </span>
          </div>

          {/* Tasting notes */}
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>Tasting Notes</p>
            <div className="flex flex-wrap gap-1.5">
              {product.flavorNotes.map((note) => (
                <span key={note} className="px-2.5 py-1 text-[10px] rounded-full"
                  style={{ background: "rgba(58,36,14,0.08)", border: "1px solid rgba(58,36,14,0.14)", color: BROWN }}>
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Mood tags */}
          {product.moodTags.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(58,36,14,0.1)" }}>
              <div className="flex flex-wrap gap-2">
                {product.moodTags.map((tag) => (
                  <span key={tag} className="text-[10px] italic capitalize" style={{ color: MUTED }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
