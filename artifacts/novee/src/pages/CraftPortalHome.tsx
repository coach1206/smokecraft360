import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";
const IMG  = (n: string) => `${import.meta.env.BASE_URL}images/${n}`;

function playTactile() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 3400; o.type = "sine";
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.10);
  } catch { /* */ }
}

/* ── Pillar icons ── */
function IconCompass() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>; }
function IconChart()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconCraft()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 014 13C4 9 7.5 5 12 5c2.5 0 5 2 6 5-2 0-5 1-7 4"/><path d="M12 5v4M7 9c0 5 3 9 7 11"/></svg>; }
function IconStar()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }

const PILLARS = [
  { Icon: IconCompass, label: "DISCOVER",   sub: "Learn the leaf"    },
  { Icon: IconChart,   label: "ANALYZE",    sub: "Decode the blend"  },
  { Icon: IconCraft,   label: "CRAFT",      sub: "Build your profile" },
  { Icon: IconStar,    label: "EXPERIENCE", sub: "Score & refine"    },
];

/* ── Craft module switcher ── */
interface CraftModule {
  id: string;
  label: string;
  tag: string;
  accent: string;
  live: boolean;
}
const CRAFT_MODULES: CraftModule[] = [
  { id: "smoke",  label: "SmokeCraft 360",  tag: "SC",  accent: GOLD,      live: true  },
  { id: "pour",   label: "PourCraft 360",   tag: "PC",  accent: "#C87941", live: false },
  { id: "beer",   label: "BeerCraft 360",   tag: "BC",  accent: "#C8A041", live: false },
  { id: "vape",   label: "VapeCraft 360",   tag: "VC",  accent: "#6A9FD8", live: false },
];

