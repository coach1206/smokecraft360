import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Lock, Wifi, Cpu, Activity, Shield } from "lucide-react";
import { usePosContext }      from "@/contexts/PosContext";
import { useCommandCenter }  from "@/contexts/CommandCenterContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { pin: "1206", name: "JC Collins",      role: "owner",   email: "jccollins1206@yahoo.com" },
  { pin: "1111", name: "Jordan Mitchell", role: "owner"   },
  { pin: "2222", name: "Alex Rivera",     role: "manager" },
  { pin: "3333", name: "Casey Thompson",  role: "staff"   },
];

const KEYS        = ["1","2","3","4","5","6","7","8","9","CLR","0","GO"];
const MAX_PIN     = 4;
const MAX_ATTEMPTS    = 5;
const LOCKOUT_SECONDS = 60;

const GOLD   = "#D48B00";
const CREAM  = "#F5F2ED";
const OBSIDIAN = "#07060A";
const GRAPHITE = "rgba(22,18,14,0.92)";

// ── Lockout helpers ───────────────────────────────────────────────────────────

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

// ── Ambient particles ─────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; size: number; delay: number; dur: number; }

function useParticles(count = 18): Particle[] {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: count }, (_, i) => ({
      id:    i,
      x:     Math.random() * 100,
      y:     Math.random() * 100,
      size:  1 + Math.random() * 2,
      delay: Math.random() * 6,
      dur:   8 + Math.random() * 10,
    }));
  }
  return ref.current;
}

// ── EEIS Status indicator ─────────────────────────────────────────────────────

const STATUS_ITEMS = [
  { label: "EEIS ONLINE",      icon: Shield,   ok: true  },
  { label: "AI ACTIVE",        icon: Cpu,      ok: true  },
  { label: "VENUE SYNC",       icon: Wifi,     ok: true  },
  { label: "SESSION RECOVERY", icon: Activity, ok: true  },
];

