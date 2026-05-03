/**
 * Offline action queue — kiosk-side.
 *
 * Buffers POST-style actions in localStorage when the network is down (or
 * the user is reading the value of `navigator.onLine`), then drains the
 * buffer to `/api/offline-queue/sync` when connectivity returns.
 *
 * Each enqueued action carries a client-generated UUID `idempotencyKey`
 * so the server can collapse duplicates if the same buffered action is
 * replayed (e.g. spotty connection mid-drain).
 *
 * Currently supports `kind: "order"`. Extend by adding more kinds and a
 * matching server-side `dispatchOne` case.
 */

const KEY = "smokecraft_offline_queue_v1";

export type QueueKind = "order";

export interface QueuedAction {
  idempotencyKey:  string;
  kind:            QueueKind;
  payload:         Record<string, unknown>;
  clientCreatedAt: string; // ISO
}

export interface SyncResult {
  idempotencyKey: string;
  status:         "synced" | "failed" | "duplicate";
  resultId?:      string;
  error?:         string;
}

function read(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function write(items: QueuedAction[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* quota */ }
}

function uuid(): string {
  // Prefer crypto.randomUUID where available; fall back to a v4-shaped polyfill.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Append an action to the queue. Returns its idempotencyKey. */
export function enqueue(kind: QueueKind, payload: Record<string, unknown>): string {
  const action: QueuedAction = {
    idempotencyKey:  uuid(),
    kind,
    payload,
    clientCreatedAt: new Date().toISOString(),
  };
  const items = read();
  items.push(action);
  write(items);
  notify();
  return action.idempotencyKey;
}

export function pendingCount(): number { return read().length; }
export function pendingItems(): QueuedAction[] { return read(); }

/**
 * Drain the buffer to the server. On `synced` or `duplicate`, the action
 * is removed from local storage; `failed` items stay queued so the next
 * drain retries them (server-side `attempts` counter tracks the count).
 *
 * Returns the per-item server response array (empty if nothing to drain).
 */
export async function drain(deviceId?: string): Promise<SyncResult[]> {
  const items = read();
  if (items.length === 0) return [];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (deviceId) headers["X-Device-Id"] = deviceId;

  let results: SyncResult[] = [];
  try {
    const r = await fetch("/api/offline-queue/sync", {
      method: "POST", headers, body: JSON.stringify({ items }),
    });
    if (!r.ok) throw new Error(`sync failed (${r.status})`);
    const j = await r.json() as { results?: SyncResult[] };
    results = j.results ?? [];
  } catch {
    // Network still flaky — leave the queue alone, try again later.
    return [];
  }

  const doneKeys = new Set(
    results.filter(r => r.status === "synced" || r.status === "duplicate")
           .map(r => r.idempotencyKey),
  );
  if (doneKeys.size > 0) {
    write(items.filter(a => !doneKeys.has(a.idempotencyKey)));
    notify();
  }
  return results;
}

/** Lightweight pub/sub so the badge in the UI re-renders on changes. */
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function notify(): void { listeners.forEach(fn => { try { fn(); } catch { /* noop */ } }); }

/** Wire up window 'online' to auto-drain. Call once at app startup. */
export function installOnlineListener(deviceId?: string): () => void {
  const handler = () => { void drain(deviceId); };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
