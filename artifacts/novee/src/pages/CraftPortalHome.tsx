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

/* ── SVG-style icon components ── */
function IconHome()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>; }
function IconLayers()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }
function IconLeaf()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 014 13C4 9 7.5 5 12 5c2.5 0 5 2 6 5-2 0-5 1-7 4"/><path d="M12 5v4M7 9c0 5 3 9 7 11"/></svg>; }
function IconBook()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function IconUser()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconSettings() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }

/* Pillar icon SVGs */
function IconCompass()  { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>; }
function IconChart()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconCraft()    { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 014 13C4 9 7.5 5 12 5c2.5 0 5 2 6 5-2 0-5 1-7 4"/><path d="M12 5v4M7 9c0 5 3 9 7 11"/></svg>; }
function IconStar()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }

const NAV = [
  { id: "lounge",   label: "LOUNGE",   Icon: IconHome     },
  { id: "sessions", label: "SESSIONS", Icon: IconLayers   },
  { id: "blends",   label: "BLENDS",   Icon: IconLeaf     },
  { id: "library",  label: "LIBRARY",  Icon: IconBook     },
  { id: "profile",  label: "PROFILE",  Icon: IconUser     },
  { id: "settings", label: "SETTINGS", Icon: IconSettings },
];

const PILLARS = [
  { Icon: IconCompass, label: "DISCOVER",   sub: "Learn the leaf"   },
  { Icon: IconChart,   label: "ANALYZE",    sub: "Decode the blend" },
  { Icon: IconCraft,   label: "CRAFT",      sub: "Build your profile"},
  { Icon: IconStar,    label: "EXPERIENCE", sub: "Score & refine"   },
];

export default function CraftPortalHome() {
  const { setPhase } = useGuest();
  const [activeNav, setActiveNav] = useState("lounge");
  const [showReturn, setShowReturn] = useState(false);
  const [retLast,    setRetLast]    = useState("");
  const [retPin,     setRetPin]     = useState("");

  function beginNew() { playTactile(); hapticMilestone(); setPhase("reentry"); }
  function resumeSession() { setShowReturn(true); }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden", background: "#040200", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <div style={{
        width: 178, flexShrink: 0,
        background: "#060401",
        borderRight: `1px solid rgba(212,175,55,0.12)`,
        display: "flex", flexDirection: "column",
        zIndex: 10,
      }}>
        {/* Logo block */}
        <div style={{ padding: "26px 20px 22px" }}>
          {/* Leaf SVG logo */}
          <div style={{ marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <path d="M20 6C20 6 8 12 8 24c0 4 2.5 7 6 8.5 0-4 2-8 6-10-1 4-1 8 0 11.5.7.3 1.3.5 2 .6V6z" fill={GOLD} opacity="0.90"/>
              <path d="M20 6c0 0 12 6 12 18 0 4-2.5 7-6 8.5 0-4-2-8-6-10 1 4 1 8 0 11.5-.7.3-1.3.5-2 .6V6z" fill={GOLD} opacity="0.55"/>
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#F0E8D4", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.25 }}>SmokeCraft 360</div>
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(212,175,55,0.40)", textTransform: "uppercase", marginTop: 3 }}>Kiosk Edition</div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, paddingTop: 4 }}>
          {NAV.map(({ id, label, Icon }) => {
            const active = activeNav === id;
            return (
              <motion.button key={id} type="button"
                onPointerDown={() => {
                  playTactile();
                  setActiveNav(id);
                  if (id === "settings") setPhase("eat_dashboard");
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: "100%", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "15px 20px",
                  background: active ? "rgba(212,175,55,0.16)" : "transparent",
                  borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.32)",
                  fontFamily: "'Inter',sans-serif",
                  transition: "background 0.18s, color 0.18s, border-color 0.18s",
                }}>
                <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65, transition: "opacity 0.18s" }}><Icon /></span>
                <span style={{ fontSize: 14, fontWeight: active ? 800 : 600, letterSpacing: "0.12em", textTransform: "uppercase", transition: "color 0.18s" }}>{label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Status badge at bottom */}
        <div style={{ padding: "18px 16px 24px" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.14)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(240,232,212,0.45)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5 }}>Table Kiosk</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
              <span style={{ fontSize: 12, color: "#32B45A", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ MAIN HERO AREA ══════════ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Full-bleed cigar hero */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 36%" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* Cinematic overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(4,2,0,0.22) 0%, rgba(4,2,0,0.42) 48%, rgba(4,2,0,0.10) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "62%", background: "linear-gradient(0deg, rgba(2,1,0,0.97) 0%, rgba(2,1,0,0.72) 38%, transparent 100%)" }} />

        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 36px", zIndex: 10 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.44em", color: "rgba(212,175,55,0.70)", textTransform: "uppercase", fontWeight: 800 }}>SmokeCraft 360</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, letterSpacing: "0.26em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Table Kiosk · Active</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 10px #32B45A" }} />
          </div>
        </div>

        {/* Content — bottom-left anchored */}
        <motion.div
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, padding: "0 48px 44px" }}>

          {/* Title */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 50, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.06, marginBottom: 2 }}>
            Welcome to
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 72, fontWeight: 700, color: GOLD, lineHeight: 0.96, marginBottom: 20, textShadow: `0 0 70px ${GOLD}44` }}>
            The Lounge
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
          <p style={{ fontSize: 20, color: "rgba(240,232,212,0.55)", lineHeight: 1.58, margin: "0 0 32px", fontWeight: 300 }}>
            A 4-session luxury cigar science journey.<br />
            Build your blend, earn your rank.
          </p>

          {/* 4 Pillars with dot separators */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 36 }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 88 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: "50%",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
            {/* BEGIN NEW SESSION — solid gold */}
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

            {/* RESUME SESSION — outline */}
            <motion.button type="button" onPointerDown={resumeSession} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "20px 32px",
                background: "rgba(0,0,0,0.35)", backdropFilter: "blur(12px)",
                border: `1px solid rgba(212,175,55,0.42)`, borderRadius: 6, cursor: "pointer",
                fontSize: 17, fontWeight: 700, color: "rgba(240,232,212,0.70)",
                letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif",
                textAlign: "center",
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
                { ph: "LAST NAME",       val: retLast, fn: setRetLast,  type: "text" },
                { ph: "LAST 4 DIGITS",   val: retPin,  fn: (v: string) => setRetPin(v.replace(/\D/g,"").slice(0,4)), type: "tel" },
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
