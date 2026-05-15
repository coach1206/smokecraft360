/**
 * PinGate — Sovereign Access PIN entry.
 * Ritual Moment 2 of the 14-step ritual. Renders after CinematicLanding's
 * Scene 2 handshake fires onActivate().
 *
 * Design: v2026.0514 FINAL_POLISH_PROTOCOL
 * — True Obsidian (#010101), 24k Gold leaf slots, machined glass panel,
 *   Cormorant Garamond serif display.
 *
 * Demo mode: any 4-digit PIN authenticates (theatrical only).
 * The 1.8s "authenticating" phase lets the investor watch the system "think."
 */

import { useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

const silk = [0.25, 0.1, 0.25, 1] as const;

interface Props {
  onSuccess: () => void;
}

type AuthState = "idle" | "authenticating" | "success";

const SMOKE = [
  { left: "18%", w: 260, h: 340, blur: 100, op: 0.09, dur: 12, delay: 0   },
  { left: "72%", w: 220, h: 280, blur: 90,  op: 0.07, dur: 10, delay: 3   },
  { left: "44%", w: 300, h: 400, blur: 120, op: 0.06, dur: 15, delay: 6   },
];

const PAD_KEYS = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];

export default function PinGate({ onSuccess }: Props) {
  const [digits, setDigits]       = useState<string[]>([]);
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [authStep, setAuthStep]   = useState(0);
  const slotControls              = useAnimation();

  const runAuth = async () => {
    setAuthState("authenticating");
    const steps = [
      "VALIDATING CREDENTIALS…",
      "CROSS-REFERENCING SOVEREIGN KEY…",
      "ESTABLISHING SESSION TUNNEL…",
      "ACCESS GRANTED",
    ];
    for (let i = 0; i < steps.length; i++) {
      setAuthStep(i);
      await new Promise(r => setTimeout(r, 420));
    }
    setAuthState("success");
    await slotControls.start({
      boxShadow: [
        "0 0 0px rgba(212,139,0,0)",
        "0 0 60px rgba(212,139,0,0.80)",
        "0 0 20px rgba(212,139,0,0.40)",
      ],
      transition: { duration: 0.8, ease: "easeOut" },
    });
    await new Promise(r => setTimeout(r, 700));
    onSuccess();
  };

  const handleKey = (k: string) => {
    if (authState !== "idle") return;
    if (k === "⌫") {
      setDigits(p => p.slice(0, -1));
    } else if (k === "✓") {
      if (digits.length === 4) runAuth();
    } else {
      if (digits.length >= 4) return;
      const next = [...digits, k];
      setDigits(next);
      if (next.length === 4) setTimeout(runAuth, 380);
    }
  };

  const AUTH_LABELS = [
    "VALIDATING CREDENTIALS…",
    "CROSS-REFERENCING SOVEREIGN KEY…",
    "ESTABLISHING SESSION TUNNEL…",
    "ACCESS GRANTED",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: silk } }}
      transition={{ duration: 0.5, ease: silk }}
      style={{
        position: "fixed", inset: 0, zIndex: 170,
        background: "#010101",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── Ambient smoke wisps ─────────────────────────────────────── */}
      {SMOKE.map((s, i) => (
        <motion.div key={i}
          style={{
            position: "absolute",
            left: s.left, bottom: "10%",
            width: s.w, height: s.h,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(170,162,152,1) 0%, transparent 70%)",
            filter: `blur(${s.blur}px)`,
            opacity: s.op,
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
          animate={{
            y:       [0, -80, 0],
            opacity: [s.op, s.op * 1.7, s.op],
            scaleX:  [1, 1.12, 1],
          }}
          transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}

      {/* ── Ambient top glow ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: "20%", right: "20%", height: "30%",
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,139,0,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Machined glass panel ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: silk, delay: 0.15 }}
        style={{
          position: "relative",
          width: "min(420px, 92vw)",
          background: "rgba(14,10,6,0.82)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(191,149,63,0.20)",
          borderRadius: 4,
          padding: "48px 40px 44px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.04)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
        }}
      >
        {/* Top rule */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.55), transparent)",
        }} />

        {/* Eyebrow */}
        <p style={{
          fontSize: 9, letterSpacing: "0.45em", textTransform: "uppercase",
          color: "rgba(212,139,0,0.55)", fontFamily: "'Cormorant Garamond', serif",
          marginBottom: 10,
        }}>
          NOVEE OS · SOVEREIGN ACCESS
        </p>

        {/* Heading */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 300,
          letterSpacing: "0.18em",
          color: "rgba(232,222,208,0.95)",
          textAlign: "center",
          marginBottom: 6,
        }}>
          SESSION AUTHENTICATION
        </h1>

        <p style={{
          fontSize: 11, color: "rgba(180,165,140,0.45)",
          letterSpacing: "0.15em", textTransform: "uppercase",
          marginBottom: 36,
        }}>
          Enter 4-digit session code to proceed
        </p>

        {/* ── PIN digit slots ──────────────────────────────────────── */}
        <motion.div
          animate={slotControls}
          style={{
            display: "flex", gap: 14, marginBottom: 36,
            borderRadius: 4,
          }}
        >
          {[0, 1, 2, 3].map(i => {
            const filled  = i < digits.length;
            const active  = i === digits.length && authState === "idle";
            return (
              <motion.div key={i}
                animate={
                  authState === "authenticating" && filled
                    ? { borderColor: ["rgba(212,139,0,0.6)", "rgba(212,139,0,1)", "rgba(212,139,0,0.6)"] }
                    : authState === "success" && filled
                    ? { borderColor: "rgba(100,220,120,0.8)" }
                    : {}
                }
                transition={{ duration: 0.8, repeat: authState === "authenticating" ? Infinity : 0, ease: "easeInOut" }}
                style={{
                  width: 58, height: 70,
                  borderRadius: 3,
                  border: `1px solid ${
                    active        ? "rgba(212,139,0,0.70)" :
                    filled        ? "rgba(212,139,0,0.45)" :
                                    "rgba(255,255,255,0.08)"
                  }`,
                  background: filled
                    ? "rgba(212,139,0,0.08)"
                    : "rgba(255,255,255,0.02)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: active
                    ? "0 0 18px rgba(212,139,0,0.20), inset 0 0 10px rgba(212,139,0,0.05)"
                    : filled
                    ? "0 0 10px rgba(212,139,0,0.10)"
                    : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {filled && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background:
                        authState === "success"
                          ? "rgba(100,220,120,0.85)"
                          : "rgba(212,139,0,0.85)",
                    }}
                  />
                )}
                {!filled && active && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 2, height: 28, borderRadius: 2,
                      background: "rgba(212,139,0,0.55)",
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Auth status line ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {authState !== "idle" && (
            <motion.p key="auth-status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: 9, letterSpacing: "0.35em", textTransform: "uppercase",
                color: authState === "success" ? "rgba(100,220,120,0.80)" : "rgba(212,139,0,0.65)",
                marginBottom: 20, textAlign: "center",
              }}
            >
              {AUTH_LABELS[authStep]}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Keypad ───────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10, width: "100%",
        }}>
          {PAD_KEYS.map(k => {
            const isConfirm   = k === "✓";
            const isBackspace = k === "⌫";
            const disabled    = authState !== "idle" || (isConfirm && digits.length < 4);
            return (
              <motion.button key={k}
                whileHover={!disabled ? { scale: 1.04, backgroundColor: "rgba(212,139,0,0.10)" } : {}}
                whileTap={!disabled   ? { scale: 0.94 } : {}}
                onClick={() => handleKey(k)}
                disabled={disabled}
                style={{
                  height: 56,
                  borderRadius: 3,
                  border: isConfirm
                    ? `1px solid ${disabled ? "rgba(212,139,0,0.15)" : "rgba(212,139,0,0.45)"}`
                    : "1px solid rgba(255,255,255,0.07)",
                  background: isConfirm
                    ? (disabled ? "rgba(212,139,0,0.04)" : "rgba(212,139,0,0.10)")
                    : "rgba(255,255,255,0.025)",
                  color: isConfirm
                    ? (disabled ? "rgba(212,139,0,0.30)" : "rgba(212,139,0,0.90)")
                    : isBackspace
                    ? "rgba(200,185,160,0.55)"
                    : "rgba(220,210,195,0.85)",
                  fontSize: isConfirm || isBackspace ? 18 : 20,
                  fontFamily: isConfirm || isBackspace ? "inherit" : "'Cormorant Garamond', serif",
                  fontWeight: isConfirm ? 300 : 400,
                  letterSpacing: isConfirm ? "0.15em" : 0,
                  cursor: disabled ? "default" : "pointer",
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
              >
                {k}
              </motion.button>
            );
          })}
        </div>

        {/* Bottom rule */}
        <div style={{
          position: "absolute", bottom: 0, left: "15%", right: "15%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.20), transparent)",
        }} />
      </motion.div>

      {/* Corner watermark */}
      <p style={{
        position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
        fontSize: 9, letterSpacing: "0.4em", color: "rgba(191,149,63,0.22)",
        textTransform: "uppercase", whiteSpace: "nowrap",
      }}>
        NOVEE OS · 360 ENTERPRISE SERVICES · SOVEREIGN PROTOCOL
      </p>
    </motion.div>
  );
}
