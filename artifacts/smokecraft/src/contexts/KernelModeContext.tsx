/**
 * KernelModeContext — polls GET /api/kernel/mode/:venueId every 30 s
 * and exposes the result so SmokeCraft features can gate on
 * mode === "sovereign" (luxury add-ons enabled) vs "essential" (locked).
 *
 * The last-known mode is persisted to localStorage (key: kernel_mode_<venueId>)
 * so the gate loads instantly on cold start with no flicker.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useVenue } from "@/contexts/VenueContext";

export type KernelMode = "sovereign" | "essential";

interface KernelModeContextValue {
  mode: KernelMode;
  loading: boolean;
}

const KernelModeContext = createContext<KernelModeContextValue>({
  mode: "sovereign",
  loading: false,
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

export function KernelModeProvider({ children }: { children: ReactNode }) {
  const venue = useVenue();
  const venueId = venue.id !== "default" ? venue.id : NULL_VENUE_ID;

  const cached = readCached(venueId);

  const [mode, setMode]       = useState<KernelMode>(cached ?? "sovereign");
  const [loading, setLoading] = useState(cached === null);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchMode(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/kernel/mode/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mode?: KernelMode };
      if (data.mode === "essential" || data.mode === "sovereign") {
        setMode(data.mode);
        writeCache(id, data.mode);
      }
    } catch {
      // network error — keep previous mode
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fresh = readCached(venueId);
    if (fresh !== null) {
      setMode(fresh);
      setLoading(false);
    } else {
      setMode("sovereign");
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
    <KernelModeContext.Provider value={{ mode, loading }}>
      {children}
    </KernelModeContext.Provider>
  );
}

export function useKernelMode(): KernelModeContextValue {
  return useContext(KernelModeContext);
}
