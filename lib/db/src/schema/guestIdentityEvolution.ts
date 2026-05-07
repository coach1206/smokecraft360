/**
 * guest_identity_evolution — living palate-behavior profile for each enrolled guest.
 *
 * Distinct from guest_profiles (static enrollment data). This table evolves on every
 * session: the exploration index rises when a guest tries new categories, the luxury
 * threshold score climbs as conversion signals accumulate, and the social cluster label
 * shifts when group-vs-solo patterns become statistically significant.
 *
 * identity_id is a 1:1 FK to guest_profiles.id — use upsert semantics on write.
 *
 * pacingPreference   "Leisurely" | "Aggressive" — derived from dwell-time and swipe cadence
 * explorationIndex   0.0–1.0 — risk tolerance for new/unfamiliar flavors
 * luxuryThresholdScore  0–100 — point at which the guest converts to Premium tier
 * socialBehaviorCluster "Solo-Focused" | "Group-Influence" | "Peer-Parallel" | "Observer"
 */

import { pgTable, uuid, text, real, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const PACING_PREFERENCES  = ["Leisurely", "Aggressive"] as const;
export const SOCIAL_CLUSTERS      = ["Solo-Focused", "Group-Influence", "Peer-Parallel", "Observer"] as const;

export type PacingPreference  = typeof PACING_PREFERENCES[number];
export type SocialCluster     = typeof SOCIAL_CLUSTERS[number];

export const guestIdentityEvolutionTable = pgTable(
  "guest_identity_evolution",
  {
    identityId:            uuid("identity_id").primaryKey().defaultRandom(),
    pacingPreference:      text("pacing_preference").$type<PacingPreference>(),
    explorationIndex:      real("exploration_index"),
    luxuryThresholdScore:  integer("luxury_threshold_score"),
    socialBehaviorCluster: text("social_behavior_cluster").$type<SocialCluster>(),
    lastEvolvedAt:         timestamp("last_evolved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lastEvolvedIdx: index("gie_last_evolved_idx").on(t.lastEvolvedAt),
    pacingIdx:      index("gie_pacing_idx").on(t.pacingPreference),
    clusterIdx:     index("gie_cluster_idx").on(t.socialBehaviorCluster),
  }),
);

export const insertGuestIdentityEvolutionSchema = createInsertSchema(
  guestIdentityEvolutionTable,
).omit({ lastEvolvedAt: true });

export type InsertGuestIdentityEvolution = z.infer<typeof insertGuestIdentityEvolutionSchema>;
export type GuestIdentityEvolution       = typeof guestIdentityEvolutionTable.$inferSelect;
