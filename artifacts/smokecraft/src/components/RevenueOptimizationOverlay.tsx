/**
 * RevenueOptimizationOverlay — Staff-only floating revenue intelligence panel.
 * Visible only when: sessionType === "live" AND localStorage has novee_staff_pin.
 * Polls sessionStorage checkpoint every 2 seconds for real-time pairing path updates.
 * Collapsible, bottom-right corner, minimal footprint.
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD  = "#D4AF37";
const AMBER = "#C8860A";

interface SessionSnapshot {
  visitPairings:  number;
  sessionType:    string;
  phase:          string;
  wrapper:        string | null;
  blendCountry1:  string | null;
  blendCountry2:  string | null;
  flavorProfile:  string[];
  merit:          number;
  pairingHistory: Array<{ cigar: string; drink: string | null; food: string | null; xp: number }>;
}

function readSnapshot(): SessionSnapshot {
  const empty: SessionSnapshot = {
    visitPairings: 0, sessionType: "live", phase: "",
    wrapper: null, blendCountry1: null, blendCountry2: null,
    flavorProfile: [], merit: 0, pairingHistory: [],
  };
  try {
    const raw = sessionStorage.getItem("novee_session_checkpoint");
    if (!raw) return empty;
    const p = JSON.parse(raw);
    const profile = p.profile ?? {};
    return {
      visitPairings:  profile.visitPairings  ?? 0,
      sessionType:    profile.sessionType    ?? "live",
      phase:          p.phase                ?? "",
      wrapper:        profile.wrapper        ?? null,
      blendCountry1:  profile.blendCountry1  ?? null,
      blendCountry2:  profile.blendCountry2  ?? null,
      flavorProfile:  profile.flavorProfile  ?? [],
      merit:          profile.merit          ?? 0,
      pairingHistory: profile.pairingHistory ?? [],
    };
  } catch { return empty; }
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    crafthub: "Craft Hub", s1_country_select: "Country Selection",
    s1_soil_calibration: "Soil Calibration", s1_pilon_game: "Pilon Game",
    s1_quiz: "Mentor Quiz", s2_terroir: "Alchemist — The Craft",
    s3_leafsliders: "Architect — The Ritual", s4_vitola: "Vitola Selection",
    s4_designstudio: "Design Studio", s4_results: "Golden Box Reveal",
  };
  return map[phase] ?? phase.replace(/_/g, " ").toUpperCase();
}

function getUpsellText(snap: SessionSnapshot): string {
  const { visitPairings, flavorProfile, wrapper, blendCountry1, pairingHistory, phase } = snap;

  if (phase.startsWith("s1")) return "Guest in orientation — pre-stage premium pairing card at table.";

  if (visitPairings === 0) {
    if (flavorProfile.includes("Spice") || blendCountry1 === "nicaragua")
      return "Spicy-profile blend detected — recommend High Rye Bourbon or Aged Dark Rum for harmonic pairing.";
    if (flavorProfile.includes("Cocoa") || wrapper === "maduro")
      return "Maduro/cocoa notes — recommend VSOP Cognac or Imperial Stout pairing.";
    if (flavorProfile.includes("Cedar") || blendCountry1 === "dominican_republic")
      return "Cedar-forward Dominican blend — recommend Islay Single Malt or Cabernet Sauvignon.";
    return "Guest has not selected a pairing yet — present drink menu and suggest top-shelf option.";
  }

  if (visitPairings === 1) {
    const hadFood = pairingHistory.some(p => p.food !== null);
    if (!hadFood) return "First pairing complete, no food selected — suggest dark chocolate or aged cheese to extend dwell time.";
    return "One pairing complete with food. Suggest second pairing variation — different spirit category for contrast.";
  }

  return "Both pairings complete. Guest approaching Legacy phase — ensure bill is staged. Upsell branded takeaway.";
}

function getPhaseRevenue(snap: SessionSnapshot): number {
  const base   = 35;
  const drinks = snap.visitPairings * 28;
  const food   = snap.pairingHistory.filter(p => p.food).length * 18;
  const merit  = Math.floor(snap.merit / 20) * 5;
  return base + drinks + food + merit;
}

export const RevenueOptimizationOverlay: React.FC = () => {
  const [isStaff,     setIsStaff]     = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [snap,        setSnap]        = useState<SessionSnapshot>(readSnapshot);

  useEffect(() => {
    const check = () => setIsStaff(!!localStorage.getItem("novee_staff_pin"));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSnap(readSnapshot()), 2000);
    return () => clearInterval(id);
  }, []);

  if (!isStaff || snap.sessionType !== "live") return null;

  const estRevenue = getPhaseRevenue(snap);
  const upsell     = getUpsellText(snap);
  const pairLabel  = snap.visitPairings === 0 ? "NO PAIRINGS YET"
    : snap.visitPairings === 1 ? "1 PAIRING MADE" : "2 PAIRINGS COMPLETE";

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, fontFamily: "'Inter', monospace", userSelect: "none" }}>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              background: "rgba(6,6,6,0.97)",
              border: `1px solid ${AMBER}`,
              borderRadius: 10, padding: "16px 18px", width: 296,
              boxShadow: `0 12px 36px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,134,10,0.12)`,
              color: AMBER, marginBottom: 8,
            }}
          >
            {/* Header */}
            <div style={{ fontSize: 9, letterSpacing: "0.3em", opacity: 0.55, marginBottom: 12, fontWeight: 800, textTransform: "uppercase" }}>
              STAFF REVENUE INTEL · LIVE
            </div>

            {/* Revenue figure */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: "0.2em", marginBottom: 2 }}>EST. SESSION SPEND</div>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: GOLD }}>${estRevenue}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: "0.1em", marginBottom: 2 }}>MERIT</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{snap.merit}</div>
              </div>
            </div>

            {/* Phase bar */}
            <div style={{ background: "rgba(200,134,10,0.08)", borderRadius: 6, padding: "8px 10px", marginBottom: 10, border: "1px solid rgba(200,134,10,0.15)" }}>
              <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.15em", marginBottom: 3 }}>CURRENT PHASE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F0E8D4" }}>{phaseLabel(snap.phase)}</div>
            </div>

            {/* Pairing status */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[0, 1].map(i => (
                <div key={i} style={{
                  flex: 1, padding: "7px 10px", borderRadius: 6, textAlign: "center",
                  background: snap.visitPairings > i ? `${GOLD}22` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${snap.visitPairings > i ? GOLD : "rgba(255,255,255,0.08)"}`,
                }}>
                  <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 2 }}>PAIRING {i + 1}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: snap.visitPairings > i ? GOLD : "rgba(255,255,255,0.2)" }}>
                    {snap.visitPairings > i ? (snap.pairingHistory[i]?.drink ?? "DONE") : "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Blend profile */}
            {snap.flavorProfile.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.15em", marginBottom: 4 }}>BLEND FLAVOR PROFILE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {snap.flavorProfile.slice(0, 6).map(n => (
                    <span key={n} style={{ fontSize: 9, padding: "3px 7px", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 3, color: GOLD, fontWeight: 700 }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Upsell recommendation */}
            <div style={{ borderTop: `1px solid rgba(200,134,10,0.15)`, paddingTop: 10 }}>
              <div style={{ fontSize: 9, opacity: 0.55, letterSpacing: "0.2em", marginBottom: 5 }}>RECOMMENDED ACTION</div>
              <div style={{ fontSize: 11, lineHeight: 1.55, color: "#F0E8D4cc" }}>{upsell}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCollapsed(v => !v)}
        style={{
          background: isCollapsed ? AMBER : "rgba(200,134,10,0.3)", color: isCollapsed ? "#000" : AMBER,
          border: isCollapsed ? "none" : `1px solid ${AMBER}`,
          borderRadius: 20, padding: "7px 16px", fontSize: 10, fontWeight: 900,
          cursor: "pointer", width: "100%", letterSpacing: "0.15em",
          boxShadow: isCollapsed ? `0 4px 14px rgba(200,134,10,0.35)` : "none",
          transition: "all 0.2s",
        }}
      >
        {isCollapsed ? "STAFF INTEL" : "CLOSE PANEL"}
      </motion.button>
    </div>
  );
};
