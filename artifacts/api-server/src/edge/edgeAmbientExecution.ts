/**
 * edgeAmbientExecution — executes ambient scene changes locally
 * without cloud round-trips. Ensures venues remain atmospherically
 * consistent even during connectivity loss.
 */

import { logger }           from "../lib/logger";
import { edgeQueue }        from "./edgeQueue";
import { edgeCoordinator }  from "./edgeCoordinator";
import { pool }             from "@workspace/db";

export type AmbientScene =
  | "PREMIUM LOUNGE" | "SOCIAL LOUNGE" | "ENERGIZE" | "INTIMATE" | "STANDARD";

interface SceneSchedule {
  scene:       AmbientScene;
  triggerHour: number;
  days:        number[]; // 0=Sun, 6=Sat
}

const DEFAULT_SCHEDULE: SceneSchedule[] = [
  { scene: "STANDARD",       triggerHour: 10, days: [0,1,2,3,4,5,6] },
  { scene: "SOCIAL LOUNGE",  triggerHour: 17, days: [0,1,2,3,4,5,6] },
  { scene: "PREMIUM LOUNGE", triggerHour: 19, days: [4,5,6] },
  { scene: "INTIMATE",       triggerHour: 22, days: [4,5,6] },
  { scene: "ENERGIZE",       triggerHour: 21, days: [1,2,3] },
];

const venueScenes  = new Map<string, AmbientScene>();
const venueSchedule = new Map<string, SceneSchedule[]>();

export function getCurrentScene(venueId: string): AmbientScene {
  return venueScenes.get(venueId) ?? "STANDARD";
}

export function setSchedule(venueId: string, schedule: SceneSchedule[]): void {
  venueSchedule.set(venueId, schedule);
}

export async function executeSceneChange(venueId: string, scene: AmbientScene): Promise<void> {
  venueScenes.set(venueId, scene);

  // Queue for cloud sync when reconnected
  edgeQueue.enqueue(venueId, "ambient_scene_change", { scene, ts: Date.now() }, "high");

  // Try to write to DB if connected
  await pool.query(
    `INSERT INTO ambient_scene_history
       (venue_id, scene_id, scene_name, trigger_source, mood_before, atmosphere_before, created_at)
     VALUES ($1, gen_random_uuid(), $2, 'edge', 0, 0, NOW())`,
    [venueId, scene],
  ).catch(() => {/* offline — queued for replay */});

  logger.info({ venueId, scene }, "edgeAmbientExecution: scene changed");
}

export function deriveSceneFromTime(venueId: string): AmbientScene {
  const now    = new Date();
  const hour   = now.getHours();
  const day    = now.getDay();
  const sched  = venueSchedule.get(venueId) ?? DEFAULT_SCHEDULE;

  // Find latest applicable trigger
  const candidates = sched.filter(s => s.days.includes(day) && s.triggerHour <= hour);
  candidates.sort((a, b) => b.triggerHour - a.triggerHour);
  return candidates[0]?.scene ?? "STANDARD";
}

let edgeAmbientTimer: ReturnType<typeof setInterval> | null = null;

export function startEdgeAmbientExecution(): void {
  edgeCoordinator.register({
    name:       "edgeAmbient",
    onOffline:  async (venueId) => {
      // Activate time-based schedule locally
      const scene = deriveSceneFromTime(venueId);
      await executeSceneChange(venueId, scene);
    },
    onDegraded: async () => { /* continue with current scene */ },
    onRecover:  async () => { /* cloud will reconcile */ },
  });

  // Hourly scene recalculation for offline venues
  if (!edgeAmbientTimer) {
    edgeAmbientTimer = setInterval(async () => {
      for (const status of edgeCoordinator.getAllStatuses()) {
        if (status.mode === "offline") {
          const scene = deriveSceneFromTime(status.venueId);
          if (scene !== getCurrentScene(status.venueId)) {
            await executeSceneChange(status.venueId, scene);
          }
        }
      }
    }, 60 * 60 * 1000);
  }

  logger.info("edgeAmbientExecution: started");
}
