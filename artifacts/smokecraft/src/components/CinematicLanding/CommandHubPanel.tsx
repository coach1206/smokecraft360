/**
 * CommandHubPanel — NOVEE OS Strategic Command Overlay
 * Authority: Profound Innovations LLC
 *
 * Right-edge slide-in panel accessible during any ritual phase.
 * Toggles between two modes with a cinematic Obsidian-to-Chrome morph:
 *
 *   RITUAL     — live step progress · E.A.T. environment snapshot · asset blueprint
 *   STRATEGIC  — Smoked Chrome E.A.T. data-grid · integrity audit · authority seal
 *
 * Titan Engine sensory transition:
 *   panel background, border, glow, and text palette all animate
 *   on mode switch using Framer Motion spring physics.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CommandHub } from "@/lib/CommandHub";
import type { HubMode, AuditFinding } from "@/lib/CommandHub";
import type { EATState } from "@/components/CinematicLanding/EATController";

/* ── Design tokens per mode ─────────────────────────────────────── */

const OBSIDIAN = {
  bg:           "rgba(4,3,2,0.96)",
  borderLeft:   "rgba(175,175,192,0.13)",
  borderTop:    "rgba(212,175,55,0.11)",
  headerLabel:  "rgba(212,175,55,0.42)",
  headerTitle:  "rgba(235,232,226,0.90)",
  activeTab:    "rgba(212,175,55,0.10)",
  activeTabBdr: "rgba(212,175,55,0.44)",
  activeTabTxt: "rgba(212,175,55,0.88)",
  inactiveTab:  "rgba(255,255,255,0.07)",
  inactiveTabTxt: "rgba(160,155,145,0.36)",
};

const CHROME = {
  bg:           "rgba(9,10,14,0.98)",
  borderLeft:   "rgba(185,190,210,0.24)",
  borderTop:    "rgba(170,175,195,0.18)",
  headerLabel:  "rgba(185,190,210,0.50)",
  headerTitle:  "rgba(210,215,228,0.94)",
  activeTab:    "rgba(175,180,200,0.10)",
  activeTabBdr: "rgba(185,190,210,0.50)",
  activeTabTxt: "rgba(195,200,218,0.92)",
  inactiveTab:  "rgba(255,255,255,0.04)",
  inactiveTabTxt: "rgba(140,145,160,0.38)",
};

/* ── Sub-components ─────────────────────────────────────────────── */

function StatusDot({ level }: { level: AuditFinding["level"] }) {
  const color =
    level === "INFO" ? "rgba(212,175,55,0.72)"  :
    level === "WARN" ? "rgba(220,140,40,0.86)"  :
                      "rgba(220,60,60,0.86)";
  return (
    <span style={{
      display: "inline-block",
      width: 5, height: 5, borderRadius: "50%",
      background: color, marginRight: 8, flexShrink: 0, marginTop: 5,
    }} />
  );
}

function SectionLabel({ children, chrome = false }: { children: React.ReactNode; chrome?: boolean }) {
  return (
    <p style={{
      fontSize: 7, letterSpacing: "0.38em", textTransform: "uppercase",
      color: chrome ? "rgba(185,190,210,0.42)" : "rgba(212,175,55,0.38)",
      marginBottom: 10, marginTop: 20,
    }}>
      {children}
    </p>
  );
}

function TitaniumRule({ chrome = false }: { chrome?: boolean }) {
  return (
    <div style={{
      height: 1, margin: "14px 0",
      background: chrome
        ? "linear-gradient(90deg, transparent, rgba(185,190,210,0.20), transparent)"
        : "linear-gradient(90deg, transparent, rgba(175,175,192,0.20), transparent)",
    }} />
  );
}

/* ── Smoked Chrome Data Grid ────────────────────────────────────── */

