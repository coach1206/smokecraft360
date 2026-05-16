/**
 * venueTwin — live virtual model of each venue.
 *
 * Maintains a real-time digital twin that mirrors active guests, sessions,
 * devices, environmental state, and orchestration status.
 * Publishes twin updates to the `twin` pgPubSub channel.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";
import type { OperationalContext } from "../context/contextEngine";

type CtxWithOrchestratio = OperationalContext & { orchestrationActive?: boolean };

export interface TwinState {
  venueId:             string;
  version:             number;
  guestMap:            Record<string, GuestTwinEntry>;
  deviceMap:           Record<string, DeviceTwinEntry>;
  inventorySnapshot:   Record<string, number>;
  trafficHeatmap:      number[][];
  engagementZones:     Record<string, number>;
  environmentalState:  EnvironmentalTwinState;
  orchestrationStatus: OrchestrationTwinStatus;
  syncHealth:          number;
  lastUpdatedAt:       number;
}

interface GuestTwinEntry {
  guestId:    string;
  isVip:      boolean;
  craft:      string;
  engagement: number;
  zone:       string;
  sessionMs:  number;
}

interface DeviceTwinEntry {
  deviceId: string;
  type:     string;
  status:   "active" | "idle" | "offline";
  zone:     string;
}

interface EnvironmentalTwinState {
  sceneId:    string | null;
  moodScore:  number;
  atmosphere: number;
  lighting:   number;
  sound:      number;
}

interface OrchestrationTwinStatus {
  active:      boolean;
  lastDecision:string | null;
  rulesFired:  number;
  guardActive: boolean;
}

// In-memory twin cache (persisted async)
const twinCache = new Map<string, TwinState>();

function getOrCreateTwin(venueId: string): TwinState {
  if (!twinCache.has(venueId)) {
    twinCache.set(venueId, {
      venueId,
      version:            1,
      guestMap:           {},
      deviceMap:          {},
      inventorySnapshot:  {},
      trafficHeatmap:     Array.from({ length: 5 }, () => new Array(5).fill(0) as number[]),
      engagementZones:    {},
      environmentalState: { sceneId: null, moodScore: 0.5, atmosphere: 0.5, lighting: 0.6, sound: 0.45 },
      orchestrationStatus:{ active: true, lastDecision: null, rulesFired: 0, guardActive: false },
      syncHealth:         1.0,
      lastUpdatedAt:      Date.now(),
    });
  }
  return twinCache.get(venueId)!;
}

export async function syncTwinFromContext(ctx: CtxWithOrchestratio): Promise<TwinState> {
  const twin = getOrCreateTwin(ctx.venueId);

  // Update environmental state
  twin.environmentalState = {
    sceneId:   ctx.ambientScene,
    moodScore: ctx.moodScore,
    atmosphere:ctx.atmosphereScore,
    lighting:  0.6, // derived from ambientOrchestrator in future
    sound:     0.45,
  };

  // Update orchestration status
  twin.orchestrationStatus.active    = ctx.orchestrationActive ?? true;
  twin.orchestrationStatus.guardActive = ctx.anomalyDetected;

  // Update traffic heatmap (simplified: use engagement as intensity)
  const intensity = ctx.engagementLevel;
  twin.trafficHeatmap = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => {
      const centrality = 1 - (Math.abs(2 - row) + Math.abs(2 - col)) / 4;
      return Math.min(1, intensity * centrality + Math.random() * 0.1);
    }),
  );

  twin.version++;
  twin.lastUpdatedAt = Date.now();
  twin.syncHealth = 1.0;

  // Persist async
  await persistTwin(twin);

  // Publish twin update
  await pgPubSub.publish("twin", {
    event:              "TWIN_UPDATED",
    venueId:            twin.venueId,
    version:            twin.version,
    environmentalState: twin.environmentalState,
    trafficHeatmap:     twin.trafficHeatmap,
    orchestrationStatus:twin.orchestrationStatus,
    syncHealth:         twin.syncHealth,
    lastUpdatedAt:      twin.lastUpdatedAt,
  });

  return twin;
}

export async function updateGuestInTwin(
  venueId:   string,
  guestId:   string,
  entry:     Partial<GuestTwinEntry>,
  remove?:   boolean,
): Promise<void> {
  const twin = getOrCreateTwin(venueId);
  if (remove) {
    delete twin.guestMap[guestId];
  } else {
    twin.guestMap[guestId] = {
      ...{
        guestId,
        isVip:      false,
        craft:      "smoke",
        engagement: 0.5,
        zone:       "main",
        sessionMs:  0,
      },
      ...twin.guestMap[guestId],
      ...entry,
    };
  }
  twin.version++;
  twin.lastUpdatedAt = Date.now();
  await persistTwin(twin);
  await pgPubSub.publish("twin", {
    event:    "GUEST_MAP_UPDATED",
    venueId,
    guestId,
    entry:    remove ? null : twin.guestMap[guestId],
    guestCount: Object.keys(twin.guestMap).length,
  });
}

export async function getTwinState(venueId: string): Promise<TwinState> {
  // Try cache first
  if (twinCache.has(venueId)) return twinCache.get(venueId)!;
  // Try DB
  try {
    const { rows } = await pool.query(
      `SELECT guest_map, device_map, inventory_snapshot, traffic_heatmap,
              engagement_zones, environmental_state, orchestration_status,
              sync_health, model_version, updated_at
       FROM venue_digital_twins WHERE venue_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    );
    if (rows[0]) {
      const r = rows[0] as Record<string, unknown>;
      const twin: TwinState = {
        venueId,
        version:             (r["model_version"] as number) ?? 1,
        guestMap:            (r["guest_map"] as Record<string, GuestTwinEntry>) ?? {},
        deviceMap:           (r["device_map"] as Record<string, DeviceTwinEntry>) ?? {},
        inventorySnapshot:   (r["inventory_snapshot"] as Record<string, number>) ?? {},
        trafficHeatmap:      (r["traffic_heatmap"] as number[][]) ?? [],
        engagementZones:     (r["engagement_zones"] as Record<string, number>) ?? {},
        environmentalState:  (r["environmental_state"] as EnvironmentalTwinState) ?? { sceneId: null, moodScore: 0.5, atmosphere: 0.5, lighting: 0.6, sound: 0.45 },
        orchestrationStatus: (r["orchestration_status"] as OrchestrationTwinStatus) ?? { active: true, lastDecision: null, rulesFired: 0, guardActive: false },
        syncHealth:          (r["sync_health"] as number) ?? 1.0,
        lastUpdatedAt:       Date.now(),
      };
      twinCache.set(venueId, twin);
      return twin;
    }
  } catch { /* fall through */ }
  return getOrCreateTwin(venueId);
}

