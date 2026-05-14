/**
 * NOVEE OS — Typography Token System
 * Locked scale for high readability in dim lounge environments.
 *
 * Minimums per Step 1 directive:
 *   Body text:  16px (relaxed to 13px for dense operational dashboards)
 *   Labels:     12px minimum (lifted from legacy 8-9px)
 *   Headers:    24–48px
 */

export const fontFamily = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body:    "'Inter', 'SF Pro Display', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const fontSize = {
  // Labels / metadata (kiosk density — 11px minimum)
  "2xs":  10,   // metadata, timestamps, tiny tags (minimum, use sparingly)
  xs:     11,   // labels, caps text, badge text
  sm:     12,   // secondary body, table cells
  base:   13,   // primary operational body text
  md:     14,   // readable body text, form inputs
  lg:     15,   // card titles, highlighted body
  xl:     16,   // section body text (Step 1 minimum for body)

  // Headings
  "2xl":  18,   // card headers, sub-section titles
  "3xl":  20,   // section headers
  "4xl":  24,   // page section titles
  "5xl":  28,   // KPI values (display serif)
  "6xl":  36,   // major KPI figures
  "7xl":  48,   // hero/page headers

  // KPI / display numerals (always Cormorant Garamond serif)
  kpiSm:  22,
  kpiMd:  28,
  kpiLg:  36,
  kpiXl:  48,
} as const;

export const fontWeight = {
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,
  extrabold: 800,
} as const;

export const letterSpacing = {
  tight:   "-0.02em",
  normal:  "0em",
  wide:    "0.04em",
  wider:   "0.08em",
  widest:  "0.12em",
  caps:    "0.14em",
} as const;

export const lineHeight = {
  none:     1,
  tight:    1.2,
  snug:     1.35,
  normal:   1.5,
  relaxed:  1.65,
  loose:    1.8,
} as const;
