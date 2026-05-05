import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Monitor, Tablet, Smartphone, Lock, Unlock, RefreshCw, Wifi, WifiOff, Battery, BatteryLow, Power, ShieldAlert } from "lucide-react";
import { useCommandCenter, type Device } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";
import { useVenueContext } from "@/contexts/VenueContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const C = {
  header:    "rgba(245,242,235,0.96)",
  border:    "rgba(0,0,0,0.08)",
  text:      "#1A1410",
  muted:     "rgba(26,20,16,0.45)",
  dim:       "rgba(26,20,16,0.28)",
  card:      "#FFFFFF",
  back:      "#FFFFFF",
  backBorder:"rgba(0,0,0,0.1)",
};

const typeIcons: Record<Device["type"], typeof Monitor> = { kiosk: Monitor, tablet: Tablet, mobile: Smartphone };
const roleColors: Record<Device["role"], string> = { pos: "#9A7820", kiosk: "#5b8def", demo: "#34d399" };

function DeviceCard({ device, onConfirmAction }: { device: Device; onConfirmAction: (title: string, message: string, action: () => void, danger?: boolean) => void }) {
  const cc = useCommandCenter();
  const Icon = typeIcons[device.type];
  const isLowBat = device.battery <= 20;
  const BatIcon = isLowBat ? BatteryLow : Battery;
  const ago = Math.round((Date.now() - new Date(device.lastHeartbeat).getTime()) / 60000);
  const online = device.status === "online";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "20px", borderRadius: 16,
        background: C.card,
        border: `1px solid ${online ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
        position: "relative", overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: online ? "#22c55e" : "#ef4444",
        opacity: 0.8,
      }} />

      {/* Device header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={22} color={online ? C.text : C.dim} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{device.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{device.type} · {device.id}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {online ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#ef4444" />}
          <span style={{ fontSize: 12, fontWeight: 600, color: online ? "#22c55e" : "#ef4444" }}>
            {device.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <BatIcon size={14} color={isLowBat ? "#ef4444" : C.muted} />
          <span style={{ color: isLowBat ? "#ef4444" : C.muted }}>{device.battery}%</span>
        </div>
        <div style={{ color: C.dim }}>
          {ago < 1 ? "Just now" : `${ago}m ago`}
        </div>
        <div style={{
          padding: "2px 8px", borderRadius: 6,
          background: `${roleColors[device.role]}12`,
          border: `1px solid ${roleColors[device.role]}25`,
          color: roleColors[device.role], fontSize: 11, fontWeight: 600, textTransform: "uppercase",
        }}>{device.role}</div>
        {device.locked && (
          <div style={{
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", fontSize: 11, fontWeight: 600,
          }}>LOCKED</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <motion.button whileTap={{ scale: 0.93 }}
          onClick={() => onConfirmAction(
            device.locked ? "Unlock Device" : "Lock Device",
            device.locked
              ? `Unlock "${device.name}"? The device will be accessible again.`
              : `Lock "${device.name}"? The device will be inaccessible until unlocked.`,
            () => cc.toggleDeviceLock(device.id),
            !device.locked,
          )}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: device.locked ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${device.locked ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: device.locked ? "#22c55e" : "#ef4444", cursor: "pointer", minHeight: 42,
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
        {online && (
          <motion.button whileTap={{ scale: 0.93 }}
            onClick={() => onConfirmAction(
              "Shutdown Device",
              `Shut down "${device.name}"? The device will go offline and need to be physically restarted.`,
              () => cc.shutdownDevice(device.id),
              true,
            )}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444", cursor: "pointer", minHeight: 42,
            }}>
            <Power size={14} /> Shutdown
          </motion.button>
        )}
        {(["pos", "kiosk", "demo"] as const).filter(r => r !== device.role).map(r => (
          <motion.button key={r} whileTap={{ scale: 0.93 }}
            onClick={() => cc.setDeviceRole(device.id, r)}
            style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: `${roleColors[r]}08`,
              border: `1px solid ${roleColors[r]}20`,
              color: roleColors[r], cursor: "pointer",
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
  const pos = usePosContext();
  const { getBackground } = useVenueContext();
  const online = cc.devices.filter(d => d.status === "online").length;
  const isPrivileged = pos.currentUser?.role === "owner" || pos.currentUser?.role === "manager";

  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void; danger: boolean } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const handleConfirmAction = (title: string, message: string, action: () => void, danger = false) => {
    if (!isPrivileged) {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 2500);
      cc.addAuditEntry("access.denied", `Unauthorized attempt: ${title}`, pos.currentUser?.name);
      return;
    }
    setConfirm({ title, message, action, danger });
  };

  return (
    <BackgroundLayer image={getBackground("devices")} style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.header, backdropFilter: "blur(12px)", flexShrink: 0, boxShadow: "0 1px 0 rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: C.muted, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f97316" }}>Device Control</div>
            <div style={{ fontSize: 11, color: C.muted }}>{online}/{cc.devices.length} devices online</div>
          </div>
        </div>
      </div>

      {/* ── Device grid ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14, alignContent: "start" }}>
        {cc.devices.length === 0 ? (
          <div style={{ gridColumn: "1/-1", padding: 48, textAlign: "center", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <Monitor size={32} color={C.dim} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>No devices registered</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>Devices will appear here once registered with the system</div>
          </div>
        ) : (
          cc.devices.map(device => (
            <DeviceCard key={device.id} device={device} onConfirmAction={handleConfirmAction} />
          ))
        )}
      </div>

      {accessDenied && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, padding: "14px 24px", borderRadius: 14,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          <ShieldAlert size={18} color="#ef4444" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Access Denied — Owner or Manager role required</span>
        </motion.div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        danger={confirm?.danger ?? false}
        confirmLabel={confirm?.danger ? "Yes, proceed" : "Confirm"}
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </BackgroundLayer>
  );
}
