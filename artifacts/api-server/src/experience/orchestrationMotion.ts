/**
 * orchestrationMotion — translates orchestration events into motion
 * directives for the frontend animation layer.
 */

import { pgPubSub } from "../realtime/pgPubSub";
import { logger }   from "../lib/logger";

export type MotionEvent =
  | "rule_fired"      | "scene_change"  | "alert_raised"
  | "guest_arrived"   | "vip_detected"  | "staff_dispatch"
  | "revenue_spike"   | "mood_shift"    | "social_bloom";

export interface MotionDirective {
  event:      MotionEvent;
  venueId:    string;
  target:     "global" | "panel" | "card" | "badge";
  animation:  string;
  durationMs: number;
  color?:     string;
  intensity:  number; // 0–1
  ts:         number;
}

const MOTION_MAP: Record<MotionEvent, Omit<MotionDirective, "event" | "venueId" | "ts">> = {
  rule_fired:   { target: "panel",  animation: "pulse",        durationMs: 400,  intensity: 0.4 },
  scene_change: { target: "global", animation: "ambient_sweep",durationMs: 1200, intensity: 0.7 },
  alert_raised: { target: "badge",  animation: "flash",        durationMs: 200,  color: "#EF4444", intensity: 1.0 },
  guest_arrived:{ target: "card",   animation: "slide_in",     durationMs: 500,  intensity: 0.5 },
  vip_detected: { target: "global", animation: "gold_glow",    durationMs: 800,  color: "#D48B00", intensity: 0.9 },
  staff_dispatch:{ target:"badge",  animation: "ping",         durationMs: 300,  intensity: 0.6 },
  revenue_spike:{ target: "panel",  animation: "rise",         durationMs: 600,  color: "#22C55E", intensity: 0.75 },
  mood_shift:   { target: "global", animation: "breathe",      durationMs: 2000, intensity: 0.5 },
  social_bloom: { target: "global", animation: "bloom",        durationMs: 800,  color: "#8B5CF6", intensity: 0.65 },
};

export function buildMotionDirective(
  event:   MotionEvent,
  venueId: string,
  overrides?: Partial<MotionDirective>,
): MotionDirective {
  const base = MOTION_MAP[event];
  return { event, venueId, ts: Date.now(), ...base, ...overrides };
}

export async function emitMotion(
  event:    MotionEvent,
  venueId:  string,
  overrides?: Partial<MotionDirective>,
): Promise<void> {
  const directive = buildMotionDirective(event, venueId, overrides);
  await pgPubSub.publish("intelligence", {
    event:     "MOTION_DIRECTIVE",
    venueId,
    directive,
  }).catch(err => logger.warn({ err, event }, "orchestrationMotion: publish failed"));
}

/** Hook into orchestration events and auto-translate to motion. */
export function startOrchestrationMotion(): void {
  pgPubSub.subscribe("orchestration", async (payload) => {
    const venueId = String(payload.venueId ?? "");
    if (!venueId) return;

    const evtMap: Record<string, MotionEvent> = {
      RULE_FIRED:       "rule_fired",
      SCENE_CHANGE:     "scene_change",
      ALERT_RAISED:     "alert_raised",
      VIP_DETECTED:     "vip_detected",
      STAFF_DISPATCHED: "staff_dispatch",
    };

    const motionEvt = evtMap[String(payload.event ?? "")];
    if (motionEvt) await emitMotion(motionEvt, venueId);
  });
  logger.info("orchestrationMotion: subscribed to orchestration channel");
}
