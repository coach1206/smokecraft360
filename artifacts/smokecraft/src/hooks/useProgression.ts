/**
 * useProgression — fetches server-side XP progression for the authenticated user.
 *
 * Returns null when the user is not logged in or data is not yet loaded.
 * Caches for 60 seconds to avoid hammering the API.
 *
 * Level-up detection:
 *   Stores the previous level index in localStorage. If the server returns a
 *   higher tier than the stored value, fires a toast notification and updates
 *   the stored value.
 *
 * The Maestro del Fuego gate:
 *   progression?.level.title === "Maestro del Fuego"
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast }                                     from "sonner";
import { fetchProgression, type UserProgressionData } from "@/services/api";
import { useAuth }                                   from "@/contexts/AuthContext";

const CACHE_TTL_MS       = 60_000;
const LEVEL_STORAGE_KEY  = "sc_progression_level";

const TIER_LABELS = [
  "Explorer",
  "Enthusiast",
  "Aficionado",
  "Connoisseur",
  "Maestro del Fuego",
] as const;

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
  const lastFetch     = useRef<number>(0);
  const notifiedLevel = useRef<number>(-1);

  const checkLevelUp = (data: UserProgressionData) => {
    const newIndex = data.level.index;
    const stored   = parseInt(localStorage.getItem(LEVEL_STORAGE_KEY) ?? "-1", 10);

    // First ever load — just store, no toast
    if (stored === -1) {
      localStorage.setItem(LEVEL_STORAGE_KEY, String(newIndex));
      notifiedLevel.current = newIndex;
      return;
    }

    // Already notified this session
    if (notifiedLevel.current >= newIndex) return;

    if (newIndex > stored) {
      const title = TIER_LABELS[newIndex] ?? "New Tier";
      toast(
        `You reached ${title}!`,
        {
          description: newIndex >= 4
            ? "Maestro del Fuego unlocked — Signature Cigar Creator is yours."
            : newIndex >= 3
              ? "Elite status achieved — connoisseur privileges unlocked."
              : `Keep going — ${TIER_LABELS[newIndex + 1] ?? "Maestro"} awaits.`,
          duration: 6000,
          style: {
            background: "hsl(22 18% 8%)",
            border:     "1px solid rgba(212,139,0,0.35)",
            color:      "rgba(220,200,165,0.95)",
          },
        },
      );
      localStorage.setItem(LEVEL_STORAGE_KEY, String(newIndex));
      notifiedLevel.current = newIndex;
    }
  };

  const load = useCallback(async () => {
    if (!user || !token) { setProgression(null); return; }
    const now = Date.now();
    if (now - lastFetch.current < CACHE_TTL_MS && progression) return;
    setLoading(true);
    try {
      const data = await fetchProgression();
      setProgression(data);
      lastFetch.current = now;
      checkLevelUp(data);
    } catch {
      /* silent — progression is optional context */
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
