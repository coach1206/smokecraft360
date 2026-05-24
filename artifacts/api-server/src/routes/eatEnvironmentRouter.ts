import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getIO } from "../lib/socketServer";
import { pushTelemetry, trackMutation } from "../lib/eatCommandState";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & ENVIRONMENT STATE
// ══════════════════════════════════════════════════════════════════════════════

export const ZONE_PRESETS = ["RITUAL", "CEREMONY", "CASUAL", "TRANSITION"] as const;
export type ZonePreset = (typeof ZONE_PRESETS)[number];

export const RITUAL_CODES = [
  "CEDAR_FLOW_INIT",
  "CUTTER_PREP",
  "LIGHTING_AMBER",
  "SCENT_DIFFUSE",
  "MUSIC_AMBIENT_CIG",
  "TABLE_PRESENTATION",
  "HUMIDOR_OPEN",
  "CEDAR_SPILL_PREP",
] as const;
export type RitualCode = (typeof RITUAL_CODES)[number];

interface ActiveRitual {
  tableId: string;
  code: RitualCode;
  craftType: string;
  startedAt: number;
}

interface EnvironmentState {
  preset: ZonePreset;
  activeRituals: ActiveRitual[];
  sceneTemperatureCelsius: number;
  ambientVolumePercent: number;
  scentIntensityPercent: number;
  lastUpdated: number;
}

// Preset → sensor profile mapping
const PRESET_PROFILES: Record<
  ZonePreset,
  Pick<EnvironmentState, "sceneTemperatureCelsius" | "ambientVolumePercent" | "scentIntensityPercent">
> = {
  RITUAL:     { sceneTemperatureCelsius: 22, ambientVolumePercent: 25, scentIntensityPercent: 65 },
  CEREMONY:   { sceneTemperatureCelsius: 23, ambientVolumePercent: 20, scentIntensityPercent: 80 },
  CASUAL:     { sceneTemperatureCelsius: 21, ambientVolumePercent: 40, scentIntensityPercent: 15 },
  TRANSITION: { sceneTemperatureCelsius: 21, ambientVolumePercent: 30, scentIntensityPercent: 30 },
};

let envState: EnvironmentState = {
  preset: "CASUAL",
  activeRituals: [],
  ...PRESET_PROFILES.CASUAL,
  lastUpdated: Date.now(),
};

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const RitualSchema = z.object({
  tableId:     z.string().min(1),
  craftType:   z.enum(["smoke", "pour", "brew", "wine"]),
  ritualCode:  z.enum(RITUAL_CODES),
  stagingNote: z.string().max(200).optional(),
});

const BatchRitualSchema = z.object({
  rituals: z.array(RitualSchema).min(1).max(20),
});

const EnvironmentPresetSchema = z.object({
  preset: z.enum(ZONE_PRESETS),
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════

export const eatEnvironmentRouter = Router();

/**
 * GET /api/eat/environment
 * Current environment state snapshot — polled by ambient displays.
 */
eatEnvironmentRouter.get("/environment", (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true, ts: Date.now(), env: envState });
});

/**
 * POST /api/eat/environment
 * Sets global zone preset and broadcasts the new sensor profile to all nodes.
 * Hardware automation layer responds to ENV_PRESET_CHANGED immediately.
 */
eatEnvironmentRouter.post("/environment", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = EnvironmentPresetSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/eat/environment", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const { preset } = parsed.data;
  const profile = PRESET_PROFILES[preset];
  envState = { ...envState, ...profile, preset, lastUpdated: Date.now() };

  const io = getIO();
  io.emit("ENV_PRESET_CHANGED", { preset, ...profile, ts: Date.now() });

  pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: `Environment preset → ${preset}`, payload: profile });
  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: "/api/eat/environment", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, env: envState, latencyMs: Number(latencyMs.toFixed(2)) });
});

/**
 * POST /api/eat/ritual
 * Translates a single touchscreen tap into a zero-delay hardware staging command.
 * Socket.IO broadcast fires synchronously before HTTP response returns.
 * Auto-elevates zone preset from CASUAL → RITUAL when a lounge ritual begins.
 */
eatEnvironmentRouter.post("/ritual", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = RitualSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/eat/ritual", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const { tableId, craftType, ritualCode, stagingNote } = parsed.data;
  const io = getIO();

  // Zero-delay hardware dispatch — fires before anything else
  io.emit("RITUAL_HARDWARE_TRIGGER", {
    tableId,
    craftType,
    ritualCode,
    stagingNote: stagingNote ?? null,
    deviceGroup: "Lounge_Staging_Display_1",
    ts: Date.now(),
  });

  // Auto-elevate to RITUAL zone if still in default CASUAL
  if (envState.preset === "CASUAL") {
    envState = { ...envState, ...PRESET_PROFILES.RITUAL, preset: "RITUAL", lastUpdated: Date.now() };
    io.emit("ENV_PRESET_CHANGED", { preset: "RITUAL", ...PRESET_PROFILES.RITUAL, ts: Date.now() });
  }

  envState.activeRituals.push({ tableId, code: ritualCode, craftType, startedAt: Date.now() });

  pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: `Ritual dispatched: ${ritualCode} → ${tableId}`, payload: { craftType, stagingNote } });
  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: "/api/eat/ritual", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({
    ok: true,
    ritualCode,
    tableId,
    currentPreset: envState.preset,
    latencyMs: Number(latencyMs.toFixed(2)),
  });
});

/**
 * POST /api/eat/ritual/batch
 * Executes up to 20 ritual commands from a multi-tap gesture sequence in one HTTP call.
 * All Socket.IO dispatches fire synchronously before the response.
 */
eatEnvironmentRouter.post("/ritual/batch", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = BatchRitualSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/eat/ritual/batch", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const io = getIO();
  const results: { ritualCode: string; tableId: string }[] = [];

  for (const r of parsed.data.rituals) {
    io.emit("RITUAL_HARDWARE_TRIGGER", {
      tableId:    r.tableId,
      craftType:  r.craftType,
      ritualCode: r.ritualCode,
      stagingNote: r.stagingNote ?? null,
      deviceGroup: "Lounge_Staging_Display_1",
      ts: Date.now(),
    });
    envState.activeRituals.push({ tableId: r.tableId, code: r.ritualCode, craftType: r.craftType, startedAt: Date.now() });
    results.push({ ritualCode: r.ritualCode, tableId: r.tableId });
  }

  const latencyMs = performance.now() - t0;
  pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: `Batch rituals dispatched: ${results.length}`, payload: { count: results.length } });
  trackMutation({ timestamp: Date.now(), route: "/api/eat/ritual/batch", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, dispatched: results.length, results, latencyMs: Number(latencyMs.toFixed(2)) });
});

/**
 * DELETE /api/eat/ritual/:tableId
 * Clears all active rituals for a table — called on tab close or floor reset.
 */
eatEnvironmentRouter.delete("/ritual/:tableId", (req: Request, res: Response) => {
  const { tableId } = req.params;
  const before = envState.activeRituals.length;
  envState.activeRituals = envState.activeRituals.filter((r) => r.tableId !== tableId);
  const cleared = before - envState.activeRituals.length;

  pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: `Ritual context cleared: ${tableId}`, payload: { cleared } });
  return res.status(200).json({ ok: true, tableId, cleared });
});
