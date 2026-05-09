/**
 * GhostEntryTrigger — Axiom OS Ghost Layer Entry
 *
 * Invisible fixed-position layer. Detects the sovereign access gesture:
 *   Phase 1: 4-finger simultaneous touch held for 1400ms → pattern challenge appears
 *   Phase 2: Swipe directional pattern (RIGHT → DOWN → RIGHT → LEFT) to unlock
 *
 * On success → calls activateGhost(). Only activates if user has SOVEREIGN/SHIFT_LEAD tier.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSuperAdminSafe } from "@/contexts/SuperAdminContext";
import { AccessLevel, GHOST_PATTERN, type SwipeDir } from "@/lib/authorityEngine";

const GOLD     = "#D48B00";
const GRAPHITE = "#1C1C1E";

const DIR_LABEL: Record<SwipeDir, string> = {
  right: "→",
  down:  "↓",
  left:  "←",
  up:    "↑",
};

function detectSwipeDir(dx: number, dy: number): SwipeDir | null {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx < 28 && ady < 28) return null;
  if (adx > ady) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export function GhostEntryTrigger() {
  const ctx = useSuperAdminSafe();
  if (!ctx) return null;

  const { activateGhost, authority } = ctx;

  if (authority.tier > AccessLevel.SHIFT_LEAD) return null;

  return <GhostTriggerInner activateGhost={activateGhost} />;
}

function GhostTriggerInner({ activateGhost }: { activateGhost: () => void }) {
  const holdTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase]          = useState<"idle" | "holding" | "pattern" | "error">("idle");
  const [holdProg, setHoldProg]    = useState(0);
  const [pattern,  setPattern]     = useState<SwipeDir[]>([]);
  const [rejected, setRejected]    = useState(false);
  const progRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const HOLD_MS    = 1400;

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progRef.current)  clearInterval(progRef.current);
    setPhase("idle");
    setHoldProg(0);
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length < 4 || phase !== "idle") return;
    const start = Date.now();
    setPhase("holding");
    progRef.current = setInterval(() => {
      setHoldProg(Math.min(1, (Date.now() - start) / HOLD_MS));
    }, 32);
    holdTimer.current = setTimeout(() => {
      if (progRef.current) clearInterval(progRef.current);
      setHoldProg(1);
      setPhase("pattern");
      setPattern([]);
    }, HOLD_MS);
  }, [phase]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length >= 4) return;
    if (phase === "holding") cancelHold();
  }, [phase, cancelHold]);

  const onPatternTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onPatternTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t  = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    const dir = detectSwipeDir(dx, dy);
    if (!dir) return;

    setPattern(prev => {
      const next = [...prev, dir];
      const expected = GHOST_PATTERN[prev.length];
      if (dir !== expected) {
        setRejected(true);
        setTimeout(() => { setRejected(false); setPattern([]); }, 900);
        return [];
      }
      if (next.length === GHOST_PATTERN.length) {
        setTimeout(() => { setPhase("idle"); setPattern([]); activateGhost(); }, 200);
      }
      return next;
    });
  }, [activateGhost]);

  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, [onTouchStart, onTouchEnd]);

  return (
    <AnimatePresence>
      {phase === "holding" && (
        <motion.div
          key="hold-ring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9990,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg width={100} height={100} style={{ position: "absolute", inset: 0 }}>
              <circle cx={50} cy={50} r={44} fill="none" stroke={`${GOLD}22`} strokeWidth={3} />
              <circle
                cx={50} cy={50} r={44}
                fill="none"
                stroke={GOLD}
                strokeWidth={3}
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - holdProg)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: "stroke-dashoffset 0.05s linear" }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, letterSpacing: "0.18em", color: `${GOLD}CC`,
              fontFamily: "'Space Mono', monospace",
            }}>
              HOLD
            </div>
          </div>
        </motion.div>
      )}

      {phase === "pattern" && (
        <motion.div
          key="pattern-challenge"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onTouchStart={onPatternTouchStart}
          onTouchEnd={onPatternTouchEnd}
          style={{
            position: "fixed", inset: 0, zIndex: 9991,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{
            background: `linear-gradient(160deg, ${GRAPHITE}, #0a0a0a)`,
            border: `1px solid ${GOLD}30`,
            borderRadius: 24,
            padding: "40px 48px",
            textAlign: "center",
            boxShadow: `0 0 80px rgba(0,0,0,0.8), 0 0 40px ${GOLD}10`,
            minWidth: 320,
          }}>
            <div style={{
              fontSize: 8, letterSpacing: "0.3em", color: `${GOLD}80`,
              fontFamily: "'Space Mono', monospace", marginBottom: 20,
              textTransform: "uppercase",
            }}>
              SOVEREIGN ACCESS PATTERN
            </div>

            <div style={{
              display: "flex", gap: 12, justifyContent: "center", marginBottom: 28,
            }}>
              {GHOST_PATTERN.map((dir, i) => {
                const done  = i < pattern.length;
                const next  = i === pattern.length;
                return (
                  <motion.div
                    key={i}
                    animate={next ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : {}}
                    transition={{ duration: 0.9, repeat: next ? Infinity : 0 }}
                    style={{
                      width: 52, height: 52,
                      borderRadius: 14,
                      border: `1px solid ${done ? GOLD : next ? `${GOLD}80` : `${GOLD}20`}`,
                      background: done ? `${GOLD}18` : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, color: done ? GOLD : next ? `${GOLD}90` : `${GOLD}25`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {DIR_LABEL[dir]}
                  </motion.div>
                );
              })}
            </div>

            {rejected && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontSize: 9, color: "#ef4444",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.18em", marginBottom: 12,
                }}
              >
                PATTERN REJECTED — RETRY
              </motion.div>
            )}

            <div style={{
              fontSize: 9, color: `${GOLD}40`,
              fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em",
            }}>
              Swipe each direction in sequence
            </div>

            <button
              onClick={() => setPhase("idle")}
              style={{
                marginTop: 24, background: "transparent",
                border: `1px solid ${GOLD}20`, borderRadius: 8,
                padding: "8px 20px", fontSize: 8,
                color: `${GOLD}50`, cursor: "pointer",
                fontFamily: "'Space Mono', monospace", letterSpacing: "0.18em",
              }}
            >
              CANCEL
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