export default function CraftPortalHome() {
  const { setPhase } = useGuest();
  const [activeCraft, setActiveCraft] = useState("smoke");
  const [showReturn,  setShowReturn]  = useState(false);
  const [retLast,     setRetLast]     = useState("");
  const [retPin,      setRetPin]      = useState("");

  function beginNew()      { playTactile(); hapticMilestone(); setPhase("s1_demo"); }
  function resumeSession() { setShowReturn(true); }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", background: "#040200", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ══════════ FULL-WIDTH HERO ══════════ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Full-bleed cigar hero */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 36%" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* Cinematic overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(4,2,0,0.28) 0%, rgba(4,2,0,0.45) 48%, rgba(4,2,0,0.12) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(0deg, rgba(2,1,0,0.98) 0%, rgba(2,1,0,0.75) 38%, transparent 100%)" }} />

        {/* ── Craft module switcher ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", flexDirection: "row", alignItems: "center",
          padding: "14px 32px", gap: 10,
          background: "linear-gradient(180deg, rgba(4,2,0,0.82) 0%, transparent 100%)",
        }}>
          {CRAFT_MODULES.map(mod => {
            const active = activeCraft === mod.id;
            return (
              <motion.button
                key={mod.id}
                type="button"
                onPointerDown={() => { if (mod.live) { playTactile(); setActiveCraft(mod.id); } }}
                whileTap={mod.live ? { scale: 0.95 } : {}}
                animate={{ background: active ? `rgba(212,175,55,0.18)` : "rgba(0,0,0,0.35)" }}
                transition={{ duration: 0.20 }}
                style={{
                  border: `1.5px solid ${active ? mod.accent + "99" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 9, padding: "8px 18px",
                  display: "flex", flexDirection: "row", alignItems: "center", gap: 10,
                  cursor: mod.live ? "pointer" : "default",
                  opacity: mod.live ? 1 : 0.42,
                  fontFamily: "'Inter',sans-serif",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: active ? `0 0 18px ${mod.accent}33` : "none",
                  position: "relative",
                }}
              >
                {/* Active underline */}
                {active && (
                  <div style={{
                    position: "absolute", bottom: -1, left: "15%", right: "15%", height: 2,
                    background: mod.accent, borderRadius: 2, boxShadow: `0 0 8px ${mod.accent}`,
                  }} />
                )}
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: active ? `${mod.accent}33` : "rgba(255,255,255,0.08)",
                  border: `1px solid ${active ? mod.accent + "66" : "rgba(255,255,255,0.12)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: active ? mod.accent : "rgba(255,255,255,0.55)", fontFamily: "'Inter',sans-serif" }}>{mod.tag}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 800 : 600, color: active ? mod.accent : "rgba(255,255,255,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{mod.label}</span>
                {!mod.live && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase", background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "2px 6px" }}>SOON</span>
                )}
              </motion.button>
            );
          })}

          {/* Breadcrumb label right side */}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.32em", color: `${GOLD}99`, fontWeight: 800, fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>SmokeCraft 360</span>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Kiosk Edition · NOVEE OS</span>
          </div>
        </div>

        {/* ── Bottom-anchored hero content ── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, padding: "0 52px 40px" }}
        >
          {/* Title */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 52, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.06, marginBottom: 2 }}>
            Welcome To
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 76, fontWeight: 700, color: GOLD, lineHeight: 0.96, marginBottom: 20, textShadow: `0 0 70px ${GOLD}44` }}>
            Smokecraft 360
          </div>

          {/* Gold ornament divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ height: 1, width: 36, background: `linear-gradient(90deg, transparent, ${GOLD}88)` }} />
            <svg width="14" height="14" viewBox="0 0 20 20" fill={GOLD} opacity={0.70}>
              <path d="M10 2C10 2 4 6 4 12c0 2.2 1.4 3.8 3.4 4.7 0-2.2 1.1-4.4 2.6-5.5-.6 2.3-.6 4.5 0 6.3.3.1.7.3 1 .3V2z"/>
              <path d="M10 2c0 0 6 4 6 10 0 2.2-1.4 3.8-3.4 4.7 0-2.2-1.1-4.4-2.6-5.5.6 2.3.6 4.5 0 6.3-.3.1-.7.3-1 .3V2z" opacity="0.6"/>
            </svg>
            <div style={{ height: 1, width: 52, background: `${GOLD}44` }} />
          </div>

          {/* Description */}
          <p style={{ fontSize: 22, color: "rgba(240,232,212,0.55)", lineHeight: 1.58, margin: "0 0 32px", fontWeight: 300 }}>
            A 4-session luxury cigar science journey.<br />
            Build your blend, earn your rank.
          </p>

          {/* 4 Pillars */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 36 }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 96 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: "50%",
                    background: "rgba(0,0,0,0.65)", border: `1.5px solid rgba(212,175,55,0.45)`,
                    backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 16px rgba(212,175,55,0.12)`,
                  }}><p.Icon /></div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center" }}>{p.label}</div>
                  <div style={{ fontSize: 13, color: "rgba(240,232,212,0.38)", textAlign: "center", lineHeight: 1.35 }}>{p.sub}</div>
                </div>
                {i < PILLARS.length - 1 && (
                  <div style={{ marginTop: 28, padding: "0 10px", fontSize: 18, color: "rgba(212,175,55,0.30)", lineHeight: 1 }}>·</div>
                )}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 500 }}>
            <motion.button type="button" onPointerDown={beginNew} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "22px 32px",
                background: `linear-gradient(135deg, ${GOLD} 0%, #C8960A 100%)`,
                border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 18, fontWeight: 800, color: "#090600",
                letterSpacing: "0.20em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: `0 6px 36px rgba(212,175,55,0.40), 0 2px 0 rgba(255,255,255,0.14) inset`,
              }}>
              <span>BEGIN NEW SESSION</span>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>→</div>
            </motion.button>

            <motion.button type="button" onPointerDown={resumeSession} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "20px 32px",
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
                border: `1px solid rgba(212,175,55,0.42)`, borderRadius: 6, cursor: "pointer",
                fontSize: 17, fontWeight: 700, color: "rgba(240,232,212,0.70)",
                letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif", textAlign: "center",
              }}>
              RESUME SESSION
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ══════════ RESUME SESSION DRAWER ══════════ */}
      <AnimatePresence>
        {showReturn && (
          <motion.div key="return-drawer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.30 }}
            onClick={() => setShowReturn(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(20px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, background: "rgba(8,5,2,0.98)", border: `1px solid rgba(212,175,55,0.24)`, borderRadius: "16px 16px 0 0", padding: "32px 32px 44px" }}>
              <div style={{ fontSize: 12, letterSpacing: "0.40em", color: `${GOLD}60`, textTransform: "uppercase", textAlign: "center", marginBottom: 10, fontFamily: "'Inter',sans-serif" }}>Returning Guest</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, color: "#F0E8D4", textAlign: "center", margin: "0 0 24px" }}>Welcome Back</h3>
              {[
                { ph: "LAST NAME",     val: retLast, fn: setRetLast,  type: "text" },
                { ph: "LAST 4 DIGITS", val: retPin,  fn: (v: string) => setRetPin(v.replace(/\D/g,"").slice(0,4)), type: "tel" },
              ].map(f => (
                <input key={f.ph} type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.fn(e.target.value)}
                  style={{ width: "100%", padding: "18px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(212,175,55,0.22)`, borderRadius: 6, color: "#F0E8D4", fontSize: 20, outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "'Inter',sans-serif", letterSpacing: "0.06em" }} />
              ))}
              <button type="button" onClick={() => { setShowReturn(false); setPhase("s1_demo"); }}
                style={{ width: "100%", padding: "20px", background: "rgba(212,175,55,0.16)", border: `1.5px solid ${GOLD}55`, borderRadius: 6, color: GOLD, fontSize: 17, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                Find My Session →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
