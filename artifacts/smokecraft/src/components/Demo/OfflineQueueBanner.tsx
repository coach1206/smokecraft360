/**
 * OfflineQueueBanner — fixed-position chip showing pending offline actions.
 *
 * Renders only when there's at least one queued action OR the browser
 * reports `navigator.onLine === false`. Tap "Sync now" to force a drain.
 *
 * Subscribes to the offlineQueue store via its tiny pub/sub so badge
 * count updates without prop-drilling.
 */

import { useEffect, useState } from "react";
import {
  pendingCount, pendingItems, drain, subscribe, installOnlineListener,
} from "@/services/offlineQueue";

export function OfflineQueueBanner() {
  const [count,   setCount]   = useState<number>(() => pendingCount());
  const [online,  setOnline]  = useState<boolean>(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubStore  = subscribe(() => setCount(pendingCount()));
    const unsubOnline = installOnlineListener();
    const onOn  = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online",  onOn);
    window.addEventListener("offline", onOff);
    return () => {
      unsubStore(); unsubOnline();
      window.removeEventListener("online",  onOn);
      window.removeEventListener("offline", onOff);
    };
  }, []);

  if (count === 0 && online) return null;

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try { await drain(); } finally { setSyncing(false); }
  }

  return (
    <div
      data-testid="offline-queue-banner"
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 9000,
        background: online ? "rgba(20,18,14,0.95)" : "rgba(140,40,30,0.95)",
        color: "#1A1A1B", padding: "10px 14px", borderRadius: 999,
        border: "1px solid rgba(212,139,0,0.4)", fontSize: 13,
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 24px rgba(26,26,27,0.10)",
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: online ? "#D48B00" : "#ff6b6b",
        boxShadow: online ? "0 0 8px #D48B00" : "0 0 8px #ff6b6b",
      }} />
      <span>
        {online ? "" : "Offline · "}
        {count} queued action{count === 1 ? "" : "s"}
        {pendingItems().some(i => i.kind === "nda") ? " (incl. NDA)" : ""}
      </span>
      {online && count > 0 && (
        <button
          data-testid="offline-queue-sync"
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: "transparent", color: "#D48B00",
            border: "1px solid rgba(212,139,0,0.4)", borderRadius: 999,
            padding: "3px 10px", fontSize: 12, cursor: "pointer",
          }}
        >{syncing ? "Syncing…" : "Sync now"}</button>
      )}
    </div>
  );
}
