/**
 * HapticContext — NOVEE OS Haptic Pulse System
 *
 * Visual feedback profiles for every touch interaction class.
 * Renders as a fixed overlay that never interferes with layout.
 *
 * Profiles:
 *   tap     — quick gold ripple at touch point (standard press)
 *   success — three expanding emerald rings from center (confirmation)
 *   ghost   — slow 4-ring metallic gold/titanium pulse (EEIS/Ghost entry)
 *   kill    — red screen tint + radial burst (kill-switch activation)
 *   error   — red double flash (rejected pattern, auth failure)
 *   swipe   — directional shimmer trail at swipe origin
 */

import {
  createContext, useContext, useCallback, useRef, useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

export type HapticProfile = "tap" | "success" | "ghost" | "kill" | "error" | "swipe";

interface HapticEvent {
  id:      string;
  type:    HapticProfile;
  x:       number;   // viewport x (0–1 fraction)
  y:       number;   // viewport y (0–1 fraction)
  ts:      number;
}

interface HapticContextValue {
  triggerHaptic: (type: HapticProfile, x?: number, y?: number) => void;
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const GOLD     = "#D48B00";
const TITANIUM = "#C4C4C4";
const EMERALD  = "#34D399";
const RED      = "#EF4444";

// ── Context ───────────────────────────────────────────────────────────────────

const HapticContext = createContext<HapticContextValue | null>(null);

export function useHaptic(): HapticContextValue {
  const ctx = useContext(HapticContext);
  if (!ctx) return { triggerHaptic: () => {} };
  return ctx;
}

// ── Profile renderers ─────────────────────────────────────────────────────────

function TapPulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  return (
    <motion.div
      key={ev.id}
      initial={{ scale: 0.3, opacity: 0.8 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position:      "fixed",
        left:          `${ev.x * 100}%`,
        top:           `${ev.y * 100}%`,
        width:         48, height: 48,
        marginLeft:    -24, marginTop: -24,
        borderRadius:  "50%",
        border:        `2px solid ${GOLD}`,
        boxShadow:     `0 0 20px ${GOLD}60`,
        pointerEvents: "none",
        zIndex:        99999,
      }}
    />
  );
}

function SuccessPulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0.2, opacity: 0.7 }}
          animate={{ scale: 2.4 + i * 0.6, opacity: 0 }}
          transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
          onAnimationComplete={i === 2 ? onDone : undefined}
          style={{
            position:     "absolute",
            left:         "50%", top: "50%",
            width:        100, height: 100,
            marginLeft:   -50, marginTop: -50,
            borderRadius: "50%",
            border:       `2px solid ${EMERALD}`,
            boxShadow:    `0 0 30px ${EMERALD}40`,
          }}
        />
      ))}
    </div>
  );
}

function GhostPulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  const rings = [
    { color: GOLD,     delay: 0,    scale: 3.0 },
    { color: TITANIUM, delay: 0.15, scale: 4.0 },
    { color: GOLD,     delay: 0.30, scale: 5.2 },
    { color: TITANIUM, delay: 0.45, scale: 6.8 },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {/* Metallic center flash */}
      <motion.div
        initial={{ opacity: 0.25 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9, delay: 0.1 }}
        style={{
          position:   "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${GOLD}18 0%, transparent 65%)`,
        }}
      />
      {rings.map((r, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.1, opacity: 0.65 }}
          animate={{ scale: r.scale, opacity: 0 }}
          transition={{ duration: 1.1, delay: r.delay, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={i === rings.length - 1 ? onDone : undefined}
          style={{
            position:     "absolute",
            left:         "50%", top: "50%",
            width:        80, height: 80,
            marginLeft:   -40, marginTop: -40,
            borderRadius: "50%",
            border:       `1px solid ${r.color}`,
            boxShadow:    `0 0 24px ${r.color}50`,
          }}
        />
      ))}
    </div>
  );
}

function KillPulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {/* Screen tint */}
      <motion.div
        initial={{ opacity: 0.28 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, background: RED }}
      />
      {/* Radial burst */}
      {[0, 1].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0.15, opacity: 0.7 }}
          animate={{ scale: 3.5 + i, opacity: 0 }}
          transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
          onAnimationComplete={i === 1 ? onDone : undefined}
          style={{
            position:     "absolute",
            left:         `${ev.x * 100}%`, top: `${ev.y * 100}%`,
            width:        60, height: 60,
            marginLeft:   -30, marginTop: -30,
            borderRadius: "50%",
            border:       `2px solid ${RED}`,
            boxShadow:    `0 0 32px ${RED}80`,
          }}
        />
      ))}
    </div>
  );
}

function ErrorPulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {[0, 1].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.2, delay: i * 0.22, ease: "easeInOut" }}
          onAnimationComplete={i === 1 ? onDone : undefined}
          style={{ position: "absolute", inset: 0, background: RED }}
        />
      ))}
    </div>
  );
}

function SwipePulse({ ev, onDone }: { ev: HapticEvent; onDone: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ x: 0, opacity: 0.5, scale: 1 }}
          animate={{ x: 24 + i * 16, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.38, delay: i * 0.06, ease: "easeOut" }}
          onAnimationComplete={i === 2 ? onDone : undefined}
          style={{
            position:     "absolute",
            left:         `${ev.x * 100}%`,
            top:          `${ev.y * 100}%`,
            width:        12, height: 12,
            marginLeft:   -6, marginTop: -6,
            borderRadius: "50%",
            background:   GOLD,
            boxShadow:    `0 0 8px ${GOLD}`,
          }}
        />
      ))}
    </div>
  );
}

// ── Renderer dispatcher ───────────────────────────────────────────────────────

function HapticRenderer({ events, remove }: { events: HapticEvent[]; remove: (id: string) => void }) {
  return (
    <AnimatePresence>
      {events.map(ev => {
        const done = () => remove(ev.id);
        switch (ev.type) {
          case "tap":     return <TapPulse     key={ev.id} ev={ev} onDone={done} />;
          case "success": return <SuccessPulse key={ev.id} ev={ev} onDone={done} />;
          case "ghost":   return <GhostPulse   key={ev.id} ev={ev} onDone={done} />;
          case "kill":    return <KillPulse     key={ev.id} ev={ev} onDone={done} />;
          case "error":   return <ErrorPulse   key={ev.id} ev={ev} onDone={done} />;
          case "swipe":   return <SwipePulse   key={ev.id} ev={ev} onDone={done} />;
          default:        return null;
        }
      })}
    </AnimatePresence>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function HapticProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<HapticEvent[]>([]);
  const counter = useRef(0);

  const triggerHaptic = useCallback((type: HapticProfile, x = 0.5, y = 0.5) => {
    // Web Vibrate API — physical resistance pulse on every touch class
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const pattern: number | number[] =
        type === "success" ? [20, 30, 20] :
        type === "ghost"   ? [30, 20, 30] :
        type === "kill"    ? [50, 30, 50] :
        type === "error"   ? [20, 20, 20] :
        type === "swipe"   ? 15           :
        20;
      try { navigator.vibrate(pattern); } catch { /* unsupported — ignore */ }
    }
    const id = `hap-${++counter.current}`;
    setEvents(prev => [...prev.slice(-6), { id, type, x, y, ts: Date.now() }]);
  }, []);

  const remove = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <HapticContext.Provider value={{ triggerHaptic }}>
      {children}
      <HapticRenderer events={events} remove={remove} />
    </HapticContext.Provider>
  );
}
