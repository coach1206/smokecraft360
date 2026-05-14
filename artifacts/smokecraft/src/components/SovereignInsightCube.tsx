/**
 * SovereignInsightCube — 3-panel Trifecta pairing reveal overlay.
 *
 * Triggered by TrifectaContext.triggerTrifecta() / openCube().
 * Panels animate in with a staggered Framer Motion entrance.
 * Closes on ESC or the X button.
 *
 * Panel layout:
 *   LEFT    — Craft (what they chose)
 *   CENTER  — Pour  (spirit pairing — focal panel, taller)
 *   RIGHT   — Plate (food pairing)
 *
 * Styling uses Titan V classes from index.css + inline Cormorant Garamond.
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTrifecta } from "@/contexts/TrifectaContext";

// ── Icon glyphs per panel (SVG inline — zero network requests) ─────────────

function CigarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="13" width="24" height="6" rx="3" fill="rgba(212,175,55,0.18)" stroke="#D4AF37" strokeWidth="1"/>
      <rect x="26" y="14" width="4" height="4" rx="2" fill="#D4AF37" opacity="0.55"/>
      <path d="M10 10 Q16 6 22 10" stroke="#D4AF37" strokeWidth="0.8" strokeOpacity="0.4" fill="none"/>
    </svg>
  );
}

function GlassIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M8 4 L24 4 L20 18 L12 18 Z" fill="rgba(212,175,55,0.12)" stroke="#D4AF37" strokeWidth="1"/>
      <rect x="14" y="18" width="4" height="6" fill="rgba(212,175,55,0.18)" stroke="#D4AF37" strokeWidth="1"/>
      <rect x="10" y="24" width="12" height="2" rx="1" fill="#D4AF37" opacity="0.6"/>
      <path d="M10 12 Q16 10 22 12" stroke="#D4AF37" strokeWidth="0.7" strokeOpacity="0.35" fill="none"/>
    </svg>
  );
}

function PlateIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="18" rx="12" ry="4" fill="rgba(212,175,55,0.10)" stroke="#D4AF37" strokeWidth="1"/>
      <ellipse cx="16" cy="16" rx="8" ry="6" fill="rgba(212,175,55,0.08)" stroke="#D4AF37" strokeWidth="0.8"/>
      <circle cx="16" cy="14" r="2" fill="#D4AF37" opacity="0.45"/>
    </svg>
  );
}

// ── Affinity score bar ─────────────────────────────────────────────────────

function AffinityBar({ score }: { score: number }) {
  return (
    <div style={{ width: "100%", marginBottom: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6,
      }}>
        <span className="titan-telemetry" style={{ fontSize: 9 }}>TRIFECTA AFFINITY</span>
        <span className="titan-telemetry" style={{ fontSize: 14, color: "#D4AF37" }}>
          {score}
        </span>
      </div>
      <div style={{
        width: "100%", height: 2,
        background: "rgba(212,175,55,0.15)",
        borderRadius: 1, overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.6 }}
          style={{ height: "100%", background: "#D4AF37", borderRadius: 1 }}
        />
      </div>
    </div>
  );
}

// ── Single panel ───────────────────────────────────────────────────────────

interface PanelProps {
  icon:       React.ReactNode;
  label:      string;
  subtitle:   string;
  rationale:  string;
  badge?:     string;
  isFocal?:   boolean;
  delay:      number;
}

function InsightPanel({ icon, label, subtitle, rationale, badge, isFocal, delay }: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{    opacity: 0,  y: 12 }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay }}
      className={`titan-smoked-glass titan-hud-border ${isFocal ? "titan-pulse-gold" : ""}`}
      style={{
        flex:          isFocal ? "0 0 36%" : "0 0 28%",
        padding:       isFocal ? "28px 24px" : "22px 18px",
        borderRadius:  4,
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           12,
        position:      "relative",
        alignSelf:     isFocal ? "flex-start" : "flex-start",
        marginTop:     isFocal ? 0 : 24,
      }}
    >
      {/* Top badge */}
      {badge && (
        <div style={{
          position:   "absolute",
          top:        -10,
          left:       "50%",
          transform:  "translateX(-50%)",
          background: "#D4AF37",
          color:      "#050505",
          fontSize:   9,
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          letterSpacing: "0.12em",
          padding:    "3px 10px",
          borderRadius: 2,
          whiteSpace: "nowrap",
        }}>
          {badge}
        </div>
      )}

      {/* Icon */}
      <div style={{ opacity: 0.85, marginTop: badge ? 8 : 0 }}>{icon}</div>

      {/* Subtitle */}
      <span className="titan-telemetry" style={{ fontSize: 8, color: "rgba(212,175,55,0.5)", textAlign: "center" }}>
        {subtitle}
      </span>

      {/* Label */}
      <span style={{
        fontFamily:  "'Cormorant Garamond', serif",
        fontSize:    isFocal ? 20 : 17,
        fontWeight:  600,
        color:       "#F5F2ED",
        textAlign:   "center",
        lineHeight:  1.25,
        letterSpacing: "0.02em",
      }}>
        {label}
      </span>

      {/* Divider */}
      <div style={{ width: "40%", height: 1, background: "rgba(212,175,55,0.20)", borderRadius: 1 }} />

      {/* Rationale */}
      <span style={{
        fontFamily:   "'Cormorant Garamond', serif",
        fontSize:     13,
        color:        "rgba(245,242,237,0.55)",
        textAlign:    "center",
        lineHeight:   1.5,
        fontStyle:    "italic",
        letterSpacing: "0.01em",
        flexGrow:     1,
      }}>
        {rationale}
      </span>
    </motion.div>
  );
}

