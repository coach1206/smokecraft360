/**
 * KernelModeContext — polls GET /api/kernel/mode/:venueId every 30 s
 * and exposes the result so SmokeCraft features can gate on
 * mode === "sovereign" (luxury add-ons enabled) vs "essential" (locked).
 *
 * Default: "sovereign" so the app renders normally when no venue is
 * configured or the API hasn't responded yet.
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

export function KernelModeProvider({ children }: { children: ReactNode }) {
  const venue               = useVenue();
  const [mode, setMode]     = useState<KernelMode>("sovereign");
  const [loading, setLoading] = useState(true);
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  const venueId = venue.id !== "default" ? venue.id : NULL_VENUE_ID;

  async function fetchMode(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/kernel/mode/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mode?: KernelMode };
      if (data.mode === "essential" || data.mode === "sovereign") {
        setMode(data.mode);
      }
    } catch {
      // network error — keep previous mode
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
