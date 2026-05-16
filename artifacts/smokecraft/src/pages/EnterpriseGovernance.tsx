import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, ToggleLeft, ToggleRight, Users,
  FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Activity, Lock, Unlock, RefreshCw, Crown, Zap,
} from "lucide-react";
import { getAuthHeaders } from "@/services/auth";
import { useKernelMode, type KernelMode } from "@/contexts/KernelModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useVenue } from "@/contexts/VenueContext";

const BASE = "/api";

const C = {
  bg:     "#F5F2ED",
  panel:  "rgba(26,26,27,0.06)",
  border: "rgba(212,139,0,0.15)",
  gold:   "#D48B00",
  goldD:  "#D48B00",
  text:   "rgba(26,26,27,0.90)",
  muted:  "rgba(26,26,27,0.44)",
  dim:    "rgba(26,26,27,0.25)",
  red:    "#ef4444",
  green:  "#22c55e",
  amber:  "#f59e0b",
  blue:   "#60a5fa",
};

type Tab = "kill-switches" | "role-matrix" | "automation-queue" | "audit-stream" | "sovereign-mode";

interface KillSwitch {
  name: string; label: string; description: string;
  category: string; risk: "low" | "medium" | "high";
  safeDefault: boolean; enabled: boolean;
}

interface RoleUser {
  id: string; name: string; email: string;
  role: string; venueId: string | null; createdAt: string;
}

interface RolePermission {
  label: string; color: string; permissions: string[]; denied: string[];
}

interface AutomationItem {
  id: string; ruleId: string; title: string; insight: string;
  category: string; channel: string; messageBody: string; cta: string;
  metaScore: number; requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedAt: string | null; decidedBy: string | null;
}

interface AuditEntry {
  id: string; actorId: string | null; actorRole: string | null;
  action: string; entityType: string; entityId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  venueId: string | null; ipAddress: string | null; createdAt: string;
}

interface ModeHistoryEntry {
  id: string;
  venueId: string;
  oldMode: "sovereign" | "essential" | null;
  newMode: "sovereign" | "essential";
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

const RISK_COLOR = { low: C.green, medium: C.amber, high: C.red };
const STATUS_COLOR: Record<string, string> = {
  pending: C.amber, approved: C.green, rejected: C.red,
};
const ROLE_COLOR: Record<string, string> = {
  super_admin: C.red, venue_owner: C.goldD,
  manager: C.gold, staff: C.blue, brand_partner: "#a78bfa", customer: C.muted,
};

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
      textTransform: "uppercase", padding: "2px 7px",
      borderRadius: 999, border: `1px solid ${C.border}`,
      color: C.muted, background: "rgba(26,26,27,0.06)",
    }}>{cat}</span>
  );
}

