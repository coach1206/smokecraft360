import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { ArrowLeft, Lock, Wifi, Cpu, Activity, Shield, Eye } from "lucide-react";
import { usePosContext }     from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

// ── Palette ───────────────────────────────────────────────────────────────────

const GOLD       = "#D48B00";
const CREAM      = "#F5F2ED";
const PARCHMENT  = "rgba(247,243,234,0.93)";
const INK        = "#2A1F0E";
const INK_MID    = "rgba(42,31,14,0.55)";
const INK_FAINT  = "rgba(42,31,14,0.28)";
const GOLD_MID   = "rgba(212,139,0,0.55)";
const GOLD_FAINT = "rgba(212,139,0,0.22)";

// ── PIN validation — server-side only ────────────────────────────────────────
// All credential validation happens via POST /api/auth/pin-login.
// No PINs or user data live in this file.

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

async function validatePin(pin: string, venueId?: string): Promise<PinLoginResponse> {
  const res = await fetch("/api/auth/pin-login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ pin, ...(venueId ? { venueId } : {}) }),
  });
  const data = await res.json() as PinLoginResponse;
  if (res.status === 429 && !data.retryAfterSeconds) {
    const hdr = res.headers.get("Retry-After");
    if (hdr) data.retryAfterSeconds = parseInt(hdr, 10);
    data.error = data.error ?? "too_many_attempts";
  }
  return data;
}

const KEYS            = ["1","2","3","4","5","6","7","8","9","CLR","0","GO"];
const MAX_PIN         = 4;
const MAX_ATTEMPTS    = 5;
const LOCKOUT_SECONDS = 60;

// ── Lockout persistence ───────────────────────────────────────────────────────

function getLockout(): { attempts: number; lockedUntil: number | null } {
  try {
    const raw = sessionStorage.getItem("smokecraft_pin_lockout");
    if (raw) {
      const p = JSON.parse(raw);
      return { attempts: p.attempts ?? 0, lockedUntil: p.lockedUntil ?? null };
    }
  } catch {}
  return { attempts: 0, lockedUntil: null };
}
function saveLockout(attempts: number, lockedUntil: number | null) {
  try { sessionStorage.setItem("smokecraft_pin_lockout", JSON.stringify({ attempts, lockedUntil })); } catch {}
}

// ── Particles ─────────────────────────────────────────────────────────────────

interface Particle { id: number; x: number; y: number; size: number; delay: number; dur: number; opacity: number; }

function useParticles(count = 22): Particle[] {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: count }, (_, i) => ({
      id:      i,
      x:       Math.random() * 100,
      y:       20 + Math.random() * 75,
      size:    0.8 + Math.random() * 1.8,
      delay:   Math.random() * 8,
      dur:     10 + Math.random() * 12,
      opacity: 0.18 + Math.random() * 0.28,
    }));
  }
  return ref.current;
}

// ── EEIS telemetry bar ────────────────────────────────────────────────────────

const STATUS_ITEMS = [
  { label: "EEIE ONLINE",        icon: Shield,   },
  { label: "AI ACTIVE",          icon: Cpu,      },
  { label: "VENUE SYNC",         icon: Wifi,     },
  { label: "SESSION RECOVERY",   icon: Activity, },
  { label: "ENV INTELLIGENCE",   icon: Eye,      },
];

