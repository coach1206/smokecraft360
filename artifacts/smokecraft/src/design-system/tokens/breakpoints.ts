/**
 * NOVEE OS — Breakpoint Token System
 * Targets: kiosk (touch), tablet, desktop.
 */

export const breakpoints = {
  // Minimum widths
  kiosk:   480,   // kiosk portrait
  tablet:  768,   // iPad / tablet landscape
  desktop: 1024,  // desktop / kiosk landscape
  wide:    1280,  // wide desktop
  ultra:   1440,  // ultrawide / multi-pane

  // Max content widths
  content: {
    sm:    640,
    md:    900,
    lg:    1100,
    xl:    1280,
    full:  "100%",
  },
} as const;

/** CSS media query helpers */
export const mq = {
  kiosk:   `@media (min-width: 480px)`,
  tablet:  `@media (min-width: 768px)`,
  desktop: `@media (min-width: 1024px)`,
  wide:    `@media (min-width: 1280px)`,
  touch:   `@media (hover: none) and (pointer: coarse)`,
} as const;
