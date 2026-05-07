/**
 * /api/iot — IoT Sensor Integration Layer
 *
 * POST /humidor            — receive sensor telemetry from Smart Humidors
 * GET  /humidor/:venueId   — latest reading + atmosphere pulse for the venue
 * GET  /atmosphere/:venueId — Atmosphere Pulse summary (UI "breathing" feed)
 *
 * Compensatory Pairing Nudge:
 *   When temperature or humidity deviates from Gold Standard, the route
 *   emits a Socket.IO event ("iot:compensatory_pairing") to the venue room
 *   with a pre-built pairing suggestion for staff to surface to the guest.
 */

import { Router, type Request, type Response } from "express";
import { eq, desc }                             from "drizzle-orm";
import { db, iotHumidorReadingsTable, HUMIDOR_GOLD_STANDARD } from "@workspace/db";
import { z }                                    from "zod";
import { getIO }                                from "../lib/socketServer";

const router = Router();

// ── Compensatory pairing library ─────────────────────────────────────────────

const TEMP_HIGH_PAIRINGS = [
  "A chilled Highball with Japanese whisky cuts through heat-stressed tobacco notes",
  "Cold brew espresso tonic resets the palate when smoke is running warm",
  "Sparkling mineral water + citrus: neutralizes temperature distortion on the draw",
];
const TEMP_LOW_PAIRINGS  = [
  "Neat bourbon at room temperature warms the palate for underperforming cold-draw wrappers",
  "Rich aged rum complements a cold-conditioned leaf's muted sweetness",
  "Dark chocolate pairing opens compressed tobacco aromatics",
];
const HUMID_HIGH_PAIRINGS = [
  "Dry aged cheese cuts through over-humidified tobacco bloom",
  "Lightly peated Scotch provides contrast to a moisture-forward smoke profile",
];
const HUMID_LOW_PAIRINGS  = [
  "A full-bodied Maduro pairs forgivingly when a wrapper has lost humidity",
  "Honey and salted nut board rehydrates the palate against a dry-draw cigar",
];

function buildCompensatoryNudge(
  tempC: number | null,
  humPct: number | null,
): { note: string; pairing: string } | null {
  const gs = HUMIDOR_GOLD_STANDARD;
  if (tempC !== null && tempC > gs.tempMaxC) {
    return { note: `Temperature ${tempC.toFixed(1)}°C exceeds Gold Standard (max ${gs.tempMaxC}°C). Compensatory pairing recommended.`, pairing: TEMP_HIGH_PAIRINGS[Math.floor(Math.random() * TEMP_HIGH_PAIRINGS.length)]! };
  }
  if (tempC !== null && tempC < gs.tempMinC) {
    return { note: `Temperature ${tempC.toFixed(1)}°C below Gold Standard (min ${gs.tempMinC}°C). Compensatory pairing recommended.`, pairing: TEMP_LOW_PAIRINGS[Math.floor(Math.random() * TEMP_LOW_PAIRINGS.length)]! };
  }
  if (humPct !== null && humPct > gs.humMaxPct) {
    return { note: `Humidity ${humPct.toFixed(1)}% exceeds Gold Standard (max ${gs.humMaxPct}%). Compensatory pairing recommended.`, pairing: HUMID_HIGH_PAIRINGS[Math.floor(Math.random() * HUMID_HIGH_PAIRINGS.length)]! };
  }
  if (humPct !== null && humPct < gs.humMinPct) {
    return { note: `Humidity ${humPct.toFixed(1)}% below Gold Standard (min ${gs.humMinPct}%). Compensatory pairing recommended.`, pairing: HUMID_LOW_PAIRINGS[Math.floor(Math.random() * HUMID_LOW_PAIRINGS.length)]! };
  }
  return null;
}

// ── POST /humidor ─────────────────────────────────────────────────────────────

const HumidorPayloadSchema = z.object({
  venueId:            z.string().uuid(),
  sensorId:           z.string().min(1),
  temperatureCelsius: z.number().optional(),
  humidityPct:        z.number().optional(),
});

