/**
 * MqttBridgeService — Hardware Environmental Adapter.
 *
 * Translates EnvironmentalModeEngine decisions into MQTT-style topic
 * messages for physical hardware (DMX lighting, spatial audio, haptic floors).
 *
 * Topic convention: venue/{id}/{device}/{parameter}/{value}
 *   e.g. venue/001/lighting/warm_gold/brightness/90
 *        venue/001/audio/heartbeat/volume/60
 *        venue/001/haptic/floor/pattern/ambient
 *
 * Swap-in: replace the Socket.io emit with mqtt.publish() from the `mqtt`
 * package. The `formatTopic` / `dispatch` interface is unchanged.
 *
 * Sub-100ms guarantee: messages go directly to Socket.io (no DB round-trip).
 * Hardware adapters subscribing to the `hardware:mqtt` socket event execute
 * in firmware — the network hop is the only latency.
 */

import { getIO }           from "../lib/socketServer";
import { logger }          from "../lib/logger";
import { NeuralEventBus }  from "./neuralEventBus";
import type { ModeConfig } from "./environmentalModeEngine";

export interface MqttMessage {
  topic:     string;
  payload:   string | number | boolean;
  qos:       0 | 1 | 2;
  retain:    boolean;
  ts:        string;
}

export class MqttBridgeService {

  static formatTopic(venueId: string, device: string, ...path: string[]): string {
    return `venue/${venueId}/${device}/${path.join("/")}`;
  }

  /** Dispatch a single MQTT-style message. */
  static dispatch(venueId: string, message: Omit<MqttMessage, "ts">): MqttMessage {
    const full: MqttMessage = { ...message, ts: new Date().toISOString() };
    getIO().to(`venue:${venueId}`).emit("hardware:mqtt", full);
    NeuralEventBus.publish("hardware.mqtt_dispatch", { venueId, message: full }, venueId);
    return full;
  }

  /**
   * Translate an EnvironmentMode config into a burst of MQTT messages
   * covering lighting, audio, and haptic hardware.
   * Called by EnvironmentalModeEngine on every mode change.
   */
  static dispatchModeChange(venueId: string, config: ModeConfig): MqttMessage[] {
    const msgs: MqttMessage[] = [];
    const push = (device: string, ...path: string[]) => {
      const last = path[path.length - 1]!;
      const topic = MqttBridgeService.formatTopic(venueId, device, ...path.slice(0, -1));
      msgs.push(MqttBridgeService.dispatch(venueId, {
        topic:   `${topic}/${path[path.length - 2] ?? device}`,
        payload: last,
        qos:     1,
        retain:  true,
      }));
    };

    // Lighting
    const warmth    = Math.round(config.lightingWarmth);
    const intensity = Math.round(config.lightingIntensity);
    const colorTemp = warmth > 70 ? "warm_gold" : warmth > 45 ? "neutral_white" : "cool_blue";
    push("lighting", colorTemp, "brightness", String(intensity));
    push("lighting", "transition_ms", String(1200));

    // Audio
    push("audio", config.acousticProfile, "volume", String(Math.round(intensity * 0.7)));
    push("audio", "transition_ms", String(2000));

    // Haptic floor (if equipped)
    push("haptic", "floor", "pattern", config.hapticPattern);
    push("haptic", "floor", "intensity", String(Math.round(config.particleSpeed)));

    // Particle system (software — for PIX/LED matrix displays)
    push("display", "particles", "density", String(config.particleDensity));
    push("display", "particles", "speed", String(config.particleSpeed));
    push("display", "motion_damping", String(config.motionDamping));

    logger.info({ venueId, mode: config.mode, messages: msgs.length }, "MQTT mode burst dispatched");
    return msgs;
  }

  /** Health probe message — hardware adapter should respond with ACK. */
  static probe(venueId: string): MqttMessage {
    return MqttBridgeService.dispatch(venueId, {
      topic:   MqttBridgeService.formatTopic(venueId, "system", "probe"),
      payload: Date.now(),
      qos:     0,
      retain:  false,
    });
  }
}
