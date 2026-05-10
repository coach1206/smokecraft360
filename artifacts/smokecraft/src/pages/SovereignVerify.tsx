/**
 * SovereignVerify — /sovereign-verify
 * Receives the magic link token from the URL, verifies with the server,
 * stores the session token in localStorage, and activates this device as
 * a Sovereign Command Node.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Shield, Check, AlertTriangle } from "lucide-react";

const C = {
  bg:    "#050505",
  gold:  "#D4AF37",
  ink:   "#F5F2ED",
  muted: "rgba(245,242,237,0.40)",
  dim:   "rgba(245,242,237,0.20)",
  mono:  "'JetBrains Mono','Courier New',monospace",
  serif: "'Cormorant Garamond',serif",
};

export const SOVEREIGN_SESSION_KEY = "SOVEREIGN_SESSION";

type Stage = "verifying" | "success" | "error";

export default function SovereignVerify() {
  const [, navigate] = useLocation();
  const [stage, setStage]   = useState<Stage>("verifying");
  const [owner,  setOwner]  = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (!token) { setStage("error"); return; }

    fetch(`/api/sovereign/verify-magic/${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((data: { ok?: boolean; sessionToken?: string; owner?: string; error?: string }) => {
        if (data.ok && data.sessionToken) {
          localStorage.setItem(SOVEREIGN_SESSION_KEY, data.sessionToken);
          setOwner(data.owner ?? "Johnie Manuel Lee Collins");
          setStage("success");
          setTimeout(() => navigate("/distribution"), 2800);
        } else {
          setStage("error");
        }
      })
      .catch(() => setStage("error"));
  }, [navigate]);

  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: C.mono, position: "relative", overflow: "hidden",
    }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 220, background: "radial-gradient(ellipse,rgba(212,175,55,0.09) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Authorization burst */}
      <AnimatePresence>
        {stage === "success" && (
          <motion.div key="burst"
            initial={{ scale: 0.5, opacity: 0.6 }} animate={{ scale: 14, opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            style={{ position: "fixed", inset: 0, margin: "auto", width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle,rgba(212,175,55,0.28) 0%,transparent 70%)", pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: "rgba(14,12,10,0.97)", border: "1px solid rgba(212,175,55,0.22)",
          borderRadius: 12, padding: "56px 60px", maxWidth: 440, width: "90%",
          textAlign: "center", boxShadow: "0 0 80px rgba(212,175,55,0.05)",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.30em", color: "rgba(212,175,55,0.40)", marginBottom: 32 }}>
          NOVEE OS · SOVEREIGN AUTHENTICATION
        </div>

        <AnimatePresence mode="wait">

          {/* Verifying */}
          {stage === "verifying" && (
            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                  <Shield size={24} color={C.gold} />
                </motion.div>
              </div>
              <div style={{ fontSize: 16, color: C.gold, fontFamily: C.serif, letterSpacing: "0.18em", marginBottom: 10, fontWeight: 300 }}>
                VERIFYING SOVEREIGN TOKEN
              </div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.16em", lineHeight: 1.9 }}>
                AUTHENTICATING WITH TITAN V NERVOUS SYSTEM…
              </div>
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, margin: "24px auto 0", boxShadow: `0 0 10px ${C.gold}` }} />
            </motion.div>
          )}

          {/* Success */}
          {stage === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }}
                style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                <Check size={28} color="#22c55e" />
              </motion.div>
              <div style={{ fontSize: 22, color: "#22c55e", fontFamily: C.serif, letterSpacing: "0.16em", fontWeight: 300, marginBottom: 10 }}>
                SOVEREIGN COMMAND<br/>NODE ACTIVATED
              </div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", marginBottom: 28, lineHeight: 1.9 }}>
                AUTHORITY GRANTED TO<br/>
                <span style={{ color: C.gold, fontWeight: 700 }}>{owner}</span><br/>
                360 ENTERPRISES SERVICES LLC
              </div>
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ fontSize: 9, color: "rgba(34,197,94,0.55)", letterSpacing: "0.18em" }}>
                REDIRECTING TO DISTRIBUTION VAULT…
              </motion.div>
            </motion.div>
          )}

          {/* Error */}
          {stage === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <div style={{ fontSize: 16, color: "#ef4444", fontFamily: C.serif, letterSpacing: "0.16em", marginBottom: 10 }}>
                AUTHENTICATION FAILED
              </div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.14em", marginBottom: 28, lineHeight: 1.9 }}>
                LINK INVALID OR EXPIRED (15-MINUTE WINDOW)<br/>
                REQUEST A NEW MAGIC LINK FROM THE GATE
              </div>
              <motion.button whileTap={{ scale: 0.94 }}
                onClick={() => { window.location.href = "/sovereign-gate"; }}
                style={{ padding: "10px 24px", borderRadius: 8, background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.28)", color: C.gold, fontSize: 10, fontFamily: C.mono, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer" }}>
                RETURN TO GATE
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      <div style={{ position: "fixed", bottom: 16, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "rgba(212,175,55,0.18)", letterSpacing: "0.22em", pointerEvents: "none" }}>
        AUTHORITY: SOVEREIGN // 360 ENTERPRISES SERVICES LLC
      </div>
    </div>
  );
}
