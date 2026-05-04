import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Monitor, Tablet, Smartphone, Lock, Unlock, RefreshCw, Wifi, WifiOff, Battery, BatteryLow } from "lucide-react";
import { useCommandCenter, type Device } from "@/contexts/CommandCenterContext";

const typeIcons: Record<Device["type"], typeof Monitor> = { kiosk: Monitor, tablet: Tablet, mobile: Smartphone };
const roleColors: Record<Device["role"], string> = { pos: "#d4af37", kiosk: "#5b8def", demo: "#34d399" };

function DeviceCard({ device }: { device: Device }) {
  const cc = useCommandCenter();
  const Icon = typeIcons[device.type];
  const isLowBat = device.battery <= 20;
  const BatIcon = isLowBat ? BatteryLow : Battery;
  const ago = Math.round((Date.now() - new Date(device.lastHeartbeat).getTime()) / 60000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "20px", borderRadius: 16,
        background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: `1px solid ${device.status === "online" ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: device.status === "online" ? "#34d399" : "#ef4444",
        opacity: 0.6,
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={22} color={device.status === "online" ? "#e8e0c8" : "rgba(232,224,200,0.3)"} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e8e0c8" }}>{device.name}</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{device.type} · {device.id}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {device.status === "online" ? <Wifi size={14} color="#34d399" /> : <WifiOff size={14} color="#ef4444" />}
          <span style={{ fontSize: 12, fontWeight: 600, color: device.status === "online" ? "#34d399" : "#ef4444" }}>
            {device.status}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <BatIcon size={14} color={isLowBat ? "#ef4444" : "#e8e0c8"} />
          <span style={{ color: isLowBat ? "#ef4444" : "rgba(232,224,200,0.5)" }}>{device.battery}%</span>
        </div>
        <div style={{ color: "rgba(232,224,200,0.4)" }}>
          {ago < 1 ? "Just now" : `${ago}m ago`}
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 6,
          background: `${roleColors[device.role]}15`,
          border: `1px solid ${roleColors[device.role]}30`,
          color: roleColors[device.role], fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        }}>{device.role}</div>
        {device.locked && (
          <div style={{
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", fontSize: 11, fontWeight: 600,
          }}>LOCKED</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => cc.toggleDeviceLock(device.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: device.locked ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${device.locked ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: device.locked ? "#34d399" : "#ef4444", cursor: "pointer", minHeight: 42,
          }}>
          {device.locked ? <Unlock size={14} /> : <Lock size={14} />}
          {device.locked ? "Unlock" : "Lock"}
        </motion.button>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => cc.forceRefreshDevice(device.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: "rgba(91,141,239,0.08)", border: "1px solid rgba(91,141,239,0.2)",
            color: "#5b8def", cursor: "pointer", minHeight: 42,
          }}>
          <RefreshCw size={14} /> Refresh
        </motion.button>
        {["pos", "kiosk", "demo"].filter(r => r !== device.role).map(r => (
          <motion.button key={r} whileTap={{ scale: 0.93 }}
            onClick={() => cc.setDeviceRole(device.id, r as Device["role"])}
            style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: `${roleColors[r as Device["role"]]}08`,
              border: `1px solid ${roleColors[r as Device["role"]]}20`,
              color: roleColors[r as Device["role"]], cursor: "pointer",
              textTransform: "uppercase", minHeight: 42,
            }}>
            → {r}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function DevicesModule() {
  const [, navigate] = useLocation();
  const cc = useCommandCenter();
  const online = cc.devices.filter(d => d.status === "online").length;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f97316" }}>Device Control</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{online}/{cc.devices.length} devices online</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14, alignContent: "start" }}>
        {cc.devices.map(device => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
}
