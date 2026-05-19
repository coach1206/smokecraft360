import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

export function ReentryGate() {
  const { profile, setPhase } = useGuest();
  const [lastName, setLastName] = useState("");
  const [phone4,   setPhone4]   = useState("");
  const [error,    setError]    = useState("");
  const [shake,    setShake]    = useState(false);

  function handleNew() { setPhase("s1_demo"); }

  function handleReturn() {
    const ok =
      profile.lastName.trim().length > 0 &&
      lastName.trim().toLowerCase() === profile.lastName.trim().toLowerCase() &&
      phone4.trim() === profile.phone4.trim();
    if (ok) {
      hapticMilestone();
      setPhase(profile.phase === "reentry" ? "s1_demo" : profile.phase);
    } else {
      hapticError();
      setError("Credentials not recognized — check name and digits.");
      setShake(true);
      setTimeout(() => setShake(false), 650);
    }
  }

  return (
    <div style={{
      position:       "absolute",
      inset:          0,
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      paddingTop:     48,
      fontFamily:     "'Inter', sans-serif",
    }}>

      {/* ── Full-bleed hero wordmark ── */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: "center", marginBottom: 60, zIndex: 2 }}
      >
        <div style={{
          fontSize:      11,
          letterSpacing: "0.60em",
          textTransform: "uppercase",
          fontWeight:    800,
          color:         `${GOLD}88`,
          marginBottom:  18,
        }}>
          SmokeCraft 360
        </div>
        <div style={{
          fontFamily:    "'Cormorant Garamond', Georgia, serif",
          fontSize:      "clamp(64px, 8vw, 110px)",
          fontWeight:    300,
          color:         "#F0E8D4",
          letterSpacing: "0.06em",
          lineHeight:    0.92,
          textShadow:    "0 0 80px rgba(212,175,55,0.22), 0 2px 40px rgba(0,0,0,0.80)",
        }}>
          The Lounge
        </div>
        {/* Gold rule */}
        <div style={{
          margin:     "22px auto 0",
          width:      340,
          height:     1,
          background: `linear-gradient(90deg, transparent, ${GOLD}88, transparent)`,
          boxShadow:  `0 0 12px rgba(212,175,55,0.30)`,
        }} />
      </motion.div>

      {/* ── Two-column panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ type: "spring", mass: 0.9, stiffness: 220, damping: 28, delay: 0.1 }}
        style={{
          display:        "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          width:          "min(880px, 92vw)",
          background:     "rgba(255,255,255,0.022)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border:         `1px solid rgba(212,175,55,0.20)`,
          borderRadius:   22,
          overflow:       "hidden",
          boxShadow:      "0 30px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* LEFT — New session */}
        <div style={{ padding: "48px 44px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.44em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 14 }}>
            First Visit
          </div>
          <h2 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      42,
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 12px",
            letterSpacing: "0.04em",
            lineHeight:    1.1,
          }}>
            Begin Your<br />Journey
          </h2>
          <p style={{
            color:      "rgba(240,232,212,0.38)",
            fontSize:   17,
            margin:     "0 0 36px",
            lineHeight: 1.55,
          }}>
            A full 4-session cigar science experience awaits. Earn points, unlock your blend, and push your name to the wall display.
          </p>
          <motion.button
            type="button"
            onPointerDown={handleNew}
            whileTap={{ scale: 0.97 }}
            style={{
              width:         "100%",
              padding:       "24px",
              background:    `linear-gradient(135deg, ${GOLD} 0%, #BF9800 55%, #9A7A14 100%)`,
              border:        "none",
              borderRadius:  14,
              color:         "#060400",
              fontSize:      18,
              fontWeight:    900,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              cursor:        "pointer",
              fontFamily:    "'Inter', sans-serif",
              boxShadow:     `0 0 48px rgba(212,175,55,0.32), 0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.22)`,
              position:      "relative",
              overflow:      "hidden",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "52%",
              background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, transparent 100%)",
              borderRadius: "14px 14px 0 0",
            }} />
            BEGIN NEW SESSION
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ background: "rgba(212,175,55,0.14)", alignSelf: "stretch" }} />

        {/* RIGHT — Returning guest */}
        <div style={{ padding: "48px 44px", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.44em", textTransform: "uppercase", color: `${GOLD}77`, fontWeight: 800, marginBottom: 14 }}>
            Returning Guest
          </div>
          <h2 style={{
            fontFamily:    "'Cormorant Garamond', Georgia, serif",
            fontSize:      42,
            fontWeight:    300,
            color:         "#F0E8D4",
            margin:        "0 0 24px",
            letterSpacing: "0.04em",
            lineHeight:    1.1,
          }}>
            Resume<br />Session
          </h2>

          <motion.div
            animate={shake ? { x: [-12, 12, -9, 9, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {[
              { val: lastName, set: setLastName, ph: "LAST NAME",     extra: {} },
              { val: phone4,   set: (v: string) => setPhone4(v.replace(/\D/g,"").slice(0,4)), ph: "LAST 4 DIGITS", extra: { letterSpacing: "0.30em" }, max: 4 },
            ].map(f => (
              <input key={f.ph} type="text" value={f.val}
                onChange={e => { f.set(e.target.value); setError(""); }}
                maxLength={(f as { max?: number }).max}
                placeholder={f.ph}
                style={{
                  padding:      "20px 22px",
                  background:   "rgba(255,255,255,0.04)",
                  border:       `1.5px solid ${error ? "rgba(200,50,42,0.60)" : "rgba(212,175,55,0.18)"}`,
                  borderRadius: 12,
                  color:        "#F0E8D4",
                  fontSize:     22,
                  fontWeight:   700,
                  fontFamily:   "'Inter', sans-serif",
                  outline:      "none",
                  boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.30)",
                  transition:   "border-color 0.22s",
                  ...f.extra,
                }}
              />
            ))}

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ color: "#C8322A", fontSize: 14, margin: "0", letterSpacing: "0.04em" }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button type="button" onPointerDown={handleReturn} whileTap={{ scale: 0.97 }}
              style={{
                marginTop:     4,
                padding:       "20px",
                background:    "rgba(212,175,55,0.07)",
                border:        `1.5px solid rgba(212,175,55,0.35)`,
                borderRadius:  12,
                color:         GOLD,
                fontSize:      17,
                fontWeight:    800,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                cursor:        "pointer",
                fontFamily:    "'Inter', sans-serif",
                boxShadow:     "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}>
              RETURN TO MY SESSION →
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Hardware kiosk ID */}
      <div style={{
        position:   "absolute",
        bottom:     18,
        fontSize:   9,
        letterSpacing: "0.36em",
        color:      "rgba(255,255,255,0.14)",
        textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
      }}>
        KIOSK UNIT · SC360-01 · TABLE ASSIGNMENT ACTIVE
      </div>
    </div>
  );
}
