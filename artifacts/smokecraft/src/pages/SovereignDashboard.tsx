/**
 * SovereignDashboard — /sovereign-dashboard
 * Post-authentication Sovereign command landing page.
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Access flow:
 *   /sovereign-gate → [magic link email] → /sovereign-verify → /sovereign-dashboard
 *
 * Security:
 *   - On mount, validates SOVEREIGN_SESSION token via GET /api/sovereign/verify-session
 *   - Invalid/missing token → redirect to /sovereign-gate immediately
 *   - Listens for SOVEREIGN_SESSION_REVOKED socket event → forced redirect
 *   - All navigation tiles require the session to remain valid
 */

import { useState, useEffect } from "react";
import { useLocation }          from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Activity, Database, Cpu, Radio,
  LogOut, ChevronRight, AlertTriangle, Loader,
  Zap, Star, Package,
} from "lucide-react";
import { socket } from "@/lib/socket";
import SovereignWatermark from "@/components/SovereignWatermark";
import "@/styles/Sovereign.css";

// ── Constants ─────────────────────────────────────────────────
export const SOVEREIGN_SESSION_KEY = "SOVEREIGN_SESSION";

const C = {
  bg:     "#050505",
  surface:"rgba(14,12,10,0.98)",
  gold:   "#D4AF37",
  amber:  "#B89030",
  ink:    "#F5F2ED",
  muted:  "rgba(245,242,237,0.45)",
  dim:    "rgba(245,242,237,0.22)",
  border: "rgba(212,175,55,0.20)",
  green:  "#22c55e",
  red:    "#ef4444",
  mono:   "'JetBrains Mono','Courier New',monospace",
  serif:  "'Cormorant Garamond',serif",
};

// ── Types ──────────────────────────────────────────────────────
type VerifyState = "checking" | "authorized" | "unauthorized";

interface SessionInfo {
  owner:  string;
  entity: string;
}

// ── Command tiles ──────────────────────────────────────────────
const COMMAND_TILES = [
  {
    icon:  Activity,
    label: "EEIE COMMAND CENTER",
    desc:  "Live intelligence dashboard: venue health, POS, sensory, predictions, event bus.",
    path:  "/eeie-command",
    accent: "#D4AF37",
    primary: true,
  },
  {
    icon:  Database,
    label: "DISTRIBUTION VAULT",
    desc:  "Sovereign distribution engine: node management, activation, network topology.",
    path:  "/distribution",
    accent: "#D4AF37",
    primary: false,
  },
  {
    icon:  Cpu,
    label: "HARDWARE LAB",
    desc:  "Device registration, biometric hardware status, node diagnostics.",
    path:  "/hardware-lab",
    accent: "#D4AF37",
    primary: false,
  },
  {
    icon:  Star,
    label: "AMBASSADOR DECK",
    desc:  "Monitor Clark's Ambassador Command Deck and pending node activations.",
    path:  "/ambassador-hub",
    accent: "#B89030",
    primary: false,
  },
  {
    icon:  Zap,
    label: "FOUNDER CONTROL",
    desc:  "Founder Control Center: revenue, feature flags, kill switches.",
    path:  "/founder",
    accent: "#D4AF37",
    primary: false,
  },
  {
    icon:  Radio,
    label: "MASTER OPERATIONS",
    desc:  "Operational layer: staff, venues, inventory, reconciliation.",
    path:  "/operations",
    accent: "#D4AF37",
    primary: false,
  },
  {
    icon:  Package,
    label: "VENDOR PORTAL",
    desc:  "Brand partner self-service: product submissions, media, inventory, placement purchases, and approval pipeline.",
    path:  "/vendor/dashboard",
    accent: "#087BFF",
    primary: false,
  },
] as const;

