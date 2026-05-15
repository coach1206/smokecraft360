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
}

const KernelModeContext = createContext<KernelModeContextValue>({
  mode: "sovereign",
  loading: false,
  saving: false,
  setMode: async () => {},
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

  const [mode, setModeState] = useState<KernelMode>(cached ?? "sovereign");
  const [loading, setLoading] = useState(cached === null);
  const [saving, setSaving]   = useState(false);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchMode(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/kernel/mode/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mode?: KernelMode };
      if (data.mode === "essential" || data.mode === "sovereign") {
        setModeState(data.mode);
        writeCache(id, data.mode);
      }
    } catch {
      // network error — keep previous mode
    } finally {
      setLoading(false);
    }
  }

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
    <KernelModeContext.Provider value={{ mode, loading, saving, setMode }}>
      {children}
    </KernelModeContext.Provider>
  );
}

export function useKernelMode(): KernelModeContextValue {
  return useContext(KernelModeContext);
}
