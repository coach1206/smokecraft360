import { motion, AnimatePresence } from "framer-motion";

interface BgState { filter: string; tint: string }

const BG: Record<string, BgState> = {
  default:              { filter: "brightness(0.62) saturate(1.15)",                    tint: "rgba(20,12,6,0.52)"  },
  welcome:              { filter: "brightness(0.58) saturate(1.1)",                     tint: "rgba(22,14,6,0.55)"  },
  experience_cigar:     { filter: "brightness(0.50) saturate(1.15)",                    tint: "rgba(28,16,4,0.60)"  },
  experience_spirits:   { filter: "brightness(0.58) saturate(0.92) hue-rotate(20deg)", tint: "rgba(14,10,22,0.54)" },
  flavor_smoky:         { filter: "brightness(0.38) saturate(1.25)",                    tint: "rgba(10,6,2,0.68)"   },
  flavor_sweet:         { filter: "brightness(0.68) saturate(1.15) hue-rotate(-8deg)",  tint: "rgba(26,16,8,0.46)"  },
  flavor_earthy:        { filter: "brightness(0.50) saturate(1.1) hue-rotate(12deg)",   tint: "rgba(16,10,4,0.58)"  },
  flavor_cedar:         { filter: "brightness(0.48) saturate(1.3) hue-rotate(8deg)",    tint: "rgba(18,10,4,0.62)"  },
  flavor_spicy:         { filter: "brightness(0.42) saturate(1.5)",                     tint: "rgba(14,5,2,0.66)"   },
  flavor_creamy:        { filter: "brightness(0.70) saturate(0.88)",                    tint: "rgba(26,18,12,0.44)" },
  flavor_nutty:         { filter: "brightness(0.60) saturate(1.05)",                    tint: "rgba(22,14,6,0.52)"  },
  flavor_leather:       { filter: "brightness(0.36) saturate(0.9)",                     tint: "rgba(10,7,4,0.72)"   },
  flavor_cocoa:         { filter: "brightness(0.44) saturate(1.1) hue-rotate(5deg)",    tint: "rgba(14,8,3,0.65)"   },
  flavor_floral:        { filter: "brightness(0.72) saturate(1.2) hue-rotate(-12deg)",  tint: "rgba(22,15,10,0.44)" },
  flavor_vanilla:       { filter: "brightness(0.72) saturate(0.9) hue-rotate(-10deg)",  tint: "rgba(26,18,10,0.42)" },
  flavor_oak:           { filter: "brightness(0.48) saturate(1.1) hue-rotate(5deg)",    tint: "rgba(16,10,4,0.62)"  },
  flavor_caramel:       { filter: "brightness(0.65) saturate(1.2) hue-rotate(-5deg)",   tint: "rgba(24,15,6,0.50)"  },
  flavor_citrus:        { filter: "brightness(0.72) saturate(1.3) hue-rotate(-18deg)",  tint: "rgba(20,18,4,0.44)"  },
  flavor_honey:         { filter: "brightness(0.70) saturate(1.1) hue-rotate(-8deg)",   tint: "rgba(25,16,6,0.46)"  },
  flavor_rye:           { filter: "brightness(0.52) saturate(1.15) hue-rotate(5deg)",   tint: "rgba(18,11,4,0.58)"  },
  flavor_smoke:         { filter: "brightness(0.36) saturate(1.2)",                     tint: "rgba(10,6,2,0.70)"   },
  flavor_fruity:        { filter: "brightness(0.68) saturate(1.3) hue-rotate(-15deg)",  tint: "rgba(22,14,10,0.46)" },
  strength_mild:        { filter: "brightness(0.80) saturate(0.82) hue-rotate(-5deg)",  tint: "rgba(22,16,10,0.36)" },
  strength_medium:      { filter: "brightness(0.56) saturate(1.0)",                     tint: "rgba(20,12,5,0.52)"  },
  strength_full:        { filter: "brightness(0.34) saturate(1.55)",                    tint: "rgba(10,4,1,0.74)"   },
  mood_relaxed:         { filter: "brightness(0.62) saturate(1.0)",                     tint: "rgba(20,14,8,0.42)"  },
  mood_bold:            { filter: "brightness(0.50) saturate(1.4)",                     tint: "rgba(12,4,1,0.55)"   },
  mood_social:          { filter: "brightness(0.70) saturate(1.15)",                    tint: "rgba(22,15,8,0.34)"  },
  mood_reflective:      { filter: "brightness(0.42) saturate(0.85)",                    tint: "rgba(8,6,4,0.62)"    },
  mood_celebratory:     { filter: "brightness(0.72) saturate(1.28) hue-rotate(5deg)",   tint: "rgba(25,18,8,0.36)"  },
  mood_focused:         { filter: "brightness(0.46) saturate(0.85)",                    tint: "rgba(14,10,6,0.55)"  },
  mood_adventurous:     { filter: "brightness(0.55) saturate(1.4) hue-rotate(8deg)",    tint: "rgba(15,8,3,0.50)"   },
  mood_intense:         { filter: "brightness(0.34) saturate(1.65)",                    tint: "rgba(8,3,1,0.70)"    },
  results:              { filter: "brightness(0.40) saturate(1.15)",                    tint: "rgba(10,6,3,0.58)"   },
};

