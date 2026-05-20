import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const G   = "#D4AF37";
const RED = "#F07070";

export type PinRole = "staff" | "management" | "developer";

const STAFF_PINS  = new Set(["1234", "2580", "7890"]);
const MGMT_PIN    = "9999";
const DEV_PIN     = "0000";

function resolveRole(pin: string, level: PinRole): PinRole | null {
  if (level === "staff") {
    if (STAFF_PINS.has(pin)) return "staff";
    if (pin === MGMT_PIN)    return "management";
    if (pin === DEV_PIN)     return "developer";
  }
  if (level === "management") {
    if (pin === MGMT_PIN) return "management";
    if (pin === DEV_PIN)  return "developer";
  }
  if (level === "developer") {
    if (pin === DEV_PIN) return "developer";
  }
  return null;
}

const LABELS: Record<PinRole, { title: string; sub: string; icon: string }> = {
  staff:      { title: "STAFF ACCESS",           sub: "Enter your 4-digit staff credential",               icon: "⊞" },
  management: { title: "MANAGEMENT CLEARANCE",   sub: "Enter management authorization code",              icon: "◈" },
  developer:  { title: "DEVELOPER ROOT OVERRIDE", sub: "Enter developer root access credential",          icon: "⟡" },
};

interface RippleState { x: number; y: number; key: number }

interface Props {
  level: PinRole;
  onSuccess: (role: PinRole) => void;
  onCancel: () => void;
}

