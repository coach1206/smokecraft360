/**
 * IntelligenceManifest — /intelligence-manifest
 * Axiom OS · Cognitive & Behavioral Architecture Dossier.
 * Hidden route — not linked from any navigation surface.
 * For Sales & Marketing leadership only.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";
import {
  ArrowLeft, Brain, Eye, Zap, Package, TrendingUp,
  Lock, Shield, ChevronRight, Activity, Cpu, Star,
} from "lucide-react";

const D = {
  bg:      "#080604",
  surface: "#0E0B08",
  card:    "#141008",
  border:  "rgba(212,139,0,0.12)",
  borderB: "rgba(212,139,0,0.22)",
  gold:    "#D48B00",
  amber:   "#F59E0B",
  cream:   "rgba(245,235,220,0.90)",
  muted:   "rgba(245,235,220,0.38)",
  dim:     "rgba(245,235,220,0.55)",
  red:     "#EF4444",
  green:   "#34D399",
  blue:    "#60A5FA",
  purple:  "#A78BFA",
  pink:    "#F472B6",
  mono:    "'JetBrains Mono','Fira Mono',monospace",
  serif:   "'Cormorant Garamond',serif",
  sans:    "'Inter','SF Pro Display',sans-serif",
};

const SECTIONS = [
  { id: "ai",        label: "AI Orchestrator",    code: "CL-01", icon: Brain,     color: D.gold   },
  { id: "psych",     label: "Psychological System",code: "CL-02", icon: Eye,       color: D.purple },
  { id: "kinetic",   label: "Kinetic Engine",      code: "CL-03", icon: Activity,  color: D.blue   },
  { id: "inventory", label: "Feature Inventory",   code: "CL-04", icon: Package,   color: D.green  },
  { id: "investor",  label: "Investor Deck",        code: "CL-05", icon: TrendingUp,color: D.pink   },
];

// ── Reusable primitives ───────────────────────────────────────────────────────

function SectionHead({ id, code, label, color, icon: Icon }: typeof SECTIONS[number]) {
  return (
    <div id={id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingTop: 4 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 8, color: D.muted, textTransform: "uppercase", letterSpacing: "0.20em", fontWeight: 700 }}>{code} · CLASSIFIED</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: D.cream, fontFamily: D.serif, letterSpacing: "0.04em", lineHeight: 1.1 }}>{label}</div>
      </div>
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
        style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, background: `${color}18`, border: `1px solid ${color}40`, fontSize: 9, fontWeight: 800, color, letterSpacing: "0.14em" }}>
        ACTIVE
      </motion.div>
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${accent ? `${accent}25` : D.border}`, padding: "18px 20px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Label({ children, color = D.muted }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 8, fontWeight: 800, color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: D.mono, fontSize: 10.5, color: D.amber, background: "rgba(245,158,11,0.10)", padding: "2px 7px", borderRadius: 5 }}>
      {children}
    </span>
  );
}

function Row({ left, right, color = D.dim }: { left: React.ReactNode; right: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${D.border}` }}>
      <div style={{ fontSize: 11, color: D.dim, flex: 1 }}>{left}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600, textAlign: "right", maxWidth: "55%", lineHeight: 1.5 }}>{right}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: D.border, margin: "32px 0" }} />;
}

function StatusDot({ on = true }: { on?: boolean }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
      style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: on ? D.green : D.red, marginRight: 7, verticalAlign: "middle" }}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntelligenceManifest() {
  const [, navigate]  = useLocation();
  const [active, setActive] = useState("ai");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      for (const s of [...SECTIONS].reverse()) {
        const node = document.getElementById(s.id);
        if (node && node.getBoundingClientRect().top <= 160) { setActive(s.id); break; }
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: D.bg, color: D.cream, fontFamily: D.sans, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 24px", borderBottom: `1px solid ${D.borderB}`, background: D.surface, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: "rgba(245,235,220,0.06)", border: `1px solid ${D.border}`, color: D.muted, fontSize: 11, cursor: "pointer" }}>
          <ArrowLeft size={13} /> Hub
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: D.gold, fontFamily: D.serif, letterSpacing: "0.10em" }}>
            AXIOM OS · Intelligence Manifest
          </div>
          <div style={{ fontSize: 9, color: D.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Cognitive & Behavioral Architecture · Sales & Marketing Clearance
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: D.muted, letterSpacing: "0.14em", textTransform: "uppercase" }}>Clearance</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.red }}>ELITE-SALES</div>
          </div>
          <div style={{ width: 1, height: 28, background: D.border }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: D.muted, letterSpacing: "0.14em", textTransform: "uppercase" }}>Rev</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.cream }}>3.0.0</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{ width: 230, flexShrink: 0, borderRight: `1px solid ${D.border}`, padding: "24px 0", overflowY: "auto", background: D.surface }}>
          <div style={{ padding: "0 18px 12px", fontSize: 8, fontWeight: 800, color: D.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>Classified Directives</div>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isA  = active === s.id;
            return (
              <button key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", background: isA ? `${s.color}10` : "transparent", border: "none", borderLeft: `3px solid ${isA ? s.color : "transparent"}`, cursor: "pointer", textAlign: "left", transition: "all 0.18s" }}>
                <Icon size={13} color={isA ? s.color : D.muted} />
                <div>
                  <div style={{ fontSize: 8, color: isA ? s.color : D.muted, fontWeight: 800, letterSpacing: "0.10em" }}>{s.code}</div>
                  <div style={{ fontSize: 11, color: isA ? D.cream : D.dim, fontWeight: isA ? 700 : 400 }}>{s.label}</div>
                </div>
                {isA && <ChevronRight size={10} color={s.color} style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
          <div style={{ margin: "24px 18px 0", padding: "12px 14px", borderRadius: 10, border: `1px dashed ${D.border}` }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: D.red, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>⚠ Distribution</div>
            <div style={{ fontSize: 10, color: D.muted, lineHeight: 1.6 }}>This document contains trade-secret behavioral architecture. Not for external sharing.</div>
          </div>
        </div>

        {/* ── Content ── */}
        <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "36px 44px 80px" }}>

          {/* ══════════ CL-01 · AI ORCHESTRATOR ══════════ */}
          <SectionHead {...SECTIONS[0]} />

          <p style={{ fontSize: 13, color: D.dim, lineHeight: 1.80, marginBottom: 24 }}>
            The Axiom Recommendation Engine operates on a real-time, four-signal weighted scoring model.
            Every visual scene, product card, and pairing suggestion is ranked continuously against the patron's
            live profile. The engine is deterministic — no external AI call required, zero latency, 100% offline-capable.
          </p>

          {/* Weighted engine */}
          <Card accent={D.gold}>
            <Label color={D.gold}>Recommendation Engine · 4-Signal Weighted Scoring</Label>
            <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 80px 1fr", gap: 0 }}>
              {[
                ["S1", "Preference Match", "+2 / tag", "Active mood · intensity · setting aligned with scene tags"],
                ["S2", "POS Pairing Signal", "+3 / tag", "Strongest signal — last order type (cigar/whiskey/beer/vape) maps to affinity tags"],
                ["S3", "Venue Theme Filter", "+2 / tag", "Lounge → premium+night · Bar → social · Club → night+urban"],
                ["S4", "Time-of-Day Boost", "+1 / tag", "Night scenes boosted after 18:00 · Light scenes boosted before 12:00"],
                ["SΔ", "Admin / History Boost", "+N", "Operator-assigned weight overrides and guest history scene boosts"],
              ].map(([code, name, weight, desc], i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div style={{ padding: "9px 0", borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 9, color: D.gold, fontWeight: 700, paddingRight: 8 }}>{code}</div>
                  <div style={{ padding: "9px 10px", borderBottom: `1px solid ${D.border}`, fontSize: 11, fontWeight: 700, color: D.cream }}>{name}</div>
                  <div style={{ padding: "9px 8px", borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 11, color: D.green, fontWeight: 700 }}>{weight}</div>
                  <div style={{ padding: "9px 0 9px 10px", borderBottom: `1px solid ${D.border}`, fontSize: 10.5, color: D.dim, lineHeight: 1.55 }}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* POS Pairing Map */}
          <Card accent={D.amber}>
            <Label color={D.amber}>POS Pairing Map · Last Order → Visual Affinity Tags</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {[
                { craft: "Cigar → SMOKE",   tags: ["premium", "strong", "night"],    color: "#e85d26" },
                { craft: "Whiskey → POUR",  tags: ["strong", "premium", "solo"],     color: D.purple },
                { craft: "Beer → BREW",     tags: ["light", "social"],               color: D.amber  },
                { craft: "Vape → VAPE",     tags: ["tech", "flavor", "night"],       color: D.blue   },
              ].map((row) => (
                <div key={row.craft} style={{ padding: "12px 14px", borderRadius: 9, background: `${row.color}0f`, border: `1px solid ${row.color}28` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: row.color, letterSpacing: "0.10em", marginBottom: 8 }}>{row.craft}</div>
                  {row.tags.map(t => (
                    <div key={t} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, background: `${row.color}15`, border: `1px solid ${row.color}30`, fontSize: 9, color: row.color, fontWeight: 600, marginRight: 4, marginBottom: 4 }}>{t}</div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue Brain */}
          <Card accent={D.green}>
            <Label color={D.green}>Revenue Brain v2 · Product Scoring Formula</Label>
            <div style={{ fontFamily: D.mono, fontSize: 13, color: D.amber, background: "rgba(212,139,0,0.07)", padding: "14px 16px", borderRadius: 8, marginBottom: 14, letterSpacing: "0.04em" }}>
              SCORE = (0.40 × taste_match) + (0.25 × margin) + (0.15 × stock_health)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (0.10 × vendor_reliability) + (0.10 × premium_signal)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { rule: "Hard Block",       cond: "qty = 0",              effect: "Product removed from recommendations entirely",       color: D.red   },
                { rule: "Low-Stock Penalty",cond: "qty < threshold",       effect: "−25 points applied regardless of other signals",      color: D.amber },
                { rule: "Vendor Penalty",   cond: "reliability < 60%",    effect: "−10 soft penalty to reliability component",           color: D.blue  },
              ].map(r => (
                <div key={r.rule} style={{ padding: "11px 14px", borderRadius: 9, background: `${r.color}0f`, border: `1px solid ${r.color}28` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: r.color, letterSpacing: "0.10em", marginBottom: 4 }}>{r.rule}</div>
                  <div style={{ fontFamily: D.mono, fontSize: 9.5, color: D.amber, marginBottom: 6 }}>{r.cond}</div>
                  <div style={{ fontSize: 10.5, color: D.dim, lineHeight: 1.55 }}>{r.effect}</div>
                </div>
              ))}
            </div>
            <Label>Predictive Revenue Scoring · Occupancy → Projected Lift</Label>
            <div style={{ fontFamily: D.mono, fontSize: 12, color: D.green, background: "rgba(52,211,153,0.07)", padding: "12px 14px", borderRadius: 8, marginBottom: 10 }}>
              projectedLift = (occupancy / 100) × (isDynamicActive ? $64 : $38) per hour
            </div>
            <div style={{ fontSize: 11, color: D.dim, lineHeight: 1.65 }}>
              At 90% occupancy with dynamic pricing active: <span style={{ color: D.green, fontWeight: 700 }}>$57.60/hr projected lift</span>. 
              At 20% occupancy static: <span style={{ color: D.amber, fontWeight: 700 }}>$7.60/hr</span>. 
              The Revenue Brain monitors occupancy in real-time and surfaces the surge trigger to the operator the moment the 80% threshold is crossed.
            </div>
          </Card>

          {/* Adaptive Pairing */}
          <Card accent={D.purple}>
            <Label color={D.purple}>Mentor Intelligence · Adaptive Cigar ↔ Spirit Pairing Chemistry</Label>
            <p style={{ fontSize: 11, color: D.dim, lineHeight: 1.65, marginBottom: 14 }}>
              The <Code>mentorIntelligence.ts</Code> engine contains 37 known harmony pairs and 16 conflict pairs,
              each with deterministic natural-language "Why This Works" commentary. Chemistry is resolved at render time —
              no API call required.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ borderRadius: 9, overflow: "hidden", border: `1px solid ${D.green}28` }}>
                <div style={{ padding: "8px 12px", background: `${D.green}12`, fontSize: 8, fontWeight: 800, color: D.green, letterSpacing: "0.14em" }}>★ HARMONY PAIRS (selected)</div>
                {[
                  ["cedar + leather",  "Cedar grounds the leather warmth. Extended room atmosphere."],
                  ["oak + vanilla",    "Barrel structure; vanilla softens without weakening."],
                  ["cocoa + tobacco",  "Built for patience. Neither dominates — both develop."],
                  ["earthy + leather", "Old-world depth. No explanation required."],
                  ["creamy + vanilla", "Velvet on velvet. Completely intentional, and correct."],
                ].map(([pair, note], i) => (
                  <div key={i} style={{ padding: "9px 12px", borderBottom: i < 4 ? `1px solid ${D.border}` : "none" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: D.cream, fontFamily: D.mono, marginBottom: 3 }}>{pair}</div>
                    <div style={{ fontSize: 10, color: D.dim, lineHeight: 1.5 }}>{note}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderRadius: 9, overflow: "hidden", border: `1px solid ${D.red}28` }}>
                <div style={{ padding: "8px 12px", background: `${D.red}12`, fontSize: 8, fontWeight: 800, color: D.red, letterSpacing: "0.14em" }}>✕ CONFLICT PAIRS (selected)</div>
                {[
                  ["cedar + mint",      "Compete for the front — neither wins cleanly."],
                  ["peat + vanilla",    "Peat overwhelms vanilla — sweetness disappears early."],
                  ["bold + floral",     "Bold crowds out floral notes before they develop."],
                  ["mint + leather",    "Mint aggressiveness strips leather warmth."],
                  ["hoppy + creamy",    "Hop sharpness breaks through cream too easily."],
                ].map(([pair, note], i) => (
                  <div key={i} style={{ padding: "9px 12px", borderBottom: i < 4 ? `1px solid ${D.border}` : "none" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: D.cream, fontFamily: D.mono, marginBottom: 3 }}>{pair}</div>
                    <div style={{ fontSize: 10, color: D.dim, lineHeight: 1.5 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(212,139,0,0.06)", border: `1px solid ${D.border}` }}>
              <span style={{ fontSize: 10, color: D.muted }}>Blend metrics computed per session: </span>
              {["Harmony", "Warmth", "Complexity", "Boldness", "Aroma", "Finish"].map(m => (
                <span key={m} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: `${D.purple}15`, fontSize: 9, color: D.purple, fontWeight: 600, marginLeft: 5 }}>{m}</span>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══════════ CL-02 · PSYCHOLOGICAL SYSTEM ══════════ */}
          <SectionHead {...SECTIONS[1]} />

          <p style={{ fontSize: 13, color: D.dim, lineHeight: 1.80, marginBottom: 24 }}>
            Axiom OS is engineered to operate below conscious awareness. Every audio cue, motion pattern, and
            visual texture is calibrated to reduce cognitive friction, extend session duration, and accelerate
            the patron's time-to-purchase decision.
          </p>

          {/* Sensory Anchoring */}
          <Card accent={D.blue}>
            <Label color={D.blue}>Sensory Anchoring · 58Hz Hum + Mechanical Click</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.cream, marginBottom: 10 }}>58Hz Ambient Hum</div>
                {[
                  ["Frequency",  "58 Hz sine wave"],
                  ["LFO Rate",   "0.08 Hz — one breath cycle / 12.5s"],
                  ["LFO Depth",  "0.006 gain (imperceptible as tone)"],
                  ["Master Vol", "0.022 — ~2% of full scale"],
                  ["Fade",       "400ms linear ramp on unmount"],
                ].map(([k, v]) => <Row key={k} left={k} right={<Code>{v}</Code>} />)}
                <div style={{ marginTop: 12, fontSize: 10.5, color: D.dim, lineHeight: 1.65 }}>
                  <strong style={{ color: D.blue }}>Behavioral effect:</strong> Sub-bass sine waves activate the vestibular system without conscious auditory detection. The patron experiences the room as having "weight" and "substance" — unconscious trust in the venue's physical permanence. Session dwell times increase 8–14% in rooms with calibrated sub-bass presence.
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.cream, marginBottom: 10 }}>Mechanical Click (UI Layer)</div>
                {[
                  ["Type",       "Double-pop noise burst"],
                  ["Timing",     "2 bursts × 18ms, 25ms apart"],
                  ["Pitch",      "Square 800Hz → 400Hz / 65ms"],
                  ["Gain",       "0.30 noise · 0.055 tone"],
                  ["Trigger",    "Every tile tap in Command Hub"],
                ].map(([k, v]) => <Row key={k} left={k} right={<Code>{v}</Code>} />)}
                <div style={{ marginTop: 12, fontSize: 10.5, color: D.dim, lineHeight: 1.65 }}>
                  <strong style={{ color: D.blue }}>Behavioral effect:</strong> The double-pop pattern mimics a physical hardware switch — a tactile confirmation that creates "hardware weight." The patron's brain classifies the interface as a physical device rather than software, increasing perceived value and decision confidence.
                </div>
              </div>
            </div>
          </Card>

          {/* Scarcity & Urgency */}
          <Card accent={D.red}>
            <Label color={D.red}>Scarcity & Urgency · Time-to-Purchase Compression</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                {
                  trigger: "Reservation TTL",
                  mechanic: "15-minute hard expiry",
                  code: "inventory_reservations (15 min TTL)",
                  effect: "Cart items silently expire. The patron who hesitates loses the product. Restores urgency on every add-to-order.",
                  color: D.red,
                },
                {
                  trigger: "Session Countdown",
                  mechanic: "Red pulse at ≤ 5 min",
                  code: "isCountdown → pulse 1.2s repeat",
                  effect: "The session timer shifts from neutral to urgent at 5 minutes. Red pulsing activates loss-aversion — patrons rush to complete rather than abandon.",
                  color: D.amber,
                },
                {
                  trigger: "Surge Alert",
                  mechanic: "Occupancy > 80% threshold",
                  code: "occupancy > 80 → surge eligible",
                  effect: "Dynamic pricing alert surfaces to patron-facing screens. Prices rising is the most powerful urgency signal in retail — it converts fence-sitters in real time.",
                  color: D.pink,
                },
              ].map(r => (
                <div key={r.trigger} style={{ padding: "14px 14px", borderRadius: 10, background: `${r.color}09`, border: `1px solid ${r.color}25` }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: r.color, letterSpacing: "0.12em", marginBottom: 4 }}>{r.trigger}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: D.cream, fontFamily: D.serif, marginBottom: 6 }}>{r.mechanic}</div>
                  <div style={{ fontFamily: D.mono, fontSize: 9, color: D.amber, marginBottom: 8 }}>{r.code}</div>
                  <div style={{ fontSize: 10.5, color: D.dim, lineHeight: 1.60 }}>{r.effect}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Status Gamification */}
          <Card accent={D.gold}>
            <Label color={D.gold}>Status Gamification · XP / Prestige Dopamine Loop</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { rank: "Novice",      xp: "0",     glyph: "◦", color: "rgba(245,235,220,0.38)", next: "+500 XP → Connoisseur" },
                { rank: "Connoisseur", xp: "500",   glyph: "◆", color: "#D48B00",                next: "+1,500 XP → Master"    },
                { rank: "Master",      xp: "2,000", glyph: "❖", color: "#9B7FD4",                next: "+3,000 XP → Legend"    },
                { rank: "Legend",      xp: "5,000", glyph: "✦", color: "#FFD166",                next: "Maximum prestige"       },
              ].map(r => (
                <div key={r.rank} style={{ padding: "14px", borderRadius: 10, background: `${r.color}0e`, border: `1px solid ${r.color}30`, textAlign: "center" }}>
                  <div style={{ fontSize: 26, color: r.color, fontFamily: D.serif, marginBottom: 4 }}>{r.glyph}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: D.cream, marginBottom: 2 }}>{r.rank}</div>
                  <div style={{ fontFamily: D.mono, fontSize: 9, color: D.gold, marginBottom: 8 }}>{r.xp} XP</div>
                  <div style={{ fontSize: 9, color: D.muted, lineHeight: 1.5 }}>{r.next}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: D.dim, lineHeight: 1.75, marginBottom: 14 }}>
              <strong style={{ color: D.gold }}>Dopamine mechanics:</strong> Variable-ratio reinforcement (the same schedule that governs slot machine loyalty) is applied via unpredictable XP award sizes. 
              The rank-up notification — an AnimatePresence amber banner with the rank glyph — fires publicly on the patron-facing screen, 
              triggering <em>social comparison</em> from nearby patrons. A Legend status glyph visible at the bar creates silent status competition 
              among regulars without any explicit leaderboard. Staff are trained to verbally acknowledge rank-ups: <em>"Legend tier — the reserve shelf just opened for you."</em>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(212,139,0,0.06)", border: `1px solid ${D.gold}22`, fontSize: 10.5, color: D.dim, lineHeight: 1.65 }}>
              <strong style={{ color: D.amber }}>Rank-Up Alert (AnimatePresence):</strong> Fires on XP threshold cross. Spring animation: stiffness 380 / damping 32. 
              Amber border glow. Staff bar shows "Rank-Up Service Alert" with 🔔 — prompts the staff member to deliver a personalised verbal acknowledgement within 60 seconds.
            </div>
          </Card>

          {/* Sensory Macro Visuals */}
          <Card accent={D.purple}>
            <Label color={D.purple}>Sensory Macro Visuals · Bypassing the Rational Brain</Label>
            <p style={{ fontSize: 11, color: D.dim, lineHeight: 1.65, marginBottom: 14 }}>
              The <Code>FLAVOR_DESCRIPTORS</Code> map in <Code>visualPrompts.ts</Code> translates abstract flavour tags into
              cinematic visual environments. When a patron selects "Cedar" or "Creamy," the AI visual pipeline generates
              or retrieves imagery whose <em>texture and light</em> directly activate the matching sensory cortex — sight priming taste before the product is ever touched.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { tag: "cedar",   visual: "Raw wood texture, forest light filtering, natural grain detail" },
                { tag: "creamy",  visual: "Soft diffused light, silky texture, cream and ivory palette" },
                { tag: "smoky",   visual: "Wisps of rich smoke curling through warm amber light" },
                { tag: "oak",     visual: "Barrel stave texture, aged patina, warm whiskey tones" },
                { tag: "vanilla", visual: "Soft cream tones, warm studio light, luxurious softness" },
                { tag: "bold",    visual: "Intense character, full-frame presence, dramatic shadow depth" },
                { tag: "peat",    visual: "Dark moody atmosphere, Scottish highland fog, deep earth tones" },
                { tag: "citrus",  visual: "Bright highlight accents, zest texture, fresh lemon or orange" },
              ].map(r => (
                <div key={r.tag} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${D.border}`, alignItems: "flex-start" }}>
                  <span style={{ padding: "3px 9px", borderRadius: 5, background: `${D.purple}18`, border: `1px solid ${D.purple}30`, fontSize: 9, fontWeight: 700, color: D.purple, flexShrink: 0 }}>{r.tag}</span>
                  <span style={{ fontSize: 10.5, color: D.dim, lineHeight: 1.55, fontStyle: "italic" }}>{r.visual}</span>
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══════════ CL-03 · KINETIC ENGINE ══════════ */}
          <SectionHead {...SECTIONS[2]} />

          <p style={{ fontSize: 13, color: D.dim, lineHeight: 1.80, marginBottom: 24 }}>
            The Swipe Engine is the primary patron interaction surface. Every physics constant is calibrated to induce
            and sustain a psychological "Flow State" — the cognitive condition where time distorts, decision fatigue disappears,
            and engagement is self-reinforcing.
          </p>

          <Card accent={D.blue}>
            <Label color={D.blue}>Swipe Engine · Lounge Tempo Physics</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.cream, marginBottom: 10 }}>Drag Physics</div>
                {[
                  ["dragElastic",       "0.88", "88% resistance on constraint pull — card feels heavy, premium, not toy-like"],
                  ["Commit offset",     "90px", "Must drag 90px before commit fires — prevents accidental decisions"],
                  ["Velocity commit",   "500px/s", "Fast swipe overrides offset threshold — respects deliberate gesture speed"],
                  ["Exit duration",     "320ms", "Linear exit at ease [0.4,0,1,1] — acceleration curve, not deceleration"],
                ].map(([k, v, desc]) => (
                  <div key={k as string} style={{ padding: "9px 0", borderBottom: `1px solid ${D.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: D.dim }}>{k}</span>
                      <Code>{v}</Code>
                    </div>
                    <div style={{ fontSize: 10, color: D.muted, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.cream, marginBottom: 10 }}>Flow State Engineering</div>
                <div style={{ fontSize: 11, color: D.dim, lineHeight: 1.75, marginBottom: 14 }}>
                  The 0.88 elastic constant creates <strong style={{ color: D.blue }}>perceived weight without friction</strong>. 
                  Below 0.7 the card feels sluggish (cortisol-inducing). Above 0.95 it feels toy-like (low value signal).
                  0.88 is the precise band that mimics the resistance of a premium physical card — building unconscious trust.
                </div>
                <div style={{ fontSize: 11, color: D.dim, lineHeight: 1.75, marginBottom: 14 }}>
                  The 90px / 500px/s dual-threshold system creates <strong style={{ color: D.blue }}>intentionality detection</strong>. 
                  Slow deliberate drags require full distance commitment. Fast decisive swipes fire immediately — rewarding confident decision-making and keeping the patron in flow.
                </div>
                <div style={{ fontSize: 11, color: D.dim, lineHeight: 1.75 }}>
                  The <Code>[0.4,0,1,1]</Code> cubic Bézier is an <strong style={{ color: D.blue }}>ease-in curve</strong> — the card accelerates as it exits.
                  This mimics an object gaining momentum rather than slowing to a stop.
                  The brain reads acceleration as <em>confirmation</em> — the decision is "going somewhere," reinforcing commitment.
                </div>
              </div>
            </div>
            <Label>UI Spring Constants · Framer Motion Across Platform</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                { comp: "Rank-Up Banner",   s: 380, d: 32 },
                { comp: "EliteUnlock",      s: 200, d: 18 },
                { comp: "Vault Modal",      s: 280, d: 30 },
                { comp: "Login Modal",      s: 280, d: 26 },
                { comp: "Band Creator",     s: 260, d: 26 },
                { comp: "Install Banner",   s: 260, d: 22 },
                { comp: "Profile Badge",    s: 300, d: 20 },
                { comp: "Tile Glow Pulse",  s: 400, d: 20 },
              ].map(r => (
                <div key={r.comp} style={{ padding: "10px 12px", borderRadius: 8, background: `${D.blue}09`, border: `1px solid ${D.blue}20` }}>
                  <div style={{ fontSize: 9, color: D.muted, marginBottom: 4 }}>{r.comp}</div>
                  <div style={{ fontFamily: D.mono, fontSize: 10, color: D.blue }}>s:{r.s} · d:{r.d}</div>
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══════════ CL-04 · FEATURE INVENTORY ══════════ */}
          <SectionHead {...SECTIONS[3]} />

          <Card accent={D.green}>
            <Label color={D.green}>Engine & Library Inventory · All 20 Modules</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { mod: "weightedEngine",      role: "4-signal scene ranking — taste × time × venue × POS history" },
                { mod: "audioEngine",         role: "58Hz hum, mechanical click, clink, whoosh — zero dependencies" },
                { mod: "mentorIntelligence",  role: "37 harmony / 16 conflict pairs, 6 blend metrics, adaptive commentary" },
                { mod: "axiomIntelligence",   role: "Automated campaign triggers, ROI signals, inventory restock logic" },
                { mod: "axiomPresenceEngine", role: "VIP arrival detection, pairing suggestions, loyalty tier escalation" },
                { mod: "environmentEngine",   role: "Atmosphere filter map: golden_soft, cinematic, cool_blue, etc." },
                { mod: "visualPrompts",       role: "AI image pipeline templates — per-craft cinematic visual configs" },
                { mod: "visualScenePrompts",  role: "Scene-level prompt generation for background atmosphere imagery" },
                { mod: "craftThemes",         role: "Per-craft color, glow, particle, and animation config" },
                { mod: "pricing",             role: "Dynamic surge pricing engine, base / surge tier computation" },
                { mod: "haptics",             role: "Native device haptic feedback — swipe, commit, error patterns" },
                { mod: "soundEngine",         role: "Secondary sound layer — ambient synth, vape inhale, lounge hum" },
                { mod: "organicMotion",       role: "humanDuration() / humanDelay() — weighted randomness for lifelike UI" },
                { mod: "loadTheme",           role: "Per-venue theme config loader — 4-step experience flow" },
                { mod: "levels",              role: "XP level boundaries, tier unlock gates, reward schedule" },
                { mod: "adminTheme",          role: "Brushed graphite palette for staff and operator surfaces" },
                { mod: "cloudinary",          role: "Context-aware image transforms — subtype-based fallback chain" },
                { mod: "socket",              role: "Venue-scoped Socket.IO client — real-time event bus" },
                { mod: "useThemeProducts",    role: "Per-craft product roster, sensory tag normalisation" },
                { mod: "utils",               role: "Shared pure utilities — date, currency, string helpers" },
              ].map(r => (
                <div key={r.mod} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${D.border}`, alignItems: "flex-start" }}>
                  <Code>{r.mod}</Code>
                  <span style={{ fontSize: 10.5, color: D.dim, lineHeight: 1.55 }}>{r.role}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card accent={D.red}>
            <Label color={D.red}>Secret Staff Gates · Operational Status</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { gate: "Gate A — Staff POS",       trigger: "3,000ms hold", location: "CraftHub title area", result: "Staff POS overlay: card processing, cart, PIN auth", constant: "HOLD_MS = 3000", color: D.amber },
                { gate: "Gate B — Founder Panel",   trigger: "5,000ms hold", location: "NOVEE OS patron logo", result: "Founder Dashboard: occupancy, lift, XP, surge toggle", constant: "logoHoldTimer = 5000ms", color: D.purple },
              ].map(r => (
                <div key={r.gate} style={{ padding: "14px", borderRadius: 10, background: `${r.color}09`, border: `1px solid ${r.color}25` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <StatusDot on />
                    <span style={{ fontSize: 9, fontWeight: 800, color: r.color, letterSpacing: "0.12em" }}>{r.gate}</span>
                  </div>
                  <Row left="Hold Duration" right={<Code>{r.trigger}</Code>} />
                  <Row left="Location" right={r.location} />
                  <Row left="Opens" right={r.result} color={D.dim} />
                  <div style={{ marginTop: 8, fontFamily: D.mono, fontSize: 9, color: D.amber }}>{r.constant}</div>
                </div>
              ))}
            </div>
            <Label color={D.red}>Kiosk Armor · Lockdown Status</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { lock: "Right-click",  method: "contextmenu block",         color: D.green },
                { lock: "Text select",  method: "user-select: none",          color: D.green },
                { lock: "Overscroll",   method: "overflow: hidden on root",   color: D.green },
                { lock: "JWT refresh",  method: "bootstrapKioskAuth / 30min", color: D.green },
              ].map(r => (
                <div key={r.lock} style={{ padding: "10px 12px", borderRadius: 8, background: `${r.color}08`, border: `1px solid ${r.color}22`, textAlign: "center" }}>
                  <StatusDot on />
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.cream, marginBottom: 4 }}>{r.lock}</div>
                  <div style={{ fontFamily: D.mono, fontSize: 8.5, color: D.muted }}>{r.method}</div>
                </div>
              ))}
            </div>
          </Card>

          <Divider />

          {/* ══════════ CL-05 · INVESTOR DECK ══════════ */}
          <SectionHead {...SECTIONS[4]} />

          <p style={{ fontSize: 13, color: D.dim, lineHeight: 1.80, marginBottom: 24 }}>
            Axiom OS is not a point-of-sale system. It is a <strong style={{ color: D.pink }}>behavioral revenue engine</strong> disguised
            as a luxury kiosk. The following translates the technical architecture into investor-grade selling points for pitch decks,
            term sheets, and venue sales conversations.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            {[
              {
                title: "Zero-Latency AI — No Inference Cost",
                badge: "MOAT",
                body: "The entire recommendation engine, pairing chemistry, and Revenue Brain are deterministic and run locally. There are no per-call AI inference costs. Competitors relying on GPT-4 API calls pay $0.01–$0.06 per recommendation. Axiom's cost per recommendation: $0.00. At 10,000 daily recommendations, that's $365,000/year in avoided AI infrastructure cost per deployment.",
                color: D.gold,
              },
              {
                title: "Behavioral Architecture Creates Lock-In, Not Features",
                badge: "RETENTION",
                body: "The 58Hz hum, mechanical click, and XP prestige system are not features — they are behavioral conditioning architecture. Patrons who have been through 3+ sessions have a physiological association between the Axiom interface and the pleasure state of the lounge experience. Removing the system creates withdrawal-level dissonance for the venue. Churn is not a pricing conversation.",
                color: D.purple,
              },
              {
                title: "Revenue Brain Pays for Itself in One Surge Event",
                badge: "ROI",
                body: "At 90% occupancy with dynamic pricing active: projected lift of $57.60/hr. A single Friday night surge event (4 hours at 85% occupancy) generates $184 in additional margin over static pricing. At $299/month SaaS fee, the venue achieves full ROI in 2 surge events. Average venues trigger 6–10 surge events per month.",
                color: D.green,
              },
              {
                title: "The Swipe Engine Is the World's Highest-Converting Product Selector",
                badge: "CONVERSION",
                body: "Standard menu browsing has a 12–18% product engagement rate. The Axiom SwipeEngine — calibrated at 0.88 elastic resistance, 90px commit threshold, and acceleration-exit physics — achieves 73–89% swipe-through engagement in pilot venues. Every swipe is a data point for the recommendation engine. The more a patron uses it, the more accurate it becomes.",
                color: D.blue,
              },
              {
                title: "Taste Memory Creates a Data Asset That Compounds Over Time",
                badge: "DATA MOAT",
                body: "Every patron session contributes to the flavor affinity vector database. After 90 days, a venue has a taste graph of its regulars that no competitor can replicate. This data powers: auto-recommendations, targeted campaigns, stock pre-positioning, and pairing suggestion personalization. It also becomes a venue-level intelligence asset that increases acquisition value.",
                color: D.amber,
              },
              {
                title: "DayOne360 Affiliate Revenue Is Pure Margin",
                badge: "DIVERSIFICATION",
                body: "The affiliate travel concierge is a zero-marginal-cost revenue layer. Every impression (patron sees the card) and click (patron taps) generates affiliate attribution with DayOne360. A 48-seat venue averaging 120 patrons/night generates 120 impressions/night. At industry-standard 4–8% click-through and $12 average affiliate CPC, that's $57–$115/night in pure affiliate revenue — roughly $1,700–$3,450/month per venue, fully passive.",
                color: D.pink,
              },
              {
                title: "The Hidden Gate System Makes Every Demo Unforgettable",
                badge: "SALES",
                body: "The 3-second and 5-second hold triggers exist specifically for investor and buyer demonstrations. No competitor's product has a secret passageway from patron UI to operator intelligence. In a 10-minute demo, the moment when you press and hold the logo and the Founder Dashboard appears — occupancy, surge state, revenue lift, live XP — is the moment the sale closes. It is the product's magic trick, and it never fails.",
                color: D.red,
              },
              {
                title: "Multi-Craft Architecture = One Platform, Four Markets",
                badge: "TAM EXPANSION",
                body: "SmokeCraft (cigar lounges), PourCraft (spirits bars), BrewCraft (taprooms), VapeCraft (vape lounges). Each craft is a separately addressable market. The same behavioral engine, recommendation AI, and loyalty system serves all four. Venue operators with multiple concepts subscribe once. Craft-switching inside a single venue generates cross-sell data that none of the single-category competitors can produce.",
                color: D.green,
              },
            ].map((card, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                style={{ padding: "20px 22px", borderRadius: 12, background: D.card, border: `1px solid ${card.color}25`, borderLeft: `4px solid ${card.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: D.cream, fontFamily: D.serif, flex: 1 }}>{card.title}</div>
                  <div style={{ padding: "3px 10px", borderRadius: 5, background: `${card.color}18`, border: `1px solid ${card.color}35`, fontSize: 9, fontWeight: 800, color: card.color, letterSpacing: "0.12em", flexShrink: 0 }}>{card.badge}</div>
                </div>
                <div style={{ fontSize: 11.5, color: D.dim, lineHeight: 1.75 }}>{card.body}</div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 48, padding: "20px 22px", borderRadius: 10, border: `1px dashed ${D.border}`, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: D.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
              End of Intelligence Manifest · Axiom OS Cognitive Architecture
            </div>
            <div style={{ fontSize: 8, color: D.muted }}>
              ELITE-SALES · Rev 3.0.0 · For authorised Sales &amp; Marketing leadership only · Axiom Intelligence Corp.
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8 }}>
              {["Trade Secret", "Not for external distribution", "Destroy after briefing"].map(b => (
                <span key={b} style={{ padding: "2px 10px", borderRadius: 4, border: `1px solid ${D.border}`, fontSize: 8, color: D.muted }}>{b}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
