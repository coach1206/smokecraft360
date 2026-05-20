/**
 * PinMatrix.tsx — Multi-tier PIN entry component (SmokeCraft).
 *
 * Large touch-friendly numpad for staff/management/sovereign access.
 * Calls pinMatrix.verifyPin() and surfaces lockout countdown.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { verifyPin, PIN_DIGITS, PIN_LABELS, getLockMs } from "@/lib/pinMatrix";
import type { PinTier, PinSession } from "@/lib/pinMatrix";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG    = "#0A0805";
const GOLD  = "#D4AF37";
const AMBER = "#C87028";
const CREAM = "rgba(240,232,212,0.92)";
const DIM   = "rgba(240,232,212,0.45)";
const PANEL = "rgba(14,10,5,0.96)";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PinMatrixProps {
  tier:        PinTier;
  onSuccess:   (session: PinSession) => void;
  onCancel?:   () => void;
  onTierChange?: (tier: PinTier) => void;
  showTierSelector?: boolean;
  compact?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLock(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Key button ────────────────────────────────────────────────────────────────

function KeyBtn({
  label, sub, onPress, disabled = false, accent = GOLD,
}: {
  label: string; sub?: string; onPress: () => void;
  disabled?: boolean; accent?: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onPointerDown={() => { if (!disabled) { setPressed(true); onPress(); } }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      animate={{ scale: pressed ? 0.91 : 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      style={{
        minHeight: 72,
        border:    `1px solid ${disabled ? "rgba(255,255,255,0.06)" : `${accent}44`}`,
        borderRadius: 10,
        background: pressed
          ? `rgba(212,175,55,0.22)`
          : disabled
            ? "rgba(255,255,255,0.03)"
            : "rgba(212,175,55,0.07)",
        cursor: disabled ? "default" : "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2, boxShadow: pressed ? `0 0 18px ${accent}33` : "none",
        transition: "background 0.12s, border-color 0.12s",
        WebkitTapHighlightColor: "transparent",
        outline: "none",
      }}
    >
      <span style={{
        fontSize: 28, fontWeight: 700,
        color: disabled ? "rgba(255,255,255,0.15)" : CREAM,
        fontFamily: "'Inter', sans-serif", lineHeight: 1,
        letterSpacing: "-0.02em",
      }}>{label}</span>
      {sub && (
        <span style={{ fontSize: 9, color: disabled ? "rgba(255,255,255,0.10)" : DIM, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>
          {sub}
        </span>
      )}
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PinMatrix({
  tier: initialTier,
  onSuccess,
  onCancel,
  onTierChange,
  showTierSelector = false,
  compact = false,
}: PinMatrixProps) {
  const [tier,        setTier]        = useState<PinTier>(initialTier);
  const [digits,      setDigits]      = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [lockMs,      setLockMs]      = useState(() => getLockMs(initialTier));
  const [shake,       setShake]       = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxLen = PIN_DIGITS[tier];
  const label  = PIN_LABELS[tier];

  // Update lock countdown
  useEffect(() => {
    const ms = getLockMs(tier);
    setLockMs(ms);
    if (ms > 0) {
      lockTimerRef.current = setInterval(() => {
        const remaining = getLockMs(tier);
        setLockMs(remaining);
        if (remaining <= 0 && lockTimerRef.current) {
          clearInterval(lockTimerRef.current);
          lockTimerRef.current = null;
        }
      }, 1000);
    }
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
  }, [tier]);

  const changeTier = useCallback((t: PinTier) => {
    setTier(t); setDigits([]); setError(null); setSuccess(false);
    setLockMs(getLockMs(t));
    onTierChange?.(t);
  }, [onTierChange]);

  const pushDigit = useCallback((d: string) => {
    if (loading || success || lockMs > 0) return;
    setDigits(prev => {
      if (prev.length >= maxLen) return prev;
      const next = [...prev, d];
      if (next.length === maxLen) {
        void submit(next.join(""));
      }
      return next;
    });
    setError(null);
  }, [loading, success, lockMs, maxLen]); // eslint-disable-line react-hooks/exhaustive-deps

  const backspace = useCallback(() => {
    if (loading || success) return;
    setDigits(p => p.slice(0, -1));
    setError(null);
  }, [loading, success]);

  async function submit(pin: string) {
    setLoading(true);
    const result = await verifyPin(tier, pin);
    setLoading(false);

    if (result.success && result.session) {
      setSuccess(true);
      setTimeout(() => onSuccess(result.session!), 600);
      return;
    }

    if (result.locked) {
      setLockMs(result.lockMs ?? 0);
      setError(`Locked — ${fmtLock(result.lockMs ?? 0)}`);
    } else {
      setError(result.error ?? "Incorrect PIN");
    }
    setShake(true);
    setTimeout(() => { setShake(false); setDigits([]); }, 500);
  }

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{
        background: PANEL,
        border: `1px solid ${label.color}33`,
        borderRadius: compact ? 12 : 16,
        padding: compact ? "24px 20px" : "36px 28px",
        width: compact ? 320 : 380,
        maxWidth: "100%",
        boxShadow: `0 0 60px rgba(0,0,0,0.8), 0 0 30px ${label.color}18`,
        backdropFilter: "blur(24px)",
        display: "flex", flexDirection: "column", gap: 20,
        userSelect: "none",
      }}
    >
      {/* Tier selector */}
      {showTierSelector && (
        <div style={{ display: "flex", gap: 6 }}>
          {(["staff", "management", "sovereign"] as PinTier[]).map(t => (
            <button
              key={t}
              type="button"
              onPointerDown={() => changeTier(t)}
              style={{
                flex: 1, padding: "8px 4px",
                border: `1px solid ${tier === t ? PIN_LABELS[t].color : "rgba(255,255,255,0.08)"}`,
                borderRadius: 7,
                background: tier === t ? `${PIN_LABELS[t].color}18` : "transparent",
                color: tier === t ? PIN_LABELS[t].color : DIM,
                fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
                textTransform: "uppercase", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: label.color, letterSpacing: "0.26em", fontWeight: 800, textTransform: "uppercase", fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
          {label.title}
        </div>
        <div style={{ fontSize: 10, color: DIM, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>
          {label.sub}
        </div>
      </div>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-6, 6, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: "flex", justifyContent: "center", gap: 10 }}
      >
        {Array.from({ length: maxLen }).map((_, i) => {
          const filled  = i < digits.length;
          const isCurr  = i === digits.length;
          return (
            <motion.div
              key={i}
              animate={{
                scale: filled ? 1 : isCurr && !loading ? [1, 1.08, 1] : 1,
                background: success
                  ? label.color
                  : filled
                    ? CREAM
                    : "rgba(255,255,255,0.10)",
              }}
              transition={isCurr ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : { duration: 0.15 }}
              style={{
                width: maxLen <= 4 ? 18 : maxLen <= 6 ? 14 : 11,
                height: maxLen <= 4 ? 18 : maxLen <= 6 ? 14 : 11,
                borderRadius: "50%",
                border: `1.5px solid ${filled ? CREAM : isCurr ? `${label.color}88` : "rgba(255,255,255,0.18)"}`,
                boxShadow: filled ? `0 0 8px ${label.color}66` : "none",
              }}
            />
          );
        })}
      </motion.div>

      {/* Error / lockout message */}
      <AnimatePresence>
        {(error || loading) && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              textAlign: "center", fontSize: 11,
              color: error ? "#F07070" : DIM,
              fontFamily: "'Inter', sans-serif", letterSpacing: "0.10em",
              fontWeight: 600, minHeight: 18,
            }}
          >
            {loading ? "VERIFYING..." : error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Numpad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {KEYS.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "⌫") {
            return (
              <KeyBtn key={k} label="⌫" onPress={backspace}
                disabled={digits.length === 0 || loading || success || lockMs > 0}
                accent={AMBER} />
            );
          }
          return (
            <KeyBtn
              key={k} label={k}
              sub={["2","3","4","5","6","7","8","9"].includes(k) ? undefined :
                k === "0" ? "+" : undefined}
              onPress={() => pushDigit(k)}
              disabled={loading || success || lockMs > 0}
              accent={label.color}
            />
          );
        })}
      </div>

      {/* Success state */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center", padding: "10px 0",
              color: label.color, fontSize: 13, fontWeight: 800,
              letterSpacing: "0.20em", textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            ACCESS GRANTED
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel */}
      {onCancel && (
        <button
          type="button" onPointerDown={onCancel}
          style={{
            background: "none", border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 8, padding: "10px 0", cursor: "pointer",
            color: DIM, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          CANCEL
        </button>
      )}
    </motion.div>
  );
}

// ── Full-screen overlay variant ───────────────────────────────────────────────

export function PinMatrixOverlay({
  tier, onSuccess, onCancel, showTierSelector,
}: PinMatrixProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: `rgba(0,0,0,0.88)`,
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 40% 40% at 50% 50%, ${PIN_LABELS[tier].color}12 0%, transparent 70%)`,
      }} />
      <PinMatrix
        tier={tier} onSuccess={onSuccess} onCancel={onCancel}
        showTierSelector={showTierSelector}
      />
    </motion.div>
  );
}

export default PinMatrix;
