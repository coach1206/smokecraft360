/**
 * iot_humidor_readings — Smart Humidor sensor telemetry.
 *
 * Receives POST payloads from IoT sensors (Smart Humidors, environment
 * stations) via /api/iot/humidor. Each row captures a single sensor snapshot.
 *
 * Gold Standard thresholds:
 *   temperature: 65–70°F (18.3–21.1°C)
 *   humidity:    65–72% RH
 *
 * When a reading deviates beyond tolerance, the API immediately emits a
 * compensatory_pairing nudge via Socket.IO to the venue's connected kiosk(s).
 */

import { pgTable, uuid, text, real, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const HUMIDOR_GOLD_STANDARD = {
  tempMinC:  18.3,
  tempMaxC:  21.1,
  humMinPct: 65,
  humMaxPct: 72,
} as const;

export const iotHumidorReadingsTable = pgTable(
  "iot_humidor_readings",
  {
    id:                uuid("id").primaryKey().defaultRandom(),
    venueId:           uuid("venue_id").notNull(),
    sensorId:          text("sensor_id").notNull(),
    temperatureCelsius:real("temperature_celsius"),
    humidityPct:       real("humidity_pct"),
    isDeviant:         boolean("is_deviant").notNull().default(false),
    deviationNote:     text("deviation_note"),
    nudgeSent:         boolean("nudge_sent").notNull().default(false),
    rawPayload:        text("raw_payload"),
    recordedAt:        timestamp("recorded_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_humidor_venue_time").on(t.venueId, t.recordedAt),
  ],
);

export type IotHumidorReading     = typeof iotHumidorReadingsTable.$inferSelect;
export type InsertIotHumidorReading = typeof iotHumidorReadingsTable.$inferInsert;
