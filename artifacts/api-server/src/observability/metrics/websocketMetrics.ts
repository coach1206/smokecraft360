/**
 * websocketMetrics — Socket.IO connection and event delivery metrics.
 */

import { observe, increment, setGauge, adjustGauge } from "../../platform/observability/metricsCollector";

const roomCounts = new Map<string, number>();

export function recordWsConnect(venueId: string, room: string): void {
  increment("websocket.connections", "total", 1);
  adjustGauge("websocket", "active_connections", 1, { venueId });
  const key = `${venueId}:${room}`;
  roomCounts.set(key, (roomCounts.get(key) ?? 0) + 1);
  setGauge("websocket.rooms", "size", roomCounts.get(key) ?? 0, { venueId, room });
}

export function recordWsDisconnect(venueId: string, room: string, sessionMs: number): void {
  adjustGauge("websocket", "active_connections", -1, { venueId });
  observe("websocket.sessions", "duration_ms", sessionMs, { venueId });
  const key = `${venueId}:${room}`;
  roomCounts.set(key, Math.max(0, (roomCounts.get(key) ?? 1) - 1));
  setGauge("websocket.rooms", "size", roomCounts.get(key) ?? 0, { venueId, room });
}

export function recordWsBroadcast(eventName: string, room: string, recipientCount: number, ms: number): void {
  observe("websocket.broadcast", "latency_ms", ms, { event: eventName, room });
  observe("websocket.broadcast", "recipients", recipientCount, { event: eventName });
  increment("websocket.broadcast", "count", 1, { event: eventName });
  if (recipientCount === 0) increment("websocket.broadcast", "empty_rooms", 1, { event: eventName });
}

export function recordWsError(eventName: string, errorType: string): void {
  increment("websocket.errors", "count", 1, { event: eventName, type: errorType });
}

export function getRoomSize(venueId: string, room: string): number {
  return roomCounts.get(`${venueId}:${room}`) ?? 0;
}
