/**
 * hardware_fleet — physical asset registry with thermal and network mesh tracking.
 *
 * Complements hardware_registry (operational heartbeat / OLED flag) and
 * device_hardware (procurement / warranty). This table owns:
 *   serial_number          UNIQUE hardware identifier stamped on the unit
 *   device_type            TABLE_OLED | COMMAND_CENTER | WALL_DISPLAY
 *   thermal_threshold_celsius  Alert threshold; exceeding it triggers a
 *                              THERMAL_ALERT in security_audit_trail
 *   pixel_shift_active     Fine-grained OLED burn-in pixel-shift toggle
 *                          (hardware_registry.oled_protection_status is the
 *                          venue-level master switch; this is the per-unit state)
 *   network_status         ONLINE | MESH_FAILOVER | OFFLINE
 *                          MESH_FAILOVER means the unit is running via the
 *                          offline mesh — degraded but not dead
 *   last_heartbeat         Last successful check-in timestamp
 *
 * venue_id provides tenant scope for route-layer isolation.
 */

import {
  pgTable, uuid, text, integer, boolean, timestamp, index, unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const FLEET_DEVICE_TYPES  = ["TABLE_OLED", "COMMAND_CENTER", "WALL_DISPLAY"] as const;
export const FLEET_NETWORK_STATUSES = ["ONLINE", "MESH_FAILOVER", "OFFLINE"]       as const;

export type FleetDeviceType    = typeof FLEET_DEVICE_TYPES[number];
export type FleetNetworkStatus = typeof FLEET_NETWORK_STATUSES[number];

export const hardwareFleetTable = pgTable(
  "hardware_fleet",
  {
    deviceId:                uuid("device_id").primaryKey().defaultRandom(),
    venueId:                 uuid("venue_id"),
    serialNumber:            text("serial_number"),
    deviceType:              text("device_type").$type<FleetDeviceType>(),
    firmwareVersion:         text("firmware_version"),
    thermalThresholdCelsius: integer("thermal_threshold_celsius").notNull().default(75),
    pixelShiftActive:        boolean("pixel_shift_active").notNull().default(true),
    lastHeartbeat:           timestamp("last_heartbeat", { withTimezone: true }),
    networkStatus:           text("network_status")
      .notNull()
      .default("ONLINE")
      .$type<FleetNetworkStatus>(),
    createdAt:               timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt:               timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    serialUniq:    unique("hf_serial_uniq").on(t.serialNumber),
    venueIdx:      index("hf_venue_idx").on(t.venueId),
    networkIdx:    index("hf_network_idx").on(t.networkStatus),
    heartbeatIdx:  index("hf_heartbeat_idx").on(t.lastHeartbeat),
    typeIdx:       index("hf_type_idx").on(t.deviceType),
  }),
);

export const insertHardwareFleetSchema = createInsertSchema(hardwareFleetTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertHardwareFleet = z.infer<typeof insertHardwareFleetSchema>;
export type HardwareFleet       = typeof hardwareFleetTable.$inferSelect;
