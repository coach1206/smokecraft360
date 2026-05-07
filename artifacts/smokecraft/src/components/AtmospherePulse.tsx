/**
 * AtmospherePulse — Live Lounge Vitality visualizer.
 *
 * Consumes GET /api/iot/atmosphere/:venueId every 30 seconds.
 * Shows a "breathing" ambient ring + temperature/humidity bars.
 * When deviant, pulsing amber ring with compensatory pairing nudge.
 *
 * Falls back gracefully when no sensor is online ("No sensor connected").
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

interface AtmosphereData {
  venueId:            string;
  temperatureCelsius: number | null;
  humidityPct:        number | null;
  vitality:           number | null;   // 0–100
  isDeviant:          boolean;
  deviationNote:      string | null;
  lastUpdated:        string | null;
  goldStandard: {
    tempMinC: number; tempMaxC: number;
    humMinPct: number; humMaxPct: number;
  };
}

function toF(c: number) { return (c * 9 / 5 + 32).toFixed(1); }

interface Props {
  venueId: string;
  compact?: boolean;
}

export default function AtmospherePulse({ venueId, compact = false }: Props) {
  const [data,    setData]    = useState<AtmosphereData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`${BASE}/api/iot/atmosphere/${venueId}`)
      .then(r => r.ok ? r.json() as Promise<AtmosphereData> : Promise.resolve(null))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [venueId]);

  const vitality     = data?.vitality ?? null;
  const isDeviant    = data?.isDeviant ?? false;
  const ringColor    = isDeviant ? "#D48B00" : vitality !== null && vitality >= 80 ? "#4ade80" : "#3BBFA3";
  const ringGlow     = isDeviant ? "rgba(212,139,0,0.35)" : "rgba(74,222,128,0.20)";

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.div
          animate={{ opacity: [1, 0.4, 1], scale: [1, 1.08, 1] }}
          transition={{ duration: isDeviant ? 1.2 : 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 10, height: 10, borderRadius: "50%",
            background: loading ? "rgba(26,26,27,0.18)" : ringColor,
            boxShadow: loading ? "none" : `0 0 8px ${ringGlow}`,
          }}
        />
        <span style={{ fontSize: 10, color: "rgba(26,26,27,0.52)", letterSpacing: "0.10em", fontFamily: "monospace" }}>
          {loading ? "SCANNING…"
            : data === null ? "NO SENSOR"
            : isDeviant ? "⚠ DEVIANT"
            : vitality !== null ? `VITALITY ${vitality}%` : "MONITORING"}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)",
      borderRadius: 16, padding: "20px 22px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.14, 1] }}
          transition={{ duration: isDeviant ? 1.0 : 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: loading ? "rgba(26,26,27,0.15)" : ringColor,
            boxShadow: loading ? "none" : `0 0 12px ${ringGlow}`,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: ringColor }}>
          Atmosphere Pulse
        </span>
        {data?.lastUpdated && (
          <span style={{ fontSize: 9, color: "rgba(26,26,27,0.35)", marginLeft: "auto", fontFamily: "monospace" }}>
            {new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "rgba(26,26,27,0.40)", textAlign: "center", padding: "20px 0" }}>Connecting to sensor…</div>
      )}

      {!loading && data === null && (
        <div style={{ fontSize: 12, color: "rgba(26,26,27,0.35)", textAlign: "center", padding: "20px 0" }}>
          No IoT sensor connected to this venue.<br />
          <span style={{ fontSize: 10 }}>POST /api/iot/humidor to connect a Smart Humidor</span>
        </div>
      )}

      {!loading && data !== null && (
        <>
          {/* Vitality ring — animated SVG */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ position: "relative", width: 96, height: 96 }}>
              <svg viewBox="0 0 96 96" width="96" height="96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(26,26,27,0.08)" strokeWidth="7" />
                <motion.circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke={ringColor} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: vitality !== null ? (1 - vitality / 100) * 2 * Math.PI * 40 : 2 * Math.PI * 40 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  style={{ transformOrigin: "48px 48px", transform: "rotate(-90deg)" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: ringColor, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
                  {vitality !== null ? `${vitality}` : "—"}
                </div>
                <div style={{ fontSize: 9, color: "rgba(26,26,27,0.40)", letterSpacing: "0.08em" }}>VITALITY</div>
              </div>
            </div>
          </div>

          {/* Gauges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Temperature */}
            {data.temperatureCelsius !== null && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(26,26,27,0.50)", letterSpacing: "0.08em" }}>TEMPERATURE</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isDeviant ? "#D48B00" : "#1A1A1B", fontFamily: "monospace" }}>
                    {toF(data.temperatureCelsius)}°F · {data.temperatureCelsius.toFixed(1)}°C
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(26,26,27,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, ((data.temperatureCelsius - 15) / 15) * 100))}%` }}
                    transition={{ duration: 0.8 }}
                    style={{ height: "100%", borderRadius: 2, background: data.temperatureCelsius > data.goldStandard.tempMaxC || data.temperatureCelsius < data.goldStandard.tempMinC ? "#D48B00" : "#4ade80" }}
                  />
                </div>
                <div style={{ fontSize: 8, color: "rgba(26,26,27,0.30)", marginTop: 3 }}>
                  Gold Standard: {toF(data.goldStandard.tempMinC)}–{toF(data.goldStandard.tempMaxC)}°F
                </div>
              </div>
            )}

            {/* Humidity */}
            {data.humidityPct !== null && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(26,26,27,0.50)", letterSpacing: "0.08em" }}>HUMIDITY</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isDeviant ? "#D48B00" : "#1A1A1B", fontFamily: "monospace" }}>
                    {data.humidityPct.toFixed(1)}% RH
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(26,26,27,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.humidityPct}%` }}
                    transition={{ duration: 0.8 }}
                    style={{ height: "100%", borderRadius: 2, background: data.humidityPct > data.goldStandard.humMaxPct || data.humidityPct < data.goldStandard.humMinPct ? "#D48B00" : "#4ade80" }}
                  />
                </div>
                <div style={{ fontSize: 8, color: "rgba(26,26,27,0.30)", marginTop: 3 }}>
                  Gold Standard: {data.goldStandard.humMinPct}–{data.goldStandard.humMaxPct}% RH
                </div>
              </div>
            )}
          </div>

          {/* Deviation nudge */}
          <AnimatePresence>
            {isDeviant && data.deviationNote && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: 14, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(212,139,0,0.07)", border: "1px solid rgba(212,139,0,0.28)",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 700, color: "#D48B00", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  ⚠ Compensatory Pairing Recommended
                </div>
                <div style={{ fontSize: 11, color: "rgba(26,26,27,0.70)", lineHeight: 1.45 }}>
                  {data.deviationNote}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
