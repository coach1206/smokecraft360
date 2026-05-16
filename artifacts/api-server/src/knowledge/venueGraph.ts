/**
 * venueGraph — tracks relationships between venues, guests, staff,
 * products, and operational states across the network.
 */

import { RelationshipGraph } from "./relationshipGraph";
import { logger }            from "../lib/logger";
import { pool }              from "@workspace/db";

export const venueGraph = new RelationshipGraph("venue");

export function registerVenue(venueId: string, name: string, props: Record<string, unknown> = {}): void {
  venueGraph.upsertNode(venueId, "venue", name, props);
}

export function linkGuestToVenue(guestId: string, venueId: string, visitCount: number): void {
  venueGraph.upsertNode(guestId, "guest", `guest:${guestId.slice(0, 8)}`);
  venueGraph.upsertNode(venueId, "venue", `venue:${venueId.slice(0, 8)}`);
  const weight = Math.min(1, visitCount / 50);
  venueGraph.addEdge(guestId, venueId, "visited", weight);
}

export function linkProductToVenue(productId: string, venueId: string, orderCount: number): void {
  venueGraph.upsertNode(productId, "product", `product:${productId.slice(0, 8)}`);
  venueGraph.addEdge(venueId, productId, "stocks", Math.min(1, orderCount / 100));
}

export function findRelatedVenues(venueId: string): string[] {
  // Venues with shared guest base
  const venueGuests = venueGraph.incomingNeighbors(venueId, "visited").map(n => n.id);
  const related     = new Map<string, number>();

  for (const guestId of venueGuests) {
    const guestVenues = venueGraph.neighbors(guestId, "visited");
    for (const v of guestVenues) {
      if (v.id !== venueId) related.set(v.id, (related.get(v.id) ?? 0) + 1);
    }
  }

  return [...related.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
}

export async function loadVenueNetwork(): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT id::text AS venue_id, name FROM venues LIMIT 200`,
    );
    for (const r of rows) registerVenue(r.venue_id, r.name);
    logger.info({ venues: rows.length, ...venueGraph.stats() }, "venueGraph: loaded network");
  } catch (err) {
    logger.warn({ err }, "venueGraph: DB load failed (non-fatal)");
  }
}
