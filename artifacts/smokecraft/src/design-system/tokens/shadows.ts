/**
 * Axiom OS — Shadow + Elevation Token System
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
  card:     "0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
  cardGlow: (color: string) =>
    `0 0 28px ${color}22, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,

  // Elevated (hover)
  elevated: "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)",
  elevatedGlow: (color: string) =>
    `0 0 40px ${color}28, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`,

  // Floating elements
  floating: "0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",

  // Modals / sheets
  modal:    "0 24px 80px rgba(0,0,0,0.75), 0 8px 32px rgba(0,0,0,0.5)",

  // Inner glow (inset)
  innerGold: "inset 0 1px 0 rgba(255,210,120,0.14)",
  innerWhite: "inset 0 1px 0 rgba(255,255,255,0.06)",

  // Top bar
  topBar:   "inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(255,210,120,0.10), 0 8px 32px rgba(0,0,0,0.55)",
} as const;
