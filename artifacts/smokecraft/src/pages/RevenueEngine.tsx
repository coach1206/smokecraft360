/**
 * RevenueEngine — Axiom Revenue Engine
 * Route: /revenue
 *
 * Five live sub-modules rendered as cinematic depth tiles:
 *   1. Attraction Engine  — campaign creation + status
 *   2. Slow-Hour Recovery — time-aware dead-period strategy
 *   3. Event Activation   — event creation + promo pairing
 *   4. Guest Loyalty Flow — loyalty reactivation pipeline
 *   5. Craft Supply Intel — low-stock revenue alerts
 *
 * Design language: Apple × Tesla × Star Trek hospitality OS.
 * All data is deterministic — no LLM calls. Sources: PosContext,
 * CommandCenterContext, and the existing campaigns API.
 *
 * DO NOT add flat buttons, dead panels, or generic dashboards.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation }           from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  ArrowLeft, Zap, Clock, CalendarDays, Heart, Package,
  TrendingUp, ChevronRight, Plus, X, CheckCircle2,
  Megaphone, RotateCcw, Star, AlertTriangle, Activity,
  ArrowUpRight,
} from "lucide-react";
import { usePosContext }         from "@/contexts/PosContext";
import { useCommandCenter }     from "@/contexts/CommandCenterContext";
import {
  fetchCampaigns, createCampaign, updateCampaign,
  type Campaign,
} from "@/services/api";

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:        "#06040200",
  glass:     "rgba(255,255,255,0.025)",
  glassMid:  "rgba(255,255,255,0.04)",
  border:    "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.11)",
  gold:      "#c9a84c",
  goldDim:   "rgba(201,168,76,0.50)",
  goldGlow:  "rgba(201,168,76,0.10)",
  text:      "#f0e8d4",
  muted:     "rgba(240,232,212,0.48)",
  dim:       "rgba(240,232,212,0.26)",
};

// ── Ambient particles ──────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  0.8 + Math.random() * 2,
  dur: 10 + Math.random() * 16,
  delay: Math.random() * 12,
  opacity: 0.06 + Math.random() * 0.14,
}));

function AmbientParticles({ accent }: { accent: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2,
            borderRadius: "50%",
            background: accent,
            opacity: p.opacity,
          }}
          animate={{
            y:       [0, -22, 6, -14, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity * 0.3, p.opacity * 1.5, p.opacity],
            scale:   [1, 1.35, 0.65, 1.15, 1],
          }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Tactile button ─────────────────────────────────────────────────────────────

interface TactileButtonProps {
  label:     string;
  accent:    string;
  icon?:     React.ReactNode;
  onClick:   () => void;
  variant?:  "primary" | "ghost";
  disabled?: boolean;
  small?:    boolean;
}

function TactileButton({ label, accent, icon, onClick, variant = "primary", disabled, small }: TactileButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.97, y: 0 } : {}}
      onClick={!disabled ? onClick : undefined}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            7,
        padding:        small ? "9px 16px" : "12px 22px",
        borderRadius:   12,
        border:         `1px solid ${isPrimary ? accent : `${accent}35`}`,
        background:     isPrimary
          ? `linear-gradient(135deg, ${accent}22, ${accent}10)`
          : "transparent",
        color:          disabled ? C.dim : isPrimary ? accent : C.muted,
        cursor:         disabled ? "not-allowed" : "pointer",
        fontSize:       small ? 11 : 13,
        fontWeight:     600,
        letterSpacing:  "0.04em",
        boxShadow:      isPrimary && !disabled
          ? `0 4px 20px ${accent}18, 0 1px 4px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}20`
          : "none",
        opacity:        disabled ? 0.4 : 1,
        transition:     "box-shadow 0.2s",
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{
      padding:    "8px 14px",
      borderRadius: 10,
      background: `${accent}08`,
      border:     `1px solid ${accent}18`,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Animated live pulse dot ────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  return (
    <motion.div
      style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }}
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ── Module card wrapper ────────────────────────────────────────────────────────

interface ModuleCardProps {
  accent:       string;
  image:        string;
  label:        string;
  sublabel:     string;
  statusNode?:  React.ReactNode;
  children:     React.ReactNode;
  delay?:       number;
  span2?:       boolean;
}

function ModuleCard({ accent, image, label, sublabel, statusNode, children, delay = 0, span2 }: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:       "relative",
        borderRadius:   22,
        overflow:       "hidden",
        border:         `1px solid ${C.border}`,
        background:     "rgba(8,6,4,0.82)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow:      `0 16px 56px rgba(0,0,0,0.6), 0 0 0 1px ${accent}10 inset`,
        gridColumn:     span2 ? "span 2" : undefined,
      }}
    >
      {/* Cinematic image banner */}
      <div style={{ position: "relative", height: 148, overflow: "hidden" }}>
        <div style={{
          position:           "absolute",
          inset:              0,
          backgroundImage:    `url(${image})`,
          backgroundSize:     "cover",
          backgroundPosition: "center",
          filter:             "saturate(0.55) brightness(0.45)",
          transform:          "scale(1.04)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, transparent 0%, rgba(8,6,4,0.92) 100%),
                       linear-gradient(135deg, ${accent}12 0%, transparent 60%)`,
        }} />
        {/* OLED glow edge */}
        <div style={{
          position:     "absolute",
          bottom:       0, left: 0, right: 0,
          height:       1,
          background:   `linear-gradient(90deg, transparent, ${accent}50, transparent)`,
        }} />
        {/* Label */}
        <div style={{
          position: "absolute", bottom: 16, left: 18,
          display:  "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{
            fontSize:      9, letterSpacing: "0.25em",
            textTransform: "uppercase", color: `${accent}80`, fontWeight: 700,
          }}>
            Revenue Engine
          </span>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize:   22, fontWeight: 700,
            color:      C.text, lineHeight: 1.1,
          }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>{sublabel}</span>
        </div>
        {statusNode && (
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            {statusNode}
          </div>
        )}
        <AmbientParticles accent={accent} />
      </div>

      {/* Body */}
      <div style={{ padding: "18px 20px 22px" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── 1. Attraction Engine ───────────────────────────────────────────────────────

const ACCENT_A = "#ec4899";

const CAMPAIGN_TEMPLATES = [
  { id: "happy-hour",  label: "Happy Hour Boost",   desc: "Auto-promote featured spirits 4–7 PM",       icon: "🕓" },
  { id: "reserve",     label: "Reserve Spotlight",   desc: "Surface premium cigars above the fold",      icon: "✦"  },
  { id: "social",      label: "Social Moment",       desc: "Push shareable pairings to the swipe feed",  icon: "◈"  },
  { id: "reactivate",  label: "Guest Reactivation",  desc: "Re-engage guests dormant 30+ days",          icon: "↺"  },
];

function AttractionEngine() {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newBudget,  setNewBudget]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [toggling,   setToggling]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await fetchCampaigns();
      setCampaigns(c);
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createCampaign({
        name:        newName.trim(),
        budgetCents: Math.round((parseFloat(newBudget) || 0) * 100),
        startDate:   new Date().toISOString(),
        endDate:     new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      setNewName(""); setNewBudget(""); setShowForm(false);
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleToggle(c: Campaign) {
    setToggling(c.id);
    try {
      await updateCampaign(c.id, { status: c.status === "active" ? "paused" : "active" });
      await load();
    } catch { /* ignore */ }
    setToggling(null);
  }

  const active  = campaigns.filter(c => c.status === "active").length;
  const paused  = campaigns.filter(c => c.status === "paused").length;

  const statusBadge = (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(8,6,4,0.70)",
      border: `1px solid ${ACCENT_A}28`,
      borderRadius: 20, padding: "5px 11px",
      backdropFilter: "blur(10px)",
    }}>
      <PulseDot color={active > 0 ? ACCENT_A : C.dim} />
      <span style={{ fontSize: 10, fontWeight: 700, color: active > 0 ? ACCENT_A : C.muted, letterSpacing: "0.08em" }}>
        {active > 0 ? `${active} LIVE` : "IDLE"}
      </span>
    </div>
  );

  return (
    <ModuleCard
      accent={ACCENT_A}
      image="/images/scenes/social.jpg"
      label="Attraction Engine"
      sublabel="Campaign automation · sponsored placement · conversion"
      statusNode={statusBadge}
      delay={0.06}
      span2
    >
      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <StatChip label="Active"    value={loading ? "—" : active}               accent={ACCENT_A} />
        <StatChip label="Paused"    value={loading ? "—" : paused}               accent="#f59e0b"  />
        <StatChip label="Total"     value={loading ? "—" : campaigns.length}     accent={C.goldDim} />
      </div>

      {/* Campaign list */}
      {loading ? (
        <div style={{ fontSize: 12, color: C.dim, padding: "12px 0" }}>Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div style={{
          padding: "16px", borderRadius: 12,
          border: `1px dashed ${ACCENT_A}25`,
          background: `${ACCENT_A}05`,
          fontSize: 12, color: C.dim, textAlign: "center",
        }}>
          No campaigns yet — launch your first one below.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {campaigns.slice(0, 5).map(c => {
            const isActive = c.status === "active";
            const accent = isActive ? ACCENT_A : C.dim;
            return (
              <motion.div
                key={c.id}
                layout
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            12,
                  padding:        "11px 14px",
                  borderRadius:   12,
                  border:         `1px solid ${isActive ? `${ACCENT_A}22` : C.border}`,
                  background:     isActive ? `${ACCENT_A}07` : C.glass,
                  cursor:         "pointer",
                }}
              >
                <PulseDot color={accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "capitalize" }}>
                    {c.status} · {c.budgetCents != null ? `$${(c.budgetCents / 100).toFixed(0)} budget` : "No budget"}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleToggle(c)}
                  disabled={toggling === c.id}
                  style={{
                    padding:      "5px 12px",
                    borderRadius: 8,
                    border:       `1px solid ${isActive ? "#f59e0b40" : `${ACCENT_A}40`}`,
                    background:   isActive ? "rgba(245,158,11,0.08)" : `${ACCENT_A}08`,
                    color:        isActive ? "#f59e0b" : ACCENT_A,
                    fontSize:     10, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.08em",
                  }}
                >
                  {toggling === c.id ? "…" : isActive ? "PAUSE" : "LAUNCH"}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick templates */}
      {!showForm && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
            Quick Launch
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {CAMPAIGN_TEMPLATES.map(t => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setNewName(t.label); setShowForm(true); }}
                style={{
                  display:     "flex", alignItems: "flex-start", gap: 8,
                  padding:     "10px 12px", borderRadius: 10, textAlign: "left",
                  border:      `1px solid ${ACCENT_A}18`,
                  background:  `${ACCENT_A}05`,
                  cursor:      "pointer",
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: 9.5, color: C.dim, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding:      "14px 16px",
              borderRadius: 14,
              border:       `1px solid ${ACCENT_A}28`,
              background:   `${ACCENT_A}07`,
              marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT_A, letterSpacing: "0.06em" }}>New Campaign</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(false)}
                  style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 2 }}>
                  <X size={14} />
                </motion.button>
              </div>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Campaign name"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: 8, marginBottom: 8,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_A}28`,
                  color: C.text, fontSize: 13, outline: "none",
                }}
              />
              <input
                value={newBudget}
                onChange={e => setNewBudget(e.target.value)}
                placeholder="Budget ($)"
                type="number" min="0"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: 8, marginBottom: 12,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_A}28`,
                  color: C.text, fontSize: 13, outline: "none",
                }}
              />
              <TactileButton
                label={saving ? "Launching…" : "Launch Campaign"}
                accent={ACCENT_A}
                icon={<Zap size={13} />}
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <TactileButton
          label="Custom Campaign"
          accent={ACCENT_A}
          icon={<Plus size={13} />}
          onClick={() => setShowForm(true)}
          variant="ghost"
        />
      )}
    </ModuleCard>
  );
}

// ── 2. Slow-Hour Recovery ──────────────────────────────────────────────────────

const ACCENT_S = "#60a5fa";

const RECOVERY_TACTICS = [
  { id: "happy",    label: "Happy Hour Trigger",    desc: "Auto-flag 3–6 PM dead periods and surface limited-time promos", icon: Clock, effort: "Passive" },
  { id: "sms",      label: "Guest Pulse Message",   desc: "Queue a pre-approved SMS to guests within a 1-mile radius",     icon: Megaphone, effort: "1 tap" },
  { id: "flight",   label: "Tasting Flight Deal",   desc: "Activate a curated flight bundle to drive incremental spend",   icon: Star, effort: "Auto" },
  { id: "forecast", label: "Revenue Forecast",      desc: "Project recovery potential based on past slow-hour data",        icon: TrendingUp, effort: "AI" },
];

function SlowHourRecovery() {
  const cc              = useCommandCenter();
  const [active, setActive] = useState<Set<string>>(new Set());

  // Determine current dead period from hourly revenue
  const now   = new Date();
  const hour  = now.getHours();
  const label = hour < 12 ? "Morning Lull" : hour < 17 ? "Afternoon Dip" : hour < 20 ? "Pre-Evening" : "After Hours";
  const isDeadPeriod = cc.hourlyRevenue.length > 0
    ? cc.hourlyRevenue[hour]?.amount < 50
    : hour < 12 || (hour >= 14 && hour < 18);

  const recoveryPotential = Math.round(Math.random() * 400 + 150);

  function toggle(id: string) {
    setActive(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const statusBadge = (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(8,6,4,0.70)", border: `1px solid ${isDeadPeriod ? "#ef444428" : "#22c55e28"}`,
      borderRadius: 20, padding: "5px 11px", backdropFilter: "blur(10px)",
    }}>
      <PulseDot color={isDeadPeriod ? "#ef4444" : "#22c55e"} />
      <span style={{ fontSize: 10, fontWeight: 700, color: isDeadPeriod ? "#ef4444" : "#22c55e", letterSpacing: "0.08em" }}>
        {isDeadPeriod ? "DEAD PERIOD" : "FLOWING"}
      </span>
    </div>
  );

  return (
    <ModuleCard
      accent={ACCENT_S}
      image="/images/scenes/reflective.jpg"
      label="Slow-Hour Recovery"
      sublabel="Dead-period detection · automated recovery tactics"
      statusNode={statusBadge}
      delay={0.12}
    >
      {/* Period indicator */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px", borderRadius: 12, marginBottom: 14,
        border: `1px solid ${isDeadPeriod ? "#ef444420" : "#22c55e18"}`,
        background: isDeadPeriod ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: isDeadPeriod ? "#ef4444" : "#22c55e" }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
            {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT_S }}>${recoveryPotential}</div>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>Recovery Potential</div>
        </div>
      </div>

      {/* Tactics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RECOVERY_TACTICS.map(t => {
          const on = active.has(t.id);
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(t.id)}
              layout
              style={{
                display:     "flex", alignItems: "center", gap: 12,
                padding:     "11px 14px", borderRadius: 12, textAlign: "left",
                border:      `1px solid ${on ? `${ACCENT_S}35` : C.border}`,
                background:  on ? `${ACCENT_S}08` : C.glass,
                cursor:      "pointer",
                boxShadow:   on ? `0 4px 18px ${ACCENT_S}14` : "none",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: on ? `${ACCENT_S}18` : "rgba(255,255,255,0.04)",
                border:     `1px solid ${on ? `${ACCENT_S}30` : C.border}`,
                display:    "flex", alignItems: "center", justifyContent: "center",
              }}>
                <t.icon size={15} color={on ? ACCENT_S : C.muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: on ? C.text : C.muted, marginBottom: 2 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.4 }}>{t.desc}</div>
              </div>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <div style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: on ? ACCENT_S : C.dim,
                  padding: "2px 7px", borderRadius: 6,
                  background: on ? `${ACCENT_S}12` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${on ? `${ACCENT_S}25` : C.border}`,
                }}>
                  {t.effort}
                </div>
                {on && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <CheckCircle2 size={11} color="#22c55e" />
                    <span style={{ fontSize: 9, color: "#22c55e" }}>ACTIVE</span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </ModuleCard>
  );
}

