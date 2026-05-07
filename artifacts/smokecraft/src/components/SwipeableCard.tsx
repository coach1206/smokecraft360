import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { ShoppingBag, Bookmark, BookmarkCheck } from "lucide-react";
import { ProductResult } from "../services/api";
import { cloudinaryOptimize } from "@/lib/cloudinary";
import { useState } from "react";
import RippleButton from "@/components/RippleButton";

interface SwipeableCardProps {
  product:        ProductResult;
  pairing?:       ProductResult | null;
  onSwipe:        (dir: "left" | "right") => void;
  onOrder:        () => void;
  onSave:         () => void;
  experienceSaved: boolean;
  isTop:          boolean;
  index:          number;
  isHero?:        boolean;
}

/* ── Palette ───────────────────────────────────────── */
const CREAM      = "rgba(245, 235, 220, 0.97)";
const DARK       = "#EFEBE0";
const BROWN      = "#3D2712";
const MUTED      = "rgba(58, 36, 14, 0.5)";
const GOLD       = "#B8891A";
const GOLD_FILL  = "linear-gradient(135deg, #b07c14, #D48B00)";
const GOLD_GLOW  = "0 0 22px rgba(212,139,0,0.5), 0 4px 14px rgba(26,26,27,0.05)";

const STRENGTH_LABELS = ["Very Mild", "Mild", "Medium", "Full", "Very Full"] as const;
const strengthLabel = (s: number) => STRENGTH_LABELS[Math.min(s - 1, 4)] ?? "Medium";

/* ── Fallback image src per category ───────────────── */
const FALLBACK: Record<string, string> = {
  cigar:   "/images/cigar.png",
  alcohol: "/images/whiskey.png",
};

function ProductPhoto({ product }: { product: ProductResult }) {
  const [err, setErr] = useState(false);
  const cat  = product.category?.toLowerCase() ?? "cigar";
  const url  = product.imageUrl ? cloudinaryOptimize(product.imageUrl, 480, 720) : null;
  const src  = (!url || err) ? (FALLBACK[cat] ?? null) : url;

  if (!src) {
    /* deepest fallback — dark gradient panel */
    return (
      <div className="w-full h-full rounded-2xl"
        style={{ background: cat === "alcohol"
          ? "linear-gradient(160deg,#0d1828,#050b14)"
          : "linear-gradient(160deg,#2a1506,#0d0603)" }} />
    );
  }

  return (
    <img
      src={src}
      alt={product.name}
      className="w-full h-full object-contain drop-shadow-2xl"
      style={{ filter: "drop-shadow(0 12px 32px rgba(26,26,27,0.34))" }}
      onError={() => setErr(true)}
      loading="lazy"
      decoding="async"
    />
  );
}

