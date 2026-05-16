/**
 * localReplay — buffers events during offline periods and replays
 * them to the cloud in causal order on reconnect.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";
import { edgeCoordinator } from "./edgeCoordinator";

interface BufferedEvent {
  id:        string;
  venueId:   string;
  channel:   string;
  payload:   Record<string, unknown>;
  ts:        number;
  attempts:  number;
}

const MAX_BUFFER    = 5_000;
const MAX_ATTEMPTS  = 3;
const REPLAY_BATCH  = 50;

const buffer: BufferedEvent[] = [];

function generateId(): string {
  return `le-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function bufferEvent(
  venueId: string,
  channel: string,
  payload: Record<string, unknown>,
): void {
  if (buffer.length >= MAX_BUFFER) {
    buffer.shift(); // drop oldest
    logger.warn({ venueId }, "localReplay: buffer full — dropped oldest event");
  }
  buffer.push({ id: generateId(), venueId, channel, payload, ts: Date.now(), attempts: 0 });
}

export function getBufferDepth(venueId?: string): number {
  return venueId ? buffer.filter(e => e.venueId === venueId).length : buffer.length;
}

export async function replayToCloud(venueId: string): Promise<{ replayed: number; failed: number }> {
  const pending = buffer.filter(e => e.venueId === venueId).slice(0, REPLAY_BATCH);
  if (pending.length === 0) return { replayed: 0, failed: 0 };

  let replayed = 0;
  let failed   = 0;

  for (const evt of pending) {
    try {
      await pool.query(
        `SELECT pg_notify($1, $2)`,
        [evt.channel, JSON.stringify({ ...evt.payload, _replayed: true, _originalTs: evt.ts })],
      );
      const idx = buffer.indexOf(evt);
      if (idx !== -1) buffer.splice(idx, 1);
      replayed++;
    } catch (err) {
      evt.attempts++;
      if (evt.attempts >= MAX_ATTEMPTS) {
        const idx = buffer.indexOf(evt);
        if (idx !== -1) buffer.splice(idx, 1);
        logger.warn({ venueId, eventId: evt.id }, "localReplay: max attempts — event dropped");
        failed++;
      }
    }
  }

  logger.info({ venueId, replayed, failed }, "localReplay: replay batch complete");
  return { replayed, failed };
}

export function purgeVenueBuffer(venueId: string): number {
  const before = buffer.length;
  const indices: number[] = [];
  buffer.forEach((e, i) => { if (e.venueId === venueId) indices.push(i); });
  for (const i of indices.reverse()) buffer.splice(i, 1);
  return before - buffer.length;
}

export function startLocalReplay(): void {
  edgeCoordinator.register({
    name: "localReplay",
    onOffline:  async () => { /* start buffering — handled per publish call */ },
    onDegraded: async () => { /* buffer in degraded mode too */ },
    onRecover:  async (venueId) => {
      const result = await replayToCloud(venueId);
      edgeCoordinator.setQueueDepth(venueId, getBufferDepth(venueId));
      logger.info({ venueId, ...result }, "localReplay: post-recovery replay done");
    },
  });
  logger.info("localReplay: started");
}
