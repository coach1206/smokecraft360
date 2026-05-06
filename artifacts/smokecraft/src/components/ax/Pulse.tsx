/**
 * Pulse — Lounge Pulse ambient component.
 *
 * A softly breathing amber cloud rendered via an SVG <feGaussianBlur>
 * filter. Represents the "heartbeat" of the lounge atmosphere.
 *
 * The SVG filter approach gives a physically accurate soft-glow edge
 * that CSS box-shadow cannot replicate — light bleeds naturally in all
 * directions from the ellipse centroid.
 *
 * Props:
 *   color     — glow color (default: axiomAmber #FFBF00)
 *   size      — diameter of the bounding square in px (default: 420)
 *   blur      — feGaussianBlur stdDeviation (default: 28)
 *   minOpacity / maxOpacity — breathing range
 *   duration  — full breath cycle in seconds (default: 5)
 *   id        — SVG filter id suffix (use unique id if rendering multiple)
 *   burst     — when true, triggers a rapid pulse burst before resuming
 */

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

interface PulseProps {
  color?:      string;
  size?:       number;
  blur?:       number;
  minOpacity?: number;
  maxOpacity?: number;
  duration?:   number;
  id?:         string;
  burst?:      boolean;
  className?:  string;
  style?:      React.CSSProperties;
}

export function Pulse({
  color      = "#FFBF00",
  size       = 420,
  blur       = 28,
  minOpacity = 0.07,
  maxOpacity = 0.20,
  duration   = 5,
  id         = "pulse",
  burst      = false,
  className,
  style,
}: PulseProps) {
  const ctrl    = useAnimation();
  const bursting = useRef(false);

  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.36;
  const ry = size * 0.22;

  // Base breathing loop
  useEffect(() => {
    void ctrl.start({
      rx:      [rx * 0.88, rx * 1.10, rx * 0.88],
      ry:      [ry * 0.88, ry * 1.12, ry * 0.88],
      opacity: [minOpacity, maxOpacity, minOpacity],
      transition: {
        duration,
        repeat:   Infinity,
        ease:     "easeInOut",
      },
    });
  }, [ctrl, rx, ry, minOpacity, maxOpacity, duration]);

  // Burst — rapid pulse on craft tap
  useEffect(() => {
    if (!burst || bursting.current) return;
    bursting.current = true;
    void ctrl.start({
      rx:      [rx, rx * 1.28, rx * 0.96, rx],
      ry:      [ry, ry * 1.32, ry * 0.98, ry],
      opacity: [maxOpacity, maxOpacity * 2.2, maxOpacity * 1.1, minOpacity],
      transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
    }).then(() => { bursting.current = false; });
  }, [burst, ctrl, rx, ry, minOpacity, maxOpacity]);

  const filterId = `pulse-blur-${id}`;

  return (
    <div
      className={className}
      style={{
        position:      "absolute",
        pointerEvents: "none",
        zIndex:        1,
        width:  size,
        height: size,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <filter
            id={filterId}
            x="-60%" y="-60%"
            width="220%" height="220%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={blur} result="blur" />
          </filter>
        </defs>

        {/* Outer soft halo — initial values set on element as fallback */}
        <motion.ellipse
          cx={cx} cy={cy}
          fill={color}
          filter={`url(#${filterId})`}
          initial={{ rx: rx * 1.10, ry: ry * 1.10, opacity: minOpacity * 0.5 }}
          animate={{
            opacity: [minOpacity * 0.5, minOpacity * 1.2, minOpacity * 0.5],
            rx:      [rx * 1.10, rx * 1.26, rx * 1.10],
            ry:      [ry * 1.10, ry * 1.28, ry * 1.10],
          }}
          transition={{
            duration: duration * 1.3,
            repeat:   Infinity,
            ease:     "easeInOut",
            delay:    duration * 0.15,
          }}
        />

        {/* Core breathing ellipse — explicit initial so ctrl starts defined */}
        <motion.ellipse
          cx={cx} cy={cy}
          fill={color}
          filter={`url(#${filterId})`}
          initial={{ rx, ry, opacity: minOpacity }}
          animate={ctrl}
        />
      </svg>
    </div>
  );
}
