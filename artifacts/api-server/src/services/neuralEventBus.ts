/**
 * NeuralEventBus — The Ghost in the Machine.
 *
 * Redis Pub/Sub compatible event bus using Node.js EventEmitter.
 * Swap-in: replace EventEmitter with ioredis client.createClient() —
 * the publish/subscribe API is identical.
 *
 * Topics:
 *   travel.flight_update        — Aviationstack telemetry received
 *   travel.mood_shift           — MoodShiftEngine derived a guest mood
 *   venue.mode_changed          — EnvironmentalModeEngine activated a mode
 *   venue.energy_changed        — VenueEnergyEngine classified a new energy state
 *   intent.prediction           — IntentProbabilityEngine fired a signal
 *   intent.nudge_executed       — PredictiveNudgeService fired a nudge
 *   operational.affiliate_event — AffiliateService recorded a transaction
 *   operational.autonomy_event  — OperationalAutonomyEngine completed an analysis cycle
 *   hardware.mqtt_dispatch      — MqttBridgeService queued a hardware command
 *   foundation.blackbox_write   — BlackBoxRecovery wrote a venue soul snapshot
 *   sensory.audio_trigger       — SensoryEngine emitted a craft sound signal
 *   hospitality.prediction      — PredictiveHospitalityEngine scored a session
 *   cluster.health_event        — VenueClusterManager detected a health transition
 *   pos.sync_complete           — UnifiedPOSBridge completed a POS inventory sync
 *
 * All events carry: { topic, payload, ts, venueId? }
 */

import { EventEmitter } from "events";
import { logger }       from "../lib/logger";

export type BusTopic =
  | "travel.flight_update"
  | "travel.mood_shift"
  | "venue.mode_changed"
  | "venue.energy_changed"
  | "intent.prediction"
  | "intent.nudge_executed"
  | "operational.affiliate_event"
  | "operational.autonomy_event"
  | "hardware.mqtt_dispatch"
  | "foundation.blackbox_write"
  | "sensory.audio_trigger"
  | "hospitality.prediction"
  | "cluster.health_event"
  | "pos.sync_complete"
  | "pos.inventory_synced"
  | "pos.order.confirmed"
  | "pos.order.failed"
  | "pos.webhook.order_complete"
  | "pos.connected"
  | "pos.token.refreshed"
  | "pos.token.refresh_failed"
  | "pos.health.offline"
  | "pos.inventory.drift_detected"
  | "loyalty.award_trigger"
  | "xp.award_trigger"
  | "ambient.order_complete";

export interface BusEvent<T = unknown> {
  topic:    BusTopic;
  payload:  T;
  ts:       string;
  venueId?: string;
}

type BusHandler<T = unknown> = (event: BusEvent<T>) => void | Promise<void>;

class NeuralEventBusImpl {
  private readonly emitter = new EventEmitter();
  private readonly history  = new Map<BusTopic, BusEvent[]>();
  private readonly MAX_HISTORY = 50;

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publish<T = unknown>(topic: BusTopic, payload: T, venueId?: string): void {
    const event: BusEvent<T> = { topic, payload, ts: new Date().toISOString(), venueId };

    const hist = this.history.get(topic) ?? [];
    hist.push(event as BusEvent);
    if (hist.length > this.MAX_HISTORY) hist.shift();
    this.history.set(topic, hist);

    this.emitter.emit(topic, event);
    logger.info({ topic, venueId }, "bus event published");
  }

  subscribe<T = unknown>(topic: BusTopic, handler: BusHandler<T>): () => void {
    const wrapped = (event: BusEvent<T>) => {
      Promise.resolve(handler(event)).catch(err => {
        logger.warn({ err, topic }, "bus handler error");
      });
    };
    this.emitter.on(topic, wrapped);
    return () => this.emitter.off(topic, wrapped);
  }

  /** One-time subscription — auto-unsubscribes after first event. */
  once<T = unknown>(topic: BusTopic, handler: BusHandler<T>): void {
    this.emitter.once(topic, (event: BusEvent<T>) => {
      Promise.resolve(handler(event)).catch(err => {
        logger.warn({ err, topic }, "bus once-handler error");
      });
    });
  }

  recentHistory(topic: BusTopic, limit = 10): BusEvent[] {
    return (this.history.get(topic) ?? []).slice(-limit);
  }

  topics(): BusTopic[] {
    return [...this.history.keys()];
  }
}

export const NeuralEventBus = new NeuralEventBusImpl();
