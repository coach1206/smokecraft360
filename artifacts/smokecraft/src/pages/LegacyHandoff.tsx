/**
 * LegacyHandoff — Step 9: The Ritual Conclusion.
 * Route: /legacy-handoff/:sessionId/:craftType
 *
 * Titan V · 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Phase sequence:
 *   SYNC    (2 000 ms) — All environmental telemetry peaks. White pulse rings.
 *   GOLDEN  (1 500 ms) — Golden Box flash if mentor alignment ≥ 85% (optional).
 *   REVEAL             — Legacy Certificate. Certificate of Master Artisanship.
 *   LOCKED             — After 2-second FINISH hold. All input disabled.
 *
 * Security contract:
 *   - touchAction: none on root container — all swipe gestures dead.
 *   - Only active input: 2-second long-press on the FINISH button.
 *   - No scrollable regions. position: fixed, overflow: hidden.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { getCraftTheme } from "@/lib/craftThemes";
import { computeBlendChemistry, blendSummaryLabel, type BlendChemistry } from "@/lib/mentorIntelligence";
import { assessMentorAlignment, dispatchGoldenReward } from "@/lib/kineticFeedback";
import { ExperienceFlowEngine } from "@/lib/experienceFlowEngine";
import EmberHeartbeat from "@/components/EmberHeartbeat";

// ── Design tokens ─────────────────────────────────────────────────────────────

const METALLIC_GOLD = "#D4AF37";
const CREAM         = "#F0E8D0";
const MONO          = "'Courier New', monospace";
const SERIF         = "'Cormorant Garamond', 'Georgia', serif";

// ── Legacy Name — deterministic per craft + chemistry ────────────────────────

const CRAFT_NAMES: Record<string, [string, string, string, string, string, string]> = {
  smoke: ["The Grand Reserve Artisan", "The Obsidian Sovereign", "The Velvet Artisan",   "The Cedar Alchemist",  "The Complex Architect",  "The Emerging Artisan"  ],
  pour:  ["The Sovereign Distiller",   "The Bold Reserve",       "The Amber Lord",        "The Aromatic Sage",    "The Nuanced Palate",      "The Rising Sommelier"  ],
  brew:  ["The Master Brewer",         "The Dark Brewer",        "The Warm Craftsman",    "The Hop Curator",      "The Flight Engineer",     "The Craft Explorer"    ],
  vape:  ["The Vapor Alchemist",       "The Dense Cloud",        "The Smooth Sage",       "The Vapor Poet",       "The Layer Craftsman",     "The Cloud Seeker"      ],
};

function computeLegacyName(chem: BlendChemistry, craft: string): string {
  const names = CRAFT_NAMES[craft] ?? CRAFT_NAMES.smoke;
  if (chem.harmony >= 80 && chem.complexity >= 65) return names[0];
  if (chem.boldness   >= 70)                        return names[1];
  if (chem.warmth     >= 70)                        return names[2];
  if (chem.aroma      >= 70)                        return names[3];
  if (chem.complexity >= 70)                        return names[4];
  return names[5];
}

function computeLegacyTagline(chem: BlendChemistry, topTags: string[]): string {
  const pair = topTags.slice(0, 2).join(" & ");
  if (chem.harmony >= 80) return `A palate of rare cohesion.${pair ? ` Defined by ${pair}.` : ""}`;
  if (chem.mentorNote)    return chem.mentorNote;
  if (pair)               return `A sensory architect guided by ${pair}.`;
  return "Every instinct measured. Every choice deliberate.";
}

// ── FlavorDNA — radar SVG encoding the guest's full sensory profile ───────────

interface DNAProps { chem: BlendChemistry; accent: string; }

function FlavorDNA({ chem, accent }: DNAProps) {
  const dims = [
    { label: "HARMONY",  v: chem.harmony    },
    { label: "BOLD",     v: chem.boldness   },
    { label: "WARMTH",   v: chem.warmth     },
    { label: "AROMA",    v: chem.aroma      },
    { label: "FINISH",   v: chem.finish     },
    { label: "COMPLEX",  v: chem.complexity },
  ];
  const R = 70; const cx = 100; const cy = 100; const N = 6;
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos((2 * Math.PI / N) * i - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI / N) * i - Math.PI / 2),
  });
  const data  = dims.map((d, i) => pt(i, (d.v / 100) * R));
  const grid  = dims.map((_, i) => pt(i, R));
  const dataS = data.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const gridS = grid.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      {[0.3, 0.55, 0.8, 1.0].map(s => (
        <polygon key={s}
          points={grid.map(p => `${(cx+(p.x-cx)*s).toFixed(1)},${(cy+(p.y-cy)*s).toFixed(1)}`).join(" ")}
          fill="none" stroke={`${accent}1A`} strokeWidth="0.8" />
      ))}
      {grid.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={`${accent}14`} strokeWidth="0.8" />
      ))}
      <motion.polygon points={dataS}
        fill={`${accent}20`} stroke={accent} strokeWidth="1.4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.0, ease: [0.22, 1, 0.36, 1] }} />
      {data.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r="3" fill={accent}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 + i * 0.1, duration: 0.25 }} />
      ))}
      {dims.map((d, i) => {
        const lp = pt(i, R + 16);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 6.5, fill: `${accent}66`, fontFamily: MONO, letterSpacing: "0.08em" }}>
            {d.label}
          </text>
        );
      })}
      {/* centre sigil */}
      <motion.circle cx={cx} cy={cy} r="4" fill="none" stroke={`${accent}40`} strokeWidth="1"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, duration: 0.4 }} />
    </svg>
  );
}