function ChromeDataGrid({ eatState }: { eatState: EATState }) {
  const entries = eatState.ledger;

  if (entries.length === 0) {
    return (
      <div style={{
        border: "1px solid rgba(185,190,210,0.12)",
        padding: "18px 14px",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 9, color: "rgba(150,155,170,0.35)", fontStyle: "italic", letterSpacing: "0.06em" }}>
          No transactions committed — begin the ritual to populate the ledger
        </p>
      </div>
    );
  }

  const cols = [
    { key: "session",   label: "SESSION",   w: "22%"  },
    { key: "field",     label: "FIELD",     w: "20%"  },
    { key: "value",     label: "VALUE",     w: "26%"  },
    { key: "authority", label: "AUTH",      w: "19%"  },
    { key: "timestamp", label: "TIME",      w: "13%"  },
  ] as const;

  return (
    <div style={{
      border: "1px solid rgba(185,190,210,0.14)",
      overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        background: "rgba(185,190,210,0.06)",
        borderBottom: "1px solid rgba(185,190,210,0.14)",
        padding: "5px 10px",
      }}>
        {cols.map((c) => (
          <span key={c.key} style={{
            width: c.w, flexShrink: 0,
            fontSize: 6, letterSpacing: "0.30em", textTransform: "uppercase",
            color: "rgba(185,190,210,0.38)", fontFamily: "'Inter', monospace",
          }}>
            {c.label}
          </span>
        ))}
      </div>

      {/* Data rows */}
      {entries.slice(-12).map((entry, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.025 }}
          style={{
            display: "flex", alignItems: "center",
            padding: "5px 10px",
            background: i % 2 === 0
              ? "rgba(185,190,210,0.025)"
              : "transparent",
            borderBottom: i < entries.slice(-12).length - 1
              ? "1px solid rgba(185,190,210,0.07)"
              : "none",
          }}
        >
          {/* SESSION */}
          <span style={{
            width: "22%", flexShrink: 0,
            fontSize: 7, letterSpacing: "0.10em",
            color: "rgba(212,175,55,0.55)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.session.replace("SESSION ", "S")}
          </span>

          {/* FIELD */}
          <span style={{
            width: "20%", flexShrink: 0,
            fontSize: 7, letterSpacing: "0.06em",
            color: "rgba(185,190,210,0.50)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.field}
          </span>

          {/* VALUE */}
          <span style={{
            width: "26%", flexShrink: 0,
            fontSize: 7, letterSpacing: "0.04em",
            color: "rgba(215,218,228,0.68)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.value}
          </span>

          {/* AUTHORITY */}
          <span style={{
            width: "19%", flexShrink: 0,
            fontSize: 6, letterSpacing: "0.08em",
            color: "rgba(212,175,55,0.48)",
            textTransform: "uppercase",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.authority === "Profound Innovations" ? "PROFOUND" : entry.authority}
          </span>

          {/* TIME */}
          <span style={{
            width: "13%", flexShrink: 0,
            fontSize: 6, letterSpacing: "0.04em",
            color: "rgba(150,155,170,0.35)",
          }}>
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </motion.div>
      ))}

      {entries.length > 12 && (
        <div style={{
          padding: "5px 10px",
          background: "rgba(185,190,210,0.04)",
          borderTop: "1px solid rgba(185,190,210,0.10)",
        }}>
          <span style={{
            fontSize: 7, letterSpacing: "0.18em",
            color: "rgba(150,155,170,0.32)",
          }}>
            + {entries.length - 12} earlier entries · total {entries.length}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────── */

export function CommandHubPanel({ eatState, currentStep, phase, onClose }: {
  eatState:    EATState;
  currentStep: number;
  phase:       string;
  onClose:     () => void;
}) {
  const [mode, setMode] = useState<HubMode>("RITUAL");

  const audit   = useMemo(() => CommandHub.runAudit(eatState),   [eatState]);
  const summary = useMemo(() => CommandHub.ledgerSummary(eatState), [eatState]);

  const isChrome = mode === "STRATEGIC";
  const T = isChrome ? CHROME : OBSIDIAN;

  function handleToggle() {
    const result = CommandHub.toggleMode(mode);
    setMode(result.mode);
  }

  const scoreColor =
    audit.integrityScore >= 80 ? "rgba(212,175,55,0.9)"  :
    audit.integrityScore >= 50 ? "rgba(220,140,40,0.85)" :
                                 "rgba(220,60,60,0.80)";
  const env = eatState.environment;

  return (
    <motion.div
      key="command-hub-panel"
      initial={{ x: "100%", opacity: 0 }}
      animate={{
        x: 0,
        opacity: 1,
        backgroundColor: T.bg,
        borderLeftColor: T.borderLeft,
        borderTopColor:  T.borderTop,
      }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(390px, 100vw)",
        zIndex: 180,
        backdropFilter: "blur(40px) saturate(0.4)",
        WebkitBackdropFilter: "blur(40px) saturate(0.4)",
        borderLeft:  `1px solid ${T.borderLeft}`,
        borderTop:   `1px solid ${T.borderTop}`,
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', 'SF Pro Display', monospace",
        overflowY: "auto",
      }}
    >
      {/* ── Titan Engine top glow bar ── */}
      <motion.div
        animate={{
          background: isChrome
            ? "linear-gradient(90deg, transparent, rgba(185,190,210,0.12), transparent)"
            : "linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)",
        }}
        transition={{ duration: 0.6 }}
        style={{ height: 1, flexShrink: 0 }}
      />

      {/* ── Header ── */}
      <div style={{
        padding: "20px 22px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <motion.p
              animate={{ color: T.headerLabel }}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 7, letterSpacing: "0.44em",
                textTransform: "uppercase", marginBottom: 4,
              }}
            >
              NOVEE OS · PROFOUND INNOVATIONS
            </motion.p>
            <motion.h2
              animate={{ color: T.headerTitle }}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 13, letterSpacing: "0.18em",
                fontWeight: 400, textTransform: "uppercase",
              }}
            >
              COMMAND HUB
            </motion.h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(180,175,165,0.38)", fontSize: 18, lineHeight: 1,
              padding: "2px 4px",
            }}
            aria-label="Close Command Hub"
          >
            ×
          </button>
        </div>

        {/* Titan Engine mode toggle */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(["RITUAL", "STRATEGIC"] as HubMode[]).map((m) => {
            const active = mode === m;
            return (
              <motion.button
                key={m}
                whileTap={{ scale: 0.96 }}
                onClick={() => m !== mode && handleToggle()}
                animate={{
                  background:   active ? T.activeTab    : T.inactiveTab,
                  borderColor:  active ? T.activeTabBdr : T.inactiveTab,
                  color:        active ? T.activeTabTxt : T.inactiveTabTxt,
                }}
                transition={{ duration: 0.45 }}
                style={{
                  flex: 1, padding: "8px 0",
                  border: "1px solid transparent",
                  fontSize: 8, letterSpacing: "0.26em",
                  textTransform: "uppercase", cursor: "pointer",
                  fontFamily: "'Inter', monospace",
                }}
              >
                {m}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, padding: "4px 22px 32px", overflowY: "auto" }}>
        <AnimatePresence mode="wait">

          {/* ── RITUAL view ── */}
          {mode === "RITUAL" && (
            <motion.div
              key="ritual-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              <SectionLabel>SESSION PROGRESS</SectionLabel>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, color: "rgba(195,190,180,0.50)", letterSpacing: "0.06em" }}>
                    STEP {String(currentStep).padStart(2, "0")} / 13
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(212,175,55,0.55)", letterSpacing: "0.06em" }}>
                    {Math.round(((currentStep - 2) / 11) * 100)}%
                  </span>
                </div>
                <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
                  <motion.div
                    animate={{ width: `${((currentStep - 2) / 11) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: "100%", borderRadius: 1,
                      background: "linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0.36))",
                    }}
                  />
                </div>
              </div>

              <SectionLabel>ACTIVE PHASE</SectionLabel>
              <p style={{
                fontSize: 10, color: "rgba(200,195,185,0.55)",
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4,
              }}>
                {phase === "ritual"           ? "PRE-DRAW RITUAL · SESSIONS 02–07"       :
                 phase === "draw_engineering" ? "DRAW ENGINEERING · SESSION 08"           :
                 phase === "ritual_post"      ? "SENSORY CALIBRATION · SESSIONS 09–13"   :
                 phase.toUpperCase()}
              </p>

              <TitaniumRule />

              <SectionLabel>E.A.T. ENVIRONMENT</SectionLabel>
              {([ ["LIGHTING", env.lighting], ["AMBIANCE", env.ambiance], ["SPATIAL", env.spatial] ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 7, letterSpacing: "0.28em", color: "rgba(212,175,55,0.30)", textTransform: "uppercase" }}>
                    {k}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(195,190,180,0.50)", textTransform: "lowercase" }}>
                    {v}
                  </span>
                </div>
              ))}

              <TitaniumRule />

              <SectionLabel>ASSET BLUEPRINT</SectionLabel>
              {Object.entries(eatState.asset).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(212,175,55,0.26)", textTransform: "uppercase" }}>
                    {k}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(195,190,180,0.48)", textTransform: "lowercase" }}>
                    {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                  </span>
                </div>
              ))}
              {Object.values(eatState.asset).every((v) => !v) && (
                <p style={{ fontSize: 9, color: "rgba(160,155,145,0.30)", fontStyle: "italic" }}>
                  No fields committed yet
                </p>
              )}
            </motion.div>
          )}

          {/* ── STRATEGIC view — Smoked Chrome ── */}
          {mode === "STRATEGIC" && (
            <motion.div
              key="strategic-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.30 }}
            >
              {/* Integrity score */}
              <SectionLabel chrome>INTEGRITY AUDIT · {audit.systemCheck}</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <p style={{
                    fontSize: 30, fontWeight: 200, letterSpacing: "0.04em",
                    color: scoreColor, lineHeight: 1,
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}>
                    {audit.integrityScore}
                  </p>
                  <p style={{ fontSize: 7, letterSpacing: "0.22em", color: "rgba(185,190,210,0.36)", textTransform: "uppercase" }}>
                    / 100 INTEGRITY
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", marginBottom: 3 }}>
                    {audit.branding}
                  </p>
                  <p style={{ fontSize: 7, letterSpacing: "0.14em", color: "rgba(185,190,210,0.32)", textTransform: "uppercase" }}>
                    {audit.gateVerified ? "GATE VERIFIED" : "GATE PENDING"}
                  </p>
                </div>
              </div>
              <div style={{ height: 2, background: "rgba(185,190,210,0.08)", borderRadius: 1, marginBottom: 8 }}>
                <motion.div
                  animate={{ width: `${audit.integrityScore}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: "100%", borderRadius: 1,
                    background: `linear-gradient(90deg, ${scoreColor}, rgba(185,190,210,0.28))`,
                  }}
                />
              </div>

              <TitaniumRule chrome />

              {/* Findings */}
              <SectionLabel chrome>FINDINGS · {audit.findings.length} CHECKS</SectionLabel>
              {audit.findings.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", marginBottom: 8 }}>
                  <StatusDot level={f.level} />
                  <span style={{ fontSize: 9, color: "rgba(185,190,210,0.46)", letterSpacing: "0.03em", lineHeight: 1.5 }}>
                    {f.message}
                  </span>
                </div>
              ))}

              <TitaniumRule chrome />

              {/* Smoked Chrome E.A.T. Data Grid */}
              <SectionLabel chrome>
                E.A.T. TRANSACTION LEDGER · {summary.totalEntries} {summary.totalEntries === 1 ? "ENTRY" : "ENTRIES"}
              </SectionLabel>
              <ChromeDataGrid eatState={eatState} />

              <TitaniumRule chrome />

              {/* Authority seal */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px",
                border: "1px solid rgba(212,175,55,0.14)",
                background: "rgba(212,175,55,0.03)",
              }}>
                <div>
                  <p style={{ fontSize: 6, letterSpacing: "0.32em", color: "rgba(185,190,210,0.32)", textTransform: "uppercase", marginBottom: 2 }}>
                    NOVEE OS 1.0 · SOVEREIGN SEAL
                  </p>
                  <p style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(212,175,55,0.58)" }}>
                    {audit.authority}
                  </p>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: audit.gateVerified ? "rgba(212,175,55,0.65)" : "rgba(185,190,210,0.20)",
                  boxShadow:  audit.gateVerified ? "0 0 10px rgba(212,175,55,0.35)" : "none",
                }} />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Titan Engine bottom rule ── */}
      <motion.div
        animate={{
          background: isChrome
            ? "linear-gradient(90deg, transparent, rgba(185,190,210,0.18), transparent)"
            : "linear-gradient(90deg, transparent, rgba(130,130,148,0.15), transparent)",
        }}
        transition={{ duration: 0.6 }}
        style={{ height: 1, flexShrink: 0 }}
      />
    </motion.div>
  );
}
