/**
 * TOUCH LOCK STORE
 * Maintains an in-memory set of locked touch keys, driven by two sources:
 *   1. Local optimistic lock  — fires instantly on tap (no server round-trip)
 *   2. Socket.IO TOUCH_LOCK / TOUCH_UNLOCK events — server-authoritative sync
 *
 * Each lock is auto-released after TTL_BUFFER_MS (850ms) if no TOUCH_UNLOCK
 * frame arrives, keeping UI from freezing if the connection drops.
 */

import { create } from "zustand";
import { io, type Socket } from "socket.io-client";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const TTL_BUFFER_MS = 850; // 750ms server debounce window + 100ms network buffer

export function buildTouchKey(tableId: string, itemId: string): string {
  return `${tableId}::${itemId}`;
}

interface TouchLockStore {
  lockedKeys: Set<string>;
  connected: boolean;
  _socket: Socket | null;
  _timers: Map<string, ReturnType<typeof setTimeout>>;

  connect: () => void;
  disconnect: () => void;

  /** Optimistic lock — call immediately on user tap before sending API request. */
  acquireLock: (tableId: string, itemId: string) => void;
  /** Release a lock — called on TOUCH_UNLOCK or local TTL expiry. */
  releaseLock: (tableId: string, itemId: string) => void;
  /** Returns true while a (tableId, itemId) pair is locked. */
  isLocked: (tableId: string, itemId: string) => boolean;
}

export const useTouchLockStore = create<TouchLockStore>((set, get) => ({
  lockedKeys: new Set(),
  connected: false,
  _socket: null,
  _timers: new Map(),

  // ── Socket.IO lifecycle ──────────────────────────────────────────────────

  connect: () => {
    if (!API_BASE || get()._socket) return;

    const socket = io(API_BASE, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      timeout: 8000,
    });

    socket.on("connect", () => {
      set({ connected: true });
      socket.emit("DEVICE_ANNOUNCE", {
        deviceId: "staff-tablet-foh-01",
        deviceType: "STAFF_TABLET",
      });
    });

    socket.on("disconnect", () => set({ connected: false }));

    socket.on(
      "TOUCH_LOCK",
      ({ tableId, itemId }: { tableId: string; itemId: string }) => {
        get().acquireLock(tableId, itemId);
      }
    );

    socket.on(
      "TOUCH_UNLOCK",
      ({ tableId, itemId }: { tableId: string; itemId: string }) => {
        get().releaseLock(tableId, itemId);
      }
    );

    set({ _socket: socket });
  },

  disconnect: () => {
    const { _socket, _timers } = get();
    _timers.forEach((t) => clearTimeout(t));
    _socket?.disconnect();
    set({ _socket: null, connected: false, _timers: new Map() });
  },

  // ── Lock management ──────────────────────────────────────────────────────

  acquireLock: (tableId, itemId) => {
    const key = buildTouchKey(tableId, itemId);
    const { _timers, lockedKeys } = get();

    // Cancel existing auto-release so it doesn't fire mid-request
    const existing = _timers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => get().releaseLock(tableId, itemId), TTL_BUFFER_MS);

    const nextKeys = new Set(lockedKeys);
    nextKeys.add(key);
    const nextTimers = new Map(_timers);
    nextTimers.set(key, timer);
    set({ lockedKeys: nextKeys, _timers: nextTimers });
  },

  releaseLock: (tableId, itemId) => {
    const key = buildTouchKey(tableId, itemId);
    const { _timers, lockedKeys } = get();
    const timer = _timers.get(key);
    if (timer) clearTimeout(timer);
    const nextKeys = new Set(lockedKeys);
    nextKeys.delete(key);
    const nextTimers = new Map(_timers);
    nextTimers.delete(key);
    set({ lockedKeys: nextKeys, _timers: nextTimers });
  },

  isLocked: (tableId, itemId) =>
    get().lockedKeys.has(buildTouchKey(tableId, itemId)),
}));
