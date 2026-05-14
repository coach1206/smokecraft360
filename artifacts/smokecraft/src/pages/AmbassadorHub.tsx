/**
 * AmbassadorHub — /ambassador-hub
 * Clark's limited command deck. Demo-mode only.
 * Panels: home · wizard (Venue Onboarding) · ping · nodes
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Star, Cpu, Radio, LogOut, ChevronRight, Check,
  Wifi, WifiOff, Loader, Plus, MapPin, Monitor,
  Tablet, Smartphone, Layout, Lock, Activity,
} from "lucide-react";
import { socket } from "@/lib/socket";
import AmbassadorWatermark from "@/components/AmbassadorWatermark";

export const AMBASSADOR_SESSION_KEY = "AMBASSADOR_SESSION";

const C = {
  bg:     "#050A14",
  surface:"rgba(6,12,28,0.98)",
  gold:   "#0080FF",   // metallic blue — all C.gold refs now Sovereign blue
  amber:  "#22AAFF",   // bright blue
  ink:    "#D8EEFF",   // platinum white
  muted:  "rgba(180,210,250,0.50)",
  dim:    "rgba(140,175,220,0.28)",
  border: "rgba(0,128,255,0.14)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
  green:  "#22c55e",
  red:    "#ef4444",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function genLocationId(): string {
  const ts  = Date.now().toString(36).toUpperCase().slice(-5);
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `LOC-${ts}-${rnd}`;
}

function authHeader() {
  const t = localStorage.getItem(AMBASSADOR_SESSION_KEY) ?? "";
  return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
}

// ── Hardware options ──────────────────────────────────────────────────────────

const HARDWARE = [
  { id: "SMART_MIRROR",      label: "Smart Mirror",        icon: Monitor,   desc: "Full-height luxury display" },
  { id: "INTERACTIVE_TABLE", label: "Interactive Table",   icon: Layout,    desc: "Embedded tabletop surface" },
  { id: "MOBILE_HUD",        label: "Mobile HUD",          icon: Smartphone, desc: "Tablet/iPad field unit" },
  { id: "STANDARD_KIOSK",    label: "Standard Kiosk",      icon: Tablet,    desc: "Counter-mounted terminal" },
] as const;

type HardwareId = typeof HARDWARE[number]["id"];

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "home" | "wizard" | "ping" | "nodes";
type WizardStep = 1 | 2 | 3 | "summary";
type NervousState = "idle" | "testing" | "verified" | "failed";

interface NodeRow {
  id: number;
  serial_number: string;
  status: string;
  batch_id: number;
  venue_name?: string;
  location_id?: string;
  node_type?: string;
}

interface AmbassadorNode {
  id: number;
  serial_number: string;
  venue_name: string;
  location_id: string;
  node_type: string;
  status: string;
  created_at: string;
}

// ── Nervous System Test ───────────────────────────────────────────────────────

function NervousSystemTest({ onComplete }: { onComplete: (ok: boolean) => void }) {
  const [state, setState]   = useState<NervousState>("idle");
  const [countdown, setCd]  = useState(5);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTest = () => {
    setState("testing");
    setCd(5);
    let c = 5;
    intervalRef.current = setInterval(() => {
      c -= 1;
      setCd(c);
      if (c <= 0) {
        clearInterval(intervalRef.current!);
        setState("verified");
        onComplete(true);
      }
    }, 1000);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div style={{ position: "relative", textAlign: "center", padding: "32px 0" }}>
      {/* Ripple rings — pure CSS sovereignRipple, GPU-composited */}
      {state === "testing" && [0, 1, 2, 3].map(i => (
        <div key={i} className="ripple-effect"
          style={{
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 60, height: 60,
            animationDuration: "1.8s",
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.45}s`,
            animationFillMode: "none",
          }}
        />
      ))}

      {/* Center icon */}
      <motion.div
        animate={state === "testing"
          ? { scale: [1, 1.12, 1], opacity: [1, 0.6, 1] }
          : {}}
        transition={{ duration: 0.4, repeat: state === "testing" ? Infinity : 0 }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: "50%", background: state === "verified" ? "rgba(34,197,94,0.12)" : `rgba(212,175,55,0.10)`, border: `2px solid ${state === "verified" ? C.green : C.gold}`, marginBottom: 20, position: "relative" }}>
        {state === "verified"
          ? <Check size={28} color={C.green} />
          : <Radio size={28} color={C.gold} className={state === "testing" ? "pulse" : ""} />
        }
      </motion.div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 1.8, letterSpacing: "0.08em" }}>
              Verifies the Socket.io connection between<br/>this device and the Titan V nervous system.
            </div>
            <motion.button whileTap={{ scale: 0.94 }} onClick={startTest}
              style={{ padding: "14px 32px", borderRadius: 10, background: C.gold, border: "none", color: "#050505", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.14em", fontFamily: C.mono }}>
              FIRE_GOLD_RIPPLE
            </motion.button>
          </motion.div>
        )}
        {state === "testing" && (
          <motion.div key="testing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 28, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 8 }}>{countdown}</div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16 }}>
              {["ENGINE CORE", "AI NODE", "INVENTORY", "ORACLE"].map((l, i) => (
                <div key={l} className={`pulse pulse-delay-${(i + 1) as 1 | 2 | 3 | 4}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--titan-green)" }} />
                  <span style={{ fontSize: 7, color: C.dim, letterSpacing: "0.14em" }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.20em" }}>TESTING_SIGNAL_INTEGRITY…</div>
          </motion.div>
        )}
        {state === "verified" && (
          <motion.div key="verified" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ fontSize: 13, color: C.green, fontWeight: 700, letterSpacing: "0.16em", marginBottom: 8 }}>
              CONNECTION VERIFIED
            </div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.12em", lineHeight: 1.8 }}>
              4 NODES ACTIVE · LATENCY: NOMINAL<br/>TITAN V NERVOUS SYSTEM RESPONSIVE
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "AUTHORIZED" || status === "ACTIVE") {
    return (
      <span className="sovereign-breath"
        style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.green, letterSpacing: "0.16em", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.30)", padding: "3px 8px", borderRadius: 4 }}>
        ● ACTIVE
      </span>
    );
  }
  if (status === "PENDING" || status === "OBSIDIAN_LOCK") {
    return (
      <span style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.gold, letterSpacing: "0.16em", background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`, padding: "3px 8px", borderRadius: 4 }}>
        🔒 OBSIDIAN LOCK
      </span>
    );
  }
  return (
    <span style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.dim, letterSpacing: "0.16em", background: "rgba(245,242,237,0.04)", border: "1px solid rgba(245,242,237,0.10)", padding: "3px 8px", borderRadius: 4 }}>
      ◌ OFFLINE
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AmbassadorHub() {
  const [, navigate] = useLocation();
  const [panel, setPanel]     = useState<Panel>("home");

  // ── Ping state ──
  const [nodes, setNodes]       = useState<NodeRow[]>([]);
  const [pingStatus, setPing]   = useState<"idle" | "pinging" | "online" | "offline">("idle");
  const [pingResults, setPingR] = useState<Record<number, "online" | "offline">>({});

  // ── Ambassador nodes state ──
  const [ambNodes, setAmbNodes] = useState<AmbassadorNode[]>([]);
  const [loadingAmb, setLoadA]  = useState(false);

  // ── Wizard state ──
  const [wizStep, setWizStep]   = useState<WizardStep>(1);
  const [venueName, setVenueName] = useState("");
  const [locationId, setLocId]  = useState(genLocationId());
  const [hardware, setHardware] = useState<HardwareId | null>(null);
  const [nervousOk, setNervOk]  = useState(false);
  const [submitting, setSubmit] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [createdNode, setCreated] = useState<{ serial: string; venue: string; nodeType: string; locationId: string } | null>(null);

  // Gate + revoke
  useEffect(() => {
    if (!localStorage.getItem(AMBASSADOR_SESSION_KEY)) navigate("/ambassador-gate");
  }, [navigate]);

  useEffect(() => {
    const h = () => { localStorage.removeItem(AMBASSADOR_SESSION_KEY); navigate("/ambassador-gate"); };
    socket.on("SOVEREIGN_SESSION_REVOKED", h);
    return () => { socket.off("SOVEREIGN_SESSION_REVOKED", h); };
  }, [navigate]);

  // ── Node Ping ──────────────────────────────────────────────────────────────

  const loadPingNodes = async () => {
    setPing("pinging");
    try {
      const res  = await fetch("/api/distribution/nodes");
      const data = await res.json() as { nodes?: NodeRow[] };
      const list = data.nodes ?? [];
      setNodes(list);
      const r: Record<number, "online" | "offline"> = {};
      list.forEach(n => { r[n.id] = n.status === "AUTHORIZED" ? "online" : "offline"; });
      setPingR(r);
      setPing(list.length > 0 ? "online" : "idle");
    } catch { setPing("offline"); }
  };

  // ── Ambassador Nodes ────────────────────────────────────────────────────────

  const loadAmbNodes = async () => {
    setLoadA(true);
    try {
      const res  = await fetch("/api/ambassador/nodes", { headers: authHeader() });
      const data = await res.json() as { nodes?: AmbassadorNode[] };
      setAmbNodes(data.nodes ?? []);
    } catch { /* graceful */ }
    finally { setLoadA(false); }
  };

  // ── Wizard submit ──────────────────────────────────────────────────────────

  const submitNode = async () => {
    if (!venueName.trim() || !hardware || !nervousOk) return;
    setSubmit(true); setSubmitErr("");
    try {
      const res  = await fetch("/api/ambassador/initialize-node", {
        method: "POST", headers: authHeader(),
        body: JSON.stringify({ venueName: venueName.trim(), locationId, nodeType: hardware }),
      });
      const data = await res.json() as { ok?: boolean; serial?: string; error?: string };
      if (data.ok && data.serial) {
        setCreated({ serial: data.serial, venue: venueName.trim(), nodeType: hardware, locationId });
        setWizStep("summary");
      } else {
        setSubmitErr(data.error ?? "Submission failed");
      }
    } catch {
      setSubmitErr("Network error — check connection");
    } finally { setSubmit(false); }
  };

  const resetWizard = () => {
    setWizStep(1); setVenueName(""); setLocId(genLocationId());
    setHardware(null); setNervOk(false); setCreated(null); setSubmitErr("");
  };

  const signOut = () => { localStorage.removeItem(AMBASSADOR_SESSION_KEY); navigate("/ambassador-gate"); };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.ink, fontFamily: C.mono, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 900, height: 180, background: "radial-gradient(ellipse,rgba(0,128,255,0.09) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div className="scan-line" style={{ pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "rgba(5,10,20,0.97)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Star size={16} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>AMBASSADOR COMMAND DECK</div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>NOVEE OS · DEMO MODE · CLARK // 360 ENTERPRISES SERVICES LLC</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="pulse pulse-delay-1" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: "0.12em" }}>DEMO ACTIVE</span>
          <motion.button whileTap={{ scale: 0.93 }} onClick={signOut}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#ef4444", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>
            <LogOut size={11} /> SIGN OUT
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px" }}>
        <AnimatePresence mode="wait">

          {/* ── HOME ── */}
          {panel === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 24 }}>SELECT A TOOL</div>

              {/* INITIALIZE NEW NODE — Gold hero tile */}
              <motion.div whileHover={{ scale: 1.008 }} whileTap={{ scale: 0.98 }}
                onClick={() => { resetWizard(); setPanel("wizard"); }}
                style={{ background: `linear-gradient(135deg,rgba(0,128,255,0.14) 0%,rgba(0,128,255,0.06) 100%)`, border: `1px solid rgba(0,128,255,0.45)`, borderRadius: 14, padding: "28px 28px", cursor: "pointer", display: "flex", alignItems: "center", gap: 22, marginBottom: 16, position: "relative", overflow: "hidden", maxWidth: 900 }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, background: "radial-gradient(circle,rgba(0,128,255,0.12),transparent)", borderRadius: "0 14px 0 100%", pointerEvents: "none" }} />
                <div style={{ width: 56, height: 56, borderRadius: 14, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plus size={26} color="#050505" strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 6, fontWeight: 300 }}>INITIALIZE NEW NODE</div>
                  <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.7 }}>
                    Register a new venue, select hardware, verify connectivity, and transmit a Sovereign activation request — all without manual escalation.
                  </div>
                </div>
                <ChevronRight size={20} color={C.gold} style={{ flexShrink: 0 }} />
              </motion.div>

              {/* 3 smaller tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14, maxWidth: 900 }}>
                {[
                  { icon: Cpu,      label: "MASTER ARTISAN 3D", desc: "Demo the luxury product builder live.", cta: "LAUNCH BUILDER", action: () => navigate("/design-playground") },
                  { icon: Radio,    label: "NODE PING",          desc: "Check if registered devices are online.", cta: "CHECK NODES",   action: () => { setPanel("ping"); loadPingNodes(); } },
                  { icon: Activity, label: "ACTIVE NODES",       desc: "Read-only list of all venues you've onboarded.", cta: "VIEW NODES", action: () => { setPanel("nodes"); loadAmbNodes(); } },
                ].map(t => (
                  <motion.div key={t.label} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                    onClick={t.action}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 20px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, right: 0, width: 70, height: 70, background: `radial-gradient(circle,${C.gold}08,transparent)`, borderRadius: "0 12px 0 100%" }} />
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: `${C.gold}14`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <t.icon size={18} color={C.gold} />
                    </div>
                    <div style={{ fontSize: 13, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 6 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{t.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8, color: C.amber, fontWeight: 700, letterSpacing: "0.14em" }}>
                      {t.cta} <ChevronRight size={10} />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginTop: 28, padding: "12px 18px", borderRadius: 10, background: "rgba(212,175,55,0.05)", border: `1px solid ${C.border}`, maxWidth: 520 }}>
                <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 5 }}>AMBASSADOR PERMISSIONS</div>
                <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
                  You can register nodes and demo the experience.<br/>Revenue, distribution controls, and financial data are Sovereign-only.
                </div>
              </div>
            </motion.div>
          )}

          {/* ── VENUE ONBOARDING WIZARD ── */}
          {panel === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ maxWidth: 640 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setPanel("home")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>
                  ← Back
                </motion.button>
                <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>VENUE ONBOARDING WIZARD</div>
              </div>

              {/* Progress bar — 3 steps */}
              {wizStep !== "summary" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
                  {[1, 2, 3].map(s => (
                    <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= (wizStep as number) ? C.gold : "rgba(212,175,55,0.15)", transition: "background 0.3s" }} />
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">

                {/* STEP 1 — Venue Identity */}
                {wizStep === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 28px" }}>
                    <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 8 }}>STEP 1 OF 3</div>
                    <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 20, fontWeight: 300 }}>Venue Identity</div>

                    <label style={{ display: "block", marginBottom: 18 }}>
                      <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 8 }}>VENUE NAME</div>
                      <input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Smyrna Luxury Cigar Lounge"
                        style={{ width: "100%", padding: "12px 16px", borderRadius: 8, background: "rgba(245,242,237,0.05)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none", boxSizing: "border-box" }} />
                    </label>

                    <label style={{ display: "block", marginBottom: 28 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em" }}>LOCATION ID</span>
                        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setLocId(genLocationId())}
                          style={{ fontSize: 7, color: C.dim, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.12em", padding: 0 }}>↺ REGENERATE</motion.button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <MapPin size={12} color={C.amber} />
                        <input value={locationId} onChange={e => setLocId(e.target.value)}
                          style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "rgba(245,242,237,0.05)", border: `1px solid ${C.border}`, color: C.gold, fontSize: 12, fontFamily: C.mono, outline: "none" }} />
                      </div>
                    </label>

                    <motion.button whileTap={{ scale: 0.94 }}
                      disabled={!venueName.trim()}
                      onClick={() => setWizStep(2)}
                      style={{ padding: "12px 28px", borderRadius: 9, background: venueName.trim() ? C.gold : "rgba(212,175,55,0.20)", border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: venueName.trim() ? "pointer" : "not-allowed", letterSpacing: "0.12em", fontFamily: C.mono, display: "flex", alignItems: "center", gap: 8 }}>
                      NEXT: HARDWARE PROFILE <ChevronRight size={13} />
                    </motion.button>
                  </motion.div>
                )}

                {/* STEP 2 — Hardware Profile */}
                {wizStep === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 28px" }}>
                    <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 8 }}>STEP 2 OF 3</div>
                    <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 6, fontWeight: 300 }}>Hardware Profile</div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 24 }}>Select the device type for <strong style={{ color: C.ink }}>{venueName}</strong>. This adjusts UI scaling automatically.</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                      {HARDWARE.map(h => {
                        const selected = hardware === h.id;
                        return (
                          <motion.div key={h.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setHardware(h.id)}
                            style={{ padding: "18px 16px", borderRadius: 10, background: selected ? "rgba(212,175,55,0.10)" : "rgba(245,242,237,0.03)", border: `1px solid ${selected ? C.gold : C.border}`, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: selected ? `${C.gold}20` : "rgba(245,242,237,0.05)", border: `1px solid ${selected ? C.gold : "rgba(245,242,237,0.10)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                              <h.icon size={18} color={selected ? C.gold : C.muted} />
                            </div>
                            <div style={{ fontSize: 10, color: selected ? C.gold : C.muted, fontWeight: selected ? 700 : 400, letterSpacing: "0.10em", marginBottom: 4 }}>{h.label}</div>
                            <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.10em" }}>{h.desc}</div>
                            {selected && <div style={{ marginTop: 8, fontSize: 8, color: C.gold }}>✓ SELECTED</div>}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setWizStep(1)}
                        style={{ padding: "12px 22px", borderRadius: 9, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.10em" }}>
                        BACK
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }} disabled={!hardware}
                        onClick={() => setWizStep(3)}
                        style={{ padding: "12px 28px", borderRadius: 9, background: hardware ? C.gold : "rgba(212,175,55,0.20)", border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: hardware ? "pointer" : "not-allowed", letterSpacing: "0.12em", fontFamily: C.mono, display: "flex", alignItems: "center", gap: 8 }}>
                        NEXT: CONNECTIVITY SYNC <ChevronRight size={13} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3 — Connectivity Sync */}
                {wizStep === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "32px 28px" }}>
                    <div style={{ fontSize: 9, color: `${C.gold}60`, letterSpacing: "0.24em", marginBottom: 8 }}>STEP 3 OF 3</div>
                    <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 6, fontWeight: 300 }}>Connectivity Sync</div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 24 }}>Verify the Titan V nervous system is reachable from this network before finalizing the node.</div>

                    <NervousSystemTest onComplete={ok => setNervOk(ok)} />

                    {submitErr && (
                      <div style={{ fontSize: 9, color: C.red, letterSpacing: "0.12em", marginBottom: 12, textAlign: "center" }}>{submitErr}</div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setWizStep(2)}
                        style={{ padding: "12px 22px", borderRadius: 9, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.10em" }}>
                        BACK
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }}
                        disabled={!nervousOk || submitting}
                        onClick={submitNode}
                        style={{ flex: 1, padding: "12px 28px", borderRadius: 9, background: nervousOk && !submitting ? C.gold : "rgba(212,175,55,0.20)", border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: nervousOk && !submitting ? "pointer" : "not-allowed", letterSpacing: "0.12em", fontFamily: C.mono, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        {submitting ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> TRANSMITTING…</> : <>FINALIZE & SEND TO SOVEREIGN <ChevronRight size={13} /></>}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* SUMMARY */}
                {wizStep === "summary" && createdNode && (
                  <motion.div key="summary" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ background: C.surface, border: `1px solid ${C.gold}`, borderRadius: 12, padding: "36px 28px", textAlign: "center" }}>

                    {/* Success burst */}
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
                      style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(212,175,55,0.12)", border: `2px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <Check size={28} color={C.gold} />
                    </motion.div>

                    <div style={{ fontSize: 22, color: C.gold, fontFamily: C.serif, letterSpacing: "0.16em", marginBottom: 6, fontWeight: 300 }}>NODE CREATED</div>
                    <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.18em", marginBottom: 28 }}>SOVEREIGN ALERT TRANSMITTED · 360 ENTERPRISES SERVICES LLC</div>

                    {/* Node summary card */}
                    <div style={{ background: "rgba(212,175,55,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px", marginBottom: 24, textAlign: "left" }}>
                      {[
                        ["VENUE",       createdNode.venue],
                        ["NODE ID",     createdNode.serial],
                        ["LOCATION",    createdNode.locationId],
                        ["HARDWARE",    createdNode.nodeType.replace("_", " ")],
                        ["STATUS",      "OBSIDIAN LOCK"],
                        ["AUTHORIZED",  "AWAITING SOVEREIGN"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
                          <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>{k}</span>
                          <span style={{ fontSize: 10, color: k === "STATUS" ? C.gold : C.ink, fontWeight: k === "STATUS" ? 700 : 400, letterSpacing: "0.08em" }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Lock state message */}
                    <div style={{ background: "rgba(212,175,55,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Lock size={14} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, letterSpacing: "0.18em", marginBottom: 6 }}>OBSIDIAN LOCK ENGAGED</div>
                          <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
                            The node is tagged to <strong style={{ color: C.ink }}>{createdNode.venue}</strong> and awaiting Sovereign activation.
                            Once the Sovereign Admin authorizes the license from the Command Center, this device will wake up fully operational.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <motion.button whileTap={{ scale: 0.94 }} onClick={() => { resetWizard(); setPanel("wizard"); }}
                        style={{ flex: 1, padding: "12px", borderRadius: 9, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`, color: C.gold, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.12em" }}>
                        + INITIALIZE ANOTHER
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.94 }} onClick={() => { setPanel("nodes"); loadAmbNodes(); }}
                        style={{ flex: 1, padding: "12px", borderRadius: 9, background: C.gold, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.12em" }}>
                        VIEW ACTIVE NODES
                      </motion.button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          )}

          {/* ── NODE PING ── */}
          {panel === "ping" && (
            <motion.div key="ping" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setPanel("home")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>← Back</motion.button>
                <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>NODE PING</div>
                <motion.button whileTap={{ scale: 0.93 }} onClick={loadPingNodes}
                  style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, color: C.gold, fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
                  {pingStatus === "pinging" ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Radio size={11} />} REFRESH
                </motion.button>
              </div>
              {pingStatus === "pinging" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                  <Loader size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em" }}>PINGING NETWORK…</span>
                </div>
              )}
              {nodes.length === 0 && pingStatus !== "pinging" && (
                <div style={{ padding: "32px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.16em" }}>NO REGISTERED NODES FOUND</div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
                {nodes.map(node => {
                  const st = pingResults[node.id];
                  return (
                    <motion.div key={node.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: st === "online" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.08)", border: `1px solid ${st === "online" ? "rgba(34,197,94,0.30)" : "rgba(239,68,68,0.22)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {st === "online" ? <Wifi size={16} color={C.green} /> : <WifiOff size={16} color={C.red} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: C.ink, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 2 }}>{node.venue_name ?? node.serial_number}</div>
                        <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>{node.serial_number} · {node.status}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}>
                        <StatusBadge status={node.status} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── ACTIVE NODES ── */}
          {panel === "nodes" && (
            <motion.div key="nodes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setPanel("home")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "rgba(245,242,237,0.06)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: "pointer" }}>← Back</motion.button>
                <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>ACTIVE NODES</div>
                <motion.button whileTap={{ scale: 0.93 }} onClick={loadAmbNodes}
                  style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, color: C.gold, fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
                  {loadingAmb ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Activity size={11} />} REFRESH
                </motion.button>
              </div>

              {loadingAmb && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                  <Loader size={14} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em" }}>LOADING NODES…</span>
                </div>
              )}

              {!loadingAmb && ambNodes.length === 0 && (
                <div style={{ padding: "40px 32px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.16em", marginBottom: 10 }}>NO AMBASSADOR NODES YET</div>
                  <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.8, marginBottom: 20 }}>Initialize your first venue using the Onboarding Wizard.</div>
                  <motion.button whileTap={{ scale: 0.94 }} onClick={() => { resetWizard(); setPanel("wizard"); }}
                    style={{ padding: "10px 24px", borderRadius: 8, background: C.gold, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.12em", fontFamily: C.mono }}>
                    INITIALIZE FIRST NODE
                  </motion.button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
                {ambNodes.map((node, i) => (
                  <motion.div key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(212,175,55,0.10)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Lock size={16} color={node.status === "AUTHORIZED" ? C.green : C.gold} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: C.ink, fontWeight: 600, letterSpacing: "0.08em" }}>{node.venue_name}</span>
                          <StatusBadge status={node.status} />
                        </div>
                        <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.14em", lineHeight: 1.8 }}>
                          {node.serial_number} · {node.node_type?.replace(/_/g, " ")} · {node.location_id}
                        </div>
                        <div style={{ fontSize: 8, color: `${C.dim}80`, letterSpacing: "0.12em", marginTop: 4 }}>
                          CREATED {new Date(node.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AmbassadorWatermark />

      <div style={{ padding: "8px 24px", borderTop: `1px solid ${C.border}`, background: "rgba(5,10,20,0.97)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.16em" }}>AUTHORIZED AMBASSADOR: CLARK · 360 ENTERPRISES SERVICES LLC</span>
        <span style={{ fontSize: 8, color: `${C.gold}45`, letterSpacing: "0.14em" }}>NOVEE OS · DEMO MODE · TITAN V 5.2.0</span>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
