/**
 * Sovereign Hardware Labs — /hardware-lab
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 * Biometric node registry: manage authorized rings, watches, bands, pucks.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Shield, Plus, Trash2, RefreshCw, Loader, Check,
  Radio, Activity, Cpu, ChevronRight, Lock, Unlock,
  Watch, Fingerprint, X,
} from "lucide-react";
import SovereignWatermark from "@/components/SovereignWatermark";

export const SOVEREIGN_SESSION_KEY = "SOVEREIGN_SESSION";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     "#050505",
  surface:"rgba(18,15,12,0.98)",
  card:   "#141210",
  border: "rgba(212,175,55,0.18)",
  borderB:"rgba(212,175,55,0.35)",
  gold:   "#D4AF37",
  amber:  "#B89030",
  ink:    "#F5F2ED",
  muted:  "rgba(245,242,237,0.45)",
  dim:    "rgba(245,242,237,0.22)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
  green:  "#22c55e",
  red:    "#ef4444",
  blue:   "#3b82f6",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = "RING" | "WATCH" | "BAND" | "PUCK" | "OTHER";

interface HardwareNode {
  id: number;
  hardware_id: string;
  node_type: NodeType;
  label: string | null;
  authorized: boolean;
  last_sync_at: string | null;
  last_sync_payload: Record<string, unknown> | null;
  registered_at: string;
}

// ── Icons per type ─────────────────────────────────────────────────────────────

function NodeIcon({ type, size = 16, color }: { type: NodeType; size?: number; color: string }) {
  if (type === "RING")  return <Fingerprint size={size} color={color} />;
  if (type === "WATCH") return <Watch size={size} color={color} />;
  if (type === "BAND")  return <Activity size={size} color={color} />;
  if (type === "PUCK")  return <Radio size={size} color={color} />;
  return <Cpu size={size} color={color} />;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function AuthBadge({ authorized }: { authorized: boolean }) {
  return authorized ? (
    <span className="sovereign-breath" style={{ fontSize: 8, fontWeight: 700, color: C.green, letterSpacing: "0.16em", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", padding: "3px 8px", borderRadius: 4 }}>
      ● AUTHORIZED
    </span>
  ) : (
    <span style={{ fontSize: 8, fontWeight: 700, color: C.red, letterSpacing: "0.16em", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", padding: "3px 8px", borderRadius: 4 }}>
      ✕ REVOKED
    </span>
  );
}

// ── Sync payload renderer ─────────────────────────────────────────────────────

function SyncPayload({ payload }: { payload: Record<string, unknown> | null }) {
  if (!payload) return <span style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em" }}>NO SYNC DATA</span>;
  const fields: Array<[string, string]> = [
    ["HR",   payload.heart_rate   != null ? `${payload.heart_rate} BPM` : "—"],
    ["TEMP", payload.temperature  != null ? `${payload.temperature}°C` : "—"],
    ["STR",  payload.stress_index != null ? `${payload.stress_index}/100` : "—"],
    ["SIG",  payload.signal_db    != null ? `${payload.signal_db} dB` : "—"],
  ];
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {fields.map(([k, v]) => (
        <div key={k} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 7, color: C.dim, letterSpacing: "0.16em" }}>{k}</div>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Add Node Modal ─────────────────────────────────────────────────────────────

function AddNodeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [hardwareId, setHwId]   = useState("");
  const [nodeType, setType]     = useState<NodeType>("RING");
  const [label, setLabel]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const submit = async () => {
    if (!hardwareId.trim()) { setErr("Hardware ID is required"); return; }
    setSaving(true); setErr("");
    try {
      const res  = await fetch("/api/biometric/nodes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardware_id: hardwareId.trim(), node_type: nodeType, label: label.trim() || undefined }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { onAdded(); onClose(); }
      else setErr(data.error ?? "Failed to add node");
    } catch { setErr("Network error"); }
    finally { setSaving(false); }
  };

  const NODE_TYPES: NodeType[] = ["RING", "WATCH", "BAND", "PUCK", "OTHER"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: "32px 28px", width: "100%", maxWidth: 440, position: "relative" }}>

        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.dim }}>
          <X size={16} />
        </button>

        <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.24em", marginBottom: 6 }}>SOVEREIGN HARDWARE LABS</div>
        <div style={{ fontSize: 18, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 24, fontWeight: 300 }}>Register New Node</div>

        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 7 }}>HARDWARE ID</div>
          <input value={hardwareId} onChange={e => setHwId(e.target.value)} placeholder="e.g. SOV_RING_02"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 7, background: "rgba(245,242,237,0.04)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", boxSizing: "border-box" }} />
        </label>

        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 7 }}>NODE TYPE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {NODE_TYPES.map(t => (
              <motion.button key={t} whileTap={{ scale: 0.95 }} onClick={() => setType(t)}
                style={{ padding: "7px 14px", borderRadius: 6, background: nodeType === t ? `${C.gold}18` : "rgba(245,242,237,0.04)", border: `1px solid ${nodeType === t ? C.gold : C.border}`, color: nodeType === t ? C.gold : C.muted, fontSize: 9, fontWeight: nodeType === t ? 700 : 400, cursor: "pointer", letterSpacing: "0.12em", fontFamily: C.mono }}>
                {t}
              </motion.button>
            ))}
          </div>
        </label>

        <label style={{ display: "block", marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 7 }}>LABEL <span style={{ color: C.dim }}>(optional)</span></div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Sovereign Watch — Clark Field Unit"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 7, background: "rgba(245,242,237,0.04)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", boxSizing: "border-box" }} />
        </label>

        {err && <div style={{ fontSize: 9, color: C.red, letterSpacing: "0.12em", marginBottom: 14 }}>{err}</div>}

        <motion.button whileTap={{ scale: 0.95 }} onClick={submit} disabled={saving}
          style={{ width: "100%", padding: "13px", borderRadius: 8, background: saving ? "rgba(212,175,55,0.20)" : C.gold, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", letterSpacing: "0.14em", fontFamily: C.mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {saving ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> REGISTERING…</> : <><Shield size={12} /> AUTHORIZE NODE</>}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SovereignHardwareLab() {
  const [, navigate] = useLocation();
  const [nodes, setNodes]       = useState<HardwareNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [testId, setTestId]     = useState("");
  const [testResult, setTestRes]= useState<{ authenticated: boolean; node_type?: string; label?: string; reason?: string } | null>(null);
  const [testing, setTesting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/biometric/nodes");
      const data = await res.json() as { nodes?: HardwareNode[] };
      setNodes(data.nodes ?? []);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (id: number) => {
    setRevoking(id);
    try {
      await fetch(`/api/biometric/nodes/${id}`, { method: "DELETE" });
      await load();
    } finally { setRevoking(null); }
  };

  const testAuth = async () => {
    if (!testId.trim()) return;
    setTesting(true); setTestRes(null);
    try {
      const res  = await fetch("/api/biometric/authenticate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardware_id: testId.trim() }),
      });
      const data = await res.json() as { authenticated: boolean; node_type?: string; label?: string; reason?: string };
      setTestRes(data);
    } catch { setTestRes({ authenticated: false, reason: "NETWORK_ERROR" }); }
    finally { setTesting(false); }
  };

  const authorizedCount = nodes.filter(n => n.authorized).length;
  const revokedCount    = nodes.filter(n => !n.authorized).length;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.ink, fontFamily: C.mono, display: "flex", flexDirection: "column" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 160, background: "radial-gradient(ellipse,rgba(212,175,55,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,5,5,0.96)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/distribution")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer" }}>
          ← VAULT
        </motion.button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={16} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>SOVEREIGN HARDWARE LABS</div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>BIOMETRIC NODE REGISTRY · TITAN V KERNEL · 360 ENTERPRISES</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={load}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: `${C.gold}10`, border: `1px solid ${C.border}`, color: C.muted, fontSize: 9, cursor: "pointer", letterSpacing: "0.12em" }}>
            <RefreshCw size={11} /> REFRESH
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: C.gold, border: "none", color: "#050505", fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em" }}>
            <Plus size={11} /> ADD NODE
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "TOTAL NODES",  value: nodes.length,      color: C.gold },
            { label: "AUTHORIZED",   value: authorizedCount,   color: C.green },
            { label: "REVOKED",      value: revokedCount,      color: C.red },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.22em", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, color: s.color, fontFamily: C.serif, letterSpacing: "0.06em" }}>{s.value}</div>
            </div>
          ))}

          {/* Live auth tester */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px", gridColumn: "span 2" }}>
            <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 10 }}>AUTHENTICATE NODE</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={testId} onChange={e => { setTestId(e.target.value); setTestRes(null); }}
                placeholder="Enter hardware_id…"
                onKeyDown={e => e.key === "Enter" && testAuth()}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 7, background: "rgba(245,242,237,0.04)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontFamily: C.mono, outline: "none" }} />
              <motion.button whileTap={{ scale: 0.94 }} onClick={testAuth} disabled={testing || !testId.trim()}
                style={{ padding: "9px 18px", borderRadius: 7, background: testId.trim() ? C.gold : "rgba(212,175,55,0.15)", border: "none", color: "#050505", fontSize: 9, fontWeight: 800, cursor: testId.trim() ? "pointer" : "not-allowed", letterSpacing: "0.12em", fontFamily: C.mono, display: "flex", alignItems: "center", gap: 6 }}>
                {testing ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Fingerprint size={11} />} AUTH
              </motion.button>
            </div>
            <AnimatePresence>
              {testResult && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 10, padding: "10px 14px", borderRadius: 7, background: testResult.authenticated ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${testResult.authenticated ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.22)"}`, display: "flex", alignItems: "center", gap: 10 }}>
                  {testResult.authenticated
                    ? <Check size={13} color={C.green} />
                    : <X size={13} color={C.red} />}
                  <div>
                    <div style={{ fontSize: 10, color: testResult.authenticated ? C.green : C.red, fontWeight: 700, letterSpacing: "0.12em" }}>
                      {testResult.authenticated ? "AUTHENTICATED" : `REJECTED — ${testResult.reason}`}
                    </div>
                    {testResult.authenticated && (
                      <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{testResult.node_type} · {testResult.label}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Node table header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em" }}>REGISTERED NODES</div>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px", color: C.muted, fontSize: 10 }}>
            <Loader size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} /> LOADING REGISTRY…
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {nodes.map((node, i) => (
            <motion.div key={node.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ background: C.card, border: `1px solid ${node.authorized ? C.border : "rgba(239,68,68,0.14)"}`, borderRadius: 12, padding: "18px 20px" }}>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 11, background: node.authorized ? `${C.gold}12` : "rgba(239,68,68,0.08)", border: `1px solid ${node.authorized ? C.border : "rgba(239,68,68,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <NodeIcon type={node.node_type} size={18} color={node.authorized ? C.gold : C.red} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, letterSpacing: "0.08em" }}>{node.hardware_id}</span>
                    <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em", background: "rgba(245,242,237,0.06)", padding: "2px 7px", borderRadius: 4 }}>{node.node_type}</span>
                    <AuthBadge authorized={node.authorized} />
                  </div>
                  {node.label && (
                    <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>{node.label}</div>
                  )}
                  <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                    <SyncPayload payload={node.last_sync_payload} />
                    {node.last_sync_at && (
                      <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>
                        LAST SYNC {new Date(node.last_sync_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    <div style={{ fontSize: 8, color: `${C.dim}70`, letterSpacing: "0.12em" }}>
                      REG {new Date(node.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {node.authorized ? (
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => revoke(node.id)}
                      disabled={revoking === node.id}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: C.red, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em" }}>
                      {revoking === node.id ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={10} />}
                      REVOKE
                    </motion.button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 9, color: C.dim, letterSpacing: "0.10em" }}>
                      <Lock size={10} /> LOCKED
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Python interop reference */}
        <div style={{ marginTop: 36, padding: "18px 20px", background: "rgba(212,175,55,0.04)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 10 }}>TITAN V KERNEL INTEROP</div>
          <pre style={{ margin: 0, fontSize: 9, color: C.dim, lineHeight: 1.9, fontFamily: C.mono, whiteSpace: "pre-wrap" }}>{
`POST /api/biometric/authenticate  { "hardware_id": "SOV_RING_01" }
POST /api/biometric/sync          { "node_id": "SOV_RING_01", "heart_rate": 72, "stress_index": 31 }
GET  /api/biometric/nodes
POST /api/biometric/nodes         { "hardware_id": "SOV_RING_02", "node_type": "RING", "label": "…" }
DELETE /api/biometric/nodes/:id   — revoke`
          }</pre>
        </div>
      </div>

      <SovereignWatermark />

      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,5,5,0.96)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em" }}>SOVEREIGN OPERATOR: JC · 360 ENTERPRISES SERVICES LLC</span>
        <span style={{ fontSize: 8, color: `${C.gold}45`, letterSpacing: "0.14em" }}>NOVEE OS · TITAN V HARDWARE LABS · 5.2.0</span>
      </div>

      <AnimatePresence>
        {showAdd && <AddNodeModal onClose={() => setShowAdd(false)} onAdded={load} />}
      </AnimatePresence>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
