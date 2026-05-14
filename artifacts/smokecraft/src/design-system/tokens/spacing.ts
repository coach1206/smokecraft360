/**
 * NOVEE OS — Spacing Token System
 * 8px base scale. All spacing values must come from here.
 * Use sp() for pixel values, or the named tokens directly.
 */

export const spacing = {
  0:   0,
  0.5: 4,
  1:   8,
  1.5: 12,
  2:   16,
  2.5: 20,
  3:   24,
  4:   32,
  5:   40,
  6:   48,
  7:   56,
  8:   64,
  10:  80,
  12:  96,
  16:  128,
} as const;

/** Named semantic spacing tokens */
export const space = {
  // Intra-component
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,

  // Card padding
  cardSm:  "12px 14px",
  cardMd:  "16px 18px",
  cardLg:  "20px 24px",
  cardXl:  "28px 32px",

  // Page padding
  pageSm:  "16px",
  pageMd:  "24px",
  pageLg:  "32px",

  // Grid gaps
  gridSm:  8,
  gridMd:  12,
  gridLg:  16,
  gridXl:  20,

  // Touch targets (minimum interactive size)
  touchSm: 40,
  touchMd: 48,
  touchLg: 56,
} as const;
