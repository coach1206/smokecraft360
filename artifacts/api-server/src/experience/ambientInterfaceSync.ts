/**
 * ambientInterfaceSync — synchronizes venue ambient state to the
 * frontend UI layer in real time.
 *
 * Listens to ambient pgPubSub channel and emits structured UI sync
 * payloads so every connected client reflects the physical venue state.
 */

import { pgPubSub }    from "../realtime/pgPubSub";
import { logger }      from "../lib/logger";
import { pool }        from "@workspace/db";

export interface AmbientUIState {
  venueId:      string;
  sceneName:    string;
  moodScore:    number;
  atmosphere:   number;
  accentColor:  string;
  glowIntensity: number;
  particleDensity: number;
  fontWeight:   "light" | "regular" | "bold";
  backgroundVariant: "cream" | "obsidian" | "parchment" | "graphite";
  ts:           number;
}

const SCENE_UI_MAP: Record<string, Partial<AmbientUIState>> = {
  "PREMIUM LOUNGE": { accentColor: "#D48B00", glowIntensity: 0.9, particleDensity: 0.7, fontWeight: "bold",    backgroundVariant: "parchment" },
  "SOCIAL LOUNGE":  { accentColor: "#6B8DD6", glowIntensity: 0.6, particleDensity: 0.5, fontWeight: "regular", backgroundVariant: "cream" },
  "ENERGIZE":       { accentColor: "#22C55E", glowIntensity: 0.8, particleDensity: 0.9, fontWeight: "bold",    backgroundVariant: "obsidian" },
  "INTIMATE":       { accentColor: "#8B5CF6", glowIntensity: 0.4, particleDensity: 0.2, fontWeight: "light",   backgroundVariant: "obsidian" },
  "STANDARD":       { accentColor: "#6B5E4E", glowIntensity: 0.3, particleDensity: 0.3, fontWeight: "regular", backgroundVariant: "cream" },
};

function buildAmbientState(
  venueId:   string,
  sceneName: string,
  moodScore  = 0.5,
  atmosphere = 0.5,
): AmbientUIState {
  const sceneUI = SCENE_UI_MAP[sceneName] ?? SCENE_UI_MAP["STANDARD"];
  return {
    venueId, sceneName, moodScore, atmosphere,
    accentColor:       sceneUI.accentColor      ?? "#6B5E4E",
    glowIntensity:     sceneUI.glowIntensity     ?? 0.3,
    particleDensity:   sceneUI.particleDensity   ?? 0.3,
    fontWeight:        sceneUI.fontWeight        ?? "regular",
    backgroundVariant: sceneUI.backgroundVariant ?? "cream",
    ts: Date.now(),
  };
}

const latestStates = new Map<string, AmbientUIState>();

export function getLatestAmbientState(venueId: string): AmbientUIState | null {
  return latestStates.get(venueId) ?? null;
}

export function startAmbientInterfaceSync(): void {
  pgPubSub.subscribe("ambient", async (payload) => {
    const venueId   = String(payload.venueId ?? "");
    const sceneName = String(payload.sceneName ?? payload.sceneId ?? "STANDARD");
    if (!venueId) return;

    const state = buildAmbientState(
      venueId, sceneName,
      typeof payload.moodScore === "number" ? payload.moodScore : 0.5,
      typeof payload.atmosphereScore === "number" ? payload.atmosphereScore : 0.5,
    );

    latestStates.set(venueId, state);

    // Publish to intelligence channel for frontend consumption
    await pgPubSub.publish("intelligence", {
      event: "AMBIENT_UI_SYNC",
      venueId,
      state,
    }).catch(err => logger.warn({ err }, "ambientInterfaceSync: publish failed"));
  });

  // Also poll DB periodically for any missed events
  setInterval(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT ON (venue_id) venue_id::text AS venue_id,
                scene_name, mood_before AS mood, atmosphere_before AS atmosphere
         FROM ambient_scene_history
         ORDER BY venue_id, created_at DESC
         LIMIT 50`,
      );
      for (const r of rows) {
        const existing = latestStates.get(r.venue_id);
        if (!existing) {
          latestStates.set(r.venue_id, buildAmbientState(r.venue_id, r.scene_name, r.mood, r.atmosphere));
        }
      }
    } catch { /* non-fatal */ }
  }, 5 * 60 * 1000); // every 5 min

  logger.info("ambientInterfaceSync: subscribed and polling");
}
