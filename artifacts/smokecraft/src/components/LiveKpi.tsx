/**
 * LiveKpi — animated number counter + optional live pulse dot.
 *
 * Uses requestAnimationFrame with a cubic ease-out for smooth count-up.
 * No external dependencies — Framer Motion handles the pulse ring animation.
 * Re-runs whenever `value` changes so it stays accurate on live data updates.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, durationMs = 1100): number {
  const [display, setDisplay] = useState(0);
  const startRef   = useRef<number | null>(null);
  const fromRef    = useRef(0);
  const rafRef     = useRef<number>(0);

  useEffect(() => {
    fromRef.current  = display;
    startRef.current = null;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased    = easeOutCubic(progress);
      setDisplay(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}

export interface LiveKpiProps {
  value:      number;
  prefix?:    string;
  suffix?:    string;
  style?:     React.CSSProperties;
  /** Show a pulsing "live" dot next to the number */
  live?:      boolean;
  liveColor?: string;
  /** Duration in ms for the count-up animation */
  duration?:  number;
}

export default function LiveKpi({
  value,
  prefix     = "",
  suffix     = "",
  style      = {},
  live       = false,
  liveColor  = "#34d399",
  duration   = 1100,
}: LiveKpiProps) {
  const counted = useCountUp(value, duration);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, ...style }}>
      {prefix}{counted.toLocaleString()}{suffix}
      <AnimatePresence>
        {live && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "inline-flex", alignItems: "center", position: "relative" }}
          >
            {/* Outer pulse ring */}
            <motion.span
              animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
              style={{
                position:    "absolute",
                inset:       0,
                borderRadius: "50%",
                background:  liveColor,
              }}
            />
            {/* Solid dot */}
            <span style={{
              width:        8,
              height:       8,
              borderRadius: "50%",
              background:   liveColor,
              display:      "inline-block",
              position:     "relative",
              boxShadow:    `0 0 6px ${liveColor}`,
            }} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
