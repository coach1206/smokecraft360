/**
 * StaffRippleTransition — Cinematic liquid-glass ripple effect.
 *
 * When a staff member activates operational mode (via PIN, NFC, badge, etc.),
 * the screen ripples outward from the trigger point like liquid glass,
 * distorts, softens, and transitions the customer into Assisted Discovery Mode.
 *
 * On exit, the ripple reverses: smoked glass dissolves, environment reactivates,
 * the mentor re-engages with a natural dialogue line.
 *
 * This component:
 *   1. Subscribes to `staff_mode_started` and `staff_mode_ended` via Socket.io
 *   2. Triggers the ripple animation from (triggerX, triggerY)
 *   3. Manages the overlay + blur lifecycle
 *   4. Exposes onStaffEnter / onStaffExit callbacks for parent coordination
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { socket } from "@/lib/socket";

interface StaffModePayload {
  staffSessionId: string;
  deviceId?:      string;
  triggerX:       number | null;
  triggerY:       number | null;
  triggerMethod:  string;
  ts:             number;
}

interface ExitPayload {
  staffSessionId: string;
  resumeContext:  Record<string, unknown> | null;
  mentorMessage:  string;
  ts:             number;
}

interface Props {
  onStaffEnter?: (payload: StaffModePayload) => void;
  onStaffExit?:  (payload: ExitPayload)      => void;
  children?:     React.ReactNode;
}

export default function StaffRippleTransition({ onStaffEnter, onStaffExit, children }: Props) {
  const [active,    setActive]    = useState(false);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [phase,     setPhase]     = useState<"idle" | "rippling" | "staff" | "reversing">("idle");
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const rippleControls = useAnimation();
  const glassControls  = useAnimation();
  const timerRef       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const triggerEnter = useCallback(async (payload: StaffModePayload) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rx  = payload.triggerX != null ? payload.triggerX / vw : 0.5;
    const ry  = payload.triggerY != null ? payload.triggerY / vh : 0.5;
    setRipplePos({ x: rx, y: ry });
    setPhase("rippling");
    setActive(true);

    // Phase 1: ripple expands from touch point
    await rippleControls.start({
      scale:   [0, 4, 8, 14],
      opacity: [0.6, 0.5, 0.3, 0],
      transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
    });

    // Phase 2: smoked glass settles
    await glassControls.start({
      backdropFilter: "blur(14px) saturate(0.5) brightness(0.7)",
      opacity: 1,
      transition: { duration: 0.5 },
    });

    setPhase("staff");
    onStaffEnter?.(payload);
  }, [rippleControls, glassControls, onStaffEnter]);

  const triggerExit = useCallback(async (payload: ExitPayload) => {
    setPhase("reversing");
    if (payload.mentorMessage) setResumeMsg(payload.mentorMessage);

    // Show mentor message briefly, then reverse
    await new Promise(r => { timerRef.current = setTimeout(r, 1800); });

    // Reverse: glass fades, ripple retracts
    await glassControls.start({
      backdropFilter: "blur(0px) saturate(1) brightness(1)",
      opacity:        0,
      transition:     { duration: 0.7, ease: "easeIn" },
    });

    await rippleControls.start({
      scale:   [14, 4, 0],
      opacity: [0, 0.2, 0],
      transition: { duration: 0.5, ease: "easeIn" },
    });

    setActive(false);
    setPhase("idle");
    setResumeMsg(null);
    onStaffExit?.(payload);
  }, [rippleControls, glassControls, onStaffExit]);

  useEffect(() => {
    socket.on("staff_mode_started", triggerEnter);
    socket.on("staff_mode_ended",   triggerExit);
    return () => {
      socket.off("staff_mode_started", triggerEnter);
      socket.off("staff_mode_ended",   triggerExit);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, [triggerEnter, triggerExit]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position:      "fixed",
              inset:         0,
              zIndex:        200,
              pointerEvents: phase === "staff" ? "none" : "none",
            }}
          >
            {/* Liquid glass overlay */}
            <motion.div
              animate={glassControls}
              initial={{ opacity: 0, backdropFilter: "blur(0px) saturate(1) brightness(1)" }}
              style={{
                position:             "absolute",
                inset:                0,
                background:           "rgba(8,6,4,0.55)",
                WebkitBackdropFilter: "blur(14px) saturate(0.5) brightness(0.7)",
              }}
            />

            {/* Ripple circle from touch origin */}
            <motion.div
              animate={rippleControls}
              initial={{ scale: 0, opacity: 0.6 }}
              style={{
                position:     "absolute",
                left:         `${ripplePos.x * 100}%`,
                top:          `${ripplePos.y * 100}%`,
                width:        80,
                height:       80,
                marginLeft:   -40,
                marginTop:    -40,
                borderRadius: "50%",
                background:   "radial-gradient(circle, rgba(212,139,0,0.45) 0%, rgba(212,139,0,0.08) 50%, transparent 75%)",
                border:       "1px solid rgba(212,139,0,0.5)",
                pointerEvents:"none",
              }}
            />

            {/* Concentric ring wave (CSS animation) */}
            {phase === "rippling" && [0, 1, 2].map(i => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.4 }}
                animate={{ scale: 12 + i * 4, opacity: 0 }}
                transition={{ duration: 1.1, delay: i * 0.18, ease: "easeOut" }}
                style={{
                  position:     "absolute",
                  left:         `${ripplePos.x * 100}%`,
                  top:          `${ripplePos.y * 100}%`,
                  width:        60,
                  height:       60,
                  marginLeft:   -30,
                  marginTop:    -30,
                  borderRadius: "50%",
                  border:       "1px solid rgba(212,139,0,0.3)",
                  pointerEvents:"none",
                }}
              />
            ))}

            {/* Resume mentor message */}
            <AnimatePresence>
              {resumeMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    position:  "absolute",
                    bottom:    "12%",
                    left:      "50%",
                    transform: "translateX(-50%)",
                    textAlign: "center",
                    width:     "min(80vw, 340px)",
                  }}
                >
                  <div style={{
                    fontFamily:    "'Cormorant Garamond', serif",
                    fontSize:      "18px",
                    fontStyle:     "italic",
                    color:         "#F5F2ED",
                    lineHeight:    1.5,
                    textShadow:    "0 2px 20px rgba(0,0,0,0.8)",
                  }}>
                    "{resumeMsg}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
