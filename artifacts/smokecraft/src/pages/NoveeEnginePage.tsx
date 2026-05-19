/**
 * NoveeEnginePage — /novee-engine
 *
 * Live control panel for the NOVEE OS E.A.T. System Integration Engine.
 * Displays the three pillars, tier capability matrix, and allows real-time
 * execution of each pillar with live output.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:        "#000000",
  panel:     "rgba(255,255,255,0.032)",
  border:    "rgba(212,175,55,0.20)",
  borderHi:  "rgba(212,175,55,0.44)",
  gold:      "#D4AF37",
  goldSoft:  "rgba(212,175,55,0.62)",
  goldDim:   "rgba(212,175,55,0.28)",
  text:      "rgba(255,252,245,0.90)",
  muted:     "rgba(255,252,245,0.44)",
  copper:    "#C8762A",
  copperSoft:"rgba(200,118,42,0.62)",
  burgundy:  "#9B2335",
  burgundySoft:"rgba(155,35,53,0.55)",
  green:     "#4CAF7D",
  greenSoft: "rgba(76,175,125,0.55)",
  red:       "#C0392B",
  redSoft:   "rgba(192,57,43,0.55)",
} as const;

// ── Tier badge colors ─────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  basic:   { color: T.muted,       bg: "rgba(255,255,255,0.06)",    label: "BASIC"   },
  mid:     { color: T.copper,      bg: "rgba(200,118,42,0.14)",     label: "MID"     },
  premium: { color: T.gold,        bg: "rgba(212,175,55,0.14)",     label: "PREMIUM" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier = "basic" | "mid" | "premium";

interface CapabilityMatrix {
  tier: Tier;
  pillars: {
    demandVelocity: { available: boolean; level: string };
    userFriction:   { available: boolean; level: string };
    sniperDaemon:   { available: boolean; level: string };
  };
}

// ── Pillar config ─────────────────────────────────────────────────────────────

const PILLARS = [
  {
    id:       "demand",
    key:      "demandVelocity",
    title:    "Demand Velocity",
    subtitle: "Pillar 1 — Inventory Burn Rate & Autonomous Reorder",
    accent:   T.gold,
    accentSoft: T.goldSoft,
    accentDim:  T.goldDim,
    description: "Monitors per-asset stock vs. 30-day order rate. Premium tier auto-generates distributor reorder payloads at ≤30 days. Mid tier alerts at ≤14 days.",
    endpoint: "/api/novee/demand",
    fields: [
      { id: "productId", label: "Product ID", placeholder: "e.g. MACALLAN_25", type: "text" },
    ],
    buildBody: (vals: Record<string, string>) => ({ productId: vals["productId"] }),
  },
  {
    id:       "friction",
    key:      "userFriction",
    title:    "Friction & Disengagement",
    subtitle: "Pillar 2 — Interface Telemetry & Biometric Adaptation",
    accent:   T.copper,
    accentSoft: T.copperSoft,
    accentDim:  "rgba(200,118,42,0.28)",
    description: "Evaluates dwell time and interaction loops. Mid/Premium simplify the UI layout on threshold breach. Premium also triggers on wearable energy state LOW.",
    endpoint: "/api/novee/friction",
    fields: [
      { id: "dwellTime",            label: "Dwell Time (seconds)", placeholder: "e.g. 60",          type: "number" },
      { id: "interactionLoopCount", label: "Interaction Loops",    placeholder: "e.g. 4",            type: "number" },
      { id: "biometricEnergyState", label: "Biometric Energy State (optional)", placeholder: "LOW | NORMAL | HIGH", type: "text" },
    ],
    buildBody: (vals: Record<string, string>) => ({
      dwellTime:            Number(vals["dwellTime"] ?? 0),
      interactionLoopCount: Number(vals["interactionLoopCount"] ?? 0),
      ...(vals["biometricEnergyState"]?.trim()
        ? { biometricEnergyState: vals["biometricEnergyState"].toUpperCase() }
        : {}),
    }),
  },
  {
    id:       "sniper",
    key:      "sniperDaemon",
    title:    "Sniper Daemon",
    subtitle: "Pillar 3 — Competitor Benchmarking & Price Intelligence",
    accent:   T.burgundy,
    accentSoft: T.burgundySoft,
    accentDim:  "rgba(155,35,53,0.28)",
    description: "Live competitive price delta analysis. Mid surfaces a recommendation card. Premium executes an automated countermeasure payload when delta exceeds 8%.",
    endpoint: "/api/novee/sniper",
    fields: [
      { id: "internalPrice",     label: "Internal Asset Price ($)", placeholder: "e.g. 45.00", type: "number" },
      { id: "competitorAverage", label: "Competitor Avg Price ($)",  placeholder: "e.g. 52.00", type: "number" },
    ],
    buildBody: (vals: Record<string, string>) => ({
      internalPrice:     Number(vals["internalPrice"] ?? 0),
      competitorAverage: Number(vals["competitorAverage"] ?? 0),
    }),
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoveeEnginePage() {
  const [, navigate]    = useLocation();
  const [matrix,   setMatrix]  = useState<CapabilityMatrix | null>(null);
  const [loading,  setLoading] = useState(true);

  // Per-pillar state: field values, running, result, error
  const [pillarsState, setPillarsState] = useState<Record<string, {
    fields: Record<string, string>;
    running: boolean;
    result: unknown;
    error: string | null;
  }>>(() =>
    Object.fromEntries(PILLARS.map(p => [p.id, { fields: {}, running: false, result: null, error: null }]))
  );

  // ── Fetch capability matrix ───────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/novee/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.success) setMatrix(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Execute a pillar ──────────────────────────────────────────────────────
  async function runPillar(pillarId: string, endpoint: string, body: unknown) {
    setPillarsState(s => ({ ...s, [pillarId]: { ...s[pillarId]!, running: true, result: null, error: null } }));
    try {
      const r = await fetch(endpoint, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(body),
      });
      const data = await r.json();
      if (data.success) {
        setPillarsState(s => ({ ...s, [pillarId]: { ...s[pillarId]!, running: false, result: data.result } }));
      } else {
        setPillarsState(s => ({ ...s, [pillarId]: { ...s[pillarId]!, running: false, error: data.error ?? "Unknown error" } }));
      }
    } catch {
      setPillarsState(s => ({ ...s, [pillarId]: { ...s[pillarId]!, running: false, error: "Network error" } }));
    }
  }

  function setField(pillarId: string, fieldId: string, value: string) {
    setPillarsState(s => ({
      ...s,
      [pillarId]: { ...s[pillarId]!, fields: { ...s[pillarId]!.fields, [fieldId]: value } },
    }));
  }

  const tier = matrix?.tier ?? "basic";
  const ts   = TIER_STYLES[tier] ?? TIER_STYLES.basic!;

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg,
      color: T.text, fontFamily: "'Inter', sans-serif",
      padding: "0 0 64px",
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: "32px 40px 28px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <button
              onClick={() => navigate("/")}
              style={{ background: "transparent", border: `1px solid ${T.goldDim}`,
                color: T.goldDim, padding: "6px 14px", borderRadius: 4,
                fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
                textTransform: "uppercase", cursor: "pointer" }}
            >← BACK</button>

            {/* Tier badge */}
            {matrix && (
              <span style={{
                background: ts.bg, color: ts.color,
                border: `1px solid ${ts.color}44`,
                padding: "5px 14px", borderRadius: 20,
                fontSize: 11, fontWeight: 700, letterSpacing: "0.32em",
              }}>{ts.label} TIER</span>
            )}
          </div>

          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.44em", textTransform: "uppercase",
            color: T.goldDim, margin: "0 0 8px" }}>NOVEE OS — E.A.T. SYSTEM</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 300,
            color: T.gold, margin: "0 0 6px", letterSpacing: "0.08em" }}>
            Integration Engine
          </h1>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14,
            color: T.muted, margin: 0, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Subscription Tier Interaction Router &amp; Telemetry Module
          </p>
        </div>

        {/* Capability summary chips */}
        {matrix && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            {Object.entries(matrix.pillars).map(([key, val]) => (
              <div key={key} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 14px",
                background: val.available ? "rgba(76,175,125,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${val.available ? "rgba(76,175,125,0.22)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 20,
              }}>
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

      {/* ── Three pillars ── */}
      <div style={{ padding: "40px 40px 0", display: "flex", flexDirection: "column", gap: 32 }}>

        {loading ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ textAlign: "center", padding: "60px 0",
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 24, color: T.goldDim, letterSpacing: "0.18em" }}
          >
            INITIALIZING ENGINE MATRIX…
          </motion.div>
        ) : (
          PILLARS.map((pillar, idx) => {
            const ps = pillarsState[pillar.id]!;
            const capability = matrix?.pillars[pillar.key as keyof typeof matrix.pillars];
            const isAvailable = capability?.available ?? false;

            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.7 }}
                style={{
                  background: T.panel,
                  border: `1px solid ${T.border}`,
                  borderLeft: `3px solid ${pillar.accent}`,
                  borderRadius: 16,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  overflow: "hidden",
                }}
              >
                {/* Pillar header */}
                <div style={{ padding: "28px 32px 24px",
                  borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.42em", textTransform: "uppercase",
                        color: pillar.accentSoft, margin: "0 0 8px" }}>
                        PILLAR {idx + 1}
                      </p>
                      <h2 style={{ fontFamily: "'Cormorant Garamond',serif",
                        fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 400,
                        color: pillar.accent, margin: "0 0 6px", letterSpacing: "0.06em" }}>
                        {pillar.title}
                      </h2>
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                        color: T.muted, margin: "0 0 14px", letterSpacing: "0.08em",
                        textTransform: "uppercase" }}>
                        {pillar.subtitle}
                      </p>
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 15,
                        color: T.text, margin: 0, lineHeight: 1.65, maxWidth: 520 }}>
                        {pillar.description}
                      </p>
                    </div>

                    {/* Capability level badge */}
                    {capability && (
                      <div style={{
                        padding: "14px 20px",
                        background: isAvailable ? `${pillar.accentDim}` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isAvailable ? pillar.accentDim : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 10, minWidth: 220, maxWidth: 280,
                      }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                          letterSpacing: "0.32em", textTransform: "uppercase",
                          color: isAvailable ? pillar.accentSoft : T.muted, margin: "0 0 8px" }}>
                          CURRENT CAPABILITY
                        </p>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                          color: isAvailable ? T.text : T.muted, margin: 0, lineHeight: 1.5 }}>
                          {capability.level}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input form + output */}
                <div style={{ padding: "24px 32px 28px",
                  display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>

                  {/* Inputs */}
                  <div style={{ flex: 1, minWidth: 260, display: "flex",
                    flexDirection: "column", gap: 14 }}>
                    {(pillar.fields as readonly { id: string; label: string; placeholder: string; type: string }[]).map(field => (
                      <div key={field.id}>
                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 12,
                          fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase",
                          color: pillar.accentSoft, display: "block", marginBottom: 6 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={ps.fields[field.id] ?? ""}
                          onChange={e => setField(pillar.id, field.id, e.target.value)}
                          placeholder={field.placeholder}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "rgba(0,0,0,0.38)",
                            border: `1px solid ${T.border}`,
                            borderRadius: 8, padding: "12px 16px",
                            fontFamily: "'Inter',sans-serif", fontSize: 15,
                            color: T.text, outline: "none",
                            letterSpacing: "0.04em",
                          }}
                        />
                      </div>
                    ))}

                    <button
                      onClick={() => {
                        const body = pillar.buildBody(ps.fields);
                        runPillar(pillar.id, pillar.endpoint, body);
                      }}
                      disabled={ps.running}
                      style={{
                        marginTop: 6,
                        background: ps.running ? "rgba(0,0,0,0.2)" : `linear-gradient(110deg, ${pillar.accentDim} 0%, rgba(0,0,0,0) 100%)`,
                        border: `1px solid ${ps.running ? T.border : pillar.accent}`,
                        borderRadius: 8, padding: "14px 24px",
                        fontFamily: "'Inter',sans-serif", fontSize: 13,
                        fontWeight: 700, letterSpacing: "0.26em",
                        textTransform: "uppercase" as const,
                        color: ps.running ? T.muted : pillar.accent,
                        cursor: ps.running ? "not-allowed" : "pointer",
                        transition: "all 0.3s",
                      }}
                    >
                      {ps.running ? "EXECUTING…" : `RUN ${pillar.title.toUpperCase()}`}
                    </button>
                  </div>

                  {/* Output */}
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.36em", textTransform: "uppercase",
                      color: pillar.accentSoft, margin: "0 0 12px" }}>
                      ENGINE OUTPUT
                    </p>

                    <AnimatePresence mode="wait">
                      {ps.running ? (
                        <motion.div key="running"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[1,2,3].map(n => (
                            <motion.div key={n}
                              animate={{ opacity: [0.15, 0.45, 0.15] }}
                              transition={{ duration: 1.4, repeat: Infinity, delay: n * 0.15 }}
                              style={{ height: 22, borderRadius: 4,
                                background: `${pillar.accentDim}` }} />
                          ))}
                        </motion.div>
                      ) : ps.error ? (
                        <motion.div key="error"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ padding: "14px 16px",
                            background: "rgba(192,57,43,0.08)",
                            border: "1px solid rgba(192,57,43,0.22)",
                            borderRadius: 8 }}>
                          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                            color: T.redSoft, margin: 0 }}>{ps.error}</p>
                        </motion.div>
                      ) : ps.result ? (
                        <motion.div key="result"
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                          {/* Status badge */}
                          {"status" in (ps.result as object) && (
                            <div style={{ marginBottom: 12, display: "inline-block",
                              padding: "5px 14px",
                              background: `${pillar.accentDim}`,
                              border: `1px solid ${pillar.accentSoft}`,
                              borderRadius: 20 }}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                                fontWeight: 700, letterSpacing: "0.28em",
                                textTransform: "uppercase", color: pillar.accent }}>
                                {(ps.result as Record<string,string>)["status"] ??
                                 (ps.result as Record<string,string>)["action"]}
                              </span>
                            </div>
                          )}
                          {"action" in (ps.result as object) && !("status" in (ps.result as object)) && (
                            <div style={{ marginBottom: 12, display: "inline-block",
                              padding: "5px 14px",
                              background: `${pillar.accentDim}`,
                              border: `1px solid ${pillar.accentSoft}`,
                              borderRadius: 20 }}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                                fontWeight: 700, letterSpacing: "0.28em",
                                textTransform: "uppercase", color: pillar.accent }}>
                                {(ps.result as Record<string,string>)["action"]}
                              </span>
                            </div>
                          )}
                          {/* JSON dump */}
                          <pre style={{
                            margin: 0,
                            padding: "16px",
                            background: "rgba(0,0,0,0.50)",
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            fontFamily: "'Inter',monospace",
                            fontSize: 13, color: T.text,
                            overflowX: "auto", lineHeight: 1.7,
                            whiteSpace: "pre-wrap", wordBreak: "break-all",
                          }}>
                            {JSON.stringify(ps.result, null, 2)}
                          </pre>
                        </motion.div>
                      ) : (
                        <motion.div key="idle"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ padding: "18px 16px",
                            background: "rgba(255,255,255,0.02)",
                            border: `1px solid rgba(255,255,255,0.06)`,
                            borderRadius: 8, textAlign: "center" }}>
                          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                            color: T.muted, margin: 0, letterSpacing: "0.10em" }}>
                            Fill in the fields and execute to see live engine output.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Admin route reference ── */}
      <div style={{ margin: "40px 40px 0",
        padding: "20px 24px",
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${T.border}`,
        borderRadius: 12 }}>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.36em", textTransform: "uppercase",
          color: T.goldDim, margin: "0 0 10px" }}>API ENDPOINTS</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            "GET  /api/novee/status",
            "POST /api/novee/demand",
            "POST /api/novee/friction",
            "POST /api/novee/sniper",
          ].map(ep => (
            <code key={ep} style={{
              fontFamily: "'Inter',monospace", fontSize: 13,
              color: T.goldSoft, background: "rgba(212,175,55,0.06)",
              border: `1px solid ${T.goldDim}`, borderRadius: 6,
              padding: "5px 12px",
            }}>{ep}</code>
          ))}
        </div>
      </div>
    </div>
  );
}
