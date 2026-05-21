/**
 * SovereignVaultGate — wraps any content behind a server-validated PIN.
 * Uses the existing /api/auth/pin-login endpoint.
 * 4-digit = staff role, 6-digit = super_admin (Sovereign).
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GOLD  = "#D4AF37";
const GREEN = "#10B981";
const RED   = "#EF4444";

interface Props {
  children: React.ReactNode;
  /** venueId required for staff (4-digit) logins; not needed for sovereign (6-digit) */
  venueId?: string;
  /** Label shown on the gate screen */
  title?: string;
}

export function SovereignVaultGate({ children, venueId, title = "SOVEREIGN SECURITY CLEARANCE" }: Props) {
  const [pin, setPin]           = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);

  async function handlePress(digit: string) {
    if (loading) return;
    const next = pin + digit;
    if (next.length > 6) return;
    setPin(next);
    setError(null);

    // Auto-submit at 4 or 6 digits
    if (next.length === 4 || next.length === 6) {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: next, venueId }),
        });
        const data = await res.json() as { token?: string; error?: string };
        if (!res.ok || !data.token) {
          throw new Error(data.error ?? "Clearance PIN rejected");
        }
        localStorage.setItem("axiom_token", data.token);
        setUnlocked(true);
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPin("");
      } finally {
        setLoading(false);
      }
    }
  }

  if (unlocked) {
    return (
      <div style={{ borderRadius: 16, border: `1px solid ${GREEN}44`, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: `rgba(16,185,129,0.06)`, borderBottom: `1px solid ${GREEN}28` }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: "0.22em", fontFamily: "'Inter',sans-serif" }}>SOVEREIGN TERMINAL ACTIVE</span>
          <button onClick={() => { setUnlocked(false); setPin(""); }}
            style={{ background: "rgba(239,68,68,0.12)", border: `1px solid ${RED}44`, borderRadius: 5, padding: "3px 10px", color: RED, fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.14em", fontFamily: "'Inter',sans-serif" }}>
            LOCK
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <motion.div animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}
      style={{ borderRadius: 16, border: `1px solid ${GOLD}22`, background: "rgba(9,11,16,0.92)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>

      {/* Title */}
      <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(212,175,55,0.55)", letterSpacing: "0.26em", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>{title}</span>

      {/* PIN dots */}
      <div style={{ display: "flex", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: i < 4 ? 14 : 12, height: i < 4 ? 14 : 12, borderRadius: "50%", background: i < pin.length ? GOLD : "rgba(212,175,55,0.15)", border: `1px solid ${GOLD}44`, transition: "background 0.2s" }} />
        ))}
      </div>
      <span style={{ fontSize: 9, color: "rgba(212,175,55,0.28)", letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>4-DIGIT STAFF · 6-DIGIT SOVEREIGN</span>

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: 200 }}>
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
          <button key={i} disabled={loading || d === ""}
            onClick={() => d === "⌫" ? setPin(p => p.slice(0, -1)) : d !== "" && void handlePress(d)}
            style={{ height: 48, borderRadius: 8, border: d === "⌫" ? `1px solid rgba(239,68,68,0.3)` : `1px solid rgba(212,175,55,0.18)`, background: d === "" ? "transparent" : d === "⌫" ? "rgba(239,68,68,0.08)" : "rgba(212,175,55,0.06)", color: d === "⌫" ? RED : "#FFF", fontSize: 16, fontWeight: 700, cursor: d === "" ? "default" : "pointer", fontFamily: "'Inter',sans-serif", opacity: d === "" ? 0 : 1 }}>
            {d}
          </button>
        ))}
      </div>

      {/* Reset */}
      <button onClick={() => { setPin(""); setError(null); }} disabled={loading}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 24px", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.18em", fontFamily: "'Inter',sans-serif" }}>
        RESET
      </button>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: 11, color: RED, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif", textAlign: "center" }}>
            {error}
          </motion.div>
        )}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", fontFamily: "'Inter',sans-serif" }}>
            VERIFYING...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
