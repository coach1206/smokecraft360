import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { PulseProvider, usePulse } from "./PulseContext";
import { MoodEqualizer }    from "./MoodEqualizer";
import { HardwareTelemetry } from "./HardwareTelemetry";
import { PredictionForecast } from "./PredictionForecast";
import { SalesFunnel }       from "./SalesFunnel";

const P = {
  bg:      "#030609",
  surface: "rgba(6,15,35,0.95)",
  border:  "rgba(0,180,255,0.12)",
  borderB: "rgba(0,180,255,0.28)",
  blue:    "#00C4E8",
  blueDeep:"#0080FF",
  ice:     "#A8D8F0",
  platinum:"#E8EDF5",
  green:   "#22c55e",
  amber:   "#F59E0B",
  faint:   "rgba(100,160,220,0.35)",
  sub:     "rgba(168,216,240,0.65)",
  fore:    "#E8EDF5",
  mono:    "'SF Mono','Fira Code',monospace",
  sans:    "system-ui,-apple-system,'Helvetica Neue',sans-serif",
  serif:   "'Cormorant Garamond',Georgia,serif",
};

function PulseHeader() {
  const { isLive, isReacquiring, lastUpdate, data } = usePulse();
  const [, navigate] = useLocation();
  const sigStr = data?.signalStrength ?? 0;

  const now = lastUpdate ? lastUpdate.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--";

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 28px 14px",
      borderBottom: `1px solid ${P.border}`,
      background: "rgba(3,6,9,0.80)",
      backdropFilter: "blur(20px)",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      {/* Back + brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <button
          onClick={() => navigate("/eeie-command")}
          style={{
            background: "none", border: `1px solid ${P.border}`, borderRadius: 8,
            padding: "6px 12px", cursor: "pointer", color: P.faint,
            fontSize: 9, fontFamily: P.mono, letterSpacing: "0.12em",
          }}
        >
          ← BACK
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 20, fontFamily: P.sans, fontWeight: 200, color: P.fore, letterSpacing: "-0.02em" }}>NOVEE</span>
            <span style={{ fontSize: 20, fontFamily: P.sans, fontWeight: 800, color: P.blue, letterSpacing: "-0.02em" }}>OS</span>
          </div>
          <div style={{ fontSize: 8, color: P.faint, fontFamily: P.mono, letterSpacing: "0.20em", marginTop: 1 }}>
            PULSE INTELLIGENCE SYSTEM v2.0
          </div>
        </div>
      </div>

      {/* Center status rail */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <AnimatePresence mode="wait">
            {isReacquiring ? (
              <motion.div
                key="reacq"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: P.amber }}
              />
            ) : (
              <motion.div
                key="live"
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: P.green }}
              />
            )}
          </AnimatePresence>
          <span style={{ fontSize: 9, color: isReacquiring ? P.amber : P.green, fontFamily: P.mono, letterSpacing: "0.14em" }}>
            {isReacquiring ? "REACQUIRING" : isLive ? "LIVE" : "CONNECTING"}
          </span>
        </div>

        {/* Signal strength */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
            {[4, 7, 10, 14].map((h, i) => (
              <div key={i} style={{
                width: 3, height: h,
                background: sigStr > (i * 25) ? P.blue : `${P.blue}25`,
                borderRadius: 1,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 8, color: P.faint, fontFamily: P.mono }}>{Math.round(sigStr)}%</span>
        </div>

        {/* Pulse rate */}
        <div style={{ fontSize: 8, color: P.faint, fontFamily: P.mono, letterSpacing: "0.1em" }}>
          2.5s <span style={{ color: P.blue }}>PULSE</span>
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 8, color: P.faint, fontFamily: P.mono }}>
          {now}
        </div>
      </div>

      {/* Authorized operator */}
      <div style={{ textAlign: "right" }}>
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 3.0 }}
          style={{
            fontSize: 9, color: P.blue, fontFamily: P.mono, letterSpacing: "0.16em",
            textShadow: `0 0 10px ${P.blue}`,
            fontWeight: 700,
          }}
        >
          AUTHORIZED OPERATOR // 360 ENTERPRISE SERVICES LLC
        </motion.div>
        <div style={{ fontSize: 8, color: P.faint, fontFamily: P.mono, letterSpacing: "0.10em", marginTop: 3 }}>
          360 ENTERPRISES SERVICES LLC
        </div>
      </div>
    </header>
  );
}

function PulseDashboard() {
  return (
    <div style={{ minHeight: "100dvh", background: P.bg, color: P.fore }}>
      {/* Ambient OLED glow */}
      <div style={{
        position: "fixed", top: 0, left: "20%", right: "20%", height: 1,
        background: `linear-gradient(90deg, transparent, ${P.blue}60, transparent)`,
        zIndex: 20, pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", top: 0, left: "30%", right: "30%", height: "30vh",
        background: `radial-gradient(ellipse at top, ${P.blue}08, transparent 70%)`,
        zIndex: 0, pointerEvents: "none",
      }} />

      <PulseHeader />

      {/* Main grid */}
      <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, position: "relative", zIndex: 1 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Row 1 — Mood Equalizer full width */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <MoodEqualizer />
          </motion.div>

          {/* Row 2 — Hardware + Sales Funnel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <HardwareTelemetry />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <SalesFunnel />
            </motion.div>
          </div>
        </div>

        {/* Right column — AI Forecast */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.10 }}
          style={{ position: "sticky", top: 78, alignSelf: "start", maxHeight: "calc(100dvh - 100px)", display: "flex", flexDirection: "column" }}
        >
          <PredictionForecast />
        </motion.div>
      </div>
    </div>
  );
}

export default function PulseIntelligenceCenter() {
  return (
    <PulseProvider>
      <PulseDashboard />
    </PulseProvider>
  );
}
