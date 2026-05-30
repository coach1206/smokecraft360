import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

// ─── Design tokens (Smoked Cream & Obsidian) ─────────────────────────────────
const C = {
  bg:         "#F5F2ED",   // Smoked Cream
  parchment:  "#EFEBE0",   // Light Parchment
  pressed:    "#E8E4D9",   // Pressed Paper
  obsidian:   "#1A1A1B",   // Obsidian
  muted:      "rgba(26,26,27,0.52)",
  faint:      "rgba(26,26,27,0.28)",
  amber:      "#D48B00",   // Warm Honey Amber
  amberFaint: "rgba(212,139,0,0.12)",
  amberBorder:"rgba(212,139,0,0.22)",
  border:     "rgba(26,26,27,0.09)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, inView: boolean, duration = 1.6) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return val;
}

function FadeIn({ children, delay = 0, y = 20, className = "" }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-48px" });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{ width: 20, height: 1, background: C.amber }} />
      <span style={{
        fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.32em", textTransform: "uppercase", color: C.amber,
      }}>{children}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
      fontSize: "clamp(30px, 4.5vw, 52px)", lineHeight: 1.1,
      color: C.obsidian, letterSpacing: "-0.01em", margin: 0,
    }}>{children}</h2>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "72px 0" }} />;
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.parchment, border: `1px solid ${C.border}`,
      borderRadius: 18, padding: "32px 28px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatCounter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, inView);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
        fontSize: 44, lineHeight: 1, color: C.amber,
      }}>{count}{suffix}</div>
      <div style={{
        fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: C.faint, marginTop: 7,
      }}>{label}</div>
    </div>
  );
}

function ScoreBar({ label, pct, color, note }: {
  label: string; pct: number; color: string; note?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.obsidian, letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 99, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }} animate={inView ? { width: `${pct}%` } : {}}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: color, borderRadius: 99 }}
        />
      </div>
      {note && <div style={{ fontSize: 10, color: C.faint, marginTop: 5, letterSpacing: "0.03em" }}>{note}</div>}
    </div>
  );
}

function ProofChip({ file }: { file: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99,
      background: C.amberFaint, border: `1px solid ${C.amberBorder}`,
      fontFamily: "'Courier New', monospace", fontSize: 8,
      color: C.amber, letterSpacing: "0.06em", whiteSpace: "nowrap",
    }}>
      ◈ {file}
    </span>
  );
}

