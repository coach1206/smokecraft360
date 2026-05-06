/**
 * media_assets — centralised registry for all uploaded / AI-generated images.
 *
 * A single source-of-truth for every image in the platform so Cloudinary
 * transformations, AI-generation jobs, and admin card swaps all reference
 * the same rows. Replaces ad-hoc string fields scattered across products,
 * venues, and campaigns.
 *
 * Context types mirror Cloudinary folder naming conventions so that the
 * Image Engine can resolve the correct transformation preset without extra
 * DB queries.
 */

import {
  pgTable, uuid, text, boolean, integer, jsonb, timestamp,
} from "drizzle-orm/pg-core";

export const MEDIA_ASSET_CONTEXTS = [
  "product",
  "venue",
  "campaign",
  "brand",
  "user_avatar",
  "craft_build",
  "menu_item",
  "ai_generated",
  "misc",
] as const;

export const MEDIA_ASSET_SUBTYPES = [
  "cigar", "whiskey", "beer", "vape",
  "hero", "logo", "banner", "thumbnail",
  "portrait", "background", "card",
] as const;

export type MediaAssetContext = typeof MEDIA_ASSET_CONTEXTS[number];
export type MediaAssetSubtype = typeof MEDIA_ASSET_SUBTYPES[number];

export const mediaAssetsTable = pgTable("media_assets", {
  id:          uuid("id").primaryKey().defaultRandom(),

  /** Owning entity — the venue, product, campaign, etc. this belongs to */
  ownerId:     uuid("owner_id"),
  ownerType:   text("owner_type").$type<MediaAssetContext>().notNull(),

  /** Cloudinary public_id (full path, e.g. "smokecraft/products/abc123") */
  cloudinaryId: text("cloudinary_id").notNull(),

  /** Fully-resolved secure_url from Cloudinary */
  url:         text("url").notNull(),

  /** Human-readable filename or alt text */
  label:       text("label"),

  /** Craft / content subtype for transformation preset resolution */
  subtype:     text("subtype").$type<MediaAssetSubtype>(),

  /** MIME type ("image/webp", "image/jpeg", …) */
  mimeType:    text("mime_type"),

  /** Pixel dimensions */
  width:       integer("width"),
  height:      integer("height"),

  /** Cloudinary raw transformation string applied at upload time */
  transformation: text("transformation"),

  /** Additional arbitrary metadata (AI prompt, generation params, etc.) */
  meta:        jsonb("meta"),

  /** True for the active/primary image when multiple exist for one owner */
  isPrimary:   boolean("is_primary").notNull().default(false),

  /** Uploaded by (user id) — null for system/AI-generated assets */
  uploadedBy:  uuid("uploaded_by"),

  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type MediaAsset       = typeof mediaAssetsTable.$inferSelect;
export type InsertMediaAsset = typeof mediaAssetsTable.$inferInsert;
