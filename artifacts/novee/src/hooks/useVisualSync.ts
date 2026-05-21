import { useState, useEffect, useCallback, useRef } from "react";

export interface SyncedEnvState {
  energyState:       string;
  eventAtmosphere:   string;
  mentorPersonality: string;
  automationEnabled: boolean;
  overrideActive:    boolean;
  intensityOverride: number | null;
  warmthOverride:    number | null;
}

const CHANNEL_NAME  = "novee-env-sync";
const STORAGE_KEY   = "novee_env_state";
const FALLBACK_ID   = "00000000-0000-0000-0000-000000000001";

function getVenueId(): string {
  return (
    localStorage.getItem("smokecraft_venue") ??
    localStorage.getItem("novee_venue") ??
    FALLBACK_ID
  );
}

export function useVisualSync() {
  const [env, setEnv]   = useState<SyncedEnvState | null>(null);
  const channelRef      = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const venueId = getVenueId();

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setEnv(JSON.parse(stored)); } catch {}
    }

    fetch(`/api/environment/${venueId}`)
      .then(r => r.json())
      .then(d => {
        if (d.state) {
          const s = d.state as SyncedEnvState;
          setEnv(s);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        }
      })
      .catch(() => {});

    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = ch;
      ch.onmessage = (e: MessageEvent<SyncedEnvState>) => {
        if (e.data) {
          setEnv(e.data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(e.data));
        }
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setEnv(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      channelRef.current?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const updateEnv = useCallback((next: SyncedEnvState) => {
    setEnv(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    channelRef.current?.postMessage(next);
  }, []);

  return { env, updateEnv };
}
