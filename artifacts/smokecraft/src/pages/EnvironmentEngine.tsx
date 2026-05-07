/**
 * EnvironmentEngine — /environment control panel.
 *
 * 4 tabs:
 *   Energy State   — 8-card energy state selector
 *   Event Mode     — 6 event atmosphere tiles
 *   Controls       — manual sliders + mentor personality
 *   Analytics      — engagement metrics from /api/environment/analytics
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import {
  environmentEngine,
  ENERGY_STATE_CONFIG,
  EVENT_ATMOSPHERE_CONFIG,
  type EnergyState,
  type EventAtmosphere,
  type MentorPersonality,
} from "@/lib/environmentEngine";
import { useVenueContext } from "@/contexts/VenueContext";

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ["Energy State", "Event Mode", "Controls", "Analytics"] as const;
type Tab = typeof TABS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "rgba(26,26,27,0.68)", fontSize: 13, letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ color: "#D48B00", fontSize: 13, fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#D48B00",
          cursor: "pointer",
          height: 4,
        }}
      />
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", marginBottom: 10,
        background: value ? "rgba(212,139,0,0.08)" : "rgba(26,26,27,0.05)",
        border: `1px solid ${value ? "rgba(212,139,0,0.3)" : "rgba(26,26,27,0.08)"}`,
        borderRadius: 10, cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      <div>
        <div style={{ color: "rgba(26,26,27,0.88)", fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ color: "rgba(26,26,27,0.40)", fontSize: 12, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{
        width: 40, height: 22,
        background: value ? "#D48B00" : "rgba(26,26,27,0.14)",
        borderRadius: 11,
        position: "relative",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}>
        <motion.div
          animate={{ x: value ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            position: "absolute", top: 2, width: 18, height: 18,
            background: "#1A1A1B", borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EnvironmentEnginePage() {
  const [, navigate]  = useLocation();
  const { env }       = useEnvironment();
  const { getBackground } = useVenueContext();
  const bgImg = getBackground("settings");

  const [tab, setTab]                     = useState<Tab>("Energy State");
  const [analytics, setAnalytics]         = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [vipFlash, setVipFlash]           = useState(false);
  const [resetFlash, setResetFlash]       = useState(false);

  // Local slider state (applied on commit)
  const [localIntensity, setLocalIntensity]  = useState(Math.round(env.glowStrength * 100));
  const [localParticles, setLocalParticles]  = useState(Math.round(env.particleDensity * 100));
  const [localMotion,    setLocalMotion]     = useState(env.motionCalmness);
  const [localWarmth,    setLocalWarmth]     = useState(Math.round(env.warmthTint * 100));
  const [localAutoTime,  setLocalAutoTime]   = useState(env.automationEnabled);
  const [localAutoVip,   setLocalAutoVip]    = useState(true);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleEnergyState = useCallback((state: EnergyState) => {
    environmentEngine.setEnergyState(state);
  }, []);

  const handleEventAtmosphere = useCallback((atm: EventAtmosphere) => {
    environmentEngine.setEventAtmosphere(atm);
  }, []);

  const handleMentor = useCallback((p: MentorPersonality) => {
    environmentEngine.setMentorPersonality(p);
  }, []);

  const handleVipArrival = () => {
    environmentEngine.triggerVipArrival();
    setVipFlash(true);
    setTimeout(() => setVipFlash(false), 3500);
  };

  const handleReset = () => {
    environmentEngine.clearSession();
    setLocalIntensity(50);
    setLocalParticles(65);
    setLocalMotion(55);
    setLocalWarmth(14);
    setLocalAutoTime(true);
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 1200);
  };

  const handleApplyControls = () => {
    environmentEngine.applyControlSettings({
      atmosphereIntensity: localIntensity,
      particleDensity:     localParticles,
      motionCalmness:      localMotion,
      revealPacing:        70,
      soundVolume:         env.soundVolume,
      performanceMode:     env.performanceMode,
    });
    environmentEngine.setAutomation(localAutoTime);
  };

  const handleLoadAnalytics = async () => {
    if (analytics) { setTab("Analytics"); return; }
    setAnalyticsLoading(true);
    setTab("Analytics");
    try {
      const token = localStorage.getItem("axiom_jwt");
      const r = await fetch("/api/environment/analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) setAnalytics(await r.json());
    } catch { /* ignore */ }
    finally { setAnalyticsLoading(false); }
  };

  // ── Time-of-day label ────────────────────────────────────────────────────────

  const hour = new Date().getHours();
  const timeLabel =
    hour >= 6  && hour < 12 ? "Morning"    :
    hour >= 12 && hour < 17 ? "Afternoon"  :
    hour >= 17 && hour < 21 ? "Evening"    :
    hour >= 21              ? "Late Night" : "Early Morning";

  // ── Styles ───────────────────────────────────────────────────────────────────


  return (
    <div style={{
      minHeight: "100dvh",
      background: "#F5F2ED",
      color: "rgba(26,26,27,0.90)",
      fontFamily: "'Cormorant Garamond', serif",
      position: "relative",
      overflowX: "hidden",
    }}>
      {/* Faint venue bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url('${bgImg}')`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.06,
      }} />

      {/* Top gold rule */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,139,0,0.6) 30%,rgba(212,139,0,0.9) 50%,rgba(212,139,0,0.6) 70%,transparent)", zIndex: 10 }} />

      {/* ── Header ── */}
      <div style={{ position: "relative", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px 0" }}>
          <button
            onClick={() => navigate("/command")}
            style={{
              background: "rgba(26,26,27,0.08)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(26,26,27,0.72)", padding: "7px 14px", borderRadius: 8,
              cursor: "pointer", fontSize: 12, letterSpacing: "0.08em",
            }}
          >
            ← BACK
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(18px,4vw,26px)", fontWeight: 500, letterSpacing: "0.06em", color: "#D48B00" }}>
              Environmental Reaction Engine
            </h1>
            <div style={{ fontSize: 12, color: "rgba(26,26,27,0.40)", marginTop: 2, letterSpacing: "0.1em" }}>
              AXIOM OS · ATMOSPHERE INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Live status strip */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap",
          padding: "14px 24px 0", alignItems: "center",
        }}>
          {/* Current energy state */}
          <div style={{
            padding: "6px 14px",
            background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.3)",
            borderRadius: 20, fontSize: 12, color: "#D48B00", letterSpacing: "0.08em",
          }}>
            {ENERGY_STATE_CONFIG[env.energyState].icon} {ENERGY_STATE_CONFIG[env.energyState].label}
          </div>
          {/* Event badge */}
          {env.eventAtmosphere !== "none" && (
            <div style={{
              padding: "6px 14px",
              background: `${EVENT_ATMOSPHERE_CONFIG[env.eventAtmosphere].color}22`,
              border: `1px solid ${EVENT_ATMOSPHERE_CONFIG[env.eventAtmosphere].color}55`,
              borderRadius: 20, fontSize: 12, letterSpacing: "0.08em",
              color: EVENT_ATMOSPHERE_CONFIG[env.eventAtmosphere].color,
            }}>
              ◈ {EVENT_ATMOSPHERE_CONFIG[env.eventAtmosphere].label}
            </div>
          )}
          {/* Time of day */}
          <div style={{
            padding: "6px 14px",
            background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)",
            borderRadius: 20, fontSize: 12, color: "rgba(26,26,27,0.50)", letterSpacing: "0.08em",
          }}>
            ◷ {timeLabel}
          </div>
          {/* Automation */}
          <div style={{
            padding: "6px 14px",
            background: env.automationEnabled ? "rgba(34,197,94,0.1)" : "rgba(26,26,27,0.06)",
            border: `1px solid ${env.automationEnabled ? "rgba(34,197,94,0.3)" : "rgba(26,26,27,0.10)"}`,
            borderRadius: 20, fontSize: 12, letterSpacing: "0.08em",
            color: env.automationEnabled ? "#4ade80" : "rgba(26,26,27,0.40)",
          }}>
            {env.automationEnabled ? "● AUTO" : "○ MANUAL"}
          </div>
          {/* VIP trigger */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleVipArrival}
            style={{
              padding: "6px 16px", marginLeft: "auto",
              background: vipFlash ? "rgba(212,139,0,0.25)" : "rgba(212,139,0,0.08)",
              border: `1px solid ${vipFlash ? "rgba(212,139,0,0.6)" : "rgba(212,139,0,0.25)"}`,
              borderRadius: 20, cursor: "pointer", fontSize: 12,
              color: "#D48B00", letterSpacing: "0.08em",
              transition: "all 0.3s ease",
            }}
          >
            {vipFlash ? "★ VIP ACTIVE" : "★ VIP ARRIVAL"}
          </motion.button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, padding: "18px 24px 0", borderBottom: "1px solid rgba(26,26,27,0.08)" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => t === "Analytics" ? handleLoadAnalytics() : setTab(t)}
              style={{
                padding: "10px 20px", background: "none",
                border: "none", cursor: "pointer", fontSize: 13,
                letterSpacing: "0.06em", fontFamily: "inherit",
                color: tab === t ? "#D48B00" : "rgba(26,26,27,0.44)",
                borderBottom: tab === t ? "2px solid #D48B00" : "2px solid transparent",
                transition: "all 0.18s ease",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div style={{ position: "relative", zIndex: 5, padding: "24px 24px 80px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >

            {/* ── Energy State tab ── */}
            {tab === "Energy State" && (
              <div>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(26,26,27,0.44)", letterSpacing: "0.06em" }}>
                  Select the current lounge energy state. The venue reacts immediately.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
                  {(Object.keys(ENERGY_STATE_CONFIG) as EnergyState[]).map(key => {
                    const cfg     = ENERGY_STATE_CONFIG[key];
                    const active  = env.energyState === key;
                    return (
                      <motion.div
                        key={key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleEnergyState(key)}
                        style={{
                          padding: "18px 20px", borderRadius: 12,
                          background: active ? "rgba(212,139,0,0.12)" : "rgba(26,26,27,0.05)",
                          border: `1px solid ${active ? "rgba(212,139,0,0.45)" : "rgba(26,26,27,0.09)"}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: active ? "0 0 18px rgba(212,139,0,0.1)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 22, opacity: active ? 1 : 0.6 }}>{cfg.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#D48B00" : "rgba(26,26,27,0.82)", letterSpacing: "0.04em" }}>{cfg.label}</span>
                          {active && <span style={{ marginLeft: "auto", fontSize: 10, color: "#D48B00", letterSpacing: "0.1em" }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(26,26,27,0.40)", lineHeight: 1.5, marginBottom: 12 }}>{cfg.description}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Meter label="Glow"    value={cfg.glowMult * 100} />
                          <Meter label="Density" value={cfg.particleMult * 100} />
                          <Meter label="Pace"    value={cfg.motionCalmness} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Event Mode tab ── */}
            {tab === "Event Mode" && (
              <div>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(26,26,27,0.44)", letterSpacing: "0.06em" }}>
                  Activate a curated event atmosphere. Overrides lighting mood for the duration.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                  {(Object.keys(EVENT_ATMOSPHERE_CONFIG) as EventAtmosphere[]).map(key => {
                    const cfg    = EVENT_ATMOSPHERE_CONFIG[key];
                    const active = env.eventAtmosphere === key;
                    return (
                      <motion.div
                        key={key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleEventAtmosphere(key)}
                        style={{
                          padding: "20px 22px", borderRadius: 12, cursor: "pointer",
                          background: active ? `${cfg.color}18` : "rgba(26,26,27,0.05)",
                          border: `1px solid ${active ? cfg.color + "66" : "rgba(26,26,27,0.09)"}`,
                          transition: "all 0.22s ease",
                          boxShadow: active ? `0 0 20px ${cfg.color}22` : "none",
                          position: "relative", overflow: "hidden",
                        }}
                      >
                        {active && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 2,
                            background: cfg.color, opacity: 0.8,
                          }} />
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: active ? cfg.color : "rgba(26,26,27,0.82)", letterSpacing: "0.04em" }}>
                            {cfg.label}
                          </span>
                          {active && <span style={{ fontSize: 10, color: cfg.color, letterSpacing: "0.1em" }}>ACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(26,26,27,0.44)", lineHeight: 1.5 }}>{cfg.description}</div>
                        {cfg.lightingMoodBias && (
                          <div style={{ marginTop: 10, fontSize: 11, color: cfg.color, opacity: 0.7, letterSpacing: "0.06em" }}>
                            Lighting bias: {cfg.lightingMoodBias.replace("_", " ")}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Controls tab ── */}
            {tab === "Controls" && (
              <div style={{ maxWidth: 580 }}>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(26,26,27,0.44)", letterSpacing: "0.06em" }}>
                  Manual overrides applied on top of energy state defaults.
                </p>

                <Section title="Atmosphere">
                  <Slider label="Glow Intensity"   value={localIntensity}  onChange={setLocalIntensity} />
                  <Slider label="Warmth Tint"       value={localWarmth}    onChange={setLocalWarmth} />
                  <Slider label="Particle Density"  value={localParticles} onChange={setLocalParticles} />
                  <Slider label="Motion Calmness"   value={localMotion}    onChange={setLocalMotion} unit=" / 100" />
                </Section>

                <Section title="Mentor Personality">
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["bold", "smooth", "balanced"] as MentorPersonality[]).map(p => (
                      <motion.button
                        key={p}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleMentor(p)}
                        style={{
                          flex: 1, padding: "12px 0", borderRadius: 10,
                          background: env.mentorPersonality === p ? "rgba(212,139,0,0.15)" : "rgba(26,26,27,0.06)",
                          border: `1px solid ${env.mentorPersonality === p ? "rgba(212,139,0,0.45)" : "rgba(26,26,27,0.10)"}`,
                          color: env.mentorPersonality === p ? "#D48B00" : "rgba(26,26,27,0.52)",
                          fontSize: 13, cursor: "pointer", letterSpacing: "0.06em",
                          fontFamily: "inherit", textTransform: "capitalize",
                          transition: "all 0.18s ease",
                        }}
                      >
                        {p.toUpperCase()}
                      </motion.button>
                    ))}
                  </div>
                </Section>

                <Section title="Automation">
                  <Toggle label="Auto Time-of-Day"    desc="Adjusts atmosphere based on hour of day"    value={localAutoTime} onChange={setLocalAutoTime} />
                  <Toggle label="Auto VIP Detection"  desc="Elevates energy state on VIP guest arrival" value={localAutoVip}  onChange={setLocalAutoVip} />
                </Section>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleApplyControls}
                  style={{
                    width: "100%", padding: "14px 0", borderRadius: 10, marginTop: 8,
                    background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.4)",
                    color: "#D48B00", fontSize: 14, cursor: "pointer", letterSpacing: "0.08em",
                    fontFamily: "inherit", fontWeight: 600,
                  }}
                >
                  APPLY CONTROLS
                </motion.button>
              </div>
            )}

            {/* ── Analytics tab ── */}
            {tab === "Analytics" && (
              <div>
                {analyticsLoading && (
                  <div style={{ color: "rgba(26,26,27,0.40)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading...</div>
                )}
                {analytics && !analyticsLoading && (() => {
                  const a = analytics as {
                    energyStateDistribution: Record<string, number>;
                    avgLingerMinutes:        Record<string, number>;
                    eventAtmosphereRoi:      Record<string, { engagementLift: string; avgOrderValue: string }>;
                    vipArrivalResponses:     number;
                    automationUptime:        string;
                  };
                  return (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                        <StatCard label="VIP Arrivals Tracked" value={String(a.vipArrivalResponses)} />
                        <StatCard label="Automation Uptime"    value={a.automationUptime} />
                      </div>
                      <Section title="Energy State Distribution">
                        {Object.entries(a.energyStateDistribution).map(([k, v]) => (
                          <div key={k} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "rgba(26,26,27,0.62)" }}>
                              <span>{ENERGY_STATE_CONFIG[k as EnergyState]?.label ?? k}</span>
                              <span style={{ color: "#D48B00" }}>{v}%</span>
                            </div>
                            <div style={{ height: 4, background: "rgba(26,26,27,0.08)", borderRadius: 2 }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${v}%` }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                style={{ height: "100%", background: "#D48B00", borderRadius: 2 }}
                              />
                            </div>
                          </div>
                        ))}
                      </Section>
                      <Section title="Event Atmosphere ROI">
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                          {Object.entries(a.eventAtmosphereRoi).map(([k, v]) => (
                            <div key={k} style={{ padding: "14px 16px", background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", borderRadius: 10 }}>
                              <div style={{ fontSize: 12, color: "rgba(26,26,27,0.50)", marginBottom: 6 }}>{EVENT_ATMOSPHERE_CONFIG[k as EventAtmosphere]?.label ?? k}</div>
                              <div style={{ fontSize: 14, color: "#4ade80", fontWeight: 600 }}>{v.engagementLift} engagement</div>
                              <div style={{ fontSize: 13, color: "#D48B00" }}>{v.avgOrderValue} avg order</div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    </div>
                  );
                })()}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Emergency Reset ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "12px 24px", background: "rgba(6,4,10,0.94)", borderTop: "1px solid rgba(26,26,27,0.08)", display: "flex", justifyContent: "flex-end" }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleReset}
          style={{
            padding: "10px 22px", borderRadius: 8, cursor: "pointer",
            background: resetFlash ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${resetFlash ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.25)"}`,
            color: "#f87171", fontSize: 12, letterSpacing: "0.1em", fontFamily: "inherit",
            transition: "all 0.3s ease",
          }}
        >
          {resetFlash ? "✓ RESET COMPLETE" : "⚠ EMERGENCY RESET"}
        </motion.button>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, color: "rgba(212,139,0,0.6)", letterSpacing: "0.15em", marginBottom: 14, textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", letterSpacing: "0.05em" }}>{label}</span>
      <div style={{ width: 36, height: 3, background: "rgba(26,26,27,0.10)", borderRadius: 2 }}>
        <div style={{ width: `${Math.round(value)}%`, height: "100%", background: "#D48B00", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "18px 20px", background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", letterSpacing: "0.1em", marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 24, color: "#D48B00", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
