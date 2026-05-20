import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const G        = "#D4AF37";
const G_STAFF  = "#D48B00";
const RED      = "#F07070";

export type PinRole = "staff" | "management" | "developer";

// PIN length is display-only; all credential validation is server-side.
function getMaxDigits(level: PinRole): number {
  if (level === "management") return 6;
  return 4;
}

const LABELS: Record<PinRole, { title: string; sub: string; icon: string }> = {
  staff:      { title: "STAFF ACCESS",            sub: "Enter your 4-digit staff credential",       icon: "⊞" },
  management: { title: "MANAGEMENT CLEARANCE",    sub: "Enter your 6-digit authorization code",     icon: "◈" },
  developer:  { title: "DEVELOPER ROOT OVERRIDE", sub: "Enter developer root access credential",    icon: "⟡" },
};

interface RippleRing { x: number; y: number; key: number; color: string }

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
  const [rings,    setRings]    = useState<RippleRing[]>([]);
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ringKey          = useRef(0);
  const lockTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTitleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeLevel, setActiveLevel] = useState<PinRole>(level);

  const maxDigits   = getMaxDigits(activeLevel);
  const accentColor = activeLevel === "management" ? G : G_STAFF;

  useEffect(() => () => {
    if (lockTimer.current)        clearTimeout(lockTimer.current);
    if (longPressTitleRef.current) clearTimeout(longPressTitleRef.current);
  }, []);

  // All PIN validation is server-side — no credentials ever in client code.
  const tryPin = useCallback(async (e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || success || submitting) return;
    const entered = pin.join("");
    if (entered.length < maxDigits) {
      setError(`Enter all ${maxDigits} digits`);
      triggerShake();
      return;
    }

    setSubmitting(true);
    try {
      type PinResponse = {
        ok?: boolean; error?: string; role?: string; tier?: string;
        token?: string; attemptsRemaining?: number; retryAfterSeconds?: number;
      };

      let data: PinResponse;
      if (activeLevel === "management") {
        // Management: 6-digit sovereign PIN, validated server-side via pinAuth.ts
        const res = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: entered }),
        });
        data = await res.json() as PinResponse;
      } else {
        // Staff/developer: 4-digit DB-backed via venueStaffTable
        const res = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: entered }),
        });
        data = await res.json() as PinResponse;
      }

      const mgmtOk = activeLevel !== "management" || (data.tier === "sovereign" || data.role === "super_admin");
      if (data.ok && mgmtOk) {
        // Store JWT if provided (staff login returns one; management/founder-verify does not)
        if (data.token) localStorage.setItem("axiom_token", data.token);

        const resolvedRole: PinRole = activeLevel === "management"
          ? "management"
          : (data.role === "super_admin" ? "developer" : (data.role as PinRole | undefined)) ?? "staff";

        // 3 concentric ripple rings
        const rect = (e.currentTarget as HTMLElement).closest("[data-ripple-origin]")?.getBoundingClientRect();
        const rx   = rect ? e.clientX : window.innerWidth  / 2;
        const ry   = rect ? e.clientY : window.innerHeight / 2;
        const baseKey = ++ringKey.current;
        const color   = activeLevel === "management" ? G : G_STAFF;
        setRings([
          { x: rx, y: ry, key: baseKey,     color },
          { x: rx, y: ry, key: baseKey + 1, color },
          { x: rx, y: ry, key: baseKey + 2, color },
        ]);
        setSuccess(true);
        setTimeout(() => onSuccess(resolvedRole), 600);
      } else if (data.error === "too_many_attempts") {
        setLocked(true);
        const retryMs = (data.retryAfterSeconds ?? 30) * 1_000;
        lockTimer.current = setTimeout(() => { setLocked(false); setFailures(0); setError(""); }, retryMs);
        setError("Terminal locked — contact supervisor");
      } else {
        const next = failures + 1;
        setFailures(next);
        triggerShake();
        setError(next >= 3
          ? "Terminal locked — contact supervisor"
          : `Invalid credential (${3 - next} attempt${3 - next !== 1 ? "s" : ""} remaining)`);
        if (next >= 3) {
          setLocked(true);
          lockTimer.current = setTimeout(() => { setLocked(false); setFailures(0); setError(""); }, 30_000);
        }
        setPin([]);
      }
    } catch {
      setError("Connection error — try again");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }, [pin, locked, success, submitting, failures, activeLevel, maxDigits, onSuccess]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  function pushDigit(d: string) {
    if (locked || success || pin.length >= maxDigits) return;
    setError("");
    setPin(p => [...p, d]);
  }

  function backspace() {
    if (locked || success) return;
    setError("");
    setPin(p => p.slice(0, -1));
  }

  const lbl = LABELS[activeLevel];

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

        {/* ── Concentric ripple rings ── */}
        <AnimatePresence>
          {rings.map((ring, idx) => (
            <motion.div
              key={ring.key}
              initial={{ scale: 0, opacity: 0.80 }}
              animate={{ scale: 24, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.72, delay: idx * 0.08, ease: [0.12, 0.90, 0.18, 1.0] }}
              style={{
                position: "fixed",
                left: ring.x - 40, top: ring.y - 40,
                width: 80, height: 80,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${ring.color}CC 0%, ${ring.color}44 50%, transparent 70%)`,
                pointerEvents: "none",
                zIndex: 9600,
                transformOrigin: "center center",
                willChange: "transform, opacity",
                transform: "translateZ(0)",
              }}
            />
          ))}
        </AnimatePresence>

        {/* ── Card ── */}
        <motion.div
          data-ripple-origin
          animate={shake ? { x: [-16, 16, -12, 12, -7, 7, 0] } : { x: 0 }}
          transition={{ duration: 0.44 }}
          initial={{ scale: 0.90, y: 24, opacity: 0 }}
          style={{
            background: "rgba(8,5,2,0.97)",
            border: `1.5px solid ${accentColor}55`,
            borderRadius: 18,
            padding: "40px 40px 36px",
            width: 460,
            boxShadow: `0 0 80px ${accentColor}22, 0 32px 80px rgba(0,0,0,0.90)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient top glow */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 120,
            background: `radial-gradient(ellipse at 50% 0%, ${accentColor}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          {/* Management mode indicator stripe */}
          {activeLevel === "management" && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent, ${G}, transparent)`,
              opacity: 0.7,
            }} />
          )}

          {/* Close */}
          <button type="button" onPointerDown={onCancel} style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: `1px solid rgba(212,175,55,0.20)`,
            borderRadius: 7, width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: `${G}88`, fontSize: 16,
          }}>×</button>

          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${accentColor}12`,
            border: `2px solid ${accentColor}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 0 24px ${accentColor}33`,
            fontSize: 26, color: accentColor,
          }}>
            {lbl.icon}
          </div>

          {/* Title — long-press to escalate staff → management */}
          <div
            onPointerDown={() => {
              if (activeLevel === "staff") {
                longPressTitleRef.current = setTimeout(() => {
                  setActiveLevel("management");
                  setPin([]);
                  setError("");
                }, 700);
              }
            }}
            onPointerUp={() => { if (longPressTitleRef.current) { clearTimeout(longPressTitleRef.current); longPressTitleRef.current = null; } }}
            onPointerLeave={() => { if (longPressTitleRef.current) { clearTimeout(longPressTitleRef.current); longPressTitleRef.current = null; } }}
            style={{
              textAlign: "center", marginBottom: 6,
              fontSize: 13, fontWeight: 900, letterSpacing: "0.22em",
              color: accentColor, fontFamily: "'Inter',sans-serif", textTransform: "uppercase",
              userSelect: "none", cursor: "default",
            }}
          >{lbl.title}</div>
          <div style={{
            textAlign: "center", marginBottom: 28,
            fontSize: 11, color: "rgba(240,232,212,0.45)",
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.10em",
          }}>{lbl.sub}</div>

          {/* PIN dots — dynamic count based on level */}
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 28 }}>
            {Array.from({ length: maxDigits }).map((_, i) => {
              const filled = i < pin.length;
              return (
                <motion.div
                  key={i}
                  animate={filled ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: filled ? (success ? "#32B45A" : accentColor) : "transparent",
                    border: `2px solid ${filled ? (success ? "#32B45A" : accentColor) : "rgba(212,175,55,0.30)"}`,
                    boxShadow: filled ? `0 0 10px ${success ? "#32B45A" : accentColor}88` : "none",
                    transition: "all 0.18s",
                  }}
                />
              );
            })}
          </div>

          {/* Error message */}
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
                    height: 80,
                    background: isBack ? "rgba(240,112,112,0.10)" : `${accentColor}0d`,
                    border: `1px solid ${isBack ? "rgba(240,112,112,0.30)" : `${accentColor}33`}`,
                    borderRadius: 10,
                    cursor: locked ? "not-allowed" : "pointer",
                    fontSize: 22, fontWeight: 800,
                    color: isBack ? RED : accentColor,
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
            onPointerDown={(e) => { void tryPin(e); }}
            disabled={locked || submitting || pin.length < maxDigits}
            whileTap={{ scale: 0.96 }}
            style={{
              marginTop: 14, width: "100%", height: 56,
              background: success
                ? "rgba(50,180,90,0.28)"
                : pin.length === maxDigits
                  ? `linear-gradient(135deg, ${accentColor}, ${activeLevel === "management" ? "#8B7000" : "#A87B0A"})`
                  : `${accentColor}08`,
              border: `1px solid ${success ? "#32B45A88" : pin.length === maxDigits ? accentColor : `${accentColor}30`}`,
              borderRadius: 12,
              cursor: pin.length === maxDigits && !locked ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 900, letterSpacing: "0.22em",
              color: pin.length === maxDigits ? (success ? "#32B45A" : "#0A0604") : `${accentColor}44`,
              textTransform: "uppercase",
              fontFamily: "'Inter',sans-serif",
              transition: "all 0.25s",
            }}
          >
            {success ? "✓ AUTHORIZED" : locked ? "TERMINAL LOCKED" : "AUTHENTICATE"}
          </motion.button>

          {/* Footer */}
          <div style={{
            marginTop: 18, textAlign: "center",
            fontSize: 9, color: "rgba(212,175,55,0.20)",
            fontFamily: "'Inter',sans-serif", letterSpacing: "0.18em", textTransform: "uppercase",
          }}>
            NOVEE OS · SECURITY TIER {activeLevel === "staff" ? "1" : activeLevel === "management" ? "2" : "3"} · {maxDigits}-DIGIT · ENCRYPTED
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