function EeisStatusBar() {
  return (
    <div style={{
      position: "absolute", top: 20, left: 0, right: 0,
      display: "flex", justifyContent: "center", gap: 12, zIndex: 20,
      flexWrap: "wrap", padding: "0 16px",
    }}>
      {STATUS_ITEMS.map(({ label, icon: Icon, ok }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + STATUS_ITEMS.findIndex(s => s.label === label) * 0.1, duration: 0.5 }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(212,139,0,0.06)",
            border: "1px solid rgba(212,139,0,0.14)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: Math.random() * 2 }}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: ok ? "#4ade80" : "#ef4444",
              boxShadow: ok ? "0 0 6px #4ade8099" : "0 0 6px #ef444499",
            }}
          />
          <Icon size={9} color={`rgba(212,139,0,0.55)`} />
          <span style={{
            fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(212,139,0,0.55)", fontWeight: 600,
          }}>
            {label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tactile keypad button ─────────────────────────────────────────────────────

function KeyButton({
  label, onPress, disabled, isGo, isClear, goReady,
}: {
  label: string; onPress: () => void; disabled: boolean;
  isGo: boolean; isClear: boolean; goReady: boolean;
}) {
  const [pressed, setPressed] = useState(false);

  const bg = goReady
    ? `linear-gradient(145deg, #D48B00 0%, #b8760a 55%, #8a5906 100%)`
    : isGo
    ? "rgba(212,139,0,0.07)"
    : isClear
    ? "rgba(239,68,68,0.07)"
    : "rgba(255,255,255,0.04)";

  const borderColor = goReady
    ? "rgba(212,139,0,0.6)"
    : isGo
    ? "rgba(212,139,0,0.18)"
    : isClear
    ? "rgba(239,68,68,0.22)"
    : "rgba(255,255,255,0.08)";

  const textColor = goReady
    ? CREAM
    : isGo
    ? "rgba(212,139,0,0.38)"
    : isClear
    ? "rgba(239,68,68,0.65)"
    : "rgba(245,242,237,0.82)";

  return (
    <motion.button
      onClick={() => { if (!disabled) { setPressed(true); onPress(); setTimeout(() => setPressed(false), 120); } }}
      disabled={disabled}
      animate={pressed ? { scale: 0.88, y: 3 } : { scale: 1, y: 0 }}
      whileHover={disabled ? {} : { scale: 1.03 }}
      transition={{ type: "spring", stiffness: 520, damping: 14 }}
      style={{
        minHeight: 72, position: "relative", overflow: "hidden",
        fontSize:   (!isGo && !isClear) ? 24 : 12,
        fontWeight: (!isGo && !isClear) ? 300 : 700,
        letterSpacing: isGo || isClear ? "0.14em" : "0",
        fontFamily: (!isGo && !isClear) ? "'Cormorant Garamond', serif" : "inherit",
        background: bg,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
        boxShadow: goReady
          ? "0 6px 28px rgba(212,139,0,0.38), 0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.5) inset"
          : "0 2px 10px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.05) inset, 0 -1px 0 rgba(0,0,0,0.4) inset",
      }}
    >
      {/* Edge highlight — top rim */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
        background: "rgba(255,255,255,0.07)", borderRadius: "0 0 2px 2px",
        pointerEvents: "none",
      }} />
      {/* Ripple on press */}
      <AnimatePresence>
        {pressed && (
          <motion.div
            initial={{ scale: 0, opacity: 0.45 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
            style={{
              position: "absolute", top: "50%", left: "50%",
              width: 40, height: 40, marginLeft: -20, marginTop: -20,
              borderRadius: "50%",
              background: goReady
                ? "radial-gradient(circle, rgba(212,139,0,0.55) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PinLogin() {
  const [, navigate]           = useLocation();
  const { setCurrentUser }     = usePosContext();
  const cc                     = useCommandCenter();
  const [pin, setPin]          = useState("");
  const [error, setError]      = useState(false);
  const [success, setSuccess]  = useState<string | null>(null);
  const particles              = useParticles(20);
  const bgControls             = useAnimation();

  const initial = getLockoutState();
  const [failedAttempts, setFailedAttempts] = useState(initial.attempts);
  const [lockedUntil, setLockedUntil]       = useState<number | null>(initial.lockedUntil);
  const [lockCountdown, setLockCountdown]   = useState(0);
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Ambient background breathing
  useEffect(() => {
    bgControls.start({
      scale:  [1, 1.018, 1],
      opacity: [0.85, 1, 0.85],
      transition: { duration: 9, repeat: Infinity, ease: "easeInOut" },
    });
  }, [bgControls]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) { setLockedUntil(null); setFailedAttempts(0); saveLockoutState(0, null); }
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
      setTimeout(() => { navigate(user.role === "staff" ? "/pos" : "/dashboard"); }, 900);
      return;
    }

    if (pin.length < MAX_PIN) setPin(prev => prev + key);
  }, [pin, success, isLocked, failedAttempts, setCurrentUser, navigate, cc]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { handleKey(e.key); return; }
      if (e.key === "Backspace" || e.key === "Delete") { handleKey("CLR"); return; }
      if (e.key === "Enter") { handleKey("GO"); return; }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const dotColor = error ? "#ef4444" : success ? "#4ade80" : GOLD;

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      background: OBSIDIAN,
    }}>

      {/* Ambient environment layer */}
      <motion.div
        animate={bgControls}
        aria-hidden
        style={{
          position: "absolute", inset: "-4%",
          backgroundImage: "url(/images/lounge-bg.jpg)",
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "brightness(0.22) saturate(0.6)",
          pointerEvents: "none",
        }}
      />

      {/* Warm amber radial vignette (center glow) */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 45% at 50% 56%, rgba(212,139,0,0.08) 0%, transparent 70%)",
      }} />

      {/* Top dark vignette */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)",
      }} />

      {/* Ambient particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          aria-hidden
          animate={{
            y:       [0, -18, 0],
            opacity: [0, p.size > 2 ? 0.35 : 0.18, 0],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left:     `${p.x}%`, top: `${p.y}%`,
            width:    p.size, height: p.size,
            borderRadius: "50%",
            background: GOLD,
            boxShadow:  `0 0 ${p.size * 3}px ${GOLD}55`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* EEIS status bar */}
      <EeisStatusBar />

      {/* Back button */}
      <motion.button
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          position: "absolute", top: 20, left: 20,
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 12, padding: "10px 16px",
          color: "rgba(245,242,237,0.4)", fontSize: 13,
          cursor: "pointer", zIndex: 20,
          backdropFilter: "blur(8px)",
        }}
      >
        <ArrowLeft size={14} />
        Back
      </motion.button>

      {/* PIN Panel */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 380, margin: "0 16px",
          background: GRAPHITE,
          border: "1px solid rgba(212,139,0,0.16)",
          borderRadius: 28,
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow: [
            "0 32px 80px rgba(0,0,0,0.7)",
            "0 0 0 1px rgba(255,255,255,0.04) inset",
            "0 1px 0 rgba(255,255,255,0.07) inset",
            `0 0 60px rgba(212,139,0,0.07)`,
          ].join(", "),
          padding: "36px 28px 32px",
          textAlign: "center",
        }}
      >
        {/* Top edge highlight */}
        <div style={{
          position: "absolute", top: 0, left: "12%", right: "12%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.35), transparent)",
          borderRadius: "0 0 2px 2px",
        }} />

        {/* System label */}
        <div style={{
          fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase",
          color: "rgba(212,139,0,0.38)", marginBottom: 4, fontWeight: 600,
        }}>
          AXIOM OS · EEIS
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 22, fontWeight: 400, color: CREAM,
          margin: "0 0 4px",
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: "0.04em",
        }}>
          Operational Authentication
        </h1>

        {/* Sub-label */}
        <div style={{
          fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(245,242,237,0.2)", marginBottom: 28,
        }}>
          Venue Access · Verified Identity
        </div>

        {/* PIN dots */}
        <motion.div
          animate={error ? { x: [0, -9, 9, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.38 }}
          style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28 }}
        >
          {Array.from({ length: MAX_PIN }).map((_, i) => (
            <motion.div
              key={i}
              animate={pin.length > i
                ? { scale: [1, 1.4, 1], boxShadow: [`0 0 0px ${dotColor}00`, `0 0 14px ${dotColor}90`, `0 0 8px ${dotColor}55`] }
                : {}}
              transition={{ duration: 0.16 }}
              style={{
                width: 16, height: 16, borderRadius: "50%",
                background:  pin.length > i ? dotColor : "rgba(255,255,255,0.07)",
                border:      `1.5px solid ${pin.length > i ? dotColor : "rgba(255,255,255,0.13)"}`,
                boxShadow:   pin.length > i ? `0 0 10px ${dotColor}70` : "none",
                transition:  "background 0.15s, border-color 0.15s",
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
                marginBottom: 14, padding: "11px 14px", borderRadius: 12,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <Lock size={13} color="#ef4444" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>
                  ACCESS SUSPENDED
                </div>
                <div style={{ fontSize: 11, color: "rgba(239,68,68,0.55)", letterSpacing: "0.04em" }}>
                  Resume in {lockCountdown}s
                </div>
              </div>
            </motion.div>
          )}
          {!isLocked && error && (
            <motion.div key="error"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginBottom: 14, fontSize: 11, color: "rgba(239,68,68,0.75)",
                fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
              }}
            >
              INVALID CREDENTIAL — {MAX_ATTEMPTS - failedAttempts} remaining
            </motion.div>
          )}
          {success && (
            <motion.div key="success"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 14, fontSize: 11, color: "#4ade80",
                fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
              }}
            >
              ● IDENTITY CONFIRMED · INITIALIZING SESSION
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          opacity: isLocked ? 0.25 : 1,
          pointerEvents: isLocked ? "none" : "auto",
          transition: "opacity 0.4s",
        }}>
          {KEYS.map(key => {
            const isGo    = key === "GO";
            const isClear = key === "CLR";
            const goReady = isGo && pin.length === MAX_PIN && !success;
            return (
              <KeyButton
                key={key}
                label={key}
                onPress={() => handleKey(key)}
                disabled={!!success || isLocked}
                isGo={isGo}
                isClear={isClear}
                goReady={goReady}
              />
            );
          })}
        </div>

        {/* Bottom edge separator */}
        <div style={{
          marginTop: 24, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.12), transparent)",
        }} />

        {/* Session indicator */}
        <div style={{
          marginTop: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ width: 4, height: 4, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade8099" }}
          />
          <span style={{
            fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(245,242,237,0.2)",
          }}>
            Environmental Intelligence Active
          </span>
        </div>
      </motion.div>

      {/* Wordmark */}
      <div style={{
        position: "absolute", bottom: 18,
        fontSize: 8, textTransform: "uppercase", letterSpacing: "0.28em",
        color: "rgba(212,139,0,0.2)", pointerEvents: "none", zIndex: 10,
      }}>
        Powered by Axiom OS · EEIS Infrastructure
      </div>
    </div>
  );
}
