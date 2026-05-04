import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Activity, Monitor, Clock, FileText } from "lucide-react";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";

export default function SettingsModule() {
  const [, navigate] = useLocation();
  const cc = useCommandCenter();
  const pos = usePosContext();

  const statusColor = cc.systemStatus === "operational" ? "#34d399" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";
  const onlineDevices = cc.devices.filter(d => d.status === "online").length;
  const lockedDevices = cc.devices.filter(d => d.locked).length;
  const activeStaff = cc.staff.filter(s => s.status === "active").length;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>System & Security</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Status, devices, and audit trail</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { icon: Activity, label: "System Status", value: cc.systemStatus, color: statusColor },
            { icon: Monitor, label: "Devices Online", value: `${onlineDevices}/${cc.devices.length}`, color: "#5b8def" },
            { icon: Shield, label: "Devices Locked", value: `${lockedDevices}`, color: lockedDevices > 0 ? "#ef4444" : "#34d399" },
            { icon: Clock, label: "Active Staff", value: `${activeStaff}`, color: "#a78bfa" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{
                  padding: "18px 16px", borderRadius: 14,
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}20`,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${item.color}10`, border: `1px solid ${item.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color, textTransform: "capitalize" }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(232,224,200,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Active Session
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Current User</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.currentUser?.name ?? "None"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Role</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#d4af37", textTransform: "capitalize" }}>{pos.currentUser?.role ?? "—"}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Orders This Session</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.orders.length}</div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 4 }}>Cart Items</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e0c8" }}>{pos.cart.reduce((s, c) => s + c.quantity, 0)}</div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "16px", borderRadius: 14,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <FileText size={14} color="rgba(232,224,200,0.5)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,224,200,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Audit Log</span>
          </div>
          {cc.auditLog.slice(0, 10).map((entry, i) => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{
                  display: "flex", gap: 12, padding: "10px 0",
                  borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.03)" : "none",
                }}>
                <div style={{ fontSize: 11, color: "rgba(232,224,200,0.25)", minWidth: 50, flexShrink: 0 }}>{timeStr}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(232,224,200,0.6)" }}>{entry.details}</div>
                  <div style={{ fontSize: 10, color: "rgba(232,224,200,0.25)", marginTop: 2 }}>{entry.user} · {entry.action}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