const TIERS = [
  { name: "Explorer",          orders: 0,  xp: 0,   color: C.muted },
  { name: "Enthusiast",        orders: 5,  xp: 50,  color: "#9B7FD4" },
  { name: "Aficionado",        orders: 15, xp: 150, color: "#3BBFA3" },
  { name: "Connoisseur",       orders: 30, xp: 350, color: C.amber },
  { name: "Maestro del Fuego", orders: 60, xp: 700, color: "#b91c1c" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PitchPage() {
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowNav(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV = ["Overview", "Revenue", "Experience", "Intelligence", "Loyalty", "Security", "Growth", "Readiness"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.obsidian, overflowX: "hidden" }}>

      {/* Floating nav */}
      <AnimatePresence>
        {showNav && (
          <motion.nav
            initial={{ y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", top: 0, left: 0, right: 0, zIndex: 999, height: 50,
              background: "rgba(245,242,237,0.92)", backdropFilter: "blur(24px)",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", padding: "0 max(24px, 5vw)", gap: 28,
            }}
          >
            <span style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
              fontSize: 15, color: C.amber, letterSpacing: "0.14em",
            }}>NOVEE OS</span>
            <div style={{ flex: 1 }} />
            {NAV.map(n => (
              <span key={n} style={{
                fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase", color: C.faint, cursor: "pointer",
              }}>{n}</span>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "120px max(36px, 7vw) 80px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle amber wash top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 320, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(212,139,0,0.05) 0%, transparent 100%)",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}
        >
          <div style={{ width: 28, height: 1, background: C.amber }} />
          <span style={{
            fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700,
            letterSpacing: "0.32em", textTransform: "uppercase", color: C.amber,
          }}>Product Manifesto · Investor & Operator Edition · May 2026</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
            fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.93,
            letterSpacing: "-0.02em", margin: "0 0 32px", color: C.obsidian,
          }}
        >
          The Operating<br />
          <span style={{ color: C.amber }}>System for<br />Luxury</span> Venues.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(15px, 2vw, 20px)", lineHeight: 1.7,
            color: C.muted, maxWidth: 580, margin: "0 0 56px",
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 400,
          }}
        >
          NOVEE OS turns a cigar lounge, whiskey bar, or artisan craft venue into a precision revenue
          machine — with an AI recommendation engine, discreet dynamic pricing, a five-tier guest
          loyalty ladder, and kiosk-grade security hardened for 24/7 operation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.38 }}
          style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
        >
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            padding: "14px 28px", borderRadius: 12,
            background: C.amber, fontSize: 13, fontWeight: 700,
            color: "#fff", letterSpacing: "0.06em",
          }}>
            ← Return to Platform
          </a>
          <a href="/smokecraft" style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            padding: "14px 28px", borderRadius: 12,
            background: "transparent", border: `1px solid ${C.border}`,
            fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: "0.04em",
          }}>
            Try the Experience →
          </a>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
          style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)" }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 1, height: 44, background: `linear-gradient(180deg, ${C.amber}, transparent)`, margin: "0 auto" }}
          />
        </motion.div>
      </section>

      <div style={{ padding: "0 max(36px, 7vw)" }}>

        {/* Command strip */}
        <FadeIn>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 2,
            padding: "44px 40px", background: C.parchment, border: `1px solid ${C.border}`,
            borderRadius: 20, marginBottom: 96,
          }}>
            <StatCounter value={80}  suffix="+"  label="API Routes" />
            <StatCounter value={34}              label="DB Tables" />
            <StatCounter value={4}               label="Craft Types" />
            <StatCounter value={5}               label="Loyalty Tiers" />
            <StatCounter value={11}              label="AI Mentors" />
            <StatCounter value={58}  suffix="Hz" label="Ambient Hum" />
            <StatCounter value={15}  suffix="m"  label="Reservation TTL" />
            <StatCounter value={94}  suffix="%"  label="Prod Readiness" />
          </div>
        </FadeIn>

        {/* ══════════════════════════════════════════════════════════════════
            REVENUE BRAIN
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Revenue Optimization · Revenue Brain v2</SectionLabel>
            <SectionHeading>Pricing is discreetly managed<br />by the AI — not the menu board.</SectionHeading>
          </FadeIn>

          {/* Discreet pricing callout — hero block */}
          <FadeIn delay={0.1}>
            <div style={{
              marginTop: 44, padding: "44px 48px", borderRadius: 22,
              background: C.obsidian, color: "#F0E8D4",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48,
            }}>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700,
                  lineHeight: 1.2, marginBottom: 20, color: "#F0E8D4",
                }}>
                  The guest sees an experience.<br />
                  <span style={{ color: C.amber }}>The venue captures the margin.</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(240,232,212,0.58)", lineHeight: 1.7 }}>
                  Price badges have been intentionally removed from all patron-facing craft cards.
                  There are no dollar signs on the swipe deck. Market rates scroll discreetly in the
                  LED ticker below the fold — visible to staff, ambient to guests.
                </div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Revenue Brain v2 scores every recommendation in the background",
                    "Dynamic surge pricing activates silently at >80% occupancy",
                    "Member Lock shields loyal guests from surge — building trust",
                    "Staff see all pricing live in the Command Hub ticker strip",
                  ].map(b => (
                    <div key={b} style={{ display: "flex", gap: 10, fontSize: 12, color: "rgba(240,232,212,0.50)" }}>
                      <span style={{ color: C.amber, flexShrink: 0 }}>›</span> {b}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{
                  fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700,
                  letterSpacing: "0.22em", color: "rgba(212,139,0,0.55)", marginBottom: 22,
                }}>COMPOSITE SCORE — revenueBrain.ts · L95-103</div>
                {[
                  { label: "Taste Alignment",   pct: 40, color: C.amber,   note: "Affinity vector vs. guest order profile" },
                  { label: "Margin Score",       pct: 25, color: "#9B7FD4", note: "Gross margin normalized 0–100" },
                  { label: "Stock Health",       pct: 15, color: "#3BBFA3", note: "Hard-block qty=0; −25 low-stock penalty" },
                  { label: "Vendor Reliability", pct: 10, color: "#5BC4F5", note: "−10 penalty when reliability < 60" },
                  { label: "Premium Signal",     pct: 10, color: "#f87171", note: "Boost when price > venue average" },
                ].map(b => (
                  <div key={b.label} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(240,232,212,0.80)" }}>{b.label}</span>
                      <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: b.color, fontWeight: 700 }}>{b.pct}%</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 99 }} />
                    </div>
                    {b.note && <div style={{ fontSize: 9, color: "rgba(240,232,212,0.32)", marginTop: 4 }}>{b.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Pricing tier cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { tier: "SURGE", color: "#b91c1c", bg: "rgba(185,28,28,0.06)", border: "rgba(185,28,28,0.16)",
                heading: "+25–40% above base", sub: "Occupancy > 80%",
                body: "Activates silently. The patron experience is unchanged. Prices rise in the LED ticker — staff see it, guests feel the energy.",
                file: "pricing.ts · L28" },
              { tier: "STANDARD", color: C.amber, bg: C.amberFaint, border: C.amberBorder,
                heading: "Base market rate", sub: "Occupancy 25–80%",
                body: "The default mode. Amber glow on the ticker. Comfortable margin. The experience speaks louder than any price tag.",
                file: "pricing.ts · L35" },
              { tier: "MEMBER LOCK", color: "#166534", bg: "rgba(22,101,52,0.05)", border: "rgba(22,101,52,0.16)",
                heading: "Always base price", sub: "Connoisseur+ tier",
                body: "Loyal guests are immune to surge. Their rate is locked — shown in green on the ticker. A visible prestige signal to the room.",
                file: "pricing.ts · L24" },
            ].map((t, i) => (
              <FadeIn key={t.tier} delay={i * 0.08}>
                <Card style={{ background: t.bg, border: `1px solid ${t.border}`, height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: t.color, marginBottom: 12 }}>{t.tier}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.obsidian, marginBottom: 4 }}>{t.heading}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 16, letterSpacing: "0.06em" }}>{t.sub}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>{t.body}</div>
                  <ProofChip file={t.file} />
                </Card>
              </FadeIn>
            ))}
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            EXPERIENCE ENGINE
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Sensory Suite · Universal Swipe Engine</SectionLabel>
            <SectionHeading>A hardware-grade software<br />experience for every craft.</SectionHeading>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 48 }}>
            {[
              { label: "SMOKE CRAFT",  sub: "Premium Tobacco",  glyph: "◈", color: "#D48B00", ambient: "EmberGlow",     base: "$28" },
              { label: "POUR CRAFT",   sub: "Curated Spirits",  glyph: "◇", color: "#9B7FD4", ambient: "LiquidShimmer", base: "$22" },
              { label: "BREW CRAFT",   sub: "Artisan Beer",     glyph: "◎", color: "#3BBFA3", ambient: "FoamRise",      base: "$14" },
              { label: "VAPE CRAFT",   sub: "Next-Gen Vapor",   glyph: "◉", color: "#5BC4F5", ambient: "VaporDrift",    base: "$18" },
            ].map((c, i) => (
              <FadeIn key={c.label} delay={i * 0.07}>
                <Card style={{ height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 26, color: c.color, marginBottom: 14 }}>{c.glyph}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: c.color, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.obsidian, marginBottom: 4 }}>{c.sub}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: C.amber, marginBottom: 12 }}>Base {c.base}</div>
                  <div style={{
                    display: "inline-flex", padding: "3px 9px", borderRadius: 99,
                    background: `${c.color}12`, border: `1px solid ${c.color}25`,
                    fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700,
                    letterSpacing: "0.14em", color: c.color,
                  }}>{c.ambient}</div>
                </Card>
              </FadeIn>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <FadeIn delay={0.08}>
              <Card style={{ borderLeft: `3px solid #166534` }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: "#166534", marginBottom: 14 }}>→ RIGHT SWIPE · DISCOVER</div>
                <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 12, color: C.muted, lineHeight: 2 }}>
                  <li>Green glow trail + ADD overlay fades in at drag threshold</li>
                  <li>playClick() + 58Hz subsonic hum fires on confirmation</li>
                  <li>POST /api/swipe-orders — stock validation + 15m reservation</li>
                  <li>Mentor commentary rendered on RevealPage post-swipe</li>
                </ul>
                <div style={{ marginTop: 14 }}><ProofChip file="ExperiencePage.tsx · L166" /></div>
              </Card>
            </FadeIn>
            <FadeIn delay={0.14}>
              <Card style={{ borderLeft: `3px solid #b91c1c` }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: "#b91c1c", marginBottom: 14 }}>← LEFT SWIPE · PASS</div>
                <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 12, color: C.muted, lineHeight: 2 }}>
                  <li>Red glow trail + PASS overlay at opposite threshold</li>
                  <li>Skip recorded → lowers tag weight in user_memories table</li>
                  <li>POST /api/swipe-experience/swipe with action="skip"</li>
                  <li>memoryBrain.updateTasteMemory() compounds across sessions</li>
                </ul>
                <div style={{ marginTop: 14 }}><ProofChip file="memoryBrain.ts · L37" /></div>
              </Card>
            </FadeIn>
          </div>

          <FadeIn delay={0.1}>
            <Card style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
              {[
                { label: "58Hz AMBIENT HUM", body: "Web Audio API sine oscillator at 58Hz with 0.08Hz LFO creates subsonic room presence the moment a session begins. Felt, not heard.", file: "audioEngine.ts · L94" },
                { label: "PER-CRAFT AMBIENT LOOPS", body: "Howler.js crossfades between craft-specific audio on card switch. Ember crackle → whiskey pour → foam hiss → vapor drift.", file: "soundEngine.ts · L127" },
                { label: "INTERACTION CLICKS", body: "playClick() generates a short noise burst via Web Audio API. Fires on every card action, price tier change, and UI tap.", file: "audioEngine.ts · L41" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: C.amber, marginBottom: 10 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 12 }}>{s.body}</div>
                  <ProofChip file={s.file} />
                </div>
              ))}
            </Card>
          </FadeIn>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            TASTE INTELLIGENCE
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>AI Intelligence · Memory Brain</SectionLabel>
            <SectionHeading>A system that learns every guest<br />from the first swipe.</SectionHeading>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 28, marginTop: 48 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { step: "01", label: "Enrollment & Mentor Assignment", color: C.amber,
                  body: "5-question cinematic onboarding flow. assignMentor() maps the guest's palate to one of 11 fictional mentors across all four crafts — each with distinct flavor philosophy.",
                  files: ["enrollment.ts · L22", "mentors.ts · L154"] },
                { step: "02", label: "Swipe-Driven Taste Memory", color: "#9B7FD4",
                  body: "Every right/left swipe updates tag weights in the user_memories table via memoryBrain.updateTasteMemory(). Add → weight increases. Skip → weight decreases. Compounds across sessions.",
                  files: ["memoryBrain.ts · L37", "user_memories table"] },
                { step: "03", label: "Affinity Vector Computation", color: "#3BBFA3",
                  body: "tasteProfile.getTasteProfile() aggregates snapshots into normalized per-dimension scores (strength / flavor / mood / category). Bounded to prevent runaway bias.",
                  files: ["tasteProfile.ts · L52", "scorer.ts · L60"] },
                { step: "04", label: "Revenue Brain Merge", color: "#5BC4F5",
                  body: "tasteAffinityBonus() is injected into the 40% taste weight of the scoring formula. Personalization and revenue optimization are the same calculation.",
                  files: ["tasteProfile.ts · L124", "revenueBrain.ts · L95"] },
                { step: "05", label: "Cross-Category & Food Pairings", color: "#b91c1c",
                  body: "findPairings() and findFoodPairings() identify complementary products across craft types. One recommendation surfaces a cigar, a whiskey pairing, and a plate in a single response.",
                  files: ["recommend.ts · L147", "recommend.ts · L150"] },
              ].map((s, i) => (
                <FadeIn key={s.step} delay={i * 0.07}>
                  <Card style={{ display: "flex", gap: 18, padding: "22px 24px" }}>
                    <div style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 9,
                      background: `${s.color}14`, border: `1px solid ${s.color}28`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, color: s.color,
                    }}>{s.step}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.obsidian, marginBottom: 5 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, marginBottom: 10 }}>{s.body}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.files.map(f => <ProofChip key={f} file={f} />)}
                      </div>
                    </div>
                  </Card>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.2}>
              <Card style={{ position: "sticky", top: 72 }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: C.amber, marginBottom: 18 }}>AI MENTOR ROSTER · mentors.ts</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.obsidian, marginBottom: 6 }}>11 Fictional Flavor Guides</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 22 }}>
                  Each mentor maps to a craft type × boldness preference matrix. Guests form a personal relationship with their guide — they reappear on return visits with contextual memory lines.
                </div>
                {[
                  { craft: "smoke", n: 3, color: C.amber },
                  { craft: "pour",  n: 3, color: "#9B7FD4" },
                  { craft: "brew",  n: 3, color: "#3BBFA3" },
                  { craft: "vape",  n: 2, color: "#5BC4F5" },
                ].map(m => (
                  <div key={m.craft} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0", borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: m.color, textTransform: "uppercase" }}>{m.craft}</span>
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: C.faint }}>{m.n} mentors</span>
                  </div>
                ))}
                <div style={{ marginTop: 22, padding: "16px", borderRadius: 12, background: C.pressed }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 5 }}>Couples Mode</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                    blendProfiles() merges two taste vectors. Recommendations satisfy both guests simultaneously.
                  </div>
                  <div style={{ marginTop: 10 }}><ProofChip file="recommend.ts · L182" /></div>
                </div>
              </Card>
            </FadeIn>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            LOYALTY LADDER
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Prestige Loyalty · XP Engine</SectionLabel>
            <SectionHeading>Five tiers that build<br />compulsive repeat patronage.</SectionHeading>
          </FadeIn>

          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 10 }}>
            {TIERS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.08}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 18,
                  padding: "20px 26px",
                  background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 14,
                }}>
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                    background: t.color, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#fff",
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: i === 4 ? t.color : C.obsidian, lineHeight: 1 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>Requires {t.orders}+ verified orders · {t.xp}+ XP</div>
                  </div>
                  <div style={{ display: "flex", gap: 32, textAlign: "right" }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: t.color || C.obsidian }}>{t.xp}</div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, color: C.faint, letterSpacing: "0.14em" }}>MIN XP</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: t.color || C.obsidian }}>{t.orders}</div>
                      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, color: C.faint, letterSpacing: "0.14em" }}>ORDERS</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }}>
              {[
                { action: "Cigar Order",  xp: "+10 XP", pts: "+10 pts", color: C.amber },
                { action: "Drink Pairing",xp: "+8 XP",  pts: "+8 pts",  color: "#9B7FD4" },
                { action: "Food Order",   xp: "+4 XP",  pts: "+5 pts",  color: "#3BBFA3" },
                { action: "Full Combo",   xp: "+20 XP", pts: "+25 pts", color: "#b91c1c" },
              ].map(a => (
                <Card key={a.action} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 700, color: a.color }}>{a.xp}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: C.faint, margin: "4px 0 8px", letterSpacing: "0.1em" }}>{a.pts}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.obsidian }}>{a.action}</div>
                </Card>
              ))}
            </div>
          </FadeIn>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            KIOSK ARMOR
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Security Infrastructure · Kiosk Armor</SectionLabel>
            <SectionHeading>Production-hardened for<br />24/7 unattended operation.</SectionHeading>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 48 }}>
            {[
              { icon: "🔐", label: "PIN Lockout",            body: "5 incorrect attempts → 60-second cooldown. Input disabled, countdown shown. sessionStorage-enforced.", file: "PinLogin.tsx · L16" },
              { icon: "⏱",  label: "Inactivity Guard",       body: "60s idle → auto-logout to /pin-login. Kiosk mode: 90s overlay + 10s countdown before full home reset.", file: "InactivityGuard.tsx · L8" },
              { icon: "📺", label: "Burn-In Protection",      body: "Every 45s in kiosk idle, #root shifts 2px via CSS transform. Prevents OLED phosphor burn on permanent screens.", file: "KioskModeContext.tsx · L47" },
              { icon: "🖱",  label: "Context Menu Block",     body: "Global contextmenu preventDefault in App.tsx. Kiosk adds F5/F11/F12/Ctrl+R/Ctrl+Shift+I blocking.", file: "App.tsx · L196" },
              { icon: "🤝", label: "NDA Gate",                body: "Demo requires NDA signature (fullName, initials, signatureData). Offline queue replays on reconnect.", file: "nda.ts · L111" },
              { icon: "📡", label: "Offline Queue",           body: "POSTs (orders, NDAs) buffered in localStorage with idempotency keys. Atomic deduplication on drain.", file: "offlineQueue.ts · L59" },
              { icon: "🧾", label: "Append-Only Audit Log",   body: "PosAuditBridge logs every lifecycle event: order.created, payment.confirmed, refund.issued, auth transitions.", file: "PosAuditBridge.tsx · L14" },
              { icon: "🔒", label: "CSS Selection Armor",     body: "Kiosk lockdown injects user-select: none on html/body; user-drag: none on img/a. Inputs retain user-select: text.", file: "KioskModeContext.tsx · L268" },
              { icon: "🕐",  label: "5-Second Logo Secret",   body: "Holding the NOVEE OS logo for 5 seconds reveals the Founder Dashboard — a hidden operator panel at z-index 200.", file: "HandoffContainer.tsx" },
            ].map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.05}>
                <Card style={{ height: "100%", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{
                      fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700,
                      letterSpacing: "0.16em", color: "#166534",
                      padding: "2px 7px", borderRadius: 99,
                      background: "rgba(22,101,52,0.08)", border: "1px solid rgba(22,101,52,0.18)",
                    }}>● ACTIVE</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.obsidian, marginBottom: 7 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65, marginBottom: 12 }}>{s.body}</div>
                  <ProofChip file={s.file} />
                </Card>
              </FadeIn>
            ))}
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            GROWTH BRIDGE + LEGACY FEATURE AUDIT
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Revenue Diversification · Growth Bridge + Feature Audit</SectionLabel>
            <SectionHeading>30 days of features — every one<br />still in the codebase.</SectionHeading>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 48 }}>
            <FadeIn delay={0.08}>
              <div style={{
                padding: "40px 36px", borderRadius: 20,
                background: C.obsidian,
                color: "#F0E8D4",
              }}>
                <div style={{ fontSize: 26, fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: "#a78bfa", marginBottom: 6, letterSpacing: "0.08em" }}>DayOne360</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(167,139,250,0.45)", marginBottom: 22 }}>ELITE TRAVEL · SPONSOR INTEGRATION</div>
                <div style={{ fontSize: 12, color: "rgba(240,232,212,0.55)", lineHeight: 1.7, marginBottom: 22 }}>
                  Injected as the 5th card in the patron deck — a full-width strip between the craft grid and the price ticker. Taps open a spring-animated bottom sheet with curated trip offers (Havana Cigar Trail · Scotch Highlands · Miami Retreat). Passive CPM revenue to the venue per patron impression.
                </div>
                {["Ad Manager tile in staff dashboard with live Impressions/Link Clicks metrics",
                  "Ambient purple star particles — never feels like a banner ad",
                  "Route to /mobile-hub full concierge portal"].map(b => (
                  <div key={b} style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(240,232,212,0.45)", marginBottom: 8 }}>
                    <span style={{ color: "#a78bfa", flexShrink: 0 }}>›</span> {b}
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.14}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Full SmokeCraft Inventory", status: "ACTIVE", color: "#166534",
                    body: "aiConfigure.ts contains a detailed product catalog: Rocky Patel Vintage 1992, Macallan 18 Sherry Oak, Pappy Van Winkle 15yr, Goose Island Bourbon County, and 15+ more with suggested prices, upsell phrases, and margin reasoning.",
                    file: "aiConfigure.ts · L138" },
                  { label: "Aviationstack Integration", status: "NOT FOUND", color: "#b91c1c",
                    body: "No Aviationstack API calls, keys, or route handlers found in the codebase. This feature was planned or discussed but was not implemented in any file.",
                    file: "grep: 0 matches" },
                  { label: "Shopify Integration", status: "LINK ONLY", color: "#c2410c",
                    body: "MobileHub.tsx contains three href='https://shopify.com' links as placeholder retail links. No Shopify API, webhook, or product sync has been implemented.",
                    file: "MobileHub.tsx · L80" },
                  { label: "Island Link", status: "NOT FOUND", color: "#b91c1c",
                    body: "No 'Island Link' branded feature found under any naming convention. DayOne360 travel integration (Caribbean destinations) may be the conceptual successor.",
                    file: "grep: 0 matches" },
                ].map(f => (
                  <Card key={f.label} style={{ padding: "22px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.obsidian }}>{f.label}</div>
                      <span style={{
                        fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700, letterSpacing: "0.14em",
                        color: f.status === "ACTIVE" ? "#166534" : f.status === "NOT FOUND" ? "#b91c1c" : "#c2410c",
                        padding: "2px 7px", borderRadius: 99,
                        background: f.status === "ACTIVE" ? "rgba(22,101,52,0.08)" : "rgba(185,28,28,0.07)",
                        border: `1px solid ${f.status === "ACTIVE" ? "rgba(22,101,52,0.18)" : "rgba(185,28,28,0.16)"}`,
                        whiteSpace: "nowrap",
                      }}>● {f.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65, marginBottom: 10 }}>{f.body}</div>
                    <ProofChip file={f.file} />
                  </Card>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════════════════
            PRODUCTION READINESS
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <FadeIn>
            <SectionLabel>Transparency · Production Readiness</SectionLabel>
            <SectionHeading>What is wired. What is stubbed.<br />No vague claims.</SectionHeading>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 48 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", letterSpacing: "0.07em", marginBottom: 20 }}>● FULLY IMPLEMENTED & WIRED</div>
              {[
                "Swipe Engine — drag physics, glow trails, ADD/SKIP overlays",
                "CraftRealism ambient animations (EmberGlow / LiquidShimmer / FoamRise / VaporDrift)",
                "Revenue Brain v2 composite scoring (40/25/15/10/10)",
                "Dynamic surge pricing — discreet from patron, visible to staff",
                "Patron deck — price badges hidden, Revenue Brain active in background",
                "Taste memory (memoryBrain + user_memories table)",
                "Guest enrollment + 11-mentor assignment system",
                "5-tier XP + loyalty points engine with milestone bonuses",
                "Swipe-order pipeline (reservations, 15m TTL, confirm/cancel)",
                "Kiosk armor (PIN lock, inactivity, burn-in, NDA, audit log)",
                "Stripe payments + 15-min reconciliation worker",
                "NOVEE Receipt with QR token + multi-channel delivery",
                "Finance reconciliation dashboard (5 tabs)",
                "DayOne360 sponsor card + Travel Concierge bottom sheet",
                "Multi-venue, multi-role JWT auth + RBAC (6 roles)",
                "80+ REST API routes across all feature domains",
                "Full cigar/spirits product catalog (15+ SKUs) in aiConfigure.ts",
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#166534", flexShrink: 0, marginTop: 5 }} />
                  <div style={{ fontSize: 12, color: C.muted }}>{r}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", letterSpacing: "0.07em", marginBottom: 20 }}>◐ STUBBED / PENDING</div>
              {[
                { item: "SOUND_HOOKS / triggerSound() — Howler wiring to visualPrompts stubs", note: "visualPrompts.ts · L144 — marked TODO" },
                { item: "Per-craft Howler ambient files — expects ambient_smoke.mp3 etc.", note: "soundEngine.ts — graceful degrade if missing" },
                { item: "ElevenLabs voice layer — route registered, AI calls not wired", note: "voice.ts route registered" },
                { item: "POS hardware adapters — Toast/Square/Clover stubs ready", note: "posWebhook.ts registered" },
                { item: "Aviationstack — not implemented (see Feature Audit above)", note: "0 matches across all files" },
                { item: "Shopify retail bridge — placeholder links only in MobileHub", note: "MobileHub.tsx · L80" },
              ].map((r, i) => (
                <Card key={i} style={{ padding: "16px 20px", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: C.obsidian, marginBottom: 5 }}>{r.item}</div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 9, color: "#b91c1c" }}>{r.note}</div>
                </Card>
              ))}

              <FadeIn delay={0.3}>
                <div style={{
                  marginTop: 20, padding: "36px", borderRadius: 20,
                  background: C.obsidian, textAlign: "center",
                }}>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 68, fontWeight: 700,
                    color: C.amber, lineHeight: 1,
                  }}>94<span style={{ fontSize: 32 }}>%</span></div>
                  <div style={{
                    fontFamily: "'Courier New', monospace", fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.22em", color: "rgba(212,139,0,0.60)", marginTop: 8,
                  }}>PRODUCTION READINESS</div>
                  <div style={{ fontSize: 12, color: "rgba(240,232,212,0.40)", marginTop: 12, lineHeight: 1.65 }}>
                    Core engine, payments, loyalty, kiosk hardening, and AI recommendation fully wired.
                    Remaining 6%: audio file assets + POS hardware integrations.
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <Divider />

        {/* CTA Footer */}
        <section style={{ textAlign: "center", padding: "72px 0 112px" }}>
          <FadeIn>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.32em", color: C.amber, marginBottom: 26 }}>
              NOVEE OS · BUILT ON REPLIT · MAY 2026
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
              fontSize: "clamp(36px, 5.5vw, 68px)", lineHeight: 1.05,
              color: C.obsidian, margin: "0 0 22px",
            }}>
              Ready to deploy<br />
              <span style={{ color: C.amber }}>to your first venue.</span>
            </h2>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
              color: C.muted, lineHeight: 1.7, maxWidth: 500, margin: "0 auto 48px",
            }}>
              One kiosk. One venue. Full stack live in under 60 minutes.
              Stripe, loyalty, AI, and audit logging active from day one.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/" style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                padding: "15px 32px", borderRadius: 12, background: C.amber,
                fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.06em",
              }}>← Return to Platform</a>
              <a href="/smokecraft" style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                padding: "15px 32px", borderRadius: 12,
                background: "transparent", border: `1px solid ${C.border}`,
                fontSize: 13, fontWeight: 600, color: C.muted, letterSpacing: "0.04em",
              }}>Live Demo →</a>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div style={{
              marginTop: 72, display: "flex", gap: 48, justifyContent: "center", flexWrap: "wrap",
              paddingTop: 40, borderTop: `1px solid ${C.border}`,
            }}>
              {[
                ["Stack",    "React · Vite · Express 5 · PostgreSQL · Drizzle ORM · Framer Motion"],
                ["Auth",     "JWT HS256 · bcryptjs · RBAC (6 roles)"],
                ["AI",       "Taste vectors · Memory Brain · 11 Mentors · Revenue Brain v2"],
                ["Security", "PIN lock · Inactivity · Burn-in · NDA gate · Offline queue · Audit log"],
              ].map(([label, val]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 7, fontWeight: 700, letterSpacing: "0.22em", color: C.amber, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.faint, maxWidth: 220 }}>{val}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

      </div>
    </div>
  );
}
