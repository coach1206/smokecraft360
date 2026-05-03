/**
 * device_hardware — physical asset record for a registered device.
 *
 * The existing `devices` table tracks the LOGICAL identity of a kiosk /
 * tablet / mobile (nickname, table, type, status, last-active). This
 * sidecar tracks the PHYSICAL hardware lifecycle: serial number, model,
 * purchase, warranty. Kept as a separate 1:1 table (rather than columns
 * on `devices`) so:
 *   - the existing kiosk session-tracking surface stays unchanged;
 *   - the hardware row is optional (mobile BYOD has nothing to record);
 *   - PII / procurement data lives on its own auth surface, distinct
 *     from the high-volume read path of `devices`.
 *
 * Tenant scope is inherited from the parent device (single source of
 * truth on `devices.venue_id`). The route layer joins to `devices` on
 * every request and 404s on cross-tenant access (G3/G5/G6 pattern).
 *
 * `deviceId` is the PRIMARY KEY (and effectively a 1:1 FK) — at most one
 * hardware record per device. Upsert via PUT.
 *
 * Indexes:
 *   (warranty_expires_at) — powers the "warranty expiring within N days"
 *   operator report. NULL warranties are excluded from that query.
 */

import { pgTable, uuid, text, timestamp, integer, date, index } from "drizzle-orm/pg-core";

export const deviceHardwareTable = pgTable(
  "device_hardware",
  {
    deviceId:           uuid("device_id").primaryKey(),
    serialNumber:       text("serial_number"),                              // ≤200 (route-enforced); nullable — not all units expose one
    manufacturer:       text("manufacturer"),                               // ≤200
    model:              text("model"),                                      // ≤200
    macAddress:         text("mac_address"),                                // ≤64; route-enforced format
    supplier:           text("supplier"),                                   // ≤200
    purchaseDate:       date("purchase_date"),                              // ISO date, nullable
    purchasePriceCents: integer("purchase_price_cents"),                    // ≥0, ≤ 1,000,000,000 (10M USD); nullable
    warrantyExpiresAt:  timestamp("warranty_expires_at"),                   // nullable; indexed for expiring-soon report
    notes:              text("notes"),                                      // ≤2000
    createdAt:          timestamp("created_at").notNull().defaultNow(),
    updatedAt:          timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    byWarrantyExpiry: index("device_hardware_warranty_expires_idx").on(t.warrantyExpiresAt),
  }),
);

export type DbDeviceHardware     = typeof deviceHardwareTable.$inferSelect;
export type InsertDeviceHardware = typeof deviceHardwareTable.$inferInsert;
