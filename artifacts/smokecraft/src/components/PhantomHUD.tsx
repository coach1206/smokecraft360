/**
 * PhantomHUD — Titan V Sentient Environment Overlay
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Activates on a 3-second hold anywhere on screen.
 * Additive position:fixed layer — never touches the main DOM tree.
 * Zero interruption guarantee: guest UI never flashes or reloads.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveData {
  node_id?: string;
  hr?:      number;
  str?:     number;
  sig?:     number;
  vit?:     number;
  eng?:     number;
  synced_at?: string;
}

// ── Design tokens (self-contained, no external import needed) ─────────────────

const T = {
  bg:     "rgba(5,5,5,0.96)",
  border: "rgba(212,175,55,0.30)",
  gold:   "#D4AF37",
  amber:  "#FFBF00",
  green:  "#00FF41",
  red:    "#ef4444",
  orange: "#f97316",
  dim:    "rgba(245,242,237,0.22)",
  muted:  "rgba(245,242,237,0.45)",
  ink:    "#F5F2ED",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
};

// SVG ring — circumference for r=18
const RING_R   = 18;
const RING_C   = 2 * Math.PI * RING_R; // ≈ 113.1

const HOLD_MS  = 3000;
const MAX_READINGS = 24;

// ── Sparkline ─────────────────────────────────────────────────────────────────

function VitalitySparkline({ readings }: { readings: number[] }) {
  const W = 220, H = 52;
  const MIN_HR = 40, MAX_HR = 180;

  if (readings.length < 2) {
    return (
      <div style={{ width: W, height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 8, color: T.dim, letterSpacing: "0.18em" }}>AWAITING BIOMETRIC SIGNAL…</span>
      </div>
    );
  }

  const pts = readings.map((v, i) => {
    const x = (i / (readings.length - 1)) * W;
    const y = H - ((v - MIN_HR) / (MAX_HR - MIN_HR)) * H;
    return `${x.toFixed(1)},${Math.max(0, Math.min(H, y)).toFixed(1)}`;
  }).join(" ");

  const latest = readings[readings.length - 1];
  const dotX   = W;
  const dotY   = H - ((latest - MIN_HR) / (MAX_HR - MIN_HR)) * H;
  const hrColor = latest > 100 ? T.orange : latest > 80 ? T.amber : T.green;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
      {/* Baseline */}
      <line x1={0} y1={H} x2={W} y2={H} stroke="rgba(212,175,55,0.10)" strokeWidth={1} />
      {/* Mid threshold (100 BPM) */}
      <line
        x1={0} y1={H - ((100 - MIN_HR) / (MAX_HR - MIN_HR)) * H}
        x2={W} y2={H - ((100 - MIN_HR) / (MAX_HR - MIN_HR)) * H}
        stroke="rgba(249,115,22,0.15)" strokeWidth={1} strokeDasharray="3 4"
      />
      {/* Fill gradient */}
      <defs>
        <linearGradient id="phud-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={hrColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={hrColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${H} ${pts} ${W},${H}`}
        fill="url(#phud-fill)" stroke="none"
      />
      {/* Telemetry line */}
      <polyline
        className="telemetry-line"
        points={pts}
        fill="none"
        stroke={hrColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Live dot */}
      <circle cx={dotX} cy={dotY} r={3.5} fill={hrColor} />
      <circle cx={dotX} cy={dotY} r={6} fill="none" stroke={hrColor} strokeWidth={1} opacity={0.35}>
        <animate attributeName="r" values="4;9" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PhantomHUD() {
  const [holdPct,  setHoldPct]  = useState(0);       // 0–100
  const [visible,  setVisible]  = useState(false);
  const [latest,   setLatest]   = useState<LiveData | null>(null);
  const [readings, setReadings] = useState<number[]>([]);
  const [live,     setLive]     = useState(false);

  const rafRef       = useRef<number>(0);
  const holdStart    = useRef<number>(0);
  const holding      = useRef(false);

  // ── SSE — biometric_update feed ───────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/biometric/live");
    es.onopen    = () => setLive(true);
    es.onerror   = () => setLive(false);
    es.onmessage = (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data as string) as LiveData;
        setLatest(d);
        if (d.hr != null) {
          setReadings(prev => [...prev.slice(-(MAX_READINGS - 1)), d.hr!]);
        }
        setLive(true);
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  // ── Hold detection — rAF loop ─────────────────────────────────────────────
  const startHold = useCallback((e: PointerEvent) => {
    // Ignore if tapping inside the already-visible HUD
    if (visible) return;
    if ((e.target as HTMLElement).closest("[data-phantom-hud]")) return;

    holding.current  = true;
    holdStart.current = performance.now();

    const tick = () => {
      if (!holding.current) return;
      const elapsed = performance.now() - holdStart.current;
      const pct     = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        holding.current = false;
        setHoldPct(0);
        setVisible(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [visible]);

  const cancelHold = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(rafRef.current);
    setHoldPct(0);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", startHold);
    window.addEventListener("pointerup",   cancelHold);
    window.addEventListener("pointermove", (e: PointerEvent) => {
      if (e.pressure === 0) cancelHold();
    });
    return () => {
      window.removeEventListener("pointerdown", startHold);
      window.removeEventListener("pointerup",   cancelHold);
    };
  }, [startHold, cancelHold]);

  // ── Metric helpers ────────────────────────────────────────────────────────
  const hrColor  = (latest?.hr ?? 0) > 100 ? T.orange : (latest?.hr ?? 0) > 80 ? T.amber : T.green;
  const strColor = (latest?.str ?? 0) >= 75 ? T.red : (latest?.str ?? 0) >= 40 ? T.amber : "#60a5fa";
  const sigCrit  = latest?.sig != null && latest.sig >= 0 && latest.sig < 10;
  const sigColor = sigCrit ? T.red : latest?.sig != null && latest.sig > -60 ? T.green : T.orange;

  const dashOffset = RING_C - (holdPct / 100) * RING_C;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hold progress ring — bottom-right corner ── */}
      <AnimatePresence>
        {holdPct > 0 && !visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed", bottom: 28, right: 28,
              width: 48, height: 48,
              pointerEvents: "none", zIndex: 9800,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle
                className="stealth-ring-track"
                cx={24} cy={24} r={RING_R}
                fill="none" strokeWidth={2}
              />
              <circle
                className="stealth-ring-fill"
                cx={24} cy={24} r={RING_R}
                fill="none"
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 24 24)"
              />
            </svg>
            <div style={{
              position: "absolute", fontSize: 7, color: T.gold,
              fontFamily: T.mono, letterSpacing: "0.1em",
            }}>
              {Math.round(holdPct)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phantom HUD panel ── */}
      <AnimatePresence>
        {visible && (
          <>
            {/* Stealth dim overlay — additive, zero-interruption */}
            <motion.div
              data-phantom-hud="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setVisible(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(4,4,4,0.35)",
                backdropFilter: "blur(1px)",
                zIndex: 9801,
                pointerEvents: "auto",
              }}
            />

            {/* Panel */}
            <motion.div
              data-phantom-hud="panel"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.1] }}
              style={{
                position: "fixed", bottom: 32, right: 24,
                width: 268,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: "18px 20px 20px",
                zIndex: 9802,
                pointerEvents: "auto",
                boxShadow: `0 0 40px rgba(212,175,55,0.12), 0 8px 32px rgba(0,0,0,0.7)`,
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Ambient top glow */}
              <div style={{
                position: "absolute", top: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 180, height: 40,
                background: "radial-gradient(ellipse,rgba(212,175,55,0.12) 0%,transparent 70%)",
                borderRadius: "0 0 50% 50%",
                pointerEvents: "none",
              }} />

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Activity size={11} color={T.gold} />
                <span style={{ flex: 1, fontSize: 9, color: T.gold, fontFamily: T.mono, letterSpacing: "0.28em", fontWeight: 700 }}>
                  PHANTOM HUD
                </span>
                {live && (
                  <span className="sovereign-breath" style={{ fontSize: 7, color: T.green, letterSpacing: "0.16em" }}>
                    ● LIVE
                  </span>
                )}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setVisible(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }}
                >
                  <X size={11} color={T.muted} />
                </motion.button>
              </div>

              {/* Vitality sparkline */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 7, color: T.dim, letterSpacing: "0.18em", marginBottom: 8 }}>
                  VITALITY / HEART RATE
                </div>
                <VitalitySparkline readings={readings} />
              </div>

              {/* Metrics row */}
              <div style={{ display: "flex", gap: 0, borderTop: `1px solid rgba(212,175,55,0.12)`, paddingTop: 14 }}>
                {[
                  { label: "HR",  val: latest?.hr,  unit: " BPM", color: hrColor  },
                  { label: "STR", val: latest?.str, unit: "",      color: strColor },
                  { label: "SIG", val: latest?.sig, unit: " dB",   color: sigColor },
                  ...(latest?.vit != null ? [{ label: "VIT", val: latest.vit, unit: "", color: latest.vit < 20 ? T.red : latest.vit < 50 ? T.orange : T.green }] : []),
                  ...(latest?.eng != null ? [{ label: "ENG", val: latest.eng, unit: "", color: T.gold }] : []),
                ].map((m, idx, arr) => (
                  <div key={m.label} style={{
                    flex: 1, textAlign: "center",
                    borderRight: idx < arr.length - 1 ? `1px solid rgba(212,175,55,0.10)` : "none",
                    padding: "0 4px",
                  }}>
                    <div style={{ fontSize: 7, color: T.dim, letterSpacing: "0.16em", marginBottom: 4 }}>{m.label}</div>
                    <motion.div
                      key={`${m.label}-${m.val}`}
                      initial={{ opacity: 0.4, y: -2 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ fontSize: 12, color: m.val != null ? m.color : T.dim, fontWeight: 700, fontFamily: T.mono }}
                    >
                      {m.val != null ? `${m.val}${m.unit}` : "—"}
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Last sync timestamp */}
              {latest?.synced_at && (
                <div style={{ marginTop: 12, fontSize: 7, color: T.dim, letterSpacing: "0.12em", textAlign: "right" }}>
                  LAST SYNC {new Date(latest.synced_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              )}

              {/* Footer note */}
              <div style={{ marginTop: 8, fontSize: 7, color: `${T.dim}70`, letterSpacing: "0.12em", textAlign: "center" }}>
                TITAN V · HOLD 3s TO INVOKE · TAP TO DISMISS
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
