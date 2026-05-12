import { motion, AnimatePresence } from "framer-motion";
import { usePulse, type Prediction } from "./PulseContext";

const P = {
  surface:  "rgba(6,15,35,0.95)",
  surfaceB: "rgba(8,20,45,0.90)",
  border:   "rgba(0,180,255,0.12)",
  borderB:  "rgba(0,180,255,0.30)",
  blue:     "#00C4E8",
  blueDeep: "#0080FF",
  ice:      "#A8D8F0",
  platinum: "#E8EDF5",
  green:    "#22c55e",
  amber:    "#F59E0B",
  faint:    "rgba(100,160,220,0.35)",
  sub:      "rgba(168,216,240,0.65)",
  fore:     "#E8EDF5",
  mono:     "'SF Mono','Fira Code',monospace",
  sans:     "system-ui,-apple-system,'Helvetica Neue',sans-serif",
  serif:    "'Cormorant Garamond',Georgia,serif",
};

function confidenceColor(c: number): string {
  if (c >= 85) return P.blue;
  if (c >= 70) return P.ice;
  return P.faint;
}

function PredictionCard({ prediction, index }: { prediction: Prediction; index: number }) {
  const cc = confidenceColor(prediction.confidence);

  return (
    <motion.div
      key={prediction.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.06 }}
      style={{
        borderLeft: `3px solid ${cc}`,
        background: P.surfaceB,
        borderRadius: "0 10px 10px 0",
        padding: "14px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Confidence arc background */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: `${prediction.confidence}%`,
        background: `linear-gradient(90deg, transparent, ${cc}08)`,
        pointerEvents: "none",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: 7, color: cc, fontFamily: P.mono, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
          {prediction.category}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 7, color: "rgba(168,216,240,0.40)", fontFamily: P.mono }}>{prediction.zone}</div>
          <div style={{
            padding: "2px 7px", borderRadius: 10, background: `${cc}18`, border: `1px solid ${cc}30`,
            fontSize: 8, color: cc, fontFamily: P.mono, fontWeight: 800, letterSpacing: "0.1em",
          }}>
            {prediction.confidence}%
          </div>
        </div>
      </div>

      {/* Product name */}
      <div style={{ fontSize: 13, color: P.fore, fontFamily: P.serif, fontStyle: "italic", marginBottom: 5, lineHeight: 1.3, letterSpacing: "0.02em" }}>
        {prediction.product}
      </div>

      {/* Brand */}
      <div style={{ fontSize: 9, color: P.sub, fontFamily: P.mono, letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>
        {prediction.brand}
      </div>

      {/* Reason */}
      <div style={{ fontSize: 10, color: "rgba(168,216,240,0.70)", fontFamily: P.sans, lineHeight: 1.5, marginBottom: 10 }}>
        {prediction.reason}
      </div>

      {/* Confidence bar */}
      <div style={{ height: 2, background: "rgba(0,0,0,0.4)", borderRadius: 1, overflow: "hidden", marginBottom: 10 }}>
        <motion.div
          animate={{ width: `${prediction.confidence}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ height: "100%", background: cc, boxShadow: `0 0 8px ${cc}` }}
        />
      </div>

      {/* Action */}
      <button
        style={{
          fontSize: 8, color: P.blue, fontFamily: P.mono, letterSpacing: "0.14em",
          textTransform: "uppercase", background: "none", border: "none", cursor: "pointer",
          padding: 0, textDecoration: "underline", textDecorationColor: `${P.blue}50`,
        }}
        onClick={() => {}}
      >
        Execute Recommended Action →
      </button>
    </motion.div>
  );
}

export function PredictionForecast() {
  const { data, isReacquiring } = usePulse();

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 14, padding: "20px 22px", height: "100%",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div>
        <div style={{ fontSize: 9, color: P.blue, fontFamily: P.mono, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          AI PREDICTIVE FORECAST
        </div>
        <div style={{ fontSize: 11, color: "rgba(168,216,240,0.50)", fontFamily: P.sans, marginTop: 3 }}>
          Anticipatory commerce · live confidence scoring
        </div>
      </div>

      {isReacquiring && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
          style={{
            padding: "12px 14px", borderRadius: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            fontSize: 9, color: P.amber, fontFamily: P.mono, letterSpacing: "0.12em", textAlign: "center",
          }}
        >
          REACQUIRING SIGNAL…
        </motion.div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1 }}>
        <AnimatePresence mode="popLayout">
          {(data?.predictions ?? []).map((p, i) => (
            <PredictionCard key={p.id} prediction={p} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