// ── Main overlay ───────────────────────────────────────────────────────────

export function SovereignInsightCube() {
  const { cubeOpen, insightPayload, closeCube } = useTrifecta();

  // ESC to close
  useEffect(() => {
    if (!cubeOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeCube(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cubeOpen, closeCube]);

  return (
    <AnimatePresence>
      {cubeOpen && insightPayload && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{    opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={closeCube}
            style={{
              position:   "fixed",
              inset:      0,
              zIndex:     19990,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* Cube */}
          <motion.div
            key="cube"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1    }}
            exit={{    opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position:      "fixed",
              inset:         0,
              zIndex:        19991,
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              justifyContent:"center",
              padding:       "40px 32px",
              pointerEvents: "none",
            }}
          >
            <div style={{
              width:       "100%",
              maxWidth:    860,
              pointerEvents: "auto",
              display:     "flex",
              flexDirection: "column",
              alignItems:  "center",
            }}>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1,  y: 0   }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ marginBottom: 20, textAlign: "center" }}
              >
                <div style={{
                  fontFamily:    "'Cormorant Garamond', serif",
                  fontSize:      32,
                  fontWeight:    300,
                  color:         "#F5F2ED",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  lineHeight:    1,
                  marginBottom:  6,
                }}>
                  Sovereign Insight
                </div>
                <div className="titan-telemetry" style={{ fontSize: 9, color: "rgba(212,175,55,0.55)" }}>
                  TRIFECTA PAIRING MATRIX · NOVEE OS
                </div>
              </motion.div>

              {/* Affinity bar */}
              <div style={{ width: "100%", maxWidth: 520, marginBottom: 8 }}>
                <AffinityBar score={insightPayload.affinityScore} />
              </div>

              {/* 3-panel row */}
              <div style={{ display: "flex", gap: 16, width: "100%", alignItems: "flex-start" }}>
                <InsightPanel
                  icon={<CigarIcon />}
                  subtitle="YOUR CRAFT"
                  label={insightPayload.craft.label}
                  rationale={insightPayload.craft.rationale}
                  delay={0.20}
                />
                <InsightPanel
                  icon={<GlassIcon />}
                  subtitle="SPIRIT PAIRING"
                  label={insightPayload.pour.label}
                  rationale={insightPayload.pour.rationale}
                  badge={insightPayload.pour.isReserve ? "RESERVE SELECTION" : undefined}
                  isFocal
                  delay={0.35}
                />
                <InsightPanel
                  icon={<PlateIcon />}
                  subtitle="PLATE PAIRING"
                  label={insightPayload.plate.label}
                  rationale={insightPayload.plate.rationale}
                  badge={insightPayload.plate.isChefSpecial ? "CHEF SPECIAL" : undefined}
                  delay={0.50}
                />
              </div>

              {/* Upsell note */}
              {insightPayload.upsell && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="titan-telemetry"
                  style={{
                    marginTop:  20,
                    fontSize:   9,
                    color:      "#D4AF37",
                    letterSpacing: "0.2em",
                  }}
                >
                  ✦ SOVEREIGN TIER — COMPLIMENTARY UPGRADE AVAILABLE AT THE BAR ✦
                </motion.div>
              )}

              {/* Close */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={closeCube}
                style={{
                  marginTop:     28,
                  background:    "transparent",
                  border:        "1px solid rgba(212,175,55,0.35)",
                  color:         "rgba(212,175,55,0.70)",
                  fontFamily:    "'Space Mono', monospace",
                  fontSize:      10,
                  letterSpacing: "0.2em",
                  padding:       "10px 32px",
                  borderRadius:  2,
                  cursor:        "pointer",
                  minHeight:     44,
                }}
              >
                DISMISS
              </motion.button>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