// ── Revoke confirmation modal ──────────────────────────────────
function RevokeModal({
  onConfirm,
  onCancel,
  revoking,
}: {
  onConfirm: () => void;
  onCancel:  () => void;
  revoking:  boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(5,5,5,0.88)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          background: "rgba(14,12,10,0.99)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 16, padding: "40px 36px",
          maxWidth: 420, width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <AlertTriangle size={22} color={C.red} />
        </div>

        <div style={{ fontSize: 16, color: C.red, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 8 }}>
          REVOKE ALL SESSIONS
        </div>
        <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.8, marginBottom: 28 }}>
          This broadcasts <strong style={{ color: C.ink }}>SOVEREIGN_SESSION_REVOKED</strong> to all
          connected devices immediately. Every active session will be terminated and forced back
          to the gate. This action cannot be undone.
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            disabled={revoking}
            style={{
              flex: 1, padding: "14px", borderRadius: 10,
              background: "rgba(245,242,237,0.06)",
              border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 11, cursor: "pointer",
              fontFamily: C.mono, letterSpacing: "0.12em",
            }}
          >
            CANCEL
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            disabled={revoking}
            style={{
              flex: 1, padding: "14px", borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.40)",
              color: C.red, fontSize: 11, fontWeight: 700,
              cursor: revoking ? "not-allowed" : "pointer",
              fontFamily: C.mono, letterSpacing: "0.12em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {revoking
              ? <><Loader size={12} style={{ animation: "spin 0.8s linear infinite" }} /> REVOKING…</>
              : "CONFIRM REVOKE"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────────────
export default function SovereignDashboard() {
  const [, navigate]   = useLocation();
  const [verify, setVerify]   = useState<VerifyState>("checking");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [showRevoke, setRevoke] = useState(false);
  const [revoking,  setRevoking] = useState(false);

  // ── Session validation on mount ────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(SOVEREIGN_SESSION_KEY);
    if (!token) { navigate("/sovereign-gate"); return; }

    fetch("/api/sovereign/verify-session", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { valid?: boolean; owner?: string; entity?: string }) => {
        if (data.valid) {
          setSession({ owner: data.owner ?? "JC", entity: data.entity ?? "360 Enterprises Services LLC" });
          setVerify("authorized");
        } else {
          localStorage.removeItem(SOVEREIGN_SESSION_KEY);
          navigate("/sovereign-gate");
        }
      })
      .catch(() => {
        localStorage.removeItem(SOVEREIGN_SESSION_KEY);
        navigate("/sovereign-gate");
      });
  }, [navigate]);

  // ── Socket revoke listener ──────────────────────────────────
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(SOVEREIGN_SESSION_KEY);
      navigate("/sovereign-gate");
    };
    socket.on("SOVEREIGN_SESSION_REVOKED", handler);
    return () => { socket.off("SOVEREIGN_SESSION_REVOKED", handler); };
  }, [navigate]);

  // ── Sign out ────────────────────────────────────────────────
  const signOut = () => {
    localStorage.removeItem(SOVEREIGN_SESSION_KEY);
    navigate("/sovereign-gate");
  };

  // ── Revoke all sessions ─────────────────────────────────────
  const revokeAll = async () => {
    setRevoking(true);
    try {
      await fetch("/api/sovereign/revoke", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ authKey: "MASTER_KEY_360" }),
      });
    } finally {
      setRevoking(false);
      setRevoke(false);
      localStorage.removeItem(SOVEREIGN_SESSION_KEY);
      navigate("/sovereign-gate");
    }
  };

  // ── Loading / unauthorized ──────────────────────────────────
  if (verify === "checking") {
    return (
      <div style={{
        minHeight: "100dvh", background: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Loader size={22} color={C.gold} style={{ animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  // ── Authorized view ────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh", background: C.bg, color: C.ink,
      fontFamily: C.mono, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 240,
        background: "radial-gradient(ellipse,rgba(212,175,55,0.07) 0%,transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Scan line */}
      <div className="scan-line" />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 28px",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(5,5,5,0.97)",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${C.gold}14`, border: `1px solid ${C.gold}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Shield size={17} color={C.gold} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: C.serif, letterSpacing: "0.12em" }}>
            SOVEREIGN COMMAND CENTER
          </div>
          <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.18em" }}>
            {session?.owner?.toUpperCase()} · {session?.entity?.toUpperCase()} · NOVEE OS TITAN V
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="pulse pulse-delay-1" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: "0.12em" }}>SOVEREIGN ACTIVE</span>

          {/* Revoke all */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRevoke(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: 8,
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.20)",
              color: C.red, fontSize: 8, fontWeight: 700,
              letterSpacing: "0.14em", cursor: "pointer",
            }}
          >
            <AlertTriangle size={10} /> REVOKE ALL
          </motion.button>

          {/* Sign out */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={signOut}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: "rgba(245,242,237,0.06)",
              border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.12em", cursor: "pointer",
            }}
          >
            <LogOut size={11} /> SIGN OUT
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "36px 28px" }}>

        {/* Hero label */}
        <div style={{ fontSize: 8, color: `${C.gold}60`, letterSpacing: "0.26em", marginBottom: 24 }}>
          SOVEREIGN COMMAND NODES · SELECT DESTINATION
        </div>

        {/* Primary tile */}
        {(() => {
          const primary = COMMAND_TILES[0];
          return (
            <motion.div
              whileHover={{ scale: 1.006 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(primary.path)}
              style={{
                background: "linear-gradient(135deg,rgba(212,175,55,0.14) 0%,rgba(212,175,55,0.06) 100%)",
                border: `1px solid rgba(212,175,55,0.45)`,
                borderRadius: 16, padding: "30px 28px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 24,
                marginBottom: 16, position: "relative", overflow: "hidden", maxWidth: 900,
              }}
            >
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: 160, height: 160,
                background: "radial-gradient(circle,rgba(212,175,55,0.12),transparent)",
                borderRadius: "0 16px 0 100%", pointerEvents: "none",
              }} />
              <div style={{
                width: 58, height: 58, borderRadius: 15,
                background: C.gold, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <primary.icon size={26} color="#050505" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, color: C.gold, fontFamily: C.serif, letterSpacing: "0.14em", marginBottom: 6, fontWeight: 300 }}>
                  {primary.label}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                  {primary.desc}
                </div>
              </div>
              <ChevronRight size={22} color={C.gold} style={{ flexShrink: 0 }} />
            </motion.div>
          );
        })()}

        {/* Secondary tiles — 2-up grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, maxWidth: 900 }}>
          {COMMAND_TILES.slice(1).map(tile => (
            <motion.div
              key={tile.label}
              whileHover={{ scale: 1.018 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(tile.path)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 13, padding: "24px 20px",
                cursor: "pointer", position: "relative", overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: 80, height: 80,
                background: `radial-gradient(circle,${tile.accent}08,transparent)`,
                borderRadius: "0 13px 0 100%",
              }} />
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: `${tile.accent}14`,
                border: `1px solid ${tile.accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <tile.icon size={19} color={tile.accent} />
              </div>
              <div style={{ fontSize: 13, color: tile.accent, fontFamily: C.serif, letterSpacing: "0.12em", marginBottom: 6 }}>
                {tile.label}
              </div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
                {tile.desc}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8, color: tile.accent, fontWeight: 700, letterSpacing: "0.14em" }}>
                ENTER <ChevronRight size={10} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Session info footer */}
        <div style={{
          marginTop: 36, padding: "14px 18px", borderRadius: 10,
          background: "rgba(212,175,55,0.04)", border: `1px solid ${C.border}`,
          maxWidth: 520, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div className="sovereign-breath" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.8 }}>
            SESSION ACTIVE · TOKEN VALID FOR 7 DAYS · ALL NODES ONLINE
          </div>
        </div>
      </div>

      {/* Watermark */}
      <SovereignWatermark />

      {/* Revoke modal */}
      <AnimatePresence>
        {showRevoke && (
          <RevokeModal
            onConfirm={revokeAll}
            onCancel={() => setRevoke(false)}
            revoking={revoking}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
