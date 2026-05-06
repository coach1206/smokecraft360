import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

const MOCK_USERS = [
  { pin: "1206", name: "JC Collins",       role: "owner",   email: "jccollins1206@yahoo.com" },
  { pin: "1111", name: "Jordan Mitchell",  role: "owner" },
  { pin: "2222", name: "Alex Rivera",      role: "manager" },
  { pin: "3333", name: "Casey Thompson",   role: "staff" },
];

const KEYS    = ["1","2","3","4","5","6","7","8","9","CLR","0","GO"];
const MAX_PIN = 4;
const MAX_ATTEMPTS    = 5;
const LOCKOUT_SECONDS = 60;

function getLockoutState(): { attempts: number; lockedUntil: number | null } {
  try {
    const raw = sessionStorage.getItem("smokecraft_pin_lockout");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { attempts: parsed.attempts ?? 0, lockedUntil: parsed.lockedUntil ?? null };
    }
  } catch {}
  return { attempts: 0, lockedUntil: null };
}

function saveLockoutState(attempts: number, lockedUntil: number | null) {
  try {
    sessionStorage.setItem("smokecraft_pin_lockout", JSON.stringify({ attempts, lockedUntil }));
  } catch {}
}

export default function PinLogin() {
  const [, navigate]            = useLocation();
  const { setCurrentUser }      = usePosContext();
  const cc                      = useCommandCenter();
  const [pin, setPin]           = useState("");
  const [error, setError]       = useState(false);
  const [success, setSuccess]   = useState<string | null>(null);

  const initial = getLockoutState();
  const [failedAttempts, setFailedAttempts] = useState(initial.attempts);
  const [lockedUntil, setLockedUntil]       = useState<number | null>(initial.lockedUntil);
  const [lockCountdown, setLockCountdown]   = useState(0);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        saveLockoutState(0, null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleKey = useCallback((key: string) => {
    if (success || isLocked) return;
    setError(false);

    if (key === "CLR") { setPin(""); return; }

    if (key === "GO") {
      const user = MOCK_USERS.find(u => u.pin === pin);
      if (!user) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        cc.addAuditEntry("auth.pin_failed", `Failed PIN attempt (${newAttempts}/${MAX_ATTEMPTS})`);
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(until);
          saveLockoutState(newAttempts, until);
          cc.addAuditEntry("auth.lockout", `PIN lockout activated — ${LOCKOUT_SECONDS}s cooldown`);
        } else {
          saveLockoutState(newAttempts, null);
        }
        setError(true);
        setTimeout(() => { setError(false); setPin(""); }, 800);
        return;
      }

      setFailedAttempts(0);
      saveLockoutState(0, null);
      setCurrentUser(user);
      setSuccess(user.role);
      cc.addAuditEntry("auth.pin_login", `${user.name} logged in via PIN (${user.role})`, user.name);
      setTimeout(() => {
        navigate(user.role === "staff" ? "/pos" : "/dashboard");
      }, 900);
      return;
    }

    if (pin.length < MAX_PIN) setPin(prev => prev + key);
  }, [pin, success, isLocked, failedAttempts, setCurrentUser, navigate, cc]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9")                          { handleKey(e.key);  return; }
      if (e.key === "Backspace" || e.key === "Delete")           { handleKey("CLR");  return; }
      if (e.key === "Enter")                                      { handleKey("GO");   return; }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const dotColor = error ? "#ef4444" : success ? "#34d399" : "#d4af37";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>

      {/* Full-bleed background image */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/images/lounge-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: "scale(1.04)",
          pointerEvents: "none",
        }}
      />

      {/* Dark vignette overlay for readability */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(10,8,6,0.55) 0%, rgba(10,8,6,0.82) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Back button */}
      <motion.button
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "absolute", top: 24, left: 24,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12, padding: "10px 18px",
          color: "rgba(232,224,200,0.7)", fontSize: 14,
          cursor: "pointer", zIndex: 10,
        }}
      >
        <ArrowLeft size={16} />
        Back
      </motion.button>

      {/* Glassmorphism PIN panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 380,
          margin: "0 16px",
          background: "rgba(18,14,10,0.72)",
          border: "1px solid rgba(212,175,55,0.18)",
          borderRadius: 24,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08) inset",
          padding: "40px 32px 36px",
          textAlign: "center",
        }}
      >
        {/* Header */}
        <div style={{
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.24em",
          color: "rgba(212,175,55,0.6)", marginBottom: 6,
        }}>Venue Access</div>
        <h1 style={{
          fontSize: 26, fontWeight: 600, color: "#d4af37", margin: "0 0 28px",
          fontFamily: "'Playfair Display', serif",
          textShadow: "0 2px 12px rgba(212,175,55,0.25)",
        }}>Enter PIN</h1>

        {/* Dots */}
        <motion.div
          animate={error ? { x: [0, -10, 10, -7, 7, 0] } : {}}
          transition={{ duration: 0.35 }}
          style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 28 }}
        >
          {Array.from({ length: MAX_PIN }).map((_, i) => (
            <motion.div
              key={i}
              animate={pin.length > i ? { scale: [1, 1.35, 1] } : {}}
              transition={{ duration: 0.14 }}
              style={{
                width: 18, height: 18, borderRadius: "50%",
                background:  pin.length > i ? dotColor : "rgba(255,255,255,0.06)",
                border:      `2px solid ${pin.length > i ? dotColor : "rgba(255,255,255,0.15)"}`,
                boxShadow:   pin.length > i ? `0 0 10px ${dotColor}60` : "none",
                transition:  "all 0.15s ease",
              }}
            />
          ))}
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {isLocked && (
            <motion.div key="locked"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginBottom: 16, padding: "12px 16px", borderRadius: 10,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <Lock size={15} color="#ef4444" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Account Locked</div>
                <div style={{ fontSize: 12, color: "rgba(239,68,68,0.7)" }}>
                  Try again in {lockCountdown}s
                </div>
              </div>
            </motion.div>
          )}
          {!isLocked && error && (
            <motion.div key="error"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginBottom: 16, fontSize: 13, color: "#ef4444", fontWeight: 500 }}
            >
              Invalid PIN — {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining
            </motion.div>
          )}
          {success && (
            <motion.div key="success"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16, fontSize: 13, color: "#34d399", fontWeight: 500 }}
            >
              Welcome! Signing in as {success}…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          opacity: isLocked ? 0.35 : 1,
          pointerEvents: isLocked ? "none" : "auto",
          transition: "opacity 0.3s",
        }}>
          {KEYS.map(key => {
            const isGo    = key === "GO";
            const isClear = key === "CLR";
            const isAction = isGo || isClear;
            const goReady = isGo && pin.length === MAX_PIN && !success;

            return (
              <motion.button
                key={key}
                onClick={() => handleKey(key)}
                disabled={!!success || isLocked}
                whileHover={{ scale: 1.04, brightness: 1.1 }}
                whileTap={{ scale: 0.91 }}
                style={{
                  minHeight: 72,
                  fontSize:   isAction ? 13 : 26,
                  fontWeight: isAction ? 700 : 300,
                  letterSpacing: isAction ? "0.12em" : "0",
                  fontFamily: isAction ? "inherit" : "'Playfair Display', serif",
                  background: goReady
                    ? "linear-gradient(135deg, #d4af37 0%, #a98828 100%)"
                    : isGo
                    ? "rgba(212,175,55,0.08)"
                    : isClear
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(255,255,255,0.05)",
                  color: goReady
                    ? "#0a0806"
                    : isGo
                    ? "rgba(212,175,55,0.45)"
                    : isClear
                    ? "rgba(239,68,68,0.75)"
                    : "#e8e0c8",
                  border: `1px solid ${
                    goReady
                      ? "rgba(212,175,55,0.5)"
                      : isGo
                      ? "rgba(212,175,55,0.14)"
                      : isClear
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  borderRadius: 14,
                  cursor: "pointer",
                  transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
                  boxShadow: goReady ? "0 4px 20px rgba(212,175,55,0.3)" : "none",
                }}
              >
                {key}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Wordmark */}
      <div style={{
        position: "absolute", bottom: 20,
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.22em",
        color: "rgba(232,224,200,0.2)", pointerEvents: "none", zIndex: 10,
      }}>
        Powered by Axiom OS
      </div>
    </div>
  );
}
