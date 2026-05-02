/**
 * useOnlineStatus
 *
 * Tracks browser connectivity. Syncs the offline event queue whenever the
 * browser comes back online.
 */

import { useEffect, useState } from "react";
import { flushEventQueue } from "@/services/eventQueue";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      // Replay any events that were queued while offline
      flushEventQueue().catch(() => {});
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
