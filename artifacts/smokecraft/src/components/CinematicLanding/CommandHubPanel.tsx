/**
 * CommandHubPanel — NOVEE OS Strategic Command Overlay
 * Authority: Profound Innovations LLC
 *
 * Right-edge slide-in panel accessible during any ritual phase.
 * Toggles between two modes:
 *   RITUAL    — live step progress + E.A.T. environment snapshot
 *   STRATEGIC — full ledger timeline + integrity audit results
 *
 * Visual language: Obsidian Glass surface · Brushed Titanium border ·
 * Smoked Chrome text · amber authority accents.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CommandHub } from "@/lib/CommandHub";
import type { HubMode, AuditFinding } from "@/lib/CommandHub";
import type { EATState } from "@/components/CinematicLanding/EATController";

interface Props {
  eatState:     EATState;
  currentStep:  number;
  phase:        string;
  onClose:      () => void;
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StatusDot({ level }: { level: AuditFinding["level"] }) {
  const color =
    level === "INFO" ? "rgba(212,175,55,0.7)" :
    level === "WARN" ? "rgba(220,140,40,0.85)" :
    "rgba(220,60,60,0.85)";
  return (
    <span style={{
      display: "inline-block",
      width: 5, height: 5, borderRadius: "50%",
      background: color, marginRight: 8, flexShrink: 0,
      marginTop: 5,
    }} />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 7, letterSpacing: "0.38em", textTransform: "uppercase",
      color: "rgba(212,175,55,0.38)", marginBottom: 10, marginTop: 20,
    }}>
      {children}
    </p>
  );
}

function TitaniumRule() {
  return (
    <div style={{
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(175,175,192,0.22), transparent)",
      margin: "14px 0",
    }} />
  );
}

/* ── Main Panel ─────────────────────────────────────────────────── */

