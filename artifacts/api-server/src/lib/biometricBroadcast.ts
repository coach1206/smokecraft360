/**
 * Biometric SSE broadcaster — Titan V Live Pulse Sync
 * Holds the set of open SSE response streams and fans out biometric_update events.
 */

import type { Response } from "express";

const clients = new Set<Response>();

export function addBiometricClient(res: Response): void {
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function broadcastBiometricUpdate(payload: Record<string, unknown>): void {
  if (clients.size === 0) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(line);
    } catch {
      clients.delete(client);
    }
  }
}

export function getBiometricClientCount(): number {
  return clients.size;
}