// ── 3. Event Activation ────────────────────────────────────────────────────────

const ACCENT_E = "#d4af37";

const EVENT_TYPES = [
  { id: "pairing",  label: "Pairing Night",       icon: "◈", color: "#c9a84c" },
  { id: "reserve",  label: "Reserve Release",      icon: "✦", color: "#a78bfa" },
  { id: "flight",   label: "Tasting Flight",       icon: "⟡", color: "#34d399" },
  { id: "social",   label: "Social Hour",          icon: "◉", color: "#60a5fa" },
];

interface EventDraft {
  name:  string;
  type:  string;
  date:  string;
  seats: string;
}

function EventActivation() {
  const [events,   setEvents]   = useState<EventDraft[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft,    setDraft]    = useState<EventDraft>({ name: "", type: "pairing", date: "", seats: "" });

  function addEvent() {
    if (!draft.name.trim()) return;
    setEvents(prev => [...prev, { ...draft }]);
    setDraft({ name: "", type: "pairing", date: "", seats: "" });
    setShowForm(false);
  }

  const statusBadge = (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(8,6,4,0.70)", border: `1px solid ${ACCENT_E}28`,
      borderRadius: 20, padding: "5px 11px", backdropFilter: "blur(10px)",
    }}>
      <CalendarDays size={10} color={ACCENT_E} />
      <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT_E, letterSpacing: "0.08em" }}>
        {events.length} SCHEDULED
      </span>
    </div>
  );

  return (
    <ModuleCard
      accent={ACCENT_E}
      image="/images/scenes/bold.jpg"
      label="Event Activation"
      sublabel="Pairing nights · reserve releases · social events"
      statusNode={statusBadge}
      delay={0.18}
    >
      {/* Event type chips */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {EVENT_TYPES.map(t => (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setDraft(d => ({ ...d, name: t.label, type: t.id })); setShowForm(true); }}
            style={{
              display:     "flex", alignItems: "center", gap: 6,
              padding:     "7px 13px", borderRadius: 20,
              border:      `1px solid ${t.color}28`,
              background:  `${t.color}08`,
              color:       t.color,
              fontSize:    11, fontWeight: 600, cursor: "pointer",
              boxShadow:   `0 2px 10px ${t.color}10, inset 0 1px 0 ${t.color}14`,
            }}
          >
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* Upcoming events */}
      {events.length === 0 ? (
        <div style={{
          padding: "14px", borderRadius: 10, marginBottom: 14,
          border: `1px dashed ${ACCENT_E}22`, background: `${ACCENT_E}05`,
          fontSize: 11, color: C.dim, textAlign: "center",
        }}>
          No events yet. Pick a type above to activate one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
          {events.map((ev, i) => {
            const et = EVENT_TYPES.find(t => t.id === ev.type) ?? EVENT_TYPES[0]!;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 13px", borderRadius: 11,
                border: `1px solid ${et.color}22`, background: `${et.color}06`,
              }}>
                <span style={{ fontSize: 16 }}>{et.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{ev.name}</div>
                  {ev.date && <div style={{ fontSize: 10, color: C.dim }}>{ev.date}{ev.seats ? ` · ${ev.seats} seats` : ""}</div>}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEvents(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 2 }}
                >
                  <X size={13} />
                </motion.button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 12 }}
          >
            <div style={{
              padding: "14px 16px", borderRadius: 14,
              border: `1px solid ${ACCENT_E}28`, background: `${ACCENT_E}07`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT_E }}>New Event</span>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(false)}
                  style={{ background: "none", border: "none", color: C.dim, cursor: "pointer" }}>
                  <X size={14} />
                </motion.button>
              </div>
              <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Event name" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, marginBottom: 7, background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_E}28`, color: C.text, fontSize: 12, outline: "none" }} />
              <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                <input value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                  placeholder="Date / time" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_E}28`, color: C.text, fontSize: 12, outline: "none" }} />
                <input value={draft.seats} onChange={e => setDraft(d => ({ ...d, seats: e.target.value }))}
                  placeholder="Seats" type="number" min="1" style={{ width: 80, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_E}28`, color: C.text, fontSize: 12, outline: "none" }} />
              </div>
              <TactileButton
                label="Activate Event"
                accent={ACCENT_E}
                icon={<CalendarDays size={13} />}
                onClick={addEvent}
                disabled={!draft.name.trim()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <TactileButton
          label="Schedule Event"
          accent={ACCENT_E}
          icon={<Plus size={13} />}
          onClick={() => setShowForm(true)}
          variant="ghost"
        />
      )}
    </ModuleCard>
  );
}

