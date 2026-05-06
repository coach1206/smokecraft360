/**
 * SignOffModal — Manager sign-off workflow for completed employee training.
 *
 * Persists sign-off to the real backend DB via POST /api/training/signoff.
 * Also writes to localStorage as a fallback cache.
 * Shows DB vs local persistence indicator based on outcome.
 */

import { useState }               from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, UserCheck, Shield, Database, WifiOff } from "lucide-react";

const T = {
  bg:     "#0c0914",
  border: "rgba(201,168,76,0.2)",
  gold:   "#c9a84c",
  text:   "rgba(240,232,212,0.92)",
  muted:  "rgba(240,232,212,0.48)",
  green:  "#34d399",
  amber:  "#f59e0b",
};

interface SignOffModalProps {
  role:         string;
  roleTitle:    string;
  modulesCount: number;
  onClose:      () => void;
  onApprove:    (managerName: string) => void;
}

export default function SignOffModal({ role, roleTitle, modulesCount, onClose, onApprove }: SignOffModalProps) {
  const [managerName, setManagerName] = useState("");
  const [pin, setPin]                 = useState("");
  const [approved, setApproved]       = useState(false);
  const [savedToDb, setSavedToDb]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  async function handleApprove() {
    if (!managerName.trim()) { setError("Manager name is required."); return; }
    if (!pin.trim())         { setError("Manager PIN is required."); return; }
    setError("");
    setLoading(true);

    const sessionId = localStorage.getItem("axiom_training_session_id") ?? undefined;
    const userId    = localStorage.getItem("axiom_training_user_id")    ?? undefined;
    const token     = localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token");

    let dbSuccess = false;
    try {
      const res = await fetch("/api/training/signoff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role, roleTitle, modulesCount,
          managerName: managerName.trim(),
          pin, sessionId, userId,
        }),
      });

      if (res.ok) {
        dbSuccess = true;
      } else if (res.status === 401) {
        const data = await res.json() as { hint?: string; error?: string };
        setError(data.hint ?? "Incorrect PIN. Demo PIN: 1234");
        setLoading(false);
        return;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("401") || msg.includes("invalid_pin")) {
        setError("Incorrect manager PIN. Demo PIN: 1234");
        setLoading(false);
        return;
      }
      // Network error — store locally and continue
    }

    // Always write to localStorage as write-through cache
    localStorage.setItem(`axiom_signoff_${role}_${Date.now()}`, JSON.stringify({
      role, roleTitle, modulesCount,
      managerName: managerName.trim(),
      sessionId, approvedAt: new Date().toISOString(), savedToDb: dbSuccess,
    }));

    setLoading(false);
    setSavedToDb(dbSuccess);
    setApproved(true);
    setTimeout(() => onApprove(managerName.trim()), 1800);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          style={{
            background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: "28px 30px", width: "100%", maxWidth: 440,
            boxShadow: "0 24px 64px rgba(0,0,0,0.7)", position: "relative",
          }}
        >
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}>
            <X size={16} />
          </button>

          {approved ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "12px 0" }}>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6 }}
                style={{ width: 60, height: 60, borderRadius: "50%", background: `${T.green}18`, border: `1px solid ${T.green}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle size={28} color={T.green} />
              </motion.div>
              <div style={{ fontSize: 18, fontFamily: "'Cormorant Garamond',serif", color: T.green, marginBottom: 6 }}>Training Approved</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
                Signed off by {managerName} · {new Date().toLocaleDateString()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", fontSize: 9 }}>
                {savedToDb
                  ? <><Database size={9} color={T.green} /><span style={{ color: T.green }}>Saved to database</span></>
                  : <><WifiOff size={9} color={T.amber} /><span style={{ color: T.amber }}>Saved locally — syncs when online</span></>}
              </div>
            </motion.div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${T.gold}15`, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserCheck size={17} color={T.gold} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Manager Sign-Off</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{roleTitle} Training Complete</div>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "12px 14px", marginBottom: 18 }}>
                {[
                  { label: "Role",              value: roleTitle,                           color: T.text  },
                  { label: "Modules Completed", value: `${modulesCount} / ${modulesCount}`, color: T.green },
                  { label: "Date",              value: new Date().toLocaleDateString(),      color: T.text  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: T.muted }}>{label}</span>
                    <span style={{ fontSize: 10, color, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Manager Name</label>
                <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                  Manager PIN <span style={{ color: T.gold, fontStyle: "italic" }}>(Demo: 1234)</span>
                </label>
                <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" placeholder="Enter PIN"
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>

              {error && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 12 }}>{error}</div>}

              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 7, padding: "8px 10px", marginBottom: 16 }}>
                <Shield size={9} color={T.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 9, color: "rgba(201,168,76,0.7)" }}>
                  Sign-off is recorded in the training database. Demo manager PIN is 1234.
                </span>
              </div>

              <button onClick={handleApprove} disabled={loading} style={{
                width: "100%", padding: "12px",
                background: loading ? "rgba(201,168,76,0.4)" : T.gold, border: "none", borderRadius: 9,
                color: "#06040a", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}>
                <UserCheck size={15} /> {loading ? "Saving…" : "Approve Training Completion"}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
