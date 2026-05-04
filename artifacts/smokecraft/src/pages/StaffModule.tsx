import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, User, Crown, Shield, UserCog, Power, ShieldAlert } from "lucide-react";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const roleIcons: Record<string, typeof Crown> = { owner: Crown, manager: Shield, staff: User };
const roleColors: Record<string, string> = { owner: "#d4af37", manager: "#5b8def", staff: "#34d399" };

export default function StaffModule() {
  const [, navigate] = useLocation();
  const cc = useCommandCenter();
  const pos = usePosContext();

  const isPrivileged = pos.currentUser?.role === "owner" || pos.currentUser?.role === "manager";
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => void; danger: boolean } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  function handleQuickSwitch(staffMember: { name: string; role: string; pin: string }) {
    pos.setCurrentUser(staffMember);
    cc.addAuditEntry("staff.switch", `Quick switch to ${staffMember.name} (${staffMember.role})`);
    navigate("/pos");
  }

  function handleToggleStatus(memberId: string, memberName: string, currentStatus: string) {
    if (!isPrivileged) {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 2500);
      cc.addAuditEntry("access.denied", `Unauthorized attempt: toggle staff status for ${memberName}`, pos.currentUser?.name);
      return;
    }
    if (currentStatus === "active") {
      setConfirm({
        title: "Deactivate Staff Member",
        message: `Deactivate "${memberName}"? They will lose access to the POS system until reactivated.`,
        action: () => cc.switchStaffStatus(memberId),
        danger: true,
      });
    } else {
      cc.switchStaffStatus(memberId);
    }
  }

  return (
    <BackgroundLayer image="/images/lounge-bg.jpg" style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#a78bfa" }}>Staff Management</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{cc.staff.filter(s => s.status === "active").length} active members</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, alignContent: "start" }}>
        {cc.staff.map((member, i) => {
          const RoleIcon = roleIcons[member.role] ?? User;
          const color = roleColors[member.role] ?? "#a78bfa";
          const isCurrent = pos.currentUser?.pin === member.pin;
          return (
            <motion.div key={member.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                padding: "20px", borderRadius: 16,
                background: isCurrent
                  ? `linear-gradient(145deg, ${color}10, ${color}05)`
                  : "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                border: `1px solid ${isCurrent ? `${color}40` : "rgba(255,255,255,0.06)"}`,
                opacity: member.status === "inactive" ? 0.5 : 1,
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${color}12`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <RoleIcon size={22} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e0c8" }}>
                      {member.name}
                      {isCurrent && <span style={{ fontSize: 10, color, marginLeft: 8 }}>ACTIVE</span>}
                    </div>
                    <div style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 6, marginTop: 4,
                      background: `${color}12`, border: `1px solid ${color}25`,
                      fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{member.role}</div>
                  </div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: member.status === "active" ? "#34d399" : "#64748b",
                  boxShadow: member.status === "active" ? "0 0 8px rgba(52,211,153,0.4)" : "none",
                }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.93 }}
                  onClick={() => handleToggleStatus(member.id, member.name, member.status)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: member.status === "active" ? "rgba(100,116,139,0.08)" : "rgba(52,211,153,0.08)",
                    border: `1px solid ${member.status === "active" ? "rgba(100,116,139,0.2)" : "rgba(52,211,153,0.2)"}`,
                    color: member.status === "active" ? "#64748b" : "#34d399",
                    cursor: "pointer", minHeight: 42,
                  }}>
                  <Power size={14} /> {member.status === "active" ? "Deactivate" : "Activate"}
                </motion.button>
                {member.status === "active" && !isCurrent && (
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => handleQuickSwitch(member)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: `${color}10`, border: `1px solid ${color}25`,
                      color, cursor: "pointer", minHeight: 42,
                    }}>
                    <UserCog size={14} /> Switch to POS
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {accessDenied && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, padding: "14px 24px", borderRadius: 14,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
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
        confirmLabel="Yes, deactivate"
        onConfirm={() => { confirm?.action(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </BackgroundLayer>
  );
}
