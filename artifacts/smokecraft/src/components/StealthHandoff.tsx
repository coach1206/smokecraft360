/**
 * StealthHandoff — Sovereign Protocol
 *
 * An invisible operational overlay triggered by a 3-second press on the
 * hidden top-center pressure zone. Reads live guest state from sessionStorage
 * and the craft-builds API. The guest session NEVER unmounts — it runs
 * continuously behind the dimmed backdrop.
 *
 * Activation:  Hold the top-center zone 3 seconds.
 * Dismiss:     Tap the close badge, swipe the panel down, or hold the zone again.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useStealthTrigger, HOLD_MS } from "@/hooks/useStealthTrigger";
import { X, Activity, Brain, Zap, Radio, FileText, Flag } from "lucide-react";

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  void:    "rgba(4,4,4,0.92)",
  surface: "rgba(12,10,8,0.98)",
  gold:    "#D4AF37",
  amber:   "#B89030",
  ink:     "#F5F2ED",
  muted:   "rgba(245,242,237,0.45)",
  dim:     "rgba(245,242,237,0.20)",
  border:  "rgba(212,175,55,0.22)",
  green:   "#22c55e",
  mono:    "'JetBrains Mono','Courier New',monospace",
  serif:   "'Cormorant Garamond',serif",
};

// ── Guest state read from session storage ────────────────────────────────────

interface GuestState {
  firstName:           string | null;
  atmosphere:          string | null;
  boldnessPreference:  string | null;
  craftType:           string | null;
  mentorId:            string | null;
  sessionStart:        string | null;
}

function readGuestState(): GuestState {
  const g = (k: string) => {
    try { return sessionStorage.getItem(k); } catch { return null; }
  };
  return {
    firstName:          g("guest_firstName") ?? g("firstName"),
    atmosphere:         g("guest_atmosphere") ?? g("atmosphere"),
    boldnessPreference: g("guest_boldness") ?? g("boldnessPreference"),
    craftType:          g("guest_craftType") ?? g("craftType"),
    mentorId:           g("guest_mentorId") ?? g("mentorId"),
    sessionStart:       g("guest_sessionStart") ?? g("sessionStart"),
  };
}

function sessionDuration(startIso: string | null): string {
  if (!startIso) return "—";
  const diff = Date.now() - new Date(startIso).getTime();
  const m    = Math.floor(diff / 60000);
  const s    = Math.floor((diff % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface CraftBuildRow {
  craft_type: string;
  style_pick: string | null;
  mood_pick:  string | null;
  score:      number | null;
}

// ── Ripple ───────────────────────────────────────────────────────────────────

function Ripple({ origin }: { origin: { x: number; y: number } }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9997, overflow: "hidden" }}>
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0, opacity: 0.55 - i * 0.10 }}
          animate={{ scale: 18, opacity: 0 }}
          transition={{ duration: 1.8 + i * 0.3, delay: i * 0.15, ease: "easeOut" }}
          style={{
            position:     "absolute",
            left:         origin.x - 40,
            top:          origin.y - 40,
            width:        80,
            height:       80,
            borderRadius: "50%",
            border:       `1px solid rgba(212,175,55,${0.30 - i * 0.06})`,
          }}
        />
      ))}
      {/* central burst */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0.7 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position:     "absolute",
          left:         origin.x - 24,
          top:          origin.y - 24,
          width:        48,
          height:       48,
          borderRadius: "50%",
          background:   "radial-gradient(circle,rgba(212,175,55,0.55) 0%,transparent 70%)",
        }}
      />
    </div>
  );
}

// ── Telemetry Lines ───────────────────────────────────────────────────────────

