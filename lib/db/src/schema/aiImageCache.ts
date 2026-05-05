/**
 * aiImageCache — caches AI-generated craft style images by prompt hash.
 * Generated images are stored in Cloudinary; only the URL is kept here.
 */
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const aiImageCacheTable = pgTable(
  "ai_image_cache",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    promptHash:   text("prompt_hash").notNull().unique(),
    promptText:   text("prompt_text").notNull(),
    cloudinaryUrl: text("cloudinary_url").notNull(),
    craft:        text("craft").notNull(),
    styleId:      text("style_id"),
    moodId:       text("mood_id"),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ai_image_cache_craft_style_idx").on(t.craft, t.styleId),
  ],
);

export type AiImageCache    = typeof aiImageCacheTable.$inferSelect;
export type NewAiImageCache = typeof aiImageCacheTable.$inferInsert;
