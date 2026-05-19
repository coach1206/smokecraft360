import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { playClick } from "@/hooks/useAudio";
import { hapticMilestone, hapticError } from "@/hooks/useHaptic";

const GOLD = "#D4AF37";

export function ReentryGate() {
  const { profile, updateProfile, setPhase } = useGuest();
  const [lastName, setLastName] = useState("");
  const [phone4, setPhone4] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  function handleNew() {
    playClick();
    setPhase("s1_demo");
  }

  function handleReturn() {
    playClick();
    const storedLast = profile.lastName.trim().toLowerCase();
    const storedPhone = profile.phone4.trim();
    if (
      storedLast.length > 0 &&
      lastName.trim().toLowerCase() === storedLast &&
      phone4.trim() === storedPhone
    ) {
      hapticMilestone();
      setPhase(profile.phase === "reentry" ? "s1_demo" : profile.phase);
    } else {
      hapticError();
      setError("Name or phone digits not recognized. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Ambient radial */}
      <div style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 900,
        height: 420,
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 680,
          padding: "0 32px",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <p style={{
          fontSize: 11,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: `${GOLD}80`,
          fontWeight: 700,
          margin: "0 0 14px",
        }}>
          SmokeCraft 360 · Kiosk Experience
        </p>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(36px, 5vw, 58px)",
          fontWeight: 300,
          color: "#F0E8D4",
          letterSpacing: "0.06em",
          margin: "0 0 12px",
          lineHeight: 1.1,
        }}>
          Welcome to the Lounge
        </h1>
        <p style={{
          color: "rgba(240,232,212,0.40)",
          fontSize: 20,
          margin: "0 0 52px",
        }}>
          Begin your journey or return to your saved session.
        </p>

        {/* New session button */}
        <motion.button
          type="button"
          onPointerDown={handleNew}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            padding: "24px",
            background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
            border: "none",
            borderRadius: 14,
            color: "#0A0604",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            marginBottom: 24,
            boxShadow: `0 0 40px rgba(212,175,55,0.28)`,
          }}
        >
          BEGIN NEW SESSION
        </motion.button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 28,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{
            color: "rgba(240,232,212,0.28)",
            fontSize: 13,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}>
            RETURNING GUEST
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Return handshake */}
        <motion.div
          animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.42 }}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid rgba(212,175,55,0.18)`,
            borderRadius: 14,
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <input
            type="text"
            value={lastName}
            onChange={e => { setLastName(e.target.value); setError(""); }}
            placeholder="LAST NAME"
            style={{
              padding: "18px 20px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "#C8322A" : "rgba(212,175,55,0.22)"}`,
              borderRadius: 10,
              color: "#F0E8D4",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.10em",
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <input
            type="text"
            value={phone4}
            onChange={e => { setPhone4(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
            placeholder="LAST 4 DIGITS OF PHONE"
            maxLength={4}
            style={{
              padding: "18px 20px",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "#C8322A" : "rgba(212,175,55,0.22)"}`,
              borderRadius: 10,
              color: "#F0E8D4",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.22em",
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  color: "#C8322A",
                  fontSize: 15,
                  margin: 0,
                  textAlign: "left",
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onPointerDown={handleReturn}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "18px",
              background: "rgba(212,175,55,0.10)",
              border: `1.5px solid ${GOLD}55`,
              borderRadius: 10,
              color: GOLD,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            RETURN TO MY SESSION →
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
