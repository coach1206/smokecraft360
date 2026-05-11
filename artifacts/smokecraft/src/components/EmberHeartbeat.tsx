/**
 * EmberHeartbeat — Persistent ambient ember glow.
 * Mounts as an additive fixed overlay in the corner of the screen.
 * Follows the guest through Overview, Enrollment, and Swipe Ritual.
 * Zero-interruption: pointer-events none, never touches main DOM tree.
 *
 * When dragX is supplied (Step 8 / Swipe Ritual):
 *   - Right drag → scale rises to 1.85×, brightness increases
 *   - Left drag  → scale drops to 0.45×, desaturates to cold grey
 */

import { motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";

interface Props {
  color?:  string;
  corner?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  size?:   number;
  /** When provided, ember reacts live to card drag position */
  dragX?:  MotionValue<number>;
}

const CORNER_STYLE: Record<NonNullable<Props["corner"]>, React.CSSProperties> = {
  "bottom-left":  { bottom: 22, left: 22  },
  "bottom-right": { bottom: 22, right: 22 },
  "top-left":     { top: 22,   left: 22  },
  "top-right":    { top: 22,   right: 22 },
};

export default function EmberHeartbeat({
  color  = "#D48B00",
  corner = "bottom-left",
  size   = 8,
  dragX,
}: Props) {
  const pos  = CORNER_STYLE[corner];
  const glow = `${color}55`;

  // Fallback static MotionValue when no drag is wired
  const fallback = useMotionValue(0);
  const mx = dragX ?? fallback;

  // Scale: right drag lifts ember, left drag shrinks it
  const dynamicScale = useTransform(mx, [-300, 0, 300], [0.45, 1.0, 1.85]);

  // Filter: left = cold grey, center = natural, right = hot gold
  const dynamicFilter = useTransform(
    mx,
    [-220, -80, 0, 80, 220],
    [
      "saturate(0) brightness(0.45) hue-rotate(180deg)",
      "saturate(0.3) brightness(0.65)",
      "saturate(1) brightness(1)",
      "saturate(1.25) brightness(1.18)",
      "saturate(1.6) brightness(1.45)",
    ],
  );

  return (
    <motion.div
      style={{
        position:       "fixed",
        ...pos,
        zIndex:         9700,
        pointerEvents:  "none",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        width:          size + 24,
        height:         size + 24,
        scale:          dynamicScale,
        filter:         dynamicFilter,
      }}
    >
      {/* Outer pulse ring — slow breath */}
      <motion.div
        animate={{
          scale:   [1, 1.9, 1],
          opacity: [0.28, 0, 0.28],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:      "absolute",
          width:         size + 20,
          height:        size + 20,
          borderRadius:  "50%",
          border:        `1px solid ${color}`,
          pointerEvents: "none",
        }}
      />

      {/* Mid ring — offset phase */}
      <motion.div
        animate={{
          scale:   [1, 1.5, 1],
          opacity: [0.2, 0, 0.2],
        }}
        transition={{ duration: 3.2, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:      "absolute",
          width:         size + 12,
          height:        size + 12,
          borderRadius:  "50%",
          border:        `1px solid ${color}`,
          pointerEvents: "none",
        }}
      />

      {/* Inner ember dot */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 ${size}px 2px ${glow}`,
            `0 0 ${size * 2.5}px 6px ${glow}`,
            `0 0 ${size}px 2px ${glow}`,
          ],
          scale: [1, 1.12, 1],
        }}
        transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width:         size,
          height:        size,
          borderRadius:  "50%",
          background:    `radial-gradient(circle, ${color} 0%, ${color}88 60%, ${color}00 100%)`,
          pointerEvents: "none",
        }}
      />
    </motion.div>
  );
}
