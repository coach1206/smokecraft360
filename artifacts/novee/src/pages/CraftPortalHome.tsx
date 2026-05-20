import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";

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
  } catch { /* non-blocking */ }
}

const NAV_ITEMS = [
  { id: "lounge",   icon: "⌂",  label: "LOUNGE"   },
  { id: "sessions", icon: "◫",  label: "SESSIONS"  },
  { id: "blends",   icon: "❧",  label: "BLENDS"    },
  { id: "library",  icon: "⊟",  label: "LIBRARY"   },
  { id: "profile",  icon: "◎",  label: "PROFILE"   },
  { id: "settings", icon: "⚙",  label: "SETTINGS"  },
];

const PILLARS = [
  { icon: "◉", label: "DISCOVER",   sub: "Learn the leaf"    },
  { icon: "▦", label: "ANALYZE",    sub: "Decode the blend"  },
  { icon: "❧", label: "CRAFT",      sub: "Build your profile"},
  { icon: "✦", label: "EXPERIENCE", sub: "Score & refine"    },
];

export default function CraftPortalHome() {
  const { setPhase } = useGuest();
  const [activeNav, setActiveNav] = useState("lounge");
  const [showReturn, setShowReturn] = useState(false);
  const [retLast, setRetLast] = useState("");
  const [retPin,  setRetPin]  = useState("");

  function beginNew() { playTactile(); setPhase("reentry"); }
  function resumeSession() { setShowReturn(true); }
  function handleReturn() {
    if (retLast.trim() && retPin.length === 4) {
      setShowReturn(false); setPhase("reentry");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", overflow: "hidden", background: "#060402", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <div style={{
        width: 180, flexShrink: 0,
        background: "#080600",
        borderRight: `1px solid rgba(212,175,55,0.14)`,
        display: "flex", flexDirection: "column",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
          <div style={{ fontSize: 26, color: GOLD, marginBottom: 6, lineHeight: 1 }}>❧</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1.2 }}>
            SmokeCraft 360
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "rgba(212,175,55,0.38)", textTransform: "uppercase", marginTop: 3 }}>
            Kiosk Edition
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.map(item => {
            const active = activeNav === item.id;
            return (
              <motion.button key={item.id} type="button"
                onPointerDown={() => {
                  playTactile();
                  setActiveNav(item.id);
                  if (item.id === "settings") setPhase("eat_dashboard");
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px",
                  background: active ? `rgba(212,175,55,0.14)` : "transparent",
                  borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent",
                  fontFamily: "'Inter',sans-serif",
                  transition: "background 0.18s, border-color 0.18s",
                }}>
                <span style={{ fontSize: 17, color: active ? GOLD : "rgba(255,255,255,0.30)", transition: "color 0.18s" }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: active ? 800 : 600, color: active ? GOLD : "rgba(255,255,255,0.35)", letterSpacing: "0.10em", textTransform: "uppercase", transition: "color 0.18s" }}>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(212,175,55,0.08)" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.14)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(240,232,212,0.50)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Table Kiosk</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
              <span style={{ fontSize: 11, color: "#32B45A", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ MAIN HERO AREA ══════════ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* Cigar hero photo — full bleed */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%", zIndex: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* Dark cinematic overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(4,2,0,0.72) 0%, rgba(4,2,0,0.55) 42%, rgba(4,2,0,0.20) 100%)", zIndex: 1 }} />
        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(0deg, rgba(4,2,0,0.88) 0%, transparent 100%)", zIndex: 2 }} />

        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 36px", zIndex: 10 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.40em", color: "rgba(212,175,55,0.65)", textTransform: "uppercase", fontWeight: 800 }}>SmokeCraft 360</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, letterSpacing: "0.28em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>Table Kiosk · Active</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 10px #32B45A" }} />
          </div>
        </div>

        {/* Main content — bottom-left anchored */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, padding: "0 56px 52px", maxWidth: 680 }}>

          {/* Title */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 52, fontWeight: 400, color: "#F0E8D4", lineHeight: 1.08, marginBottom: 4 }}>
            Welcome to
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 72, fontWeight: 700, color: GOLD, lineHeight: 1.0, marginBottom: 22, textShadow: `0 0 60px ${GOLD}44` }}>
            The Lounge
          </div>

          {/* Gold ornament divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div style={{ height: 1, width: 60, background: `linear-gradient(90deg, transparent, ${GOLD}88)` }} />
            <span style={{ fontSize: 14, color: GOLD, opacity: 0.75 }}>❧</span>
            <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${GOLD}55, transparent)` }} />
          </div>

          {/* Description */}
          <p style={{ fontSize: 20, color: "rgba(240,232,212,0.60)", lineHeight: 1.60, margin: "0 0 36px", fontWeight: 300 }}>
            A 4-session luxury cigar science journey.<br />
            Build your blend, earn your rank.
          </p>

          {/* 4 Pillars */}
          <div style={{ display: "flex", gap: 36, marginBottom: 40, alignItems: "flex-start" }}>
            {PILLARS.map((p, i) => (
              <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                {i > 0 && (
                  <div style={{ position: "absolute", top: 28, left: -18, width: 36, height: 1, background: "rgba(212,175,55,0.20)" }} />
                )}
                <div style={{
                  width: 62, height: 62, borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)",
                  border: `1.5px solid ${GOLD}55`,
                  backdropFilter: "blur(10px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, color: GOLD,
                  boxShadow: `0 0 20px rgba(212,175,55,0.15)`,
                }}>{p.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center" }}>{p.label}</div>
                <div style={{ fontSize: 13, color: "rgba(240,232,212,0.40)", textAlign: "center" }}>{p.sub}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
            <motion.button type="button" onPointerDown={beginNew} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "22px 32px",
                background: `linear-gradient(135deg, ${GOLD} 0%, #B8900A 100%)`,
                border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 18, fontWeight: 800, color: "#0A0600",
                letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                boxShadow: `0 8px 40px rgba(212,175,55,0.38), 0 2px 0 rgba(255,255,255,0.12) inset`,
              }}>
              <span>BEGIN NEW SESSION</span>
              <span style={{ fontSize: 20, marginLeft: 12 }}>→</span>
            </motion.button>
            <motion.button type="button" onPointerDown={resumeSession} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "20px 32px",
                background: "rgba(0,0,0,0.40)", backdropFilter: "blur(12px)",
                border: `1px solid rgba(212,175,55,0.38)`, borderRadius: 6, cursor: "pointer",
                fontSize: 17, fontWeight: 700, color: "rgba(240,232,212,0.75)",
                letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: "'Inter',sans-serif",
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
            transition={{ duration: 0.35 }}
            onClick={() => setShowReturn(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(18px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, background: "rgba(8,6,2,0.98)", border: `1px solid rgba(212,175,55,0.24)`, borderRadius: "16px 16px 0 0", padding: "32px 32px 44px", backdropFilter: "blur(20px)" }}>
              <div style={{ fontSize: 12, letterSpacing: "0.40em", color: `${GOLD}60`, textTransform: "uppercase", textAlign: "center", marginBottom: 12 }}>Returning Guest</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 600, color: "#F0E8D4", textAlign: "center", margin: "0 0 24px" }}>Welcome Back</h3>
              <input placeholder="Last Name" value={retLast} onChange={e => setRetLast(e.target.value)}
                style={{ width: "100%", padding: "18px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(212,175,55,0.22)`, borderRadius: 6, color: "#F0E8D4", fontSize: 20, outline: "none", boxSizing: "border-box", marginBottom: 14, fontFamily: "'Inter',sans-serif" }} />
              <input placeholder="Last 4 digits of phone" maxLength={4} value={retPin} onChange={e => setRetPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                style={{ width: "100%", padding: "18px 20px", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(212,175,55,0.22)`, borderRadius: 6, color: "#F0E8D4", fontSize: 20, outline: "none", boxSizing: "border-box", marginBottom: 24, fontFamily: "'Inter',sans-serif" }} />
              <button type="button" onClick={handleReturn}
                style={{ width: "100%", padding: "20px", background: "rgba(212,175,55,0.16)", border: `1px solid ${GOLD}55`, borderRadius: 6, color: GOLD, fontSize: 16, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                Find My Session →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
