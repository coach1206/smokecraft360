/**
 * hardware_registry — operational health record for each physical display unit.
 *
 * Complements the existing tables:
 *   devices        — logical identity (nickname, type, venue assignment)
 *   device_hardware — procurement record (serial, warranty, supplier)
 *
 * This table covers the OPERATIONAL runtime layer:
 *   device_type            Physical form-factor role: TABLE | COMMAND | WALL
 *   firmware_version       Semantic version string; compared against target
 *                          firmware during OTA update checks
 *   last_heartbeat         Timestamp of most recent device ping; null means the
 *                          device has never checked in after registration
 *   status                 ACTIVE | INACTIVE | MAINTENANCE | DECOMMISSIONED
 *   oled_protection_status Whether pixel-shift / burn-in protection is enabled;
 *                          critical for long-running kiosk displays
 *
 * venue_id provides tenant scope so the route layer can enforce isolation
 * without joining to `devices`.
 *
 * device_id is the PRIMARY KEY — caller supplies the UUID (from devices.id or
 * a hardware serial-derived deterministic UUID). No defaultRandom() so mismatches
 * fail loudly rather than silently creating orphan rows.
 */

import {
  pgTable, uuid, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const HARDWARE_DEVICE_TYPES = ["TABLE", "COMMAND", "WALL"] as const;
export const HARDWARE_STATUSES     = ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"] as const;

export type HardwareDeviceType = typeof HARDWARE_DEVICE_TYPES[number];
export type HardwareStatus     = typeof HARDWARE_STATUSES[number];

export const hardwareRegistryTable = pgTable(
  "hardware_registry",
  {
    deviceId:             uuid("device_id").primaryKey(),
    venueId:              uuid("venue_id"),                         // tenant scope
    deviceType:           text("device_type")
      .$type<HardwareDeviceType>(),
    firmwareVersion:      text("firmware_version"),                 // e.g. "2.4.1"
    lastHeartbeat:        timestamp("last_heartbeat",  { withTimezone: true }),
    status:               text("status")
      .notNull()
      .default("ACTIVE")
      .$type<HardwareStatus>(),
    oledProtectionStatus: boolean("oled_protection_status")
      .notNull()
      .default(true),
    createdAt:            timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt:            timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    venueIdx:   index("hr_venue_idx").on(t.venueId),
    statusIdx:  index("hr_status_idx").on(t.status),
    heartbeatIdx: index("hr_heartbeat_idx").on(t.lastHeartbeat),
  }),
);

export const insertHardwareRegistrySchema = createInsertSchema(hardwareRegistryTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertHardwareRegistry = z.infer<typeof insertHardwareRegistrySchema>;
export type HardwareRegistry       = typeof hardwareRegistryTable.$inferSelect;
