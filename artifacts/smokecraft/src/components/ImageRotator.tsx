/**
 * ImageRotator — Inclusive sensory image rotator.
 *
 * Cycles through a diverse gallery of craft lifestyle images:
 *   - Macro-HD tobacco textures, spirit pours, device close-ups
 *   - Ken Burns zoom/pan for cinematic stimulation between card swipes
 *
 * Each mounted instance starts at a staggered index so no two cards
 * ever show the same image simultaneously.
 *
 * Props:
 *   craftType    — which craft image pool to use
 *   interval     — ms between transitions (default 4000)
 *   opacity      — overlay opacity (default 0.40)
 *   blur         — backdrop blur in px (default 12)
 *   instanceSeed — stagger offset (card index) so each card is unique
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type RotatorCraftType = "smoke" | "pour" | "brew" | "vape" | "wine" | "all";

const CRAFT_POOLS: Record<RotatorCraftType, string[]> = {
  smoke: [
    "/images/smoke/smoke_selection.png",
    "/images/cigar1.png",
    "/images/cigar2.png",
    "/images/cigar3.png",
    "/images/cigar4.png",
    "/images/cigar.png",
  ],
  pour: [
    "/images/pour/pour_bar.png",
    "/images/pour/pour_whiskey.png",
    "/images/pour/pour_aged.png",
    "/images/pour/pour_cocktail.png",
    "/images/pour/pour_tasting.png",
    "/images/pour/pour_wine.png",
  ],
  brew: [
    "/images/brew/brew_taproom.png",
    "/images/brew/brew_outdoor.png",
    "/images/brew/brew_barrel.png",
    "/images/brew/brew_pouring.png",
    "/images/brew/brew_flight.png",
  ],
  vape: [
    "/images/vape/vape_modern.png",
    "/images/vape/vape_social.png",
    "/images/vape/vape_hookah.png",
    "/images/vape/vape_device.png",
  ],
  wine: [
    "/images/wine/wine_cellar.png",
    "/images/wine/wine_tasting.png",
    "/images/wine/wine_vineyard.png",
    "/images/wine/wine_glass.png",
  ],
  all: [
    "/images/smoke/smoke_selection.png",
    "/images/pour/pour_bar.png",
    "/images/brew/brew_taproom.png",
    "/images/vape/vape_modern.png",
    "/images/cigar1.png",
    "/images/pour/pour_whiskey.png",
    "/images/brew/brew_barrel.png",
    "/images/vape/vape_social.png",
    "/images/cigar3.png",
    "/images/pour/pour_aged.png",
  ],
};

const KEN_BURNS_VARIANTS = [
  { scale: [1.08, 1.18], x: ["0%", "-3%"],  y: ["0%", "-2%"]  },
  { scale: [1.10, 1.06], x: ["-2%", "2%"],  y: ["0%", "2%"]   },
  { scale: [1.06, 1.14], x: ["2%", "-2%"],  y: ["-2%", "0%"]  },
  { scale: [1.12, 1.07], x: ["0%", "3%"],   y: ["2%", "-2%"]  },
  { scale: [1.08, 1.15], x: ["-3%", "0%"],  y: ["1%", "-1%"]  },
];

interface ImageRotatorProps {
  craftType?:    RotatorCraftType;
  interval?:     number;
  opacity?:      number;
  blur?:         number;
  instanceSeed?: number;
  style?:        React.CSSProperties;
}

export default function ImageRotator({
  craftType    = "smoke",
  interval     = 4200,
  opacity      = 0.40,
  blur         = 12,
  instanceSeed = 0,
  style,
}: ImageRotatorProps) {
  const pool = CRAFT_POOLS[craftType] ?? CRAFT_POOLS.smoke;

  // Stagger starting image: each instance (card) begins at a different slot
  // so no two cards ever show the same image at the same time.
  const startIdx = useMemo(() => instanceSeed % pool.length, [instanceSeed, pool.length]);

  const [idx, setIdx] = useState(startIdx);
  const kbIdx         = useRef(instanceSeed % KEN_BURNS_VARIANTS.length);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % pool.length);
      kbIdx.current = (kbIdx.current + 1) % KEN_BURNS_VARIANTS.length;
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pool.length, interval]);

  const kb = KEN_BURNS_VARIANTS[kbIdx.current]!;

  return (
    <div style={{
      position:      "absolute",
      inset:         0,
      overflow:      "hidden",
      pointerEvents: "none",
      ...style,
    }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: opacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <motion.div
            animate={{ scale: kb.scale, x: kb.x, y: kb.y }}
            transition={{ duration: interval / 1000 + 1.4, ease: "linear" }}
            style={{
              width:                "110%",
              height:               "110%",
              position:             "absolute",
              top:                  "-5%",
              left:                 "-5%",
              backgroundImage:      `url(${pool[idx]})`,
              backgroundSize:       "cover",
              backgroundPosition:   "center",
              backdropFilter:       `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
