import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const posMenuMappingsTable = pgTable("pos_menu_mappings", {
  id:             uuid("id").primaryKey().defaultRandom(),
  connectionId:   uuid("connection_id").notNull(),
  venueId:        uuid("venue_id").notNull(),
  provider:       text("provider").notNull(),
  eeisProdId:     text("eeis_prod_id").notNull(),
  eeisName:       text("eeis_name").notNull(),
  posProdId:      text("pos_prod_id").notNull(),
  posName:        text("pos_name").notNull(),
  posCategory:    text("pos_category"),
  posPriceCents:  integer("pos_price_cents"),
  sku:            text("sku"),
  isVerified:     boolean("is_verified").notNull().default(false),
  isActive:       boolean("is_active").notNull().default(true),
  mappedBy:       uuid("mapped_by"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});
