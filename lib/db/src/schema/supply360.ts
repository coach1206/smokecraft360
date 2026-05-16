import { pgTable, varchar, integer, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

// 1. Current state cache per venue/SKU cluster
export const supplyChainEntries = pgTable('supply_chain_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  venueId: varchar('venue_id', { length: 64 }).notNull(),
  sku: varchar('sku', { length: 128 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  onHand: integer('on_hand').notNull().default(0),
  allocated: integer('allocated').notNull().default(0),
  reorderThreshold: integer('reorder_threshold').notNull().default(10),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  venueSkuIdx: uniqueIndex('venue_sku_idx').on(table.venueId, table.sku)
}));

// 2. Cryptographic append-only structural logging mutation pool
export const supplyVerificationLedger = pgTable('supply_verification_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => supplyChainEntries.id).notNull(),
  venueId: varchar('venue_id', { length: 64 }).notNull(),
  mutationType: varchar('mutation_type', { length: 32 }).notNull(), // 'RESTOCK' | 'DEPLETION' | 'ALLOCATION'
  quantityDelta: integer('quantity_delta').notNull(),
  previousQuantity: integer('previous_quantity').notNull(),
  newQuantity: integer('new_quantity').notNull(),
  broadcastedAt: timestamp('broadcasted_at').defaultNow().notNull()
});

export type SupplyChainEntry          = typeof supplyChainEntries.$inferSelect;
export type InsertSupplyChainEntry    = typeof supplyChainEntries.$inferInsert;
export type SupplyLedgerRow           = typeof supplyVerificationLedger.$inferSelect;
export type InsertSupplyLedgerRow     = typeof supplyVerificationLedger.$inferInsert;
