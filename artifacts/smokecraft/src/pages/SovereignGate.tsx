/**
 * SovereignGate — /sovereign-gate
 * Magic Link entry point. Only the master email receives the activation link.
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Loader, Check, ArrowRight } from "lucide-react";

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

export default function SovereignGate() {
  const [email, setEmail]   = useState("");
  const [stage, setStage]   = useState<Stage>("idle");

  const request = async () => {
    if (!email.includes("@")) return;
    setStage("sending");
    try {
      await fetch("/api/sovereign/magic-link", {
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
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 220, background: "radial-gradient(ellipse,rgba(212,175,55,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Scan line */}
      <motion.div animate={{ y: ["0vh", "100vh"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
        style={{ position: "fixed", left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.14),transparent)", top: 0, pointerEvents: "none" }} />

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        style={{
          background: "rgba(14,12,10,0.97)", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "52px 56px", maxWidth: 440, width: "90%",
          textAlign: "center", boxShadow: "0 0 80px rgba(212,175,55,0.05)",
        }}
      >
        {/* Icon */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.gold}12`, border: `1px solid ${C.gold}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}>
          <Shield size={24} color={C.gold} />
        </div>

        {/* Title */}
        <div style={{ fontSize: 10, letterSpacing: "0.30em", color: `${C.gold}50`, marginBottom: 12 }}>
          NOVEE OS · TITAN V ENGINE
        </div>
        <div style={{ fontSize: 26, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", fontWeight: 300, marginBottom: 8 }}>
          SOVEREIGN<br/>COMMAND DECK
        </div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.18em", marginBottom: 40, lineHeight: 1.8 }}>
          360 ENTERPRISES SERVICES LLC<br/>
          JOHNIE MANUEL LEE COLLINS
        </div>

        <AnimatePresence mode="wait">
          {stage !== "sent" ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: "left", marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: C.amber, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>
                  Operator Email
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
                      color: C.ink, fontSize: 12, fontFamily: C.mono,
                      outline: "none",
                    }}
                  />
                  <motion.button whileTap={{ scale: 0.94 }} onClick={request}
                    disabled={stage === "sending" || !email.includes("@")}
                    style={{
                      padding: "12px 18px", borderRadius: 8, background: stage === "sending" ? `${C.gold}30` : C.gold,
                      border: "none", color: "#050505", cursor: stage === "sending" ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em",
                      opacity: !email.includes("@") ? 0.45 : 1,
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
                ENTER YOUR MASTER EMAIL · A SECURE 15-MINUTE<br/>
                LINK WILL BE DISPATCHED TO YOUR INBOX
              </div>
            </motion.div>
          ) : (
            <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Check size={22} color="#22c55e" />
              </div>
              <div style={{ fontSize: 13, color: "#22c55e", letterSpacing: "0.14em", marginBottom: 10, fontWeight: 700 }}>
                MAGIC LINK DISPATCHED
              </div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.9, letterSpacing: "0.10em" }}>
                CHECK YOUR INBOX · LINK EXPIRES IN 15 MINUTES<br/>
                CLICKING IT WILL ACTIVATE THIS DEVICE AS YOUR<br/>
                <span style={{ color: C.gold, fontWeight: 700 }}>SOVEREIGN COMMAND NODE</span>
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

      {/* Footer watermark */}
      <div style={{ position: "fixed", bottom: 16, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "rgba(212,175,55,0.18)", letterSpacing: "0.22em", pointerEvents: "none" }}>
        AUTHORIZED OPERATOR: JC // 360 ENTERPRISES SERVICES LLC
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
