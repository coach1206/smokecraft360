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
  mood_relaxed:         { filter: "brightness(0.55) saturate(0.88)",                    tint: "rgba(20,14,8,0.56)"  },
  mood_bold:            { filter: "brightness(0.36) saturate(1.65)",                    tint: "rgba(12,4,1,0.72)"   },
  mood_social:          { filter: "brightness(0.68) saturate(1.08)",                    tint: "rgba(22,15,8,0.46)"  },
  mood_reflective:      { filter: "brightness(0.26) saturate(0.70)",                    tint: "rgba(8,6,4,0.80)"    },
  mood_celebratory:     { filter: "brightness(0.72) saturate(1.28) hue-rotate(5deg)",   tint: "rgba(25,18,8,0.42)"  },
  mood_focused:         { filter: "brightness(0.44) saturate(0.85)",                    tint: "rgba(14,10,6,0.62)"  },
  mood_adventurous:     { filter: "brightness(0.52) saturate(1.4) hue-rotate(8deg)",    tint: "rgba(15,8,3,0.60)"   },
  mood_intense:         { filter: "brightness(0.26) saturate(1.75)",                    tint: "rgba(8,3,1,0.80)"    },
  results:              { filter: "brightness(0.34) saturate(1.2)",                     tint: "rgba(10,6,3,0.70)"   },
};

interface Props { bgKey: string }

export function DynamicBackground({ bgKey }: Props) {
  const state = BG[bgKey] ?? BG.default;
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: "url('/images/lounge-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: state.filter,
        transition: "filter 0.5s ease",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: state.tint, transition: "background 0.5s ease" }}
      />
      {/* Sidebar gradient */}
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
