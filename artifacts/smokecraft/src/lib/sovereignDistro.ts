/**
 * SOVEREIGN DISTRIBUTION ENGINE — v1.0.0
 * Licensed to: 360 Enterprises Services LLC // Johnie Manuel Lee Collins
 * Purpose: Secure Manufacturer Packaging & Remote Node Activation
 *
 * API
 * ───
 * SovereignDistro.prepareBundle()    — generates manifest + calls real REST API
 * SovereignDistro.registerNewNode()  — emits NODE_PENDING_AUTHORIZATION socket event
 * SovereignDistro.authorizeNode()    — emits SOVEREIGN_WAKE_COMMAND socket event
 */

import { socket } from "./socket";
import { vibrate } from "./haptics";

// ── Root Identity Config ─────────────────────────────────────────────────────

/** Single source of truth for the sovereign operator identity. */
export const SOVEREIGN_ROOT = {
  email:          "jc@dayone360.com",        // Hardcoded master identity
  authorityLevel: "SOVEREIGN",
  entity:         "360 Enterprises Services LLC",
  owner:          "Johnie Manuel Lee Collins",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type NodeType = "MIRROR" | "TABLE" | "VEHICLE";

export interface SovereignManifest {
  owner:            string;
  entity:           string;
  batchId:          string;       // human-readable "TITAN-V-<XXXXX>"
  _internalBatchId: number;       // DB batch ID for API calls
  manufacturer:     string;
  nodeType:         NodeType;
  quantity:         number;
  timestamp:        string;
  isActivated:      boolean;
}

export interface NodeRegistrationResult {
  status: "PENDING_SOVEREIGN_AUTH" | "AUTHORIZED";
  batchId?: number;
  message?: string;
}

// ── Socket event constants ───────────────────────────────────────────────────

export const SOVEREIGN_EVENTS = {
  NODE_PENDING:     "NODE_PENDING_AUTHORIZATION",
  WAKE_COMMAND:     "SOVEREIGN_WAKE_COMMAND",
  GLOBAL_COMMAND:   "SOVEREIGN_GLOBAL_COMMAND",   // primary activation channel
  WAKE_SIGNAL:      "SOVEREIGN_WAKE",
  PENDING_UPDATE:   "NODE_PENDING_UPDATE",
  JOIN_BATCH:       "join_batch",
} as const;

// ── The Sovereign Distribution Engine ───────────────────────────────────────

export const SovereignDistro = {

  /**
   * 1. GENERATE THE MANUFACTURER BUNDLE
   * Creates a secure manifest, provisions the batch via REST API,
   * and returns the full manifest for export (ZIP / Email).
   */
  prepareBundle: async (
    manufacturerName: string,
    quantity: number,
    type: NodeType,
    contactEmail?: string,
  ): Promise<SovereignManifest> => {
    // Map NodeType → API deviceType
    const deviceType = type === "MIRROR" ? "Mirror" : type === "TABLE" ? "Table" : "Vehicle";

    const res = await fetch("/api/distribution/batches", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ manufacturerName, orderQty: quantity, deviceType, contactEmail }),
    });

    const data = await res.json() as { batchId: number; keyCount: number };

    const manifest: SovereignManifest = {
      owner:            SOVEREIGN_ROOT.owner,
      entity:           SOVEREIGN_ROOT.entity,
      batchId:          `TITAN-V-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      _internalBatchId: data.batchId,
      manufacturer:     manufacturerName,
      nodeType:         type,
      quantity,
      timestamp:        new Date().toISOString(),
      isActivated:      false, // STOPS SYSTEM FROM RUNNING UNTIL AUTHORIZED
    };

    console.info(
      `%cTITAN_V: Bundle Prepared for Export`,
      "color:#D4AF37;font-weight:bold;font-family:monospace",
      manifest,
    );
    return manifest;
  },

  /**
   * 2. THE COLD-START HANDSHAKE
   * Fired by the manufacturer's device when first turned on.
   * Emits NODE_PENDING_AUTHORIZATION to the Sovereign Brain,
   * then calls the REST registration endpoint.
   * Device enters 'Obsidian Lock' until isActivated is true.
   */
  registerNewNode: async (
    deviceId:  string,
    batchId:   string | number,
    keyValue?: string,
  ): Promise<NodeRegistrationResult> => {
    // Join the batch room so this socket receives SOVEREIGN_WAKE
    socket.emit(SOVEREIGN_EVENTS.JOIN_BATCH, { batchId });

    // Emit the pending authorization signal to the Sovereign Brain
    socket.emit(SOVEREIGN_EVENTS.NODE_PENDING, {
      deviceId,
      batchId,
      timestamp: Date.now(),
    });

    // Also call the REST handshake if a key is available
    if (keyValue) {
      try {
        const res = await fetch("/api/nodes/register", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ serialNumber: deviceId, keyValue }),
        });
        const data = await res.json() as { status: string; message?: string };
        return {
          status:  data.status === "AUTHORIZED" ? "AUTHORIZED" : "PENDING_SOVEREIGN_AUTH",
          batchId: typeof batchId === "number" ? batchId : parseInt(batchId, 10),
          message: data.message,
        };
      } catch {
        // Socket-only fallback — device still enters Obsidian Lock
      }
    }

    return { status: "PENDING_SOVEREIGN_AUTH" };
  },

  /**
   * 3. REMOTE ACTIVATION (The Sovereign Key)
   * Triggered from the Super Admin Distribution tab.
   * Fires a haptic confirmation and emits SOVEREIGN_WAKE_COMMAND
   * which the server relays to every device in the batch.
   */
  authorizeNode: (deviceId: string, batchId?: string | number): void => {
    // Haptic confirmation on admin device
    try { vibrate([80, 40, 160]); } catch { /* non-mobile fallback */ }

    // Primary channel — SOVEREIGN_GLOBAL_COMMAND (matches reference spec)
    socket.emit(SOVEREIGN_EVENTS.GLOBAL_COMMAND, {
      targetId: deviceId,
      action:   "MELT_LOCK",
      authKey:  "MASTER_AUTHORITY_360",
      batchId,
      ts:       Date.now(),
    });

    // Legacy alias — SOVEREIGN_WAKE_COMMAND (backwards compat for existing nodes)
    socket.emit(SOVEREIGN_EVENTS.WAKE_COMMAND, {
      deviceId,
      batchId,
      authKey: "MASTER_KEY_360",
      action:  "MELT_LOCK",
      ts:      Date.now(),
    });

    console.info(
      `%cTITAN_V: Node ${deviceId} SOVEREIGN_GLOBAL_COMMAND dispatched — now LIVE globally.`,
      "color:#D4AF37;font-weight:bold;font-family:monospace",
    );
  },

  /**
   * Subscribe to SOVEREIGN_WAKE on the socket.
   * Call from ActivationGate or any device-mode UI.
   */
  onWake: (handler: (payload: { action: string; ts: number }) => void): (() => void) => {
    socket.on(SOVEREIGN_EVENTS.WAKE_SIGNAL, handler);
    return () => socket.off(SOVEREIGN_EVENTS.WAKE_SIGNAL, handler);
  },

  /**
   * Subscribe to live pending-node updates (admin side).
   */
  onPendingUpdate: (handler: (payload: { deviceId: string; batchId: string | number; timestamp: number }) => void): (() => void) => {
    socket.on(SOVEREIGN_EVENTS.PENDING_UPDATE, handler);
    return () => socket.off(SOVEREIGN_EVENTS.PENDING_UPDATE, handler);
  },
};
