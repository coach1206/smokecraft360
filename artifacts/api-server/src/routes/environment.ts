/**
 * /api/environment — Environmental Reaction Engine state store.
 *
 * In-memory venue-level environment state with override/reset capabilities.
 * Persisted across requests; reset on server restart.
 * Role-gated: reads are public, writes require manager+.
 */

import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                  from "../middleware/roles.js";

export const environmentRouter = Router();

// ── In-memory sensor state (temperature, humidity, HVAC, AQ) ─────────────────

interface SensorState {
  temperature:     number;
  humidity:        number;
  humidorTemp:     number;
  humidorHumidity: number;
  airQuality:      "Good" | "Fair" | "Poor";
  co2Ppm:          number;
  lighting:        number;   // 0–100
  scent:           number;   // 0–100
  musicMode:       string;
  scentMode:       string;
  lastUpdated:     string;
}

const DEFAULT_SENSOR: SensorState = {
  temperature:     70,
  humidity:        52,
  humidorTemp:     68,
  humidorHumidity: 70,
  airQuality:      "Good",
  co2Ppm:          420,
  lighting:        65,
  scent:           40,
  musicMode:       "Smooth Jazz",
  scentMode:       "Leather & Oak",
  lastUpdated:     new Date().toISOString(),
};

const PRESET_MAP: Record<string, Partial<SensorState>> = {
  "Warm Lounge":      { lighting: 60, scent: 40, musicMode: "Smooth Jazz",    temperature: 70 },
  "VIP Experience":   { lighting: 45, scent: 65, musicMode: "Neo-Soul",        temperature: 69 },
  "Ceremony Mode":    { lighting: 80, scent: 30, musicMode: "Classical",       temperature: 71 },
  "Late Night":       { lighting: 35, scent: 55, musicMode: "Ambient Lounge",  temperature: 68 },
  "Service Mode":     { lighting: 90, scent: 20, musicMode: "Upbeat Jazz",     temperature: 72 },
};

const sensorStore: Map<string, SensorState> = new Map();

function getSensor(venueId: string): SensorState {
  return sensorStore.get(venueId) ?? { ...DEFAULT_SENSOR };
}

function setSensor(venueId: string, patch: Partial<SensorState>): SensorState {
  const current = getSensor(venueId);
  const updated  = { ...current, ...patch, lastUpdated: new Date().toISOString() };
  sensorStore.set(venueId, updated);
  return updated;
}

// ── In-memory override state ───────────────────────────────────────────────────

type EnergyState =
  | "quiet_reserve" | "social_warmth" | "elevated_lounge" | "peak_energy"
  | "vip_session"   | "late_night_reserve" | "event_atmosphere" | "mentor_session";

type EventAtmosphere =
  | "none" | "reserve_pairing" | "whiskey_smoke" | "vip_lounge" | "brew_social" | "founder_circle";

type MentorPersonality = "bold" | "smooth" | "balanced";

interface EnvironmentOverride {
  energyState:       EnergyState;
  eventAtmosphere:   EventAtmosphere;
  mentorPersonality: MentorPersonality;
  automationEnabled: boolean;
  overrideActive:    boolean;
  intensityOverride: number | null;   // 0–100, null = use auto
  warmthOverride:    number | null;   // 0–100, null = use auto
  particlesOverride: number | null;   // 0–100, null = use auto
  motionOverride:    number | null;   // 0–100, null = use auto
  updatedAt:         string;
  updatedBy:         string | null;
}

const DEFAULT_STATE: EnvironmentOverride = {
  energyState:       "social_warmth",
  eventAtmosphere:   "none",
  mentorPersonality: "balanced",
  automationEnabled: true,
  overrideActive:    false,
  intensityOverride: null,
  warmthOverride:    null,
  particlesOverride: null,
  motionOverride:    null,
  updatedAt:         new Date().toISOString(),
  updatedBy:         null,
};

// Per-venue store (key = venueId or "global")
const store: Map<string, EnvironmentOverride> = new Map([
  ["global", { ...DEFAULT_STATE }],
]);

function getState(venueId: string): EnvironmentOverride {
  return store.get(venueId) ?? store.get("global") ?? { ...DEFAULT_STATE };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  energyState:       z.enum(["quiet_reserve","social_warmth","elevated_lounge","peak_energy","vip_session","late_night_reserve","event_atmosphere","mentor_session"]).optional(),
  eventAtmosphere:   z.enum(["none","reserve_pairing","whiskey_smoke","vip_lounge","brew_social","founder_circle"]).optional(),
  mentorPersonality: z.enum(["bold","smooth","balanced"]).optional(),
  automationEnabled: z.boolean().optional(),
  overrideActive:    z.boolean().optional(),
  intensityOverride: z.number().min(0).max(100).nullable().optional(),
  warmthOverride:    z.number().min(0).max(100).nullable().optional(),
  particlesOverride: z.number().min(0).max(100).nullable().optional(),
  motionOverride:    z.number().min(0).max(100).nullable().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/environment/state
environmentRouter.get(
  "/state",
  (req: AuthRequest, res: Response) => {
    const venueId = String(req.query["venueId"] ?? "global");
    res.json({ state: getState(venueId), venueId });
  },
);

// POST /api/environment/state
environmentRouter.post(
  "/state",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }
    const venueId = String(req.body.venueId ?? "global");
    const current = getState(venueId);
    const updated: EnvironmentOverride = {
      ...current,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email ?? null,
    };
    store.set(venueId, updated);
    res.json({ state: updated, venueId });
  },
);

