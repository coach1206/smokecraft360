/**
 * NoveeEnginePage — /novee-engine
 *
 * Live control panel for the NOVEE OS E.A.T. System Integration Engine.
 * Matches the spec control panel: asset dropdowns, biometric selects,
 * preset values, and live integration node card.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:           "#000000",
  panel:        "rgba(255,255,255,0.032)",
  border:       "rgba(212,175,55,0.20)",
  borderHi:     "rgba(212,175,55,0.44)",
  gold:         "#D4AF37",
  goldSoft:     "rgba(212,175,55,0.62)",
  goldDim:      "rgba(212,175,55,0.28)",
  text:         "rgba(255,252,245,0.90)",
  muted:        "rgba(255,252,245,0.44)",
  copper:       "#C8762A",
  copperSoft:   "rgba(200,118,42,0.62)",
  copperDim:    "rgba(200,118,42,0.28)",
  burgundy:     "#9B2335",
  burgundySoft: "rgba(155,35,53,0.55)",
  burgundyDim:  "rgba(155,35,53,0.28)",
  green:        "#4CAF7D",
  greenSoft:    "rgba(76,175,125,0.55)",
  greenDim:     "rgba(76,175,125,0.12)",
  red:          "#C0392B",
  redSoft:      "rgba(192,57,43,0.55)",
  teal:         "#0EA5E9",
  tealSoft:     "rgba(14,165,233,0.55)",
  tealDim:      "rgba(14,165,233,0.12)",
} as const;

const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  basic:   { color: T.muted,   bg: "rgba(255,255,255,0.06)", label: "BASIC"   },
  mid:     { color: T.copper,  bg: "rgba(200,118,42,0.14)",  label: "MID"     },
  premium: { color: T.gold,    bg: "rgba(212,175,55,0.14)",  label: "PREMIUM" },
};

// ── Field types ───────────────────────────────────────────────────────────────

type FieldDef =
  | { id: string; label: string; type: "text" | "number"; placeholder: string; defaultValue?: string }
  | { id: string; label: string; type: "select"; options: { value: string; label: string }[]; defaultValue?: string };

// ── Pillar definitions ────────────────────────────────────────────────────────

interface PillarDef {
  id:          string;
  key:         string;
  title:       string;
  subtitle:    string;
  accent:      string;
  accentSoft:  string;
  accentDim:   string;
  description: string;
  endpoint:    string;
  fields:      FieldDef[];
  buildBody:   (vals: Record<string, string>) => unknown;
}

const PILLARS: PillarDef[] = [
  {
    id:          "demand",
    key:         "demandVelocity",
    title:       "Demand Velocity",
    subtitle:    "Pillar 1 — Inventory Burn Rate & Autonomous Reorder",
    accent:      T.gold,
    accentSoft:  T.goldSoft,
    accentDim:   T.goldDim,
    description: "Monitors per-asset stock vs. 30-day order rate. Premium tier auto-generates distributor PO at ≤30 days. Mid tier dispatches alert at ≤14 days. Basic logs only.",
    endpoint:    "/api/novee/demand",
    fields: [
      {
        id:           "assetId",
        label:        "Select Database Asset Target",
        type:         "select",
        defaultValue: "MACALLAN_25",
        options: [
          { value: "MACALLAN_25",      label: "Macallan 25 Year Single Malt — Premium" },
          { value: "COHIBA_SIGLO_VI",  label: "Cohiba Siglo VI Cigar — Mid"            },
          { value: "OPUS_ONE_2019",    label: "Opus One Napa Valley 2019 — Basic"      },
          { value: "__custom",         label: "Custom Asset ID…"                        },
        ],
      },
      {
        id:           "assetIdCustom",
        label:        "Custom Asset ID",
        type:         "text",
        placeholder:  "Enter asset ID",
        defaultValue: "",
      },
    ],
    buildBody: (vals) => {
      const id = vals["assetId"] === "__custom"
        ? (vals["assetIdCustom"] ?? "").trim()
        : vals["assetId"];
      return { assetId: id };
    },
  },
  {
    id:          "friction",
    key:         "userFriction",
    title:       "Friction & Disengagement",
    subtitle:    "Pillar 2 — Interface Telemetry & Biometric Adaptation",
    accent:      T.copper,
    accentSoft:  T.copperSoft,
    accentDim:   T.copperDim,
    description: "Evaluates dwell time and interaction loops. Mid/Premium swap to minimalist layout on threshold breach. Premium additionally fires on wearable energy state LOW.",
    endpoint:    "/api/novee/friction",
    fields: [
      {
        id:           "dwellTime",
        label:        "Dwell Time (Seconds)",
        type:         "number",
        placeholder:  "e.g. 52",
        defaultValue: "52",
      },
      {
        id:           "interactionLoopCount",
        label:        "Interaction Loop Count",
        type:         "number",
        placeholder:  "e.g. 4",
        defaultValue: "4",
      },
      {
        id:           "biometricEnergyState",
        label:        "Biometric Stream State",
        type:         "select",
        defaultValue: "STABLE",
        options: [
          { value: "STABLE", label: "Stable / Normal Vital Energy"      },
          { value: "LOW",    label: "Low Energy / Lethargic Friction Flag" },
          { value: "HIGH",   label: "High Energy / Elevated Engagement"  },
        ],
      },
    ],
    buildBody: (vals) => ({
      dwellTime:            Number(vals["dwellTime"] ?? 0),
      interactionLoopCount: Number(vals["interactionLoopCount"] ?? 0),
      biometricEnergyState: vals["biometricEnergyState"] ?? "STABLE",
    }),
  },
  {
    id:          "sniper",
    key:         "sniperDaemon",
    title:       "Sniper Daemon",
    subtitle:    "Pillar 3 — Competitor Benchmarking & Price Intelligence",
    accent:      T.burgundy,
    accentSoft:  T.burgundySoft,
    accentDim:   T.burgundyDim,
    description: "Live competitive price delta analysis. Mid surfaces a recommendation card. Premium executes an automated countermeasure payload when delta exceeds 8%.",
    endpoint:    "/api/novee/sniper",
    fields: [
      {
        id:           "internalPrice",
        label:        "Internal Floor Price ($)",
        type:         "number",
        placeholder:  "e.g. 250",
        defaultValue: "250",
      },
      {
        id:           "competitorAverage",
        label:        "Competitor Average Scraped Price ($)",
        type:         "number",
        placeholder:  "e.g. 295",
        defaultValue: "295",
      },
    ],
    buildBody: (vals) => ({
      internalPrice:     Number(vals["internalPrice"] ?? 0),
      competitorAverage: Number(vals["competitorAverage"] ?? 0),
    }),
  },
];

// ── Capability matrix types ───────────────────────────────────────────────────

type Tier = "basic" | "mid" | "premium";

interface CapabilityMatrix {
  tier: Tier;
  pillars: Record<string, { available: boolean; level: string }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoveeEnginePage() {
  const [, navigate]   = useLocation();
  const [matrix, setMatrix]   = useState<CapabilityMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [deployUrl, setDeployUrl] = useState("");

  // Per-pillar: field values, running, result, error
  const [ps, setPs] = useState<Record<string, {
    fields:  Record<string, string>;
    running: boolean;
    result:  unknown;
    error:   string | null;
  }>>(() =>
    Object.fromEntries(
      PILLARS.map(p => [
        p.id,
        {
          fields:  Object.fromEntries(
            p.fields.map(f => [f.id, f.defaultValue ?? ""])
          ),
          running: false, result: null, error: null,
        },
      ])
    )
  );

  useEffect(() => {
    setDeployUrl(window.location.origin + "/novee-engine");
    fetch("/api/novee/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setMatrix(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function setField(pillarId: string, fieldId: string, value: string) {
    setPs(s => ({
      ...s,
      [pillarId]: { ...s[pillarId]!, fields: { ...s[pillarId]!.fields, [fieldId]: value } },
    }));
  }

  async function runPillar(pillar: PillarDef) {
    setPs(s => ({ ...s, [pillar.id]: { ...s[pillar.id]!, running: true, result: null, error: null } }));
    try {
      const body = pillar.buildBody(ps[pillar.id]!.fields);
      const r    = await fetch(pillar.endpoint, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        setPs(s => ({ ...s, [pillar.id]: { ...s[pillar.id]!, running: false, result: data.result } }));
      } else {
        setPs(s => ({ ...s, [pillar.id]: { ...s[pillar.id]!, running: false, error: data.error ?? "Unknown error" } }));
      }
    } catch {
      setPs(s => ({ ...s, [pillar.id]: { ...s[pillar.id]!, running: false, error: "Network error" } }));
    }
  }

  const tier = matrix?.tier ?? "basic";
  const ts   = TIER_STYLES[tier] ?? TIER_STYLES.basic!;

  // ── Shared input styles ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(0,0,0,0.50)",
    border: `1px solid ${T.border}`,
    borderRadius: 8, padding: "12px 16px",
    fontFamily: "'Inter',sans-serif", fontSize: 15,
    color: T.text, outline: "none",
    letterSpacing: "0.04em", appearance: "none" as const,
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter',sans-serif", fontSize: 12,
    fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase" as const,
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text,
      fontFamily: "'Inter', sans-serif", padding: "0 0 80px" }}>

      {/* ── Header ── */}
      <div style={{ padding: "32px 40px 28px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <button onClick={() => navigate("/")} style={{
              background: "transparent", border: `1px solid ${T.goldDim}`,
              color: T.goldDim, padding: "6px 14px", borderRadius: 4,
              fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
              textTransform: "uppercase", cursor: "pointer" }}>
              ← BACK
            </button>
            {matrix && (
              <span style={{ background: ts.bg, color: ts.color,
                border: `1px solid ${ts.color}44`,
                padding: "5px 14px", borderRadius: 20,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.32em" }}>
                {ts.label} TIER
              </span>
            )}
          </div>

          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.44em", textTransform: "uppercase",
            color: T.goldDim, margin: "0 0 8px" }}>
            NOVEE OS — E.A.T. SYSTEM
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 300,
            color: T.gold, margin: "0 0 6px", letterSpacing: "0.08em" }}>
            Production Control Hub
          </h1>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14,
            color: T.muted, margin: 0, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Live E.A.T Framework &amp; Tablet Integration Node
          </p>
        </div>

        {/* Capability chips */}
        {matrix && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {Object.entries(matrix.pillars).map(([key, val]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px",
                background: val.available ? T.greenDim : "rgba(255,255,255,0.04)",
                border: `1px solid ${val.available ? "rgba(76,175,125,0.22)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 20 }}>
                <span style={{ fontSize: 10, color: val.available ? T.green : T.muted }}>
                  {val.available ? "●" : "○"}
                </span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                  color: val.available ? T.greenSoft : T.muted, letterSpacing: "0.14em",
                  textTransform: "uppercase" }}>
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pillar grid ── */}
      <div style={{ padding: "40px 40px 0",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 540px), 1fr))",
        gap: 28 }}>

        {loading ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0",
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 24, color: T.goldDim, letterSpacing: "0.18em" }}>
            INITIALIZING ENGINE MATRIX…
          </motion.div>
        ) : (
          <>
            {PILLARS.map((pillar, idx) => {
              const state      = ps[pillar.id]!;
              const capability = matrix?.pillars[pillar.key];
              const isAvail    = capability?.available ?? false;
              const isCustom   = pillar.id === "demand" && state.fields["assetId"] === "__custom";

              return (
                <motion.div key={pillar.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.10, duration: 0.65 }}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderLeft: `3px solid ${pillar.accent}`,
                    borderRadius: 16,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    display: "flex", flexDirection: "column",
                  }}>

                  {/* Card header */}
                  <div style={{ padding: "26px 28px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.42em", textTransform: "uppercase",
                      color: pillar.accentSoft, margin: "0 0 8px" }}>
                      PILLAR {idx + 1} &nbsp;—&nbsp;
                      <span style={{ color: T.muted, letterSpacing: "0.15em", fontSize: 10 }}>
                        POST {pillar.endpoint}
                      </span>
                    </p>
                    <h2 style={{ fontFamily: "'Cormorant Garamond',serif",
                      fontSize: "clamp(1.5rem,2.6vw,2rem)", fontWeight: 400,
                      color: pillar.accent, margin: "0 0 6px", letterSpacing: "0.06em" }}>
                      {pillar.title}
                    </h2>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                      color: T.muted, margin: "0 0 14px", letterSpacing: "0.08em",
                      textTransform: "uppercase" }}>
                      {pillar.subtitle}
                    </p>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14,
                      color: T.text, margin: 0, lineHeight: 1.65 }}>
                      {pillar.description}
                    </p>

                    {/* Capability badge */}
                    {capability && (
                      <div style={{ marginTop: 14, padding: "10px 14px",
                        background: isAvail ? pillar.accentDim : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isAvail ? pillar.accentDim : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 8 }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                          letterSpacing: "0.32em", textTransform: "uppercase",
                          color: isAvail ? pillar.accentSoft : T.muted, margin: "0 0 4px" }}>
                          CURRENT CAPABILITY
                        </p>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                          color: isAvail ? T.text : T.muted, margin: 0, lineHeight: 1.5 }}>
                          {capability.level}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Inputs + output */}
                  <div style={{ padding: "22px 28px 26px", display: "flex",
                    gap: 28, flexWrap: "wrap", alignItems: "flex-start", flex: 1 }}>

                    {/* Input column */}
                    <div style={{ flex: 1, minWidth: 240,
                      display: "flex", flexDirection: "column", gap: 14 }}>

                      {pillar.fields.map(field => {
                        // Hide custom text input unless "__custom" is selected
                        if (field.id === "assetIdCustom" && !isCustom) return null;

                        if (field.type === "select") {
                          return (
                            <div key={field.id}>
                              <label style={{ ...labelStyle, color: pillar.accentSoft }}>
                                {field.label}
                              </label>
                              <select
                                value={state.fields[field.id] ?? field.defaultValue ?? ""}
                                onChange={e => setField(pillar.id, field.id, e.target.value)}
                                style={{ ...inputStyle, cursor: "pointer" }}>
                                {field.options.map(opt => (
                                  <option key={opt.value} value={opt.value}
                                    style={{ background: "#0f0f0f", color: T.text }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        }

                        return (
                          <div key={field.id}>
                            <label style={{ ...labelStyle, color: pillar.accentSoft }}>
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              value={state.fields[field.id] ?? ""}
                              onChange={e => setField(pillar.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              style={inputStyle}
                            />
                          </div>
                        );
                      })}

                      <button
                        onClick={() => runPillar(pillar)}
                        disabled={state.running}
                        style={{
                          marginTop: 4,
                          background: state.running
                            ? "rgba(0,0,0,0.2)"
                            : `linear-gradient(110deg, ${pillar.accentDim} 0%, rgba(0,0,0,0) 100%)`,
                          border: `1px solid ${state.running ? T.border : pillar.accent}`,
                          borderRadius: 8, padding: "14px 20px",
                          fontFamily: "'Inter',sans-serif", fontSize: 12,
                          fontWeight: 700, letterSpacing: "0.26em",
                          textTransform: "uppercase",
                          color: state.running ? T.muted : pillar.accent,
                          cursor: state.running ? "not-allowed" : "pointer",
                          transition: "all 0.25s",
                        }}>
                        {state.running ? "EXECUTING…" : pillar.id === "demand"
                          ? "Execute Demand Analysis"
                          : pillar.id === "friction"
                            ? "Evaluate Interface State"
                            : "Run Competitive Sniper"}
                      </button>
                    </div>

                    {/* Output column */}
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.36em", textTransform: "uppercase",
                        color: pillar.accentSoft, margin: "0 0 10px" }}>
                        ENGINE RESPONSE PAYLOAD
                      </p>

                      <AnimatePresence mode="wait">
                        {state.running ? (
                          <motion.div key="running"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[1,2,3].map(n => (
                              <motion.div key={n}
                                animate={{ opacity: [0.12, 0.40, 0.12] }}
                                transition={{ duration: 1.4, repeat: Infinity, delay: n * 0.16 }}
                                style={{ height: 22, borderRadius: 4,
                                  background: pillar.accentDim }} />
                            ))}
                          </motion.div>
                        ) : state.error ? (
                          <motion.div key="error"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: "14px 16px",
                              background: "rgba(192,57,43,0.08)",
                              border: "1px solid rgba(192,57,43,0.22)",
                              borderRadius: 8 }}>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                              color: T.redSoft, margin: 0 }}>{state.error}</p>
                          </motion.div>
                        ) : state.result ? (
                          <motion.div key="result"
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                            {/* Action badge */}
                            {typeof (state.result as Record<string,unknown>)["action"] === "string" && (
                              <div style={{ marginBottom: 10, display: "inline-block",
                                padding: "4px 14px",
                                background: pillar.accentDim,
                                border: `1px solid ${pillar.accentSoft}`,
                                borderRadius: 20 }}>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                                  fontWeight: 700, letterSpacing: "0.26em",
                                  textTransform: "uppercase", color: pillar.accent }}>
                                  {String((state.result as Record<string,unknown>)["action"])}
                                </span>
                              </div>
                            )}
                            <pre style={{
                              margin: 0, padding: "14px 16px",
                              background: "rgba(0,0,0,0.55)",
                              border: `1px solid ${T.border}`,
                              borderRadius: 8,
                              fontFamily: "'Inter',monospace", fontSize: 12,
                              color: T.text, overflowX: "auto",
                              lineHeight: 1.7, whiteSpace: "pre-wrap",
                              wordBreak: "break-all", maxHeight: 280,
                              overflowY: "auto",
                            }}>
                              {JSON.stringify(state.result, null, 2)}
                            </pre>
                          </motion.div>
                        ) : (
                          <motion.div key="idle"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: "16px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 8, textAlign: "center" }}>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                              color: T.muted, margin: 0 }}>
                              // Awaiting execution pulse…
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* ── 4th card: Live Integration Node ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.65 }}
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${T.teal}`,
                borderRadius: 16,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
              }}>

              <div style={{ padding: "26px 28px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.42em", textTransform: "uppercase",
                  color: T.tealSoft, margin: "0 0 8px" }}>
                  INTEGRATION NODE
                </p>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "clamp(1.5rem,2.6vw,2rem)", fontWeight: 400,
                  color: T.teal, margin: "0 0 6px", letterSpacing: "0.06em" }}>
                  Live Registered Integration
                </h2>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                  color: T.muted, margin: "0 0 14px", letterSpacing: "0.08em",
                  textTransform: "uppercase" }}>
                  Tablet &amp; Kiosk Wiring Layer
                </p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14,
                  color: T.text, margin: 0, lineHeight: 1.7, maxWidth: 420 }}>
                  This console interfaces directly with your trailing 30-day database ledger
                  arrays. Wire your active physical POS barcode scanners or mobile checkout
                  terminals to ping these endpoints wirelessly.
                </p>
              </div>

              <div style={{ padding: "22px 28px 28px",
                display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Deployment URL */}
                <div>
                  <label style={{ ...labelStyle, color: T.tealSoft }}>
                    Remote Deployment URL for Tablets &amp; Kiosks
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={deployUrl}
                    style={{ ...inputStyle,
                      color: T.green, fontFamily: "'Inter',monospace",
                      fontWeight: 600, textAlign: "center",
                      background: "rgba(0,0,0,0.60)",
                      border: `1px solid ${T.tealDim}`,
                      cursor: "text", userSelect: "all" as const,
                    }}
                  />
                </div>

                {/* Registered endpoints */}
                <div>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.36em", textTransform: "uppercase",
                    color: T.tealSoft, margin: "0 0 10px" }}>
                    REGISTERED API ENDPOINTS
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { method: "GET",  path: "/api/novee/status"   },
                      { method: "POST", path: "/api/novee/demand"   },
                      { method: "POST", path: "/api/novee/friction" },
                      { method: "POST", path: "/api/novee/sniper"   },
                    ].map(ep => (
                      <div key={ep.path} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "'Inter',monospace", fontSize: 11,
                          fontWeight: 700, color: ep.method === "GET" ? T.tealSoft : T.goldSoft,
                          background: ep.method === "GET" ? T.tealDim : T.goldDim,
                          padding: "2px 8px", borderRadius: 4, minWidth: 40, textAlign: "center" }}>
                          {ep.method}
                        </span>
                        <code style={{ fontFamily: "'Inter',monospace", fontSize: 13,
                          color: T.text }}>{ep.path}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