router.post("/humidor", async (req: Request, res: Response) => {
  const parsed = HumidorPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { venueId, sensorId, temperatureCelsius, humidityPct } = parsed.data;
  const nudge = buildCompensatoryNudge(temperatureCelsius ?? null, humidityPct ?? null);
  const isDeviant = nudge !== null;

  const [row] = await db
    .insert(iotHumidorReadingsTable)
    .values({
      venueId,
      sensorId,
      temperatureCelsius: temperatureCelsius ?? null,
      humidityPct:        humidityPct        ?? null,
      isDeviant,
      deviationNote: nudge?.note ?? null,
      nudgeSent:     false,
      rawPayload:    JSON.stringify(req.body),
    })
    .returning({ id: iotHumidorReadingsTable.id });

  if (isDeviant && nudge) {
    try {
      const io = getIO();
      io.to(`venue:${venueId}`).emit("iot:compensatory_pairing", {
        venueId,
        sensorId,
        deviationNote: nudge.note,
        pairing:       nudge.pairing,
        timestamp:     new Date().toISOString(),
      });
      await db
        .update(iotHumidorReadingsTable)
        .set({ nudgeSent: true })
        .where(eq(iotHumidorReadingsTable.id, row!.id));
    } catch { /* Socket.IO may not be available in all envs */ }
  }

  res.json({ ok: true, id: row!.id, isDeviant, nudge: nudge ?? null });
});

// ── GET /humidor/:venueId ─────────────────────────────────────────────────────

router.get("/humidor/:venueId", async (req: Request, res: Response) => {
  const venueId = req.params["venueId"] as string;
  const rows = await db
    .select()
    .from(iotHumidorReadingsTable)
    .where(eq(iotHumidorReadingsTable.venueId, venueId))
    .orderBy(desc(iotHumidorReadingsTable.recordedAt))
    .limit(20);

  const latest = rows[0] ?? null;
  const gs = HUMIDOR_GOLD_STANDARD;
  const vitality = latest
    ? (() => {
        const tempOk = latest.temperatureCelsius !== null
          ? latest.temperatureCelsius >= gs.tempMinC && latest.temperatureCelsius <= gs.tempMaxC
          : true;
        const humOk  = latest.humidityPct !== null
          ? latest.humidityPct >= gs.humMinPct && latest.humidityPct <= gs.humMaxPct
          : true;
        return tempOk && humOk ? "OPTIMAL" : "DEVIANT";
      })()
    : "UNKNOWN";

  res.json({ latest, history: rows, vitality, goldStandard: gs });
});

// ── GET /atmosphere/:venueId ──────────────────────────────────────────────────

router.get("/atmosphere/:venueId", async (req: Request, res: Response) => {
  const venueId = req.params["venueId"] as string;
  const latest  = await db
    .select()
    .from(iotHumidorReadingsTable)
    .where(eq(iotHumidorReadingsTable.venueId, venueId))
    .orderBy(desc(iotHumidorReadingsTable.recordedAt))
    .limit(1);

  const r   = latest[0] ?? null;
  const gs  = HUMIDOR_GOLD_STANDARD;
  const tempScore = r?.temperatureCelsius !== null && r?.temperatureCelsius !== undefined
    ? Math.max(0, 100 - Math.abs(r.temperatureCelsius - ((gs.tempMinC + gs.tempMaxC) / 2)) * 10)
    : null;
  const humScore  = r?.humidityPct !== null && r?.humidityPct !== undefined
    ? Math.max(0, 100 - Math.abs(r.humidityPct - ((gs.humMinPct + gs.humMaxPct) / 2)) * 3)
    : null;
  const overallVitality = tempScore !== null && humScore !== null
    ? Math.round((tempScore + humScore) / 2)
    : null;

  res.json({
    venueId,
    temperatureCelsius: r?.temperatureCelsius ?? null,
    humidityPct:        r?.humidityPct        ?? null,
    vitality:           overallVitality,
    isDeviant:          r?.isDeviant          ?? false,
    deviationNote:      r?.deviationNote      ?? null,
    lastUpdated:        r?.recordedAt         ?? null,
    goldStandard:       gs,
  });
});

export default router;
