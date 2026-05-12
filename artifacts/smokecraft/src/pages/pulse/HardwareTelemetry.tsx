import { motion } from "framer-motion";
import { usePulse, type HardwareDevice } from "./PulseContext";

const P = {
  surface:  "rgba(6,15,35,0.95)",
  surfaceB: "rgba(8,20,45,0.90)",
  border:   "rgba(0,180,255,0.12)",
  blue:     "#00C4E8",
  ice:      "#A8D8F0",
  platinum: "#E8EDF5",
  green:    "#22c55e",
  amber:    "#F59E0B",
  red:      "#ef4444",
  faint:    "rgba(100,160,220,0.35)",
  sub:      "rgba(168,216,240,0.65)",
  mono:     "'SF Mono','Fira Code',monospace",
  sans:     "system-ui,-apple-system,'Helvetica Neue',sans-serif",
};

function batteryColor(pct: number): string {
  if (pct <= 15) return P.red;
  if (pct <= 35) return P.amber;
  return P.green;
}

function statusLabel(s: HardwareDevice["status"]): string {
  if (s === "guest_active") return "GUEST ACTIVE";
  if (s === "offline")      return "OFFLINE";
  return "IDLE";
}

function statusColor(s: HardwareDevice["status"]): string {
  if (s === "guest_active") return P.blue;
  if (s === "offline")      return P.red;
  return P.faint;
}

function DeviceCard({ device }: { device: HardwareDevice }) {
  const isCritical = device.battery <= 15;
  const isOffline  = device.status === "offline";
  const bColor     = batteryColor(device.battery);

  return (
    <motion.div
      animate={isCritical && !isOffline ? { opacity: [1, 0.65, 1] } : {}}
      transition={isCritical ? { repeat: Infinity, duration: 1.1, ease: "easeInOut" } : {}}
      style={{
        background: P.surfaceB,
        border: `1px solid ${isCritical ? `${P.red}55` : P.border}`,
        borderRadius: 10, padding: "12px 14px",
        boxShadow: isCritical ? `0 0 14px ${P.red}22` : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* ID header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: P.blue, fontFamily: P.mono, fontWeight: 800, letterSpacing: "0.14em" }}>
          {device.id}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!isOffline && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor(device.status) }}
            />
          )}
          <span style={{ fontSize: 7, color: statusColor(device.status), fontFamily: P.mono, letterSpacing: "0.12em" }}>
            {statusLabel(device.status)}
          </span>
        </div>
      </div>

      {/* Device name */}
      <div style={{ fontSize: 10, color: P.sub, fontFamily: P.sans, marginBottom: 10 }}>
        {device.name}
      </div>

      {/* Battery bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: P.faint, fontFamily: P.mono, letterSpacing: "0.1em" }}>BATTERY</span>
          <span style={{ fontSize: 7, color: bColor, fontFamily: P.mono, fontWeight: 700 }}>{device.battery}%</span>
        </div>
        <div style={{ height: 3, background: "rgba(0,0,0,0.5)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${device.battery}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: "100%", background: bColor, borderRadius: 2, boxShadow: `0 0 6px ${bColor}88` }}
          />
        </div>
      </div>

      {/* Ping + health */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 7, color: P.faint, fontFamily: P.mono }}>
          PING <span style={{ color: isOffline ? P.red : P.green }}>{isOffline ? "—" : `${device.pingMs}ms`}</span>
        </div>
        <div style={{ fontSize: 7, color: P.faint, fontFamily: P.mono }}>
          HEALTH <span style={{ color: device.health >= 90 ? P.green : P.amber }}>{device.health}%</span>
        </div>
      </div>

      {/* Guest name if active */}
      {device.sessionGuest && (
        <div style={{ marginTop: 6, fontSize: 8, color: P.blue, fontFamily: P.mono, letterSpacing: "0.08em" }}>
          {device.sessionGuest}
        </div>
      )}

      {/* Critical overlay */}
      {isCritical && !isOffline && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          padding: "3px 8px", background: `${P.red}22`,
          borderLeft: `1px solid ${P.red}44`, borderBottom: `1px solid ${P.red}44`,
          borderRadius: "0 10px 0 8px",
          fontSize: 7, color: P.red, fontFamily: P.mono, letterSpacing: "0.12em", fontWeight: 700,
        }}>
          LOW BATT
        </div>
      )}
    </motion.div>
  );
}

export function HardwareTelemetry() {
  const { data } = usePulse();
  const devices  = data?.hardware ?? [];

  const criticalCount = devices.filter(d => d.battery <= 15 && d.status !== "offline").length;
  const offlineCount  = devices.filter(d => d.status === "offline").length;

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: P.blue, fontFamily: P.mono, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
            HARDWARE TELEMETRY
          </div>
          <div style={{ fontSize: 11, color: "rgba(168,216,240,0.50)", fontFamily: P.sans, marginTop: 3 }}>
            Titan device constellation · {devices.length} nodes
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {criticalCount > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
              style={{ fontSize: 8, color: P.red, fontFamily: P.mono, letterSpacing: "0.12em" }}>
              {criticalCount} CRITICAL
            </motion.div>
          )}
          {offlineCount > 0 && (
            <div style={{ fontSize: 8, color: P.amber, fontFamily: P.mono, letterSpacing: "0.12em" }}>
              {offlineCount} OFFLINE
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {devices.map(d => <DeviceCard key={d.id} device={d} />)}
      </div>
    </div>
  );
}
