import { motion, AnimatePresence } from "framer-motion";
import {
  X, Activity, Wifi, Package, CreditCard, Layers, Shield, FileText,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { useCommandCenter, POS_MODE_INFO } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";

interface SystemStatusPanelProps {
  open: boolean;
  onClose: () => void;
}

function StatusRow({ icon: Icon, label, value, color }: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
}) {
  const StatusIcon = color === "#34d399" ? CheckCircle2 : color === "#f59e0b" ? AlertTriangle : XCircle;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color}15`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `${color}10`, border: `1px solid ${color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "rgba(232,224,200,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color, textTransform: "capitalize" }}>
          {value}
        </div>
      </div>
      <StatusIcon size={16} color={color} style={{ opacity: 0.6, flexShrink: 0 }} />
    </div>
  );
}

export default function SystemStatusPanel({ open, onClose }: SystemStatusPanelProps) {
  const cc = useCommandCenter();
  const pos = usePosContext();

  const onlineDevices = cc.devices.filter(d => d.status === "online").length;
  const totalDevices = cc.devices.length;
  const lowStock = pos.products.filter(p => p.stock <= 5).length;
  const totalProducts = pos.products.length;
  const modeInfo = POS_MODE_INFO[cc.posMode];
  const lastAudit = cc.auditLog.length > 0
    ? cc.auditLog.reduce((latest, e) => new Date(e.timestamp) > new Date(latest.timestamp) ? e : latest)
    : null;

  const systemColor = cc.systemStatus === "operational" ? "#34d399" : cc.systemStatus === "degraded" ? "#f59e0b" : "#ef4444";
  const deviceColor = onlineDevices === totalDevices ? "#34d399" : onlineDevices >= totalDevices / 2 ? "#f59e0b" : "#ef4444";
  const inventoryColor = lowStock === 0 ? "#34d399" : lowStock <= 3 ? "#f59e0b" : "#ef4444";
  const lockedDevices = cc.devices.filter(d => d.locked).length;
  const securityColor = lockedDevices === 0 ? "#34d399" : "#f59e0b";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 900,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0,
              width: 380, maxWidth: "90vw", zIndex: 901,
              background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e0c8" }}>System Status</div>
                <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Real-time health overview</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(232,224,200,0.5)", cursor: "pointer",
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <StatusRow icon={Activity} label="API Status" value={cc.systemStatus} color={systemColor} />
              <StatusRow icon={Wifi} label="Device Heartbeats" value={`${onlineDevices}/${totalDevices} online`} color={deviceColor} />
              <StatusRow
                icon={Package}
                label="Inventory Sync"
                value={lowStock === 0 ? "All synced" : `${lowStock} low stock`}
                color={inventoryColor}
              />
              <StatusRow icon={CreditCard} label="Payment Mode" value="Simulated" color="#5b8def" />
              <StatusRow icon={Layers} label="Operating Mode" value={modeInfo.label} color={modeInfo.color} />
              <StatusRow
                icon={Shield}
                label="Security State"
                value={lockedDevices > 0 ? `${lockedDevices} device${lockedDevices > 1 ? "s" : ""} locked` : "All clear"}
                color={securityColor}
              />

              {lastAudit && (
                <div style={{
                  marginTop: 6, padding: "14px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                    fontSize: 11, color: "rgba(232,224,200,0.35)",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    <FileText size={12} />
                    Last Audit Event
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(232,224,200,0.6)", marginBottom: 4, lineHeight: 1.4 }}>
                    {lastAudit.details}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(232,224,200,0.25)" }}>
                    {lastAudit.user} · {new Date(lastAudit.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {lastAudit.action}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10, color: "rgba(232,224,200,0.2)",
              textTransform: "uppercase", letterSpacing: "0.12em",
              textAlign: "center", flexShrink: 0,
            }}>
              Axiom OS · System Health
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
