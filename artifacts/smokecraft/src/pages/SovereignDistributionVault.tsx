/**
 * Sovereign Distribution Vault — /distribution
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 * Full toolbar audit + wiring: Shipments, Keys, Live Nodes, Deploy, Hardware, War Room
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Package, Key, Monitor, Truck, Globe, Mail,
  Copy, Check, Lock, Unlock, Download, RefreshCw, Plus,
  ChevronRight, AlertTriangle, Server, Zap, Shield, LogOut,
  Cpu, Radio, CheckCircle2, XCircle, Clock, Activity,
  HardDrive, Wifi, TriangleAlert, Info, Bug,
} from "lucide-react";
import { SovereignDistro } from "@/lib/sovereignDistro";
import { socket }          from "@/lib/socket";
import SovereignWatermark  from "@/components/SovereignWatermark";

export const SOVEREIGN_SESSION_KEY = "SOVEREIGN_SESSION";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:       "#050A14",
  surface:  "rgba(6,12,28,0.98)",
  card:     "rgba(8,18,40,0.96)",
  press:    "rgba(10,24,52,0.92)",
  border:   "rgba(0,128,255,0.14)",
  borderB:  "rgba(0,170,255,0.38)",
  gold:     "#0080FF",
  amber:    "#22AAFF",
  ink:      "#D8EEFF",
  muted:    "rgba(180,210,250,0.50)",
  dim:      "rgba(140,175,220,0.28)",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
  sans:     "'Inter',sans-serif",
  green:    "#22c55e",
  red:      "#ef4444",
  orange:   "#f97316",
  blue:     "#0080FF",
  purple:   "#A78BFA",
};

const DEVICE_TYPES = ["Mirror", "Table", "Vehicle"] as const;
type DeviceType = typeof DEVICE_TYPES[number];
const DEVICE_ICONS: Record<DeviceType, typeof Monitor> = { Mirror: Monitor, Table: Server, Vehicle: Truck };

// ── Shared primitives ─────────────────────────────────────────
function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 800, color: C.amber, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function VaultInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <GoldLabel>{label}</GoldLabel>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 7, background: C.press, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function VaultSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <GoldLabel>{label}</GoldLabel>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 7, background: C.press, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", small }: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; variant?: "primary" | "ghost" | "danger" | "green" | "orange"; small?: boolean;
}) {
  const bg  = variant === "primary" ? C.gold : variant === "green" ? "rgba(34,197,94,0.12)" : variant === "danger" ? "rgba(239,68,68,0.12)" : variant === "orange" ? "rgba(249,115,22,0.12)" : "rgba(0,128,255,0.07)";
  const col = variant === "primary" ? "#050A14" : variant === "green" ? C.green : variant === "danger" ? C.red : variant === "orange" ? C.orange : C.gold;
  const bdr = variant === "primary" ? C.gold : variant === "green" ? "rgba(34,197,94,0.35)" : variant === "danger" ? "rgba(239,68,68,0.35)" : variant === "orange" ? "rgba(249,115,22,0.35)" : C.border;
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} disabled={disabled}
      style={{ padding: small ? "7px 14px" : "10px 20px", borderRadius: 8, background: bg, border: `1px solid ${bdr}`, color: col, fontSize: small ? 10 : 12, fontFamily: C.mono, fontWeight: 700, letterSpacing: "0.10em", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, display: "flex", alignItems: "center", gap: 7 }}>
      {children}
    </motion.button>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${accent ? `${accent}28` : C.border}`, borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`, padding: "20px 22px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const col = status === "AUTHORIZED" ? C.green : status === "PENDING" ? C.orange : status === "ACTIVE" ? C.gold : status === "LOCKED" ? C.red : status === "REVOKED" ? C.red : status === "COMPLETED" ? C.green : status === "IN_PROGRESS" ? C.amber : C.muted;
  return (
    <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 800, color: col, background: `${col}14`, border: `1px solid ${col}35`, padding: "3px 9px", borderRadius: 5, letterSpacing: "0.12em" }}>
      {status}
    </span>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={copy}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: copied ? C.green : C.amber }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </motion.button>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: C.dim, fontFamily: C.mono }}>
      <Icon size={28} color={`${C.blue}40`} style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 11, letterSpacing: "0.14em", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.7 }}>{hint}</div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: C.amber, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.14em" }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} style={{ display: "inline-block", marginBottom: 12 }}>
        <RefreshCw size={18} />
      </motion.div>
      <div>{label}</div>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────
const TABS = [
  { id: "shipments", label: "Shipments",  icon: Package  },
  { id: "keys",      label: "Keys",       icon: Key      },
  { id: "nodes",     label: "Live Nodes", icon: Monitor  },
  { id: "deploy",    label: "Deploy",     icon: Zap      },
  { id: "hardware",  label: "Hardware",   icon: Cpu      },
  { id: "war-room",  label: "War Room",   icon: Radio    },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Types ─────────────────────────────────────────────────────
interface Batch {
  id: number; manufacturer_name: string; order_qty: number; device_type: string;
  authorized: boolean; legal_entity: string; contact_email: string | null;
  created_at: string; key_count: string; activated_count: string; node_count: string;
}
interface ActivationKey {
  id: number; batch_id: number; key_value: string; serial_prefix: string;
  activated: boolean; activated_at: string | null; node_id: string | null; created_at: string;
}
interface Node {
  id: number; serial_number: string; batch_id: number; key_value: string;
  status: string; ip_address: string; registered_at: string;
  manufacturer_name: string; device_type: string; batch_authorized: boolean;
}
interface Deployment {
  id: number; batch_id: number | null; target: string; package: string;
  status: string; notes: string | null; started_at: string | null;
  completed_at: string | null; created_at: string;
  manufacturer_name?: string; device_type?: string;
}
interface WarRoomEvent {
  id: number; severity: string; category: string; title: string;
  description: string | null; source: string | null;
  acknowledged: boolean; ack_by: string | null; ack_at: string | null;
  created_at: string;
}
interface HardwareDevice {
  id: number; device_label: string; device_type: string; firmware: string;
  signal_state: string; sensor_state: string; last_seen: string;
  ip_address: string | null; notes: string | null; created_at: string;
}
interface VaultStatus {
  online: boolean; mode: string; version: string;
  batches: { total: number; authorized: number };
  nodes: { total: number; authorized: number; pending: number };
  deployments: number; lastSync: string | null;
}

// ── Shipments Tab ─────────────────────────────────────────────
function ShipmentsTab({
  batches, loading, onRefresh, onSelectBatch, selectedBatchId,
}: {
  batches: Batch[]; loading: boolean; onRefresh: () => void;
  onSelectBatch: (id: number) => void; selectedBatchId: number | null;
}) {
  const [form, setForm] = useState({ manufacturerName: "", orderQty: "1", deviceType: "Mirror", contactEmail: "" });
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ batchId: number; keyCount: number; preview: string[] } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!form.manufacturerName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/distribution/batches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manufacturerName: form.manufacturerName.trim(), orderQty: parseInt(form.orderQty) || 1, deviceType: form.deviceType, contactEmail: form.contactEmail || undefined }),
      });
      const data = await res.json();
      setResult(data); setShowForm(false); onRefresh();
    } finally { setCreating(false); }
  };

  const toggleAuth = async (batchId: number) => {
    const res = await fetch(`/api/distribution/batches/${batchId}/authorize`, { method: "PUT" });
    const data = await res.json() as { authorized: boolean };
    if (data.authorized) SovereignDistro.authorizeNode(`BATCH-${batchId}`, batchId);
    onRefresh();
  };

  const pending   = batches.filter(b => !b.authorized).length;
  const authorized = batches.filter(b => b.authorized).length;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Shipments", value: batches.length, color: C.gold },
          { label: "Authorized",      value: authorized,      color: C.green },
          { label: "Pending Auth",    value: pending,         color: C.orange },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 10, border: `1px solid ${s.color}22`, padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: C.serif }}>{s.value}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", fontFamily: C.mono, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn onClick={() => { setShowForm(!showForm); setResult(null); }}><Plus size={14} /> Create New Shipment</Btn>
        <Btn variant="ghost" onClick={onRefresh} small><RefreshCw size={12} /> Refresh</Btn>
        {loading && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.14em" }}>LOADING…</span>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card accent={C.gold}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 18 }}>NEW SHIPMENT MANIFEST</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <VaultInput label="Manufacturer Name" value={form.manufacturerName} onChange={v => setForm(f => ({ ...f, manufacturerName: v }))} placeholder="e.g. Prestige Glass Systems LLC" />
                </div>
                <VaultInput label="Order Quantity" value={form.orderQty} onChange={v => setForm(f => ({ ...f, orderQty: v }))} type="number" placeholder="1" />
                <VaultSelect label="Device Type" value={form.deviceType} onChange={v => setForm(f => ({ ...f, deviceType: v }))} options={[...DEVICE_TYPES]} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <VaultInput label="Contact Email (optional)" value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} type="email" placeholder="mfg@example.com" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <Btn onClick={submit} disabled={creating}>
                  {creating ? <><RefreshCw size={13} /> Generating…</> : <><Package size={13} /> Issue Shipment</>}
                </Btn>
                <Btn variant="ghost" onClick={() => setShowForm(false)} small>Cancel</Btn>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card accent={C.green}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Check size={16} color={C.green} />
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: C.serif, letterSpacing: "0.10em" }}>
                  SHIPMENT #{result.batchId} CREATED — {result.keyCount} ACTIVATION KEYS ISSUED
                </div>
              </div>
              <GoldLabel>Key Preview (first 3)</GoldLabel>
              {result.preview.map(k => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 10, color: C.amber, marginBottom: 6 }}>
                  {k} <CopyBtn value={k} />
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <Btn variant="ghost" small onClick={() => { onSelectBatch(result.batchId); setResult(null); }}>
                  <Key size={11} /> View All Keys <ChevronRight size={11} />
                </Btn>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {batches.length === 0 && !loading && (
        <EmptyState icon={Package} title="NO SHIPMENTS ISSUED YET" hint={"Create a new shipment to begin distribution.\nShipments generate unique activation keys for each device."} />
      )}

      {batches.map(b => {
        const DevIcon = DEVICE_ICONS[b.device_type as DeviceType] ?? Package;
        const isSelected = selectedBatchId === b.id;
        return (
          <motion.div key={b.id} layout
            style={{ background: isSelected ? `${C.gold}08` : C.card, borderRadius: 12, border: `1px solid ${isSelected ? `${C.gold}35` : C.border}`, borderLeft: `3px solid ${b.authorized ? C.green : C.orange}`, padding: "16px 20px", marginBottom: 12, cursor: "pointer" }}
            onClick={() => onSelectBatch(b.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${b.authorized ? C.green : C.orange}14`, border: `1px solid ${b.authorized ? C.green : C.orange}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DevIcon size={18} color={b.authorized ? C.green : C.orange} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.serif, letterSpacing: "0.06em" }}>{b.manufacturer_name}</span>
                  <StatusChip status={b.authorized ? "AUTHORIZED" : "PENDING"} />
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.dim }}>#{b.id}</span>
                </div>
                <div style={{ display: "flex", gap: 18 }}>
                  {[["Type", b.device_type], ["Qty", b.order_qty], ["Keys", `${b.activated_count}/${b.key_count} activated`], ["Nodes", `${b.node_count} registered`]].map(([k, v]) => (
                    <div key={k as string}>
                      <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em", fontFamily: C.mono }}>{k as string}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <motion.button whileTap={{ scale: 0.94 }}
                  onClick={e => { e.stopPropagation(); toggleAuth(b.id); }}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, border: `1px solid ${b.authorized ? `${C.green}35` : `${C.orange}35`}`, background: b.authorized ? `${C.green}12` : `${C.orange}12`, color: b.authorized ? C.green : C.orange, fontSize: 10, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.10em", cursor: "pointer" }}>
                  {b.authorized ? <><Unlock size={12} /> AUTHORIZED</> : <><Lock size={12} /> AUTHORIZE</>}
                </motion.button>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: C.mono }}>{new Date(b.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Keys Tab ──────────────────────────────────────────────────
function KeysTab({ batches, selectedBatchId, onSelectBatch }: {
  batches: Batch[]; selectedBatchId: number | null; onSelectBatch: (id: number) => void;
}) {
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [loading, setLoading] = useState(false);
  const batchId = selectedBatchId ?? batches[0]?.id ?? null;

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/distribution/batches/${id}/keys`);
      const data = await res.json();
      setKeys(data.keys ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (batchId != null) load(batchId); }, [batchId, load]);

  const active  = keys.filter(k => k.activated).length;
  const unused  = keys.filter(k => !k.activated).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {batches.map(b => (
          <motion.button key={b.id} whileTap={{ scale: 0.95 }}
            onClick={() => { onSelectBatch(b.id); load(b.id); }}
            style={{ padding: "7px 14px", borderRadius: 8, fontFamily: C.mono, fontSize: 10, fontWeight: batchId === b.id ? 800 : 400, letterSpacing: "0.10em", background: batchId === b.id ? `${C.gold}18` : "transparent", border: `1px solid ${batchId === b.id ? C.gold : C.border}`, color: batchId === b.id ? C.gold : C.muted, cursor: "pointer" }}>
            #{b.id} · {b.manufacturer_name}
          </motion.button>
        ))}
      </div>

      {batchId == null && (
        <EmptyState icon={Key} title="NO ACTIVATION KEYS YET" hint={"Select a shipment batch above to view its keys.\nCreate a shipment first via the Shipments tab."} />
      )}

      {batchId != null && !loading && keys.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            {[{ label: "Total Keys", value: keys.length, color: C.gold }, { label: "Activated", value: active, color: C.green }, { label: "Unused", value: unused, color: C.amber }].map(s => (
              <div key={s.label} style={{ background: C.card, borderRadius: 9, border: `1px solid ${s.color}22`, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: C.serif }}>{s.value}</div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", fontFamily: C.mono, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn variant="ghost" small onClick={() => navigator.clipboard.writeText(keys.map(k => k.key_value).join("\n")).catch(() => {})}>
              <Copy size={11} /> Copy All Keys
            </Btn>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 10 }}>
            {keys.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.008 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 8, marginBottom: 4, background: k.activated ? `${C.green}07` : C.card, border: `1px solid ${k.activated ? `${C.green}22` : C.border}` }}>
                <span style={{ color: C.dim, fontSize: 9, minWidth: 28, textAlign: "right" }}>{i + 1}</span>
                <span style={{ color: k.activated ? C.green : C.amber, flex: 1, letterSpacing: "0.06em" }}>{k.key_value}</span>
                <CopyBtn value={k.key_value} />
                <StatusChip status={k.activated ? "ACTIVATED" : "UNUSED"} />
                {k.node_id && <span style={{ fontSize: 9, color: C.dim }}>{k.node_id}</span>}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {loading && <LoadingState label="LOADING KEYS…" />}
    </div>
  );
}

// ── Nodes Tab ─────────────────────────────────────────────────
function NodesTab({ onRefreshNeeded }: { onRefreshNeeded?: () => void }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/nodes");
      const data = await res.json();
      setNodes(data.nodes ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = SovereignDistro.onPendingUpdate(() => load());
    return unsub;
  }, [load]);

  const nodeAction = async (nodeId: number, action: "authorize" | "lock" | "revoke") => {
    setActioning(nodeId);
    try {
      await fetch(`/api/nodes/${nodeId}/${action}`, { method: "POST" });
      await load();
      onRefreshNeeded?.();
    } finally { setActioning(null); }
  };

  const total      = nodes.length;
  const authorized = nodes.filter(n => n.status === "AUTHORIZED").length;
  const pending    = nodes.filter(n => n.status === "PENDING").length;
  const offline    = nodes.filter(n => n.status === "LOCKED" || n.status === "REVOKED").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Nodes",   value: total,      color: C.gold   },
          { label: "Authorized",    value: authorized, color: C.green  },
          { label: "Pending Lock",  value: pending,    color: C.orange },
          { label: "Locked/Revoked",value: offline,    color: C.red    },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 10, border: `1px solid ${s.color}22`, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: C.serif }}>{s.value}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", fontFamily: C.mono, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn variant="ghost" small onClick={load}><RefreshCw size={12} /> Refresh</Btn>
      </div>

      {loading && <LoadingState label="SCANNING NODES…" />}

      {!loading && nodes.length === 0 && (
        <EmptyState icon={Monitor} title="NO NODES REGISTERED" hint={"Nodes appear when a device calls POST /api/nodes/register\nwith a valid serialNumber and keyValue from a shipment batch."} />
      )}

      {nodes.map(n => (
        <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, marginBottom: 10, background: C.card, border: `1px solid ${n.status === "AUTHORIZED" ? `${C.green}22` : n.status === "PENDING" ? `${C.orange}22` : `${C.red}22`}`, borderLeft: `3px solid ${n.status === "AUTHORIZED" ? C.green : n.status === "PENDING" ? C.orange : C.red}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: n.status === "AUTHORIZED" ? `${C.green}12` : `${C.orange}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {n.status === "AUTHORIZED" ? <Unlock size={16} color={C.green} /> : <Lock size={16} color={C.orange} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.ink, fontWeight: 700 }}>{n.serial_number}</span>
              <StatusChip status={n.status} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[["Batch", `#${n.batch_id}`], ["Device", n.device_type ?? "—"], ["Manufacturer", n.manufacturer_name ?? "—"], ["IP", n.ip_address]].map(([k, v]) => (
                <div key={k as string}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em", fontFamily: C.mono }}>{k as string}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {n.status !== "AUTHORIZED" && (
              <motion.button whileTap={{ scale: 0.94 }}
                onClick={() => nodeAction(n.id, "authorize")}
                disabled={actioning === n.id}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.green}35`, background: `${C.green}12`, color: C.green, fontSize: 9, fontFamily: C.mono, fontWeight: 800, cursor: "pointer" }}>
                <CheckCircle2 size={11} /> AUTHORIZE
              </motion.button>
            )}
            {n.status === "AUTHORIZED" && (
              <motion.button whileTap={{ scale: 0.94 }}
                onClick={() => nodeAction(n.id, "lock")}
                disabled={actioning === n.id}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.orange}35`, background: `${C.orange}12`, color: C.orange, fontSize: 9, fontFamily: C.mono, fontWeight: 800, cursor: "pointer" }}>
                <Lock size={11} /> LOCK
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.94 }}
              onClick={() => nodeAction(n.id, "revoke")}
              disabled={actioning === n.id || n.status === "REVOKED"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.red}35`, background: `${C.red}12`, color: C.red, fontSize: 9, fontFamily: C.mono, fontWeight: 800, cursor: "pointer", opacity: n.status === "REVOKED" ? 0.4 : 1 }}>
              <XCircle size={11} /> REVOKE
            </motion.button>
          </div>
          <div style={{ fontSize: 8, color: C.dim, fontFamily: C.mono, flexShrink: 0, whiteSpace: "nowrap" }}>
            {new Date(n.registered_at).toLocaleString()}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Deploy Tab ────────────────────────────────────────────────
function DeployTab({ batches }: { batches: Batch[] }) {
  const [batchId, setBatchId]   = useState<string>("");
  const [password, setPassword] = useState("");
  const [email, setEmail]       = useState("");
  const [linkResult, setLinkResult] = useState<{ token: string; downloadUrl: string; expiresAt: string; emailSent: boolean } | null>(null);
  const [working, setWorking]   = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [launching, setLaunching] = useState(false);
  const [deployNote, setDeployNote] = useState("");
  const [lastDeploy, setLastDeploy] = useState<{ id: number; status: string } | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDeployments = useCallback(async () => {
    const res = await fetch("/api/distribution/deployments");
    const data = await res.json();
    setDeployments(data.deployments ?? []);
  }, []);

  useEffect(() => { loadDeployments(); }, [loadDeployments]);

  const launchDeploy = async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/distribution/deploy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batchId ? parseInt(batchId) : undefined, target: batchId ? `BATCH-${batchId}` : "ALL", notes: deployNote || undefined }),
      });
      const raw = await res.json() as { deploymentId: number; status: string };
      const data = { id: raw.deploymentId, status: raw.status };
      setLastDeploy(data);
      await loadDeployments();
      // Poll for completion
      pollerRef.current = setInterval(async () => {
        await loadDeployments();
      }, 2000);
      setTimeout(() => { if (pollerRef.current) clearInterval(pollerRef.current); }, 10000);
    } finally { setLaunching(false); }
  };

  useEffect(() => () => { if (pollerRef.current) clearInterval(pollerRef.current); }, []);

  const generateLink = async () => {
    if (!batchId || !password) return;
    setWorking(true);
    try {
      const res = await fetch("/api/distribution/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: parseInt(batchId), password, recipientEmail: email || undefined }) });
      setLinkResult(await res.json());
    } finally { setWorking(false); }
  };

  const downloadBundle = async () => {
    if (!batchId) return;
    setBundleLoading(true);
    try {
      const res  = await fetch(`/api/distribution/bundle/${batchId}`);
      const data = await res.json();
      const files: [string, string, string][] = [
        ["license.json", JSON.stringify(data.license, null, 2), "application/json"],
        ["system_specs.json", JSON.stringify(data.systemSpecs, null, 2), "application/json"],
        ["cold_start.html", data.coldStartHtml, "text/html"],
        ["install_guide.txt", data.installGuide, "text/plain"],
      ];
      for (const [name, content, mime] of files) {
        const blob = new Blob([content], { type: mime });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = `novee-bundle-${batchId}-${name}`; a.click();
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 200));
      }
    } finally { setBundleLoading(false); }
  };

  const selBatch = batches.find(b => b.id === parseInt(batchId));

  return (
    <div>
      {/* Deploy launcher */}
      <Card accent={C.gold}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 14 }}>
          LAUNCH DEPLOYMENT
        </div>
        <GoldLabel>Target Shipment (leave blank for ALL)</GoldLabel>
        <select value={batchId} onChange={e => setBatchId(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 7, background: C.press, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", marginBottom: 14 }}>
          <option value="">— ALL NODES (global push) —</option>
          {batches.map(b => <option key={b.id} value={b.id}>#{b.id} · {b.manufacturer_name} ({b.device_type})</option>)}
        </select>
        <VaultInput label="Deployment Notes (optional)" value={deployNote} onChange={setDeployNote} placeholder="e.g. Titan v5.2.0 → v5.3.0 rollout" />
        <Btn onClick={launchDeploy} disabled={launching}>
          {launching ? <><RefreshCw size={13} /> Launching…</> : <><Zap size={13} /> Launch Deployment</>}
        </Btn>
        {lastDeploy && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: `${C.green}08`, border: `1px solid ${C.green}28`, fontFamily: C.mono, fontSize: 10, color: C.green }}>
            DEPLOYMENT #{lastDeploy.id} · {lastDeploy.status} · Auto-completes in 3s
          </div>
        )}
      </Card>

      {/* Deployment history */}
      <div style={{ fontSize: 9, color: `${C.blue}70`, letterSpacing: "0.24em", marginBottom: 12 }}>DEPLOYMENT HISTORY</div>
      {deployments.length === 0
        ? <EmptyState icon={Zap} title="NO DEPLOYMENTS LAUNCHED YET" hint="Use the launcher above to push a deployment package to nodes." />
        : deployments.map(d => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 9, marginBottom: 8, background: C.card, border: `1px solid ${d.status === "COMPLETED" ? `${C.green}22` : d.status === "IN_PROGRESS" ? `${C.amber}22` : C.border}`, borderLeft: `3px solid ${d.status === "COMPLETED" ? C.green : d.status === "IN_PROGRESS" ? C.amber : C.border}` }}>
            <Zap size={16} color={d.status === "COMPLETED" ? C.green : C.amber} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink, fontWeight: 700 }}>#{d.id} · {d.package}</span>
                <StatusChip status={d.status} />
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim }}>→ {d.target}</span>
              </div>
              {d.notes && <div style={{ fontSize: 9, color: C.muted }}>{d.notes}</div>}
            </div>
            <div style={{ fontSize: 8, color: C.dim, fontFamily: C.mono, flexShrink: 0 }}>{new Date(d.created_at).toLocaleString()}</div>
          </div>
        ))
      }

      {/* Batch-specific: ZIP Drive & Cloud Link */}
      {selBatch && (
        <>
          <div style={{ fontSize: 9, color: `${C.blue}70`, letterSpacing: "0.24em", marginBottom: 12, marginTop: 24 }}>PHYSICAL & CLOUD HANDOFF</div>
          <Card accent={C.gold}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Download size={16} color={C.gold} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>OPTION A — ZIP DRIVE</div>
              <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, background: `${C.gold}12`, border: `1px solid ${C.gold}28`, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>PHYSICAL HANDOFF</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18, lineHeight: 1.7 }}>Download the Titan Bundle. Copy to USB and hand off to manufacturer. Device boots into Obsidian Lock until Sovereign Authorization is toggled.</div>
            <Btn onClick={downloadBundle} disabled={bundleLoading}>
              {bundleLoading ? <><RefreshCw size={13} /> Packaging…</> : <><Download size={13} /> Download Titan Bundle (4 files)</>}
            </Btn>
          </Card>
          <Card accent={C.blue}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Globe size={16} color={C.blue} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.blue, fontFamily: C.serif, letterSpacing: "0.12em" }}>OPTION B — CLOUD LINK</div>
              <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, background: `${C.blue}12`, border: `1px solid ${C.blue}28`, fontSize: 9, fontWeight: 800, color: C.blue, letterSpacing: "0.14em" }}>DIGITAL HANDOFF</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18, lineHeight: 1.7 }}>Generate a password-protected download link valid for 24 hours.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <VaultInput label="Link Password" value={password} onChange={setPassword} type="password" placeholder="Min 6 characters" />
              <VaultInput label="Manufacturer Email (optional)" value={email} onChange={setEmail} type="email" placeholder="mfg@example.com" />
            </div>
            <Btn onClick={generateLink} disabled={working || !password}>
              {working ? <><RefreshCw size={13} /> Generating…</> : <><Mail size={13} /> Generate & Send Link</>}
            </Btn>
            <AnimatePresence>
              {linkResult && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 18, background: `${C.green}08`, border: `1px solid ${C.green}28`, borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Check size={14} color={C.green} />
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: "0.14em" }}>LINK GENERATED {linkResult.emailSent ? "· EMAIL SENT" : ""}</span>
                  </div>
                  <GoldLabel>Download URL</GoldLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, flex: 1, wordBreak: "break-all" }}>{window.location.origin}{linkResult.downloadUrl}</span>
                    <CopyBtn value={`${window.location.origin}${linkResult.downloadUrl}`} />
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono }}>Expires: {new Date(linkResult.expiresAt).toLocaleString()} · Password-protected</div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Hardware Tab ──────────────────────────────────────────────
function HardwareTab() {
  const [devices, setDevices]     = useState<HardwareDevice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ deviceLabel: "", deviceType: "kiosk", firmware: "titan-v-5.2.0", ipAddress: "" });
  const [adding, setAdding]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hardware/devices");
      const data = await res.json();
      setDevices(data.devices ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshDevice = async (id: number) => {
    setRefreshing(id);
    try {
      await fetch(`/api/hardware/devices/${id}/refresh`, { method: "POST" });
      await load();
    } finally { setRefreshing(null); }
  };

  const addDevice = async () => {
    if (!form.deviceLabel.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/hardware/devices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowAdd(false);
      setForm({ deviceLabel: "", deviceType: "kiosk", firmware: "titan-v-5.2.0", ipAddress: "" });
      await load();
    } finally { setAdding(false); }
  };

  const signalColor = (s: string) => s === "NOMINAL" ? C.green : s === "DEGRADED" ? C.orange : C.red;
  const TYPES = ["kiosk", "tablet", "mirror", "vehicle", "server"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn onClick={() => setShowAdd(!showAdd)}><Plus size={14} /> Register Device</Btn>
        <Btn variant="ghost" small onClick={load}><RefreshCw size={12} /> Refresh All</Btn>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card accent={C.gold}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold, fontFamily: C.serif, marginBottom: 14 }}>REGISTER HARDWARE DEVICE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <VaultInput label="Device Label" value={form.deviceLabel} onChange={v => setForm(f => ({ ...f, deviceLabel: v }))} placeholder="e.g. Lobby Mirror Kiosk #1" />
                </div>
                <VaultSelect label="Device Type" value={form.deviceType} onChange={v => setForm(f => ({ ...f, deviceType: v }))} options={TYPES} />
                <VaultInput label="Firmware Version" value={form.firmware} onChange={v => setForm(f => ({ ...f, firmware: v }))} placeholder="titan-v-5.2.0" />
                <div style={{ gridColumn: "1/-1" }}>
                  <VaultInput label="IP Address (optional)" value={form.ipAddress} onChange={v => setForm(f => ({ ...f, ipAddress: v }))} placeholder="192.168.1.100" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn onClick={addDevice} disabled={adding}>{adding ? <><RefreshCw size={13} /> Adding…</> : <><HardDrive size={13} /> Register</>}</Btn>
                <Btn variant="ghost" small onClick={() => setShowAdd(false)}>Cancel</Btn>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingState label="SCANNING HARDWARE…" />}

      {!loading && devices.length === 0 && (
        <EmptyState icon={Cpu} title="NO HARDWARE DEVICES CONNECTED" hint={"No hardware devices registered yet.\nUse 'Register Device' above or POST to /api/hardware/devices."} />
      )}

      {devices.map(d => (
        <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 10, marginBottom: 10, background: C.card, border: `1px solid ${signalColor(d.signal_state)}22`, borderLeft: `3px solid ${signalColor(d.signal_state)}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${signalColor(d.signal_state)}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HardDrive size={19} color={signalColor(d.signal_state)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, fontWeight: 700 }}>{d.device_label}</span>
              <StatusChip status={d.signal_state} />
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[["Type", d.device_type], ["Firmware", d.firmware], ["Sensor", d.sensor_state], ["IP", d.ip_address ?? "—"], ["Last Seen", new Date(d.last_seen).toLocaleTimeString()]].map(([k, v]) => (
                <div key={k as string}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em", fontFamily: C.mono }}>{k as string}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => refreshDevice(d.id)} disabled={refreshing === d.id}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.gold}35`, background: `${C.gold}12`, color: C.gold, fontSize: 9, fontFamily: C.mono, fontWeight: 800, cursor: "pointer" }}>
              <motion.div animate={refreshing === d.id ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={11} />
              </motion.div>
              REFRESH
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── War Room Tab ──────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444", ERROR: "#ef4444", WARN: "#f97316", WARNING: "#f97316",
  INFO: "#22AAFF", DEBUG: "#7BA8CC", SUCCESS: "#22c55e",
};
const SEVERITY_ICONS: Record<string, typeof Activity> = {
  CRITICAL: TriangleAlert, ERROR: XCircle, WARN: AlertTriangle,
  WARNING: AlertTriangle, INFO: Info, DEBUG: Bug, SUCCESS: CheckCircle2,
};

function WarRoomTab() {
  const [events, setEvents]     = useState<WarRoomEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acking, setAcking]     = useState<number | null>(null);
  const [filter, setFilter]     = useState<"ALL" | "ACTIVE" | "ACKNOWLEDGED">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/war-room");
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const acknowledge = async (eventId: number) => {
    setAcking(eventId);
    try {
      await fetch("/api/distribution/war-room/acknowledge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ackBy: "sovereign-operator" }),
      });
      await load();
    } finally { setAcking(null); }
  };

  const filtered = events.filter(e =>
    filter === "ALL" ? true : filter === "ACTIVE" ? !e.acknowledged : e.acknowledged
  );

  const critical = events.filter(e => !e.acknowledged && (e.severity === "CRITICAL" || e.severity === "ERROR")).length;
  const warnings = events.filter(e => !e.acknowledged && (e.severity === "WARN" || e.severity === "WARNING")).length;
  const active   = events.filter(e => !e.acknowledged).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Events", value: events.length, color: C.gold  },
          { label: "Active",       value: active,         color: C.amber },
          { label: "Critical",     value: critical,       color: C.red   },
          { label: "Warnings",     value: warnings,       color: C.orange},
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 10, border: `1px solid ${s.color}22`, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: C.serif }}>{s.value}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.14em", fontFamily: C.mono, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar + refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {(["ALL", "ACTIVE", "ACKNOWLEDGED"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${filter === f ? C.gold : C.border}`, background: filter === f ? `${C.gold}18` : "transparent", color: filter === f ? C.gold : C.muted, fontFamily: C.mono, fontSize: 9, fontWeight: filter === f ? 800 : 400, letterSpacing: "0.12em", cursor: "pointer" }}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <Btn variant="ghost" small onClick={load}><RefreshCw size={12} /> Refresh</Btn>
        </div>
      </div>

      {loading && <LoadingState label="LOADING WAR ROOM FEED…" />}

      {!loading && filtered.length === 0 && (
        filter === "ACTIVE"
          ? <EmptyState icon={CheckCircle2} title="NO ACTIVE INCIDENTS" hint="System nominal. All events have been acknowledged." />
          : <EmptyState icon={Activity} title="NO EVENTS" hint="No war room events found. Events are auto-generated by system workers and manual actions." />
      )}

      {filtered.map(e => {
        const col     = SEVERITY_COLORS[e.severity] ?? C.dim;
        const EIcon   = SEVERITY_ICONS[e.severity] ?? Info;
        return (
          <motion.div key={e.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", gap: 14, padding: "14px 18px", borderRadius: 10, marginBottom: 10, background: e.acknowledged ? `${C.card}` : C.card, border: `1px solid ${e.acknowledged ? C.border : `${col}28`}`, borderLeft: `3px solid ${e.acknowledged ? C.dim : col}`, opacity: e.acknowledged ? 0.6 : 1 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: `${col}12`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
              <EIcon size={16} color={col} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <span style={{ fontFamily: C.serif, fontSize: 13, color: C.ink, fontWeight: 700 }}>{e.title}</span>
                <StatusChip status={e.severity} />
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim, background: `${C.surface}`, border: `1px solid ${C.border}`, padding: "2px 7px", borderRadius: 4 }}>{e.category}</span>
              </div>
              {e.description && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65, marginBottom: 6 }}>{e.description}</div>}
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                {e.source && <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim }}>SOURCE: {e.source}</span>}
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim }}><Clock size={9} style={{ marginRight: 4, verticalAlign: "middle" }} />{new Date(e.created_at).toLocaleString()}</span>
                {e.acknowledged && <span style={{ fontFamily: C.mono, fontSize: 8, color: C.green }}>ACK BY {e.ack_by} · {e.ack_at ? new Date(e.ack_at).toLocaleTimeString() : ""}</span>}
              </div>
            </div>
            {!e.acknowledged && (
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => acknowledge(e.id)} disabled={acking === e.id}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, border: `1px solid ${C.green}35`, background: `${C.green}12`, color: C.green, fontSize: 9, fontFamily: C.mono, fontWeight: 800, cursor: "pointer", flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}>
                <CheckCircle2 size={11} /> ACK
              </motion.button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SovereignDistributionVault() {
  const [, navigate]     = useLocation();
  const [tab, setTab]    = useState<TabId>("shipments");
  const [batches, setBatches]     = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatch, setSelectedBatch]   = useState<number | null>(null);
  const [vaultStatus, setVaultStatus]       = useState<VaultStatus | null>(null);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res  = await fetch("/api/distribution/batches");
      const data = await res.json();
      setBatches(data.batches ?? []);
    } finally { setLoadingBatches(false); }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/distribution/status");
      const data = await res.json();
      setVaultStatus(data);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { loadBatches(); loadStatus(); }, [loadBatches, loadStatus]);

  const handleSelectBatch = (id: number) => { setSelectedBatch(id); setTab("keys"); };

  const refreshCurrentTab = () => {
    loadStatus();
    if (tab === "shipments") loadBatches();
  };

  // Sovereign session gate
  useEffect(() => {
    const token = localStorage.getItem(SOVEREIGN_SESSION_KEY);
    if (!token) navigate("/sovereign-gate");
  }, [navigate]);

  useEffect(() => {
    const handler = () => { localStorage.removeItem(SOVEREIGN_SESSION_KEY); navigate("/sovereign-gate"); };
    socket.on("SOVEREIGN_SESSION_REVOKED", handler);
    return () => { socket.off("SOVEREIGN_SESSION_REVOKED", handler); };
  }, [navigate]);

  const revokeAllSessions = () => {
    socket.emit("SOVEREIGN_REVOKE_SESSION", { authKey: "MASTER_KEY_360" });
    localStorage.removeItem(SOVEREIGN_SESSION_KEY);
    navigate("/sovereign-gate");
  };

  const pendingNodes = vaultStatus?.nodes.pending ?? batches.reduce((acc, b) => acc + parseInt(b.node_count || "0"), 0);
  const vaultOnline  = vaultStatus?.online !== false;
  const vaultMode    = vaultStatus?.mode ?? "local";

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: C.sans, overflow: "hidden" }}>

      {/* Ambient blue glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 900, height: 180, background: "radial-gradient(ellipse,rgba(0,128,255,0.09) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div className="scan-line" style={{ pointerEvents: "none", zIndex: 0 }} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", borderBottom: `1px solid ${C.borderB}`, background: "rgba(5,10,20,0.97)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/admin-master")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: "rgba(0,128,255,0.07)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
          <ArrowLeft size={13} /> Admin Master
        </motion.button>

        <div style={{ width: 1, height: 28, background: C.border }} />

        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={16} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>SOVEREIGN DISTRIBUTION VAULT</div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            360 Enterprises Services LLC · Johnie Manuel Lee Collins · NOVEE OS Titan V
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          {pendingNodes > 0 && (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              onClick={() => setTab("nodes")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 7, background: `${C.orange}12`, border: `1px solid ${C.orange}35`, cursor: "pointer" }}>
              <AlertTriangle size={12} color={C.orange} />
              <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 800, color: C.orange, letterSpacing: "0.14em" }}>{pendingNodes} PENDING NODES</span>
            </motion.div>
          )}

          {/* Vault Online — real data from /api/distribution/status */}
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: vaultOnline ? C.green : C.red, fontWeight: 700, cursor: "pointer" }}
            onClick={loadStatus} title="Click to refresh status">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: vaultOnline ? C.green : C.red, display: "inline-block" }} />
            {vaultOnline ? "VAULT ONLINE" : "VAULT OFFLINE"}
            {vaultMode === "local" && <span style={{ fontSize: 8, color: C.dim, fontFamily: C.mono }}> · LOCAL</span>}
          </motion.div>

          {/* Titan version — from status API, labeled local */}
          <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: C.mono, letterSpacing: "0.12em" }} title="Local version — not fetched from remote">
            TITAN V {vaultStatus?.version ?? "5.2.0"} · LOCAL
          </div>

          <div style={{ width: 1, height: 24, background: C.border }} />

          {/* Hardware badge — links to hardware tab */}
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setTab("hardware")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: tab === "hardware" ? `${C.gold}18` : `${C.gold}10`, border: `1px solid ${tab === "hardware" ? `${C.gold}50` : C.border}`, color: C.gold, fontSize: 10, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}>
            <Cpu size={12} /> HARDWARE
          </motion.button>

          {/* Refresh */}
          <motion.button whileTap={{ scale: 0.93 }} onClick={refreshCurrentTab}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: `${C.blue}0A`, border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontFamily: C.mono, cursor: "pointer" }}>
            <RefreshCw size={12} /> REFRESH
          </motion.button>

          <motion.button whileTap={{ scale: 0.93 }} onClick={revokeAllSessions}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", color: "#ef4444", fontSize: 10, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}>
            <LogOut size={12} /> REVOKE ALL
          </motion.button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,10,20,0.94)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isA  = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 20px", background: "none", border: "none", borderBottom: `2px solid ${isA ? C.gold : "transparent"}`, color: isA ? C.gold : C.muted, fontFamily: C.mono, fontSize: 10, fontWeight: isA ? 800 : 400, letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.16s" }}>
              <Icon size={13} />
              {t.label.toUpperCase()}
              {/* Badge for war room active incidents */}
              {t.id === "war-room" && !isA && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, display: "inline-block", marginLeft: 2 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {tab === "shipments" && (
              <ShipmentsTab batches={batches} loading={loadingBatches} onRefresh={loadBatches} onSelectBatch={handleSelectBatch} selectedBatchId={selectedBatch} />
            )}
            {tab === "keys" && (
              <KeysTab batches={batches} selectedBatchId={selectedBatch} onSelectBatch={setSelectedBatch} />
            )}
            {tab === "nodes" && <NodesTab onRefreshNeeded={loadStatus} />}
            {tab === "deploy" && <DeployTab batches={batches} />}
            {tab === "hardware" && <HardwareTab />}
            {tab === "war-room" && <WarRoomTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <SovereignWatermark />

      {/* ── Footer ── */}
      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,10,20,0.97)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em" }}>
          360 ENTERPRISES SERVICES LLC · JOHNIE MANUEL LEE COLLINS · ALL RIGHTS RESERVED
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: `${C.gold}55`, letterSpacing: "0.14em" }}>
          SOVEREIGN DISTRIBUTION VAULT · NOVEE OS · TITAN V {vaultStatus?.version ?? "5.2.0"}
          {vaultStatus && ` · ${vaultStatus.nodes.total} NODES · ${vaultStatus.batches.total} BATCHES`}
        </span>
      </div>

    </div>
  );
}