function TelemetryLines() {
  const lines = [
    { x1:"8%",  y1:"20%", x2:"42%", y2:"20%",  delay: 0.3 },
    { x1:"58%", y1:"20%", x2:"94%", y2:"20%",  delay: 0.5 },
    { x1:"5%",  y1:"55%", x2:"22%", y2:"55%",  delay: 0.4 },
    { x1:"78%", y1:"55%", x2:"96%", y2:"55%",  delay: 0.6 },
    { x1:"15%", y1:"80%", x2:"85%", y2:"80%",  delay: 0.7 },
    { x1:"50%", y1:"10%", x2:"50%", y2:"28%",  delay: 0.2 },
    { x1:"12%", y1:"35%", x2:"12%", y2:"68%",  delay: 0.45 },
    { x1:"88%", y1:"35%", x2:"88%", y2:"68%",  delay: 0.55 },
  ] as const;

  return (
    <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9998 }}>
      {lines.map((l, i) => (
        <motion.line key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(212,175,55,0.14)" strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          exit={{ pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.7, delay: l.delay, ease: "easeOut" }}
        />
      ))}
      {/* Corner brackets */}
      {[
        ["4%","4%","4%","8%"],["4%","4%","8%","4%"],
        ["96%","4%","92%","4%"],["96%","4%","96%","8%"],
        ["4%","96%","4%","92%"],["4%","96%","8%","96%"],
        ["96%","96%","92%","96%"],["96%","96%","96%","92%"],
      ].map(([x1,y1,x2,y2], i) => (
        <motion.line key={`br-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(212,175,55,0.28)" strokeWidth="1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.03 }}
        />
      ))}
    </svg>
  );
}

// ── Command Surface (draggable panel) ────────────────────────────────────────

interface CommandSurfaceProps {
  guest:      GuestState;
  craftBuild: CraftBuildRow | null;
  onClose:    () => void;
  elapsed:    number;
}

function CommandSurface({ guest, craftBuild, onClose, elapsed }: CommandSurfaceProps) {
  const [note, setNote]           = useState("");
  const [noteOpen, setNoteOpen]   = useState(false);
  const [flagged, setFlagged]     = useState(false);
  const [tick, setTick]           = useState(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 180], [1, 0]);

  // Live session clock
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };

  const duration = sessionDuration(guest.sessionStart);
  const craft    = craftBuild?.craft_type ?? guest.craftType ?? "—";
  const mood     = craftBuild?.mood_pick  ?? "—";
  const style    = craftBuild?.style_pick ?? "—";
  const score    = craftBuild?.score      != null ? `${craftBuild.score}` : "—";

  const atm   = guest.atmosphere          ?? "—";
  const bold  = guest.boldnessPreference  ?? "—";
  const name  = guest.firstName           ?? "GUEST";

  // Use tick to re-derive duration every second
  void tick;
  const liveDuration = sessionDuration(guest.sessionStart);

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={{ top: 0, bottom: 0.3 }}
      onDragEnd={onDragEnd}
      style={{ y, opacity, position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10000 }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 36 }}
    >
      {/* Drag pill */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(212,175,55,0.30)", margin: "0 auto 10px", cursor: "grab" }} />

      <div style={{
        background:   C.surface,
        borderTop:    `1px solid ${C.border}`,
        borderRadius: "20px 20px 0 0",
        maxHeight:    "72dvh",
        overflowY:    "auto",
        boxShadow:    "0 -24px 60px rgba(0,0,0,0.7), 0 -2px 0 rgba(212,175,55,0.12)",
        paddingBottom: "env(safe-area-inset-bottom, 20px)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }} />
          <div>
            <div style={{ fontFamily: C.serif, fontSize: 18, color: C.gold, letterSpacing: "0.14em", fontWeight: 300 }}>
              EEIS COMMAND SURFACE
            </div>
            <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.20em" }}>
              SOVEREIGN PROTOCOL · DEMO MODE CONCEALED · TITAN V 5.2.0
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} style={{
            marginLeft: "auto", width: 34, height: 34, borderRadius: "50%",
            background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={14} color="#ef4444" />
          </motion.button>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, padding: "20px 24px" }}>

          {/* Guest State */}
          <div style={{ background: "rgba(245,242,237,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={13} color={C.gold} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>GUEST STATE</span>
            </div>
            <Row label="GUEST"      value={name.toUpperCase()} accent />
            <Row label="ATMOSPHERE" value={atm} />
            <Row label="BOLDNESS"   value={bold} />
            <Row label="CRAFT"      value={craft.toUpperCase()} />
            <Row label="SESSION"    value={liveDuration} />
          </div>

          {/* Build Intelligence */}
          <div style={{ background: "rgba(245,242,237,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Brain size={13} color={C.gold} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>BUILD INTELLIGENCE</span>
            </div>
            <Row label="STYLE"  value={style || "—"} />
            <Row label="MOOD"   value={mood  || "—"} />
            <Row label="SCORE"  value={score !== "—" ? `${score} / 100` : "—"} accent />
            {score !== "—" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(212,175,55,0.12)", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg,${C.amber},${C.gold})`, borderRadius: 2 }} />
                </div>
              </div>
            )}
          </div>

          {/* Signal Routing */}
          <div style={{ background: "rgba(245,242,237,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Radio size={13} color={C.gold} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>SIGNAL ROUTING</span>
            </div>
            <SignalBeat label="ENGINE CORE"     ms={Math.floor(18 + Math.random() * 8)} />
            <SignalBeat label="AI INFERENCE"    ms={Math.floor(42 + Math.random() * 20)} />
            <SignalBeat label="INVENTORY FEED"  ms={Math.floor(9  + Math.random() * 6)} />
            <SignalBeat label="PAIRING ORACLE"  ms={Math.floor(31 + Math.random() * 14)} />
          </div>

          {/* Staff Tools */}
          <div style={{ background: "rgba(245,242,237,0.03)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Zap size={13} color={C.gold} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.amber, letterSpacing: "0.22em" }}>STAFF TOOLS</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => setNoteOpen(n => !n)}
                style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, cursor: "pointer", textAlign: "left", fontFamily: C.mono, letterSpacing: "0.10em", display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={12} color={C.gold} /> ADD STAFF NOTE
              </motion.button>
              <AnimatePresence>
                {noteOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Observation, pairing suggestion, follow-up…"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(245,242,237,0.05)", border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontFamily: C.mono, resize: "none", outline: "none", boxSizing: "border-box", minHeight: 72 }} />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => setFlagged(f => !f)}
                style={{ padding: "10px 14px", borderRadius: 8, background: flagged ? "rgba(212,175,55,0.16)" : "rgba(212,175,55,0.06)", border: `1px solid ${flagged ? C.gold : C.border}`, color: flagged ? C.gold : C.muted, fontSize: 10, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.10em", display: "flex", alignItems: "center", gap: 8 }}>
                <Flag size={12} color={flagged ? C.gold : C.muted} />
                {flagged ? "FLAGGED FOR FOLLOW-UP ✓" : "FLAG FOR FOLLOW-UP"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.94 }} onClick={onClose}
                style={{ padding: "10px 14px", borderRadius: 8, background: C.gold, border: "none", color: "#050505", fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.12em" }}>
                ↓ RETURN TO GUEST SESSION
              </motion.button>
            </div>
          </div>

        </div>

        {/* Status bar */}
        <div style={{ padding: "10px 24px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 20, alignItems: "center" }}>
          <StatusDot label="KIOSK NODE"    on />
          <StatusDot label="AI ENGINE"     on />
          <StatusDot label="INVENTORY"     on />
          <StatusDot label="DEMO CONCEALED" on color="#22c55e" />
          <div style={{ marginLeft: "auto", fontFamily: C.mono, fontSize: 8, color: C.dim, letterSpacing: "0.14em" }}>
            EEIS v5.2 · SOVEREIGN PROTOCOL ACTIVE
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 8, color: "rgba(245,242,237,0.30)", letterSpacing: "0.16em" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 10, color: accent ? C.gold : "rgba(245,242,237,0.75)", fontWeight: accent ? 700 : 400, letterSpacing: "0.08em" }}>{value}</span>
    </div>
  );
}

function SignalBeat({ label, ms }: { label: string; ms: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8 + Math.random(), repeat: Infinity }}
          style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
        <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 8, color: "rgba(245,242,237,0.30)", letterSpacing: "0.14em" }}>{label}</span>
      </div>
      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 9, color: C.green }}>{ms}ms</span>
    </div>
  );
}

