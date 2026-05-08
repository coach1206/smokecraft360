/**
 * SpatialResonanceLayer — Phase 2: Spatial Haptics + Sonic DNA.
 *
 * Wraps the application and listens for haptic:ui_physics and haptic:acoustic
 * Socket.io events from the server. Translates them into:
 *
 *   - Liquid-glass ripple overlays (visual haptic feedback)
 *   - Ambient glow pulses on the page surface
 *   - Screen shake for alert patterns
 *   - Web Vibration API calls when available (haptic:vibrate)
 *
 * This is the Tier 1 software fallback — the venue always feels alive
 * even without any physical hardware installed.
 *
 * Usage: wrap <App /> or any page root with <SpatialResonanceLayer>.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { io as socketIO } from "socket.io-client";

interface VisualHaptic {
  id:         string;
  ripple:     boolean;
  glow:       string;
  shake:      boolean;
  blur:       boolean;
  intensity:  string;
  durationMs: number;
  pattern:    string;
  x:          number;
  y:          number;
}

interface AcousticSignal {
  profile:    string;
  intensity:  string;
  durationMs: number;
}

const INTENSITY_OPACITY: Record<string, number> = {
  whisper:  0.06,
  subtle:   0.12,
  moderate: 0.22,
  strong:   0.38,
  full:     0.55,
};

const INTENSITY_SCALE: Record<string, number> = {
  whisper:  0.6,
  subtle:   0.8,
  moderate: 1.0,
  strong:   1.3,
  full:     1.6,
};

interface Props {
  children: React.ReactNode;
  disabled?: boolean;
}

export default function SpatialResonanceLayer({ children, disabled = false }: Props) {
  const [haptics,   setHaptics]   = useState<VisualHaptic[]>([]);
  const [acoustic,  setAcoustic]  = useState<AcousticSignal | null>(null);
  const pageControls = useAnimation();
  const socketRef    = useRef<ReturnType<typeof socketIO> | null>(null);
  const acousticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeHaptic = useCallback((id: string) => {
    setHaptics(prev => prev.filter(h => h.id !== id));
  }, []);

  useEffect(() => {
    if (disabled) return;

    const existing = (window as { _spatialSocket?: ReturnType<typeof socketIO> })._spatialSocket;
    if (existing) { socketRef.current = existing; }
    else {
      socketRef.current = socketIO({ path: "/socket.io", transports: ["websocket"] });
      (window as { _spatialSocket?: ReturnType<typeof socketIO> })._spatialSocket = socketRef.current;
    }

    const sock = socketRef.current;

    sock.on("haptic:ui_physics", (data: {
      eventId: string; pattern: string; intensity: string;
      durationMs: number; visual: { ripple: boolean; glow: string; shake: boolean; blur: boolean };
    }) => {
      const haptic: VisualHaptic = {
        id:         data.eventId,
        ripple:     data.visual.ripple,
        glow:       data.visual.glow,
        shake:      data.visual.shake,
        blur:       data.visual.blur,
        intensity:  data.intensity,
        durationMs: data.durationMs,
        pattern:    data.pattern,
        x:          Math.random() * window.innerWidth,
        y:          Math.random() * window.innerHeight,
      };

      setHaptics(prev => [...prev.slice(-4), haptic]);

      if (data.visual.shake) {
        pageControls.start({
          x: [0, -6, 6, -4, 4, -2, 2, 0],
          transition: { duration: 0.4, ease: "easeOut" },
        });
      }

      setTimeout(() => removeHaptic(haptic.id), data.durationMs + 600);
    });

    sock.on("haptic:vibrate", (data: { vibrationPattern: number[] }) => {
      if ("vibrate" in navigator) {
        try { navigator.vibrate(data.vibrationPattern); } catch { /* not available */ }
      }
    });

    sock.on("haptic:acoustic", (data: { profile: string; intensity: string; durationMs: number }) => {
      setAcoustic({ profile: data.profile, intensity: data.intensity, durationMs: data.durationMs });
      if (acousticTimerRef.current) clearTimeout(acousticTimerRef.current);
      acousticTimerRef.current = setTimeout(() => setAcoustic(null), data.durationMs + 1000);
    });

    return () => {
      sock.off("haptic:ui_physics");
      sock.off("haptic:vibrate");
      sock.off("haptic:acoustic");
      if (acousticTimerRef.current) clearTimeout(acousticTimerRef.current);
    };
  }, [disabled, pageControls, removeHaptic]);

  return (
    <motion.div animate={pageControls} style={{ position: "relative", minHeight: "100dvh" }}>
      {children}

      {/* Ambient acoustic glow overlay */}
      <AnimatePresence>
        {acoustic && (
          <motion.div
            key={`acoustic-${acoustic.profile}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: INTENSITY_OPACITY[acoustic.intensity] ?? 0.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              position:      "fixed",
              inset:         0,
              pointerEvents: "none",
              zIndex:        9998,
              background:    getAcousticGlow(acoustic.profile),
              mixBlendMode:  "screen",
            }}
          />
        )}
      </AnimatePresence>

      {/* Haptic ripple overlays */}
      <AnimatePresence>
        {haptics.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: INTENSITY_OPACITY[h.intensity] ?? 0.2, scale: INTENSITY_SCALE[h.intensity] ?? 1 }}
            exit={{ opacity: 0, scale: 2.5 }}
            transition={{ duration: h.durationMs / 1000, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position:      "fixed",
              left:          h.x - 120,
              top:           h.y - 120,
              width:         240,
              height:        240,
              borderRadius:  "50%",
              pointerEvents: "none",
              zIndex:        9999,
              background:    h.ripple
                ? `radial-gradient(circle, ${h.glow}55 0%, ${h.glow}22 40%, transparent 70%)`
                : "none",
              border:        h.ripple ? `1px solid ${h.glow}44` : "none",
              backdropFilter: h.blur ? "blur(4px)" : "none",
            }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function getAcousticGlow(profile: string): string {
  const glows: Record<string, string> = {
    heartbeat:   "radial-gradient(ellipse at center, rgba(212,139,0,0.15) 0%, transparent 70%)",
    crystalline: "radial-gradient(ellipse at center, rgba(196,169,109,0.18) 0%, transparent 70%)",
    ember:       "radial-gradient(ellipse at 30% 80%, rgba(232,98,38,0.14) 0%, transparent 60%)",
    pour:        "radial-gradient(ellipse at center, rgba(74,143,168,0.12) 0%, transparent 70%)",
    vapor:       "radial-gradient(ellipse at top, rgba(200,200,220,0.08) 0%, transparent 80%)",
    social:      "radial-gradient(ellipse at center, rgba(126,200,160,0.10) 0%, transparent 70%)",
    silence:     "none",
  };
  return glows[profile] ?? glows["heartbeat"]!;
}
