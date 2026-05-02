/**
 * Global brand configuration for SmokeCraft 360.
 *
 * Import this anywhere you need brand-consistent copy, colors, or metadata.
 * Venue-specific overrides live in VenueContext — this is the root identity.
 */

export const BRAND = {
  name:         "SmokeCraft 360",
  shortName:    "SmokeCraft",
  tagline:      "Craft Your Experience",
  description:  "Premium cigar and spirits recommendations — curated for the connoisseur.",
  primaryColor: "#D4AF37",
  background:   "#0b0b0b",
  accent:       "#c28f2c",
  copyright:    `© SmokeCraft 360 — All Rights Reserved`,
} as const;