function TelemetryBar() {
  return (
    <div style={{
      position: "absolute", top: 18, left: 0, right: 0,
      display: "flex", justifyContent: "center", gap: 8, zIndex: 20,
      flexWrap: "wrap", padding: "0 16px",
    }}>
      {STATUS_ITEMS.map(({ label, icon: Icon }, idx) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + idx * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(247,243,234,0.55)",
            border: `1px solid ${GOLD_FAINT}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          }}
        >
          <motion.div
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: idx * 0.5 }}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 7px rgba(34,197,94,0.7)",
            }}
          />
          <Icon size={9} color={GOLD_MID} strokeWidth={2.5} />
          <span style={{
            fontSize: 7.5, letterSpacing: "0.18em", textTransform: "uppercase",
            color: INK_MID, fontWeight: 700,
          }}>
            {label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Tactile key button ────────────────────────────────────────────────────────

function KeyButton({
  label, onPress, disabled, isGo, isClear, goReady, onEdgeFlash,
}: {
  label: string; onPress: () => void; disabled: boolean;
  isGo: boolean; isClear: boolean; goReady: boolean;
  onEdgeFlash?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const [ripple,  setRipple]  = useState(false);

  const isNumber = !isGo && !isClear;

  const bg = goReady
    ? "linear-gradient(160deg, #E09A00 0%, #C07D00 45%, #9A6300 100%)"
    : isClear
    ? "linear-gradient(160deg, rgba(220,60,50,0.09) 0%, rgba(180,40,35,0.05) 100%)"
    : "linear-gradient(160deg, rgba(255,252,246,0.96) 0%, rgba(242,236,222,0.92) 100%)";

  const borderColor = goReady
    ? "rgba(180,115,0,0.7)"
    : isClear
    ? "rgba(200,60,50,0.28)"
    : "rgba(195,178,148,0.55)";

  const textColor = goReady
    ? "#FFF8EC"
    : isClear
    ? "rgba(200,60,50,0.75)"
    : isGo
    ? INK_MID
    : INK;

  const shadow = goReady
    ? [
        "0 8px 24px rgba(180,115,0,0.45)",
        "0 3px 8px rgba(0,0,0,0.22)",
        "0 1px 0 rgba(255,230,120,0.55) inset",
        "0 -2px 0 rgba(100,65,0,0.35) inset",
      ].join(", ")
    : pressed
    ? [
        "0 1px 4px rgba(0,0,0,0.18)",
        "0 0 0 rgba(0,0,0,0)",
        "0 1px 0 rgba(255,255,255,0.55) inset",
        "0 -1px 0 rgba(180,160,120,0.25) inset",
      ].join(", ")
    : [
        "0 6px 18px rgba(0,0,0,0.16)",
        "0 2px 6px rgba(0,0,0,0.1)",
        "0 1px 0 rgba(255,255,255,0.85) inset",
        "0 -1px 0 rgba(180,160,120,0.3) inset",
      ].join(", ");

  return (
    <motion.button
      onClick={() => {
        if (disabled) return;
        setPressed(true);
        setRipple(true);
        onPress();
        onEdgeFlash?.();
        setTimeout(() => setPressed(false), 130);
        setTimeout(() => setRipple(false), 420);
      }}
      disabled={disabled}
      animate={pressed
        ? { scale: 0.89, y: 2.5 }
        : { scale: 1, y: 0 }}
      whileHover={disabled ? {} : {
        scale: 1.025,
        boxShadow: goReady
          ? "0 10px 28px rgba(180,115,0,0.5), 0 3px 8px rgba(0,0,0,0.2), 0 1px 0 rgba(255,230,120,0.6) inset, 0 -2px 0 rgba(100,65,0,0.3) inset"
          : "0 8px 22px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,160,120,0.3) inset",
      }}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      style={{
        minHeight: 70, position: "relative", overflow: "hidden",
        fontSize:      isNumber ? 26 : 11,
        fontWeight:    isNumber ? 300 : 700,
        letterSpacing: isNumber ? "0" : "0.14em",
        fontFamily:    isNumber ? "'Cormorant Garamond', serif" : "inherit",
        background: bg,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: shadow,
        transition: "background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s",
      }}
    >
      {/* Top-edge specular rim */}
      <div style={{
        position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
        background: "rgba(255,255,255,0.9)",
        borderRadius: "0 0 1px 1px",
        pointerEvents: "none",
      }} />

      {/* Warm ambient inner glow on hover */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 14,
        background: goReady
          ? "radial-gradient(ellipse at 50% 0%, rgba(255,210,80,0.18) 0%, transparent 65%)"
          : "radial-gradient(ellipse at 50% 0%, rgba(255,252,240,0.5) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.55 }}
            animate={{ scale: 4.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: "absolute", top: "50%", left: "50%",
              width: 44, height: 44, marginLeft: -22, marginTop: -22,
              borderRadius: "50%",
              background: goReady
                ? "radial-gradient(circle, rgba(212,139,0,0.45) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(212,139,0,0.18) 0%, transparent 70%)",
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
  const [, navigate]       = useLocation();
  const { setCurrentUser } = usePosContext();
  const cc                 = useCommandCenter();

  const [pin,    setPin]    = useState("");
  const [error,  setError]  = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [edgeFlash, setEdgeFlash] = useState(false);

  const particles  = useParticles(22);
  const bgControls = useAnimation();

  const initial = getLockout();
  const [failedAttempts, setFailedAttempts] = useState(initial.attempts);
  const [lockedUntil,    setLockedUntil]    = useState<number | null>(initial.lockedUntil);
  const [lockCountdown,  setLockCountdown]  = useState(0);
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Slow atmospheric breathing
  useEffect(() => {
    bgControls.start({
      scale:   [1, 1.022, 1],
      opacity: [1, 0.88, 1],
      transition: { duration: 11, repeat: Infinity, ease: "easeInOut" },
    });
  }, [bgControls]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(rem);
      if (rem <= 0) { setLockedUntil(null); setFailedAttempts(0); saveLockout(0, null); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const triggerEdgeFlash = () => {
    setEdgeFlash(true);
    setTimeout(() => setEdgeFlash(false), 280);
  };

  const [submitting, setSubmitting] = useState(false);

  const handleKey = useCallback((key: string) => {
    if (success || isLocked || submitting) return;
    setError(false);
    if (key === "CLR") { setPin(""); return; }
    if (key === "GO") {
      if (pin.length !== MAX_PIN) return;
      setSubmitting(true);
      validatePin(pin)
        .then(data => {
          if (data.ok && data.token) {
            // Store JWT for downstream auth
            localStorage.setItem("axiom_token", data.token);
            if (data.role) localStorage.setItem("axiom_role", data.role);
            if (data.venueId) localStorage.setItem("axiom_venue_id", data.venueId);
            setCurrentUser({ name: data.name ?? "Staff", role: data.role ?? "staff", pin: "" });
            saveLockout(0, null);
            setFailedAttempts(0);
            setSuccess(data.role ?? "staff");
            cc.addAuditEntry("auth.pin_login", `${data.name ?? "Staff"} authenticated (${data.role ?? "staff"})`, data.name ?? "Staff");
            const EAT_ROLES = ["admin", "super_admin", "venue_owner", "sovereign", "manager"];
            const dest = data.redirectTo ?? (
              data.role === "staff" ? "/pos" :
              EAT_ROLES.includes(data.role ?? "") ? "/titan-eat" :
              "/dashboard"
            );
            setTimeout(() => navigate(dest), 950);
          } else if (data.error === "too_many_attempts") {
            const until = Date.now() + (data.retryAfterSeconds ?? LOCKOUT_SECONDS) * 1000;
            setLockedUntil(until);
            saveLockout(MAX_ATTEMPTS, until);
            cc.addAuditEntry("auth.lockout", "Lockout — too many attempts");
            setSubmitting(false);
            setPin("");
          } else {
            const next = MAX_ATTEMPTS - (data.attemptsRemaining ?? (MAX_ATTEMPTS - failedAttempts - 1));
            setFailedAttempts(next);
            saveLockout(next, null);
            cc.addAuditEntry("auth.pin_failed", `Failed PIN (${next}/${MAX_ATTEMPTS})`);
            setError(true);
            setSubmitting(false);
            setTimeout(() => { setError(false); setPin(""); }, 850);
          }
        })
        .catch(() => {
          setError(true);
          setSubmitting(false);
          setTimeout(() => { setError(false); setPin(""); }, 850);
        });
      return;
    }
    if (pin.length < MAX_PIN) setPin(p => p + key);
  }, [pin, success, isLocked, submitting, failedAttempts, setCurrentUser, navigate, cc]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { handleKey(e.key); return; }
      if (e.key === "Backspace" || e.key === "Delete") { handleKey("CLR"); return; }
      if (e.key === "Enter") { handleKey("GO"); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKey]);

  const dotColor = error ? "#dc2626" : success ? "#16a34a" : GOLD;

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      background: "#2A1A08",
    }}>

      {/* Atmospheric lounge layer */}
      <motion.div
        animate={bgControls}
        aria-hidden
        style={{
          position: "absolute", inset: "-5%",
          backgroundImage: "url(/images/lounge-bg.jpg)",
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "brightness(0.38) saturate(0.75) sepia(0.15)",
          pointerEvents: "none",
        }}
      />

      {/* Warm cream environmental wash — center glow */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: [
          "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(245,230,195,0.32) 0%, transparent 65%)",
          "radial-gradient(ellipse 100% 40% at 50% 100%, rgba(212,139,0,0.12) 0%, transparent 60%)",
          "radial-gradient(ellipse 100% 35% at 50% 0%, rgba(0,0,0,0.45) 0%, transparent 60%)",
        ].join(", "),
      }} />

      {/* Edge vignette */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
      }} />

      {/* Ambient gold particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          aria-hidden
          animate={{
            y:       [0, -(14 + p.size * 4), 0],
            opacity: [0, p.opacity, 0],
            x:       [0, (Math.random() > 0.5 ? 1 : -1) * p.size * 1.5, 0],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: GOLD,
            boxShadow: `0 0 ${p.size * 4}px ${GOLD}88`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Telemetry bar */}
      <TelemetryBar />

      {/* Back button */}
      <motion.button
        onClick={() => navigate("/craft-hub")}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute", top: 18, left: 18,
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(247,243,234,0.55)",
          border: `1px solid ${GOLD_FAINT}`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderRadius: 12, padding: "11px 18px",
          color: INK_MID, fontSize: 14, fontWeight: 600,
          cursor: "pointer", zIndex: 20,
          touchAction: "manipulation",
          boxShadow: "0 2px 10px rgba(0,0,0,0.14), 0 1px 0 rgba(255,255,255,0.5) inset",
        }}
      >
        <ArrowLeft size={16} />
        CraftHub
      </motion.button>

      {/* PIN panel */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 390, margin: "0 16px",
          background: PARCHMENT,
          border: `1px solid rgba(200,182,145,0.55)`,
          borderRadius: 28,
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          boxShadow: [
            "0 48px 100px rgba(0,0,0,0.5)",
            "0 16px 40px rgba(0,0,0,0.28)",
            "0 4px 12px rgba(0,0,0,0.14)",
            "0 1px 0 rgba(255,255,255,0.95) inset",
            "0 -1px 0 rgba(180,155,110,0.3) inset",
            `0 0 0 1px rgba(212,139,0,0.08)`,
          ].join(", "),
          padding: "36px 28px 30px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >

        {/* Top gold gradient edge — always present */}
        <div style={{
          position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.42), transparent)",
          borderRadius: "0 0 2px 2px",
        }} />

        {/* Edge flash on keypress */}
        <AnimatePresence>
          {edgeFlash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0.38 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0, borderRadius: 28,
                border: `1.5px solid rgba(212,139,0,0.55)`,
                boxShadow: "0 0 20px rgba(212,139,0,0.22) inset",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* Inner surface texture gradient */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 28, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,252,240,0.65) 0%, transparent 70%)",
        }} />

        {/* System label */}
        <div style={{
          fontSize: 7.5, letterSpacing: "0.34em", textTransform: "uppercase",
          color: GOLD_MID, marginBottom: 5, fontWeight: 700,
        }}>
          NOVEE OS · EEIS
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 24, fontWeight: 400, color: INK,
          margin: "0 0 4px",
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: "0.04em",
        }}>
          Operational Authentication
        </h1>

        {/* Sub-label */}
        <div style={{
          fontSize: 8.5, letterSpacing: "0.22em", textTransform: "uppercase",
          color: INK_FAINT, marginBottom: 28, fontWeight: 600,
        }}>
          Venue Access · Verified Identity
        </div>

        {/* PIN dots */}
        <motion.div
          animate={error ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
          transition={{ duration: 0.42, ease: "easeOut" }}
          style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 28 }}
        >
          {Array.from({ length: MAX_PIN }).map((_, i) => {
            const filled = pin.length > i;
            return (
              <motion.div
                key={i}
                animate={filled ? {
                  scale: [1, 1.45, 1],
                  boxShadow: [
                    `0 0 0px ${dotColor}00`,
                    `0 0 16px ${dotColor}bb`,
                    `0 0 10px ${dotColor}66`,
                  ],
                } : {}}
                transition={{ duration: 0.18 }}
                style={{
                  width: 15, height: 15, borderRadius: "50%",
                  background:  filled ? dotColor : "rgba(42,31,14,0.1)",
                  border:      `1.5px solid ${filled ? dotColor : "rgba(180,155,110,0.45)"}`,
                  boxShadow:   filled
                    ? `0 0 12px ${dotColor}88, 0 2px 4px rgba(0,0,0,0.18) inset`
                    : "0 1px 3px rgba(0,0,0,0.1) inset",
                  transition:  "background 0.14s, border-color 0.14s",
                }}
              />
            );
          })}
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {isLocked && (
            <motion.div key="locked"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginBottom: 14, padding: "11px 14px", borderRadius: 12,
                background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <Lock size={13} color="#dc2626" />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", letterSpacing: "0.06em" }}>
                  ACCESS SUSPENDED
                </div>
                <div style={{ fontSize: 10, color: "rgba(220,38,38,0.55)", letterSpacing: "0.04em", marginTop: 1 }}>
                  Security cooldown — {lockCountdown}s remaining
                </div>
              </div>
            </motion.div>
          )}
          {!isLocked && error && (
            <motion.div key="error"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginBottom: 14, fontSize: 10, color: "#dc2626",
                fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              }}
            >
              INVALID CREDENTIAL — {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining
            </motion.div>
          )}
          {success && (
            <motion.div key="success"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 14, fontSize: 10, color: "#15803d",
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              }}
            >
              ● IDENTITY CONFIRMED · INITIALIZING SESSION
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 9,
          opacity: isLocked ? 0.28 : 1,
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
                onEdgeFlash={triggerEdgeFlash}
              />
            );
          })}
        </div>

        {/* Bottom separator */}
        <div style={{
          marginTop: 22, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(180,155,110,0.28), transparent)",
        }} />

        {/* Live system indicator */}
        <div style={{
          marginTop: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <motion.div
            animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.75)",
            }}
          />
          <span style={{
            fontSize: 7.5, letterSpacing: "0.22em", textTransform: "uppercase",
            color: INK_FAINT, fontWeight: 600,
          }}>
            Sensory Mesh Online · Environmental Intelligence Active
          </span>
        </div>
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        style={{
          position: "absolute", bottom: 16,
          fontSize: 7.5, textTransform: "uppercase", letterSpacing: "0.3em",
          color: "rgba(212,139,0,0.25)", pointerEvents: "none", zIndex: 10,
          fontWeight: 600,
        }}
      >
        Powered by NOVEE OS · EEIS Infrastructure
      </motion.div>
    </div>
  );
}
