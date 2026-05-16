/**
 * behavioralGraph — tracks behavioral relationships between guests,
 * sessions, products, and social groups.
 */

import { RelationshipGraph } from "./relationshipGraph";
import { logger }            from "../lib/logger";
import { pool }              from "@workspace/db";

export const behavioralGraph = new RelationshipGraph("behavioral");

export function recordGuestOrder(
  guestId:   string,
  productId: string,
  sessionId: string,
  strength   = 0.7,
): void {
  behavioralGraph.upsertNode(guestId,   "guest",   `guest:${guestId.slice(0, 8)}`);
  behavioralGraph.upsertNode(productId, "product", `product:${productId.slice(0, 8)}`);
  behavioralGraph.upsertNode(sessionId, "session", `session:${sessionId.slice(0, 8)}`);

  behavioralGraph.addEdge(guestId,   productId, "ordered",       strength);
  behavioralGraph.addEdge(guestId,   sessionId, "participated_in", 1.0);
  behavioralGraph.addEdge(sessionId, productId, "included",      strength);
}

export function recordSocialPairing(
  guestId1: string,
  guestId2: string,
  strength  = 0.6,
): void {
  behavioralGraph.upsertNode(guestId1, "guest", `guest:${guestId1.slice(0, 8)}`);
  behavioralGraph.upsertNode(guestId2, "guest", `guest:${guestId2.slice(0, 8)}`);
  behavioralGraph.addEdge(guestId1, guestId2, "co_session", strength);
  behavioralGraph.addEdge(guestId2, guestId1, "co_session", strength);
}

export function findSimilarGuests(
  guestId: string,
  limit    = 5,
): Array<{ guestId: string; similarity: number }> {
  const guestOrders  = behavioralGraph.neighbors(guestId, "ordered").map(n => n.id);
  const candidates   = new Map<string, number>();

  for (const productId of guestOrders) {
    const coOrderers = behavioralGraph.incomingNeighbors(productId, "ordered");
    for (const other of coOrderers) {
      if (other.id === guestId) continue;
      candidates.set(other.id, (candidates.get(other.id) ?? 0) + 1);
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ guestId: id, similarity: Math.min(1, count / Math.max(1, guestOrders.length)) }));
}

export async function loadFromDB(venueId: string): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT gs.id::text AS session_id, gs.user_id::text AS guest_id
       FROM craft_sessions gs
       WHERE gs.venue_id = $1 LIMIT 2000`,
      [venueId],
    );
    for (const r of rows) {
      if (r.guest_id) {
        behavioralGraph.upsertNode(r.guest_id, "guest",   `guest:${r.guest_id.slice(0, 8)}`);
        behavioralGraph.upsertNode(r.session_id, "session", `session:${r.session_id.slice(0, 8)}`);
        behavioralGraph.addEdge(r.guest_id, r.session_id, "participated_in", 1.0);
      }
    }
    logger.info({ venueId, ...behavioralGraph.stats() }, "behavioralGraph: loaded from DB");
  } catch (err) {
    logger.warn({ err }, "behavioralGraph: DB load failed (non-fatal)");
  }
}
