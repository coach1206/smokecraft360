import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const WARNING_DURATION_MS = 30 * 1000;
const EXEMPT_PATHS = ["/", "/entry", "/pin-login", "/intro", "/demo"];

export default function InactivityGuard() {
  const [location, navigate] = useLocation();
  const { currentUser, setCurrentUser } = usePosContext();
  const cc = useCommandCenter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const isExempt = EXEMPT_PATHS.includes(location) || !currentUser;
  const isExemptRef = useRef(isExempt);
  isExemptRef.current = isExempt;

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    idleTimerRef.current = null;
    warningTimerRef.current = null;
    countdownRef.current = null;
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
        setCountdown(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);

      warningTimerRef.current = setTimeout(() => {
        lockSession();
      }, WARNING_DURATION_MS);
    }, IDLE_TIMEOUT_MS);
  }, [lockSession]);

  const handleDismissWarning = useCallback(() => {
    clearAllTimers();
    warningActiveRef.current = false;
    setShowWarning(false);
    startIdleTimer();
  }, [clearAllTimers, startIdleTimer]);

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
            setCountdown(prev => {
              if (prev <= 1) return 0;
              return prev - 1;
            });
          }, 1000);

          warningTimerRef.current = setTimeout(() => {
            lockSession();
          }, WARNING_DURATION_MS);
        }, IDLE_TIMEOUT_MS);
      }
    };

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearAllTimers();
    };
  }, [isExempt, location, currentUser]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            style={{
              width: "100%", maxWidth: 380, borderRadius: 20,
              background: "linear-gradient(145deg, #1e1b17, #141210)",
              border: "1px solid rgba(239,68,68,0.3)",
              padding: "32px 24px", textAlign: "center",
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e0c8", marginBottom: 8 }}>
              Session Timeout
            </div>
            <div style={{ fontSize: 13, color: "rgba(232,224,200,0.5)", marginBottom: 20 }}>
              You've been inactive for 5 minutes. Your session will be locked automatically.
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 24, color: "#ef4444", fontSize: 28, fontWeight: 700,
            }}>
              <Clock size={24} />
              <span>{countdown}s</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDismissWarning}
              style={{
                width: "100%", padding: "16px", borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                background: "linear-gradient(135deg, #d4af37, #a98828)",
                border: "none", color: "#0a0806", cursor: "pointer", minHeight: 52,
              }}
            >
              I'm Still Here
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
