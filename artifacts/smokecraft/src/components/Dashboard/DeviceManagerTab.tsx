/**
 * DeviceManagerTab — full device management for venue managers.
 *
 * Sections:
 *  1. Plan bundle banner (BASE / EXPERIENCE / ELITE)
 *  2. Hardware pricing cards (tablet + kiosk)
 *  3. Registered devices list (status, type, table, last active, metrics)
 *  4. Register new device form
 *  5. Venue QR codes panel (venue-wide + per-table)
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Monitor, Tablet, Smartphone, Plus, RefreshCw, Trash2,
  Power, PowerOff, BarChart3, QrCode, Copy, Check,
  ChevronDown, ChevronUp, Clock, ShoppingBag, RotateCcw,
  Wifi, WifiOff, HeartPulse,
} from "lucide-react";
import {
  fetchDevices, registerDevice, updateDevice, deleteDevice,
  resetDevice, recoverDevice, fetchDeviceMetrics,
  type DeviceItem, type DeviceMetrics,
} from "@/services/api";
import { DEVICE_PRICING, PLAN_BUNDLES, venuePlanToBundle } from "@/config/devicePricing";
import { useAuth } from "@/contexts/AuthContext";

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.55)";
const MUTED    = "rgba(180,155,100,0.4)";

// ── Type icons ─────────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  if (type === "kiosk")  return <Monitor   size={size} />;
  if (type === "tablet") return <Tablet    size={size} />;
  return                        <Smartphone size={size} />;
}

function typeColor(type: string): string {
  if (type === "kiosk")  return "rgba(100,160,255,0.75)";
  if (type === "tablet") return GOLD_DIM;
  return "rgba(130,200,130,0.75)";
}

// ── Relative time ──────────────────────────────────────────────────────────────

function relativeTime(dt: string | null): string {
  if (!dt) return "Never";
  const diff = Date.now() - new Date(dt).getTime();
  const m    = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (diff < 60_000) return "Just now";
  if (m < 60)        return `${m}m ago`;
  if (h < 24)        return `${h}h ago`;
  return `${d}d ago`;
}

// ── Pricing card ───────────────────────────────────────────────────────────────

function PricingCard({ type }: { type: "tablet" | "kiosk" }) {
  const pricing  = DEVICE_PRICING[type];
  const icon     = type === "kiosk" ? <Monitor size={16} /> : <Tablet size={16} />;
  const color    = type === "kiosk" ? "rgba(100,160,255,0.7)" : GOLD_DIM;

  return (
    <div className="rounded-2xl p-5 space-y-3"
      style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <p className="text-xs uppercase tracking-[0.15em]">{type} Hardware</p>
      </div>
      <p className="text-[9px]" style={{ color: MUTED }}>{pricing.description}</p>
      <div className="flex items-center gap-4">
        <div>
          <p className="font-serif text-xl" style={{ color, fontWeight: 300 }}>
            ${pricing.rentalMonthly}<span className="text-xs">/mo</span>
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>Rental</p>
        </div>
        <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div>
          <p className="font-serif text-xl" style={{ color: "rgba(200,180,145,0.7)", fontWeight: 300 }}>
            ${pricing.purchaseOneTime.toLocaleString()}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>One-time purchase</p>
        </div>
      </div>
      <ul className="space-y-1">
        {pricing.features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-[8px]" style={{ color: MUTED }}>
            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Metrics panel ──────────────────────────────────────────────────────────────

function MetricsPanel({ deviceId }: { deviceId: string }) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeviceMetrics(deviceId)
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deviceId]);

  if (loading) return (
    <div className="flex justify-center py-4">
      <motion.div className="w-4 h-4 rounded-full border"
        style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  );

  if (!metrics) return <p className="text-[9px] py-2" style={{ color: MUTED }}>No metrics available</p>;

  const { sessionsStarted, ordersPlaced, resetsTriggered, avgSessionMin, resetBreakdown } = metrics;

  return (
    <div className="pt-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Sessions",  value: sessionsStarted, icon: <Wifi size={9} /> },
          { label: "Orders",    value: ordersPlaced,    icon: <ShoppingBag size={9} /> },
          { label: "Resets",    value: resetsTriggered, icon: <RotateCcw size={9} /> },
          { label: "Avg min",   value: avgSessionMin,   icon: <Clock size={9} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-lg p-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex justify-center mb-1" style={{ color: MUTED }}>{icon}</div>
            <p className="font-serif text-lg" style={{ color: GOLD_DIM, fontWeight: 300 }}>{value}</p>
            <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
          </div>
        ))}
      </div>
      {resetsTriggered > 0 && (
        <div className="text-[8px] space-y-1" style={{ color: MUTED }}>
          <p className="uppercase tracking-wider mb-1">Reset breakdown</p>
          {[
            { label: "Inactivity",     value: resetBreakdown.inactivity },
            { label: "Order complete", value: resetBreakdown.orderComplete },
            { label: "Staff reset",    value: resetBreakdown.staffReset },
          ].filter(({ value }) => value > 0).map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span><span style={{ color: GOLD_DIM }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Device row ─────────────────────────────────────────────────────────────────

function DeviceRow({
  device, onStatusToggle, onDelete, onReset, onRecover,
}: {
  device:          DeviceItem;
  onStatusToggle:  () => void;
  onDelete:        () => void;
  onReset:         () => void;
  onRecover:       () => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [resetting,  setResetting]  = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const isActive  = device.status === "active";
  const isOffline = device.status === "offline";
  const color     = typeColor(device.type);

  const handleReset = async () => {
    setResetting(true);
    await onReset();
    setResetting(false);
  };

  const handleRecover = async () => {
    setRecovering(true);
    await onRecover();
    setRecovering(false);
  };

  const copyId = () => {
    void navigator.clipboard.writeText(device.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div className="rounded-xl overflow-hidden"
      style={{ background: isOffline ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.025)", border: `1px solid ${isOffline ? "rgba(239,68,68,0.25)" : isActive ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)"}` }}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: isActive ? 1 : 0.7, y: 0 }}>

      <div className="flex items-center gap-4 p-4">
        {/* Type icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}10`, border: `1px solid ${color}30`, color }}>
          <TypeIcon type={device.type} size={15} />
        </div>

        {/* Name + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.88)", fontWeight: 300 }}>
              {device.nickname}
            </p>
            {device.tableNumber && (
              <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>
                Table {device.tableNumber}
              </span>
            )}
            <span className="text-[6px] uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize"
              style={{ color, background: `${color}12`, border: `1px solid ${color}20` }}>
              {device.type}
            </span>
          </div>
          <p className="text-[8px] mt-0.5" style={{ color: MUTED }}>
            Last active: {relativeTime(device.lastActiveAt)}
          </p>
        </div>

        {/* Status badge — explicit Offline state in red */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isOffline ? (
            <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-semibold"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
              Offline
            </span>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: isActive ? "rgba(100,200,120,0.8)" : "rgba(200,100,100,0.6)" }} />
              <span className="text-[7px] uppercase tracking-wider hidden sm:block"
                style={{ color: isActive ? "rgba(100,200,120,0.7)" : "rgba(200,100,100,0.6)" }}>
                {device.status}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleReset} disabled={resetting} title="Reset session"
            className="p-2 rounded-lg transition-colors"
            style={{ color: MUTED, border: "1px solid rgba(255,255,255,0.06)" }}>
            <RotateCcw size={11} className={resetting ? "animate-spin" : ""} />
          </button>
          {(isOffline || !isActive) && (
            <button onClick={handleRecover} disabled={recovering}
              title={isOffline ? "Send Recovery — device missed heartbeat" : "Recover device"}
              className="p-2 rounded-lg transition-colors flex items-center gap-1"
              style={{ color: recovering ? MUTED : (isOffline ? "#ef4444" : "rgba(52,211,153,0.7)"), border: `1px solid ${isOffline ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.2)"}`, padding: isOffline ? "4px 8px" : undefined, fontSize: isOffline ? 9 : undefined, borderRadius: isOffline ? 6 : undefined }}>
              <HeartPulse size={11} className={recovering ? "animate-pulse" : ""} />
              {isOffline && <span style={{ fontWeight: 600, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recovery</span>}
            </button>
          )}
          <button onClick={onStatusToggle} title={isActive ? "Deactivate" : "Activate"}
            className="p-2 rounded-lg transition-colors"
            style={{ color: isActive ? "rgba(100,200,120,0.6)" : "rgba(200,100,100,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {isActive ? <Power size={11} /> : <PowerOff size={11} />}
          </button>
          <button onClick={() => setExpanded(!expanded)} title="Metrics"
            className="p-2 rounded-lg"
            style={{ color: MUTED, border: "1px solid rgba(255,255,255,0.06)" }}>
            {expanded ? <ChevronUp size={11} /> : <BarChart3 size={11} />}
          </button>
          <button onClick={onDelete} title="Remove"
            className="p-2 rounded-lg"
            style={{ color: "rgba(200,80,80,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* ID row */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <p className="text-[7px] font-mono" style={{ color: "rgba(180,155,100,0.25)" }}>
          {device.id.slice(0, 18)}…
        </p>
        <button onClick={copyId} className="transition-colors"
          style={{ color: copied ? "rgba(100,200,120,0.6)" : "rgba(180,155,100,0.25)" }}>
          {copied ? <Check size={8} /> : <Copy size={8} />}
        </button>
      </div>

      {/* Metrics expand */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <MetricsPanel deviceId={device.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Register form ──────────────────────────────────────────────────────────────

function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const [type,        setType]        = useState<"mobile" | "tablet" | "kiosk">("tablet");
  const [nickname,    setNickname]    = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handle = async () => {
    if (!nickname.trim()) { setError("Nickname is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await registerDevice({ type, nickname: nickname.trim(), tableNumber: tableNumber.trim() || undefined });
      setNickname(""); setTableNumber(""); setType("tablet");
      onRegistered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.14)" }}>
      <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: GOLD_DIM }}>Register New Device</p>

      {/* Type */}
      <div className="grid grid-cols-3 gap-2">
        {(["mobile", "tablet", "kiosk"] as const).map((t) => {
          const c = typeColor(t);
          return (
            <button key={t} onClick={() => setType(t)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all capitalize text-xs"
              style={type === t
                ? { background: `${c}10`, border: `1px solid ${c}40`, color: c }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: MUTED }
              }>
              <TypeIcon type={t} size={14} />{t}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <input
          className="w-full bg-transparent outline-none text-sm py-2 border-b"
          style={{ borderColor: "rgba(212,175,55,0.2)", color: "rgba(210,190,155,0.85)", caretColor: GOLD }}
          placeholder="Device nickname (e.g. Table 4 Tablet)"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(null); }}
        />
        <input
          className="w-full bg-transparent outline-none text-sm py-2 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(210,190,155,0.85)", caretColor: GOLD }}
          placeholder="Table number (optional, e.g. 4)"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
      </div>

      {error && <p className="text-[9px] text-red-400">{error}</p>}

      <motion.button onClick={handle} disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em]"
        style={{
          background: saving ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.12)",
          border: "1px solid rgba(212,175,55,0.25)", color: GOLD_DIM,
          opacity: saving ? 0.6 : 1,
        }}
        whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}>
        <Plus size={12} />{saving ? "Registering…" : "Register Device"}
      </motion.button>
    </div>
  );
}

// ── Venue QR panel ─────────────────────────────────────────────────────────────

function VenueQRPanel({ venueId }: { venueId: string }) {
  const [table,   setTable]   = useState("");
  const [mode,    setMode]    = useState<"normal" | "tablet" | "kiosk">("normal");
  const [qrUrl,   setQrUrl]   = useState<string | null>(null);

  const buildUrl = () => {
    const qs = new URLSearchParams({ tableNumber: table.trim(), mode });
    if (!table.trim()) qs.delete("tableNumber");
    setQrUrl(`/api/devices/venue-qr/${venueId}?${qs.toString()}`);
  };

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2">
        <QrCode size={13} style={{ color: GOLD_DIM }} />
        <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: GOLD_DIM }}>Venue QR Codes</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["normal", "tablet", "kiosk"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className="px-2 py-1.5 rounded-lg text-[9px] uppercase tracking-wider capitalize transition-all"
            style={mode === m
              ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", color: GOLD_DIM }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: MUTED }
            }>
            {m}
          </button>
        ))}
      </div>

      <input
        className="w-full bg-transparent outline-none text-sm py-2 border-b"
        style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(210,190,155,0.85)", caretColor: GOLD }}
        placeholder="Table number (optional)"
        value={table}
        onChange={(e) => setTable(e.target.value)}
      />

      <motion.button onClick={buildUrl}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em] w-full justify-center"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: MUTED }}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
        <QrCode size={11} />Generate QR
      </motion.button>

      {qrUrl && (
        <motion.div className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="rounded-xl p-4"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <img src={qrUrl} alt="Venue QR" className="w-48 h-48" />
          </div>
          <p className="text-[8px] text-center" style={{ color: MUTED }}>
            {mode === "kiosk" ? "Opens full-screen kiosk experience" :
             mode === "tablet" ? "Opens tablet-optimised experience" :
             "Opens standard mobile experience"}
            {table.trim() ? ` · Table ${table}` : " · Venue-wide"}
          </p>
          <a href={qrUrl} download={`qr-${mode}${table ? `-table${table}` : ""}.svg`}
            className="text-[8px] uppercase tracking-wider px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: GOLD_DIM }}>
            Download SVG
          </a>
        </motion.div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DeviceManagerTab() {
  const { user }                              = useAuth();
  const [devices,  setDevices]  = useState<DeviceItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const venueId = user?.venueId ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try { setDevices(await fetchDevices()); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleToggle = async (device: DeviceItem) => {
    await updateDevice(device.id, { status: device.status === "active" ? "inactive" : "active" });
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this device?")) return;
    await deleteDevice(id);
    void load();
  };

  const handleReset = async (id: string) => {
    await resetDevice(id);
    void load();
  };

  const handleRecover = async (id: string) => {
    try { await recoverDevice(id); } catch { /* ignore */ }
    void load();
  };

  // Plan derived from user's venue
  const planKey    = venuePlanToBundle((user as any)?.venuePlan ?? "basic");
  const plan       = PLAN_BUNDLES[planKey];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Device Manager
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            Mobile · Tablet · Kiosk — manage all venue hardware
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={load}
            className="p-2 rounded-lg" whileTap={{ scale: 0.95 }}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }}>
            <RefreshCw size={12} />
          </motion.button>
          <motion.button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs uppercase tracking-[0.12em]"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.28)", color: GOLD_DIM }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Plus size={12} />Add Device
          </motion.button>
        </div>
      </div>

      {/* Plan banner */}
      <motion.div className="rounded-xl p-4 flex items-center gap-4 flex-wrap"
        style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.15)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Monitor size={18} style={{ color: GOLD_DIM }} />
        <div className="flex-1">
          <p className="font-serif text-sm" style={{ color: GOLD_DIM, fontWeight: 300 }}>
            {plan.label} Plan — {plan.subtitle}
          </p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {plan.features.slice(0, 3).map((f) => (
              <span key={f} className="text-[7px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(212,175,55,0.07)", color: MUTED }}>
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-serif text-lg" style={{ color: GOLD_DIM, fontWeight: 300 }}>
            {plan.maxDevices === Infinity ? "∞" : plan.maxDevices} device{plan.maxDevices !== 1 ? "s" : ""}
          </p>
          <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>max registered</p>
        </div>
      </motion.div>

      {/* Register form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
            <RegisterForm onRegistered={() => { setShowForm(false); void load(); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Devices list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <motion.div className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : devices.length === 0 ? (
        <div className="py-10 text-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <Monitor size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.15)" }} />
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            No devices registered yet — add your first device above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total",    value: devices.length, color: MUTED },
              { label: "Active",   value: devices.filter((d) => d.status === "active").length,  color: "rgba(100,200,120,0.7)" },
              { label: "Offline",  value: devices.filter((d) => d.status === "offline").length, color: "rgba(239,68,68,0.7)"   },
              { label: "Inactive", value: devices.filter((d) => d.status === "inactive").length, color: "rgba(200,100,100,0.5)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="font-serif text-xl" style={{ color, fontWeight: 300 }}>{value}</p>
                <p className="text-[7px] uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
              </div>
            ))}
          </div>

          {devices.map((d) => (
            <DeviceRow
              key={d.id}
              device={d}
              onStatusToggle={() => handleToggle(d)}
              onDelete={() => handleDelete(d.id)}
              onReset={() => handleReset(d.id)}
              onRecover={() => handleRecover(d.id)}
            />
          ))}
        </div>
      )}

      {/* Hardware pricing */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>Hardware Pricing</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <PricingCard type="tablet" />
          <PricingCard type="kiosk"  />
        </div>
      </div>

      {/* QR codes */}
      {venueId && (
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] mb-3" style={{ color: MUTED }}>QR Code Generator</p>
          <VenueQRPanel venueId={venueId} />
        </div>
      )}

      {/* Mode guide */}
      <div className="rounded-xl p-5 space-y-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-[8px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Supported Modes</p>
        <div className="space-y-2">
          {[
            { icon: <Smartphone size={12} />, type: "Mobile / QR", desc: "Guests scan a QR code on their own device. Zero hardware cost.", badge: "Free" },
            { icon: <Tablet size={12} />,     type: "Tablet Mode",  desc: "Touch-first table unit with fast ordering and staff reset.", badge: "$35/mo" },
            { icon: <Monitor size={12} />,    type: "Kiosk Mode",   desc: "Full-screen front-of-house — 90s idle auto-reset, immersive UI.", badge: "$199/mo" },
          ].map(({ icon, type, desc, badge }) => (
            <div key={type} className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div style={{ color: MUTED, marginTop: 1 }}>{icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-serif" style={{ color: "rgba(210,190,155,0.8)" }}>{type}</p>
                  <span className="text-[7px] px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(212,175,55,0.08)", color: GOLD_DIM }}>{badge}</span>
                </div>
                <p className="text-[8px] mt-0.5" style={{ color: MUTED }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