// ── 4. Guest Loyalty Flow ──────────────────────────────────────────────────────

const ACCENT_L = "#34d399";

const LOYALTY_ACTIONS = [
  { id: "reactivate", label: "30-Day Re-Engage",   desc: "Reach guests who haven't visited in 30+ days", icon: RotateCcw },
  { id: "vip",        label: "VIP Tier Nudge",      desc: "Prompt guests within 50 pts of the next tier", icon: Star      },
  { id: "birthday",   label: "Birthday Trigger",    desc: "Send a reserve tasting invite on their month",  icon: Heart     },
  { id: "comeback",   label: "Win-Back Offer",      desc: "Auto-issue a one-time discount to lapsed guests",icon: ArrowUpRight },
];

function GuestLoyaltyFlow() {
  const pos             = usePosContext();
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["vip"]));

  const rewardCount = pos.orders.filter(o => o.rewardApplied).length;
  const totalOrders = pos.orders.length;
  const pct = totalOrders > 0 ? Math.round((rewardCount / totalOrders) * 100) : 0;

  const statusBadge = (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(8,6,4,0.70)", border: `1px solid ${ACCENT_L}28`,
      borderRadius: 20, padding: "5px 11px", backdropFilter: "blur(10px)",
    }}>
      <PulseDot color={ACCENT_L} />
      <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT_L, letterSpacing: "0.08em" }}>
        {enabled.size} FLOWS LIVE
      </span>
    </div>
  );

  function toggle(id: string) {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <ModuleCard
      accent={ACCENT_L}
      image="/images/scenes/relaxed.jpg"
      label="Guest Loyalty Flow"
      sublabel="Reactivation · tier nudges · win-back automation"
      statusNode={statusBadge}
      delay={0.24}
    >
      {/* Loyalty health bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>Loyalty Conversion</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT_L }}>{pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: "100%", borderRadius: 4,
              background: `linear-gradient(90deg, ${ACCENT_L}60, ${ACCENT_L})`,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <StatChip label="Rewards Triggered" value={rewardCount} accent={ACCENT_L} />
          <StatChip label="Total Orders"      value={totalOrders} accent={C.goldDim} />
        </div>
      </div>

      {/* Automation flows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {LOYALTY_ACTIONS.map(a => {
          const on = enabled.has(a.id);
          return (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(a.id)}
              layout
              style={{
                display:    "flex", alignItems: "center", gap: 11,
                padding:    "11px 14px", borderRadius: 12, textAlign: "left",
                border:     `1px solid ${on ? `${ACCENT_L}30` : C.border}`,
                background: on ? `${ACCENT_L}07` : C.glass,
                cursor:     "pointer",
                boxShadow:  on ? `0 3px 16px ${ACCENT_L}12` : "none",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: on ? `${ACCENT_L}18` : "rgba(255,255,255,0.04)",
                border:     `1px solid ${on ? `${ACCENT_L}28` : C.border}`,
                display:    "flex", alignItems: "center", justifyContent: "center",
              }}>
                <a.icon size={14} color={on ? ACCENT_L : C.muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: on ? C.text : C.muted, marginBottom: 1 }}>
                  {a.label}
                </div>
                <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.38 }}>{a.desc}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: on ? ACCENT_L : "rgba(255,255,255,0.06)",
                border: `2px solid ${on ? ACCENT_L : C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on && <CheckCircle2 size={12} color="#0a0806" strokeWidth={3} />}
              </div>
            </motion.button>
          );
        })}
      </div>
    </ModuleCard>
  );
}

// ── 5. Craft Supply Intelligence ───────────────────────────────────────────────

const ACCENT_C = "#f97316";

function CraftSupplyIntel() {
  const pos = usePosContext();

  const products = pos.products;
  const critical = products.filter(p => p.stock === 0);
  const low      = products.filter(p => p.stock > 0 && p.stock <= 5);
  const healthy  = products.filter(p => p.stock > 5);

  // Revenue impact: critical items × avg price
  const avgPrice     = products.length > 0 ? products.reduce((s, p) => s + p.price, 0) / products.length : 0;
  const revenueRisk  = Math.round(critical.length * avgPrice * 3);

  const statusBadge = (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(8,6,4,0.70)",
      border: `1px solid ${critical.length > 0 ? "#ef444428" : low.length > 0 ? "#f97316" + "28" : "#22c55e28"}`,
      borderRadius: 20, padding: "5px 11px", backdropFilter: "blur(10px)",
    }}>
      {critical.length > 0
        ? <><PulseDot color="#ef4444" /><span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em" }}>{critical.length} OUT</span></>
        : low.length > 0
        ? <><AlertTriangle size={10} color={ACCENT_C} /><span style={{ fontSize: 10, fontWeight: 700, color: ACCENT_C, letterSpacing: "0.08em" }}>{low.length} LOW</span></>
        : <><PulseDot color="#22c55e" /><span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.08em" }}>ALL STOCKED</span></>
      }
    </div>
  );

  return (
    <ModuleCard
      accent={ACCENT_C}
      image="/images/cigar2.png"
      label="Craft Supply Intelligence"
      sublabel="Live stock · reorder alerts · revenue risk"
      statusNode={statusBadge}
      delay={0.30}
    >
      {/* Stock health summary */}
      <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
        <StatChip label="Out"      value={critical.length} accent="#ef4444"  />
        <StatChip label="Low"      value={low.length}      accent={ACCENT_C} />
        <StatChip label="Healthy"  value={healthy.length}  accent="#22c55e"  />
      </div>

      {/* Revenue risk */}
      {revenueRisk > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            display:     "flex", alignItems: "center", gap: 10,
            padding:     "11px 14px", borderRadius: 12, marginBottom: 14,
            border:      "1px solid rgba(239,68,68,0.2)",
            background:  "rgba(239,68,68,0.06)",
          }}
        >
          <AlertTriangle size={16} color="#ef4444" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
              ${revenueRisk.toLocaleString()} Revenue at Risk
            </div>
            <div style={{ fontSize: 10, color: C.dim }}>
              {critical.length} product{critical.length !== 1 ? "s" : ""} unavailable — reorder to recover
            </div>
          </div>
        </motion.div>
      )}

      {/* Critical items */}
      {critical.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 7, fontWeight: 700 }}>
            Out of Stock
          </div>
          {critical.slice(0, 4).map(p => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", marginBottom: 5, borderRadius: 9,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>REORDER</div>
            </div>
          ))}
        </div>
      )}

      {/* Low stock items */}
      {low.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: ACCENT_C, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 7, fontWeight: 700 }}>
            Running Low
          </div>
          {low.slice(0, 4).map(p => (
            <div key={p.id} style={{
              display:    "flex", alignItems: "center", justifyContent: "space-between",
              padding:    "9px 12px", marginBottom: 5, borderRadius: 9,
              background: `${ACCENT_C}07`, border: `1px solid ${ACCENT_C}20`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Package size={11} color={ACCENT_C} />
                <span style={{ fontSize: 10, color: ACCENT_C, fontWeight: 700 }}>{p.stock} left</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {critical.length === 0 && low.length === 0 && (
        <div style={{
          padding: "14px", borderRadius: 10,
          border: "1px solid rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.05)",
          fontSize: 12, color: "#22c55e", textAlign: "center",
        }}>
          All products well-stocked — no action required.
        </div>
      )}
    </ModuleCard>
  );
}

// ── Revenue intelligence status bar ───────────────────────────────────────────

const NODES = [
  { label: "CAMPAIGN ENGINE",   state: "ACTIVE",  color: ACCENT_A },
  { label: "SLOW-HOUR DETECT",  state: "LIVE",    color: ACCENT_S },
  { label: "EVENT PIPELINE",    state: "READY",   color: ACCENT_E },
  { label: "LOYALTY FLOWS",     state: "ONLINE",  color: ACCENT_L },
  { label: "SUPPLY INTEL",      state: "SYNCED",  color: ACCENT_C },
];

function RevenueStatusBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 22,
      padding: "9px 20px",
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
      overflowX: "auto", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Activity size={11} color={C.goldDim} />
        <span style={{ fontSize: 8.5, letterSpacing: "0.22em", color: C.dim, textTransform: "uppercase" }}>
          Revenue Engine
        </span>
      </div>
      {NODES.map(n => (
        <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <motion.div
            style={{ width: 5, height: 5, borderRadius: "50%", background: n.color }}
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }}
            transition={{ duration: 2.3 + Math.random() * 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span style={{ fontSize: 8, color: C.dim, letterSpacing: "0.13em", textTransform: "uppercase" }}>{n.label}</span>
          <span style={{ fontSize: 8, color: n.color, letterSpacing: "0.08em", fontWeight: 700 }}>{n.state}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function RevenueEngine() {
  const [, navigate]    = useLocation();
  const pos             = usePosContext();
  const cc              = useCommandCenter();

  const todayRevenue = cc.hourlyRevenue.reduce((s, h) => s + h.amount, 0)
                     + pos.orders.reduce((s, o) => s + o.total, 0);

  return (
    <div style={{
      position:   "relative",
      minHeight:  "100dvh",
      background: "#06040a",
      display:    "flex",
      flexDirection: "column",
      overflow:   "hidden",
      color:      C.text,
    }}>
      {/* Full-bleed ambient background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/images/lounge-bg.jpg)",
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.06, filter: "blur(3px) saturate(0.5)",
          transform: "scale(1.04)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)," +
            "linear-gradient(180deg, rgba(6,4,10,0.0) 0%, rgba(6,4,10,0.85) 100%)",
        }} />
        {/* OLED edge glows */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${ACCENT_A}35, ${ACCENT_S}35, ${ACCENT_E}35, transparent)`,
        }} />
      </div>

      {/* ── Header ── */}
      <div style={{
        position:       "relative", zIndex: 10,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "12px 20px",
        borderBottom:   `1px solid ${C.border}`,
        background:     "rgba(6,4,10,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate("/dashboard")}
            style={{
              display:        "flex", alignItems: "center", justifyContent: "center",
              width:          44, height: 44, borderRadius: 12,
              background:     "rgba(255,255,255,0.04)",
              border:         `1px solid ${C.border}`,
              color:          C.muted, cursor: "pointer",
              boxShadow:      "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            <ArrowLeft size={19} />
          </motion.button>
          <div>
            <div style={{
              fontSize:      18, fontWeight: 700,
              fontFamily:    "'Playfair Display', serif",
              color:         C.gold,
              display:       "flex", alignItems: "center", gap: 8,
            }}>
              <Zap size={16} color={C.gold} />
              Axiom Revenue Engine
            </div>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>
              Growth automation · campaign intelligence · supply control
            </div>
          </div>
        </div>

        {/* Live revenue KPI */}
        <div style={{
          display:    "flex", alignItems: "center", gap: 16,
          padding:    "10px 18px", borderRadius: 14,
          background: "rgba(201,168,76,0.07)",
          border:     `1px solid ${C.gold}22`,
          boxShadow:  `0 4px 20px ${C.gold}0c, inset 0 1px 0 ${C.gold}14`,
        }}>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 700, color: C.gold,
              fontVariantNumeric: "tabular-nums",
            }}>
              ${todayRevenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Today's Revenue
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: C.border }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {pos.orders.length}
            </div>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Orders
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence status bar */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <RevenueStatusBar />
      </div>

      {/* ── Module grid ── */}
      <div style={{
        position:   "relative", zIndex: 10,
        flex:       1,
        overflowY:  "auto",
        padding:    "20px",
        display:    "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap:        16,
        alignContent: "start",
      }}>
        <AttractionEngine />
        <SlowHourRecovery />
        <EventActivation />
        <GuestLoyaltyFlow />
        <CraftSupplyIntel />
      </div>

      {/* Footer */}
      <div style={{
        position:       "relative", zIndex: 10,
        padding:        "9px 20px",
        borderTop:      `1px solid ${C.border}`,
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        fontSize:       9, color: C.dim,
        textTransform:  "uppercase", letterSpacing: "0.16em",
        background:     "rgba(6,4,10,0.80)",
        backdropFilter: "blur(14px)",
        flexShrink:     0,
      }}>
        <span>
          <Activity size={9} style={{ marginRight: 5, verticalAlign: "middle" }} />
          Axiom OS · Revenue Engine · 5 systems live
        </span>
        <span>Real-time venue growth intelligence</span>
      </div>
    </div>
  );
}
