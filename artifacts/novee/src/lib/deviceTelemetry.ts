/**
 * deviceTelemetry.ts — Device heartbeat and telemetry client (NOVEE OS).
 * Mirrors SmokeCraft deviceTelemetry exactly.
 */

import { useState, useEffect, useRef } from "react";
import { socket } from "@/lib/socket";

export interface DeviceInfo {
  deviceId:     string;
  venueId?:     string;
  tableNumber?: string;
  version?:     string;
  platform?:    "kiosk" | "tablet" | "web" | "mobile";
}

export interface DeviceStatus {
  deviceId:     string;
  status:       "online" | "idle" | "offline";
  tableNumber?: string;
  venueId?:     string;
  lastSeen:     string;
  version?:     string;
  platform?:    string;
}

export interface TelemetryState {
  deviceId:  string;
  isOnline:  boolean;
  devices:   DeviceStatus[];
  lastPing:  string | null;
  error:     string | null;
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem("novee_device_id");
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("novee_device_id", id);
    }
    return id;
  } catch {
    return `dev_sess_${Math.random().toString(36).slice(2, 10)}`;
  }
}

let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat(info: DeviceInfo): Promise<void> {
  try {
    await fetch("/api/device-heartbeat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: info.deviceId, venueId: info.venueId, tableNumber: info.tableNumber,
        version: info.version ?? "1.0.0", platform: info.platform ?? "web",
        status: document.hidden ? "idle" : "active", timestamp: new Date().toISOString(),
      }),
    });
  } catch { /* heartbeat — silent */ }
}

export function startHeartbeat(info: DeviceInfo): () => void {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  void sendHeartbeat(info);
  _heartbeatTimer = setInterval(() => void sendHeartbeat(info), 30_000);
  return () => { if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; } };
}

export function stopHeartbeat(): void {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  _heartbeatTimer = null;
}

export function useDeviceTelemetry(venueId?: string): TelemetryState {
  const deviceId = getOrCreateDeviceId();
  const [state, setState] = useState<TelemetryState>({
    deviceId,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    devices: [], lastPing: null, error: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchDevices(): Promise<void> {
    try {
      const q   = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
      const res = await fetch(`/api/device-heartbeat${q}`);
      if (!res.ok) return;
      const data = await res.json() as { devices?: DeviceStatus[] } | DeviceStatus[];
      const devices = Array.isArray(data) ? data : (data.devices ?? []);
      setState(p => ({ ...p, devices, lastPing: new Date().toISOString(), error: null }));
    } catch (err) {
      setState(p => ({ ...p, error: err instanceof Error ? err.message : "Fetch failed" }));
    }
  }

  useEffect(() => {
    void fetchDevices();
    timerRef.current = setInterval(() => void fetchDevices(), 30_000);
    const onOnline    = () => setState(p => ({ ...p, isOnline: true  }));
    const onOffline   = () => setState(p => ({ ...p, isOnline: false }));
    const onHeartbeat = () => void fetchDevices();
    window.addEventListener("online",    onOnline);
    window.addEventListener("offline",   onOffline);
    socket.on("device_heartbeat", onHeartbeat);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("online",    onOnline);
      window.removeEventListener("offline",   onOffline);
      socket.off("device_heartbeat", onHeartbeat);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  return state;
}
