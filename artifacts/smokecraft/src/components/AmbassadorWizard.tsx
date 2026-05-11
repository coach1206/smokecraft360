/**
 * AmbassadorWizard — Standalone 3-step venue onboarding component.
 * NOVEE OS · 360 Enterprises Services LLC
 *
 * Step 1: Venue Identity  (name + auto-generated location ID)
 * Step 2: Hardware Profile (4 node types)
 * Step 3: Nervous System Test (gold ripple connectivity check)
 *
 * On submit → POST /api/ambassador/initialize-node (requires Ambassador session bearer).
 * New nodes are created with status OBSIDIAN_LOCK (isActivated: false) — awaiting
 * Sovereign approval from JC's command center.
 *
 * Props:
 *   ambassadorToken  — Bearer token from localStorage (AMBASSADOR_SESSION key)
 *   onComplete       — called with the created node data on success
 *   onCancel         — called when the user dismisses before completing
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Tablet, Smartphone, Layout,
  Check, Loader, Radio, ChevronRight, RotateCcw,
} from "lucide-react";
import "@/styles/Sovereign.css";

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg:     "#050505",
  surface:"rgba(18,15,12,0.98)",
  gold:   "#D4AF37",
  amber:  "#B89030",
  ink:    "#F5F2ED",
  muted:  "rgba(245,242,237,0.45)",
  dim:    "rgba(245,242,237,0.22)",
  border: "rgba(212,175,55,0.20)",
  green:  "#22c55e",
  red:    "#ef4444",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
};

// ── Types ──────────────────────────────────────────────────────
export type HardwareId =
  | "SMART_MIRROR"
  | "INTERACTIVE_TABLE"
  | "MOBILE_HUD"
  | "STANDARD_KIOSK";

export interface CreatedNode {
  serial:     string;
  venueName:  string;
  nodeType:   HardwareId;
  locationId: string;
  status:     "OBSIDIAN_LOCK";
}

type WizardStep = 1 | 2 | 3 | "summary";
type NervousState = "idle" | "testing" | "verified";

interface Props {
  ambassadorToken: string;
  onComplete: (node: CreatedNode) => void;
  onCancel:   () => void;
}

// ── Helpers ────────────────────────────────────────────────────
function genLocationId(): string {
  const ts  = Date.now().toString(36).toUpperCase().slice(-5);
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `LOC-${ts}-${rnd}`;
}

function authHeader(token: string): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ── Hardware options ────────────────────────────────────────────
const HARDWARE_OPTIONS: {
  id:   HardwareId;
  icon: typeof Monitor;
  label: string;
  desc:  string;
}[] = [
  { id: "SMART_MIRROR",     icon: Monitor,    label: "SMART MIRROR",      desc: "Wall-mounted reflective display with touch interaction." },
  { id: "INTERACTIVE_TABLE",icon: Layout,     label: "INTERACTIVE TABLE",  desc: "Multi-touch surface for group discovery sessions." },
  { id: "MOBILE_HUD",       icon: Smartphone, label: "MOBILE HUD",         desc: "Staff-carried tablet in guided recommendation mode." },
  { id: "STANDARD_KIOSK",   icon: Tablet,     label: "STANDARD KIOSK",     desc: "Freestanding touchscreen kiosk with full experience flow." },
];

// ── Step progress bar ───────────────────────────────────────────
function ProgressBar({ step }: { step: WizardStep }) {
  const active = step === "summary" ? 3 : (step as number);
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: s <= active ? C.gold : "rgba(212,175,55,0.15)",
          transition: "background 0.3s ease",
        }} />
      ))}
    </div>
  );
}

// ── Step 3: Nervous System Test ─────────────────────────────────
function NervousSystemTest({
  state, onStart,
}: {
  state:   NervousState;
  onStart: () => void;
}) {
  const NODES = ["ENGINE CORE", "AI NODE", "INVENTORY", "ORACLE"] as const;

  return (
    <div style={{ position: "relative", textAlign: "center", padding: "32px 0" }}>
      {/* Ripple rings — GPU-composited */}
      {state === "testing" && [0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="ripple-effect ripple-effect--continuous"
          style={{
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 60, height: 60,
            animationDelay: `${i * 0.45}s`,
          }}
        />
      ))}

      {/* Center icon */}
      <motion.div
        animate={state === "testing"
          ? { scale: [1, 1.12, 1], opacity: [1, 0.6, 1] }
          : {}}
        transition={{ duration: 0.4, repeat: state === "testing" ? Infinity : 0 }}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 72, height: 72, borderRadius: "50%",
          background: state === "verified"
            ? "rgba(34,197,94,0.12)"
            : "rgba(212,175,55,0.10)",
          border: `2px solid ${state === "verified" ? C.green : C.gold}`,
          marginBottom: 20, position: "relative",
        }}
      >
        {state === "verified"
          ? <Check size={28} color={C.green} />
          : <Radio size={28} color={C.gold} className={state === "testing" ? "pulse" : ""} />
        }
      </motion.div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 20, lineHeight: 1.8, letterSpacing: "0.08em" }}>
              Verifies the Socket.io connection between<br />
              this device and the Titan V nervous system.
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onStart}
              style={{
                padding: "14px 32px", borderRadius: 10,
                background: C.gold, border: "none", color: "#050505",
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                letterSpacing: "0.14em", fontFamily: C.mono,
              }}
            >
              FIRE GOLD RIPPLE
            </motion.button>
          </motion.div>
        )}

        {state === "testing" && (
          <motion.div key="testing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.20em", marginBottom: 16 }}>
              TESTING SIGNAL INTEGRITY…
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              {NODES.map((label, i) => (
                <div
                  key={label}
                  className={`pulse pulse-delay-${(i + 1) as 1 | 2 | 3 | 4}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
                  <span style={{ fontSize: 7, color: C.dim, letterSpacing: "0.14em" }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {state === "verified" && (
          <motion.div key="verified" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ fontSize: 13, color: C.green, fontWeight: 700, letterSpacing: "0.16em", marginBottom: 8 }}>
              CONNECTION VERIFIED
            </div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.12em", lineHeight: 1.8 }}>
              4 NODES ACTIVE · LATENCY: NOMINAL<br />
              TITAN V NERVOUS SYSTEM RESPONSIVE
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function AmbassadorWizard({ ambassadorToken, onComplete, onCancel }: Props) {
  const [step,       setStep]     = useState<WizardStep>(1);
  const [venueName,  setVenue]    = useState("");
  const [locationId, setLocId]    = useState(genLocationId());
  const [hardware,   setHardware] = useState<HardwareId | null>(null);
  const [nervous,    setNervous]  = useState<NervousState>("idle");
  const [submitting, setSubmit]   = useState(false);
  const [submitErr,  setSubmitErr]= useState("");
  const [created,    setCreated]  = useState<CreatedNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up nervous system timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const startNervousTest = () => {
    setNervous("testing");
    timerRef.current = setTimeout(() => setNervous("verified"), 3200);
  };

  const submit = async () => {
    if (!venueName.trim() || !hardware || nervous !== "verified") return;
    setSubmit(true);
    setSubmitErr("");
    try {
      const res  = await fetch("/api/ambassador/initialize-node", {
        method: "POST",
        headers: authHeader(ambassadorToken),
        body:    JSON.stringify({
          venueName:  venueName.trim(),
          locationId,
          nodeType:   hardware,
        }),
      });
      const data = await res.json() as {
        ok?: boolean; serial?: string; error?: string;
      };
      if (data.ok && data.serial) {
        const node: CreatedNode = {
          serial:     data.serial,
          venueName:  venueName.trim(),
          nodeType:   hardware,
          locationId,
          status:     "OBSIDIAN_LOCK",
        };
        setCreated(node);
        setStep("summary");
        onComplete(node);
      } else {
        setSubmitErr(data.error ?? "Submission failed");
      }
    } catch {
      setSubmitErr("Network error — check connection and retry");
    } finally {
      setSubmit(false);
    }
  };

  const reset = () => {
    setStep(1); setVenue(""); setLocId(genLocationId());
    setHardware(null); setNervous("idle");
    setCreated(null); setSubmitErr("");
  };

  // ── Shared panel wrapper ───────────────────────────────────────
  const Panel = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      key={String(step)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
    >
      {children}
    </motion.div>
  );

  return (
    <div style={{ fontFamily: C.mono, color: C.ink, maxWidth: 600, width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onCancel}
          style={{
            padding: "7px 14px", borderRadius: 8,
            background: "rgba(245,242,237,0.06)",
            border: `1px solid ${C.border}`,
            color: C.muted, fontSize: 11, cursor: "pointer",
            fontFamily: C.mono,
          }}
        >
          ← Back
        </motion.button>
        <div style={{ fontSize: 14, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em" }}>
          VENUE ONBOARDING WIZARD
        </div>
      </div>

      {step !== "summary" && <ProgressBar step={step} />}

      <AnimatePresence mode="wait">

        {/* ── STEP 1: Venue Identity ──────────────────────────── */}
        {step === 1 && (
          <Panel key="step1">
            <div style={{ fontSize: 8, color: `${C.gold}70`, letterSpacing: "0.22em", marginBottom: 18 }}>
              STEP 1 OF 3 · VENUE IDENTITY
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 9, color: C.muted, letterSpacing: "0.16em", display: "block", marginBottom: 8 }}>
                VENUE NAME
              </label>
              <input
                value={venueName}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. The Obsidian Lounge"
                maxLength={120}
                style={{
                  width: "100%", padding: "14px 16px",
                  borderRadius: 10, border: `1px solid ${venueName.trim() ? C.gold : C.border}`,
                  background: "rgba(245,242,237,0.05)",
                  color: C.ink, fontSize: 13, fontFamily: C.mono,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 9, color: C.muted, letterSpacing: "0.16em", display: "block", marginBottom: 8 }}>
                LOCATION ID <span style={{ color: C.dim }}>(AUTO-GENERATED)</span>
              </label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{
                  flex: 1, padding: "12px 16px", borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: "rgba(245,242,237,0.03)",
                  color: C.gold, fontSize: 12, fontFamily: C.mono,
                  letterSpacing: "0.10em",
                }}>
                  {locationId}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setLocId(genLocationId())}
                  title="Regenerate ID"
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    background: "rgba(212,175,55,0.08)",
                    border: `1px solid ${C.border}`,
                    color: C.gold, cursor: "pointer",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <RotateCcw size={14} />
                </motion.button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={!venueName.trim()}
              onClick={() => setStep(2)}
              style={{
                width: "100%", padding: "16px", borderRadius: 12,
                background: venueName.trim() ? C.gold : "rgba(212,175,55,0.20)",
                border: "none", color: "#050505",
                fontSize: 11, fontWeight: 800, letterSpacing: "0.16em",
                cursor: venueName.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: C.mono,
              }}
            >
              NEXT: HARDWARE PROFILE <ChevronRight size={14} />
            </motion.button>
          </Panel>
        )}

        {/* ── STEP 2: Hardware Profile ────────────────────────── */}
        {step === 2 && (
          <Panel key="step2">
            <div style={{ fontSize: 8, color: `${C.gold}70`, letterSpacing: "0.22em", marginBottom: 18 }}>
              STEP 2 OF 3 · HARDWARE PROFILE
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {HARDWARE_OPTIONS.map(hw => {
                const selected = hardware === hw.id;
                return (
                  <motion.div
                    key={hw.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setHardware(hw.id)}
                    style={{
                      padding: "20px 18px", borderRadius: 12, cursor: "pointer",
                      background: selected ? "rgba(212,175,55,0.12)" : "rgba(245,242,237,0.03)",
                      border: `1px solid ${selected ? C.gold : C.border}`,
                      transition: "border-color 0.2s, background 0.2s",
                      position: "relative",
                    }}
                  >
                    {selected && (
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        width: 18, height: 18, borderRadius: "50%",
                        background: C.gold, display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Check size={10} color="#050505" strokeWidth={3} />
                      </div>
                    )}
                    <hw.icon size={20} color={selected ? C.gold : C.muted} style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 11, color: selected ? C.gold : C.ink, letterSpacing: "0.10em", marginBottom: 5, fontWeight: 700 }}>
                      {hw.label}
                    </div>
                    <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.6 }}>
                      {hw.desc}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep(1)}
                style={{
                  flex: "0 0 auto", padding: "14px 20px", borderRadius: 12,
                  background: "rgba(245,242,237,0.06)",
                  border: `1px solid ${C.border}`,
                  color: C.muted, fontSize: 11, cursor: "pointer",
                  fontFamily: C.mono,
                }}
              >
                ← Back
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={!hardware}
                onClick={() => setStep(3)}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12,
                  background: hardware ? C.gold : "rgba(212,175,55,0.20)",
                  border: "none", color: "#050505",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.16em",
                  cursor: hardware ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: C.mono,
                }}
              >
                NEXT: NERVOUS SYSTEM TEST <ChevronRight size={14} />
              </motion.button>
            </div>
          </Panel>
        )}

        {/* ── STEP 3: Nervous System Test ─────────────────────── */}
        {step === 3 && (
          <Panel key="step3">
            <div style={{ fontSize: 8, color: `${C.gold}70`, letterSpacing: "0.22em", marginBottom: 18 }}>
              STEP 3 OF 3 · NERVOUS SYSTEM TEST
            </div>

            <NervousSystemTest state={nervous} onStart={startNervousTest} />

            {submitErr && (
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.22)",
                color: C.red, fontSize: 10, letterSpacing: "0.08em",
              }}>
                {submitErr}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep(2)}
                style={{
                  flex: "0 0 auto", padding: "14px 20px", borderRadius: 12,
                  background: "rgba(245,242,237,0.06)",
                  border: `1px solid ${C.border}`,
                  color: C.muted, fontSize: 11, cursor: "pointer",
                  fontFamily: C.mono,
                }}
              >
                ← Back
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={nervous !== "verified" || submitting}
                onClick={submit}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12,
                  background: nervous === "verified" && !submitting
                    ? C.gold : "rgba(212,175,55,0.20)",
                  border: "none", color: "#050505",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.16em",
                  cursor: nervous === "verified" && !submitting ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: C.mono,
                }}
              >
                {submitting
                  ? <><Loader size={13} style={{ animation: "spin 0.8s linear infinite" }} /> TRANSMITTING…</>
                  : "INITIALIZE NODE →"}
              </motion.button>
            </div>
          </Panel>
        )}

        {/* ── SUMMARY: Node created ───────────────────────────── */}
        {step === "summary" && created && (
          <Panel key="summary">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              style={{
                textAlign: "center", padding: "36px 28px",
                background: "rgba(212,175,55,0.06)",
                border: `1px solid ${C.gold}`,
                borderRadius: 16, marginBottom: 24,
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(212,175,55,0.12)",
                border: `2px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Check size={28} color={C.gold} />
              </div>

              <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 6 }}>
                NODE INITIALIZED
              </div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.14em", marginBottom: 24 }}>
                AWAITING SOVEREIGN ACTIVATION · JC HAS BEEN NOTIFIED
              </div>

              {/* Node details */}
              {[
                ["SERIAL",   created.serial],
                ["VENUE",    created.venueName],
                ["LOCATION", created.locationId],
                ["HARDWARE", created.nodeType.replace(/_/g, " ")],
                ["STATUS",   "🔒 OBSIDIAN LOCK"],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: `1px solid rgba(212,175,55,0.10)`,
                  textAlign: "left",
                }}>
                  <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>{k}</span>
                  <span style={{ fontSize: 10, color: C.ink, letterSpacing: "0.08em" }}>{v}</span>
                </div>
              ))}

              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(212,175,55,0.06)", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.8 }}>
                  This node is locked in <strong style={{ color: C.gold }}>OBSIDIAN LOCK</strong> state.<br />
                  JC must authorize it from the Sovereign Command Center before it goes live.
                </div>
              </div>
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={reset}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: "rgba(212,175,55,0.10)",
                border: `1px solid ${C.border}`,
                color: C.gold, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.14em", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: C.mono,
              }}
            >
              <RotateCcw size={13} /> INITIALIZE ANOTHER NODE
            </motion.button>
          </Panel>
        )}

      </AnimatePresence>
    </div>
  );
}
