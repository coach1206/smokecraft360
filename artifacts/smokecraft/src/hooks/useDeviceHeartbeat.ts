import { useEffect, useRef } from "react";

const CLIENT_VERSION = "1.0.0";
const HEARTBEAT_INTERVAL_MS = 60_000;

export function useDeviceHeartbeat(
  deviceId: string | null,
  venueId: string | null,
  isIdle: boolean,
  ndaSigned?: boolean,
  sessionId?: string | null,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!deviceId || !venueId) return;

    async function beat() {
      try {
        const res = await fetch("/api/device/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            venueId,
            version: CLIENT_VERSION,
            status: isIdle ? "IDLE" : "ACTIVE",
            ...(ndaSigned !== undefined ? { ndaSigned } : {}),
            ...(sessionId ? { sessionId } : {}),
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { ack: boolean; forceRefresh: boolean };
        if (data.forceRefresh) {
          window.location.reload();
        }
      } catch {
        /* network error — skip this beat */
      }
    }

    void beat();

    intervalRef.current = setInterval(() => { void beat(); }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [deviceId, venueId, isIdle, ndaSigned, sessionId]);
}