export function StaffPinGate({ level, onSuccess, onCancel }: Props) {
  const [pin,      setPin]      = useState<string[]>([]);
  const [shake,    setShake]    = useState(false);
  const [error,    setError]    = useState("");
  const [failures, setFailures] = useState(0);
  const [locked,   setLocked]   = useState(false);
  const [ripple,   setRipple]   = useState<RippleState | null>(null);
  const [success,  setSuccess]  = useState(false);
  const rippleKey = useRef(0);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (lockTimer.current) clearTimeout(lockTimer.current); }, []);

  const tryPin = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || success) return;
    const entered = pin.join("");
    if (entered.length < 4) { setError("Enter all 4 digits"); triggerShake(); return; }
    const role = resolveRole(entered, level);
    if (role) {
      const rect = (e.currentTarget as HTMLElement).closest("[data-ripple-origin]")?.getBoundingClientRect();
      const rx = rect ? e.clientX : window.innerWidth / 2;
      const ry = rect ? e.clientY : window.innerHeight / 2;
      rippleKey.current += 1;
      setRipple({ x: rx, y: ry, key: rippleKey.current });
      setSuccess(true);
      setTimeout(() => onSuccess(role), 900);
    } else {
      const next = failures + 1;
      setFailures(next);
      triggerShake();
      setError(next >= 5 ? "Terminal locked — contact supervisor" : `Invalid credential (${5 - next} attempts remaining)`);
      if (next >= 5) {
        setLocked(true);
        lockTimer.current = setTimeout(() => { setLocked(false); setFailures(0); setError(""); }, 30000);
      }
      setPin([]);
    }
  }, [pin, locked, success, failures, level, onSuccess]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  function pushDigit(d: string) {
    if (locked || success || pin.length >= 4) return;
    setError("");
    setPin(p => [...p, d]);
  }

  function backspace() {
    if (locked || success) return;
    setError("");
    setPin(p => p.slice(0, -1));
  }

  const lbl = LABELS[level];

  const PAD: (string | null)[] = [
    "1","2","3",
    "4","5","6",
    "7","8","9",
    null,"0","⌫",
  ];

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 9500,
          background: "rgba(1,1,0,0.88)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onPointerDown={e => { if (e.target === e.currentTarget) onCancel(); }}
      >
        {/* Ripple layer */}
        <AnimatePresence>
          {ripple && (
            <motion.div
              key={ripple.key}
              initial={{ scale: 0, opacity: 0.85 }}
              animate={{ scale: 18, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.88, ease: [0.12, 0.90, 0.18, 1.0] }}
              style={{
                position: "fixed",
                left: ripple.x - 40, top: ripple.y - 40,
                width: 80, height: 80,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${G}CC 0%, ${G}55 40%, transparent 70%)`,
                pointerEvents: "none",
                zIndex: 9600,
                transformOrigin: "center center",
                willChange: "transform, opacity",
              }}
            />
          )}
        </AnimatePresence>

        {/* Card */}
        <motion.div
          data-ripple-origin
          animate={shake ? { x: [-16, 16, -12, 12, -7, 7, 0] } : { x: 0 }}
          transition={{ duration: 0.44 }}
          initial={{ scale: 0.90, y: 24, opacity: 0 }}
          style={{
            background: "rgba(8,5,2,0.97)",
            border: `1.5px solid ${G}55`,
            borderRadius: 18,
            padding: "40px 40px 36px",
            width: 460,
            boxShadow: `0 0 80px rgba(212,175,55,0.22), 0 32px 80px rgba(0,0,0,0.90)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient top glow */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 120,
            background: `radial-gradient(ellipse at 50% 0%, ${G}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          {/* Close */}
          <button
            type="button"
            onPointerDown={onCancel}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "none", border: `1px solid rgba(212,175,55,0.20)`,
              borderRadius: 7, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: `${G}88`, fontSize: 16,
            }}
          >×</button>

          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `rgba(212,175,55,0.12)`,
            border: `2px solid ${G}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 0 24px ${G}33`,
            fontSize: 26, color: G,
          }}>
            {lbl.icon}
          </div>

          {/* Title */}
          <div style={{
            textAlign: "center", marginBottom: 6,
            fontSize: 13, fontWeight: 900, letterSpacing: "0.22em",
            color: G, fontFamily: "'Inter',sans-serif", textTransform: "uppercase",
          }}>{lbl.title}</div>
          <div style={{
            textAlign: "center", marginBottom: 28,
            fontSize: 11, color: "rgba(240,232,212,0.45)",
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em",
          }}>{lbl.sub}</div>

          {/* PIN dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 28 }}>
            {[0,1,2,3].map(i => {
              const filled = i < pin.length;
              return (
                <motion.div
                  key={i}
                  animate={filled ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: filled ? (success ? "#32B45A" : G) : "transparent",
                    border: `2px solid ${filled ? (success ? "#32B45A" : G) : "rgba(212,175,55,0.35)"}`,
                    boxShadow: filled ? `0 0 12px ${success ? "#32B45A" : G}88` : "none",
                    transition: "all 0.18s",
                  }}
                />
              );
            })}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  textAlign: "center", marginBottom: 14,
                  fontSize: 11, color: RED,
                  fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em",
                }}
              >{error}</motion.div>
            )}
          </AnimatePresence>

          {/* Numpad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {PAD.map((key, i) => {
              if (key === null) return <div key={i} />;
              const isBack = key === "⌫";
              return (
                <motion.button
                  key={key}
                  type="button"
                  onPointerDown={() => isBack ? backspace() : pushDigit(key)}
                  disabled={locked}
                  whileTap={{ scale: 0.90 }}
                  style={{
                    height: 62,
                    background: isBack ? "rgba(240,112,112,0.10)" : "rgba(212,175,55,0.08)",
                    border: `1px solid ${isBack ? "rgba(240,112,112,0.30)" : `${G}33`}`,
                    borderRadius: 10,
                    cursor: locked ? "not-allowed" : "pointer",
                    fontSize: 22,
                    fontWeight: 800,
                    color: isBack ? RED : G,
                    fontFamily: "'Inter',sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: locked ? 0.35 : 1,
                    transition: "background 0.15s",
                  }}
                >{key}</motion.button>
              );
            })}
          </div>

          {/* Confirm button */}
          <motion.button
            type="button"
            onPointerDown={tryPin}
            disabled={locked || pin.length < 4}
            whileTap={{ scale: 0.96 }}
            style={{
              marginTop: 14, width: "100%",
              height: 56,
              background: success ? "rgba(50,180,90,0.28)" : pin.length === 4 ? `linear-gradient(135deg, ${G}, #A87B0A)` : "rgba(212,175,55,0.08)",
              border: `1px solid ${success ? "#32B45A88" : pin.length === 4 ? `${G}` : `${G}30`}`,
              borderRadius: 12,
              cursor: pin.length === 4 && !locked ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.22em",
              color: pin.length === 4 ? (success ? "#32B45A" : "#0A0604") : `${G}44`,
              textTransform: "uppercase",
              fontFamily: "'Inter',sans-serif",
              transition: "all 0.25s",
            }}
          >
            {success ? "✓ AUTHORIZED" : locked ? "TERMINAL LOCKED" : "AUTHENTICATE"}
          </motion.button>

          {/* Level indicator */}
          <div style={{
            marginTop: 18, textAlign: "center",
            fontSize: 9, color: "rgba(212,175,55,0.22)",
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase",
          }}>
            NOVEE OS · SECURITY TIER {level === "staff" ? "1" : level === "management" ? "2" : "3"} · ENCRYPTED
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