export default function EnterpriseGovernance() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("kill-switches");

  const [switches, setSwitches] = useState<KillSwitch[]>([]);
  const [swLoading, setSwLoading] = useState(true);
  const [swToggling, setSwToggling] = useState<string | null>(null);

  const [users, setUsers] = useState<RoleUser[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, RolePermission>>({});
  const [roleLoading, setRoleLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RoleUser | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const [queue, setQueue] = useState<AutomationItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);

  const [health, setHealth] = useState<{
    auditActionsLast24h: number;
    pendingApprovals: number;
    disabledSwitches: string[];
    systemStatus: string;
  } | null>(null);

  const kernel = useKernelMode();
  const { user: authUser, token: authToken } = useAuth();
  const venue = useVenue();
  const venueId = venue.id !== "default" ? venue.id : null;
  const isKernelAdmin = authUser?.role === "super_admin" || authUser?.role === "venue_owner";
  const [modeError, setModeError] = useState("");
  const [modeSuccess, setModeSuccess] = useState(false);
  const [pendingMode, setPendingMode] = useState<KernelMode | null>(null);
  const [modeConfirmOpen, setModeConfirmOpen] = useState(false);
  const [modeRefreshing, setModeRefreshing] = useState(false);
  const [modeRefreshSuccess, setModeRefreshSuccess] = useState(false);

  const [modeHistory, setModeHistory] = useState<ModeHistoryEntry[]>([]);
  const [modeHistoryLoading, setModeHistoryLoading] = useState(false);
  const [modeHistoryTotal, setModeHistoryTotal] = useState(0);
  const [modeHistoryError, setModeHistoryError] = useState<string | null>(null);

  async function handleModeRefresh() {
    setModeRefreshing(true);
    setModeRefreshSuccess(false);
    setModeError("");
    try {
      await kernel.refresh();
      setModeRefreshSuccess(true);
      setTimeout(() => setModeRefreshSuccess(false), 2500);
    } catch (err) {
      setModeError(err instanceof Error ? err.message : "Refresh failed");
      setTimeout(() => setModeError(""), 5000);
    } finally {
      setModeRefreshing(false);
    }
  }

  const loadModeHistory = useCallback(async () => {
    if (!venueId) return;
    setModeHistoryLoading(true);
    setModeHistoryError(null);
    try {
      const r = await fetch(`${BASE}/kernel/mode/${venueId}/history?limit=20`, { headers });
      if (r.ok) {
        const d = await r.json() as { history: ModeHistoryEntry[]; total: number };
        setModeHistory(d.history);
        setModeHistoryTotal(d.total);
      } else {
        const err = await r.json().catch(() => ({})) as { error?: string };
        setModeHistoryError(err.error ?? `Failed to load history (HTTP ${r.status})`);
      }
    } catch {
      setModeHistoryError("Network error — could not load change history");
    } finally {
      setModeHistoryLoading(false);
    }
  }, [venueId]);

  async function applyMode(newMode: KernelMode) {
    if (!authToken) {
      setModeError("Not authenticated — please log in first");
      setTimeout(() => setModeError(""), 4000);
      return;
    }
    setModeError("");
    try {
      await kernel.setMode(newMode, authToken);
      setModeSuccess(true);
      setTimeout(() => setModeSuccess(false), 2500);
      void loadModeHistory();
    } catch (err) {
      setModeError(err instanceof Error ? err.message : "Failed to update mode");
      setTimeout(() => setModeError(""), 5000);
    }
    setPendingMode(null);
    setModeConfirmOpen(false);
  }

  const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };

  const loadSwitches = useCallback(async () => {
    setSwLoading(true);
    try {
      const r = await fetch(`${BASE}/governance/kill-switches`, { headers });
      if (r.ok) setSwitches((await r.json()).switches);
    } finally { setSwLoading(false); }
  }, []);

  const loadRoleMatrix = useCallback(async () => {
    setRoleLoading(true);
    try {
      const r = await fetch(`${BASE}/governance/role-matrix`, { headers });
      if (r.ok) {
        const d = await r.json();
        setUsers(d.users); setRolePerms(d.rolePermissions);
      }
    } finally { setRoleLoading(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const r = await fetch(`${BASE}/governance/automation-queue`, { headers });
      if (r.ok) setQueue((await r.json()).items);
    } finally { setQueueLoading(false); }
  }, []);

  const loadAudit = useCallback(async (cursor?: string | null) => {
    setAuditLoading(true);
    try {
      const url = new URL(`${BASE}/audit-log`, window.location.origin);
      url.searchParams.set("limit", "30");
      if (cursor) url.searchParams.set("cursor", cursor);
      const r = await fetch(url.toString(), { headers });
      if (r.ok) {
        const d = await r.json();
        setAudit(prev => cursor ? [...prev, ...d.entries] : d.entries);
        setAuditCursor(d.nextCursor ?? null);
      }
    } finally { setAuditLoading(false); }
  }, []);

  const loadHealth = useCallback(async () => {
    const r = await fetch(`${BASE}/governance/health`, { headers });
    if (r.ok) setHealth(await r.json());
  }, []);

  useEffect(() => { void loadSwitches(); void loadHealth(); }, []);
  useEffect(() => {
    if (tab === "role-matrix" && users.length === 0) loadRoleMatrix();
    if (tab === "automation-queue" && queue.length === 0) loadQueue();
    if (tab === "audit-stream" && audit.length === 0) loadAudit();
    if (tab === "sovereign-mode") void loadModeHistory();
  }, [tab]);

  async function toggleSwitch(sw: KillSwitch) {
    setSwToggling(sw.name);
    try {
      const r = await fetch(`${BASE}/governance/kill-switches/${sw.name}`, {
        method: "POST", headers,
        body: JSON.stringify({ enabled: !sw.enabled }),
      });
      if (r.ok) {
        setSwitches(prev => prev.map(s => s.name === sw.name ? { ...s, enabled: !s.enabled } : s));
        void loadHealth();
      }
    } finally { setSwToggling(null); }
  }

  async function changeRole(userId: string, role: string) {
    setRoleChanging(true);
    try {
      const r = await fetch(`${BASE}/governance/role-matrix/${userId}/role`, {
        method: "POST", headers, body: JSON.stringify({ role }),
      });
      if (r.ok) {
        const updated = await r.json() as { id: string; role: string };
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
        setSelectedUser(null);
      }
    } finally { setRoleChanging(false); }
  }

  async function decideAutomation(id: string, decision: "approved" | "rejected") {
    setDeciding(id);
    try {
      const r = await fetch(`${BASE}/governance/automation-queue/${id}`, {
        method: "POST", headers, body: JSON.stringify({ decision }),
      });
      if (r.ok) {
        const updated = await r.json() as AutomationItem;
        setQueue(prev => prev.map(q => q.id === id ? updated : q));
        void loadHealth();
      }
    } finally { setDeciding(null); }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "sovereign-mode",    label: "Mode",               icon: <Crown size={14} /> },
    { id: "kill-switches",     label: "Kill Switches",      icon: <Shield size={14} /> },
    { id: "role-matrix",       label: "Role Matrix",        icon: <Users size={14} /> },
    { id: "automation-queue",  label: "Approvals",          icon: <Clock size={14} /> },
    { id: "audit-stream",      label: "Audit Stream",       icon: <FileText size={14} /> },
  ];

  const statusColor = health?.systemStatus === "operational" ? C.green
    : health?.systemStatus === "degraded" ? C.amber : C.red;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
        background: "rgba(6,4,10,0.96)", backdropFilter: "blur(20px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/command-center")}
            style={{
              width: 42, height: 42, borderRadius: 12, background: C.panel,
              border: `1px solid ${C.border}`, color: C.muted,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={16} color={C.gold} />
              <span style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>Enterprise Governance</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              RBAC · Kill Switches · Audit Log · Automation Approvals
            </div>
          </div>
        </div>

        {/* Health badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {health && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{health.auditActionsLast24h}</div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Actions 24h</div>
              </div>
              <div style={{ width: 1, height: 28, background: C.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: health.pendingApprovals > 0 ? C.amber : C.text }}>
                  {health.pendingApprovals}
                </div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pending</div>
              </div>
              <div style={{ width: 1, height: 28, background: C.border }} />
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                background: `${statusColor}12`, border: `1px solid ${statusColor}30`,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "capitalize" }}>
                  {health.systemStatus}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 4, padding: "12px 24px 0",
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        background: "rgba(6,4,10,0.8)",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px 10px", borderRadius: "10px 10px 0 0",
              background: tab === t.id ? C.panel : "transparent",
              border: tab === t.id ? `1px solid ${C.border}` : "1px solid transparent",
              borderBottom: tab === t.id ? "1px solid transparent" : "none",
              color: tab === t.id ? C.gold : C.muted,
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              cursor: "pointer", position: "relative", bottom: -1,
            }}>
            {t.icon}{t.label}
            {t.id === "automation-queue" && health && health.pendingApprovals > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, background: C.amber,
                color: "#1A1A1B", borderRadius: 999, padding: "1px 6px", marginLeft: 2,
              }}>{health.pendingApprovals}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <AnimatePresence mode="wait">

          {/* ── Sovereign Mode ── */}
          {tab === "sovereign-mode" && (
            <motion.div key="sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Current tier banner */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", borderRadius: 14, marginBottom: 20,
                background: kernel.mode === "sovereign"
                  ? "linear-gradient(135deg, rgba(212,139,0,0.12), rgba(212,139,0,0.06))"
                  : "rgba(26,26,27,0.06)",
                border: `1px solid ${kernel.mode === "sovereign" ? "rgba(212,139,0,0.35)" : C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {kernel.mode === "sovereign"
                    ? <Crown size={22} color={C.gold} />
                    : <Zap size={22} color={C.muted} />}
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: kernel.mode === "sovereign" ? C.gold : C.text, textTransform: "capitalize" }}>
                      {kernel.loading ? "Loading…" : `${kernel.mode} Mode`}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {kernel.mode === "sovereign"
                        ? "Luxury add-ons, AI personalization, and premium analytics are active."
                        : "Venue is running on core features only. Luxury add-ons are locked."}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {modeSuccess && (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 11, color: C.green, fontWeight: 600 }}
                    >Saved!</motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Description */}
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
                <strong style={{ color: C.gold }}>Sovereign</strong> unlocks luxury add-ons, AI personalization, premium analytics, the Designer, Central Command, and enterprise intelligence layers.{" "}
                <strong style={{ color: C.text }}>Essential</strong> restricts the venue to core transaction and loyalty features. Toggling mode takes effect immediately and is persisted to the database.
                {!isKernelAdmin && (
                  <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 8,
                    background: `${C.red}10`, border: `1px solid ${C.red}25`,
                    fontSize: 12, color: C.red,
                  }}>
                    Super Admin or Venue Owner role required to change this setting.
                  </div>
                )}
              </div>

              {/* Mode selector cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                {(["sovereign", "essential"] as KernelMode[]).map((m) => {
                  const isCurrent = kernel.mode === m;
                  const isSov = m === "sovereign";
                  const accent = isSov ? C.gold : C.muted;
                  const ModeIcon = isSov ? Crown : Zap;
                  return (
                    <motion.button
                      key={m}
                      whileTap={isKernelAdmin && !kernel.saving ? { scale: 0.97 } : {}}
                      onClick={() => {
                        if (!isKernelAdmin || isCurrent || kernel.saving) return;
                        setPendingMode(m);
                        setModeConfirmOpen(true);
                      }}
                      style={{
                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                        padding: "20px 16px", borderRadius: 14, position: "relative",
                        cursor: isKernelAdmin && !isCurrent && !kernel.saving ? "pointer" : "default",
                        background: isCurrent
                          ? (isSov ? "linear-gradient(135deg, rgba(212,139,0,0.14), rgba(212,139,0,0.07))" : "rgba(26,26,27,0.08)")
                          : "rgba(26,26,27,0.04)",
                        border: `2px solid ${isCurrent ? (isSov ? C.gold : "rgba(26,26,27,0.30)") : C.border}`,
                        opacity: kernel.loading || (kernel.saving && !isCurrent) ? 0.5 : 1,
                        transition: "border-color 0.2s, background 0.2s, opacity 0.2s",
                      }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: isCurrent ? `${accent}18` : "rgba(26,26,27,0.06)",
                        border: `1px solid ${isCurrent ? `${accent}35` : "rgba(26,26,27,0.10)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <ModeIcon size={22} color={isCurrent ? accent : "rgba(26,26,27,0.28)"} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isCurrent ? accent : "rgba(26,26,27,0.38)", textTransform: "capitalize", marginBottom: 4 }}>
                          {m}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
                          {isSov ? "Full luxury features" : "Core features only"}
                        </div>
                      </div>
                      {isCurrent && (
                        <span style={{
                          position: "absolute", top: 10, right: 10,
                          fontSize: 9, fontWeight: 700, color: accent,
                          padding: "2px 7px", borderRadius: 4,
                          background: `${accent}18`,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                        }}>
                          {kernel.saving ? "…" : "Active"}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Force refresh */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <motion.button
                  whileTap={!modeRefreshing ? { scale: 0.96 } : {}}
                  onClick={handleModeRefresh}
                  disabled={modeRefreshing}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 10, cursor: modeRefreshing ? "default" : "pointer",
                    background: C.panel, border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 12, fontWeight: 500,
                    opacity: modeRefreshing ? 0.6 : 1,
                  }}
                >
                  <motion.div
                    animate={modeRefreshing ? { rotate: 360 } : { rotate: 0 }}
                    transition={modeRefreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
                    style={{ display: "flex" }}
                  >
                    <RefreshCw size={13} />
                  </motion.div>
                  {modeRefreshing ? "Refreshing…" : "Force Refresh"}
                </motion.button>
                <AnimatePresence>
                  {modeRefreshSuccess && (
                    <motion.span
                      key="rsuccess"
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      style={{ fontSize: 11, color: C.green, fontWeight: 600 }}
                    >
                      <CheckCircle size={12} style={{ display: "inline", marginRight: 4 }} />
                      Refreshed
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Error message */}
              {modeError && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 10,
                  background: `${C.red}10`, border: `1px solid ${C.red}25`,
                  fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <XCircle size={13} />
                  {modeError}
                </div>
              )}

              {/* What changes section */}
              <div style={{
                marginTop: 24, padding: "16px 18px", borderRadius: 14,
                background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 12 }}>
                  What changes with each mode
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Designer",           sovereign: true },
                    { label: "Governance",          sovereign: true },
                    { label: "Central Command",     sovereign: true },
                    { label: "Enterprise Intel",    sovereign: true },
                    { label: "Master Ops",          sovereign: true },
                    { label: "AI Personalization",  sovereign: true },
                    { label: "Orders & Inventory",  sovereign: false },
                    { label: "Loyalty & Rewards",   sovereign: false },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {item.sovereign
                        ? <Crown size={11} color={C.gold} />
                        : <CheckCircle size={11} color={C.green} />}
                      <span style={{ fontSize: 12, color: item.sovereign ? C.text : C.muted }}>
                        {item.label}
                        {item.sovereign && (
                          <span style={{ fontSize: 10, color: C.gold, marginLeft: 4 }}>Sovereign</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Change History ── */}
              <div style={{ marginTop: 28 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={13} color={C.gold} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted }}>
                      Change History
                    </span>
                    {modeHistoryTotal > 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                        background: `${C.gold}14`, border: `1px solid ${C.gold}30`, color: C.gold,
                      }}>{modeHistoryTotal}</span>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => void loadModeHistory()}
                    disabled={modeHistoryLoading}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 8, cursor: modeHistoryLoading ? "default" : "pointer",
                      background: C.panel, border: `1px solid ${C.border}`,
                      color: C.muted, fontSize: 11, fontWeight: 500,
                      opacity: modeHistoryLoading ? 0.55 : 1,
                    }}
                  >
                    <motion.div
                      animate={modeHistoryLoading ? { rotate: 360 } : { rotate: 0 }}
                      transition={modeHistoryLoading ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0 }}
                      style={{ display: "flex" }}
                    >
                      <RefreshCw size={11} />
                    </motion.div>
                    Refresh
                  </motion.button>
                </div>

                {modeHistoryError && (
                  <div style={{
                    marginBottom: 12, padding: "10px 14px", borderRadius: 10,
                    background: `${C.red}10`, border: `1px solid ${C.red}25`,
                    fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <XCircle size={13} />
                    {modeHistoryError}
                  </div>
                )}

                {modeHistoryLoading && modeHistory.length === 0 ? (
                  <div style={{
                    padding: "28px 0", textAlign: "center",
                    color: C.muted, fontSize: 12,
                  }}>
                    <RefreshCw size={16} style={{ marginBottom: 6, opacity: 0.35 }} /><br />
                    Loading history…
                  </div>
                ) : !venueId ? (
                  <div style={{
                    padding: "24px 0", textAlign: "center",
                    color: C.muted, fontSize: 12,
                  }}>
                    No venue selected.
                  </div>
                ) : modeHistory.length === 0 ? (
                  <div style={{
                    padding: "24px 18px", borderRadius: 12, textAlign: "center",
                    background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 12,
                  }}>
                    No mode changes recorded yet. Changes will appear here after the first tier switch.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {modeHistory.map((entry) => {
                      const isSovNew = entry.newMode === "sovereign";
                      const accentNew = isSovNew ? C.gold : C.muted;
                      const NewIcon = isSovNew ? Crown : Zap;
                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 16px", borderRadius: 12,
                            background: "rgba(26,26,27,0.04)", border: `1px solid ${C.border}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                            {/* Old → New arrow */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              {entry.oldMode ? (
                                <>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                    background: entry.oldMode === "sovereign" ? `${C.gold}14` : "rgba(26,26,27,0.10)",
                                    border: `1px solid ${entry.oldMode === "sovereign" ? `${C.gold}30` : "rgba(26,26,27,0.18)"}`,
                                    color: entry.oldMode === "sovereign" ? C.gold : C.muted,
                                    textTransform: "capitalize",
                                  }}>{entry.oldMode}</span>
                                  <ChevronRight size={12} color={C.dim} />
                                </>
                              ) : (
                                <>
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                    background: "rgba(26,26,27,0.07)", border: `1px solid ${C.border}`,
                                    color: C.dim,
                                  }}>—</span>
                                  <ChevronRight size={12} color={C.dim} />
                                </>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <NewIcon size={11} color={accentNew} />
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                  background: isSovNew ? `${C.gold}14` : "rgba(26,26,27,0.10)",
                                  border: `1px solid ${isSovNew ? `${C.gold}30` : "rgba(26,26,27,0.18)"}`,
                                  color: accentNew, textTransform: "capitalize",
                                }}>{entry.newMode}</span>
                              </div>
                            </div>

                            {/* Who */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {entry.changedByName ?? "Unknown user"}
                              </div>
                            </div>
                          </div>

                          {/* When */}
                          <div style={{ flexShrink: 0, textAlign: "right", marginLeft: 12 }}>
                            <div style={{ fontSize: 11, color: C.muted }}>{timeAgo(entry.changedAt)}</div>
                            <div style={{ fontSize: 10, color: C.dim, marginTop: 1 }}>
                              {new Date(entry.changedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Kill Switches ── */}
          {tab === "kill-switches" && (
            <motion.div key="ks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {health && health.disabledSwitches.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px", borderRadius: 10, marginBottom: 16,
                  background: `${C.red}10`, border: `1px solid ${C.red}30`,
                }}>
                  <AlertTriangle size={14} color={C.red} />
                  <span style={{ fontSize: 12, color: C.red }}>
                    {health.disabledSwitches.length} system switch{health.disabledSwitches.length > 1 ? "es" : ""} currently disabled:&nbsp;
                    <strong>{health.disabledSwitches.join(", ")}</strong>
                  </span>
                </div>
              )}

              {swLoading ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>
                  <RefreshCw size={18} style={{ marginBottom: 8, opacity: 0.4 }} /><br />Loading switches…
                </div>
              ) : (
                <>
                  {["commerce", "loyalty", "experience", "identity", "marketing", "intelligence", "operations", "governance"].map(cat => {
                    const catSwitches = switches.filter(s => s.category === cat);
                    if (catSwitches.length === 0) return null;
                    return (
                      <div key={cat} style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: "0.2em",
                          textTransform: "uppercase", color: C.muted, marginBottom: 10,
                        }}>{cat}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {catSwitches.map(sw => (
                            <motion.div key={sw.name}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "14px 18px", borderRadius: 12,
                                background: sw.enabled ? C.panel : `${C.red}08`,
                                border: `1px solid ${sw.enabled ? C.border : `${C.red}25`}`,
                              }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{sw.label}</span>
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: "1px 6px",
                                    borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.1em",
                                    background: `${RISK_COLOR[sw.risk]}18`,
                                    border: `1px solid ${RISK_COLOR[sw.risk]}40`,
                                    color: RISK_COLOR[sw.risk],
                                  }}>{sw.risk} risk</span>
                                </div>
                                <div style={{ fontSize: 11, color: C.muted }}>{sw.description}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: 16 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: sw.enabled ? C.green : C.red,
                                  textTransform: "uppercase", letterSpacing: "0.1em",
                                }}>{sw.enabled ? "ON" : "OFF"}</span>
                                <motion.button
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => toggleSwitch(sw)}
                                  disabled={swToggling === sw.name}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    opacity: swToggling === sw.name ? 0.5 : 1,
                                    color: sw.enabled ? C.green : C.red,
                                    display: "flex", alignItems: "center",
                                  }}>
                                  {sw.enabled
                                    ? <ToggleRight size={32} />
                                    : <ToggleLeft size={32} />}
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

          {/* ── Role Matrix ── */}
          {tab === "role-matrix" && (
            <motion.div key="rm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Permission legend */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 20 }}>
                {Object.entries(rolePerms).map(([role, info]) => (
                  <div key={role} style={{
                    padding: "12px 14px", borderRadius: 12,
                    background: C.panel, border: `1px solid ${info.color}30`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: info.color }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{info.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {info.permissions.slice(0, 4).map(p => (
                        <div key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Unlock size={9} color={C.green} />
                          <span style={{ fontSize: 10, color: C.muted }}>{p === "*" ? "All permissions" : p.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                      {info.denied.slice(0, 2).map(p => (
                        <div key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Lock size={9} color={C.red} />
                          <span style={{ fontSize: 10, color: `${C.red}80` }}>{p.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* User list */}
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
                Users & Roles
              </div>
              {roleLoading ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>Loading users…</div>
              ) : users.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { id: "mu1", name: "Marcus Rivera",  email: "marcus@thevault.co",  role: "manager",     venueId: "v1", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
                    { id: "mu2", name: "Sofia Reyes",    email: "sofia@thevault.co",   role: "venue_owner", venueId: "v1", createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
                    { id: "mu3", name: "Omar Chen",      email: "omar@thevault.co",    role: "staff",       venueId: "v1", createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
                    { id: "mu4", name: "NOVEE Admin", email: "admin@novee-os.com",  role: "super_admin", venueId: null, createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
                  ].map(u => (
                    <motion.div key={u.id} whileHover={{ x: 2 }}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: C.panel, border: `1px solid ${C.border}`,
                        cursor: "pointer",
                      }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</span>
                        <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{u.email}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px",
                          borderRadius: 999, textTransform: "capitalize",
                          background: `${ROLE_COLOR[u.role] ?? C.muted}18`,
                          border: `1px solid ${ROLE_COLOR[u.role] ?? C.muted}40`,
                          color: ROLE_COLOR[u.role] ?? C.muted,
                        }}>{u.role.replace(/_/g, " ")}</span>
                        <ChevronRight size={14} color={C.dim} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {users.map(u => (
                    <motion.div key={u.id} whileHover={{ x: 2 }}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: 10,
                        background: C.panel, border: `1px solid ${C.border}`,
                        cursor: "pointer",
                      }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</span>
                        <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{u.email}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px",
                          borderRadius: 999, textTransform: "capitalize",
                          background: `${ROLE_COLOR[u.role] ?? C.muted}18`,
                          border: `1px solid ${ROLE_COLOR[u.role] ?? C.muted}40`,
                          color: ROLE_COLOR[u.role] ?? C.muted,
                        }}>{u.role.replace(/_/g, " ")}</span>
                        <ChevronRight size={14} color={C.dim} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Automation Queue ── */}
          {tab === "automation-queue" && (
            <motion.div key="aq" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>
                High-impact automation actions require manual approval before firing. Low-risk actions execute automatically.
              </div>
              {queueLoading ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>Loading queue…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {queue.map(item => (
                    <motion.div key={item.id}
                      style={{
                        padding: "16px 18px", borderRadius: 14,
                        background: item.status === "pending" ? `${C.amber}06` : C.panel,
                        border: `1px solid ${item.status === "pending" ? `${C.amber}30` : C.border}`,
                      }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.title}</span>
                            <CategoryBadge cat={item.category} />
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                              textTransform: "uppercase",
                              background: `${STATUS_COLOR[item.status]}18`,
                              border: `1px solid ${STATUS_COLOR[item.status]}40`,
                              color: STATUS_COLOR[item.status],
                            }}>{item.status}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{item.insight}</div>
                          <div style={{
                            padding: "8px 12px", borderRadius: 8,
                            background: "rgba(26,26,27,0.05)", border: `1px solid ${C.border}`,
                            fontSize: 11, color: C.dim, fontStyle: "italic", marginBottom: 8,
                          }}>"{item.messageBody}"</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 10, color: C.muted }}>Channel: <strong style={{ color: C.text }}>{item.channel.toUpperCase()}</strong></span>
                            <span style={{ fontSize: 10, color: C.muted }}>Score: <strong style={{ color: C.gold }}>{item.metaScore}</strong>/100</span>
                            <span style={{ fontSize: 10, color: C.dim }}>{timeAgo(item.requestedAt)}</span>
                          </div>
                          {item.decidedBy && (
                            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                              Decided by {item.decidedBy} · {item.decidedAt ? timeAgo(item.decidedAt) : ""}
                            </div>
                          )}
                        </div>
                        {item.status === "pending" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                            <motion.button whileTap={{ scale: 0.93 }}
                              disabled={deciding === item.id}
                              onClick={() => decideAutomation(item.id, "approved")}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                                background: `${C.green}15`, border: `1px solid ${C.green}40`,
                                color: C.green, fontSize: 11, fontWeight: 700,
                                opacity: deciding === item.id ? 0.5 : 1,
                              }}>
                              <CheckCircle size={12} /> Approve
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.93 }}
                              disabled={deciding === item.id}
                              onClick={() => decideAutomation(item.id, "rejected")}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                                background: `${C.red}10`, border: `1px solid ${C.red}30`,
                                color: C.red, fontSize: 11, fontWeight: 700,
                                opacity: deciding === item.id ? 0.5 : 1,
                              }}>
                              <XCircle size={12} /> Reject
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Audit Stream ── */}
          {tab === "audit-stream" && (
            <motion.div key="as" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {auditLoading && audit.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, padding: 40, textAlign: "center" }}>Loading audit log…</div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {audit.map(e => (
                      <div key={e.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "10px 14px", borderRadius: 10,
                        background: C.panel, border: `1px solid ${C.border}`,
                      }}>
                        <Activity size={12} color={C.gold} style={{ marginTop: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "monospace" }}>{e.action}</span>
                            <CategoryBadge cat={e.entityType} />
                            {e.actorRole && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                                textTransform: "capitalize",
                                color: ROLE_COLOR[e.actorRole] ?? C.muted,
                                background: `${ROLE_COLOR[e.actorRole] ?? C.muted}15`,
                                border: `1px solid ${ROLE_COLOR[e.actorRole] ?? C.muted}30`,
                              }}>{e.actorRole.replace(/_/g, " ")}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: C.dim }}>
                            {e.ipAddress && <span>{e.ipAddress} · </span>}
                            <span>{timeAgo(e.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {auditCursor && (
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => loadAudit(auditCursor)}
                      disabled={auditLoading}
                      style={{
                        marginTop: 12, width: "100%", padding: "10px",
                        borderRadius: 10, background: C.panel, border: `1px solid ${C.border}`,
                        color: C.muted, fontSize: 12, cursor: "pointer",
                        opacity: auditLoading ? 0.5 : 1,
                      }}>
                      {auditLoading ? "Loading…" : "Load more"}
                    </motion.button>
                  )}
                  {audit.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {[
                      { id: "a1", action: "auth.pin_login",       entityType: "auth",      actorRole: "manager",      ipAddress: "192.168.1.44", createdAt: new Date(Date.now() - 3 * 60000).toISOString() },
                      { id: "a2", action: "inventory.decrement",  entityType: "inventory", actorRole: "staff",        ipAddress: "192.168.1.12", createdAt: new Date(Date.now() - 18 * 60000).toISOString() },
                      { id: "a3", action: "order.complete",       entityType: "order",     actorRole: "staff",        ipAddress: "192.168.1.12", createdAt: new Date(Date.now() - 31 * 60000).toISOString() },
                      { id: "a4", action: "feature.kill_switch",  entityType: "governance",actorRole: "super_admin",  ipAddress: "10.0.0.1",     createdAt: new Date(Date.now() - 94 * 60000).toISOString() },
                      { id: "a5", action: "auth.staff_switch",    entityType: "auth",      actorRole: "manager",      ipAddress: "192.168.1.44", createdAt: new Date(Date.now() - 180 * 60000).toISOString() },
                    ].map(e => (
                      <div key={e.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "10px 14px", borderRadius: 10,
                        background: C.panel, border: `1px solid ${C.border}`,
                      }}>
                        <Activity size={12} color={C.gold} style={{ marginTop: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "monospace" }}>{e.action}</span>
                            <CategoryBadge cat={e.entityType} />
                            {e.actorRole && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                                textTransform: "capitalize" as const,
                                color: ROLE_COLOR[e.actorRole] ?? C.muted,
                                background: `${ROLE_COLOR[e.actorRole] ?? C.muted}15`,
                                border: `1px solid ${ROLE_COLOR[e.actorRole] ?? C.muted}30`,
                              }}>{e.actorRole.replace(/_/g, " ")}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: C.dim }}>
                            {e.ipAddress && <span>{e.ipAddress} · </span>}
                            <span>{timeAgo(e.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Role change modal ── */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(26,26,27,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 200, backdropFilter: "blur(6px)",
            }}
            onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 380, background: "#0d0a12",
                border: `1px solid ${C.border}`, borderRadius: 20,
                padding: 24, boxShadow: "0 24px 80px rgba(26,26,27,0.32)",
              }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, marginBottom: 4 }}>Change Role</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                {selectedUser.name} · {selectedUser.email}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["venue_owner", "manager", "staff", "brand_partner", "customer"].map(role => (
                  <motion.button key={role} whileTap={{ scale: 0.97 }}
                    disabled={roleChanging}
                    onClick={() => changeRole(selectedUser.id, role)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                      background: selectedUser.role === role ? `${ROLE_COLOR[role] ?? C.muted}15` : C.panel,
                      border: `1px solid ${selectedUser.role === role ? `${ROLE_COLOR[role] ?? C.muted}40` : C.border}`,
                      color: ROLE_COLOR[role] ?? C.muted,
                      fontSize: 13, fontWeight: 600,
                      opacity: roleChanging ? 0.5 : 1,
                    }}>
                    <span style={{ textTransform: "capitalize" }}>{role.replace(/_/g, " ")}</span>
                    {selectedUser.role === role && <CheckCircle size={14} />}
                  </motion.button>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedUser(null)}
                style={{
                  marginTop: 16, width: "100%", padding: "10px",
                  borderRadius: 10, background: "transparent",
                  border: `1px solid ${C.border}`, color: C.muted,
                  fontSize: 12, cursor: "pointer",
                }}>Cancel</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mode confirm modal ── */}
      <AnimatePresence>
        {modeConfirmOpen && pendingMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setModeConfirmOpen(false); setPendingMode(null); }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(6,4,10,0.70)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 360, background: "#0d0a12",
                border: `1px solid ${C.border}`, borderRadius: 20,
                padding: 24, boxShadow: "0 24px 80px rgba(26,26,27,0.32)",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                {pendingMode === "sovereign" ? <Crown size={18} color={C.gold} /> : <Zap size={18} color={C.muted} />}
                <div style={{ fontSize: 16, fontWeight: 700, color: C.gold }}>Change Mode</div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.55 }}>
                {pendingMode === "essential"
                  ? "Switch to Essential mode? This will lock luxury features for this venue."
                  : "Switch to Sovereign mode? This will unlock luxury add-ons, AI personalization, and premium analytics for this venue."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => applyMode(pendingMode)}
                  disabled={kernel.saving}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer",
                    background: pendingMode === "sovereign"
                      ? "linear-gradient(135deg, #D48B00, #b87700)"
                      : "rgba(26,26,27,0.20)",
                    border: `1px solid ${pendingMode === "sovereign" ? C.gold : "rgba(26,26,27,0.30)"}`,
                    color: pendingMode === "sovereign" ? "#1A1A1B" : C.text,
                    fontSize: 13, fontWeight: 700,
                    opacity: kernel.saving ? 0.6 : 1,
                  }}>
                  {kernel.saving ? "Saving…" : `Confirm`}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => { setModeConfirmOpen(false); setPendingMode(null); }}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 10, cursor: "pointer",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 13, fontWeight: 600,
                  }}>Cancel</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
