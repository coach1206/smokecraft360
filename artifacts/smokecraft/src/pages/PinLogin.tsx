import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";

const MOCK_USERS = [
  { pin: "1111", name: "Jordan Mitchell", role: "owner" },
  { pin: "2222", name: "Alex Rivera", role: "manager" },
  { pin: "3333", name: "Casey Thompson", role: "staff" },
];

const KEYS = ["1","2","3","4","5","6","7","8","9","CLR","0","GO"];
const MAX_PIN = 4;

export default function PinLogin() {
  const [, navigate] = useLocation();
  const { setCurrentUser } = usePosContext();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleKey = useCallback((key: string) => {
    if (success) return;
    setError(false);

    if (key === "CLR") {
      setPin("");
      return;
    }

    if (key === "GO") {
      const user = MOCK_USERS.find(u => u.pin === pin);
      if (!user) {
        setError(true);
        setTimeout(() => { setError(false); setPin(""); }, 800);
        return;
      }
      setCurrentUser(user);
      setSuccess(user.role);
      setTimeout(() => {
        if (user.role === "staff") {
          navigate("/pos");
        } else {
          navigate("/dashboard");
        }
      }, 1000);
      return;
    }

    if (pin.length < MAX_PIN) {
      setPin(prev => prev + key);
    }
  }, [pin, success, setCurrentUser, navigate]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #1a1714 0%, #0f0d0a 50%, #141210 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative",
    }}>
      <motion.button
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "absolute", top: 24, left: 24,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "12px 20px",
          color: "rgba(232,224,200,0.5)", fontSize: 14,
          cursor: "pointer", minHeight: 48,
        }}
      >
        <ArrowLeft size={18} />
        Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: "center", marginBottom: 32 }}
      >
        <div style={{
          fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em",
          color: "rgba(212,175,55,0.5)", marginBottom: 8,
        }}>Venue Access</div>
        <h1 style={{
          fontSize: 28, fontWeight: 600, color: "#d4af37", margin: 0,
          fontFamily: "'Playfair Display', serif",
        }}>Enter PIN</h1>
      </motion.div>

      <motion.div
        animate={error ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex", gap: 16, marginBottom: 32, justifyContent: "center",
        }}
      >
        {Array.from({ length: MAX_PIN }).map((_, i) => (
          <motion.div
            key={i}
            animate={pin.length > i ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.15 }}
            style={{
              width: 20, height: 20, borderRadius: "50%",
              background: pin.length > i
                ? (error ? "#ef4444" : success ? "#34d399" : "#d4af37")
                : "rgba(255,255,255,0.08)",
              border: `2px solid ${pin.length > i
                ? (error ? "#ef4444" : success ? "#34d399" : "#d4af37")
                : "rgba(255,255,255,0.15)"}`,
              transition: "all 0.15s ease",
              boxShadow: pin.length > i
                ? `0 0 12px ${error ? "rgba(239,68,68,0.4)" : success ? "rgba(52,211,153,0.4)" : "rgba(212,175,55,0.4)"}`
                : "none",
            }}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginBottom: 16, fontSize: 14,
              color: "#ef4444", fontWeight: 500,
            }}
          >Invalid PIN — try again</motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 16, fontSize: 14,
              color: "#34d399", fontWeight: 500,
            }}
          >Welcome! Signing in as {success}...</motion.div>
        )}
      </AnimatePresence>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, maxWidth: 320, width: "100%",
      }}>
        {KEYS.map(key => {
          const isAction = key === "CLR" || key === "GO";
          const isGo = key === "GO";
          const isClear = key === "CLR";
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92, backgroundColor: isGo ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.12)" }}
              onClick={() => handleKey(key)}
              disabled={!!success}
              style={{
                minHeight: 80, fontSize: isAction ? 15 : 28,
                fontWeight: isAction ? 600 : 400,
                letterSpacing: isAction ? "0.1em" : "0",
                background: isGo
                  ? (pin.length === MAX_PIN ? "linear-gradient(135deg, #d4af37, #a98828)" : "rgba(212,175,55,0.12)")
                  : isClear ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                color: isGo
                  ? (pin.length === MAX_PIN ? "#0a0806" : "rgba(212,175,55,0.4)")
                  : isClear ? "rgba(239,68,68,0.7)" : "#e8e0c8",
                border: `1px solid ${isGo
                  ? "rgba(212,175,55,0.3)"
                  : isClear ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 16, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >{key}</motion.button>
          );
        })}
      </div>

      <div style={{
        marginTop: 32, display: "flex", gap: 24,
        fontSize: 12, color: "rgba(232,224,200,0.25)",
      }}>
        <span>Owner: 1111</span>
        <span>Manager: 2222</span>
        <span>Staff: 3333</span>
      </div>

      <div style={{
        position: "absolute", bottom: 20,
        fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.2em", color: "rgba(232,224,200,0.15)",
      }}>Powered by 360 Enterprise Services</div>
    </div>
  );
}
