/**
 * ExperienceControlPanel — /admin/experience-control
 *
 * Venue-owner admin page for tuning the immersive experience without code edits.
 * Settings are stored in DB and applied to EnvironmentEngine at runtime.
 *
 * Tabs:   Global | SmokeCraft | PourCraft | BrewCraft | VapeCraft
 * Left:   Six sliders + performance mode selector
 * Right:  Live preview panel (glow, particles, motion, sound, mode badge)
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Zap, Wind, Droplets, Flame, Waves, Volume2, Cpu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchExperienceControl,
  upsertExperienceControl,
  DEFAULT_SETTINGS,
  type ExperienceControlRow,
  type ExperienceControlData,
  type PerformanceMode,
  type ExperienceCraftType,
  type VenueMode,
} from "@/services/experienceControl";
import { environmentEngine } from "@/lib/environmentEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = "global" | ExperienceCraftType;

interface PanelSettings {
  atmosphereIntensity: number;
  particleDensity:     number;
  motionCalmness:      number;
  revealPacing:        number;
  soundVolume:         number;
  performanceMode:     PerformanceMode;
  venueMode:           VenueMode | null;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode; craft?: ExperienceCraftType }[] = [
  { key: "global", label: "Global",     icon: <Zap size={14} /> },
  { key: "smoke",  label: "SmokeCraft", icon: <Flame size={14} />,    craft: "smoke" },
  { key: "pour",   label: "PourCraft",  icon: <Droplets size={14} />, craft: "pour"  },
  { key: "brew",   label: "BrewCraft",  icon: <Waves size={14} />,    craft: "brew"  },
  { key: "vape",   label: "VapeCraft",  icon: <Wind size={14} />,     craft: "vape"  },
];

const GOLD  = "#D48B00";
const DARK  = "#F5F2ED";

function rowToSettings(row: ExperienceControlRow | null): PanelSettings {
  if (!row) return { ...DEFAULT_SETTINGS, venueMode: null };
  return {
    atmosphereIntensity: row.atmosphereIntensity,
    particleDensity:     row.particleDensity,
    motionCalmness:      row.motionCalmness,
    revealPacing:        row.revealPacing,
    soundVolume:         row.soundVolume,
    performanceMode:     row.performanceMode,
    venueMode:           row.venueMode,
  };
}

// ── Slider component ──────────────────────────────────────────────────────────

function Slider({
  label, hint, value, onChange, icon,
}: {
  label: string; hint: string; value: number;
  onChange: (v: number) => void; icon: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: GOLD, opacity: 0.7 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1B", letterSpacing: "0.04em" }}>{label}</span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: GOLD,
          minWidth: 36, textAlign: "right",
        }}>{value}</span>
      </div>
      <p style={{ fontSize: 11, color: "rgba(26,26,27,0.38)", margin: "0 0 8px" }}>{hint}</p>
      <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 4,
          background: "rgba(26,26,27,0.08)",
          borderRadius: 2,
        }} />
        <div style={{
          position: "absolute", left: 0, height: 4,
          width: `${value}%`,
          background: `linear-gradient(90deg, ${GOLD}55, ${GOLD})`,
          borderRadius: 2,
          transition: "width 0.12s ease",
        }} />
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position:   "absolute", left: 0, right: 0,
            width:      "100%", height: 36,
            opacity:    0, cursor: "pointer", margin: 0,
          }}
        />
        <div style={{
          position:     "absolute",
          left:         `calc(${value}% - 8px)`,
          width:        16, height: 16,
          borderRadius: "50%",
          background:   GOLD,
          boxShadow:    `0 0 8px ${GOLD}80`,
          transition:   "left 0.12s ease",
          pointerEvents:"none",
        }} />
      </div>
    </div>
  );
}

// ── Performance mode selector ─────────────────────────────────────────────────

function PerfModeSelector({
  value, onChange,
}: { value: PerformanceMode; onChange: (v: PerformanceMode) => void }) {
  const modes: { key: PerformanceMode; label: string; desc: string }[] = [
    { key: "cinematic",  label: "Cinematic",  desc: "Full atmosphere" },
    { key: "balanced",   label: "Balanced",   desc: "Default"         },
    { key: "low-power",  label: "Low-Power",  desc: "Kiosk-friendly"  },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Cpu size={14} style={{ color: GOLD, opacity: 0.7 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1B", letterSpacing: "0.04em" }}>Performance Mode</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            style={{
              flex: 1, padding: "10px 0",
              borderRadius: 10,
              border: value === m.key
                ? `1px solid ${GOLD}60`
                : "1px solid rgba(26,26,27,0.09)",
              background: value === m.key
                ? `${GOLD}12`
                : "rgba(26,26,27,0.05)",
              color: value === m.key ? GOLD : "rgba(26,26,27,0.48)",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Venue Mode selector ───────────────────────────────────────────────────────

const VENUE_MODE_OPTIONS: { key: VenueMode; label: string; desc: string }[] = [
  { key: "lounge",    label: "Lounge",    desc: "Relaxed, ambient"    },
  { key: "nightlife", label: "Nightlife", desc: "High energy"         },
  { key: "premium",   label: "Premium",   desc: "Luxury, slow-burn"   },
  { key: "social",    label: "Social",    desc: "Casual, fun"         },
  { key: "calm",      label: "Calm",      desc: "Minimal, quiet"      },
  { key: "event",     label: "Event",     desc: "Special occasion"    },
];

function VenueModeSelector({
  value, onChange,
}: { value: VenueMode | null; onChange: (v: VenueMode | null) => void }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Zap size={14} style={{ color: GOLD, opacity: 0.7 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1B", letterSpacing: "0.04em" }}>Venue Mode</span>
        <span style={{ fontSize: 10, color: "rgba(26,26,27,0.35)", marginLeft: 4 }}>shapes orchestrator defaults</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {VENUE_MODE_OPTIONS.map(m => (
          <button
            key={m.key}
            onClick={() => onChange(value === m.key ? null : m.key)}
            style={{
              padding: "9px 6px",
              borderRadius: 9,
              border: value === m.key
                ? `1px solid ${GOLD}60`
                : "1px solid rgba(26,26,27,0.09)",
              background: value === m.key
                ? `${GOLD}12`
                : "rgba(26,26,27,0.05)",
              color: value === m.key ? GOLD : "rgba(26,26,27,0.48)",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.18s ease",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
            <div style={{ fontSize: 9, opacity: 0.55, marginTop: 1 }}>{m.desc}</div>
          </button>
        ))}
      </div>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{
            marginTop: 6, width: "100%", padding: "5px",
            background: "none", border: "none",
            color: "rgba(26,26,27,0.30)", fontSize: 11, cursor: "pointer",
          }}
        >
          Clear (inherit global)
        </button>
      )}
    </div>
  );
}

// ── Live preview panel ────────────────────────────────────────────────────────

function LivePreview({ settings }: { settings: PanelSettings }) {
  const glowOpacity  = settings.atmosphereIntensity / 100 * 0.7;
  const particleSize = 3 + settings.particleDensity / 100 * 6;
  const particleCount = Math.max(2, Math.round(settings.particleDensity / 100 * 8));
  const motionDur    = 1.5 + (settings.motionCalmness / 100) * 3.5; // 1.5s fast → 5s calm
  const revealScale  = 0.92 + (settings.revealPacing / 100) * 0.08;
  const volPct       = settings.soundVolume;

  const perfColor: Record<PerformanceMode, string> = {
    cinematic:  "#D48B00",
    balanced:   "#5b9cf6",
    "low-power": "#6ee7b7",
  };

  return (
    <div style={{
      background:    "rgba(26,26,27,0.04)",
      border:        "1px solid rgba(26,26,27,0.09)",
      borderRadius:  16,
      padding:       "22px 20px",
      display:       "flex",
      flexDirection: "column",
      gap:           20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(212,139,0,0.55)", letterSpacing: "0.14em" }}>
        LIVE PREVIEW
      </div>

      {/* Glow preview */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8 }}>Atmosphere Glow</div>
        <div style={{
          height: 60, borderRadius: 10,
          background: `rgba(14,10,6,0.9)`,
          position: "relative", overflow: "hidden",
        }}>
          <motion.div
            animate={{ opacity: [glowOpacity * 0.7, glowOpacity, glowOpacity * 0.75, glowOpacity] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:   "absolute", inset: 0,
              background: `radial-gradient(ellipse at 50% 100%, ${GOLD}80 0%, ${GOLD}20 50%, transparent 75%)`,
              filter:     "blur(8px)",
            }}
          />
        </div>
      </div>

      {/* Particle density preview */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8 }}>Particle Density</div>
        <div style={{
          height: 50, borderRadius: 10,
          background: "rgba(14,10,6,0.9)",
          position: "relative", overflow: "hidden",
        }}>
          {Array.from({ length: particleCount }, (_, i) => (
            <motion.div
              key={i}
              animate={{
                y:       [0, -(30 + i * 4)],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: motionDur * 0.6,
                repeat:   Infinity,
                delay:    i * (motionDur * 0.6 / particleCount),
                ease:     "easeOut",
              }}
              style={{
                position:     "absolute",
                bottom:       4,
                left:         `${10 + (i / particleCount) * 80}%`,
                width:        particleSize,
                height:       particleSize,
                borderRadius: "50%",
                background:   GOLD,
                boxShadow:    `0 0 ${particleSize * 2}px ${GOLD}60`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Motion speed preview */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8 }}>Motion Calmness</div>
        <div style={{
          height: 28, borderRadius: 8,
          background: "rgba(14,10,6,0.9)",
          position: "relative", overflow: "hidden",
        }}>
          <motion.div
            animate={{ x: ["0%", "80%", "0%"] }}
            transition={{ duration: motionDur, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:     "absolute",
              top:          "50%", left: 0,
              transform:    "translateY(-50%)",
              width:        "18%", height: "60%",
              borderRadius: 4,
              background:   `linear-gradient(90deg, ${GOLD}40, ${GOLD}90)`,
            }}
          />
        </div>
      </div>

      {/* Reveal pacing */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8 }}>Reveal Pacing</div>
        <motion.div
          animate={{ scale: [1, revealScale, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            height: 28, borderRadius: 8,
            background: `${GOLD}18`,
            border: `1px solid ${GOLD}30`,
            display: "flex", alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 10, color: GOLD, opacity: 0.7 }}>Card reveal timing</span>
        </motion.div>
      </div>

      {/* Sound */}
      <div>
        <div style={{ fontSize: 11, color: "rgba(26,26,27,0.40)", marginBottom: 8 }}>
          Sound Volume — <span style={{ color: GOLD }}>{volPct}%</span>
        </div>
        <div style={{
          height: 6, borderRadius: 3,
          background: "rgba(26,26,27,0.08)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${volPct}%`,
            background: `linear-gradient(90deg, ${GOLD}55, ${GOLD})`,
            transition: "width 0.2s ease",
            borderRadius: 3,
          }} />
        </div>
      </div>

      {/* Performance badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width:        8, height: 8, borderRadius: "50%",
          background:   perfColor[settings.performanceMode],
          boxShadow:    `0 0 6px ${perfColor[settings.performanceMode]}`,
        }} />
        <span style={{ fontSize: 12, color: perfColor[settings.performanceMode], fontWeight: 700 }}>
          {settings.performanceMode.charAt(0).toUpperCase() + settings.performanceMode.slice(1)} mode active
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExperienceControlPanel() {
  const [, navigate] = useLocation();
  const { user }     = useAuth();

  const [activeTab,   setActiveTab]   = useState<TabKey>("global");
  const [data,        setData]        = useState<ExperienceControlData>({ global: null, perCraft: {} });
  const blankSettings = { ...DEFAULT_SETTINGS, venueMode: null as VenueMode | null };
  const [settings,    setSettings]    = useState<Record<TabKey, PanelSettings>>({
    global: { ...blankSettings },
    smoke:  { ...blankSettings },
    pour:   { ...blankSettings },
    brew:   { ...blankSettings },
    vape:   { ...blankSettings },
  });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Role guard ──────────────────────────────────────────────────────────────
  const allowed = user && ["venue_owner", "manager", "super_admin"].includes(user.role);

  // ── Fetch settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchExperienceControl()
      .then(d => {
        setData(d);
        setSettings({
          global: rowToSettings(d.global),
          smoke:  rowToSettings(d.perCraft.smoke ?? null),
          pour:   rowToSettings(d.perCraft.pour  ?? null),
          brew:   rowToSettings(d.perCraft.brew  ?? null),
          vape:   rowToSettings(d.perCraft.vape  ?? null),
        });
      })
      .catch(() => setError("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  // ── Live-apply to engine while editing ──────────────────────────────────────
  useEffect(() => {
    const s = settings[activeTab];
    if (activeTab === "global") {
      environmentEngine.applyControlSettings({ ...s });
    } else {
      environmentEngine.applyControlSettings({ ...s }, activeTab as ExperienceCraftType);
    }
  }, [settings, activeTab]);

  // ── Update a single field for the active tab ─────────────────────────────────
  const update = useCallback(<K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [key]: value },
    }));
  }, [activeTab]);

  // ── Save to API ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const craftType = activeTab === "global" ? null : activeTab as ExperienceCraftType;
      const row = await upsertExperienceControl({ craftType, ...settings[activeTab] });
      setData(prev => ({
        global:   craftType === null ? row : prev.global,
        perCraft: craftType !== null ? { ...prev.perCraft, [craftType]: row } : prev.perCraft,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [activeTab, settings]);

  // ── Render guards ────────────────────────────────────────────────────────────
  if (!allowed) {
    return (
      <div style={{ minHeight: "100dvh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(26,26,27,0.40)", fontSize: 14 }}>Admin access required.</p>
      </div>
    );
  }

  const curSettings = settings[activeTab];

  return (
    <div style={{ minHeight: "100dvh", background: DARK, color: "#1A1A1B", display: "flex", flexDirection: "column" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "16px 24px",
        borderBottom: "1px solid rgba(26,26,27,0.08)",
        background: "rgba(245,242,237,0.92)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 20,
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(26,26,27,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "7px 13px",
            color: "rgba(26,26,27,0.52)", fontSize: 13, cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1A1A1B" }}>
            Experience Control Panel
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(26,26,27,0.40)" }}>
            Tune the immersive atmosphere without touching code
          </p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 10,
            background: saved ? "rgba(110,231,183,0.15)" : `${GOLD}18`,
            border: saved ? "1px solid rgba(110,231,183,0.4)" : `1px solid ${GOLD}45`,
            color: saved ? "#6ee7b7" : GOLD,
            fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
            transition: "all 0.25s ease",
          }}
        >
          <Save size={14} />
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </motion.button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, margin: "16px 24px 0", padding: "10px 14px", fontSize: 13, color: "#fca5a5" }}>
          {error}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 4, padding: "16px 24px 0",
        borderBottom: "1px solid rgba(26,26,27,0.07)",
        overflowX: "auto",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: "10px 10px 0 0",
              border: "1px solid",
              borderBottom: "none",
              borderColor: activeTab === tab.key ? `${GOLD}40` : "transparent",
              background: activeTab === tab.key ? `${GOLD}0a` : "transparent",
              color: activeTab === tab.key ? GOLD : "rgba(26,26,27,0.42)",
              fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.18s ease",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "2px solid rgba(212,139,0,0.15)",
              borderTop: `2px solid ${GOLD}`,
            }}
          />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr min(320px, 38%)",
              gap: 24,
              padding: "24px",
              alignItems: "start",
              overflowY: "auto",
            }}
          >
            {/* ── Sliders column ── */}
            <div style={{
              background: "rgba(26,26,27,0.04)",
              border: "1px solid rgba(26,26,27,0.09)",
              borderRadius: 16,
              padding: "24px 22px",
            }}>
              {activeTab !== "global" && (
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
                  color: "rgba(212,139,0,0.5)", marginBottom: 20,
                }}>
                  {activeTab.toUpperCase()}CRAFT OVERRIDE — inherits global when unset
                </div>
              )}

              <Slider
                label="Atmosphere Intensity"
                hint="Controls glow strength, background brightness, and cinematic depth"
                value={curSettings.atmosphereIntensity}
                onChange={v => update("atmosphereIntensity", v)}
                icon={<Flame size={14} />}
              />
              <Slider
                label="Particle Density"
                hint="Controls embers, vapor, bubbles, condensation, dust, and foam"
                value={curSettings.particleDensity}
                onChange={v => update("particleDensity", v)}
                icon={<Wind size={14} />}
              />
              <Slider
                label="Motion Calmness"
                hint="100 = slowest, smoothest. 0 = most energetic movement"
                value={curSettings.motionCalmness}
                onChange={v => update("motionCalmness", v)}
                icon={<Waves size={14} />}
              />
              <Slider
                label="Reveal Pacing"
                hint="How dramatic or fast the recommendation reveal animation feels"
                value={curSettings.revealPacing}
                onChange={v => update("revealPacing", v)}
                icon={<Zap size={14} />}
              />
              <Slider
                label="Sound Volume"
                hint="Master level for ambient loops and interaction sounds"
                value={curSettings.soundVolume}
                onChange={v => update("soundVolume", v)}
                icon={<Volume2 size={14} />}
              />
              <PerfModeSelector
                value={curSettings.performanceMode}
                onChange={v => update("performanceMode", v)}
              />
              <VenueModeSelector
                value={curSettings.venueMode}
                onChange={v => update("venueMode", v)}
              />
            </div>

            {/* ── Preview column ── */}
            <div style={{ position: "sticky", top: 88 }}>
              <LivePreview settings={curSettings} />
              <p style={{
                fontSize: 11, color: "rgba(26,26,27,0.25)",
                textAlign: "center", marginTop: 12, lineHeight: 1.6,
              }}>
                Changes apply live. Click Save to persist to database.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