/* ── Main component ──────────────────────────────── */
export function SwipeableCard({
  product, pairing, onSwipe, onOrder, onSave, experienceSaved,
  isTop, index, isHero = false,
}: SwipeableCardProps) {
  const x        = useMotionValue(0);
  const controls = useAnimation();
  const [exitX, setExitX] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rotate      = useTransform(x, [-200, 200], [-10, 10]);
  const opacity     = useTransform(x, [-180, -100, 0, 100, 180], [0.35, 1, 1, 1, 0.35]);
  const likeOpacity = useTransform(x, [0, 70],  [0, 1]);
  const skipOpacity = useTransform(x, [0, -70], [0, 1]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 450) {
      setExitX(360); onSwipe("right");
    } else if (info.offset.x < -90 || info.velocity.x < -450) {
      setExitX(-360); onSwipe("left");
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 280, damping: 22 } });
    }
  };

  const scale   = isTop ? 1 : 0.95 - index * 0.03;
  const yOffset = isTop ? 0 : index * 10;
  const matchScore = Math.min(Math.round((product.score / 14) * 100), 99);

  return (
    <motion.div
      className="absolute inset-0 w-full origin-bottom"
      style={{
        x:       exitX !== null ? exitX : x,
        rotate,
        opacity: exitX !== null ? 0 : opacity,
        zIndex:  10 - index,
        height:  420,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.16}
      onDragEnd={handleDragEnd}
      animate={isTop ? controls : { scale, y: yOffset, opacity: 1 }}
      initial={{ scale: 0.84, opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => isTop && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      data-testid={`swipe-card-${product.id}`}
    >
      {/* Card glow */}
      {isHero && (
        <motion.div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(212,139,0,0.25) 0%, transparent 68%)",
            filter: "blur(20px)", transform: "translateY(12px) scale(0.93)",
          }}
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* ── Side-by-side container ──────────────────────── */}
      <motion.div
        className="w-full h-full flex items-center gap-7"
        animate={{ y: isTop && isHovered ? -5 : 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* ── LEFT: floating product image ──────────────── */}
        <motion.div
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: 220, height: 360 }}
          initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <ProductPhoto product={product} />
        </motion.div>

        {/* ── RIGHT: light cream card ───────────────────── */}
        <motion.div
          className="flex-1 h-full rounded-2xl overflow-hidden flex flex-col relative select-none"
          style={{
            background: CREAM,
            boxShadow: isTop && isHovered
              ? "0 24px 64px rgba(26,26,27,0.30), 0 0 32px rgba(212,139,0,0.18), inset 0 1px 0 rgba(255,255,255,0.7)"
              : isHero
                ? "0 20px 52px rgba(26,26,27,0.26), 0 0 24px rgba(212,139,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
                : "0 12px 36px rgba(26,26,27,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Hero gold top rule */}
          {isHero && (
            <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(212,139,0,0.75) 50%, transparent 100%)" }} />
          )}

          {/* Like / Skip stamps */}
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-5 right-5 z-20 rotate-12 pointer-events-none">
            <div className="border-2 font-bold text-lg px-3 py-1 uppercase tracking-widest rounded-lg font-serif"
              style={{ borderColor: "rgba(22,163,74,0.85)", color: "rgba(22,163,74,0.85)", boxShadow: "0 0 18px rgba(22,163,74,0.35)" }}>
              Reserve
            </div>
          </motion.div>
          <motion.div style={{ opacity: skipOpacity }} className="absolute top-5 left-5 z-20 -rotate-12 pointer-events-none">
            <div className="border-2 font-bold text-lg px-3 py-1 uppercase tracking-widest rounded-lg font-serif"
              style={{ borderColor: "rgba(220,38,38,0.85)", color: "rgba(220,38,38,0.85)", boxShadow: "0 0 18px rgba(220,38,38,0.3)" }}>
              Pass
            </div>
          </motion.div>

          {/* ── Card body ─────────────────────────────── */}
          <div className="flex flex-col flex-1 px-7 pt-6 pb-5 gap-3" style={{ color: DARK }}>

            {/* Category + match score */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.22em] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(184,137,26,0.12)", border: "1px solid rgba(184,137,26,0.28)", color: GOLD }}>
                {product.category}
              </span>
              <span className="text-[10px] font-serif italic" style={{ color: GOLD }}>
                {matchScore}% match
              </span>
            </div>

            {/* Name */}
            <div>
              {isHero && (
                <p className="text-[8px] uppercase tracking-[0.28em] mb-0.5 font-medium" style={{ color: GOLD }}>
                  Recommended for you
                </p>
              )}
              <h1 className="font-serif leading-tight" style={{ fontSize: "1.65rem", fontWeight: 600, color: DARK }}>
                {product.name}
              </h1>
            </div>

            {/* Strength */}
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>Strength</span>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map((s) => (
                  <div key={s} className="w-2 h-2 rounded-full"
                    style={{
                      background: s <= product.strength ? GOLD_FILL : "rgba(58,36,14,0.14)",
                      boxShadow:  s <= product.strength ? "0 0 5px rgba(184,137,26,0.4)" : "none",
                    }} />
                ))}
              </div>
              <span className="text-[9px]" style={{ color: MUTED }}>{strengthLabel(product.strength)}</span>
            </div>

            {/* The Cigar / Pairing section */}
            <div className="space-y-2">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-0.5" style={{ color: MUTED }}>
                  The {product.category === "cigar" ? "Cigar" : "Spirit"}
                </p>
                <p className="text-sm font-medium" style={{ color: BROWN }}>
                  {product.tier ? `${product.tier.charAt(0).toUpperCase() + product.tier.slice(1)} · ` : ""}
                  {product.flavorNotes.slice(0, 2).join(" & ")}
                </p>
              </div>
              {pairing && (
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-0.5" style={{ color: MUTED }}>The Pairing</p>
                  <p className="text-sm font-medium" style={{ color: BROWN }}>{pairing.name}</p>
                </div>
              )}
            </div>

            {/* Flavor notes */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-[0.18em] mb-1.5" style={{ color: MUTED }}>Flavor Notes</p>
              <p className="text-sm" style={{ color: BROWN }}>
                {product.flavorNotes.map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(" · ")}
              </p>
            </div>

            {/* ── Buttons ────────────────────────────────── */}
            <div className="flex items-center gap-2.5 pt-1">
              {/* Secondary — Save */}
              <motion.button
                onClick={onSave}
                disabled={experienceSaved}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.16em] font-medium transition-all duration-300"
                style={experienceSaved
                  ? { background: "rgba(58,36,14,0.08)", border: "1px solid rgba(184,137,26,0.4)", color: GOLD }
                  : { background: "rgba(58,36,14,0.07)", border: "1px solid rgba(58,36,14,0.18)", color: BROWN }
                }
                whileHover={!experienceSaved ? { background: "rgba(58,36,14,0.12)", borderColor: "rgba(58,36,14,0.32)" } : {}}
                whileTap={!experienceSaved ? { scale: 0.96 } : {}}
                data-testid="btn-save"
              >
                <AnimatePresence mode="wait">
                  {experienceSaved
                    ? <motion.span key="saved" className="flex items-center gap-1.5"
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                        <BookmarkCheck size={12} />Saved
                      </motion.span>
                    : <motion.span key="save" className="flex items-center gap-1.5"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Bookmark size={12} />Save
                      </motion.span>
                  }
                </AnimatePresence>
              </motion.button>

              {/* PRIMARY — Order Now (the ONE gold button) */}
              <RippleButton
                onClick={onOrder}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.18em] font-bold"
                rippleColor="rgba(255,255,255,0.25)"
                style={{
                  background: GOLD_FILL,
                  color:      "#0e0803",
                  boxShadow:  GOLD_GLOW,
                }}
                data-testid="btn-order"
                data-tour="tour-order-btn"
              >
                {/* shimmer */}
                <motion.div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)", backgroundSize: "200% 100%" }}
                  animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 1.8 }}
                />
                <ShoppingBag size={12} />Order Now
              </RippleButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
