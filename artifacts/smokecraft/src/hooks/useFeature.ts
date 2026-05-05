/**
 * useFeature — check whether the current user's venue has a specific feature.
 *
 * Fetches /api/entitlements/my on first call and caches for the session.
 * Returns { enabled, loading, features } so consumers can gate UI or show upgrade prompts.
 */

import { useState, useEffect, useRef } from "react";

interface EntitlementState {
  features:  string[];
  packageId: string | null;
  loading:   boolean;
  error:     boolean;
}

// Module-level cache so multiple hook instances share the same fetch
let _cache: EntitlementState | null = null;
let _promise: Promise<void> | null  = null;
const _subscribers = new Set<() => void>();

function notify() { _subscribers.forEach(fn => fn()); }

async function loadEntitlements() {
  if (_cache && !_cache.loading) return;
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const token = localStorage.getItem("smokecraft_token") ?? localStorage.getItem("axiom_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/entitlements/my", { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { features: string[]; packageId: string | null };
      _cache = { features: data.features, packageId: data.packageId, loading: false, error: false };
    } catch {
      _cache = { features: [], packageId: null, loading: false, error: true };
    } finally {
      _promise = null;
      notify();
    }
  })();

  return _promise;
}

/** Force-refresh entitlements (call after admin saves changes). */
export function invalidateFeatureCache() {
  _cache = null;
  _promise = null;
}

export function useEntitlements(): EntitlementState {
  const [, rerender] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => { if (mounted.current) rerender(n => n + 1); };
    _subscribers.add(refresh);
    if (!_cache) {
      _cache = { features: [], packageId: null, loading: true, error: false };
      loadEntitlements();
    }
    return () => { mounted.current = false; _subscribers.delete(refresh); };
  }, []);

  return _cache ?? { features: [], packageId: null, loading: true, error: false };
}

/** Returns true if the current venue has the specified feature enabled. */
export function useFeature(featureId: string): { enabled: boolean; loading: boolean } {
  const { features, loading } = useEntitlements();
  return { enabled: features.includes(featureId), loading };
}
