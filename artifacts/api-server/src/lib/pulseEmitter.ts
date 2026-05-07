/**
 * pulseEmitter — singleton EventEmitter for Server-Sent Events (SSE) delivery
 * to connected staff dashboard clients.
 *
 * Any part of the server can call `emitPulse(event, data)` to broadcast
 * to all listening SSE connections without tight coupling to the route layer.
 */

import { EventEmitter } from "events";

export interface PulsePayload {
  type:                string;   // e.g. "BOH_PULSE", "SALE_CONFIRMED", "FLOOR_UPDATE"
  table:               string;
  guestName:           string;
  guestLevel:          string;
  draftProfile?:       string;
  topMatch?:           string;
  masteryBoost?:       number;
  recommendation?:     string;
  sagesRecommendation?: string;
  timestamp:           string;
  [key: string]: unknown;
}

class PulseEmitter extends EventEmitter {
  emitPulseEvent(data: PulsePayload): void {
    super.emit("pulse", data);
  }

  onPulse(listener: (data: PulsePayload) => void): this {
    return super.on("pulse", listener);
  }

  offPulse(listener: (data: PulsePayload) => void): this {
    return super.off("pulse", listener);
  }
}

const pulseEmitter = new PulseEmitter();
pulseEmitter.setMaxListeners(200); // support up to 200 concurrent SSE clients

export function emitPulse(data: PulsePayload): void {
  pulseEmitter.emitPulseEvent(data);
}

export default pulseEmitter;
