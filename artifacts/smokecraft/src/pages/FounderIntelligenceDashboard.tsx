/**
 * FounderIntelligenceDashboard — Phase 6: Founder Intelligence.
 *
 * The god-view of hospitality intelligence. Accessible at /founder/intelligence.
 * Requires venue_id query param or defaults to first available venue.
 *
 * Panels:
 *   1. Live Floor Summary (active/VIP/handoff/Axiom lift)
 *   2. Emotional Heatmap (cinematic zone grid with temperature overlays)
 *   3. Opportunity Zones (ranked actions with severity)
 *   4. What-If Simulator (energy delta slider → projected lift)
 *   5. Environmental Mode Control
 *
 * No spreadsheets. No flat data. Everything is cinematic.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AtmosphereController from "@/components/AtmosphereController";

const DEMO_VENUE_ID = "00000000-0000-0000-0000-000000000001";

interface HeatZone {
  zoneId:           string;
  label:            string;
  x:                number;
  y:                number;
  engagementScore:  number;
  conversionScore:  number;
  emotionalTemp:    number;
  guestCount:       number;
  opportunityScore: number;
  trend:            string;
  topCraft:         string | null;
}

interface Opportunity {
  zoneId:          string;
  label:           string;
  opportunityType: string;
  currentScore:    number;
  potentialScore:  number;
  revenueLiftPct:  number;
  action:          string;
  priority:        string;
}

interface Overview {
  liveFloor:     { activeGuests: number; vipGuests: number; inHandoff: number };
  activeMode:    { mode: string; activatedAt: string; triggeredBy: string };
  heatmap:       { globalTemp: number; peakZone: string | null; coldZone: string | null };
  opportunities: { total: number; critical: number; high: number; topAction: string | null };
  axiomLift:     { conversionLift: number | null; engagementLift: number | null } | null;
}

interface Simulation {
  energyDelta:    number;
  modeSuggestion: string;
  projectedLift:  { revenue: number; engagement: number; conversion: number };
  narrative:      string;
  confidence:     number;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#E85D26", high: "#D48B00", medium: "#C4A96D", low: "#6B5E4E",
};

const TEMP_COLOR = (t: number) =>
  t > 75 ? "#E85D26" : t > 55 ? "#D48B00" : t > 35 ? "#C4A96D" : "#4A8FA8";

export default function FounderIntelligenceDashboard() {
  const venueId = new URLSearchParams(window.location.search).get("venue") ?? DEMO_VENUE_ID;

  const [overview,      setOverview]      = useState<Overview | null>(null);
  const [zones,         setZones]         = useState<HeatZone[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [simulation,    setSimulation]    = useState<Simulation | null>(null);
  const [energyDelta,   setEnergyDelta]   = useState(0);
  const [activeZone,    setActiveZone]    = useState<HeatZone | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [simLoading,    setSimLoading]    = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, hmRes, oppRes] = await Promise.all([
        fetch(`/api/founder/overview/${venueId}`),
        fetch(`/api/founder/heatmap/${venueId}`),
        fetch(`/api/founder/opportunities/${venueId}`),
      ]);
      if (ovRes.ok)  setOverview(await ovRes.json() as Overview);
      if (hmRes.ok)  { const d = await hmRes.json() as { zones: HeatZone[] }; setZones(d.zones); }
      if (oppRes.ok) { const d = await oppRes.json() as { opportunities: Opportunity[] }; setOpportunities(d.opportunities); }
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const runSimulation = useCallback(async (delta: number) => {
    setSimLoading(true);
    try {
      const res = await fetch(`/api/founder/simulate/${venueId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ energyDelta: delta }),
      });
      if (res.ok) setSimulation(await res.json() as Simulation);
    } finally { setSimLoading(false); }
  }, [venueId]);

  useEffect(() => {
    const t = setTimeout(() => runSimulation(energyDelta), 500);
    return () => clearTimeout(t);
  }, [energyDelta, runSimulation]);

  const liftColor = (v: number) => v > 0 ? "#7EC8A0" : v < 0 ? "#E85D26" : "#6B5E4E";

  return (
    <div style={{
      minHeight:  "100dvh",
      background: "#060504",
      color:      "#F5F2ED",
      fontFamily: "'Cormorant Garamond', serif",
      padding:    "28px 24px",
      overflowY:  "auto",
    }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <div style={{ fontSize: "9px", letterSpacing: "0.3em", color: "#D48B00", textTransform: "uppercase", marginBottom: "4px" }}>
            Axiom OS — Founder Intelligence Layer
          </div>
          <h1 style={{ fontSize: "30px", fontWeight: 600, margin: 0, color: "#F5F2ED" }}>
            God-View
          </h1>
          <div style={{ fontSize: "11px", color: "#6B5E4E", marginTop: "4px" }}>
            Emotional intelligence. Revenue orchestration. Invisible operations.
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <AtmosphereController venueId={venueId} compact />
          <button
            onClick={fetchAll}
            style={{
              background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.3)",
              color: "#D48B00", padding: "10px 18px", borderRadius: "20px",
              fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer",
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            Recalibrate
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ fontSize: "13px", color: "#D48B00", letterSpacing: "0.2em" }}>
            Calibrating Intelligence Layer…
          </motion.div>
        </div>
      ) : (
        <>
          {/* ── Live Floor KPIs ──────────────────────────────────────────── */}
          {overview && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Active Guests",    value: overview.liveFloor.activeGuests, color: "#F5F2ED"  },
                { label: "VIP Probability",  value: overview.liveFloor.vipGuests,    color: "#D4AF37"  },
                { label: "In Handoff",       value: overview.liveFloor.inHandoff,    color: "#7EC8A0"  },
                { label: "Critical Actions", value: overview.opportunities.critical,  color: "#E85D26"  },
              ].map(k => (
                <div key={k.label} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px", padding: "16px 18px",
                }}>
                  <motion.div
                    key={k.value}
                    initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    style={{ fontSize: "28px", fontWeight: 700, color: k.color, lineHeight: 1 }}
                  >
                    {k.value}
                  </motion.div>
                  <div style={{ fontSize: "9px", color: "#6B5E4E", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: "4px" }}>
                    {k.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Axiom Lift ───────────────────────────────────────────────── */}
          {overview?.axiomLift && (overview.axiomLift.conversionLift != null || overview.axiomLift.engagementLift != null) && (
            <div style={{
              background: "linear-gradient(135deg, rgba(212,139,0,0.08), rgba(212,175,55,0.04))",
              border: "1px solid rgba(212,139,0,0.2)", borderRadius: "12px",
              padding: "14px 20px", marginBottom: "24px",
              display: "flex", gap: "32px", alignItems: "center",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#D48B00", textTransform: "uppercase" }}>
                Axiom Lift vs. Unmanaged Baseline
              </div>
              {[
                { label: "Conversion", value: overview.axiomLift.conversionLift },
                { label: "Engagement", value: overview.axiomLift.engagementLift },
              ].map(l => l.value != null && (
                <div key={l.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: liftColor(l.value) }}>
                    {l.value > 0 ? "+" : ""}{Math.round(l.value)}%
                  </div>
                  <div style={{ fontSize: "9px", color: "#6B5E4E", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {l.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            {/* ── Emotional Heatmap ─────────────────────────────────────── */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "14px", padding: "20px",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#D48B00", textTransform: "uppercase", marginBottom: "16px" }}>
                Emotional Heatmap
              </div>
              <div style={{ position: "relative", height: 200, background: "rgba(0,0,0,0.3)", borderRadius: "10px", overflow: "hidden" }}>
                {zones.map(z => (
                  <motion.div
                    key={z.zoneId}
                    onClick={() => setActiveZone(activeZone?.zoneId === z.zoneId ? null : z)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      position:     "absolute",
                      left:         `${z.x}%`,
                      top:          `${z.y}%`,
                      transform:    "translate(-50%, -50%)",
                      width:        Math.max(28, z.engagementScore * 0.4),
                      height:       Math.max(28, z.engagementScore * 0.4),
                      borderRadius: "50%",
                      background:   `radial-gradient(circle, ${TEMP_COLOR(z.emotionalTemp)}55 0%, ${TEMP_COLOR(z.emotionalTemp)}22 60%, transparent 100%)`,
                      border:       `1px solid ${TEMP_COLOR(z.emotionalTemp)}44`,
                      cursor:       "pointer",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: "7px", color: TEMP_COLOR(z.emotionalTemp), fontWeight: 600 }}>
                      {z.emotionalTemp}
                    </span>
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {activeZone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    style={{
                      marginTop: "12px", background: "rgba(255,255,255,0.04)",
                      borderRadius: "8px", padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "13px", color: TEMP_COLOR(activeZone.emotionalTemp), marginBottom: "4px" }}>
                      {activeZone.label}
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      {[
                        { l: "Engagement", v: activeZone.engagementScore },
                        { l: "Conversion", v: activeZone.conversionScore },
                        { l: "Temp",       v: activeZone.emotionalTemp   },
                      ].map(s => (
                        <div key={s.l}>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: "#F5F2ED" }}>{s.v}</div>
                          <div style={{ fontSize: "8px", color: "#6B5E4E", letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Opportunity Zones ─────────────────────────────────────── */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "14px", padding: "20px", overflowY: "auto", maxHeight: 320,
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#D48B00", textTransform: "uppercase", marginBottom: "14px" }}>
                Opportunity Zones
              </div>
              {opportunities.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#6B5E4E" }}>All zones operating within range.</div>
              ) : opportunities.map((opp, i) => (
                <motion.div
                  key={opp.zoneId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    padding:      "10px 12px",
                    borderRadius: "8px",
                    background:   `${PRIORITY_COLOR[opp.priority]}0C`,
                    border:       `1px solid ${PRIORITY_COLOR[opp.priority]}22`,
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: PRIORITY_COLOR[opp.priority] }}>
                      {opp.label}
                    </span>
                    <span style={{ fontSize: "9px", color: "#7EC8A0" }}>
                      +{opp.revenueLiftPct}% revenue potential
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#8A7560", lineHeight: 1.4 }}>{opp.action}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── What-If Simulator ─────────────────────────────────────────── */}
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px", padding: "24px",
          }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#D48B00", textTransform: "uppercase", marginBottom: "6px" }}>
              What-If Simulator
            </div>
            <div style={{ fontSize: "12px", color: "#6B5E4E", marginBottom: "20px" }}>
              Drag to simulate venue energy shifts before executing.
            </div>

            {/* Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <span style={{ fontSize: "11px", color: "#6B5E4E", width: "80px" }}>De-escalate</span>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="range" min={-50} max={50} value={energyDelta}
                  onChange={e => setEnergyDelta(parseInt(e.target.value, 10))}
                  style={{
                    width: "100%", cursor: "pointer",
                    accentColor: energyDelta > 0 ? "#D48B00" : energyDelta < 0 ? "#4A8FA8" : "#6B5E4E",
                  }}
                />
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
                  fontSize: "10px", color: "#D48B00", fontWeight: 600,
                }}>
                  {energyDelta > 0 ? `+${energyDelta}` : energyDelta}
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "#6B5E4E", width: "80px", textAlign: "right" }}>Amplify</span>
            </div>

            {/* Simulation result */}
            <AnimatePresence mode="wait">
              {simulation && (
                <motion.div
                  key={`sim-${simulation.energyDelta}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: "16px" }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "14px" }}>
                    {[
                      { label: "Revenue",    value: simulation.projectedLift.revenue     },
                      { label: "Engagement", value: simulation.projectedLift.engagement  },
                      { label: "Conversion", value: simulation.projectedLift.conversion  },
                    ].map(l => (
                      <div key={l.label} style={{
                        background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px",
                        textAlign: "center",
                      }}>
                        <div style={{ fontSize: "22px", fontWeight: 700, color: liftColor(l.value) }}>
                          {l.value > 0 ? "+" : ""}{l.value}%
                        </div>
                        <div style={{ fontSize: "9px", color: "#6B5E4E", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>
                          {l.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    fontSize: "12px", color: "#8A7560", lineHeight: 1.6,
                    padding: "12px 14px", background: "rgba(255,255,255,0.02)",
                    borderRadius: "8px", borderLeft: "2px solid rgba(212,139,0,0.3)",
                  }}>
                    {simulation.narrative}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                    <span style={{ fontSize: "10px", color: "#4A8FA8" }}>
                      Suggested mode: <strong>{simulation.modeSuggestion.replace("_", " ")}</strong>
                    </span>
                    <span style={{ fontSize: "10px", color: "#6B5E4E" }}>
                      Confidence: {simulation.confidence}%
                    </span>
                  </div>
                </motion.div>
              )}
              {simLoading && (
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: "11px", color: "#D48B00", textAlign: "center", padding: "20px" }}>
                  Calculating projection…
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
