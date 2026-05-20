import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

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

const PILLARS = [
  { icon: "❧", label: "DISCOVER",   sub: "Learn the leaf"       },
  { icon: "⚗", label: "ANALYZE",    sub: "Decode the blend"     },
  { icon: "✂", label: "CRAFT",      sub: "Build your profile"   },
  { icon: "⊕", label: "EXPERIENCE", sub: "Score on the room"    },
];

export default function CraftPortalHome() {
  const { setPhase, updateProfile } = useGuest();
  const [lastName, setLastName]     = useState("");
  const [pin,      setPin]          = useState("");
  const [dateStr,  setDateStr]      = useState("");
  const [error,    setError]        = useState(false);

  function beginNew() {
    playTactile();
    hapticMilestone();
    setPhase("reentry");
  }

  function resumeSession() {
    if (!lastName.trim() || pin.length < 4) {
      hapticError();
      setError(true);
      setTimeout(() => setError(false), 900);
      return;
    }
    playTactile();
    hapticMilestone();
    updateProfile({ lastName: lastName.trim(), phone4: pin.trim() });
    setPhase("s1_demo");
  }

  function returnSession() {
    playTactile();
    hapticMilestone();
    setPhase("s1_demo");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", overflow: "hidden",
      background: "#050300", fontFamily: "'Inter',-apple-system,sans-serif",
    }}>

      {/* ══════════════ LEFT — HERO PHOTO PANEL ══════════════ */}
      <div style={{ flex: "0 0 55%", position: "relative", overflow: "hidden" }}>

        {/* Full-bleed cigar hero photo */}
        <img src={IMG("cigar_hero.png")} alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />

        {/* Dark cinematic overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(4,2,0,0.30) 0%, rgba(4,2,0,0.45) 45%, rgba(4,2,0,0.75) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(0deg, rgba(2,1,0,0.96) 0%, rgba(2,1,0,0.70) 40%, transparent 100%)" }} />

        {/* Amber ember glow top-left */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "55%", height: "50%", background: "radial-gradient(ellipse at 10% 10%, rgba(212,140,30,0.14) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* ── Top-left logo ── */}
        <div style={{ position: "absolute", top: 24, left: 28, zIndex: 10 }}>
          <div style={{ fontSize: 18, color: GOLD, marginBottom: 4, lineHeight: 1 }}>❧</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, letterSpacing: "0.16em", textTransform: "uppercase", lineHeight: 1.2 }}>SmokeCraft 360</div>
          <div style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(212,175,55,0.40)", textTransform: "uppercase", marginTop: 2 }}>Kiosk Edition</div>
        </div>

        {/* ── Hero title area — bottom-left ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.80, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 36px 28px", zIndex: 5 }}>

          {/* WELCOME TO label */}
          <div style={{ fontSize: 13, letterSpacing: "0.42em", color: "rgba(212,175,55,0.75)", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
            Welcome to
          </div>

          {/* "The" */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 82, fontWeight: 400, color: "#F0E8D4", lineHeight: 0.9, marginBottom: 2 }}>
            The
          </div>
          {/* "Lounge" */}
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 88, fontWeight: 700, color: GOLD, lineHeight: 0.95, marginBottom: 18, textShadow: `0 0 80px ${GOLD}44` }}>
            Lounge
          </div>

          {/* Gold ornament divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ height: 1, width: 28, background: `linear-gradient(90deg, transparent, ${GOLD}88)` }} />
            <span style={{ fontSize: 14, color: GOLD, opacity: 0.70 }}>❧</span>
            <div style={{ height: 1, width: 44, background: `${GOLD}44` }} />
          </div>

          {/* Description */}
          <p style={{ fontSize: 20, color: "rgba(240,232,212,0.55)", lineHeight: 1.58, margin: "0 0 28px", fontWeight: 300, maxWidth: 380 }}>
            A 4-session luxury cigar science journey.<br />Build your blend, earn your rank.
          </p>

          {/* 4 Pillars */}
          <div style={{ display: "flex", gap: 30, marginBottom: 24, alignItems: "flex-start" }}>
            {PILLARS.map(p => (
              <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(0,0,0,0.60)", border: `1.5px solid ${GOLD}50`,
                  backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color: GOLD, boxShadow: `0 0 18px rgba(212,175,55,0.14)`,
                }}>{p.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F0E8D4", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center" }}>{p.label}</div>
                <div style={{ fontSize: 12, color: "rgba(240,232,212,0.38)", textAlign: "center", lineHeight: 1.35 }}>{p.sub}</div>
              </div>
            ))}
          </div>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#32B45A", boxShadow: "0 0 8px #32B45A" }} />
            <span style={{ fontSize: 13, letterSpacing: "0.24em", color: "rgba(240,232,212,0.38)", textTransform: "uppercase" }}>Table Kiosk · Active</span>
          </div>
        </motion.div>
      </div>

      {/* ══════════════ RIGHT — ACTION PANEL ══════════════ */}
      <div style={{
        flex: 1, position: "relative", display: "flex", flexDirection: "column",
        background: "#080502",
        borderLeft: `1px solid rgba(212,175,55,0.20)`,
        overflow: "hidden",
      }}>
        {/* Gold top border line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88, ${GOLD}55, transparent)`, zIndex: 2 }} />
        {/* Gold bottom border line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}55, ${GOLD}88, transparent)`, zIndex: 2 }} />
        {/* Subtle texture overlay */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.018, backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.7) 1px, transparent 2px, transparent 16px)", pointerEvents: "none" }} />

        <motion.div initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, overflowY: "auto", padding: "44px 40px 40px", display: "flex", flexDirection: "column" }}>

          {/* ── BEGIN YOUR JOURNEY ── */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 54, fontWeight: 600, color: "#F0E8D4", margin: "0 0 14px", lineHeight: 1.0, letterSpacing: "0.02em" }}>
              Begin Your<br />Journey
            </h1>
            <p style={{ fontSize: 18, color: "rgba(240,232,212,0.48)", lineHeight: 1.60, margin: "0 0 28px", fontWeight: 300 }}>
              <span style={{ color: `${GOLD}CC`, fontWeight: 600 }}>New session</span> — 4 stages, fully tracked,<br />with live scoring on the room display.
            </p>

            {/* BEGIN NEW SESSION button */}
            <motion.button type="button" onPointerDown={beginNew} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "20px 28px",
                background: "rgba(212,175,55,0.10)", border: `1.5px solid ${GOLD}88`,
                borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontFamily: "'Inter',sans-serif",
                boxShadow: `0 0 30px rgba(212,175,55,0.12), inset 0 1px 0 rgba(212,175,55,0.10)`,
                transition: "background 0.22s, box-shadow 0.22s",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(212,175,55,0.16)", border: `1px solid ${GOLD}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: GOLD }}>❧</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: GOLD, letterSpacing: "0.20em", textTransform: "uppercase" }}>Begin New Session</span>
              </div>
              <span style={{ fontSize: 22, color: GOLD }}>→</span>
            </motion.button>
          </div>

          {/* ── DIVIDER ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}33)` }} />
            <span style={{ fontSize: 11, letterSpacing: "0.44em", color: "rgba(212,175,55,0.50)", textTransform: "uppercase", fontWeight: 700 }}>Returning Guest</span>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}33, transparent)` }} />
          </div>

          {/* ── RESUME YOUR LAST SESSION ── */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 38, fontWeight: 600, color: "#F0E8D4", margin: "0 0 22px", lineHeight: 1.10, letterSpacing: "0.02em" }}>
              Resume Your Last Session
            </h2>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ padding: "14px 18px", background: "rgba(180,40,40,0.16)", border: "1px solid rgba(200,50,50,0.30)", borderRadius: 6, color: "#FF8080", fontSize: 17, marginBottom: 16, fontFamily: "'Inter',sans-serif" }}>
                  Last name and 4-digit code are required.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {/* LAST NAME */}
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(200,50,50,0.50)" : "rgba(212,175,55,0.22)"}`, borderRadius: 6, overflow: "hidden", transition: "border-color 0.20s" }}>
                <div style={{ padding: "0 18px", fontSize: 18, color: "rgba(212,175,55,0.45)", flexShrink: 0 }}>◎</div>
                <input type="text" placeholder="LAST NAME" value={lastName} onChange={e => setLastName(e.target.value)}
                  style={{ flex: 1, padding: "18px 18px 18px 0", background: "transparent", border: "none", outline: "none", color: "#F0E8D4", fontSize: 17, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }} />
              </div>
              {/* LAST 4 DIGITS */}
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(200,50,50,0.50)" : "rgba(212,175,55,0.22)"}`, borderRadius: 6, overflow: "hidden", transition: "border-color 0.20s" }}>
                <div style={{ padding: "0 18px", fontSize: 18, color: "rgba(212,175,55,0.45)", flexShrink: 0 }}>#</div>
                <input type="tel" placeholder="LAST 4 DIGITS" value={pin} maxLength={4} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={{ flex: 1, padding: "18px 18px 18px 0", background: "transparent", border: "none", outline: "none", color: "#F0E8D4", fontSize: 17, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }} />
              </div>
              {/* DATE OF LAST SESSION */}
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ padding: "0 18px", fontSize: 18, color: "rgba(212,175,55,0.45)", flexShrink: 0 }}>◫</div>
                <input type="text" placeholder="DATE OF LAST SESSION" value={dateStr} onChange={e => setDateStr(e.target.value)}
                  style={{ flex: 1, padding: "18px 18px 18px 0", background: "transparent", border: "none", outline: "none", color: "#F0E8D4", fontSize: 17, fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em" }} />
              </div>
            </div>

            {/* RESUME SESSION button */}
            <motion.button type="button" onPointerDown={resumeSession} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "18px 28px", marginBottom: 12,
                background: "rgba(212,175,55,0.08)", border: `1.5px solid ${GOLD}66`,
                borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontFamily: "'Inter',sans-serif",
                boxShadow: `0 0 20px rgba(212,175,55,0.08)`,
              }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: GOLD, letterSpacing: "0.20em", textTransform: "uppercase" }}>Resume Session</span>
              <span style={{ fontSize: 20, color: GOLD }}>→</span>
            </motion.button>

            {/* RETURN TO MY SESSION button */}
            <motion.button type="button" onPointerDown={returnSession} whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "18px 28px",
                background: "transparent", border: "1px solid rgba(212,175,55,0.28)",
                borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontFamily: "'Inter',sans-serif",
              }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(240,232,212,0.50)", letterSpacing: "0.16em", textTransform: "uppercase" }}>Return to My Session</span>
              <span style={{ fontSize: 18, color: "rgba(212,175,55,0.45)" }}>⊙</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
