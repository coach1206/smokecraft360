/**
 * swipeExperience — tables for the Universal Swipe Experience Engine.
 *
 * Tables:
 *   experienceItemsTable      — craft-specific swipeable items (flavor cards)
 *   experienceSessionsTable   — per-user swipe session lifecycle
 *   sessionSwipesTable        — individual swipe events (add / skip)
 *   userTasteMemoryTable      — persistent per-tag weight for each user
 *   userRevenueMemoryTable    — revenue behavior profile per user + craft type
 *   recommendationEventsTable — tracks which recommendations were shown / accepted
 */

import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, numeric, unique, index,
} from "drizzle-orm/pg-core";

// ── experience_items ──────────────────────────────────────────────────────────

export const experienceItemsTable = pgTable("experience_items", {
  id:              uuid("id").primaryKey().defaultRandom(),
  title:           text("title").notNull(),
  description:     text("description"),
  image:           text("image"),
  type:            text("type").notNull(),          // smoke | pour | brew | vape
  category:        text("category"),
  tags:            text("tags").array().notNull().default([]),
  intensity:       integer("intensity").notNull().default(5),
  baseScore:       integer("base_score").notNull().default(50),
  cost:            numeric("cost", { precision: 10, scale: 2 }).default("0"),
  retailPrice:     numeric("retail_price", { precision: 10, scale: 2 }).default("0"),
  inventoryItemId: text("inventory_item_id"),       // FK → products.id
  active:          boolean("active").notNull().default(true),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byType:   index("exp_items_type_idx").on(t.type),
  byActive: index("exp_items_active_idx").on(t.active),
}));

export type ExperienceItem = typeof experienceItemsTable.$inferSelect;

// ── experience_sessions ───────────────────────────────────────────────────────

export const experienceSessionsTable = pgTable("experience_sessions", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  userId:               uuid("user_id"),             // null = guest
  experienceType:       text("experience_type").notNull(),
  status:               text("status").notNull().default("active"),   // active | completed | abandoned
  startedAt:            timestamp("started_at").notNull().defaultNow(),
  completedAt:          timestamp("completed_at"),
  tasteProfile:         jsonb("taste_profile").$type<Record<string, number>>().default({}),
  revenueProfile:       jsonb("revenue_profile").$type<Record<string, unknown>>().default({}),
  finalRecommendations: jsonb("final_recommendations").$type<unknown[]>().default([]),
}, (t) => ({
  byUser:   index("exp_sessions_user_idx").on(t.userId),
  byType:   index("exp_sessions_type_idx").on(t.experienceType),
  byStatus: index("exp_sessions_status_idx").on(t.status),
}));

export type ExperienceSession = typeof experienceSessionsTable.$inferSelect;

// ── session_swipes ────────────────────────────────────────────────────────────

export const sessionSwipesTable = pgTable("session_swipes", {
  id:             uuid("id").primaryKey().defaultRandom(),
  sessionId:      uuid("session_id").notNull(),
  userId:         uuid("user_id"),
  itemId:         uuid("item_id").notNull(),
  experienceType: text("experience_type").notNull(),
  action:         text("action").notNull(),   // add | skip
  tags:           text("tags").array().notNull().default([]),
  scoreDelta:     integer("score_delta").notNull().default(0),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  bySession: index("swipes_session_idx").on(t.sessionId),
  byUser:    index("swipes_user_idx").on(t.userId),
}));

export type SessionSwipe = typeof sessionSwipesTable.$inferSelect;

// ── user_taste_memory ─────────────────────────────────────────────────────────

export const userTasteMemoryTable = pgTable("user_taste_memory", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     uuid("user_id").notNull(),
  tag:        text("tag").notNull(),
  weight:     integer("weight").notNull().default(0),
  lastAction: text("last_action"),     // add | skip
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unique:  unique("taste_memory_user_tag_uniq").on(t.userId, t.tag),
  byUser:  index("taste_memory_user_idx").on(t.userId),
}));

export type UserTasteMemory = typeof userTasteMemoryTable.$inferSelect;

// ── user_revenue_memory ───────────────────────────────────────────────────────

export const userRevenueMemoryTable = pgTable("user_revenue_memory", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull(),
  experienceType:    text("experience_type").notNull(),
  avgMargin:         numeric("avg_margin", { precision: 5, scale: 2 }).default("0"),
  preferredPriceBand: text("preferred_price_band").default("mid"),  // low | mid | premium
  conversionScore:   integer("conversion_score").notNull().default(0),
  lifetimeSessions:  integer("lifetime_sessions").notNull().default(0),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unique: unique("rev_memory_user_type_uniq").on(t.userId, t.experienceType),
  byUser: index("rev_memory_user_idx").on(t.userId),
}));

export type UserRevenueMemory = typeof userRevenueMemoryTable.$inferSelect;

// ── recommendation_events ─────────────────────────────────────────────────────

export const recommendationEventsTable = pgTable("recommendation_events", {
  id:                uuid("id").primaryKey().defaultRandom(),
  sessionId:         uuid("session_id"),
  userId:            uuid("user_id"),
  experienceType:    text("experience_type"),
  inventoryItemId:   text("inventory_item_id"),
  recommendationScore: integer("recommendation_score"),
  reason:            text("reason"),
  shown:             boolean("shown").notNull().default(true),
  accepted:          boolean("accepted").notNull().default(false),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  bySession: index("rec_events_session_idx").on(t.sessionId),
  byUser:    index("rec_events_user_idx").on(t.userId),
}));

export type RecommendationEvent = typeof recommendationEventsTable.$inferSelect;
