/**
 * useTrainingApi — write-through cache hook for Training Mode.
 *
 * Every API call is attempted against the real backend first.
 * On success the response is stored in localStorage as a cache.
 * On failure (network error / 5xx) the cached value is served and
 * an offline indicator is set so the UI can show [OFFLINE] badges.
 *
 * Cache keys: "axiom_training_{endpoint}"
 * Offline flag: "axiom_training_offline" = "1"
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Token helper ──────────────────────────────────────────────────────────────

export function getTrainingToken(): string | null {
  return (
    localStorage.getItem("axiom_jwt") ??
    localStorage.getItem("auth_token") ??
    null
  );
}

export function getAuthHeaders(): Record<string, string> {
  const token = getTrainingToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ── Offline state ─────────────────────────────────────────────────────────────

const OFFLINE_KEY = "axiom_training_offline";

export function setOfflineMode(offline: boolean) {
  if (offline) {
    localStorage.setItem(OFFLINE_KEY, "1");
  } else {
    localStorage.removeItem(OFFLINE_KEY);
  }
}

export function isOfflineMode(): boolean {
  return localStorage.getItem(OFFLINE_KEY) === "1";
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function cacheKey(endpoint: string) {
  return `axiom_training_${endpoint.replace(/\//g, "_")}`;
}

function readCache<T>(endpoint: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(endpoint));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(endpoint: string, data: T) {
  try {
    localStorage.setItem(cacheKey(endpoint), JSON.stringify(data));
  } catch {
    // quota exceeded — ignore
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

export async function trainingFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ data: T; fromCache: boolean }> {
  const url = `/api/training/${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    // Write-through to cache on success
    if (!options?.method || options.method === "GET") {
      writeCache<T>(endpoint, data);
    }
    setOfflineMode(false);
    return { data, fromCache: false };
  } catch {
    // Serve stale cache on network or 5xx error
    const cached = readCache<T>(endpoint);
    if (cached !== null) {
      setOfflineMode(true);
      return { data: cached, fromCache: true };
    }
    setOfflineMode(true);
    throw new Error("offline_no_cache");
  }
}

// ── useTrainingData hook ──────────────────────────────────────────────────────

export interface TrainingApiState<T> {
  data:        T | null;
  loading:     boolean;
  error:       string | null;
  fromCache:   boolean;
  refetch:     () => void;
}

export function useTrainingData<T>(
  endpoint: string,
  initialCache?: T,
): TrainingApiState<T> {
  const [data,      setData]      = useState<T | null>(readCache<T>(endpoint) ?? initialCache ?? null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const counter = useRef(0);

  const refetch = useCallback(() => {
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    trainingFetch<T>(endpoint)
      .then(({ data: d, fromCache: fc }) => {
        if (id !== counter.current) return;
        setData(d);
        setFromCache(fc);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (id !== counter.current) return;
        setError(err.message);
        setLoading(false);
      });
  }, [endpoint]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, fromCache, refetch };
}

// ── Convenience: fire-and-forget analytics event ─────────────────────────────

export function logTrainingEvent(payload: {
  eventType:  string;
  page?:      string;
  role?:      string;
  scenarioId?: string;
  stepIndex?:  number;
  slideIndex?: number;
  score?:      number;
  durationMs?: number;
  sessionId?:  string;
  metadata?:   Record<string, unknown>;
}) {
  // Best-effort — never blocks UI
  const sessionId = localStorage.getItem("axiom_training_session_id") ?? undefined;
  trainingFetch("analytics/event", {
    method: "POST",
    body: JSON.stringify({ ...payload, sessionId }),
  }).catch(() => {
    // Queue to localStorage for replay when back online
    const queue = JSON.parse(localStorage.getItem("axiom_training_event_queue") ?? "[]") as unknown[];
    queue.push({ ...payload, sessionId, queuedAt: new Date().toISOString() });
    if (queue.length > 50) queue.splice(0, queue.length - 50); // cap at 50
    localStorage.setItem("axiom_training_event_queue", JSON.stringify(queue));
  });
}

// ── Flush offline event queue when back online ────────────────────────────────

export function flushEventQueue() {
  const raw = localStorage.getItem("axiom_training_event_queue");
  if (!raw) return;
  const queue = JSON.parse(raw) as Record<string, unknown>[];
  if (!queue.length) return;
  localStorage.removeItem("axiom_training_event_queue");
  queue.forEach((event) => {
    trainingFetch("analytics/event", {
      method: "POST",
      body: JSON.stringify(event),
    }).catch(() => {
      // Re-queue on second failure — give up
    });
  });
}

// ── Session management ────────────────────────────────────────────────────────

export async function ensureTrainingSession(mode: string, role?: string): Promise<string | null> {
  const existingId = localStorage.getItem("axiom_training_session_id");
  const existingMode = localStorage.getItem("axiom_training_session_mode");

  // Reuse existing session if same mode
  if (existingId && existingMode === mode) return existingId;

  try {
    const { data } = await trainingFetch<{ session: { id: string } }>("start", {
      method: "POST",
      body: JSON.stringify({ mode, role }),
    });
    const id = data.session.id;
    localStorage.setItem("axiom_training_session_id", id);
    localStorage.setItem("axiom_training_session_mode", mode);
    return id;
  } catch {
    // Offline — return a deterministic fake session ID
    const fallbackId = `offline-${mode}-${Date.now()}`;
    localStorage.setItem("axiom_training_session_id", fallbackId);
    localStorage.setItem("axiom_training_session_mode", mode);
    return fallbackId;
  }
}
