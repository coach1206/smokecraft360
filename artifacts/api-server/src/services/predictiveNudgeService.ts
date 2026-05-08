/**
 * PredictiveNudgeService — Phase 5: Behavioral Orchestration.
 *
 * Executes nudges derived from IntentProbabilityEngine predictions.
 * Nudges are INVISIBLE to the guest — they shape the environment
 * subtly before friction or boredom manifests.
 *
 * Nudge types:
 *   lighting      → trigger EnvironmentalModeEngine mode change
 *   recommendation → push curated recommendation via Socket.io
 *   staff_alert    → emit staff floor alert
 *   acoustic       → emit acoustic profile change
 *   none           → no action required
 */

import { getIO }  from "../lib/socketServer";
import { logger } from "../lib/logger";
import { EnvironmentalModeEngine, type EnvironmentMode } from "./environmentalModeEngine";
import { SpatialAcousticEngine } from "./haptics/SpatialAcousticEngine";
import type { IntentPrediction } from "./intentProbabilityEngine";

export interface NudgeResult {
  executed:    boolean;
  nudgeType:   string;
  action:      string;
  delayMs:     number;
}

export class PredictiveNudgeService {

  /**
   * Execute a nudge based on an intent prediction.
   * Nudges are fired with a slight delay to feel natural, not mechanical.
   */
  static async execute(
    prediction: IntentPrediction,
    context: {
      venueId?:  string;
      guestId?:  string;
      sessionId?: string;
    },
  ): Promise<NudgeResult> {

    if (prediction.nudgeType === "none" || prediction.confidence < 55) {
      return { executed: false, nudgeType: "none", action: "Below confidence threshold", delayMs: 0 };
    }

    const delayMs = Math.min(prediction.timeToEventMs * 0.3, 20000);
    const io      = getIO();

    setTimeout(async () => {
      try {
        switch (prediction.nudgeType) {

          case "lighting": {
            const mode = (prediction.nudgePayload["mode"] as EnvironmentMode | undefined) ?? "lounge";
            if (context.venueId) {
              await EnvironmentalModeEngine.activateMode(context.venueId, mode, "predictive_nudge", 1800);
            }
            break;
          }

          case "recommendation": {
            const target = context.guestId ? `guest:${context.guestId}` : undefined;
            const payload = {
              nudgeType:  "recommendation",
              prediction: { signal: prediction.signal, confidence: prediction.confidence },
              strategy:   prediction.nudgePayload["strategy"],
              craftType:  prediction.nudgePayload["craftType"],
              trigger:    prediction.nudgePayload["trigger"],
              ts:         new Date().toISOString(),
            };
            if (target) io.to(target).emit("intent:recommendation_nudge", payload);
            else if (context.venueId) io.to(`venue:${context.venueId}`).emit("intent:recommendation_nudge", payload);
            break;
          }

          case "staff_alert": {
            if (context.venueId) {
              io.to(`venue:${context.venueId}`).emit("intent:staff_alert", {
                signal:    prediction.signal,
                guestId:   context.guestId,
                sessionId: context.sessionId,
                reason:    prediction.nudgePayload["reason"],
                action:    prediction.recommendedAction,
                ts:        new Date().toISOString(),
              });
            }
            break;
          }

          case "acoustic": {
            const profile = (prediction.nudgePayload["acousticProfile"] as string | undefined) ?? "heartbeat";
            await SpatialAcousticEngine.emit(
              profile as Parameters<typeof SpatialAcousticEngine.emit>[0],
              { venueId: context.venueId, intensity: "whisper", durationMs: 6000, fadeMs: 1500 },
            );
            break;
          }
        }

        logger.info({ nudgeType: prediction.nudgeType, signal: prediction.signal, delayMs }, "nudge executed");
      } catch (err) {
        logger.warn({ err, nudgeType: prediction.nudgeType }, "nudge execution failed");
      }
    }, delayMs);

    return {
      executed:  true,
      nudgeType: prediction.nudgeType,
      action:    prediction.recommendedAction,
      delayMs,
    };
  }
}
