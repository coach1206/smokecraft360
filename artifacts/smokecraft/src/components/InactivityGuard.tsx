import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

const IDLE_TIMEOUT_MS     = 60 * 1000;
const WARNING_DURATION_MS = 30 * 1000;
const KIOSK_FAILSAFE_MS   = 5  * 1000; // auto-dismiss if input frozen on kiosk
const EXEMPT_PATHS = ["/", "/entry", "/pin-login", "/intro", "/demo"];

export default function InactivityGuard() {
  const [location, navigate] = useLocation();
  const { currentUser, setCurrentUser } = usePosContext();
  const cc = useCommandCenter();
  const [showWarning, setShowWarning]   = useState(false);
  const [countdown, setCountdown]       = useState(30);

  const idleTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warningTimerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const failsafeTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warningActiveRef  = useRef(false);
  const currentUserRef    = useRef(currentUser);
  currentUserRef.current  = currentUser;

  const isExempt    = EXEMPT_PATHS.includes(location);
  const isExemptRef = useRef(isExempt);
  isExemptRef.current = isExempt;

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current)     clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current)  clearTimeout(warningTimerRef.current);
    if (countdownRef.current)     clearInterval(countdownRef.current);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    idleTimerRef.current     = null;
    warningTimerRef.current  = null;
    countdownRef.current     = null;
    failsafeTimerRef.current = null;
  }, []);

  const lockSession = useCallback(() => {
    clearAllTimers();
    warningActiveRef.current = false;
    setShowWarning(false);
    cc.addAuditEntry("session.timeout", "Session auto-locked due to inactivity", currentUserRef.current?.name ?? "System");
    setCurrentUser(null);
    navigate("/pin-login");
  }, [clearAllTimers, cc, setCurrentUser, navigate]);

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      setShowWarning(true);
      setCountdown(30);

      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);

      warningTimerRef.current = setTimeout(() => {
        lockSession();
      }, WARNING_DURATION_MS);

      // Kiosk failsafe: auto-restore session if buttons remain unresponsive
      failsafeTimerRef.current = setTimeout(() => {
        if (warningActiveRef.current) {
          clearAllTimers();
          warningActiveRef.current = false;
          setShowWarning(false);
          setCountdown(30);
          startIdleTimer();
        }
      }, KIOSK_FAILSAFE_MS);
    }, IDLE_TIMEOUT_MS);
  }, [lockSession, clearAllTimers]);

  // "I'm Still Here" — clear all timers, unlock, restart idle watch
  const handleDismissWarning = useCallback(() => {
    clearAllTimers();
    warningActiveRef.current = false;
    setShowWarning(false);
    setCountdown(30);
    startIdleTimer();
  }, [clearAllTimers, startIdleTimer]);

  // "Start New Experience" — reset session entirely and navigate to SmokeCraft
  const handleNewExperience = useCallback(() => {
    clearAllTimers();
    warningActiveRef.current = false;
    setShowWarning(false);
    setCountdown(30);
    setCurrentUser(null);
    // Hard navigate to ensure all MasterBlender state is wiped
    window.location.href = "/smokecraft";
  }, [clearAllTimers, setCurrentUser]);

  useEffect(() => {
    if (isExempt) {
      clearAllTimers();
      warningActiveRef.current = false;
      setShowWarning(false);
      return;
    }

    startIdleTimer();

    const events = ["mousedown", "touchstart", "keydown", "mousemove", "scroll"] as const;
    const handler = () => {
      if (!warningActiveRef.current && !isExemptRef.current) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          warningActiveRef.current = true;
          setShowWarning(true);
          setCountdown(30);

          countdownRef.current = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
          }, 1000);

          warningTimerRef.current = setTimeout(() => {
            lockSession();
          }, WARNING_DURATION_MS);

          failsafeTimerRef.current = setTimeout(() => {
            if (warningActiveRef.current) {
              clearAllTimers();
              warningActiveRef.current = false;
              setShowWarning(false);
              setCountdown(30);
              startIdleTimer();
            }
          }, KIOSK_FAILSAFE_MS);
        }, IDLE_TIMEOUT_MS);
      }
    };

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExempt, location, currentUser]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          key="inactivity-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position:        "fixed",
            inset:           0,
            // High enough to clear all MasterBlender layers (max 9998) + margin
            zIndex:          999990,
            background:      "rgba(10,9,8,0.72)",
            backdropFilter:  "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            padding:         24,
            // Always interactive — AnimatePresence handles the unmount
            pointerEvents:   "auto",
          }}
          // Tapping the backdrop itself does NOT dismiss (must use buttons)
          onClick={e => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.92, opacity: 0, y: 16  }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              position:   "relative",
              zIndex:     999991,
              width:      "100%",
              maxWidth:   420,
              borderRadius: 20,
              background: "linear-gradient(145deg, rgba(18,15,10,0.97), rgba(30,27,20,0.95))",
              border:     "1px solid rgba(212,175,55,0.25)",
              boxShadow:  "0 32px 80px rgba(0,0,0,0.90), 0 0 0 1px rgba(212,175,55,0.08)",
              padding:    "36px 28px 28px",
              textAlign:  "center",
              // Explicit: no child inherits pointer-events:none
              pointerEvents: "auto",
            }}
          >
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
              background: "rgba(239,68,68,0.10)",
              border:     "1px solid rgba(239,68,68,0.28)",
              display:    "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: "#fffcf5", marginBottom: 8, fontFamily: "'Cormorant Garamond',serif", letterSpacing: "0.04em" }}>
              Session Timeout
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,252,245,0.45)", marginBottom: 20, letterSpacing: "0.03em" }}>
              Session inactive. Restarting automatically in:
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 28, color: "#ef4444", fontSize: 30, fontWeight: 700,
            }}>
              <Clock size={26} />
              <span>{countdown}s</span>
            </div>

            {/* Button container — explicit pointer-events + z-index to guarantee hit targets */}
            <div style={{
              position:      "relative",
              zIndex:        999999,
              pointerEvents: "auto",
              display:       "flex",
              flexDirection: "column",
              gap:           10,
            }}>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 28px rgba(212,175,55,0.28)" }}
                whileTap={{   scale: 0.96, y: 2, boxShadow: "inset 0px 4px 12px rgba(0,0,0,0.80)" }}
                onMouseDown={handleDismissWarning}
                onTouchStart={handleDismissWarning}
                style={{
                  width:        "100%",
                  padding:      "17px 20px",
                  borderRadius: 12,
                  fontSize:     15,
                  fontWeight:   700,
                  letterSpacing: "0.06em",
                  background:   "linear-gradient(135deg, #D48B00, #a98828)",
                  border:       "none",
                  color:        "#fffcf5",
                  cursor:       "pointer",
                  minHeight:    56,
                  fontFamily:   "'Inter',sans-serif",
                  pointerEvents: "auto",
                  position:     "relative",
                  zIndex:       999999,
                }}
              >
                I&apos;m Still Here
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{   scale: 0.96, y: 2, boxShadow: "inset 0px 4px 12px rgba(0,0,0,0.80)" }}
                onMouseDown={handleNewExperience}
                onTouchStart={handleNewExperience}
                style={{
                  width:        "100%",
                  padding:      "15px 20px",
                  borderRadius: 12,
                  fontSize:     14,
                  fontWeight:   600,
                  letterSpacing: "0.05em",
                  background:   "rgba(239,68,68,0.08)",
                  border:       "1px solid rgba(239,68,68,0.28)",
                  color:        "rgba(239,68,68,0.88)",
                  cursor:       "pointer",
                  minHeight:    52,
                  fontFamily:   "'Inter',sans-serif",
                  pointerEvents: "auto",
                  position:     "relative",
                  zIndex:       999999,
                }}
              >
                Start New Experience
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
