/**
 * NOVEE OS — Global brand configuration.
 *
 * Single source of truth for all brand copy, identifiers, and positioning.
 * Import this wherever brand-consistent text, colors, or metadata is needed.
 * Venue-specific overrides live in VenueContext.
 *
 * Legacy alias: previously "SmokeCraft 360" / "NOVEE OS (v1)" — compatibility
 * mappings for localStorage keys, analytics events, and telemetry labels
 * are maintained in legacyMappings.ts.
 */

export const BRAND = {
  /** Short platform name — used in headers, OS chrome, PWA title. */
  name:           "NOVEE OS",
  /** Full platform identity. */
  platform:       "NOVEE OS",
  /** Short name for constrained UI surfaces. */
  shortName:      "NOVEE",
  /** Parent company. */
  parentCompany:  "Profound Innovations",
  /** Intelligence layer brand name. */
  intelligence:   "NOVEE Intelligence",
  /** Intelligence engine acronym. */
  eeie:           "EEIE",
  /** Intelligence engine full name. */
  engine:         "Experience Enhancement Intelligence Engine",
  /** Experience platform. */
  craftHub:       "CraftHub",
  /** Powered-by line used in sub-headers and boot screens. */
  poweredBy:      "Powered by NOVEE Intelligence",
  /** Primary brand tagline. */
  tagline:        "Intelligence That Elevates",
  /** Boot / init copy. */
  initLine:       "Initializing Adaptive Environment\u2026",
  /** Description for meta tags and manifests. */
  description:    "An adaptive intelligence operating system designed to transform physical environments into predictive, emotionally intelligent experiences.",
  /** Hex values — reference only, CSS vars are the source of truth in index.css. */
  primaryColor:   "#D4AF37",
  background:     "#000000",
  accent:         "#D4AF37",
  copyright:      "\u00A9 Profound Innovations \u2014 All Rights Reserved",
} as const;

/**
 * Legacy compatibility aliases.
 * DO NOT DELETE — referenced by analytics, telemetry, and localStorage readers.
 */
export const LEGACY = {
  /** Original platform name retained for localStorage key compatibility. */
  platformLegacy: "NOVEE OS",
  /** Legacy analytics prefix still emitted by older event paths. */
  analyticsPrefix: "axiom",
  /** LocalStorage key written by the EEIE journey tracker. */
  eeisJourneyKey: "axiom_eeis_journey",
} as const;
