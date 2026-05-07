import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, User, Crown, Shield, UserCog, Power, ShieldAlert, Star } from "lucide-react";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { usePosContext } from "@/contexts/PosContext";
import { useVenueContext } from "@/contexts/VenueContext";
import ConfirmModal from "@/components/ConfirmModal";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const C = {
  header:    "linear-gradient(180deg, #12100E 0%, #EFEBE0ee 100%)",
  border:    "rgba(212,139,0,0.12)",
  text:      "#1A1A1B",
  muted:     "#6B5E4E",
  dim:       "rgba(107,94,78,0.48)",
  card:      "rgba(26,26,27,0.06)",
  back:      "#2A2A2A",
  backBorder:"rgba(212,139,0,0.18)",
  bg:        "#F5F2ED",
};

const roleIcons: Record<string, typeof Crown> = { owner: Crown, manager: Shield, staff: User };
const roleColors: Record<string, string> = { owner: "#9A7820", manager: "#5b8def", staff: "#22c55e" };

const PRESTIGE_COLORS: Record<string, string> = {
  Novice: "#6B5E4E", Connoisseur: "#D48B00", Master: "#A78BFA", Legend: "#ef4444",
};

const DEMO_STAFF = [
  { id: "ds1", name: "Marcus Rivera",  role: "manager", status: "active",   pin: "1111", table: "Table 4",    prestige: "Connoisseur" },
  { id: "ds2", name: "Jess Laurent",   role: "staff",   status: "active",   pin: "2222", table: "Bar Station", prestige: "Novice"      },
  { id: "ds3", name: "Omar Chen",      role: "staff",   status: "active",   pin: "3333", table: "Table 1",    prestige: "Master"      },
  { id: "ds4", name: "Sofia Reyes",    role: "owner",   status: "active",   pin: "4444", table: "—",          prestige: "Legend"      },
  { id: "ds5", name: "Theo Marchetti", role: "staff",   status: "inactive", pin: "5555", table: "—",          prestige: "Novice"      },
] as const;

export default function StaffModule() {
  const [, navigate] = useLocation();
  const cc = useCommandCenter();
  const pos = usePosContext();
  const { getBackground } = useVenueContext();

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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg, color: C.text }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: `1px solid rgba(212,139,0,0.10)`, background: C.header, backdropFilter: "blur(16px)", flexShrink: 0, boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)" }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: C.muted, cursor: "pointer", boxShadow: "0 2px 8px rgba(26,26,27,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#A78BFA" }}>Staff Management</div>
          <div style={{ fontSize: 13, color: C.muted }}>{cc.staff.filter(s => s.status === "active").length} active members</div>
        </div>
      </div>

      {/* ── Staff grid ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, alignContent: "start" }}>

        {/* Demo table strip — visible whenever real staff is empty */}
        {cc.staff.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ gridColumn: "1/-1", borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 4 }}>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 120px", gap: 0, padding: "10px 20px", background: "rgba(212,139,0,0.04)", borderBottom: `1px solid ${C.border}` }}>
              {["STAFF MEMBER", "ROLE", "TABLE STATUS", "PRESTIGE RANK", ""].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>
            {DEMO_STAFF.map((member, i) => {
              const RoleIcon = roleIcons[member.role] ?? User;
              const rColor = roleColors[member.role] ?? "#a78bfa";
              const pColor = PRESTIGE_COLORS[member.prestige] ?? "#6B5E4E";
              const isActive = member.status === "active";
              return (
                <motion.div key={member.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 120px",
                    alignItems: "center", gap: 0, padding: "14px 20px",
                    borderBottom: i < DEMO_STAFF.length - 1 ? `1px solid ${C.border}` : "none",
                    opacity: isActive ? 1 : 0.5,
                    background: i % 2 === 0 ? "transparent" : "rgba(26,26,27,0.02)",
                  }}>
                  {/* Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${rColor}12`, border: `1px solid ${rColor}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <RoleIcon size={15} color={rColor} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{member.name}</div>
                      <div style={{ fontSize: 9, color: C.dim }}>PIN ••••</div>
                    </div>
                  </div>
                  {/* Role badge */}
                  <div style={{ display: "inline-flex" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, background: `${rColor}10`, border: `1px solid ${rColor}22`, fontSize: 10, fontWeight: 700, color: rColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {member.role}
                    </span>
                  </div>
                  {/* Table status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive && member.table !== "—" ? "#22c55e" : "#64748b", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: member.table !== "—" ? C.text : C.dim }}>{member.table}</span>
                  </div>
                  {/* Prestige rank */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Star size={11} color={pColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: pColor }}>{member.prestige}</span>
                  </div>
                  {/* Status pill */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: isActive ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.08)",
                      border: `1px solid ${isActive ? "rgba(34,197,94,0.22)" : "rgba(100,116,139,0.2)"}`,
                      color: isActive ? "#22c55e" : "#64748b",
                    }}>{isActive ? "Active" : "Off shift"}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {(cc.staff.length > 0 ? cc.staff : []).map((member, i) => {
          const RoleIcon = roleIcons[member.role] ?? User;
          const color = roleColors[member.role] ?? "#a78bfa";
          const isCurrent = pos.currentUser?.pin === member.pin;
          return (
            <motion.div key={member.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                padding: "20px", borderRadius: 16,
                background: C.card,
                border: `1px solid ${isCurrent ? `${color}35` : C.border}`,
                opacity: member.status === "inactive" ? 0.6 : 1,
                boxShadow: isCurrent
                  ? `0 0 0 2px ${color}18, 0 2px 8px rgba(0,0,0,0.07)`
                  : "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${color}10`, border: `1px solid ${color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <RoleIcon size={22} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
                      {member.name}
                      {isCurrent && <span style={{ fontSize: 10, color, marginLeft: 8, fontWeight: 700 }}>ACTIVE</span>}
                    </div>
                    <div style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 6, marginTop: 4,
                      background: `${color}10`, border: `1px solid ${color}22`,
                      fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{member.role}</div>
                  </div>
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: member.status === "active" ? "#22c55e" : "#94a3b8",
                }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.93 }}
                  onClick={() => handleToggleStatus(member.id, member.name, member.status)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: member.status === "active" ? "rgba(100,116,139,0.08)" : "rgba(34,197,94,0.08)",
                    border: `1px solid ${member.status === "active" ? "rgba(100,116,139,0.2)" : "rgba(34,197,94,0.2)"}`,
                    color: member.status === "active" ? "#64748b" : "#22c55e",
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
                      background: `${color}10`, border: `1px solid ${color}22`,
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
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 20px rgba(26,26,27,0.03)",
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
    </div>
  );
}