export function CommandHubPanel({ eatState, currentStep, phase, onClose }: Props) {
  const [mode, setMode] = useState<HubMode>("RITUAL");

  const audit   = useMemo(() => CommandHub.runAudit(eatState), [eatState]);
  const summary = useMemo(() => CommandHub.ledgerSummary(eatState), [eatState]);

  function handleToggle() {
    const result = CommandHub.toggleMode(mode);
    setMode(result.mode);
  }

  const scoreColor =
    audit.integrityScore >= 80 ? "rgba(212,175,55,0.9)"  :
    audit.integrityScore >= 50 ? "rgba(220,140,40,0.85)" :
    "rgba(220,60,60,0.8)";

  const env = eatState.environment;

  return (
    <motion.div
      key="command-hub-panel"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(380px, 100vw)",
        zIndex: 180,
        background: "rgba(4,3,2,0.96)",
        backdropFilter: "blur(40px) saturate(0.35)",
        WebkitBackdropFilter: "blur(40px) saturate(0.35)",
        borderLeft: "1px solid rgba(175,175,192,0.14)",
        borderTop: "1px solid rgba(212,175,55,0.12)",
        display: "flex", flexDirection: "column",
        fontFamily: "'Inter', 'SF Pro Display', monospace",
        overflowY: "auto",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        padding: "22px 22px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{
              fontSize: 7, letterSpacing: "0.44em", textTransform: "uppercase",
              color: "rgba(212,175,55,0.42)", marginBottom: 4,
            }}>
              NOVEE OS · PROFOUND INNOVATIONS
            </p>
            <h2 style={{
              fontSize: 13, letterSpacing: "0.18em", fontWeight: 400,
              color: "rgba(235,232,226,0.9)", textTransform: "uppercase",
            }}>
              COMMAND HUB
            </h2>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(180,175,165,0.4)", fontSize: 18, lineHeight: 1,
              padding: "2px 4px",
            }}
            aria-label="Close Command Hub"
          >
            ×
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(["RITUAL", "STRATEGIC"] as HubMode[]).map((m) => (
            <motion.button
              key={m}
              whileTap={{ scale: 0.96 }}
              onClick={() => m !== mode && handleToggle()}
              style={{
                flex: 1, padding: "8px 0",
                background: mode === m ? "rgba(212,175,55,0.1)" : "none",
                border: mode === m
                  ? "1px solid rgba(212,175,55,0.45)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: mode === m
                  ? "rgba(212,175,55,0.88)"
                  : "rgba(160,155,145,0.38)",
                fontSize: 8, letterSpacing: "0.26em",
                textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'Inter', monospace",
                transition: "all 0.22s",
              }}
            >
              {m}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, padding: "4px 22px 32px", overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {mode === "RITUAL" ? (
            <motion.div
              key="ritual-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              <SectionLabel>SESSION PROGRESS</SectionLabel>

              {/* Step progress bar */}
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 9, color: "rgba(195,190,180,0.5)", letterSpacing: "0.06em" }}>
                    STEP {String(currentStep).padStart(2, "0")} / 13
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(212,175,55,0.55)", letterSpacing: "0.06em" }}>
                    {Math.round(((currentStep - 2) / 11) * 100)}%
                  </span>
                </div>
                <div style={{
                  height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1,
                }}>
                  <motion.div
                    animate={{ width: `${((currentStep - 2) / 11) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: "100%", borderRadius: 1,
                      background: "linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0.4))",
                    }}
                  />
                </div>
              </div>

              {/* Phase */}
              <SectionLabel>ACTIVE PHASE</SectionLabel>
              <p style={{
                fontSize: 10, color: "rgba(200,195,185,0.55)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 4,
              }}>
                {phase === "ritual"           ? "PRE-DRAW RITUAL · SESSIONS 02–07" :
                 phase === "draw_engineering" ? "DRAW ENGINEERING · SESSION 08"    :
                 phase === "ritual_post"      ? "SENSORY CALIBRATION · SESSIONS 09–13" :
                 phase.toUpperCase()}
              </p>

              <TitaniumRule />

              {/* E.A.T. Environment snapshot */}
              <SectionLabel>E.A.T. ENVIRONMENT</SectionLabel>
              {([
                ["LIGHTING", env.lighting],
                ["AMBIANCE", env.ambiance],
                ["SPATIAL",  env.spatial],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: 7,
                }}>
                  <span style={{
                    fontSize: 7, letterSpacing: "0.28em",
                    color: "rgba(212,175,55,0.32)", textTransform: "uppercase",
                  }}>
                    {k}
                  </span>
                  <span style={{
                    fontSize: 9, color: "rgba(195,190,180,0.5)",
                    textTransform: "lowercase",
                  }}>
                    {v}
                  </span>
                </div>
              ))}

              <TitaniumRule />

              {/* Asset fields so far */}
              <SectionLabel>ASSET BLUEPRINT</SectionLabel>
              {Object.entries(eatState.asset).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 7, letterSpacing: "0.22em",
                    color: "rgba(212,175,55,0.28)", textTransform: "uppercase",
                  }}>
                    {k}
                  </span>
                  <span style={{
                    fontSize: 9, color: "rgba(195,190,180,0.48)",
                    textTransform: "lowercase",
                  }}>
                    {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}
                  </span>
                </div>
              ))}
              {Object.values(eatState.asset).every((v) => !v) && (
                <p style={{ fontSize: 9, color: "rgba(160,155,145,0.32)", fontStyle: "italic" }}>
                  No fields committed yet
                </p>
              )}
            </motion.div>

          ) : (
            /* ── STRATEGIC view ── */
            <motion.div
              key="strategic-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              {/* Integrity score */}
              <SectionLabel>INTEGRITY AUDIT</SectionLabel>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 10,
              }}>
                <div>
                  <p style={{
                    fontSize: 28, fontWeight: 200, letterSpacing: "0.04em",
                    color: scoreColor, lineHeight: 1,
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}>
                    {audit.integrityScore}
                  </p>
                  <p style={{
                    fontSize: 7, letterSpacing: "0.22em",
                    color: "rgba(160,155,145,0.4)", textTransform: "uppercase",
                  }}>
                    / 100 INTEGRITY
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: 9, letterSpacing: "0.16em",
                    color: scoreColor, textTransform: "uppercase", marginBottom: 2,
                  }}>
                    {audit.systemCheck}
                  </p>
                  <p style={{
                    fontSize: 7, letterSpacing: "0.18em",
                    color: "rgba(160,155,145,0.35)", textTransform: "uppercase",
                  }}>
                    {audit.branding}
                  </p>
                </div>
              </div>

              {/* Score bar */}
              <div style={{
                height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1, marginBottom: 6,
              }}>
                <motion.div
                  animate={{ width: `${audit.integrityScore}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: "100%", borderRadius: 1,
                    background: `linear-gradient(90deg, ${scoreColor}, rgba(212,175,55,0.3))`,
                  }}
                />
              </div>

              <TitaniumRule />

              {/* Findings */}
              <SectionLabel>FINDINGS · {audit.findings.length} CHECKS</SectionLabel>
              {audit.findings.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start",
                  marginBottom: 8,
                }}>
                  <StatusDot level={f.level} />
                  <span style={{
                    fontSize: 9, color: "rgba(190,185,175,0.5)",
                    letterSpacing: "0.03em", lineHeight: 1.5,
                  }}>
                    {f.message}
                  </span>
                </div>
              ))}

              <TitaniumRule />

              {/* Ledger timeline */}
              <SectionLabel>TRANSACTION LEDGER · {summary.totalEntries} ENTRIES</SectionLabel>
              {summary.totalEntries === 0 ? (
                <p style={{ fontSize: 9, color: "rgba(160,155,145,0.32)", fontStyle: "italic" }}>
                  No transactions committed yet
                </p>
              ) : (
                <>
                  {eatState.ledger.slice(-8).map((entry, i) => (
                    <div key={i} style={{
                      marginBottom: 8,
                      paddingLeft: 10,
                      borderLeft: "1px solid rgba(212,175,55,0.12)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{
                          fontSize: 7, letterSpacing: "0.22em",
                          color: "rgba(212,175,55,0.4)", textTransform: "uppercase",
                        }}>
                          {entry.session}
                        </span>
                        <span style={{
                          fontSize: 7, color: "rgba(155,150,140,0.3)",
                          letterSpacing: "0.04em",
                        }}>
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 9, color: "rgba(185,180,170,0.48)",
                        letterSpacing: "0.04em",
                      }}>
                        {entry.field} → <span style={{ color: "rgba(210,205,195,0.6)" }}>{entry.value}</span>
                      </p>
                    </div>
                  ))}
                  {summary.totalEntries > 8 && (
                    <p style={{
                      fontSize: 8, color: "rgba(155,150,140,0.3)",
                      letterSpacing: "0.1em", textAlign: "center", marginTop: 4,
                    }}>
                      + {summary.totalEntries - 8} earlier entries
                    </p>
                  )}
                </>
              )}

              <TitaniumRule />

              {/* Authority footer */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: 7, letterSpacing: "0.22em",
                  color: "rgba(212,175,55,0.25)", textTransform: "uppercase",
                }}>
                  AUTHORITY
                </span>
                <span style={{
                  fontSize: 7, letterSpacing: "0.12em",
                  color: "rgba(155,150,140,0.35)",
                }}>
                  {audit.authority}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Ambient Smoked Chrome bottom rule ── */}
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(130,130,148,0.18), transparent)",
        flexShrink: 0,
      }} />
    </motion.div>
  );
}
