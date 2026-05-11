/**
 * SovereignGate — /sovereign-gate  /gate
 * Dual-tier PIN pad. All validation is server-side via POST /api/auth/pin-login.
 * No PINs, hashes, or user data live in this file.
 *
 * Tiers:
 *   Sovereign — 6-digit PIN → /sovereign-dashboard  (super_admin)
 *   Staff     — 4-digit PIN → /dashboard or /pos    (staff/manager)
 *
 * Security:
 *   - PIN length determines tier, not the user — the server enforces this
 *   - Client-side lockout mirrors server lockout (UX only — server is authoritative)
 *   - Rate limiting enforced server-side; client shows retryAfterSeconds countdown
 *   - JWT stored in localStorage on success; used by AuthContext downstream
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Loader } from "lucide-react";
import "@/styles/Sovereign.css";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:       "#050505",
  surface:  "rgba(14,12,10,0.97)",
  gold:     "#D4AF37",
  amber:    "#B89030",
  ink:      "#F5F2ED",
  muted:    "rgba(245,242,237,0.42)",
  dim:      "rgba(245,242,237,0.22)",
  border:   "rgba(212,175,55,0.22)",
  green:    "#22c55e",
  red:      "#ef4444",
  mono:     "'JetBrains Mono','Courier New',monospace",
  serif:    "'Cormorant Garamond',serif",
};

// ── Server response type ──────────────────────────────────────
interface PinLoginResponse {
  ok?:               boolean;
  tier?:             "sovereign" | "staff";
  token?:            string;
  redirectTo?:       string;
  name?:             string;
  role?:             string;
  venueId?:          string | null;
  error?:            string;
  message?:          string;
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
}

async function submitPin(pin: string): Promise<PinLoginResponse> {
  const res = await fetch("/api/auth/pin-login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ pin }),
  });
  const data = await res.json() as PinLoginResponse;
  // Express rate-limit sends retryAfter in the Retry-After header (seconds).
  // Merge it into the body so callers have one consistent interface.
  if (res.status === 429 && !data.retryAfterSeconds) {
    const hdr = res.headers.get("Retry-After");
    if (hdr) data.retryAfterSeconds = parseInt(hdr, 10);
    data.error = data.error ?? "too_many_attempts";
  }
  return data;
}

// ── Constants ────────────────────────────────────────────────
const KEYS = ["1","2","3","4","5","6","7","8","9","CLR","0","GO"] as const;

// ── Ambient particles ─────────────────────────────────────────
interface Particle { id: number; x: number; y: number; size: number; delay: number; dur: number; }

function useParticles(n = 18): Particle[] {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: n }, (_, i) => ({
      id: i, x: Math.random() * 100, y: 15 + Math.random() * 75,
      size: 0.6 + Math.random() * 1.4, delay: Math.random() * 8, dur: 10 + Math.random() * 12,
    }));
  }
  return ref.current;
}

// ── PIN dot row ───────────────────────────────────────────────
// Always renders 6 positions: dots 0-3 = staff tier, dots 4-5 = sovereign extension.
function PinDots({ filled, error, success }: {
  filled: number; error: boolean; success: boolean;
}) {
  const color = error ? C.red : success ? C.green : C.gold;
  return (
    <motion.div
      animate={error ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
      transition={{ duration: 0.42, ease: "easeOut" }}
      style={{ display: "flex", gap: 11, justifyContent: "center", marginBottom: 10 }}
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const on         = filled > i;
        const isSovExt   = i >= 4; // dots 5 & 6 are sovereign-only positions
        return (
          <motion.div
            key={i}
            animate={on ? { scale: [1, 1.5, 1], boxShadow: [`0 0 0 ${color}00`, `0 0 14px ${color}bb`, `0 0 9px ${color}66`] } : {}}
            transition={{ duration: 0.18 }}
            style={{
              width:        on ? 13 : isSovExt ? 9 : 13,
              height:       on ? 13 : isSovExt ? 9 : 13,
              borderRadius: "50%",
              background:   on ? color : "rgba(245,242,237,0.05)",
              border:       `1.5px solid ${on ? color : isSovExt ? "rgba(212,175,55,0.10)" : "rgba(212,175,55,0.22)"}`,
              transition:   "background 0.14s, border-color 0.14s, width 0.12s, height 0.12s",
              alignSelf:    "center",
            }}
          />
        );
      })}
    </motion.div>
  );
}

// ── Key button ────────────────────────────────────────────────
function KeyButton({ label, onPress, disabled, isGo, isClear, goReady }: {
  label: string; onPress: () => void; disabled: boolean;
  isGo: boolean; isClear: boolean; goReady: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const [ripple,  setRipple]  = useState(false);

  const bg = goReady
    ? `linear-gradient(160deg,${C.gold} 0%,${C.amber} 100%)`
    : isClear
    ? "rgba(239,68,68,0.08)"
    : "rgba(245,242,237,0.05)";

  const borderColor = goReady
    ? "rgba(212,175,55,0.7)"
    : isClear
    ? "rgba(239,68,68,0.28)"
    : "rgba(212,175,55,0.16)";

  const textColor = goReady ? "#050505" : isClear ? C.red : C.ink;

  return (
    <motion.button
      onClick={() => {
        if (disabled) return;
        setPressed(true); setRipple(true);
        onPress();
        setTimeout(() => setPressed(false), 120);
        setTimeout(() => setRipple(false), 400);
      }}
      disabled={disabled}
      animate={pressed ? { scale: 0.88, y: 2 } : { scale: 1, y: 0 }}
      whileHover={disabled ? {} : { scale: 1.04 }}
      transition={{ type: "spring", stiffness: 600, damping: 20 }}
      style={{
        minHeight: 64, position: "relative", overflow: "hidden",
        fontSize:   !isGo && !isClear ? 24 : 10,
        fontWeight: !isGo && !isClear ? 300 : 700,
        letterSpacing: isGo || isClear ? "0.14em" : "0",
        fontFamily: !isGo && !isClear ? C.serif : C.mono,
        background: bg,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled && !goReady ? 0.45 : 1,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
    >
      {/* Specular rim */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
        background: goReady
          ? "rgba(255,230,100,0.5)"
          : "rgba(212,175,55,0.18)",
        pointerEvents: "none",
      }} />

      {/* Ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              position: "absolute", top: "50%", left: "50%",
              width: 32, height: 32, marginLeft: -16, marginTop: -16,
              borderRadius: "50%",
              background: goReady
                ? "radial-gradient(circle,rgba(212,175,55,0.5) 0%,transparent 70%)"
                : "radial-gradient(circle,rgba(212,175,55,0.15) 0%,transparent 70%)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {label}
    </motion.button>
  );
}

// ── Tier indicator ────────────────────────────────────────────
function TierBadge({ len }: { len: number }) {
  if (len === 0) return null;
  const isSov = len >= 5;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 20, marginBottom: 14,
        background: isSov ? "rgba(212,175,55,0.12)" : "rgba(34,197,94,0.08)",
        border: `1px solid ${isSov ? "rgba(212,175,55,0.30)" : "rgba(34,197,94,0.22)"}`,
        fontSize: 8, letterSpacing: "0.18em", fontWeight: 700,
        color: isSov ? C.gold : C.green,
      }}
    >
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSov ? C.gold : C.green }} />
      {isSov ? "SOVEREIGN TIER" : "STAFF TIER"}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function SovereignGate() {
  const [, navigate] = useLocation();

  const [pin,        setPin]        = useState("");
  const [error,      setError]      = useState(false);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockCountdown, setLockCt]  = useState(0);
  const [lockedUntil,   setLocked]  = useState<number | null>(null);
  const particles = useParticles(18);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const maxLen   = pin.length >= 5 ? 6 : 4; // dynamically expand to 6 if user keeps typing

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCt(rem);
      if (rem <= 0) { setLocked(null); }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleKey = useCallback((key: string) => {
    if (success || isLocked || submitting) return;
    setError(false); setErrorMsg("");

    if (key === "CLR") { setPin(""); return; }

    if (key === "GO") {
      if (pin.length < 4) return;
      setSubmitting(true);
      submitPin(pin)
        .then(data => {
          if (data.ok && data.token) {
            localStorage.setItem("axiom_token", data.token);
            if (data.role)    localStorage.setItem("axiom_role", data.role);
            if (data.venueId) localStorage.setItem("axiom_venue_id", data.venueId);
            if (data.tier === "sovereign") {
              localStorage.setItem("SOVEREIGN_SESSION", data.token);
            }
            setSuccess(true);
            setTimeout(() => navigate(data.redirectTo ?? "/dashboard"), 900);
          } else if (data.error === "too_many_attempts") {
            const until = Date.now() + (data.retryAfterSeconds ?? 900) * 1000;
            setLocked(until);
            setLockCt(data.retryAfterSeconds ?? 900);
            setSubmitting(false);
            setPin("");
          } else {
            const rem = data.attemptsRemaining ?? 0;
            setErrorMsg(rem > 0 ? `INCORRECT PIN — ${rem} attempt${rem !== 1 ? "s" : ""} remaining` : "INCORRECT PIN");
            setError(true);
            setSubmitting(false);
            setTimeout(() => { setError(false); setErrorMsg(""); setPin(""); }, 900);
          }
        })
        .catch(() => {
          setErrorMsg("NETWORK ERROR — CHECK CONNECTION");
          setError(true);
          setSubmitting(false);
          setTimeout(() => { setError(false); setErrorMsg(""); setPin(""); }, 900);
        });
      return;
    }

    // Digits — allow up to 6
    if (pin.length < 6) setPin(p => p + key);
  }, [pin, success, isLocked, submitting, navigate]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { handleKey(e.key); return; }
      if (e.key === "Backspace" || e.key === "Delete") { handleKey("CLR"); return; }
      if (e.key === "Enter") { handleKey("GO"); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKey]);

  const goReady = pin.length >= 4 && !success && !submitting;

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: C.mono, position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 700, height: 240,
        background: "radial-gradient(ellipse,rgba(212,175,55,0.08) 0%,transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Scan line */}
      <div className="scan-line" />

      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{ y: [0, -(12 + p.size * 5), 0], opacity: [0, 0.25, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          style={{
            position: "fixed", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: C.gold, pointerEvents: "none",
          }}
        />
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: C.surface,
          border: `1px solid ${error ? "rgba(239,68,68,0.35)" : C.border}`,
          borderRadius: 20,
          padding: "44px 36px 36px",
          maxWidth: 400, width: "90%",
          textAlign: "center",
          boxShadow: "0 48px 100px rgba(0,0,0,0.7), 0 0 80px rgba(212,175,55,0.04)",
          transition: "border-color 0.25s",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Top specular edge */}
        <div style={{
          position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
          background: `linear-gradient(90deg,transparent,rgba(212,175,55,${success ? 0.6 : 0.28}),transparent)`,
          transition: "opacity 0.3s",
        }} />

        {/* Shield icon */}
        <motion.div
          animate={success ? { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            width: 54, height: 54, borderRadius: 15,
            background: success ? "rgba(34,197,94,0.12)" : `${C.gold}12`,
            border: `1px solid ${success ? "rgba(34,197,94,0.35)" : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px",
            transition: "background 0.3s, border-color 0.3s",
          }}
        >
          {submitting
            ? <Loader size={22} color={C.gold} style={{ animation: "spin 0.8s linear infinite" }} />
            : isLocked
            ? <Lock size={22} color={C.red} />
            : <Shield size={22} color={success ? C.green : C.gold} />}
        </motion.div>

        {/* Title */}
        <div style={{ fontSize: 9, letterSpacing: "0.30em", color: `${C.gold}55`, marginBottom: 10 }}>
          NOVEE OS · TITAN V ENGINE
        </div>
        <div style={{ fontSize: 24, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", fontWeight: 300, marginBottom: 6 }}>
          SOVEREIGN<br />COMMAND DECK
        </div>
        <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em", marginBottom: 32, lineHeight: 1.8 }}>
          360 ENTERPRISES SERVICES LLC
        </div>

        {/* Tier indicator */}
        <AnimatePresence>
          {pin.length > 0 && <TierBadge len={pin.length} />}
        </AnimatePresence>

        {/* PIN dots — always 6 positions; last 2 are sovereign-only */}
        <PinDots filled={pin.length} error={error} success={success} />

        {/* Sovereign nudge — shown only when exactly 4 digits are entered */}
        <AnimatePresence>
          {pin.length === 4 && !error && !success && (
            <motion.div
              key="sov-nudge"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 8, letterSpacing: "0.16em", color: "rgba(212,175,55,0.45)",
                marginBottom: 14, textAlign: "center",
              }}
            >
              STAFF READY · OR CONTINUE FOR ◈ SOVEREIGN
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {isLocked && (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={12} color={C.red} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.red, letterSpacing: "0.10em" }}>ACCESS SUSPENDED</div>
                <div style={{ fontSize: 9, color: "rgba(239,68,68,0.55)", marginTop: 2 }}>Security cooldown — {lockCountdown}s remaining</div>
              </div>
            </motion.div>
          )}
          {!isLocked && error && (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ marginBottom: 16, fontSize: 9, color: C.red, fontWeight: 700, letterSpacing: "0.12em" }}>
              {errorMsg || "INCORRECT PIN"}
            </motion.div>
          )}
          {success && (
            <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginBottom: 16, fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: "0.12em" }}>
              ● IDENTITY CONFIRMED · ROUTING…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad — 3×4 grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9,
          opacity: isLocked || success ? 0.28 : 1,
          pointerEvents: isLocked || success ? "none" : "auto",
          transition: "opacity 0.3s",
        }}>
          {KEYS.map(key => (
            <KeyButton
              key={key}
              label={key}
              onPress={() => handleKey(key)}
              disabled={!!success || isLocked || submitting}
              isGo={key === "GO"}
              isClear={key === "CLR"}
              goReady={key === "GO" && goReady}
            />
          ))}
        </div>

        {/* Hint */}
        <div style={{ marginTop: 20, fontSize: 8, color: C.dim, lineHeight: 1.9, letterSpacing: "0.10em" }}>
          4-DIGIT STAFF · 6-DIGIT SOVEREIGN<br />
          ALL VALIDATION IS SERVER-SIDE
        </div>
      </motion.div>

      {/* Footer watermark */}
      <div className="sovereign-breath" style={{
        position: "fixed", bottom: 14, left: 0, right: 0,
        textAlign: "center", fontSize: 7.5, color: "rgba(212,175,55,0.18)",
        letterSpacing: "0.22em", pointerEvents: "none",
      }}>
        AUTHORIZED OPERATOR: JC // 360 ENTERPRISES SERVICES LLC
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
