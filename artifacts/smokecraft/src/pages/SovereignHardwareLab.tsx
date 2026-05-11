/**
 * Sovereign Hardware Labs — /hardware-lab
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 * Tabs: NODE REGISTRY · STATE ENGINE
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Shield, Plus, Trash2, RefreshCw, Loader, Check,
  Radio, Activity, Cpu, Lock,
  Watch, Fingerprint, X, Zap, Brain, AlertTriangle,
} from "lucide-react";
import SovereignWatermark from "@/components/SovereignWatermark";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:     "#050A14",
  surface:"rgba(6,12,28,0.98)",
  card:   "rgba(8,18,40,0.96)",
  border: "rgba(0,128,255,0.14)",
  borderB:"rgba(0,170,255,0.38)",
  gold:   "#0080FF",   // metallic blue — all C.gold refs now Sovereign blue
  amber:  "#22AAFF",   // bright blue
  ink:    "#D8EEFF",   // platinum white
  muted:  "rgba(180,210,250,0.50)",
  dim:    "rgba(140,175,220,0.28)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
  green:  "#22c55e",
  red:    "#ef4444",
  orange: "#f97316",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType   = "RING" | "WATCH" | "BAND" | "PUCK" | "OTHER";
type Sentiment  = "OPTIMAL" | "CALM" | "FOCUSED" | "STRESSED" | "FATIGUED";
type ActiveTab  = "registry" | "state-engine" | "titan-engine";
type ExecCmd    = "TITAN_EXEC: INITIATE_RECHARGE_PROTOCOL"
                | "TITAN_EXEC: ENGAGE_SOVEREIGN_DND"
                | "TITAN_EXEC: MAINTAIN_OPTIMAL_STATE";

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

interface LiveData {
  node_id: string;
  hr?:  number;
  str?: number;
  sig?: number;
  vit?: number;
  eng?: number;
  synced_at?: string;
}

interface Intervention {
  id: number;
  vitality: number;
  sentiment: string;
  titan_exec: string;
  triggered_at: string;
}

interface TitanIntervention {
  id: number;
  trigger_type: string;
  node_id: string;
  commands: string[];
  payload_snapshot: Record<string, unknown> | null;
  status: "TRIGGERED" | "ACKNOWLEDGED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  triggered_at: string;
  acked_at: string | null;
}

// ── Titan trigger configs ──────────────────────────────────────────────────────

const TITAN_RULES: Array<{
  type: string; condition: string; commands: string[];
  severity: string; color: string; bg: string; border: string; icon: typeof Zap;
}> = [
  {
    type: "STRESS_TRIGGER", condition: "stress_index > 75",
    commands: ["SET_LIGHTING_CALM_BLUE", "ENGAGE_SOVEREIGN_DND"],
    severity: "HIGH", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.28)", icon: Brain,
  },
  {
    type: "VITALITY_TRIGGER", condition: "vitality < 20",
    commands: ["INITIATE_RECHARGE_PROTOCOL", "NOTIFY_SOVEREIGN_OPERATOR"],
    severity: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.28)", icon: AlertTriangle,
  },
  {
    type: "REVENUE_TRIGGER", condition: "ENG > 85 (or HR > 80 + STR < 40)",
    commands: ["TRIGGER_UPSELL_PROMPT", "NOTIFY_HOST_PREMIUM_PAIRING"],
    severity: "MEDIUM", color: "#D4AF37", bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.28)", icon: Zap,
  },
  {
    type: "SIGNAL_FAILSAFE", condition: "SIG < 10 OR lost > 60s",
    commands: ["OBSIDIAN_REAUTH_REQUIRED"],
    severity: "CRITICAL", color: "#a8a29e", bg: "rgba(168,162,158,0.08)", border: "rgba(168,162,158,0.25)", icon: Radio,
  },
];

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#22c55e", MEDIUM: "#D4AF37", HIGH: "#f97316", CRITICAL: "#ef4444",
};

// ── Demo scenarios ─────────────────────────────────────────────────────────────

const DEMO_SCENARIOS = [
  {
    label: "STRESS TEST",
    sub:   "STR=90 → CALM BLUE + DND",
    color: "#60a5fa",
    payload: { stress_index: 90, heart_rate: 85, vitality: 65, signal_db: -42 },
  },
  {
    label: "LOW VITALITY",
    sub:   "VIT=8 → RECHARGE + NOTIFY",
    color: "#ef4444",
    payload: { vitality: 8, heart_rate: 58, stress_index: 45, signal_db: -38 },
  },
  {
    label: "ENGAGED PATRON",
    sub:   "ENG=92 → UPSELL + HOST",
    color: "#D4AF37",
    payload: { engagement_score: 92, heart_rate: 90, stress_index: 25, vitality: 80, signal_db: -35 },
  },
  {
    label: "SIGNAL LOST",
    sub:   "SIG=3 → OBSIDIAN REAUTH",
    color: "#a8a29e",
    payload: { signal_db: 3, heart_rate: 72, stress_index: 40, vitality: 60 },
  },
];

// ── Exec command config ───────────────────────────────────────────────────────

const EXEC_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  "TITAN_EXEC: INITIATE_RECHARGE_PROTOCOL": {
    color:  C.red,
    bg:     "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.28)",
    label:  "LOW VITALITY — RECHARGE REQUIRED",
  },
  "TITAN_EXEC: ENGAGE_SOVEREIGN_DND": {
    color:  C.amber,
    bg:     "rgba(212,175,55,0.08)",
    border: "rgba(212,175,55,0.30)",
    label:  "STRESS DETECTED — DND ENGAGED",
  },
  "TITAN_EXEC: MAINTAIN_OPTIMAL_STATE": {
    color:  C.green,
    bg:     "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.28)",
    label:  "ALL SYSTEMS NOMINAL",
  },
};

const SENTIMENTS: Sentiment[] = ["OPTIMAL", "CALM", "FOCUSED", "STRESSED", "FATIGUED"];

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  OPTIMAL:  C.green,
  CALM:     "#60a5fa",
  FOCUSED:  C.gold,
  STRESSED: C.red,
  FATIGUED: C.orange,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function vitalityColor(v: number) {
  if (v < 20) return C.red;
  if (v < 50) return C.orange;
  if (v < 75) return C.amber;
  return C.green;
}

function NodeIcon({ type, size = 16, color }: { type: NodeType; size?: number; color: string }) {
  if (type === "RING")  return <Fingerprint size={size} color={color} />;
  if (type === "WATCH") return <Watch size={size} color={color} />;
  if (type === "BAND")  return <Activity size={size} color={color} />;
  if (type === "PUCK")  return <Radio size={size} color={color} />;
  return <Cpu size={size} color={color} />;
}

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

function MeterBar({ val, max, color }: { val: number | undefined; max: number; color: string }) {
  const pct = val != null ? Math.min(100, Math.max(0, (Math.abs(val) / max) * 100)) : 0;
  return (
    <div style={{ height: 2, background: "rgba(245,242,237,0.07)", borderRadius: 1, overflow: "hidden", marginTop: 3 }}>
      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 1 }} />
    </div>
  );
}

function LiveMeters({ payload, live }: { payload: Record<string, unknown> | null; live?: LiveData }) {
  const hr  = live?.hr  ?? (payload?.heart_rate        as number | undefined);
  const str = live?.str ?? (payload?.stress_index      as number | undefined);
  const sig = live?.sig ?? (payload?.signal_db         as number | undefined);
  const vit = live?.vit ?? (payload?.vitality          as number | undefined);
  const eng = live?.eng ?? (payload?.engagement_score  as number | undefined);

  if (!payload && !live) {
    return <span style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em" }}>NO SYNC DATA</span>;
  }

  const hrColor  = (hr ?? 0) > 100 ? C.orange : C.gold;
  const strColor = (str ?? 0) >= 75 ? C.red : (str ?? 0) >= 40 ? C.amber : "#60a5fa";
  const sigCrit  = sig != null && sig >= 0 && sig < 10;
  const sigColor = sigCrit ? C.red : sig != null && sig > -60 ? C.green : C.orange;

  const meters = [
    { label: "HR",  val: hr,  unit: "",    color: hrColor,  max: 180 },
    { label: "STR", val: str, unit: "",    color: strColor, max: 100 },
    { label: "SIG", val: sig, unit: " dB", color: sigColor, max: 100 },
    ...(vit != null ? [{ label: "VIT", val: vit, unit: "", color: vitalityColor(vit), max: 100 }] : []),
    ...(eng != null ? [{ label: "ENG", val: eng, unit: "", color: C.gold, max: 100 }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {live && (
        <div style={{ fontSize: 7, color: C.green, letterSpacing: "0.18em", marginBottom: 1, display: "flex", alignItems: "center", gap: 5 }}>
          <span className="sovereign-breath">●</span> LIVE
        </div>
      )}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {meters.map(m => (
          <div key={m.label} style={{ minWidth: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 7, color: C.dim, letterSpacing: "0.16em" }}>{m.label}</span>
              <motion.span
                key={`${m.label}-${m.val}`}
                initial={{ opacity: 0.5, y: -2 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 10, color: m.val != null ? m.color : C.dim, fontWeight: 600, fontFamily: C.mono }}>
                {m.val != null ? `${m.val}${m.unit}` : "—"}
              </motion.span>
            </div>
            <MeterBar val={m.val} max={m.max} color={m.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Add Node Modal ─────────────────────────────────────────────────────────────

function AddNodeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [hardwareId, setHwId] = useState("");
  const [nodeType, setType]   = useState<NodeType>("RING");
  const [label, setLabel]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const NODE_TYPES: NodeType[] = ["RING", "WATCH", "BAND", "PUCK", "OTHER"];

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: "32px 28px", width: "100%", maxWidth: 440, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.dim }}><X size={16} /></button>
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

// ── State Engine Tab ──────────────────────────────────────────────────────────

function StateEngineTab() {
  const [vitality, setVitality]   = useState(75);
  const [sentiment, setSentiment] = useState<Sentiment>("OPTIMAL");
  const [result, setResult]       = useState<{ titan_exec: string; evaluated_at: string } | null>(null);
  const [running, setRunning]     = useState(false);
  const [log, setLog]             = useState<Intervention[]>([]);
  const [loadingLog, setLoadLog]  = useState(true);

  const loadLog = useCallback(async () => {
    setLoadLog(true);
    try {
      const res  = await fetch("/api/biometric/interventions");
      const data = await res.json() as { interventions?: Intervention[] };
      setLog(data.interventions ?? []);
    } catch { /* graceful */ }
    finally { setLoadLog(false); }
  }, []);

  useEffect(() => { loadLog(); }, [loadLog]);

  const execute = async () => {
    setRunning(true); setResult(null);
    try {
      const res  = await fetch("/api/biometric/state-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vitality, sentiment }),
      });
      const data = await res.json() as { ok?: boolean; titan_exec?: string; evaluated_at?: string };
      if (data.ok && data.titan_exec) {
        setResult({ titan_exec: data.titan_exec, evaluated_at: data.evaluated_at ?? "" });
        await loadLog();
      }
    } catch { /* graceful */ }
    finally { setRunning(false); }
  };

  const vColor   = vitalityColor(vitality);
  const execConf = result ? (EXEC_CONFIG[result.titan_exec] ?? EXEC_CONFIG["TITAN_EXEC: MAINTAIN_OPTIMAL_STATE"]) : null;

  return (
    <div>
      {/* Input panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Vitality */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 20px" }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 16 }}>VITALITY LEVEL</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 48, color: vColor, fontFamily: C.serif, lineHeight: 1, transition: "color 0.3s" }}>{vitality}</span>
            <span style={{ fontSize: 10, color: C.dim }}>/ 100</span>
          </div>
          <input type="range" min={0} max={100} value={vitality} onChange={e => setVitality(Number(e.target.value))}
            style={{ width: "100%", accentColor: vColor, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 8, color: C.red, letterSpacing: "0.14em" }}>0 — CRITICAL</span>
            <span style={{ fontSize: 8, color: C.green, letterSpacing: "0.14em" }}>100 — PEAK</span>
          </div>
          {vitality < 20 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginTop: 12, fontSize: 9, color: C.red, letterSpacing: "0.14em", fontWeight: 700 }}>
              ⚠ RECHARGE THRESHOLD BREACHED
            </motion.div>
          )}
        </div>

        {/* Sentiment */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 20px" }}>
          <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 16 }}>SENTIMENT STATE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SENTIMENTS.map(s => {
              const sel = sentiment === s;
              return (
                <motion.button key={s} whileTap={{ scale: 0.97 }} onClick={() => setSentiment(s)}
                  style={{ padding: "10px 14px", borderRadius: 8, background: sel ? `${SENTIMENT_COLOR[s]}14` : "rgba(245,242,237,0.03)", border: `1px solid ${sel ? SENTIMENT_COLOR[s] : C.border}`, color: sel ? SENTIMENT_COLOR[s] : C.muted, fontSize: 10, fontWeight: sel ? 700 : 400, cursor: "pointer", letterSpacing: "0.12em", fontFamily: C.mono, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s" }}>
                  {s}
                  {sel && <Check size={11} />}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Execute button */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={execute} disabled={running}
        style={{ width: "100%", padding: "16px", borderRadius: 10, background: running ? "rgba(212,175,55,0.18)" : C.gold, border: "none", color: "#050505", fontSize: 11, fontWeight: 800, cursor: running ? "not-allowed" : "pointer", letterSpacing: "0.18em", fontFamily: C.mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
        {running
          ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> EVALUATING STATE…</>
          : <><Zap size={14} /> EXECUTE STATE CHECK</>}
      </motion.button>

      {/* Result */}
      <AnimatePresence>
        {result && execConf && (
          <motion.div key={result.evaluated_at}
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ background: execConf.bg, border: `1px solid ${execConf.border}`, borderRadius: 12, padding: "24px 24px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
            {/* Ambient glow */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80%", height: 60, background: `radial-gradient(ellipse,${execConf.color}18,transparent)`, pointerEvents: "none" }} />
            <div style={{ fontSize: 8, color: execConf.color, letterSpacing: "0.26em", marginBottom: 10, opacity: 0.7 }}>TITAN V KERNEL OUTPUT</div>
            <div style={{ fontSize: 15, color: execConf.color, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 6, fontFamily: C.mono }}>
              {result.titan_exec}
            </div>
            <div style={{ fontSize: 9, color: execConf.color, opacity: 0.65, letterSpacing: "0.14em", marginBottom: 14 }}>{execConf.label}</div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>
                VITALITY <span style={{ color: vColor, fontWeight: 700 }}>{vitality}</span>
              </div>
              <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>
                SENTIMENT <span style={{ color: SENTIMENT_COLOR[sentiment], fontWeight: 700 }}>{sentiment}</span>
              </div>
              <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>
                {new Date(result.evaluated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intervention log */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em" }}>INTERVENTION LOG</div>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <motion.button whileTap={{ scale: 0.93 }} onClick={loadLog}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, display: "flex", alignItems: "center", gap: 5, fontSize: 8, letterSpacing: "0.14em" }}>
          <RefreshCw size={10} /> REFRESH
        </motion.button>
      </div>

      {loadingLog && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", color: C.muted, fontSize: 10 }}>
          <Loader size={13} color={C.gold} style={{ animation: "spin 1s linear infinite" }} /> LOADING LOG…
        </div>
      )}

      {!loadingLog && log.length === 0 && (
        <div style={{ padding: "28px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.16em" }}>NO INTERVENTIONS LOGGED YET</div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 6, lineHeight: 1.7 }}>Execute a state check above to generate the first entry.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {log.map((entry, i) => {
          const conf = EXEC_CONFIG[entry.titan_exec] ?? EXEC_CONFIG["TITAN_EXEC: MAINTAIN_OPTIMAL_STATE"];
          return (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: conf.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: conf.color, fontWeight: 700, letterSpacing: "0.10em", marginBottom: 2 }}>{entry.titan_exec}</div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>
                  VIT <span style={{ color: vitalityColor(entry.vitality) }}>{entry.vitality}</span>
                  {" · "}
                  SENT <span style={{ color: SENTIMENT_COLOR[entry.sentiment as Sentiment] ?? C.muted }}>{entry.sentiment}</span>
                </div>
              </div>
              <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.10em", flexShrink: 0 }}>
                {new Date(entry.triggered_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Titan Engine Tab ──────────────────────────────────────────────────────────

function TitanEngineTab({ nodes }: { nodes: HardwareNode[] }) {
  const [feed, setFeed]         = useState<TitanIntervention[]>([]);
  const [loadingFeed, setLoad]  = useState(true);
  const [acking, setAcking]     = useState<number | null>(null);
  const [demoNode, setDemoNode] = useState("SOV_RING_01");
  const [firing, setFiring]     = useState<string | null>(null);
  const [lastFired, setLast]    = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoad(true);
    try {
      const res  = await fetch("/api/titan/interventions");
      const data = await res.json() as { interventions?: TitanIntervention[] };
      setFeed(data.interventions ?? []);
    } catch { /* graceful */ }
    finally { setLoad(false); }
  }, []);

  useEffect(() => {
    loadFeed();
    const t = setInterval(loadFeed, 5000);
    return () => clearInterval(t);
  }, [loadFeed]);

  const acknowledge = async (id: number) => {
    setAcking(id);
    try {
      await fetch(`/api/titan/interventions/${id}/acknowledge`, { method: "POST" });
      await loadFeed();
    } finally { setAcking(null); }
  };

  const demoFire = async (scenario: typeof DEMO_SCENARIOS[0]) => {
    setFiring(scenario.label);
    setLast(null);
    const nodeId = demoNode.trim() || "SOV_RING_01";
    try {
      await fetch("/api/biometric/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, ...scenario.payload }),
      });
      setLast(scenario.label);
      setTimeout(loadFeed, 800);
    } catch { /* graceful */ }
    finally { setFiring(null); }
  };

  const activeCount = feed.filter(i => i.status === "TRIGGERED").length;
  const authorizedIds = nodes.filter(n => n.authorized).map(n => n.hardware_id);

  return (
    <div>
      {/* Active alert banner */}
      {activeCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="sovereign-breath" style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
          <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, letterSpacing: "0.14em" }}>
            {activeCount} ACTIVE INTERVENTION{activeCount > 1 ? "S" : ""} REQUIRE ACKNOWLEDGEMENT
          </div>
        </motion.div>
      )}

      {/* 4 Armed Trigger Rules */}
      <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 12 }}>4 TRIGGERS ARMED</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {TITAN_RULES.map(rule => (
          <div key={rule.type} style={{ background: rule.bg, border: `1px solid ${rule.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <rule.icon size={13} color={rule.color} />
              <span style={{ fontSize: 9, color: rule.color, fontWeight: 800, letterSpacing: "0.12em" }}>{rule.type}</span>
              <span style={{ marginLeft: "auto", fontSize: 7, color: SEVERITY_COLOR[rule.severity], background: `${SEVERITY_COLOR[rule.severity]}18`, border: `1px solid ${SEVERITY_COLOR[rule.severity]}40`, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.14em", fontWeight: 700 }}>
                {rule.severity}
              </span>
            </div>
            <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em", marginBottom: 8 }}>
              IF <span style={{ color: C.ink }}>{rule.condition}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rule.commands.map(cmd => (
                <div key={cmd} style={{ fontSize: 8, color: rule.color, background: `${rule.color}10`, border: `1px solid ${rule.color}20`, borderRadius: 4, padding: "3px 8px", letterSpacing: "0.10em", fontFamily: C.mono }}>
                  → {cmd}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Demo Fire — The Clark Factor */}
      <div style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 20px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Zap size={12} color={C.gold} />
          <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>DEMO FIRE — CLARK FACTOR</div>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>NODE</span>
            <select value={demoNode} onChange={e => setDemoNode(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.ink, fontSize: 9, fontFamily: C.mono, outline: "none", cursor: "pointer" }}>
              {authorizedIds.length > 0
                ? authorizedIds.map(id => <option key={id} value={id}>{id}</option>)
                : <option value="SOV_RING_01">SOV_RING_01</option>}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {DEMO_SCENARIOS.map(s => (
            <motion.button key={s.label} whileTap={{ scale: 0.96 }} onClick={() => demoFire(s)}
              disabled={firing !== null}
              style={{ flex: 1, minWidth: 160, padding: "14px 16px", borderRadius: 10, background: firing === s.label ? `${s.color}20` : `${s.color}12`, border: `1px solid ${s.color}40`, color: s.color, fontFamily: C.mono, cursor: firing !== null ? "not-allowed" : "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {firing === s.label ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={10} />}
                {s.label}
              </div>
              <div style={{ fontSize: 8, color: `${s.color}80`, letterSpacing: "0.10em" }}>{s.sub}</div>
            </motion.button>
          ))}
        </div>
        {lastFired && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 12, fontSize: 9, color: C.green, letterSpacing: "0.14em" }}>
            ✓ SYNC FIRED — {lastFired} — engine evaluating…
          </motion.div>
        )}
      </div>

      {/* Live feed */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em" }}>LIVE INTERVENTION FEED</div>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        {loadingFeed && <Loader size={10} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />}
        <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>AUTO-REFRESH 5s</span>
      </div>

      {!loadingFeed && feed.length === 0 && (
        <div style={{ padding: "28px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.16em" }}>NO INTERVENTIONS FIRED YET</div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Use DEMO FIRE above to trigger the engine.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {feed.map((item, i) => {
          const rule = TITAN_RULES.find(r => r.type === item.trigger_type);
          const color  = rule?.color  ?? C.muted;
          const bg     = rule?.bg     ?? C.card;
          const border = rule?.border ?? C.border;
          const snap   = item.payload_snapshot ?? {};
          const isAcked = item.status === "ACKNOWLEDGED";
          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              style={{ background: isAcked ? C.card : bg, border: `1px solid ${isAcked ? C.border : border}`, borderRadius: 12, padding: "16px 18px", opacity: isAcked ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: isAcked ? C.dim : color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: isAcked ? C.dim : color, fontWeight: 700, letterSpacing: "0.10em" }}>{item.trigger_type}</span>
                    <span style={{ fontSize: 7, color: SEVERITY_COLOR[item.severity] ?? C.muted, background: `${SEVERITY_COLOR[item.severity] ?? C.muted}18`, border: `1px solid ${SEVERITY_COLOR[item.severity] ?? C.muted}30`, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.12em" }}>{item.severity}</span>
                    <span style={{ fontSize: 7, color: isAcked ? C.dim : C.green, background: isAcked ? "rgba(245,242,237,0.04)" : "rgba(34,197,94,0.08)", border: `1px solid ${isAcked ? C.border : "rgba(34,197,94,0.25)"}`, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.12em" }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {item.commands.map(cmd => (
                      <span key={cmd} style={{ fontSize: 8, color: isAcked ? C.dim : color, background: `${color}10`, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em", fontFamily: C.mono }}>
                        {cmd}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.10em" }}>NODE <span style={{ color: C.ink }}>{item.node_id}</span></span>
                    {snap.stress_index != null && <span style={{ fontSize: 8, color: C.dim }}>STR <span style={{ color: "#60a5fa" }}>{String(snap.stress_index)}</span></span>}
                    {snap.vitality     != null && <span style={{ fontSize: 8, color: C.dim }}>VIT <span style={{ color: "#ef4444" }}>{String(snap.vitality)}</span></span>}
                    {snap.heart_rate   != null && <span style={{ fontSize: 8, color: C.dim }}>HR <span style={{ color: C.gold }}>{String(snap.heart_rate)}</span></span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.10em" }}>
                    {new Date(item.triggered_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  {!isAcked && (
                    <motion.button whileTap={{ scale: 0.93 }} onClick={() => acknowledge(item.id)}
                      disabled={acking === item.id}
                      style={{ padding: "5px 12px", borderRadius: 6, background: `${color}14`, border: `1px solid ${color}35`, color, fontSize: 8, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em", display: "flex", alignItems: "center", gap: 5, fontFamily: C.mono }}>
                      {acking === item.id ? <Loader size={9} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={9} />}
                      ACK
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SovereignHardwareLab() {
  const [, navigate]  = useLocation();
  const [tab, setTab] = useState<ActiveTab>("registry");
  const [nodes, setNodes]       = useState<HardwareNode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [testId, setTestId]     = useState("");
  const [testResult, setTestRes]= useState<{ authenticated: boolean; node_type?: string; label?: string; reason?: string } | null>(null);
  const [testing, setTesting]   = useState(false);
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({});
  const [pulsing, setPulsing]   = useState<Set<string>>(new Set());

  // Live Pulse Sync — SSE subscription
  useEffect(() => {
    const es = new EventSource("/api/biometric/live");
    es.onmessage = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data as string) as LiveData;
        if (!d.node_id) return;
        setLiveData(prev => ({ ...prev, [d.node_id]: d }));
        setPulsing(prev => new Set(prev).add(d.node_id));
        setTimeout(() => setPulsing(prev => {
          const next = new Set(prev);
          next.delete(d.node_id);
          return next;
        }), 500);
      } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  }, []);

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

  const TABS = [
    { id: "registry" as ActiveTab,      label: "NODE REGISTRY",  icon: Shield },
    { id: "state-engine" as ActiveTab,  label: "STATE ENGINE",   icon: Brain  },
    { id: "titan-engine" as ActiveTab,  label: "TITAN ENGINE",   icon: Zap    },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.ink, fontFamily: C.mono, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 900, height: 180, background: "radial-gradient(ellipse,rgba(0,128,255,0.09) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div className="scan-line" style={{ pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,10,20,0.97)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => navigate("/distribution")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(0,128,255,0.07)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer" }}>
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
          {tab === "registry" && <>
            <motion.button whileTap={{ scale: 0.93 }} onClick={load}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: `${C.gold}10`, border: `1px solid ${C.border}`, color: C.muted, fontSize: 9, cursor: "pointer", letterSpacing: "0.12em" }}>
              <RefreshCw size={11} /> REFRESH
            </motion.button>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, background: C.gold, border: "none", color: "#050505", fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em" }}>
              <Plus size={11} /> ADD NODE
            </motion.button>
          </>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, padding: "0 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,10,20,0.94)", flexShrink: 0 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "none", border: "none", borderBottom: `2px solid ${active ? C.gold : "transparent"}`, color: active ? C.gold : C.muted, fontFamily: C.mono, fontSize: 9, fontWeight: active ? 800 : 400, letterSpacing: "0.14em", cursor: "pointer", transition: "all 0.16s" }}>
              <t.icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <AnimatePresence mode="wait">

          {/* ── NODE REGISTRY ── */}
          {tab === "registry" && (
            <motion.div key="registry" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
                {[
                  { label: "TOTAL NODES", value: nodes.length,    color: C.gold },
                  { label: "AUTHORIZED",  value: authorizedCount, color: C.green },
                  { label: "REVOKED",     value: revokedCount,    color: C.red },
                ].map(s => (
                  <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.22em", marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 28, color: s.color, fontFamily: C.serif }}>{s.value}</div>
                  </div>
                ))}
                {/* Auth tester */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px", gridColumn: "span 2" }}>
                  <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 10 }}>AUTHENTICATE NODE</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={testId} onChange={e => { setTestId(e.target.value); setTestRes(null); }}
                      placeholder="Enter hardware_id…" onKeyDown={e => e.key === "Enter" && testAuth()}
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
                        {testResult.authenticated ? <Check size={13} color={C.green} /> : <X size={13} color={C.red} />}
                        <div>
                          <div style={{ fontSize: 10, color: testResult.authenticated ? C.green : C.red, fontWeight: 700, letterSpacing: "0.12em" }}>
                            {testResult.authenticated ? "AUTHENTICATED" : `REJECTED — ${testResult.reason}`}
                          </div>
                          {testResult.authenticated && <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{testResult.node_type} · {testResult.label}</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em" }}>REGISTERED NODES</div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              {loading && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px", color: C.muted, fontSize: 10 }}><Loader size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} /> LOADING REGISTRY…</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nodes.map((node, i) => (
                  <motion.div key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ background: C.card, border: `1px solid ${node.authorized ? C.border : "rgba(239,68,68,0.14)"}`, borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className={`pulse pulse-delay-${(i % 4) + 1}`} style={{ width: 44, height: 44, borderRadius: 11, background: node.authorized ? `${C.gold}12` : "rgba(239,68,68,0.08)", border: `1px solid ${node.authorized ? C.border : "rgba(239,68,68,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                        <NodeIcon type={node.node_type} size={18} color={node.authorized ? C.gold : C.red} />
                        <AnimatePresence>
                          {pulsing.has(node.hardware_id) && (
                            <motion.div key="pulse"
                              initial={{ scale: 1, opacity: 0.7 }}
                              animate={{ scale: 1.9, opacity: 0 }}
                              exit={{}}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              style={{ position: "absolute", inset: 0, borderRadius: 11, border: `2px solid ${C.gold}`, pointerEvents: "none" }} />
                          )}
                        </AnimatePresence>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, letterSpacing: "0.08em" }}>{node.hardware_id}</span>
                          <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em", background: "rgba(245,242,237,0.06)", padding: "2px 7px", borderRadius: 4 }}>{node.node_type}</span>
                          <AuthBadge authorized={node.authorized} />
                        </div>
                        {node.label && <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>{node.label}</div>}
                        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                          <LiveMeters payload={node.last_sync_payload} live={liveData[node.hardware_id]} />
                          {node.last_sync_at && <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em" }}>LAST SYNC {new Date(node.last_sync_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
                          <div style={{ fontSize: 8, color: `${C.dim}70`, letterSpacing: "0.12em" }}>REG {new Date(node.registered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {node.authorized ? (
                          <motion.button whileTap={{ scale: 0.93 }} onClick={() => revoke(node.id)} disabled={revoking === node.id}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", color: C.red, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.10em" }}>
                            {revoking === node.id ? <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={10} />} REVOKE
                          </motion.button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 9, color: C.dim, letterSpacing: "0.10em" }}><Lock size={10} /> LOCKED</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Interop reference */}
              <div style={{ marginTop: 36, padding: "18px 20px", background: "rgba(212,175,55,0.04)", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 10 }}>TITAN V KERNEL INTEROP</div>
                <pre style={{ margin: 0, fontSize: 9, color: C.dim, lineHeight: 1.9, fontFamily: C.mono, whiteSpace: "pre-wrap" }}>{
`POST /api/biometric/authenticate  { "hardware_id": "SOV_RING_01" }
POST /api/biometric/sync          { "node_id": "SOV_RING_01", "heart_rate": 72, "stress_index": 31 }
GET  /api/biometric/live          — SSE stream  →  biometric_update events (Live Pulse Sync)
GET  /api/biometric/nodes
POST /api/biometric/nodes         { "hardware_id": "SOV_RING_02", "node_type": "RING", "label": "…" }
DELETE /api/biometric/nodes/:id   — revoke
POST /api/biometric/state-check   { "vitality": 75, "sentiment": "OPTIMAL" }
GET  /api/biometric/interventions — last 50 logged commands`
                }</pre>
              </div>
            </motion.div>
          )}

          {/* ── STATE ENGINE ── */}
          {tab === "state-engine" && (
            <motion.div key="state-engine" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Brain size={14} color={C.gold} />
                <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>STATE INTERVENTION ENGINE</div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>TITAN V KERNEL · check_state_interventions()</span>
              </div>
              <StateEngineTab />
            </motion.div>
          )}

          {/* ── TITAN ENGINE ── */}
          {tab === "titan-engine" && (
            <motion.div key="titan-engine" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <Zap size={14} color={C.gold} />
                <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>TITAN V INTERVENTION ENGINE</div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>evaluateAndFireInterventions() · 30s signal monitor</span>
              </div>
              <TitanEngineTab nodes={nodes} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <SovereignWatermark />

      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,10,20,0.97)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
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
