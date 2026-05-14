/**
 * NOVEE OS — Admin Design System
 *
 * One source of truth for ALL admin / operations / analytics / governance pages.
 * Experience / kiosk pages (CraftHub, ExperiencePage, etc.) keep their own tokens.
 *
 * Philosophy:
 *   - Matte charcoal + espresso base layers (never pure black)
 *   - Smoked-glass panel surfaces with warm gold accents
 *   - OLED-inspired contrast without readability loss
 *   - 16px+ body, 20px+ section headers, 32–48px hero values
 *   - Hospitality warmth — feels alive, intelligent, premium
 */

// ─── Background layers ──────────────────────────────────────────────────────
export const BG = {
  page:      "#F5F2ED",      // deepest page — rich espresso, not black
  secondary: "#12100E",      // secondary surfaces
  panel:     "#181512",      // standard panel surface
  elevated:  "#2A2A2A",      // elevated / floating panels
  interactive:"#2A241E",     // hover / interactive surfaces
  overlay:   "rgba(245,242,237,0.72)", // modal backdrops
} as const;

// ─── Glass surfaces (for cards / panels) ────────────────────────────────────
export const GLASS = {
  sm:   "rgba(255,255,255,0.028)",
  md:   "rgba(26,26,27,0.06)",
  lg:   "rgba(26,26,27,0.07)",
  gold: "rgba(212,139,0,0.06)",
  goldMid: "rgba(212,139,0,0.10)",
} as const;

// ─── Border palette ─────────────────────────────────────────────────────────
export const BORDER = {
  subtle: "rgba(212,139,0,0.08)",
  default:"rgba(212,139,0,0.14)",
  strong: "rgba(212,139,0,0.24)",
  gold:   "rgba(212,139,0,0.32)",
  dim:    "rgba(26,26,27,0.08)",
} as const;

// ─── Gold palette ────────────────────────────────────────────────────────────
export const GOLD = {
  bright: "#D48B00",
  mid:    "#D48B00",
  dim:    "rgba(212,139,0,0.55)",
  muted:  "rgba(212,139,0,0.30)",
  glow:   "rgba(212,139,0,0.12)",
  glowMd: "rgba(212,139,0,0.20)",
} as const;

// ─── Typography palette ──────────────────────────────────────────────────────
export const TEXT = {
  primary:  "#1A1A1B",       // cream-warm — primary body
  secondary:"#D6C3A1",       // secondary labels
  muted:    "#6B5E4E",       // muted / supporting
  inactive: "rgba(245,231,200,0.40)", // inactive nav, placeholders
  gold:     "#D48B00",
} as const;

// ─── Status colors ───────────────────────────────────────────────────────────
export const STATUS = {
  green:  "#34D399",
  amber:  "#F59E0B",
  red:    "#F87171",
  blue:   "#60A5FA",
  purple: "#A78BFA",
  teal:   "#2DD4BF",
  orange: "#FB923C",
} as const;

// ─── Typography scale ────────────────────────────────────────────────────────
export const TYPE = {
  hero:     { fontSize: 42, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.02em", lineHeight: 1.1 },
  h1:       { fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.02em", lineHeight: 1.2 },
  h2:       { fontSize: 22, fontWeight: 600, letterSpacing: "0.01em", lineHeight: 1.3 },
  h3:       { fontSize: 18, fontWeight: 600, letterSpacing: "0.01em", lineHeight: 1.4 },
  body:     { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  label:    { fontSize: 17, fontWeight: 600, letterSpacing: "0.04em" },
  small:    { fontSize: 13, fontWeight: 500, letterSpacing: "0.06em" },
  micro:    { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const },
  kpi:      { fontSize: 38, fontWeight: 700, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1 },
} as const;

// ─── Shared shadows ──────────────────────────────────────────────────────────
export const SHADOW = {
  card:    "0 4px 24px rgba(26,26,27,0.14), inset 0 1px 0 rgba(26,26,27,0.06)",
  panel:   "0 8px 40px rgba(26,26,27,0.22), inset 0 1px 0 rgba(26,26,27,0.07)",
  elevated:"0 16px 56px rgba(26,26,27,0.30), inset 0 1px 0 rgba(26,26,27,0.08)",
  glow: (color: string) => `0 0 28px ${color}33, 0 4px 16px rgba(26,26,27,0.18)`,
} as const;

// ─── Reusable inline-style helpers ──────────────────────────────────────────

/** Standard admin page wrapper */
export const pageStyle = (): React.CSSProperties => ({
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: BG.page,
  color: TEXT.primary,
  fontFamily: "'Inter', sans-serif",
  position: "relative",
});

/** Top header bar */
export const headerStyle = (): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 24px",
  borderBottom: `1px solid ${BORDER.subtle}`,
  background: `linear-gradient(180deg, ${BG.secondary} 0%, ${BG.panel} 100%)`,
  backdropFilter: "blur(16px)",
  flexShrink: 0,
  boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)",
  zIndex: 10,
});

