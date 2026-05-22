/**
 * predictiveOccupancyEngine — active occupancy tracking + departure forecasting.
 *
 * Tracks active sessions, models session duration, forecasts table turnover,
 * predicts guest departure risk, calculates venue density and wait times.
 * Persists predictions to table_turnover_predictions.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface OccupancyResult {
  activeSessions:   number;
  venueDensity:     number;
  waitTimeEstimate: number;
  forecast:         TurnoverForecast[];
}

export interface TurnoverForecast {
  table:    string;
  forecast: string;
  eta:      string;
  risk:     "HIGH" | "MEDIUM" | "LOW";
}

export async function predictOccupancy(venueId: string) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt,
            COALESCE(AVG(EXTRACT(EPOCH FROM (now()-created_at))/60),0) AS avg_duration_min
     FROM guest_tabs WHERE venue_id=$1 AND status='open'`,
    [venueId],
  ).catch(() => ({ rows: [{ cnt: 0, avg_duration_min: 0 }] }));
  return {
    activeCount:       parseInt(String(rows[0]?.cnt ?? 0), 10),
    avgDurationMin:    parseFloat(String(rows[0]?.avg_duration_min ?? 0)),
  };
}

export async function predictDepartureRisk(venueId: string): Promise<{ tabId: string; riskScore: number }[]> {
  const { rows } = await pool.query(
    `SELECT id AS tab_id,
            EXTRACT(EPOCH FROM (now()-created_at))/60 AS session_min
     FROM guest_tabs WHERE venue_id=$1 AND status='open'
     ORDER BY created_at ASC LIMIT 20`,
    [venueId],
  ).catch(() => ({ rows: [] }));

  return rows.map((r: { tab_id: string; session_min: string | number }) => {
    const mins = parseFloat(String(r.session_min ?? 0));
    const risk = Math.min(1, mins / 120);
    return { tabId: String(r.tab_id), riskScore: risk };
  });
}

export async function forecastTableTurnover(venueId: string): Promise<TurnoverForecast[]> {
  const departures = await predictDepartureRisk(venueId);
  const high       = departures.filter(d => d.riskScore > 0.7);
  const medium     = departures.filter(d => d.riskScore > 0.4 && d.riskScore <= 0.7);

  const forecasts: TurnoverForecast[] = [];

  high.slice(0, 3).forEach((_, i) => {
    forecasts.push({
      table:    `Table ${i + 1}`,
      forecast: "Extended session — departure likely within 15 minutes",
      eta:      "~10 min",
      risk:     "HIGH",
    });
  });

  medium.slice(0, 3).forEach((_, i) => {
    forecasts.push({
      table:    `Table ${i + 4}`,
      forecast: "Mid-session — may extend or depart",
      eta:      "~25 min",
      risk:     "MEDIUM",
    });
  });

  if (forecasts.length === 0) {
    forecasts.push({
      table:    "All Tables",
      forecast: "Sessions early-stage — stable occupancy",
      eta:      ">45 min",
      risk:     "LOW",
    });
  }

  const persists = forecasts.map(f =>
    pool.query(
      `INSERT INTO table_turnover_predictions (venue_id,table_ref,forecast_text,eta_minutes,risk_level)
       VALUES ($1,$2,$3,$4,$5)`,
      [venueId, f.table, f.forecast, parseInt(f.eta.replace(/\D/g, ""), 10) || 30, f.risk],
    ).catch(err => logger.warn({ err }, "Turnover prediction persist failed")),
  );
  await Promise.all(persists);

  return forecasts;
}

export async function calculateVenueDensity(venueId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COALESCE(COUNT(*),0) AS open_tabs FROM guest_tabs WHERE venue_id=$1 AND status='open'`,
    [venueId],
  ).catch(() => ({ rows: [{ open_tabs: 0 }] }));
  const open    = parseInt(String(rows[0]?.open_tabs ?? 0), 10);
  return Math.min(1, open / 40);
}

export async function computeOccupancy(venueId: string): Promise<OccupancyResult> {
  const [occ, forecast, density] = await Promise.all([
    predictOccupancy(venueId),
    forecastTableTurnover(venueId),
    calculateVenueDensity(venueId),
  ]);

  const waitTime = density > 0.85 ? Math.round(density * 20) : 0;

  return {
    activeSessions:   occ.activeCount,
    venueDensity:     density,
    waitTimeEstimate: waitTime,
    forecast,
  };
}