// POST /api/environment/vip-arrival
environmentRouter.post(
  "/vip-arrival",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const venueId = String(req.body.venueId ?? "global");
    const current = getState(venueId);
    const updated: EnvironmentOverride = {
      ...current,
      energyState:   "vip_session",
      overrideActive: true,
      updatedAt:     new Date().toISOString(),
      updatedBy:     req.user?.email ?? null,
    };
    store.set(venueId, updated);

    // Auto-revert to social_warmth after 5 minutes
    setTimeout(() => {
      const cur = store.get(venueId);
      if (cur && cur.energyState === "vip_session") {
        store.set(venueId, { ...cur, energyState: "social_warmth", updatedAt: new Date().toISOString() });
      }
    }, 5 * 60 * 1000);

    res.json({ state: updated, venueId, message: "VIP arrival triggered — energy state elevated for 5 minutes" });
  },
);

// POST /api/environment/reset
environmentRouter.post(
  "/reset",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const venueId = String(req.body.venueId ?? "global");
    const reset: EnvironmentOverride = {
      ...DEFAULT_STATE,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email ?? null,
    };
    store.set(venueId, reset);
    res.json({ state: reset, venueId, message: "Environment reset to defaults" });
  },
);

// GET /api/environment/analytics — static must stay BEFORE /:venueId
environmentRouter.get(
  "/analytics",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      energyStateDistribution: {
        quiet_reserve:      12,
        social_warmth:      38,
        elevated_lounge:    24,
        peak_energy:        8,
        vip_session:        6,
        late_night_reserve: 7,
        event_atmosphere:   3,
        mentor_session:     2,
      },
      avgLingerMinutes: {
        quiet_reserve:      22,
        social_warmth:      31,
        elevated_lounge:    28,
        peak_energy:        18,
        vip_session:        44,
        late_night_reserve: 38,
        event_atmosphere:   25,
        mentor_session:     35,
      },
      eventAtmosphereRoi: {
        reserve_pairing:    { engagementLift: "+34%", avgOrderValue: "$48" },
        whiskey_smoke:      { engagementLift: "+41%", avgOrderValue: "$62" },
        vip_lounge:         { engagementLift: "+58%", avgOrderValue: "$91" },
        brew_social:        { engagementLift: "+22%", avgOrderValue: "$29" },
        founder_circle:     { engagementLift: "+67%", avgOrderValue: "$118" },
      },
      vipArrivalResponses: 14,
      automationUptime:    "98.2%",
    });
  },
);

// ── Venue-scoped sensor routes ────────────────────────────────────────────────
// All static-prefix routes (/state, /vip-arrival, /reset, /analytics) are
// registered above; these parameterised routes come last so Express matches
// static segments first.

const sensorPatchSchema = z.object({
  lighting:  z.number().min(0).max(100).optional(),
  scent:     z.number().min(0).max(100).optional(),
  musicMode: z.string().max(80).optional(),
  scentMode: z.string().max(80).optional(),
  temperature:     z.number().optional(),
  humidity:        z.number().optional(),
  humidorTemp:     z.number().optional(),
  humidorHumidity: z.number().optional(),
  co2Ppm:          z.number().optional(),
  airQuality:      z.enum(["Good", "Fair", "Poor"]).optional(),
});

const presetSchema = z.object({
  preset: z.string().min(1).max(80),
});

// GET /api/environment/:venueId/history — 24-h sparkline (before /:venueId)
environmentRouter.get(
  "/:venueId/history",
  (req: AuthRequest, res: Response) => {
    const { venueId } = req.params as { venueId: string };
    const base = getSensor(venueId).temperature;
    const now  = Date.now();
    const history = Array.from({ length: 7 }, (_, i) => ({
      timestamp:   new Date(now - (6 - i) * 4 * 60 * 60 * 1000).toISOString(),
      temperature: Math.round((base + (Math.random() * 4 - 2)) * 10) / 10,
      humidity:    Math.round((getSensor(venueId).humidity + (Math.random() * 6 - 3)) * 10) / 10,
    }));
    res.json({ history, venueId });
  },
);

// POST /api/environment/:venueId/preset — apply a lounge preset
environmentRouter.post(
  "/:venueId/preset",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const { venueId } = req.params as { venueId: string };
    const parsed = presetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }
    const presetData = PRESET_MAP[parsed.data.preset] ?? {};
    const updated = setSensor(venueId, presetData);
    res.json({ ...updated, venueId, preset: parsed.data.preset });
  },
);

// GET /api/environment/:venueId — current sensor state (no auth; read-only)
environmentRouter.get(
  "/:venueId",
  (req: AuthRequest, res: Response) => {
    const { venueId } = req.params as { venueId: string };
    const sensor = getSensor(venueId);
    res.json({ ...sensor, venueId });
  },
);

// PATCH /api/environment/:venueId — update lighting / scent / music controls
environmentRouter.patch(
  "/:venueId",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const { venueId } = req.params as { venueId: string };
    const parsed = sensorPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }
    const updated = setSensor(venueId, parsed.data);
    res.json({ ...updated, venueId });
  },
);