/** Back / icon button */
export const backBtnStyle = (): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: 12,
  background: BG.elevated,
  border: `1px solid ${BORDER.default}`,
  color: TEXT.muted,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(26,26,27,0.06)",
  flexShrink: 0,
});

/** Glass panel card */
export const cardStyle = (opts?: { glow?: string; gold?: boolean }): React.CSSProperties => ({
  background: opts?.gold ? GLASS.gold : GLASS.md,
  border: `1px solid ${opts?.glow ? opts.glow + "33" : opts?.gold ? BORDER.default : BORDER.subtle}`,
  borderRadius: 14,
  backdropFilter: "blur(12px)",
  boxShadow: opts?.glow ? SHADOW.glow(opts.glow) : SHADOW.card,
});

/** KPI stat tile */
export const kpiTileStyle = (color?: string): React.CSSProperties => ({
  ...cardStyle({ glow: color }),
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  position: "relative",
  overflow: "hidden",
});

/** Section heading */
export const sectionHeadStyle = (): React.CSSProperties => ({
  ...TYPE.h3,
  color: TEXT.secondary,
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

/** Tab pill button */
export const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "9px 18px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.03em",
  transition: "all 0.2s ease",
  background: active ? GLASS.goldMid : BG.elevated,
  border: `1px solid ${active ? BORDER.gold : BORDER.subtle}`,
  color: active ? GOLD.bright : TEXT.muted,
  boxShadow: active ? `0 0 14px ${GOLD.glow}` : "none",
});

/** Scrollable content area */
export const scrollAreaStyle = (): React.CSSProperties => ({
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
});

/** Ambient radial gradient (position:absolute, inset:0, pointerEvents:none) */
export const ambientGlow = (color: string, pos = "20% 50%"): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: `radial-gradient(ellipse at ${pos}, ${color}28 0%, transparent 65%)`,
  pointerEvents: "none",
});

/** Bottom telemetry bar line */
export const telemetryLine = (color: string): React.CSSProperties => ({
  height: 1,
  background: `linear-gradient(90deg, ${color}55, transparent)`,
  marginTop: 8,
});

/** Section divider */
export const dividerStyle = (): React.CSSProperties => ({
  height: 1,
  background: `linear-gradient(90deg, transparent, ${BORDER.default}, transparent)`,
  margin: "20px 0",
});

/** Status badge */
export const badgeStyle = (color: string): React.CSSProperties => ({
  ...TYPE.micro,
  color,
  background: `${color}18`,
  border: `1px solid ${color}44`,
  borderRadius: 6,
  padding: "3px 8px",
});

/** Empty-state container */
export const emptyStateStyle = (): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  gap: 12,
  ...cardStyle(),
});

// ─── Module-specific ambient image URLs ─────────────────────────────────────
export const MODULE_IMAGES = {
  presence:    "/images/scenes/relaxed.jpg",
  revenue:     "/images/scenes/social.jpg",
  intelligence:"/images/scenes/reflective.jpg",
  campaigns:   "/images/lounge-bg.jpg",
  analytics:   "/images/scenes/reflective.jpg",
  vendors:     "/images/cigar4.png",
  devices:     "/images/scenes/bold.jpg",
  staff:       "/images/scenes/social.jpg",
  governance:  "/images/scenes/reflective.jpg",
  central:     "/images/scenes/bold.jpg",
  enterprise:  "/images/scenes/bold.jpg",
  inventory:   "/images/cigar2.png",
  environment: "/images/scenes/reflective.jpg",
  operations:  "/images/lounge-bg.jpg",
} as const;

// ─── Page ambient background helper ─────────────────────────────────────────
export const moduleHeroStyle = (imageUrl: string): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  backgroundImage: `url(${imageUrl})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  opacity: 0.06,
  pointerEvents: "none",
  zIndex: 0,
});
