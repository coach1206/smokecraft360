import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

export function ReentryGate() {
  const { profile, updateProfile, setPhase } = useGuest();
  const [lastName, setLastName] = useState("");
  const [phone4, setPhone4]     = useState("");
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);

  function handleNew() {
    setPhase("s1_demo");
  }

  function handleReturn() {
    const storedLast  = profile.lastName.trim().toLowerCase();
    const storedPhone = profile.phone4.trim();
    if (storedLast.length > 0 && lastName.trim().toLowerCase() === storedLast && phone4.trim() === storedPhone) {
      hapticMilestone();
      setPhase(profile.phase === "reentry" ? "s1_demo" : profile.phase);
    } else {
      hapticError();
      setError("Credentials not recognized. Check name and phone digits.");
      setShake(true);
      setTimeout(() => setShake(false), 700);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>

      {/* Top gold rim light */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${GOLD}88 30%, ${GOLD} 50%, ${GOLD}88 70%, transparent 100%)`,
        boxShadow: `0 0 40px 4px rgba(212,175,55,0.35)`,
      }} />

      {/* Central ambient glow */}
      <div style={{
        position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500,
        background: "radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.10) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ type: "spring", mass: 0.9, stiffness: 220, damping: 28 }}
        style={{ width: "100%", maxWidth: 700, padding: "0 40px", zIndex: 2 }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            fontSize:      10,
            letterSpacing: "0.55em",
            textTransform: "uppercase",
            fontWeight:    800,
            color:         `${GOLD}88`,
            marginBottom:  16,
          }}>
            SmokeCraft 360
          </div>
          <h1 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      "clamp(42px, 6vw, 72px)",
            fontWeight:    300,
            color:         "#F0E8D4",
            letterSpacing: "0.06em",
            margin:        0,
            lineHeight:    1,
            textShadow:    "0 0 60px rgba(212,175,55,0.20)",
          }}>
            The Lounge
          </h1>
          <div style={{
            marginTop: 14,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)`,
          }} />
        </div>

        {/* New Session — obsidian glass primary CTA */}
        <motion.button
          type="button"
          onPointerDown={handleNew}
          whileTap={{ scale: 0.97 }}
          style={{
            width:         "100%",
            padding:       "26px",
            background:    `linear-gradient(135deg, ${GOLD} 0%, #B8960A 60%, #9A7A14 100%)`,
            border:        "none",
            borderRadius:  14,
            color:         "#080501",
            fontSize:      22,
            fontWeight:    900,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            cursor:        "pointer",
            fontFamily:    "'Inter', sans-serif",
            marginBottom:  28,
            boxShadow:     `0 0 60px rgba(212,175,55,0.30), 0 8px 40px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22)`,
            position:      "relative",
            overflow:      "hidden",
          }}
        >
          {/* Button gloss */}
          <div style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
            borderRadius: "14px 14px 0 0",
          }} />
          BEGIN NEW SESSION
        </motion.button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(240,232,212,0.22)", fontWeight: 700 }}>
            RETURNING GUEST
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Return panel — obsidian glass card */}
        <motion.div
          animate={shake ? { x: [-14, 14, -10, 10, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            background:    "rgba(255,255,255,0.025)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border:        `1px solid rgba(212,175,55,${error ? "0.55" : "0.16"})`,
            borderRadius:  16,
            padding:       "28px",
            display:       "flex",
            flexDirection: "column",
            gap:           14,
            boxShadow:     "0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition:    "border-color 0.3s",
          }}
        >
          {[
            { val: lastName, set: setLastName, ph: "LAST NAME",           type: "text",     extra: {} },
            { val: phone4,   set: setPhone4,   ph: "LAST 4 DIGITS",       type: "text",     extra: { letterSpacing: "0.30em" } },
          ].map(f => (
            <input key={f.ph} type={f.type} value={f.val}
              onChange={e => {
                if (f.ph === "LAST 4 DIGITS") f.set(e.target.value.replace(/\D/g,"").slice(0,4));
                else f.set(e.target.value);
                setError("");
              }}
              maxLength={f.ph === "LAST 4 DIGITS" ? 4 : undefined}
              placeholder={f.ph}
              style={{
                padding:      "20px 22px",
                background:   "rgba(255,255,255,0.04)",
                border:       `1px solid ${error ? "rgba(200,50,42,0.55)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                color:        "#F0E8D4",
                fontSize:     22,
                fontWeight:   600,
                fontFamily:   "'Inter', sans-serif",
                outline:      "none",
                width:        "100%",
                boxSizing:    "border-box",
                transition:   "border-color 0.2s",
                ...f.extra,
              }}
            />
          ))}

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: "#C8322A", fontSize: 14, margin: 0, letterSpacing: "0.04em" }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="button" onPointerDown={handleReturn} whileTap={{ scale: 0.96 }}
            style={{
              padding:       "20px",
              background:    "rgba(212,175,55,0.08)",
              border:        `1.5px solid rgba(212,175,55,0.35)`,
              borderRadius:  10,
              color:         GOLD,
              fontSize:      18,
              fontWeight:    800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor:        "pointer",
              fontFamily:    "'Inter', sans-serif",
              boxShadow:     "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
            RETURN TO MY SESSION →
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Bottom hardware bar */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     3,
        background: `linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.40) 40%, ${GOLD}88 50%, rgba(212,175,55,0.40) 60%, transparent 100%)`,
      }} />
    </div>
  );
}
