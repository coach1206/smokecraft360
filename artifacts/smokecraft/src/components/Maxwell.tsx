/**
 * Maxwell — AI Trainer floating assistant.
 * Renders a collapsible panel with animated typewriter messages.
 * Mounts in all training pages.
 */

import { useState, useEffect, useRef }        from "react";
import { motion, AnimatePresence }             from "framer-motion";
import { X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { MAXWELL_TIPS }                        from "@/data/trainingData";

const T = {
  bg:     "#0c0914",
  border: "rgba(201,168,76,0.22)",
  gold:   "#c9a84c",
  text:   "rgba(240,232,212,0.92)",
  muted:  "rgba(240,232,212,0.52)",
};

function useTypewriter(text: string, speed = 22) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { setDone(true); clearInterval(ref.current!); }
    }, speed);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [text, speed]);

  return { displayed, done };
}

interface MaxwellProps {
  message:    string;
  context?:   string;
  autoTip?:   boolean;
}

export default function Maxwell({ message, context, autoTip = true }: MaxwellProps) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [currentMsg,   setCurrentMsg]   = useState(message);
  const [tipIdx,       setTipIdx]       = useState(0);
  const [showTip,      setShowTip]      = useState(false);
  const { displayed, done } = useTypewriter(currentMsg);

  // Cycle tips after the main message finishes
  useEffect(() => { setCurrentMsg(message); setShowTip(false); }, [message]);

  useEffect(() => {
    if (!autoTip || !done) return;
    const t = setTimeout(() => { setShowTip(true); }, 4000);
    return () => clearTimeout(t);
  }, [done, autoTip]);

  useEffect(() => {
    if (!showTip || !autoTip) return;
    const t = setInterval(() => {
      setTipIdx((i) => (i + 1) % MAXWELL_TIPS.length);
    }, 8000);
    return () => clearInterval(t);
  }, [showTip, autoTip]);

  const displayText = showTip ? MAXWELL_TIPS[tipIdx]! : displayed;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 50,
        width: collapsed ? 52 : 320,
        background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: `0 0 32px rgba(201,168,76,0.12), 0 8px 32px rgba(0,0,0,0.6)`,
        transition: "width 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: collapsed ? "14px" : "12px 14px",
          cursor: "pointer", justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.1) 70%)`,
              border: `1px solid rgba(201,168,76,0.4)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={10} color={T.gold} />
          </motion.div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.gold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Maxwell
              </div>
              {context && (
                <div style={{ fontSize: 8, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{context}</div>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <ChevronDown size={12} color={T.muted} />
        )}
        {collapsed && (
          <ChevronUp size={12} color={T.gold} />
        )}
      </div>

      {/* Body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{
                fontSize: 11.5, color: T.text, lineHeight: 1.7,
                fontFamily: "'Georgia', 'Cormorant Garamond', serif",
                fontStyle: "italic", minHeight: 48,
              }}>
                "{showTip ? MAXWELL_TIPS[tipIdx] : displayText}
                {!done && !showTip && <span style={{ opacity: 0.5 }}>|</span>}"
              </div>
              {showTip && (
                <div style={{ fontSize: 8, color: T.muted, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Tip {tipIdx + 1} of {MAXWELL_TIPS.length}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
