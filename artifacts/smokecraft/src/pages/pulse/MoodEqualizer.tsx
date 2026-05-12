import { motion, useSpring, useTransform } from "framer-motion";
import { usePulse, type ZoneMood } from "./PulseContext";

const P = {
  surface: "rgba(6,15,35,0.95)",
  border:  "rgba(0,180,255,0.12)",
  faint:   "rgba(100,160,220,0.35)",
  blue:    "#00C4E8",
  sapphire:"#1B4FCC",
  platinum:"#E8EDF5",
  amber:   "#F59E0B",
  mono:    "'SF Mono','Fira Code',monospace",
  sans:    "system-ui,-apple-system,'Helvetica Neue',sans-serif",
};

function pressureColor(p: ZoneMood["pressure"]): string {
  if (p === "chill")  return P.sapphire;
  if (p === "active") return P.blue;
  return P.platinum;
}

function pressureGlow(p: ZoneMood["pressure"]): string {
  if (p === "chill")  return "rgba(27,79,204,0.35)";
  if (p === "active") return "rgba(0,196,232,0.40)";
  return "rgba(232,237,245,0.55)";
}

function ZoneBar({ zone }: { zone: ZoneMood }) {
  const color = pressureColor(zone.pressure);
  const glow  = pressureGlow(zone.pressure);
  const isPeak = zone.pressure === "peak";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0, gap: 6 }}>
      {/* Score label */}
      <div style={{ fontSize: 9, color: color, fontFamily: P.mono, letterSpacing: "0.1em", fontWeight: 700, opacity: 0.9 }}>
        {Math.round(zone.score)}
      </div>

      {/* Bar track */}
      <div style={{ position: "relative", width: "100%", height: 140, background: "rgba(0,0,0,0.4)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div
          animate={{ height: `${zone.score}%` }}
          transition={{ type: "spring", stiffness: 48, damping: 14 }}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
            borderRadius: "3px 3px 0 0",
            boxShadow: `0 0 18px ${glow}, 0 0 6px ${glow}`,
          }}
        />
        {/* Peak shimmer sweep */}
        {isPeak && (
          <motion.div
            animate={{ top: ["100%", "-30%"] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            style={{
              position: "absolute", left: 0, right: 0, height: "30%",
              background: `linear-gradient(180deg, transparent, ${color}30, transparent)`,
              pointerEvents: "none",
            }}
          />
        )}
        {/* Aura glow at bottom for peak */}
        {isPeak && (
          <div style={{
            position: "absolute", bottom: 0, left: "-50%", right: "-50%", height: 40,
            background: `radial-gradient(ellipse at center bottom, ${glow}, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Trend indicator */}
      <div style={{ fontSize: 9, color: zone.trend === "up" ? "#22c55e" : zone.trend === "down" ? "#ef4444" : P.faint, fontFamily: P.mono }}>
        {zone.trend === "up" ? "▲" : zone.trend === "down" ? "▼" : "—"}
      </div>

      {/* Zone name */}
      <div style={{ fontSize: 8, color: P.faint, fontFamily: P.sans, letterSpacing: "0.08em", textAlign: "center", textTransform: "uppercase", lineHeight: 1.3 }}>
        {zone.name}
      </div>

      {/* Occupancy */}
      <div style={{ fontSize: 8, color: color, fontFamily: P.mono, opacity: 0.7 }}>
        {zone.occupancy}%
      </div>
    </div>
  );
}

export function MoodEqualizer() {
  const { data, isReacquiring } = usePulse();

  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`,
      borderRadius: 14, padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, color: P.blue, fontFamily: P.mono, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
            LIVE MOOD EQUALIZER
          </div>
          <div style={{ fontSize: 11, color: "rgba(168,216,240,0.50)", fontFamily: P.sans, marginTop: 3 }}>
            Real-time zone pressure · 8 active lanes
          </div>
        </div>
        {isReacquiring && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ fontSize: 8, color: P.amber, fontFamily: P.mono, letterSpacing: "0.12em" }}
          >
            REACQUIRING SIGNAL…
          </motion.div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          {(["chill", "active", "peak"] as const).map(p => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: pressureColor(p) }} />
              <span style={{ fontSize: 8, color: P.faint, fontFamily: P.mono, textTransform: "uppercase", letterSpacing: "0.1em" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        {(data?.zones ?? Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: "—", score: 30, pressure: "chill" as const, trend: "stable" as const, occupancy: 30 }))).map(z => (
          <ZoneBar key={z.id} zone={z} />
        ))}
      </div>
    </div>
  );
}
