/**
 * AmbassadorGate — /ambassador-gate
 * Magic Link entry for Clark (chrislclark@gmail.com).
 * Same secure JWT flow as the Sovereign Gate — restricted to the Ambassador email only.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowRight, Loader, Check, ChevronLeft } from "lucide-react";

const C = {
  bg:     "#050505",
  gold:   "#D4AF37",
  amber:  "#B89030",
  ink:    "#F5F2ED",
  muted:  "rgba(245,242,237,0.40)",
  dim:    "rgba(245,242,237,0.20)",
  border: "rgba(212,175,55,0.22)",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
};

type Stage = "idle" | "sending" | "sent" | "error";

export default function AmbassadorGate() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [, navigate] = useLocation();

  const request = async () => {
    if (!email.includes("@")) return;
    setStage("sending");
    try {
      await fetch("/api/ambassador/magic-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setStage("sent");
    } catch {
      setStage("error");
    }
  };

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: C.mono, position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 220, background: "radial-gradient(ellipse,rgba(212,175,55,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Scan line */}
      <motion.div animate={{ y: ["0vh","100vh"] }} transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
        style={{ position: "fixed", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.12),transparent)", top: 0, pointerEvents: "none" }} />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        onClick={() => navigate("/sovereign-dashboard")}
        style={{
          position: "fixed", top: 24, left: 24,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(212,175,55,0.08)", border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "10px 16px", cursor: "pointer",
          color: C.gold, fontFamily: C.mono, fontSize: 10,
          letterSpacing: "0.18em", zIndex: 100,
          minHeight: 44,
        }}
        whileHover={{ background: "rgba(212,175,55,0.14)" }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronLeft size={14} />
        BACK
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        style={{
          background: "rgba(14,12,10,0.97)", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "52px 56px", maxWidth: 440, width: "90%",
          textAlign: "center", boxShadow: "0 0 80px rgba(212,175,55,0.04)",
        }}
      >
        {/* Icon */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.gold}12`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
          <Star size={22} color={C.gold} />
        </div>

        <div style={{ fontSize: 10, letterSpacing: "0.30em", color: `${C.gold}50`, marginBottom: 12 }}>
          NOVEE OS · AMBASSADOR ACCESS
        </div>
        <div style={{ fontSize: 26, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", fontWeight: 300, marginBottom: 8 }}>
          AMBASSADOR<br/>COMMAND DECK
        </div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.18em", marginBottom: 40, lineHeight: 1.8 }}>
          DEMO MODE · 360 ENTERPRISES SERVICES LLC<br/>
          AUTHORIZED PERSONNEL ONLY
        </div>

        <AnimatePresence mode="wait">
          {stage !== "sent" ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "left", marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", marginBottom: 8 }}>
                  AMBASSADOR EMAIL
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && request()}
                    placeholder="your@email.com"
                    style={{
                      flex: 1, padding: "12px 16px", borderRadius: 8,
                      background: "rgba(245,242,237,0.05)", border: `1px solid ${C.border}`,
                      color: C.ink, fontSize: 12, fontFamily: C.mono, outline: "none",
                    }}
                  />
                  <motion.button whileTap={{ scale: 0.94 }} onClick={request}
                    disabled={stage === "sending" || !email.includes("@")}
                    style={{
                      padding: "12px 18px", borderRadius: 8,
                      background: stage === "sending" ? `${C.gold}30` : C.gold,
                      border: "none", color: "#050505", cursor: stage === "sending" ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800,
                      letterSpacing: "0.10em", opacity: !email.includes("@") ? 0.45 : 1,
                    }}
                  >
                    {stage === "sending"
                      ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                      : <ArrowRight size={14} />}
                  </motion.button>
                </div>
              </div>
              {stage === "error" && (
                <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: "0.14em", marginTop: 10 }}>
                  REQUEST FAILED — CHECK NETWORK AND RETRY
                </div>
              )}
              <div style={{ fontSize: 9, color: C.dim, marginTop: 20, lineHeight: 1.8, letterSpacing: "0.10em" }}>
                ENTER YOUR AMBASSADOR EMAIL · A SECURE 15-MINUTE<br/>
                LINK WILL BE DISPATCHED TO YOUR INBOX
              </div>
            </motion.div>
          ) : (
            <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Check size={22} color="#22c55e" />
              </div>
              <div style={{ fontSize: 13, color: "#22c55e", letterSpacing: "0.14em", marginBottom: 10, fontWeight: 700 }}>
                ACCESS LINK DISPATCHED
              </div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.9, letterSpacing: "0.10em" }}>
                CHECK YOUR INBOX · LINK EXPIRES IN 15 MINUTES<br/>
                CLICKING IT OPENS YOUR<br/>
                <span style={{ color: C.gold, fontWeight: 700 }}>AMBASSADOR COMMAND DECK</span>
              </div>
              <div style={{ marginTop: 24 }}>
                <motion.button whileTap={{ scale: 0.94 }} onClick={() => { setStage("idle"); setEmail(""); }}
                  style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, padding: "8px 18px", borderRadius: 7, cursor: "pointer", letterSpacing: "0.12em" }}>
                  SEND AGAIN
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={{ position: "fixed", bottom: 16, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "rgba(212,175,55,0.18)", letterSpacing: "0.22em", pointerEvents: "none" }}>
        AUTHORIZED AMBASSADOR: CLARK · SYSTEM: NOVEE OS DEMO MODE
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