function StatusDot({ label, on, color }: { label: string; on: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: on ? (color ?? C.gold) : "#555" }} />
      <span style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 7, color: "rgba(245,242,237,0.25)", letterSpacing: "0.14em" }}>{label}</span>
    </div>
  );
}

// ── Pressure Zone Progress Ring ───────────────────────────────────────────────

function PressureRing({ progress }: { progress: number }) {
  const r   = 16;
  const circ = 2 * Math.PI * r;
  if (progress <= 0) return null;
  return (
    <svg width={40} height={40} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", overflow: "visible" }}>
      <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(212,175,55,0.14)" strokeWidth={2} />
      <motion.circle cx={20} cy={20} r={r} fill="none" stroke={C.gold} strokeWidth={2}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.05s linear" }} />
    </svg>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function StealthHandoff() {
  const [open, setOpen]               = useState(false);
  const [rippleOrigin, setRipple]     = useState<{x:number;y:number}|null>(null);
  const [showTelemetry, setTelemetry] = useState(false);
  const [guest, setGuest]             = useState<GuestState | null>(null);
  const [craftBuild, setCraftBuild]   = useState<CraftBuildRow | null>(null);
  const elapsedRef                    = useRef(0);
  const zoneOriginRef                 = useRef<{x:number;y:number}>({ x: 0, y: 0 });

  const activate = useCallback(async () => {
    setRipple(zoneOriginRef.current);
    // Read guest state synchronously
    const g = readGuestState();
    if (!g.sessionStart) {
      try { sessionStorage.setItem("guest_sessionStart", new Date().toISOString()); } catch { /* noop */ }
      g.sessionStart = new Date().toISOString();
    }
    setGuest(g);
    // Attempt to fetch latest craft build
    try {
      const r = await fetch("/api/craft-builds?limit=1");
      if (r.ok) {
        const data = await r.json() as { builds?: CraftBuildRow[] };
        setCraftBuild(data.builds?.[0] ?? null);
      }
    } catch { /* offline — graceful */ }

    setTimeout(() => { setTelemetry(true); }, 600);
    setTimeout(() => { setOpen(true); setRipple(null); }, 1300);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    setTimeout(() => { setTelemetry(false); }, 500);
  }, []);

  const { zoneRef, progress, holding } = useStealthTrigger({ onActivate: activate });

  // Track zone center for ripple origin
  const onZoneRef = useCallback((el: HTMLDivElement | null) => {
    (zoneRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (el) {
      const rect = el.getBoundingClientRect();
      zoneOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }, [zoneRef]);

  return (
    <>
      {/* ── Hidden pressure zone — top-center ── */}
      <div
        ref={onZoneRef}
        style={{
          position:  "fixed",
          top:       0,
          left:      "50%",
          transform: "translateX(-50%)",
          width:     88,
          height:    40,
          zIndex:    9996,
          cursor:    "default",
          touchAction: "none",
          // Completely invisible to guests — no border, no bg
        }}
      >
        {/* Subtle ring only visible to staff during hold */}
        <AnimatePresence>
          {holding && progress > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0 }}>
              <PressureRing progress={progress} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Ripple layer ── */}
      <AnimatePresence>
        {rippleOrigin && <Ripple key="ripple" origin={rippleOrigin} />}
      </AnimatePresence>

      {/* ── Backdrop dim ── */}
      <AnimatePresence>
        {(showTelemetry || open) && (
          <motion.div key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            style={{ position: "fixed", inset: 0, background: "rgba(4,4,4,0.72)", backdropFilter: "blur(2px)", zIndex: 9997, pointerEvents: open ? "auto" : "none" }}
            onClick={open ? dismiss : undefined}
          />
        )}
      </AnimatePresence>

      {/* ── Telemetry lines ── */}
      <AnimatePresence>
        {showTelemetry && <TelemetryLines key="tel" />}
      </AnimatePresence>

      {/* ── Command Surface ── */}
      <AnimatePresence>
        {open && guest && (
          <CommandSurface
            key="cmd"
            guest={guest}
            craftBuild={craftBuild}
            onClose={dismiss}
            elapsed={elapsedRef.current}
          />
        )}
      </AnimatePresence>
    </>
  );
}
