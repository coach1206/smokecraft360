/**
 * NOVEE OS — Shadow + Elevation Token System
 * Material depth levels for the dark espresso design language.
 *
 * Levels:
 *   surface-1  — in-page cards, default glass panels
 *   surface-2  — elevated cards, hover states
 *   floating   — dropdowns, tooltips, popovers
 *   modal      — dialogs, sheets
 *   overlay    — full-screen overlays
 */

export const shadows = {
  none:     "none",

  // Surface cards
  card:     "0 2px 12px rgba(26,26,27,0.06), inset 0 1px 0 rgba(26,26,27,0.08)",
  cardGlow: (color: string) =>
    `0 0 28px ${color}22, 0 4px 20px rgba(26,26,27,0.10), inset 0 1px 0 rgba(26,26,27,0.08)`,

  // Elevated (hover)
  elevated: "0 8px 32px rgba(26,26,27,0.14), 0 2px 8px rgba(26,26,27,0.06), inset 0 1px 0 rgba(26,26,27,0.09)",
  elevatedGlow: (color: string) =>
    `0 0 40px ${color}28, 0 8px 32px rgba(26,26,27,0.18), inset 0 1px 0 rgba(26,26,27,0.09)`,

  // Floating elements
  floating: "0 16px 48px rgba(26,26,27,0.26), 0 4px 16px rgba(26,26,27,0.10)",

  // Modals / sheets
  modal:    "0 24px 80px rgba(26,26,27,0.36), 0 8px 32px rgba(26,26,27,0.18)",

  // Inner glow (inset)
  innerGold: "inset 0 1px 0 rgba(212,139,0,0.14)",
  innerWhite: "inset 0 1px 0 rgba(26,26,27,0.08)",

  // Top bar
  topBar:   "inset 0 1px 0 rgba(26,26,27,0.08), 0 1px 0 rgba(212,139,0,0.10), 0 8px 32px rgba(26,26,27,0.22)",
} as const;
