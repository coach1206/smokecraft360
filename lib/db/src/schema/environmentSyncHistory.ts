/**
 * environment_sync_history — atmospheric orchestration event log.
 *
 * Records every time the venue's ambient environment (DMX lighting, haptic
 * floor panels, scent diffusers) is updated in response to a Room Energy
 * reading or manual trigger. Used for:
 *   - Post-session correlation: did the ambient preset drive revenue lift?
 *   - Replay: re-apply a known-good preset during a similar energy window
 *   - Audit: track who (or which automation rule) triggered each sync
 *
 * room_energy_trigger    The Room Energy score (0–100) that initiated this
 *                        sync, or null for manual / scheduled triggers
 * dmx_preset_applied     Named preset applied to the lighting system
 * haptic_pulse_intensity Normalized 0.0–1.0 intensity sent to haptic hardware;
 *                        null if haptic panels are not present at this venue
 * triggered_by           'AUTOMATION' | 'STAFF' | 'SCHEDULE'
 * actor_id               staff user who triggered it (null = automation)
 */

import {
  pgTable, uuid, text, real, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const DMX_PRESETS = [
  "PREMIUM_WINDOW",
  "HIGH_ENERGY",
  "INTIMATE_REVEAL",
  "COOL_DOWN",
  "AMBIENT_HOLD",
] as const;

export const SYNC_TRIGGERS = ["AUTOMATION", "STAFF", "SCHEDULE"] as const;

export type DmxPreset    = typeof DMX_PRESETS[number];
export type SyncTrigger  = typeof SYNC_TRIGGERS[number];

export const environmentSyncHistoryTable = pgTable(
  "environment_sync_history",
  {
    syncId:               uuid("sync_id").primaryKey().defaultRandom(),
    venueId:              uuid("venue_id").notNull(),
    roomEnergyTrigger:    real("room_energy_trigger"),              // 0–100; null = manual
    dmxPresetApplied:     text("dmx_preset_applied")
      .$type<DmxPreset>(),
    hapticPulseIntensity: real("haptic_pulse_intensity"),           // 0.0–1.0
    triggeredBy:          text("triggered_by")
      .notNull()
      .default("AUTOMATION")
      .$type<SyncTrigger>(),
    actorId:              uuid("actor_id"),                         // null = automation
    appliedAt:            timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    venueIdx:   index("esh_venue_idx").on(t.venueId),
    appliedIdx: index("esh_applied_idx").on(t.venueId, t.appliedAt),
    presetIdx:  index("esh_preset_idx").on(t.dmxPresetApplied),
  }),
);

export const insertEnvironmentSyncHistorySchema = createInsertSchema(
  environmentSyncHistoryTable,
).omit({ syncId: true, appliedAt: true });

export type InsertEnvironmentSyncHistory = z.infer<typeof insertEnvironmentSyncHistorySchema>;
export type EnvironmentSyncHistory       = typeof environmentSyncHistoryTable.$inferSelect;
