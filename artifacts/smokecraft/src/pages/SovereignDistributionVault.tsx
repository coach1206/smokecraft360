/**
 * Sovereign Distribution Vault — /distribution
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 * Professional packaging, licensing & remote deployment of NOVEE OS.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft, Package, Key, Monitor, Truck, Globe, Mail,
  Copy, Check, Lock, Unlock, Download, RefreshCw, Plus,
  ChevronRight, AlertTriangle, Server, Zap, Shield, LogOut, LayoutGrid,
} from "lucide-react";
import { SovereignDistro } from "@/lib/sovereignDistro";
import { socket }          from "@/lib/socket";
import SovereignWatermark  from "@/components/SovereignWatermark";

export const SOVEREIGN_SESSION_KEY = "SOVEREIGN_SESSION";

// ── Design tokens (Obsidian command skin) ────────────────────────────────────

const C = {
  bg:       "#050505",
  surface:  "#0D0C0B",
  card:     "#141210",
  press:    "#1C1A17",
  border:   "rgba(212,175,55,0.18)",
  borderB:  "rgba(212,175,55,0.32)",
  gold:     "#D4AF37",
  amber:    "#B89030",
  ink:      "#F5F2ED",
  muted:    "rgba(245,242,237,0.45)",
  dim:      "rgba(245,242,237,0.25)",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
  sans:     "'Inter',sans-serif",
  green:    "#22c55e",
  red:      "#ef4444",
  orange:   "#f97316",
  blue:     "#3b82f6",
};

const DEVICE_TYPES = ["Mirror", "Table", "Vehicle"] as const;
type DeviceType = typeof DEVICE_TYPES[number];

const DEVICE_ICONS: Record<DeviceType, typeof Monitor> = {
  Mirror:  Monitor,
  Table:   Server,
  Vehicle: Truck,
};

// ── Primitives ────────────────────────────────────────────────────────────────

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 800, color: C.amber, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <GoldLabel>{label}</GoldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 7,
          background: C.press, border: `1px solid ${C.border}`,
          color: C.ink, fontSize: 12, fontFamily: C.mono,
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <GoldLabel>{label}</GoldLabel>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 7,
          background: C.press, border: `1px solid ${C.border}`,
          color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none",
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", small }: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; variant?: "primary" | "ghost" | "danger" | "green";
  small?: boolean;
}) {
  const bg  = variant === "primary" ? C.gold
            : variant === "green"   ? "rgba(34,197,94,0.12)"
            : variant === "danger"  ? "rgba(239,68,68,0.12)"
            : "rgba(212,175,55,0.07)";
  const col = variant === "primary" ? "#050505"
            : variant === "green"   ? C.green
            : variant === "danger"  ? C.red
            : C.gold;
  const bdr = variant === "primary" ? C.gold
            : variant === "green"   ? "rgba(34,197,94,0.35)"
            : variant === "danger"  ? "rgba(239,68,68,0.35)"
            : C.border;
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "7px 14px" : "10px 20px",
        borderRadius: 8, background: bg, border: `1px solid ${bdr}`,
        color: col, fontSize: small ? 10 : 12, fontFamily: C.mono,
        fontWeight: 700, letterSpacing: "0.10em", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1, display: "flex", alignItems: "center", gap: 7,
      }}
    >
      {children}
    </motion.button>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1px solid ${accent ? `${accent}28` : C.border}`,
      borderLeft: accent ? `3px solid ${accent}` : `1px solid ${C.border}`,
      padding: "20px 22px", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const col = status === "AUTHORIZED" ? C.green
            : status === "PENDING"    ? C.orange
            : status === "ACTIVE"     ? C.gold
            : C.muted;
  return (
    <span style={{
      fontFamily: C.mono, fontSize: 9, fontWeight: 800, color: col,
      background: `${col}14`, border: `1px solid ${col}35`,
      padding: "3px 9px", borderRadius: 5, letterSpacing: "0.12em",
    }}>
      {status}
    </span>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={copy}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: copied ? C.green : C.amber }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </motion.button>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: "shipments", label: "Shipments",   icon: Package },
  { id: "keys",      label: "Keys",        icon: Key     },
  { id: "nodes",     label: "Live Nodes",  icon: Monitor },
  { id: "deploy",    label: "Deploy",      icon: Zap     },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Batch {
  id: number;
  manufacturer_name: string;
  order_qty: number;
  device_type: string;
  authorized: boolean;
  legal_entity: string;
  contact_email: string | null;
  created_at: string;
  key_count: string;
  activated_count: string;
  node_count: string;
}

interface ActivationKey {
  id: number;
  batch_id: number;
  key_value: string;
  serial_prefix: string;
  activated: boolean;
  activated_at: string | null;
  node_id: string | null;
  created_at: string;
}

interface Node {
  id: number;
  serial_number: string;
  batch_id: number;
  key_value: string;
  status: string;
  ip_address: string;
  registered_at: string;
  manufacturer_name: string;
  device_type: string;
  batch_authorized: boolean;
}

// ── Shipments Tab ─────────────────────────────────────────────────────────────

function ShipmentsTab({
  batches, loading, onRefresh, onSelectBatch, selectedBatchId,
}: {
  batches: Batch[]; loading: boolean; onRefresh: () => void;
  onSelectBatch: (id: number) => void; selectedBatchId: number | null;
}) {
  const [form, setForm]     = useState({ manufacturerName: "", orderQty: "1", deviceType: "Mirror", contactEmail: "" });
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ batchId: number; keyCount: number; preview: string[] } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    if (!form.manufacturerName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/distribution/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturerName: form.manufacturerName.trim(),
          orderQty:         parseInt(form.orderQty) || 1,
          deviceType:       form.deviceType,
          contactEmail:     form.contactEmail || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      setShowForm(false);
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  const toggleAuth = async (batchId: number) => {
    const res  = await fetch(`/api/distribution/batches/${batchId}/authorize`, { method: "PUT" });
    const data = await res.json() as { authorized: boolean };
    // If now authorized, fire SOVEREIGN_WAKE_COMMAND to all devices in the batch
    if (data.authorized) {
      SovereignDistro.authorizeNode(`BATCH-${batchId}`, batchId);
    }
    onRefresh();
  };

  return (
    <div>
      {/* New Shipment CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Btn onClick={() => { setShowForm(!showForm); setResult(null); }}>
          <Plus size={14} /> Create New Shipment
        </Btn>
        <Btn variant="ghost" onClick={onRefresh} small>
          <RefreshCw size={12} /> Refresh
        </Btn>
        {loading && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.14em" }}>LOADING…</span>}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card accent={C.gold}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 18 }}>
                NEW SHIPMENT MANIFEST
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input label="Manufacturer Name" value={form.manufacturerName} onChange={v => setForm(f => ({ ...f, manufacturerName: v }))} placeholder="e.g. Prestige Glass Systems LLC" />
                </div>
                <Input label="Order Quantity" value={form.orderQty} onChange={v => setForm(f => ({ ...f, orderQty: v }))} type="number" placeholder="1" />
                <Select label="Device Type" value={form.deviceType} onChange={v => setForm(f => ({ ...f, deviceType: v }))} options={[...DEVICE_TYPES]} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <Input label="Contact Email (optional)" value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} type="email" placeholder="mfg@example.com" />
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

      {/* Success result */}
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

      {/* Batches list */}
      {batches.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.dim, fontFamily: C.mono, fontSize: 11, letterSpacing: "0.14em" }}>
          NO SHIPMENTS ISSUED YET<br/>
          <span style={{ fontSize: 9, opacity: 0.6 }}>Create a new shipment to begin distribution</span>
        </div>
      )}

      {batches.map(b => {
        const DevIcon = DEVICE_ICONS[b.device_type as DeviceType] ?? Package;
        const isSelected = selectedBatchId === b.id;
        return (
          <motion.div key={b.id} layout
            style={{
              background: isSelected ? `${C.gold}08` : C.card,
              borderRadius: 12,
              border: `1px solid ${isSelected ? `${C.gold}35` : C.border}`,
              borderLeft: `3px solid ${b.authorized ? C.green : C.orange}`,
              padding: "16px 20px", marginBottom: 12, cursor: "pointer",
            }}
            onClick={() => onSelectBatch(b.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${b.authorized ? C.green : C.orange}14`,
                border: `1px solid ${b.authorized ? C.green : C.orange}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <DevIcon size={18} color={b.authorized ? C.green : C.orange} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.serif, letterSpacing: "0.06em" }}>
                    {b.manufacturer_name}
                  </span>
                  <StatusChip status={b.authorized ? "AUTHORIZED" : "PENDING"} />
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.dim }}>#{b.id}</span>
                </div>
                <div style={{ display: "flex", gap: 18 }}>
                  {[
                    ["Type", b.device_type],
                    ["Qty", b.order_qty],
                    ["Keys", `${b.activated_count}/${b.key_count} activated`],
                    ["Nodes", `${b.node_count} registered`],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em", fontFamily: C.mono }}>{k as string}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={e => { e.stopPropagation(); toggleAuth(b.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
                    borderRadius: 8, border: `1px solid ${b.authorized ? `${C.green}35` : `${C.orange}35`}`,
                    background: b.authorized ? `${C.green}12` : `${C.orange}12`,
                    color: b.authorized ? C.green : C.orange, fontSize: 10, fontFamily: C.mono,
                    fontWeight: 800, letterSpacing: "0.10em", cursor: "pointer",
                  }}
                >
                  {b.authorized ? <><Unlock size={12} /> AUTHORIZED</> : <><Lock size={12} /> AUTHORIZE</>}
                </motion.button>
                <div style={{ fontSize: 8, color: C.dim, fontFamily: C.mono }}>
                  {new Date(b.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Keys Tab ──────────────────────────────────────────────────────────────────

function KeysTab({ batches, selectedBatchId, onSelectBatch }: {
  batches: Batch[]; selectedBatchId: number | null; onSelectBatch: (id: number) => void;
}) {
  const [keys, setKeys]       = useState<ActivationKey[]>([]);
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

  const copyAll = () => {
    navigator.clipboard.writeText(keys.map(k => k.key_value).join("\n")).catch(() => {});
  };

  return (
    <div>
      {/* Batch selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {batches.map(b => (
          <motion.button key={b.id} whileTap={{ scale: 0.95 }}
            onClick={() => { onSelectBatch(b.id); load(b.id); }}
            style={{
              padding: "7px 14px", borderRadius: 8, fontFamily: C.mono, fontSize: 10,
              fontWeight: batchId === b.id ? 800 : 400, letterSpacing: "0.10em",
              background: batchId === b.id ? `${C.gold}18` : "transparent",
              border: `1px solid ${batchId === b.id ? C.gold : C.border}`,
              color: batchId === b.id ? C.gold : C.muted, cursor: "pointer",
            }}
          >
            #{b.id} · {b.manufacturer_name}
          </motion.button>
        ))}
      </div>

      {batchId == null && (
        <div style={{ textAlign: "center", padding: 60, color: C.dim, fontFamily: C.mono, fontSize: 11 }}>
          SELECT A BATCH TO VIEW KEYS
        </div>
      )}

      {batchId != null && !loading && keys.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, letterSpacing: "0.14em" }}>
              {keys.length} KEYS · {keys.filter(k => k.activated).length} ACTIVATED
            </div>
            <Btn variant="ghost" small onClick={copyAll}>
              <Copy size={11} /> Copy All
            </Btn>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 10 }}>
            {keys.map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "9px 14px",
                  borderRadius: 8, marginBottom: 4,
                  background: k.activated ? `${C.green}07` : C.card,
                  border: `1px solid ${k.activated ? `${C.green}22` : C.border}`,
                }}
              >
                <span style={{ color: C.dim, fontSize: 9, minWidth: 28, textAlign: "right" }}>{i + 1}</span>
                <span style={{ color: k.activated ? C.green : C.amber, flex: 1, letterSpacing: "0.06em" }}>{k.key_value}</span>
                <CopyBtn value={k.key_value} />
                <StatusChip status={k.activated ? "ACTIVATED" : "UNUSED"} />
                {k.node_id && (
                  <span style={{ fontSize: 9, color: C.dim }}>{k.node_id}</span>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.amber, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.14em" }}>
          LOADING KEYS…
        </div>
      )}
    </div>
  );
}

// ── Nodes Tab ─────────────────────────────────────────────────────────────────

function NodesTab() {
  const [nodes, setNodes]   = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/distribution/nodes");
      const data = await res.json();
      setNodes(data.nodes ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live: refresh list whenever a new device pings NODE_PENDING_AUTHORIZATION
  useEffect(() => {
    const unsub = SovereignDistro.onPendingUpdate(() => load());
    return unsub;
  }, [load]);

  const pending    = nodes.filter(n => n.status === "PENDING");
  const authorized = nodes.filter(n => n.status === "AUTHORIZED");

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Nodes",  value: nodes.length,       color: C.gold   },
          { label: "Authorized",   value: authorized.length,  color: C.green  },
          { label: "Pending Lock", value: pending.length,     color: C.orange },
        ].map(s => (
          <div key={s.label} style={{
            background: C.card, borderRadius: 10, border: `1px solid ${s.color}22`,
            padding: "16px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: C.serif }}>{s.value}</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.16em", fontFamily: C.mono, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn variant="ghost" small onClick={load}><RefreshCw size={12} /> Refresh</Btn>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: C.amber, fontFamily: C.mono, fontSize: 10, letterSpacing: "0.14em" }}>SCANNING NODES…</div>}

      {!loading && nodes.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: C.dim, fontFamily: C.mono, fontSize: 11, letterSpacing: "0.12em" }}>
          NO NODES REGISTERED<br/>
          <span style={{ fontSize: 9, opacity: 0.6 }}>Nodes appear when a device calls POST /api/nodes/register</span>
        </div>
      )}

      {nodes.map(n => (
        <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px", borderRadius: 10, marginBottom: 10,
            background: C.card, border: `1px solid ${n.status === "AUTHORIZED" ? `${C.green}22` : `${C.orange}22`}`,
            borderLeft: `3px solid ${n.status === "AUTHORIZED" ? C.green : C.orange}`,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: n.status === "AUTHORIZED" ? `${C.green}12` : `${C.orange}12`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {n.status === "AUTHORIZED" ? <Unlock size={16} color={C.green} /> : <Lock size={16} color={C.orange} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.ink, fontWeight: 700 }}>{n.serial_number}</span>
              <StatusChip status={n.status} />
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {[
                ["Batch", `#${n.batch_id}`],
                ["Device", n.device_type ?? "—"],
                ["Manufacturer", n.manufacturer_name ?? "—"],
                ["IP", n.ip_address],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em", fontFamily: C.mono }}>{k as string}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: C.mono }}>
            {new Date(n.registered_at).toLocaleString()}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Deploy Tab ────────────────────────────────────────────────────────────────

function DeployTab({ batches }: { batches: Batch[] }) {
  const [batchId, setBatchId]       = useState<string>("");
  const [password, setPassword]     = useState("");
  const [email, setEmail]           = useState("");
  const [linkResult, setLinkResult] = useState<{ token: string; downloadUrl: string; expiresAt: string; emailSent: boolean } | null>(null);
  const [working, setWorking]       = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);

  const selBatch = batches.find(b => b.id === parseInt(batchId));

  const generateLink = async () => {
    if (!batchId || !password) return;
    setWorking(true);
    try {
      const res = await fetch("/api/distribution/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: parseInt(batchId), password, recipientEmail: email || undefined }),
      });
      setLinkResult(await res.json());
    } finally { setWorking(false); }
  };

  const downloadBundle = async () => {
    if (!batchId) return;
    setBundleLoading(true);
    try {
      const res  = await fetch(`/api/distribution/bundle/${batchId}`);
      const data = await res.json();

      // Create individual file downloads
      const files: [string, string, string][] = [
        ["license.json",           JSON.stringify(data.license,     null, 2), "application/json"],
        ["system_specs.json",      JSON.stringify(data.systemSpecs, null, 2), "application/json"],
        ["cold_start.html",        data.coldStartHtml,                        "text/html"],
        ["install_guide.txt",      data.installGuide,                         "text/plain"],
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

  return (
    <div>
      {/* Batch selector */}
      <Card>
        <GoldLabel>Select Shipment</GoldLabel>
        <select
          value={batchId}
          onChange={e => setBatchId(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 7,
            background: C.press, border: `1px solid ${C.border}`,
            color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", marginBottom: 0,
          }}
        >
          <option value="">— Select a batch —</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>#{b.id} · {b.manufacturer_name} ({b.device_type} · {b.order_qty} units)</option>
          ))}
        </select>
      </Card>

      {selBatch && (
        <>
          {/* Option A: ZIP Drive */}
          <Card accent={C.gold}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Download size={16} color={C.gold} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>
                OPTION A — ZIP DRIVE
              </div>
              <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, background: `${C.gold}12`, border: `1px solid ${C.gold}28`, fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>PHYSICAL HANDOFF</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18, lineHeight: 1.7 }}>
              Download the Titan Bundle to your computer. Copy to a USB drive and hand off to the manufacturer.
              Device boots into Obsidian Lock until you toggle Sovereign Authorization.
            </div>
            <div style={{ marginBottom: 16 }}>
              {[
                ["license.json",      "Legal entity, keys, issuance metadata"],
                ["system_specs.json", "Hardware requirements & Titan V config"],
                ["cold_start.html",   "Obsidian Lock screen — first boot display"],
                ["install_guide.txt", "Step-by-step manufacturer install guide"],
              ].map(([f, d]) => (
                <div key={f as string} style={{
                  display: "flex", gap: 12, padding: "7px 0",
                  borderBottom: `1px solid ${C.border}`, alignItems: "center",
                }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, minWidth: 160 }}>{f as string}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{d as string}</span>
                </div>
              ))}
            </div>
            <Btn onClick={downloadBundle} disabled={bundleLoading}>
              {bundleLoading
                ? <><RefreshCw size={13} /> Packaging…</>
                : <><Download size={13} /> Download Titan Bundle (4 files)</>}
            </Btn>
          </Card>

          {/* Option B: Cloud Link */}
          <Card accent={C.blue}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Globe size={16} color={C.blue} />
              <div style={{ fontSize: 16, fontWeight: 700, color: C.blue, fontFamily: C.serif, letterSpacing: "0.12em" }}>
                OPTION B — CLOUD LINK
              </div>
              <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 5, background: `${C.blue}12`, border: `1px solid ${C.blue}28`, fontSize: 9, fontWeight: 800, color: C.blue, letterSpacing: "0.14em" }}>DIGITAL HANDOFF</div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 18, lineHeight: 1.7 }}>
              Generate a password-protected download link valid for 24 hours.
              Email it directly to the manufacturer from this interface.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Input label="Link Password" value={password} onChange={setPassword} type="password" placeholder="Min 6 characters" />
              <Input label="Manufacturer Email (optional)" value={email} onChange={setEmail} type="email" placeholder="mfg@example.com" />
            </div>
            <Btn onClick={generateLink} disabled={working || !password}>
              {working ? <><RefreshCw size={13} /> Generating…</> : <><Mail size={13} /> Generate & Send Link</>}
            </Btn>

            <AnimatePresence>
              {linkResult && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 18, background: `${C.green}08`, border: `1px solid ${C.green}28`, borderRadius: 10, padding: "16px 18px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Check size={14} color={C.green} />
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: "0.14em" }}>
                      LINK GENERATED {linkResult.emailSent ? "· EMAIL SENT" : ""}
                    </span>
                  </div>
                  <GoldLabel>Download URL</GoldLabel>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.amber, flex: 1, wordBreak: "break-all" }}>
                      {window.location.origin}{linkResult.downloadUrl}
                    </span>
                    <CopyBtn value={`${window.location.origin}${linkResult.downloadUrl}`} />
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: C.mono }}>
                    Expires: {new Date(linkResult.expiresAt).toLocaleString()} · Password-protected
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* System Specs preview */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.10em", marginBottom: 14 }}>
              TITAN V HARDWARE SPECIFICATIONS
            </div>
            {[
              ["RAM",         "8 GB min · 16 GB recommended"],
              ["CPU",         "Intel Core i5 (8th Gen+) / Apple M1+ / ARM Cortex-A78"],
              ["Storage",     "64 GB SSD · 256 GB recommended"],
              ["Display",     '15.6" minimum · 4K UHD recommended'],
              ["Touch-Foil",  "Titanium Grade — 92% threshold · USB-HID / TUIO 2.0"],
              ["Network",     "Gigabit LAN · Wi-Fi 6 (802.11ax)"],
              ["OS",          "Chrome OS 120+ · Ubuntu 22.04 · Windows 11 Pro"],
              ["Frame Rate",  "60 fps target · <16 ms touch latency"],
              ["AI Latency",  "<1.2 s recommendation response"],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: C.mono, letterSpacing: "0.10em" }}>{k as string}</span>
                <span style={{ fontSize: 11, color: C.muted, textAlign: "right", maxWidth: "60%" }}>{v as string}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: `${C.gold}08`, border: `1px solid ${C.gold}18` }}>
              <div style={{ fontSize: 9, color: C.amber, fontFamily: C.mono, letterSpacing: "0.16em", marginBottom: 4 }}>LEGAL ENTITY</div>
              <div style={{ fontSize: 11, color: C.ink, fontWeight: 600 }}>360 Enterprises Services LLC</div>
              <div style={{ fontSize: 10, color: C.muted }}>Johnie Manuel Lee Collins · NOVEE OS Sovereign Owner</div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SovereignDistributionVault() {
  const [, navigate] = useLocation();
  const [tab, setTab]       = useState<TabId>("shipments");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatch, setSelectedBatch]   = useState<number | null>(null);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res  = await fetch("/api/distribution/batches");
      const data = await res.json();
      setBatches(data.batches ?? []);
    } finally { setLoadingBatches(false); }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  const handleSelectBatch = (id: number) => {
    setSelectedBatch(id);
    setTab("keys");
  };

  const [warRoom, setWarRoom] = useState(false);

  // Sovereign session gate — redirect to magic-link gate if no session token
  useEffect(() => {
    const token = localStorage.getItem(SOVEREIGN_SESSION_KEY);
    if (!token) navigate("/sovereign-gate");
  }, [navigate]);

  // Remote-revoke listener — another device was revoked; clear session and go to gate
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(SOVEREIGN_SESSION_KEY);
      navigate("/sovereign-gate");
    };
    socket.on("SOVEREIGN_SESSION_REVOKED", handler);
    return () => { socket.off("SOVEREIGN_SESSION_REVOKED", handler); };
  }, [navigate]);

  const revokeAllSessions = () => {
    socket.emit("SOVEREIGN_REVOKE_SESSION", { authKey: "MASTER_KEY_360" });
    localStorage.removeItem(SOVEREIGN_SESSION_KEY);
    navigate("/sovereign-gate");
  };

  const pendingNodes = batches.reduce((acc, b) => acc + parseInt(b.node_count || "0"), 0);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: C.sans, overflow: "hidden" }}>

      {/* ── Ambient gold glow ── */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 800, height: 160, background: "radial-gradient(ellipse,rgba(212,175,55,0.07) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", borderBottom: `1px solid ${C.borderB}`, background: "rgba(5,5,5,0.96)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/admin-master")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
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

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          {pendingNodes > 0 && (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 7, background: `${C.orange}12`, border: `1px solid ${C.orange}35` }}>
              <AlertTriangle size={12} color={C.orange} />
              <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 800, color: C.orange, letterSpacing: "0.14em" }}>{pendingNodes} PENDING NODES</span>
            </motion.div>
          )}
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.green, fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            VAULT ONLINE
          </motion.div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: C.mono, letterSpacing: "0.12em" }}>TITAN V 5.2.0</div>
          <div style={{ width: 1, height: 24, background: C.border }} />
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/hardware-lab")}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: `${C.gold}10`, border: `1px solid ${C.border}`, color: C.gold, fontSize: 10, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}>
            <Shield size={12} /> HARDWARE LABS
          </motion.button>
          <motion.button whileTap={{ scale: 0.93 }} onClick={revokeAllSessions}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", color: "#ef4444", fontSize: 10, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}>
            <LogOut size={12} /> REVOKE ALL
          </motion.button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,5,5,0.92)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isA  = !warRoom && tab === t.id;
          return (
            <button key={t.id} onClick={() => { setWarRoom(false); setTab(t.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "13px 20px", background: "none", border: "none",
                borderBottom: `2px solid ${isA ? C.gold : "transparent"}`,
                color: isA ? C.gold : C.muted, fontFamily: C.mono, fontSize: 10,
                fontWeight: isA ? 800 : 400, letterSpacing: "0.14em",
                cursor: "pointer", transition: "all 0.16s",
              }}
            >
              <Icon size={13} />
              {t.label.toUpperCase()}
            </button>
          );
        })}
        <div style={{ marginLeft: "auto" }}>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setWarRoom(w => !w)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
              borderRadius: 8, background: warRoom ? `${C.gold}18` : "rgba(245,242,237,0.05)",
              border: `1px solid ${warRoom ? C.gold + "50" : C.border}`,
              color: warRoom ? C.gold : C.muted,
              fontSize: 9, fontFamily: C.mono, fontWeight: 800, letterSpacing: "0.14em",
              cursor: "pointer", transition: "all 0.18s",
            }}>
            <LayoutGrid size={12} />
            {warRoom ? "TAB VIEW" : "WAR ROOM"}
          </motion.button>
        </div>
      </div>

      {/* ── Body — War Room 4-quadrant or single-tab view ── */}
      {warRoom ? (
        <div style={{ flex: 1, overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 2, background: "#111", position: "relative", zIndex: 1 }}>
          {([
            { label: "SHIPMENTS", content: <ShipmentsTab batches={batches} loading={loadingBatches} onRefresh={loadBatches} onSelectBatch={handleSelectBatch} selectedBatchId={selectedBatch} /> },
            { label: "KEYS",      content: <KeysTab batches={batches} selectedBatchId={selectedBatch} onSelectBatch={setSelectedBatch} /> },
            { label: "LIVE NODES",content: <NodesTab /> },
            { label: "DEPLOY",    content: <DeployTab batches={batches} /> },
          ] as const).map(({ label, content }) => (
            <div key={label} style={{ background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "7px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,5,5,0.98)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.amber, letterSpacing: "0.22em", fontWeight: 800 }}>{label}</span>
              </div>
              <div style={{ padding: "14px 16px", flex: 1, overflowY: "auto" }}>
                {content}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", position: "relative", zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {tab === "shipments" && (
                <ShipmentsTab
                  batches={batches}
                  loading={loadingBatches}
                  onRefresh={loadBatches}
                  onSelectBatch={handleSelectBatch}
                  selectedBatchId={selectedBatch}
                />
              )}
              {tab === "keys" && (
                <KeysTab
                  batches={batches}
                  selectedBatchId={selectedBatch}
                  onSelectBatch={setSelectedBatch}
                />
              )}
              {tab === "nodes" && <NodesTab />}
              {tab === "deploy" && <DeployTab batches={batches} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <SovereignWatermark />

      {/* ── Footer Brand Bar ── */}
      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,5,5,0.96)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: C.dim, letterSpacing: "0.16em" }}>
          360 ENTERPRISES SERVICES LLC · JOHNIE MANUEL LEE COLLINS · ALL RIGHTS RESERVED
        </span>
        <span style={{ fontFamily: C.mono, fontSize: 8, color: `${C.gold}55`, letterSpacing: "0.14em" }}>
          SOVEREIGN DISTRIBUTION VAULT · NOVEE OS · TITAN V 5.2.0
        </span>
      </div>

    </div>
  );
}
