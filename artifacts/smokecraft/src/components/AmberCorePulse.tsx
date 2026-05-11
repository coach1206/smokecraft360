/**
 * AmberCorePulse — PourCraft ambient presence.
 *
 * Drop-in replacement for EmberHeartbeat when craft === "pour".
 * Visual identity: radial liquid gradient (#FFBF00 → #331A00),
 * simulated caustics (animated shimmer streaks), and a slow organic
 * swell animation — like a whiskey droplet, not a fire pulse.
 */

import { motion, useTransform, type MotionValue } from "framer-motion";

interface Props {
  dragX?:  MotionValue<number>;
  corner?: "bottom-left" | "bottom-right" | "center";
  size?:   number;
}

export default function AmberCorePulse({ dragX, corner = "bottom-left", size = 11 }: Props) {
  const r = size * 6;

  const driveScale = dragX
    ? useTransform(dragX, [-240, 0, 240], [0.72, 1, 1.55])
    : undefined;
  const driveGlow  = dragX
    ? useTransform(dragX, [-240, 0, 240], ["#FFBF0040", "#FFBF0070", "#FFBF00aa"])
    : undefined;

  const pos: React.CSSProperties =
    corner === "center"
      ? { bottom: "50%", left: "50%", transform: "translate(-50%, 50%)" }
      : corner === "bottom-right"
      ? { bottom: 44, right: 22 }
      : { bottom: 44, left: 22 };

  return (
    <div style={{ position: "fixed", ...pos, zIndex: 6, pointerEvents: "none" }}>

      {/* ── Caustics outer wash ── */}
      <motion.div
        animate={{
          scaleX:  [1, 1.18, 0.92, 1.26, 1],
          scaleY:  [1, 0.88, 1.14, 0.90, 1],
          rotate:  [0, 14, -9, 20, 0],
          opacity: [0.14, 0.24, 0.14],
        }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          width:        r * 4.2,
          height:       r * 4.2,
          top:          "50%",
          left:         "50%",
          marginTop:    -r * 2.1,
          marginLeft:   -r * 2.1,
          borderRadius: "56% 44% 62% 38% / 44% 56% 38% 62%",
          background:   `radial-gradient(ellipse at 40% 38%, #FFBF0028 0%, #8B4500 50%, transparent 75%)`,
        }}
      />

      {/* ── Liquid core — swells like a drop ── */}
      <motion.div
        style={{
          width:        r * 2,
          height:       r * 2,
          borderRadius: "50%",
          background:   `radial-gradient(circle at 36% 32%,
            #FFE066 0%,
            #FFBF00 20%,
            #CC7700 45%,
            #6B2800 75%,
            #331A00 100%)`,
          scale: driveScale,
        }}
        animate={{
          scale:     [1, 1.10, 0.94, 1.18, 1.02, 1],
          boxShadow: driveGlow
            ? undefined
            : [
              `0 0 ${r * 2}px #FFBF0055, 0 0 ${r * 5}px #E6780028`,
              `0 0 ${r * 4}px #FFBF0099, 0 0 ${r * 9}px #E6780055`,
              `0 0 ${r * 2}px #FFBF0055, 0 0 ${r * 5}px #E6780028`,
            ],
        }}
        transition={{ duration: 4.2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
      />

      {/* ── Caustic highlight streaks ── */}
      {[
        { w: r * 1.6, h: r * 0.4, top: "28%", left: "18%", rot: -28, delay: 0    },
        { w: r * 1.0, h: r * 0.3, top: "48%", left: "38%", rot:  12, delay: 0.9  },
        { w: r * 0.7, h: r * 0.2, top: "38%", left: "52%", rot: -42, delay: 1.7  },
      ].map((c, i) => (
        <motion.div
          key={i}
          animate={{
            x:       [0,  c.w * 0.18, -c.w * 0.1, 0],
            y:       [0, -c.h * 2.0,   c.h * 1.4,  0],
            opacity: [0.5, 0.85, 0.5],
            scaleX:  [1, 1.15, 1],
          }}
          transition={{ duration: 2.8 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
          style={{
            position:     "absolute",
            width:        c.w,
            height:       c.h,
            borderRadius: "50%",
            background:   "rgba(255,220,80,0.75)",
            filter:       `blur(${r * 0.3}px)`,
            top:          c.top,
            left:         c.left,
            rotate:       c.rot,
            mixBlendMode: "screen",
            pointerEvents:"none",
          }}
        />
      ))}

      {/* ── Liquid meniscus ring ── */}
      <motion.div
        animate={{
          scale:   [1, 1.22, 1.08, 1.30, 1],
          opacity: [0.22, 0.40, 0.22],
        }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        style={{
          position:     "absolute",
          width:        r * 2.8,
          height:       r * 2.8,
          top:          "50%",
          left:         "50%",
          marginTop:    -r * 1.4,
          marginLeft:   -r * 1.4,
          borderRadius: "50%",
          border:       `1px solid rgba(255,191,0,0.45)`,
          boxShadow:    `inset 0 0 ${r * 1.5}px rgba(255,191,0,0.18)`,
        }}
      />
    </div>
  );
}
