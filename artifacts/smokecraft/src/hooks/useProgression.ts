/**
 * useProgression — fetches server-side XP progression for the authenticated user.
 *
 * Returns null when the user is not logged in or data is not yet loaded.
 * Caches for 60 seconds to avoid hammering the API.
 *
 * The Maestro del Fuego gate:
 *   progression?.level.title === "Maestro del Fuego"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchProgression, type UserProgressionData } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const CACHE_TTL_MS = 60_000;

interface UseProgressionReturn {
  progression:   UserProgressionData | null;
  loading:       boolean;
  isMaestro:     boolean;
  isElite:       boolean;
  refresh:       () => void;
}

export function useProgression(): UseProgressionReturn {
  const { user, token } = useAuth();
  const [progression, setProgression] = useState<UserProgressionData | null>(null);
  const [loading,     setLoading]     = useState(false);
  const lastFetch = useRef<number>(0);

  const load = useCallback(async () => {
    if (!user || !token) { setProgression(null); return; }
    const now = Date.now();
    if (now - lastFetch.current < CACHE_TTL_MS && progression) return;
    setLoading(true);
    try {
      const data = await fetchProgression();
      setProgression(data);
      lastFetch.current = now;
    } catch {
      /* silent — progression is optional context */
    } finally {
      setLoading(false);
    }
  }, [user, token, progression]);

  const refresh = useCallback(() => {
    lastFetch.current = 0;
    void load();
  }, [load]);

  useEffect(() => { void load(); }, [user?.id]);

  const tierIndex  = progression?.level.index ?? -1;
  const isElite    = tierIndex >= 3;
  const isMaestro  = tierIndex >= 4;

  return { progression, loading, isMaestro, isElite, refresh };
}
