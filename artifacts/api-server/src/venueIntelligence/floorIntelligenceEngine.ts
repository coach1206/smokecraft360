/**
 * floorIntelligenceEngine — floor-level operational intelligence.
 *
 * Combines occupancy density, order velocity, and attention alerts to
 * produce floor load scores and prioritized service signals.
 * Persists to floor_intelligence_events.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export type FloorUrgency = "HIGH" | "MED" | "LOW";

export interface FloorSignal {
  table:   string;
  signal:  string;
  urgency: FloorUrgency;
}

export interface FloorIntelligenceResult {
  load:    number;
  signals: FloorSignal[];
}

export async function computeFloorIntelligence(venueId: string): Promise<FloorIntelligenceResult> {
  const [tabRow, orderRow, invRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS open_tabs FROM guest_tabs WHERE venue_id=$1 AND status='open'`,
      [venueId],
    ).catch(() => ({ rows: [{ open_tabs: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM orders WHERE venue_id=$1 AND created_at > now()-interval'10 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(
      `SELECT COALESCE(AVG(CASE WHEN quantity<3 THEN 1.0 ELSE 0.0 END),0) AS pct
       FROM products WHERE venue_id=$1`,
      [venueId],
    ).catch(() => ({ rows: [{ pct: 0.3 }] })),
  ]);

  const openTabs  = parseInt(String(tabRow.rows[0]?.open_tabs  ?? 0), 10);
  const orders    = parseInt(String(orderRow.rows[0]?.cnt      ?? 0), 10);
  const invStress = parseFloat(String(invRow.rows[0]?.pct       ?? 0.3));

  const load = Math.min(1, (openTabs / 40) * 0.5 + (orders / 25) * 0.3 + invStress * 0.2);

  const signals: FloorSignal[] = [];
  if (openTabs > 30)   signals.push({ table: "Main Floor",  signal: "High occupancy — floor coverage priority",         urgency: "HIGH" });
  if (orders > 15)     signals.push({ table: "Bar Area",    signal: "Order surge — bartender load elevated",            urgency: "HIGH" });
  if (invStress > 0.6) signals.push({ table: "Humidor Bar", signal: "Stock pressure — inform guests of limited items",  urgency: "MED"  });
  if (load > 0.70)     signals.push({ table: "All Zones",   signal: "High floor load — consider opening reserve section", urgency: "MED" });
  if (signals.length === 0)
    signals.push({ table: "All Tables", signal: "Service levels nominal — no action required", urgency: "LOW" });

  await pool.query(
    `INSERT INTO floor_intelligence_events (venue_id, floor_load, open_tabs, order_velocity, inventory_stress)
     VALUES ($1,$2,$3,$4,$5)`,
    [venueId, load, openTabs, orders, invStress],
  ).catch(err => logger.warn({ err, venueId }, "Floor intelligence persist failed"));

  return { load, signals };
}
