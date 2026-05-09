/**
 * UniversalTouchAnchors — Always-available gesture entry points
 *
 * Top-left corner zone (120×120px fixed overlay):
 *   • 3-finger long-press (2 000ms) → EEIS / Staff Operational Surface
 *   • 4-finger long-press (1 400ms) + swipe ↓   → Sovereign Ghost Layer
 *
 * A thin arc progress ring fills while holding so staff can see the gesture
 * registering. Fires haptic pulses on each milestone.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHandoff } from "@/contexts/HandoffContext";
import { useSuperAdminSafe } from "@/contexts/SuperAdminContext";
import { useHaptic } from "@/contexts/HapticContext";

const ZONE_SIZE  = 120;   // px — top-left detection zone
const HOLD_EEIS  = 2000;  // ms — 3-finger threshold
const HOLD_GHOST = 1400;  // ms — 4-finger threshold
const TICK_MS    = 30;    // progress animation tick

type AnchorMode = "eeis" | "ghost";

function getMode(count: number): AnchorMode | null {
  if (count >= 4) return "ghost";
  if (count === 3) return "eeis";
  return null;
}

function holdDuration(mode: AnchorMode): number {
  return mode === "ghost" ? HOLD_GHOST : HOLD_EEIS;
}

export function UniversalTouchAnchors() {
  const { triggerHandoff, isStaffMode } = useHandoff();
  const superAdmin                      = useSuperAdminSafe();
  const { triggerHaptic }               = useHaptic();

  const [progress, setProgress] = useState(0);       // 0–1
  const [mode, setMode]         = useState<AnchorMode | null>(null);
  const [fired, setFired]       = useState(false);

  const startTs   = useRef<number | null>(null);
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const swipeYRef = useRef<number | null>(null);      // initial Y for ghost swipe check
  const activeRef = useRef(false);

  const stopProgress = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    startTs.current = null;
    activeRef.current = false;
    setProgress(0);
    setMode(null);
    setFired(false);
    swipeYRef.current = null;
  }, []);

  const startProgress = useCallback((m: AnchorMode, originY: number) => {
    stopProgress();
    activeRef.current = true;
    startTs.current   = Date.now();
    swipeYRef.current = originY;
    setMode(m);
    setFired(false);

    const dur = holdDuration(m);
    tickRef.current = setInterval(() => {
      if (!startTs.current) return;
      const elapsed = Date.now() - startTs.current;
      const p = Math.min(elapsed / dur, 1);
      setProgress(p);
      if (p >= 1 && !fired) {
        clearInterval(tickRef.current!);
        tickRef.current = null;
        setFired(true);
        // For ghost mode, fire immediately on hold complete
        // (swipe direction is detected in onTouchEnd as a secondary check)
        if (m === "eeis" && !isStaffMode) {
          triggerHaptic("ghost", ZONE_SIZE / 2 / window.innerWidth, ZONE_SIZE / 2 / window.innerHeight);
          triggerHandoff(ZONE_SIZE / 2, ZONE_SIZE / 2);
          setTimeout(stopProgress, 400);
        }
        // ghost mode waits for the swipe in onTouchEnd
      }
    }, TICK_MS);
  }, [stopProgress, fired, isStaffMode, triggerHandoff, triggerHaptic]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const inZone = Array.from(e.touches).filter(
      t => t.clientX < ZONE_SIZE && t.clientY < ZONE_SIZE,
    );
    const m = getMode(inZone.length);
    if (!m) { stopProgress(); return; }

    triggerHaptic("tap",
      ZONE_SIZE / 2 / window.innerWidth,
      ZONE_SIZE / 2 / window.innerHeight,
    );

    const avgY = inZone.reduce((s, t) => s + t.clientY, 0) / inZone.length;
    startProgress(m, avgY);
  }, [startProgress, stopProgress, triggerHaptic]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const inZone = Array.from(e.touches).filter(
      t => t.clientX < ZONE_SIZE + 60 && t.clientY < ZONE_SIZE + 60,
    );
    const m = getMode(inZone.length);
    if (!m && activeRef.current) { stopProgress(); }
  }, [stopProgress]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!activeRef.current) return;

    // Ghost mode: require swipe ↓ ≥ 40px after hold completes
    if (mode === "ghost" && fired) {
      const remaining = Array.from(e.changedTouches);
      const avgEndY   = remaining.reduce((s, t) => s + t.clientY, 0) / Math.max(remaining.length, 1);
      const deltaY    = avgEndY - (swipeYRef.current ?? 0);

      if (deltaY >= 40 && superAdmin) {
        triggerHaptic("ghost", ZONE_SIZE / 2 / window.innerWidth, ZONE_SIZE / 2 / window.innerHeight);
        superAdmin.activateGhost();
      } else if (deltaY >= 40 && !superAdmin) {
        triggerHaptic("error", 0.5, 0.5);
      }
    }

    if (e.touches.length === 0) stopProgress();
  }, [mode, fired, superAdmin, stopProgress, triggerHaptic]);

  // Cleanup on unmount
  useEffect(() => () => stopProgress(), [stopProgress]);

  // Arc SVG params
  const R   = 44;
  const CX  = 56;
  const CY  = 56;
  const circ = 2 * Math.PI * R;
  const dash = circ * progress;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        width:      ZONE_SIZE,
        height:     ZONE_SIZE,
        zIndex:     89999,
        touchAction:"none",
      }}
    >
      <AnimatePresence>
        {mode && (
          <motion.svg
            key="arc"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            width={ZONE_SIZE}
            height={ZONE_SIZE}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {/* Track ring */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="rgba(212,139,0,0.15)"
              strokeWidth={2.5}
            />
            {/* Progress arc */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={mode === "ghost" ? "#9BA3B2" : "#D48B00"}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ * 0.25}
              style={{ transition: `stroke-dasharray ${TICK_MS}ms linear` }}
            />
            {/* Center label */}
            <text
              x={CX} y={CY + 4}
              textAnchor="middle"
              fontSize={8}
              letterSpacing="0.1em"
              fill={mode === "ghost" ? "#9BA3B2" : "#D48B00"}
              fontFamily="'Space Mono', monospace"
            >
              {mode === "ghost" ? "SVRGN" : "STAFF"}
            </text>
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}
