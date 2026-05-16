/**
 * socialEngagementEngine — group dynamics and social momentum tracking.
 *
 * Detects cluster types (solo/pair/group/party), measures shared-order
 * velocity, viral-moment scores, and conversation energy. Writes to
 * social_engagement_state and publishes to the "social" channel.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface SocialCluster {
  groupId:         string;
  groupSize:       number;
  clusterType:     "solo" | "pair" | "group" | "party";
  socialEnergy:    number;
  conversationRate:number;
  sharedOrders:    number;
  viralMoment:     number;
  dominantCraft:   string | null;
}

export async function detectSocialClusters(venueId: string): Promise<SocialCluster[]> {
  try {
    // Derive clusters from recent swipe order sessions
    const { rows } = await pool.query(
      `SELECT
         s.id                                            AS group_id,
         GREATEST(COUNT(oi.id), 1)                       AS group_size,
         COUNT(oi.id)                                    AS shared_orders,
         MAX(s.updated_at)                               AS last_activity
       FROM swipe_orders s
       LEFT JOIN swipe_order_items oi ON oi.order_id = s.id
       WHERE s.venue_id = $1
         AND s.status NOT IN ('cancelled','expired')
         AND s.created_at > NOW() - INTERVAL '90 minutes'
       GROUP BY s.id
       HAVING MAX(s.updated_at) > NOW() - INTERVAL '30 minutes'
       LIMIT 50`,
      [venueId],
    );

    return rows.map((r: { group_id: string; group_size: number; shared_orders: number }) => {
      const sz   = Math.max(1, Number(r.group_size));
      const type = sz >= 6 ? "party" : sz >= 3 ? "group" : sz === 2 ? "pair" : "solo";
      const energy = Math.min((Number(r.shared_orders) / Math.max(sz, 1)) * 0.3 + (type === "party" ? 0.5 : type === "group" ? 0.35 : type === "pair" ? 0.2 : 0.1), 1);
      return {
        groupId:         r.group_id,
        groupSize:       sz,
        clusterType:     type,
        socialEnergy:    energy,
        conversationRate:energy * 0.7 + Math.random() * 0.05,
        sharedOrders:    Number(r.shared_orders),
        viralMoment:     type === "party" ? energy * 1.2 : energy * 0.6,
        dominantCraft:   null,
      } satisfies SocialCluster;
    });
  } catch (err) {
    logger.warn({ err, venueId }, "socialEngagementEngine: cluster detection failed");
    return [];
  }
}

export async function computeSocialMomentum(venueId: string): Promise<number> {
  const clusters = await detectSocialClusters(venueId);
  if (clusters.length === 0) return 0;
  const weighted = clusters.reduce((s, c) => s + c.socialEnergy * c.groupSize, 0);
  const totalGuests = clusters.reduce((s, c) => s + c.groupSize, 0);
  return Math.min(weighted / Math.max(totalGuests, 1), 1);
}

export async function persistSocialState(venueId: string, clusters: SocialCluster[]): Promise<void> {
  for (const cluster of clusters) {
    try {
      await pool.query(
        `INSERT INTO social_engagement_state
           (venue_id, group_id, group_size, social_energy, conversation_rate,
            shared_orders, viral_moment_score, cluster_type, dominant_craft,
            engagement_arc, window_start, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'[]',NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        [
          venueId, cluster.groupId, cluster.groupSize, cluster.socialEnergy,
          cluster.conversationRate, cluster.sharedOrders, cluster.viralMoment,
          cluster.clusterType, cluster.dominantCraft,
        ],
      );
    } catch { /* non-critical */ }
  }
}

export async function runSocialEngagementCycle(venueId: string): Promise<{
  momentum:    number;
  clusterCount:number;
  partyCount:  number;
  topEnergy:   number;
}> {
  const clusters = await detectSocialClusters(venueId);
  await persistSocialState(venueId, clusters);

  const momentum  = clusters.length
    ? clusters.reduce((s, c) => s + c.socialEnergy * c.groupSize, 0) /
      Math.max(clusters.reduce((s, c) => s + c.groupSize, 0), 1)
    : 0;
  const parties   = clusters.filter(c => c.clusterType === "party").length;
  const topEnergy = clusters.length ? Math.max(...clusters.map(c => c.socialEnergy)) : 0;

  await publish("social", {
    event:        "SOCIAL_CYCLE_COMPLETE",
    venueId,
    momentum,
    clusterCount: clusters.length,
    partyCount:   parties,
    topEnergy,
  });

  return { momentum, clusterCount: clusters.length, partyCount: parties, topEnergy };
}
