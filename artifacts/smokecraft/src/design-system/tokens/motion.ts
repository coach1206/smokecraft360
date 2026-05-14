/**
 * NOVEE OS — Motion Token System
 * Standardized animation timing, easing, and durations.
 * Rule: smooth and subtle. No excessive animation.
 */

export const duration = {
  instant:   0,
  fast:      100,
  normal:    180,
  moderate:  250,
  slow:      350,
  slower:    500,
  slowest:   800,
  // KPI counter animation
  counter:   900,
} as const;

export const easing = {
  linear:    "linear",
  in:        "cubic-bezier(0.4, 0, 1, 1)",
  out:       "cubic-bezier(0, 0, 0.2, 1)",
  inOut:     "cubic-bezier(0.4, 0, 0.2, 1)",
  // Premium: slight overshoot
  spring:    "cubic-bezier(0.34, 1.56, 0.64, 1)",
  // Ease out expo — fast start, gentle settle
  expo:      "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

/** Framer Motion transition presets */
export const transition = {
  fast:     { duration: 0.1, ease: easing.out },
  normal:   { duration: 0.18, ease: easing.out },
  moderate: { duration: 0.25, ease: easing.out },
  slow:     { duration: 0.35, ease: easing.out },
  spring:   { type: "spring" as const, stiffness: 300, damping: 28 },
  // Page transition
  page:     { duration: 0.22, ease: easing.out },
  // Card stagger
  stagger:  (i: number) => ({ delay: i * 0.05, duration: 0.2, ease: easing.out }),
} as const;

/** Standard Framer Motion animation presets */
export const animate = {
  fadeIn:   { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slideUp:  { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } },
  slideDown:{ initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 } },
  scale:    { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } },
} as const;
