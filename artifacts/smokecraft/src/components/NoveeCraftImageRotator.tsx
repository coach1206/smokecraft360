import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Asset database — 4 crafts, curated Unsplash imagery ─────────────────────
const CRAFT_ASSETS = {
  smokecraft: [
    { url: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?q=80&w=1200", desc: "Premium hand-rolled cigar ritual" },
    { url: "https://images.unsplash.com/photo-1606166187734-a4cb74079027?q=80&w=1200", desc: "Diverse connoisseurs in luxury lounge" },
    { url: "https://images.unsplash.com/photo-1527066579998-d4e419000c4b?q=80&w=1200", desc: "Precision straight cap cut ceremony" },
    { url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200", desc: "Toasting the foot with amber embers" },
  ],
  pourcraft: [
    { url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1200", desc: "Aged bourbon slow pour in heavy crystal tumbler" },
    { url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?q=80&w=1200", desc: "Premium cognac neat in a crystal snifter" },
    { url: "https://images.unsplash.com/photo-1569529465841-dfedd87500f1?q=80&w=1200", desc: "Single malt scotch pairing ritual" },
  ],
  beercraft: [
    { url: "https://images.unsplash.com/photo-1436018626274-89acd67ae29e?q=80&w=1200", desc: "Cold artisanal craft pilsner in classic stein" },
    { url: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=1200", desc: "Rich stout beer with dense head in a master mug" },
  ],
  winecraft: [
    { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1200", desc: "Sommelier-guided crystal decanter aeration" },
    { url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=1200", desc: "Fine vintage red wine tasting presentation" },
  ],
} as const;

type CraftKey = keyof typeof CRAFT_ASSETS;

// Stagger offsets ensure zero synchronicity across the four portal cards
const STAGGER_MS: Record<CraftKey, number> = {
  smokecraft: 0,
  pourcraft:  2000,
  beercraft:  4000,
  winecraft:  6000,
};

interface Props {
  craft: CraftKey;
  intervalMs?: number;
}

export function NoveeCraftImageRotator({ craft, intervalMs = 9000 }: Props) {
  const assets = CRAFT_ASSETS[craft];
  const [idx, setIdx]       = useState(0);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setIdx(prev => (prev + 1) % assets.length);
      }, intervalMs);
    }, STAGGER_MS[craft]);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [craft, assets.length, intervalMs]);

  const asset = assets[idx];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Animated image layer — luxury fade-in scale morph */}
      <AnimatePresence>
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 1.07 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)", scale: 1.02 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${asset.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </AnimatePresence>

      {/* Dark gradient overlay — keeps Cormorant typography readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, rgba(6,5,4,0.62) 0%, rgba(6,5,4,0.78) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