async function persistTwin(twin: TwinState): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO venue_digital_twins
         (venue_id, model_version, guest_map, device_map, inventory_snapshot,
          traffic_heatmap, engagement_zones, environmental_state, orchestration_status, sync_health)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (venue_id) DO UPDATE SET
         model_version        = EXCLUDED.model_version,
         guest_map            = EXCLUDED.guest_map,
         device_map           = EXCLUDED.device_map,
         inventory_snapshot   = EXCLUDED.inventory_snapshot,
         traffic_heatmap      = EXCLUDED.traffic_heatmap,
         engagement_zones     = EXCLUDED.engagement_zones,
         environmental_state  = EXCLUDED.environmental_state,
         orchestration_status = EXCLUDED.orchestration_status,
         sync_health          = EXCLUDED.sync_health,
         updated_at           = NOW()`,
      [
        twin.venueId, twin.version,
        JSON.stringify(twin.guestMap),
        JSON.stringify(twin.deviceMap),
        JSON.stringify(twin.inventorySnapshot),
        JSON.stringify(twin.trafficHeatmap),
        JSON.stringify(twin.engagementZones),
        JSON.stringify(twin.environmentalState),
        JSON.stringify(twin.orchestrationStatus),
        twin.syncHealth,
      ],
    );
  } catch { /* non-critical */ }
}

