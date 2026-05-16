/**
 * localFailover — detects cloud disconnection and activates local
 * service mode. Coordinates the full transition sequence.
 */

import { logger }          from "../lib/logger";
import { edgeCoordinator } from "./edgeCoordinator";
import { initOfflineInference, isInferenceReady } from "./offlineInference";
import { offlineVenueMode } from "./offlineVenueMode";

export type FailoverState = "cloud" | "activating" | "local" | "recovering" | "recovered";

const venueStates = new Map<string, FailoverState>();

export function getFailoverState(venueId: string): FailoverState {
  return venueStates.get(venueId) ?? "cloud";
}

export function isLocalMode(venueId: string): boolean {
  const s = venueStates.get(venueId);
  return s === "local" || s === "activating";
}

async function activateLocal(venueId: string): Promise<void> {
  if (venueStates.get(venueId) === "activating" || venueStates.get(venueId) === "local") return;
  venueStates.set(venueId, "activating");
  logger.warn({ venueId }, "localFailover: activating local mode");

  if (!isInferenceReady()) initOfflineInference();
  await offlineVenueMode.activate(venueId);

  venueStates.set(venueId, "local");
  edgeCoordinator.setInferenceReady(venueId, true);
  logger.info({ venueId }, "localFailover: local mode active");
}

async function recoverFromLocal(venueId: string): Promise<void> {
  if (!isLocalMode(venueId)) return;
  venueStates.set(venueId, "recovering");
  logger.info({ venueId }, "localFailover: recovering to cloud");

  await offlineVenueMode.deactivate(venueId);

  venueStates.set(venueId, "recovered");
  setTimeout(() => {
    if (venueStates.get(venueId) === "recovered") venueStates.set(venueId, "cloud");
  }, 5_000);
  logger.info({ venueId }, "localFailover: cloud recovery complete");
}

export function startLocalFailover(): void {
  edgeCoordinator.register({
    name:       "localFailover",
    onOffline:  (venueId) => activateLocal(venueId),
    onDegraded: async (venueId) => {
      if (!isLocalMode(venueId)) {
        logger.info({ venueId }, "localFailover: degraded — pre-warming local inference");
        if (!isInferenceReady()) initOfflineInference();
      }
    },
    onRecover:  (venueId) => recoverFromLocal(venueId),
  });
  logger.info("localFailover: registered with edgeCoordinator");
}
