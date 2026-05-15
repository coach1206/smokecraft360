/**
 * KernelModeContext — polls GET /api/kernel/mode/:venueId every 30 s
 * and exposes the result so SmokeCraft features can gate on
 * mode === "sovereign" (luxury add-ons enabled) vs "essential" (locked).
 *
 * The last-known mode is persisted to localStorage (key: kernel_mode_<venueId>)
 * so the gate loads instantly on cold start with no flicker.
 *
 * setMode() calls PATCH /api/kernel/mode/:venueId with a Bearer token and
 * optimistically updates the local state on success.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useVenue } from "@/contexts/VenueContext";

export type KernelMode = "sovereign" | "essential";

interface KernelModeContextValue {
  mode: KernelMode;
  loading: boolean;
  saving: boolean;
  setMode: (mode: KernelMode, token: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const KernelModeContext = createContext<KernelModeContextValue>({
  mode: "sovereign",
  loading: false,
  saving: false,
  setMode: async () => {},
  refresh: async () => {},
});

const POLL_INTERVAL_MS = 30_000;
const NULL_VENUE_ID    = "00000000-0000-0000-0000-000000000000";

function storageKey(venueId: string): string {
  return `kernel_mode_${venueId}`;
}

function readCached(venueId: string): KernelMode | null {
  try {
    const raw = localStorage.getItem(storageKey(venueId));
    if (raw === "essential" || raw === "sovereign") return raw;
  } catch {
    // localStorage unavailable (e.g. private browsing restrictions)
  }
  return null;
}

function writeCache(venueId: string, mode: KernelMode): void {
  try {
    localStorage.setItem(storageKey(venueId), mode);
  } catch {
    // ignore write errors
  }
}

function deleteCache(venueId: string): void {
  try {
    localStorage.removeItem(storageKey(venueId));
  } catch {
    // ignore
  }
}

/** Remove every kernel_mode_* entry — call on logout or full session reset. */
export function clearAllKernelModeCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("kernel_mode_")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage unavailable
  }
}

export function KernelModeProvider({ children }: { children: ReactNode }) {
  const venue = useVenue();
  const venueId = venue.id !== "default" ? venue.id : NULL_VENUE_ID;

  const cached = readCached(venueId);

  const [mode, setModeState] = useState<KernelMode>(cached ?? "sovereign");
  const [loading, setLoading] = useState(cached === null);
  const [saving, setSaving]   = useState(false);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevVenueIdRef        = useRef<string>(venueId);

  async function fetchMode(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/kernel/mode/${id}`);
      if (!res.ok) return false;
      const data = (await res.json()) as { mode?: KernelMode };
      if (data.mode === "essential" || data.mode === "sovereign") {
        setModeState(data.mode);
        writeCache(id, data.mode);
        return true;
      }
      return false;
    } catch {
      // network error — keep previous mode
      return false;
    } finally {
      setLoading(false);
    }
  }

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    const ok = await fetchMode(venueId);
    if (!ok) throw new Error("Failed to reach server — mode unchanged");
  }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMode = useCallback(async (newMode: KernelMode, token: string): Promise<void> => {
    if (venueId === NULL_VENUE_ID) {
      throw new Error("No venue selected");
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/kernel/mode/${venueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { mode?: KernelMode };
      const confirmed: KernelMode =
        data.mode === "essential" || data.mode === "sovereign"
          ? data.mode
          : newMode;
      setModeState(confirmed);
      writeCache(venueId, confirmed);
    } finally {
      setSaving(false);
    }
  }, [venueId]);

  useEffect(() => {
    const prevId = prevVenueIdRef.current;
    if (prevId !== venueId) {
      deleteCache(prevId);
      prevVenueIdRef.current = venueId;
    }

    const fresh = readCached(venueId);
    if (fresh !== null) {
      setModeState(fresh);
      setLoading(false);
    } else {
      setModeState("sovereign");
      setLoading(true);
    }

    fetchMode(venueId);

    timerRef.current = setInterval(() => {
      fetchMode(venueId);
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  return (
    <KernelModeContext.Provider value={{ mode, loading, saving, setMode, refresh }}>
      {children}
    </KernelModeContext.Provider>
  );
}

export function useKernelMode(): KernelModeContextValue {
  return useContext(KernelModeContext);
}
