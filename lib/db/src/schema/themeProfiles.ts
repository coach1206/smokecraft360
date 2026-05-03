/**
 * theme_profiles — registry of tenant theme presets for the multi-tenant
 * kiosk platform. Each row defines the visual + audio + product shape for
 * a vertical (cigars, wine, whiskey, coffee, scent) so a venue can opt
 * into a preset by setting `venues.theme_profile = '<slug>'`.
 *
 * Convention:
 *   - slug         primary key, lowercase, kebab-case (e.g. "smokecraft", "pourcraft")
 *   - displayName  human label shown in admin UI
 *   - productType  drives recommendation engine vertical ('cigar' | 'wine' | 'whiskey' | 'coffee' | 'scent')
 *   - primaryColor hex string used by the kiosk UI for accents
 *   - visualStyle  free-form aesthetic key consumed by DynamicBackground
 *                  (e.g. 'smoke', 'liquid', 'steam')
 *   - soundProfile free-form audio key consumed by the kiosk's sound bus
 *                  (e.g. 'crackle', 'pour', 'pour-fizz')
 *   - steps        ordered list of wizard steps the kiosk should render
 *                  for this vertical (e.g. ['mood','flavor','body','pairing'])
 *   - metadata     escape hatch for vertical-specific extras
 */

import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const themeProfilesTable = pgTable("theme_profiles", {
  slug:         text("slug").primaryKey(),
  displayName:  text("display_name").notNull(),
  productType:  text("product_type").notNull(),
  primaryColor: text("primary_color").notNull(),
  visualStyle:  text("visual_style").notNull(),
  soundProfile: text("sound_profile").notNull(),
  steps:        jsonb("steps").$type<string[]>().notNull(),
  metadata:     jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export type DbThemeProfile     = typeof themeProfilesTable.$inferSelect;
export type InsertThemeProfile = typeof themeProfilesTable.$inferInsert;
