/**
 * Axiom OS — Color Token System
 * Single source of truth for all colors used across the platform.
 * All pages MUST import from here — no hardcoded hex strings.
 */

export const colors = {
  // ── Brand / Gold hierarchy ────────────────────────────────────────────────
  gold:        "#D48B00",
  goldBright:  "#D48B00",
  goldDim:     "rgba(212,139,0,0.5)",
  goldFaint:   "rgba(212,139,0,0.14)",

  // ── Cream / Text hierarchy ────────────────────────────────────────────────
  cream:       "#1A1A1B",
  textPrimary: "rgba(26,26,27,0.90)",
  textMuted:   "rgba(240,232,212,0.48)",
  textDim:     "rgba(26,26,27,0.28)",

  // ── Backgrounds ───────────────────────────────────────────────────────────
  bgDeep:      "#F5F2ED",
  bgBase:      "#0A0804",
  bgSurface1:  "rgba(255,255,255,0.046)",
  bgSurface2:  "rgba(26,26,27,0.09)",
  bgSurface3:  "rgba(26,26,27,0.12)",

  // ── Borders ───────────────────────────────────────────────────────────────
  borderGold:  "rgba(212,139,0,0.18)",
  borderDim:   "rgba(26,26,27,0.10)",
  borderFocus: "rgba(212,139,0,0.55)",

  // ── Semantic / Status ─────────────────────────────────────────────────────
  green:       "#34d399",
  greenFaint:  "rgba(52,211,153,0.12)",
  amber:       "#f59e0b",
  amberFaint:  "rgba(245,158,11,0.12)",
  red:         "#ef4444",
  redFaint:    "rgba(239,68,68,0.12)",
  blue:        "#60a5fa",
  blueFaint:   "rgba(96,165,250,0.12)",
  purple:      "#a78bfa",
  purpleFaint: "rgba(167,139,250,0.12)",

  // ── Craft accent colors ───────────────────────────────────────────────────
  craft: {
    smoke: "#e85d26",
    pour:  "#7c3aed",
    brew:  "#ca8a04",
    vape:  "#0891b2",
  },
} as const;

export type ColorToken = keyof typeof colors;
