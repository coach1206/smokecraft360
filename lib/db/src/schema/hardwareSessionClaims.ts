/**
 * hardware_session_claims — biometric / contactless session handoff records.
 *
 * When a guest initiates a session via NFC tap, biometric touch, or secure QR,
 * a claim row is created that binds the physical device to a guest identity for
 * the duration of that session. On logout (or TTL expiry), the volatile flag
 * triggers a data-wipe confirmation via the DELETE route.
 *
 * handoff_protocol   NFC | BIOMETRIC_TOUCH | SECURE_QR
 * is_volatile        TRUE  = wipe guest data from device on session end
 *                    FALSE = allow cached profile (trusted staff terminals only)
 *
 * device_id          FK → hardware_fleet.device_id
 * guest_identity_id  Soft FK → guest_identity_evolution.identity_id
 *                    (left as UUID rather than a Drizzle reference so the claim
 *                    table can survive guest identity resets without cascade)
 *
 * claim_id is caller-supplied (deterministic per handoff event so duplicate
 * scans are idempotent via ON CONFLICT DO NOTHING).
 */

import {
  pgTable, uuid, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hardwareFleetTable } from "./hardwareFleet";

export const HANDOFF_PROTOCOLS = ["NFC", "BIOMETRIC_TOUCH", "SECURE_QR"] as const;
export type HandoffProtocol    = typeof HANDOFF_PROTOCOLS[number];

export const hardwareSessionClaimsTable = pgTable(
  "hardware_session_claims",
  {
    claimId:         uuid("claim_id").primaryKey(),           // caller-supplied for idempotency
    deviceId:        uuid("device_id")
      .notNull()
      .references(() => hardwareFleetTable.deviceId, { onDelete: "cascade" }),
    guestIdentityId: uuid("guest_identity_id"),               // soft FK → guest_identity_evolution
    handoffProtocol: text("handoff_protocol")
      .notNull()
      .$type<HandoffProtocol>(),
    sessionStart:    timestamp("session_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sessionEnd:      timestamp("session_end",   { withTimezone: true }), // null = active
    isVolatile:      boolean("is_volatile").notNull().default(true),
    wipedAt:         timestamp("wiped_at",      { withTimezone: true }), // set on DELETE
    createdAt:       timestamp("created_at",    { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    deviceIdx:   index("hsc_device_idx").on(t.deviceId),
    guestIdx:    index("hsc_guest_idx").on(t.guestIdentityId),
    activeIdx:   index("hsc_active_idx").on(t.deviceId, t.sessionEnd),
  }),
);

export const insertHardwareSessionClaimSchema = createInsertSchema(
  hardwareSessionClaimsTable,
).omit({ createdAt: true, wipedAt: true });

export type InsertHardwareSessionClaim = z.infer<typeof insertHardwareSessionClaimSchema>;
export type HardwareSessionClaim       = typeof hardwareSessionClaimsTable.$inferSelect;
