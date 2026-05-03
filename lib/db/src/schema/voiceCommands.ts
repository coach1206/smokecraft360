/**
 * voice_commands — inbound kiosk voice queue.
 *
 * Counterpart to /api/voice/speak (outbound TTS): this table holds
 * transcripts captured AT the kiosk that need to be processed (parsed
 * into intents, dispatched to staff, logged, etc.) by a downstream
 * worker.
 *
 * Lifecycle:
 *   pending  → claimed   (worker picks it up; sets claimedBy + claimedAt)
 *   claimed  → completed (worker finished; sets result + completedAt)
 *   claimed  → failed    (worker errored; sets errorMessage; retries++)
 *
 * Notes:
 *   - userId is nullable: anonymous kiosk guests can speak too.
 *   - venueId is nullable for the same reason (a kiosk on a tradeshow
 *     floor or a public demo isn't bound to a tenant), but in practice
 *     the route stamps it from the caller's session when present.
 *   - claimedBy is the worker user_id (typically a staff/admin token);
 *     it gates complete/fail atomically.
 *   - Per-venue pending cap (200) is enforced in the route, not here.
 *
 * Index: (venueId, status, createdAt) supports the worker's poll
 *   "give me the oldest pending command for this venue".
 */

import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const VOICE_COMMAND_STATUSES = ["pending", "claimed", "completed", "failed"] as const;
export type VoiceCommandStatus = typeof VOICE_COMMAND_STATUSES[number];

export const voiceCommandsTable = pgTable(
  "voice_commands",
  {
    id:           uuid("id").primaryKey().defaultRandom(),
    userId:       uuid("user_id"),                              // null = anonymous kiosk guest
    venueId:      uuid("venue_id"),                             // null = no tenant context
    transcript:   text("transcript").notNull(),                 // ≤1000 chars (route-enforced)
    status:       text("status").notNull().default("pending").$type<VoiceCommandStatus>(),
    claimedBy:    uuid("claimed_by"),                           // worker user_id
    result:       jsonb("result"),                              // worker-supplied payload on complete
    errorMessage: text("error_message"),                        // worker-supplied on fail
    retries:      integer("retries").notNull().default(0),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
    claimedAt:    timestamp("claimed_at"),
    completedAt:  timestamp("completed_at"),
  },
  (t) => ({
    // Worker poll: "oldest pending for this venue".
    byVenueStatusCreated: index("voice_commands_venue_status_created_idx")
      .on(t.venueId, t.status, t.createdAt),
  }),
);

export type VoiceCommand = typeof voiceCommandsTable.$inferSelect;