// Map bg keys → specific scene image (falls back to WHISKEY_SCENE)
//
// Bg policy: NO fruit, NO citrus garnish, NO cocktails. Spirits scenes show
// neat whiskey/bourbon in a rocks glass on dark wood — that's the brand.
// Cigar scenes show smoke + tobacco. Mood scenes (relaxed/social/bold/
// reflective) are abstract lounge ambiance.
const WHISKEY_SCENE =
  "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=1600&q=70";
// IMPORTANT: the prior Unsplash cigar URL (photo-1527144901953-6e34cf3a4ff5)
// started 404'ing, leaving the cigar mood scene as just the dark gradient
// with no photo. Same drift hit the experience-step card in Home.tsx — we
// swapped that to a Pexels cigar photo that's been visually verified to
// render actual cigar/tobacco content (no people, no goggles). Mirror that
// fix here. Do NOT swap to a new ID without opening the URL and confirming
// the rendered image.
const CIGAR_SCENE =
  "https://images.pexels.com/photos/1637114/pexels-photo-1637114.jpeg?auto=compress&cs=tinysrgb&w=1600";

const SCENE: Record<string, string> = {
  welcome:             WHISKEY_SCENE,
  experience_cigar:    CIGAR_SCENE,
  experience_spirits:  WHISKEY_SCENE,
  mood_relaxed:        "/images/scenes/relaxed.jpg",
  mood_social:         "/images/scenes/social.jpg",
  mood_celebratory:    "/images/scenes/social.jpg",
  mood_bold:           "/images/scenes/bold.jpg",
  mood_intense:        "/images/scenes/bold.jpg",
  mood_adventurous:    "/images/scenes/bold.jpg",
  mood_reflective:     "/images/scenes/reflective.jpg",
  mood_focused:        "/images/scenes/reflective.jpg",
};
const DEFAULT_SCENE = WHISKEY_SCENE;

interface Props { bgKey: string }

export function DynamicBackground({ bgKey }: Props) {
  const state = BG[bgKey] ?? BG.default;
  const scene = SCENE[bgKey] ?? DEFAULT_SCENE;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ filter: state.filter, transition: "filter 0.5s ease" }}
    >
      {/* Layered scene crossfade — current scene fades out, next fades in */}
      <AnimatePresence>
        <motion.div
          key={scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0 }}
        >
          {/* Slow drifting lounge photo — 28s breathing loop */}
          <motion.div
            animate={{
              scale: [1.08, 1.11, 1.08],
              x:     ["0%", "-1.4%", "0%"],
              y:     ["0%", "-0.8%", "0%"],
            }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0,
              backgroundImage:    `url('${scene}')`,
              backgroundSize:     "cover",
              backgroundPosition: "center",
              willChange:         "transform",
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div
        className="absolute inset-0"
        style={{ background: state.tint, transition: "background 0.5s ease" }}
      />
      {/* Sidebar gradient — dark left for sidebar readability, light right for product visibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,5,2,0.94) 0%, rgba(8,5,2,0.68) 18%, rgba(8,5,2,0.06) 46%, rgba(4,2,1,0.02) 100%)",
        }}
      />
    </div>
  );
}