// ── FinalSyncOverlay — 2-second environmental peak ────────────────────────────

function FinalSyncOverlay({ accent }: { accent: string }) {
  const checks = ["ATMOSPHERE  ·  LOCKED", "TELEMETRY   ·  SEALED", "LEGACY      ·  BOUND"];
  return (
    <motion.div
      key="sync-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9500,
        background: "radial-gradient(ellipse at 50% 50%, #0A0702 0%, #040301 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {/* Expanding pulse rings */}
      {[0, 0.45, 0.9].map(delay => (
        <motion.div key={delay}
          initial={{ scale: 0.15, opacity: 0.5 }}
          animate={{ scale: 4.0, opacity: 0 }}
          transition={{ duration: 1.9, delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0.3 }}
          style={{
            position: "absolute", width: 90, height: 90, borderRadius: "50%",
            border: `1px solid ${accent}55`, pointerEvents: "none",
          }}
        />
      ))}

      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, letterSpacing: "0.44em" }}
          transition={{ duration: 0.6 }}
          style={{ fontSize: 7.5, color: `${accent}77`, fontFamily: MONO, marginBottom: 28, textTransform: "uppercase" }}
        >
          FINAL SYNCHRONIZATION
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          {checks.map((label, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 + i * 0.52, duration: 0.35 }}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.46 + i * 0.52, duration: 0.22, type: "spring" }}
                style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }}
              />
              <span style={{ fontSize: 7.5, color: `${accent}66`, fontFamily: MONO, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── GoldenFlash — ENV_GOLDEN_REWARD visual ────────────────────────────────────

function GoldenFlash() {
  return (
    <motion.div
      key="golden-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.92, 0.08] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.4, times: [0, 0.12, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 9600, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 48%, rgba(255,255,255,0.96) 0%, rgba(212,175,55,0.55) 38%, transparent 72%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.4, 0.9], opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, delay: 0.05, times: [0, 0.28, 1] }}
        style={{ fontSize: 52, color: METALLIC_GOLD, textShadow: `0 0 50px ${METALLIC_GOLD}, 0 0 100px ${METALLIC_GOLD}88` }}
      >
        ◆
      </motion.div>
    </motion.div>
  );
}

// ── LegacyCertificate — the centrepiece ──────────────────────────────────────

interface CertProps {
  name:           string;
  tagline:        string;
  blendLabel:     string;
  chem:           BlendChemistry;
  craftType:      string;
  mentorId:       string;
  guestFirstName: string | null;
  isGolden:       boolean;
  alignment:      number;
  sessionScore:   number;
  masteryTier:    string;
  accent:         string;
  holdPct:        number;
  isLocked:       boolean;
  onStartHold:    () => void;
  onCancelHold:   () => void;
}

function LegacyCertificate(p: CertProps) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const ringC = 2 * Math.PI * 44;

  const pills = [
    { lbl: "BLEND",     val: p.blendLabel               },
    { lbl: "HARMONY",   val: `${p.chem.harmony}%`       },
    { lbl: "ALIGNMENT", val: `${p.alignment}%`          },
    ...(p.isGolden ? [{ lbl: "STATUS", val: "GOLDEN BOX" }] : []),
  ];

  return (
    <motion.div
      key="certificate"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.65 }}
      style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
        padding: "20px 20px 14px",
        zIndex: 10,
      }}
    >
      {/* ── Certificate frame ── */}
      <div style={{
        width: "100%", maxWidth: 420, flex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        border: `1px solid ${p.accent}25`,
        borderRadius: 14,
        padding: "18px 22px 14px",
        background: "rgba(7,5,2,0.84)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        gap: 10,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient inner glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none",
          background: `radial-gradient(ellipse at 50% 40%, ${p.accent}07 0%, transparent 70%)`,
        }} />

        {/* Corner ornaments */}
        {(["tl","tr","bl","br"] as const).map(c => (
          <div key={c} style={{
            position: "absolute",
            top:    c.startsWith("t") ? 10 : undefined, bottom: c.startsWith("b") ? 10 : undefined,
            left:   c.endsWith("l")  ? 10 : undefined, right:  c.endsWith("r")  ? 10 : undefined,
            width: 16, height: 16,
            borderTop:    c.startsWith("t") ? `1px solid ${p.accent}44` : "none",
            borderBottom: c.startsWith("b") ? `1px solid ${p.accent}44` : "none",
            borderLeft:   c.endsWith("l")   ? `1px solid ${p.accent}44` : "none",
            borderRight:  c.endsWith("r")   ? `1px solid ${p.accent}44` : "none",
          }} />
        ))}

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 6.5, color: `${p.accent}55`, letterSpacing: "0.42em", fontFamily: MONO, textTransform: "uppercase" }}>
            NOVEE OS · AXIOM CERTIFICATION
          </div>
          <div style={{ fontSize: 6, color: `${p.accent}38`, letterSpacing: "0.22em", marginTop: 3, fontFamily: MONO, textTransform: "uppercase" }}>
            {today}
          </div>
        </motion.div>

        {/* Rule */}
        <div style={{ width: "100%", height: 1, background: `linear-gradient(90deg, transparent, ${p.accent}28, transparent)` }} />

        {/* Salutation */}
        {p.guestFirstName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
            style={{ fontSize: 7, color: `${p.accent}55`, letterSpacing: "0.3em", fontFamily: MONO, textTransform: "uppercase", textAlign: "center", position: "relative", zIndex: 1 }}>
            THIS CERTIFIES · {p.guestFirstName.toUpperCase()}
          </motion.div>
        )}

        {/* Legacy Name — centrepiece */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.86, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: 0, position: "relative", zIndex: 1,
            fontFamily: SERIF, fontWeight: 600,
            fontSize: "clamp(18px, 4.2vw, 26px)",
            color: p.accent, textAlign: "center",
            letterSpacing: "0.04em", lineHeight: 1.2,
            textShadow: p.isGolden ? `0 0 32px ${p.accent}66, 0 0 60px ${p.accent}33` : `0 0 18px ${p.accent}38`,
          }}
        >
          {p.name}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 0.72 }} transition={{ delay: 0.38 }}
          style={{
            margin: 0, position: "relative", zIndex: 1,
            fontFamily: SERIF, fontStyle: "italic", fontSize: 11.5,
            color: CREAM, textAlign: "center", lineHeight: 1.58, maxWidth: 300,
          }}
        >
          {p.tagline}
        </motion.p>

        {/* Flavor DNA Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.32, duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <FlavorDNA chem={p.chem} accent={p.accent} />
        </motion.div>

        {/* Metric pills */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}
        >
          {pills.map(pill => (
            <div key={pill.lbl} style={{
              padding: "4px 9px", borderRadius: 5,
              background: `${p.accent}0D`, border: `1px solid ${p.accent}25`,
              fontSize: 7, fontFamily: MONO, letterSpacing: "0.16em",
              textTransform: "uppercase", color: p.accent, whiteSpace: "nowrap",
            }}>
              <span style={{ color: `${p.accent}4D` }}>{pill.lbl} · </span>{pill.val}
            </div>
          ))}
        </motion.div>

        {/* Rule */}
        <div style={{ width: "100%", height: 1, background: `linear-gradient(90deg, transparent, ${p.accent}1E, transparent)` }} />

        {/* Mentor + Tier */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 7, color: `${p.accent}4A`, letterSpacing: "0.26em", fontFamily: MONO, textTransform: "uppercase" }}>
            MENTOR · {p.mentorId.replace(/-/g, " ").toUpperCase()}
          </div>
          <div style={{ fontSize: 6.5, color: `${p.accent}33`, letterSpacing: "0.18em", fontFamily: MONO, textTransform: "uppercase", marginTop: 3 }}>
            {p.masteryTier.toUpperCase()} · SESSION SCORE {p.sessionScore}
          </div>
        </motion.div>
      </div>

      {/* ── YOUR BLEND IS READY ── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.72 }}
        style={{ textAlign: "center", margin: "10px 0 6px", flexShrink: 0 }}
      >
        <div style={{
          fontSize: 10.5, fontWeight: 800, color: p.accent,
          letterSpacing: "0.40em", fontFamily: MONO, textTransform: "uppercase",
          textShadow: `0 0 18px ${p.accent}3A`,
        }}>
          YOUR BLEND IS READY.
        </div>
      </motion.div>

      {/* ── FINISH long-press button ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.88 }}
        style={{ position: "relative", marginBottom: 6, flexShrink: 0 }}
      >
        {/* Progress ring */}
        <svg width="104" height="104" viewBox="0 0 104 104"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 2 }}>
          <circle cx="52" cy="52" r="46" fill="none" stroke={`${p.accent}1A`} strokeWidth="2" />
          <circle cx="52" cy="52" r="46"
            fill="none" stroke={p.accent} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - p.holdPct)}`}
            style={{ transform: "rotate(-90deg)", transformOrigin: "52px 52px", transition: "stroke-dashoffset 0ms" }}
          />
        </svg>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onPointerDown={p.onStartHold}
          onPointerUp={p.onCancelHold}
          onPointerLeave={p.onCancelHold}
          disabled={p.isLocked}
          style={{
            width: 84, height: 84, borderRadius: "50%",
            background: `linear-gradient(135deg, ${p.accent}16 0%, ${p.accent}07 100%)`,
            border: `1px solid ${p.accent}33`,
            color: p.accent,
            fontSize: 7.5, fontWeight: 800, fontFamily: MONO,
            letterSpacing: "0.22em", textTransform: "uppercase",
            cursor: p.isLocked ? "not-allowed" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            zIndex: 3, position: "relative",
            userSelect: "none", WebkitUserSelect: "none",
            outline: "none",
          }}
        >
          <span>HOLD</span>
          <span>TO</span>
          <span>FINISH</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "sync" | "golden" | "reveal" | "locked";

export default function LegacyHandoff() {
  const { sessionId, craftType = "smoke" } = useParams<{ sessionId: string; craftType: string }>();
  const [, navigate]  = useLocation();
  const theme         = getCraftTheme(craftType);

  // Read profile data written by ExperiencePage.handleFinish
  const raw = useRef((() => {
    try { return JSON.parse(sessionStorage.getItem("nb_handoff") ?? "null") as Record<string, unknown> | null; }
    catch { return null; }
  })()).current;

  const addedTags:      string[]      = Array.isArray(raw?.addedTags) ? (raw!.addedTags as string[]) : [];
  const mentorStyle:    string        = (raw?.mentorStyle as string)  ?? "balanced";
  const mentorId:       string        = (raw?.mentorId   as string)   ?? "traditionalist";
  const guestFirstName: string | null = (raw?.guestFirstName as string) ?? null;
  const sessionScore:   number        = (raw?.sessionScore  as number)  ?? 0;
  const masteryTier:    string        = (raw?.masteryTier   as string)  ?? "explorer";

  // Stable computed values — never change after mount
  const chem        = useRef(computeBlendChemistry(addedTags, craftType)).current;
  const name        = useRef(computeLegacyName(chem, craftType)).current;
  const tagline     = useRef(computeLegacyTagline(chem, addedTags)).current;
  const blendLabel  = useRef(blendSummaryLabel(chem)).current;
  const alignment   = useRef(assessMentorAlignment(addedTags, mentorStyle)).current;
  const isGolden    = alignment >= 85;
  const accent      = isGolden ? METALLIC_GOLD : theme.accent;

  const [phase,    setPhase]    = useState<Phase>("sync");
  const [holdPct,  setHoldPct]  = useState(0);
  const holdRef    = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Static MotionValue — no drag in lockdown, EmberHeartbeat receives it
  const staticX = useMotionValue(0);

  // ── Phase progression on mount ────────────────────────────────────────────
  useEffect(() => {
    // 1. Fire LEGACY_HANDOFF peak telemetry to room environment
    try {
      window.dispatchEvent(new CustomEvent("efe:env_update", {
        detail: { step: "LEGACY_HANDOFF", smoke: 1.0, lighting: "white_peak", audio: "silence_break", mode: "LOCKDOWN", atmosphereTension: 1.0 },
      }));
    } catch { /* ignore */ }

    // 2. POST full sensory profile to printer / operator HUD (fire-and-forget)
    const BASE  = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = (() => { try { return localStorage.getItem("auth_token"); } catch { return null; } })();
    fetch(`${BASE}/api/telemetry/handoff`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        sessionId,     craftType,    legacyName: name,
        tags:          addedTags,    sessionScore, alignmentPct: alignment,
        isGolden,      mentorId,     chemistry: chem,
        guestFirstName, masteryTier, timestamp: Date.now(),
      }),
    }).catch(() => {});

    // 3. Phase timers
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      if (isGolden) {
        setPhase("golden");
        dispatchGoldenReward();
        timers.push(setTimeout(() => setPhase("reveal"), 1500));
      } else {
        setPhase("reveal");
      }
    }, 2000));

    return () => { timers.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Long-press FINISH ─────────────────────────────────────────────────────

  const startHold = useCallback(() => {
    if (phase !== "reveal") return;
    const start = Date.now();
    holdRef.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / 2000, 1);
      setHoldPct(p);
      if (p >= 1) {
        clearInterval(holdRef.current);
        setPhase("locked");
        ExperienceFlowEngine.reset();
        setTimeout(() => navigate("/craft-hub"), 650);
      }
    }, 16);
  }, [phase, navigate]);

  const cancelHold = useCallback(() => {
    clearInterval(holdRef.current);
    setHoldPct(0);
  }, []);

  return (
    <div
      onTouchMove={e => e.preventDefault()}
      style={{
        position:    "fixed",
        inset:       0,
        background:  "#060402",
        overflow:    "hidden",
        touchAction: "none",
        userSelect:  "none",
      }}
    >
      {/* Ambient golden vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: `radial-gradient(ellipse at 50% 58%, ${accent}07 0%, transparent 68%)`,
      }} />

      {/* ── Phase overlays ── */}
      <AnimatePresence>
        {phase === "sync"   && <FinalSyncOverlay key="sync"   accent={accent} />}
        {phase === "golden" && <GoldenFlash      key="golden" />}
      </AnimatePresence>

      {/* ── Certificate ── */}
      <AnimatePresence>
        {(phase === "reveal" || phase === "locked") && (
          <LegacyCertificate
            name={name}           tagline={tagline}     blendLabel={blendLabel}
            chem={chem}           craftType={craftType} mentorId={mentorId}
            guestFirstName={guestFirstName}             isGolden={isGolden}
            alignment={alignment} sessionScore={sessionScore} masteryTier={masteryTier}
            accent={accent}       holdPct={holdPct}     isLocked={phase === "locked"}
            onStartHold={startHold} onCancelHold={cancelHold}
          />
        )}
      </AnimatePresence>

      {/* EmberHeartbeat — metallic gold when golden, theme accent otherwise */}
      <EmberHeartbeat color={accent} corner="bottom-right" size={isGolden ? 11 : 9} dragX={staticX} />
    </div>
  );
}
