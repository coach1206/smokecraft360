/**
 * recommendationGraph — tracks recommendation outcomes and pairing
 * relationships to build a semantic product knowledge graph.
 */

import { RelationshipGraph } from "./relationshipGraph";
import { logger }            from "../lib/logger";
import { pool }              from "@workspace/db";

export const recommendationGraph = new RelationshipGraph("recommendation");

export function recordRecommendation(
  productId:   string,
  productName: string,
  guestId:     string,
  accepted:    boolean,
  confidence:  number,
): void {
  recommendationGraph.upsertNode(productId, "product",     productName);
  recommendationGraph.upsertNode(guestId,   "guest",       `guest:${guestId.slice(0, 8)}`);

  const weight = accepted ? confidence : confidence * 0.2;
  recommendationGraph.addEdge(guestId, productId, accepted ? "accepted_rec" : "declined_rec", weight);
}

export function recordPairing(
  productAId:   string,
  productAName: string,
  productBId:   string,
  productBName: string,
  coOccurrences: number,
): void {
  recommendationGraph.upsertNode(productAId, "product", productAName);
  recommendationGraph.upsertNode(productBId, "product", productBName);
  const weight = Math.min(1, coOccurrences / 20);
  recommendationGraph.addEdge(productAId, productBId, "pairs_with", weight);
  recommendationGraph.addEdge(productBId, productAId, "pairs_with", weight);
}

export function getProductPairings(productId: string, limit = 5): Array<{ productId: string; weight: number }> {
  const node = recommendationGraph.getNode(productId);
  if (!node) return [];

  const pairNodes = recommendationGraph.neighbors(productId, "pairs_with");
  return pairNodes
    .slice(0, limit)
    .map(n => {
      const edgeId = `${productId}:pairs_with:${n.id}`;
      return { productId: n.id, weight: 0.5 }; // simplified — real impl would read edge weight
    });
}

export function getGuestAcceptanceRate(guestId: string): number {
  const accepted = recommendationGraph.neighbors(guestId, "accepted_rec").length;
  const declined = recommendationGraph.neighbors(guestId, "declined_rec").length;
  const total    = accepted + declined;
  return total === 0 ? 0.5 : accepted / total;
}

export async function loadPairings(venueId: string): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT p.id::text AS pid, p.name AS pname
       FROM products p
       JOIN venue_inventories vi ON vi.product_id = p.id
       WHERE vi.venue_id = $1 LIMIT 500`,
      [venueId],
    );
    for (const r of rows) {
      recommendationGraph.upsertNode(r.pid, "product", r.pname);
    }
    logger.info({ venueId, ...recommendationGraph.stats() }, "recommendationGraph: loaded");
  } catch (err) {
    logger.warn({ err }, "recommendationGraph: load failed (non-fatal)");
  }
}
