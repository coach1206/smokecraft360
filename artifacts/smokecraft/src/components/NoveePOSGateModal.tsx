import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playClick } from "@/hooks/useNoveeAudio";
import { hapticMilestone, hapticError } from "@/hooks/useNoveeHaptic";

const GOLD = "#D4AF37";
const VALID_CODES = ["SC360", "SMOKE1", "LOUNGE", "FERMENT"];

interface Props {
  onUnlock: (code: string) => void;
}

export function NoveePOSGateModal({ onUnlock }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  function attempt() {
    playClick();
    const normalized = code.trim().toUpperCase();
    if (VALID_CODES.includes(normalized)) {
      hapticMilestone();
      onUnlock(normalized);
    } else {
      hapticError();
      setError("Receipt code not recognized. Ask your server for the code printed on your receipt.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.88)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 8000,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    }}>
      <motion.div
        animate={shake ? { x: [-14, 14, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.42 }}
        style={{
          background: "#0D0D12",
          border: `1.5px solid ${GOLD}55`,
          borderRadius: 20,
          padding: "52px 52px 44px",
          maxWidth: 540,
          width: "90%",
          boxShadow: `0 0 80px rgba(212,175,55,0.18), 0 24px 60px rgba(0,0,0,0.70)`,
          textAlign: "center",
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `rgba(212,175,55,0.10)`,
          border: `2px solid ${GOLD}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 28px",
          fontSize: 28,
        }}>
          🔒
        </div>

        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 34,
          fontWeight: 400,
          color: "#F0E8D4",
          margin: "0 0 10px",
          letterSpacing: "0.04em",
        }}>
          Receipt Validation
        </h2>
        <p style={{
          color: "rgba(240,232,212,0.45)",
          fontSize: 18,
          margin: "0 0 36px",
          lineHeight: 1.5,
          fontFamily: "'Inter', sans-serif",
        }}>
          Enter the code from your table receipt to ferment your seeds and unlock Session 2.
        </p>

        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") attempt(); }}
          placeholder="RECEIPT CODE"
          style={{
            width: "100%",
            padding: "20px 24px",
            background: "rgba(255,255,255,0.04)",
            border: `1.5px solid ${error ? "#C8322A" : `${GOLD}44`}`,
            borderRadius: 12,
            color: "#F0E8D4",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "0.22em",
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                color: "#C8322A",
                fontSize: 15,
                margin: "12px 0 0",
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.4,
              }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onPointerDown={attempt}
          whileTap={{ scale: 0.96 }}
          style={{
            marginTop: 28,
            width: "100%",
            padding: "20px",
            background: `linear-gradient(135deg, ${GOLD} 0%, #9A7A14 100%)`,
            border: "none",
            borderRadius: 12,
            color: "#0A0604",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            boxShadow: `0 0 28px rgba(212,175,55,0.30)`,
          }}
        >
          UNLOCK SESSION 2
        </motion.button>
      </motion.div>
    </div>
  );
}
