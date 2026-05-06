/**
 * receipts — Axiom Session Receipt records.
 *
 * Generated on tab payment completion. Stores the full cinematic receipt
 * payload so it can be retrieved, re-delivered, or rendered on any device.
 *
 * Delivery channels: kiosk | email | sms | qr | print | wallet
 * Each has its own status flag: null = not requested, "pending" | "sent" | "failed"
 */

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const RECEIPT_DELIVERY_STATUSES = ["pending", "sent", "failed"] as const;
export type ReceiptDeliveryStatus = typeof RECEIPT_DELIVERY_STATUSES[number];

export const receiptsTable = pgTable("receipts", {
  id:                uuid("id").primaryKey().defaultRandom(),
  tabId:             uuid("tab_id").notNull(),
  venueId:           uuid("venue_id").notNull(),
  guestProfileId:    uuid("guest_profile_id"),
  userId:            uuid("user_id"),

  // Snapshot of the session at payment time (denormalized for immutability)
  payload:           jsonb("payload").notNull(), // full AxiomReceiptPayload JSON

  // Delivery tracking per channel
  kioskStatus:       text("kiosk_status").$type<ReceiptDeliveryStatus>(),
  emailStatus:       text("email_status").$type<ReceiptDeliveryStatus>(),
  smsStatus:         text("sms_status").$type<ReceiptDeliveryStatus>(),
  printStatus:       text("print_status").$type<ReceiptDeliveryStatus>(),

  emailAddress:      text("email_address"),
  phoneNumber:       text("phone_number"),

  // QR token for guest self-retrieval
  qrToken:           text("qr_token").unique(),

  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  byTab:    index("receipts_tab_idx").on(t.tabId),
  byVenue:  index("receipts_venue_idx").on(t.venueId),
  byGuest:  index("receipts_guest_idx").on(t.guestProfileId),
  byQr:     index("receipts_qr_idx").on(t.qrToken),
}));

export type Receipt       = typeof receiptsTable.$inferSelect;
export type InsertReceipt = typeof receiptsTable.$inferInsert;
