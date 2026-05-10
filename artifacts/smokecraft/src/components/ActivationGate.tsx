/**
 * ActivationGate — Obsidian Lock Screen
 * Displayed on manufacturer devices until Sovereign Authorization is granted
 * by 360 Enterprises Services LLC via the Distribution Vault.
 *
 * Usage:
 *   <ActivationGate deviceId="MIR-001-A7F3" batchId={4} keyValue="NOVEE-MIR-..." onAuthorized={() => ...} />
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence }       from "framer-motion";
import QRCode                            from "qrcode";
import { SovereignDistro }               from "@/lib/sovereignDistro";

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  deviceId:     string;
  batchId:      string | number;
  keyValue?:    string;
  /** Called ~2 s after authorization is received — use to unmount the gate */
  onAuthorized?: () => void;
}

type GateStatus = "CONNECTING" | "PENDING_SOVEREIGN_AUTH" | "AUTHORIZED" | "ERROR";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivationGate({ deviceId, batchId, keyValue, onAuthorized }: Props) {
  const [status, setStatus]       = useState<GateStatus>("CONNECTING");
  const [qrSrc,  setQrSrc]        = useState<string>("");
  const [unlocking, setUnlocking] = useState(false);
  const [tick, setTick]           = useState(0);        // pulse counter
  const registered                = useRef(false);

  // ── QR code (encodes the admin activation URL) ──────────────────────────
  useEffect(() => {
    const url = `https://novee-os.com/admin/activate?id=${encodeURIComponent(deviceId)}&batch=${batchId}`;
    QRCode.toDataURL(url, {
      color:  { dark: "#D4AF37", light: "#050505" },
      width:  200,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then(setQrSrc)
      .catch(() => {});
  }, [deviceId, batchId]);

  // ── Register node on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    SovereignDistro.registerNewNode(deviceId, batchId, keyValue).then(result => {
      if (result.status === "AUTHORIZED") {
        handleAuthorized();
      } else {
        setStatus("PENDING_SOVEREIGN_AUTH");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for SOVEREIGN_WAKE signal ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = SovereignDistro.onWake(() => handleAuthorized());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Heartbeat tick for the status line ──────────────────────────────────
  useEffect(() => {
    if (status !== "PENDING_SOVEREIGN_AUTH") return;
    const interval = setInterval(() => setTick(t => (t + 1) % 4), 800);
    return () => clearInterval(interval);
  }, [status]);

  function handleAuthorized() {
    setUnlocking(true);
    setStatus("AUTHORIZED");
    setTimeout(() => onAuthorized?.(), 2400);
  }

  const dots = ".".repeat(tick);

  return (
    <div style={{
      position:        "fixed",
      inset:           0,
      background:      "#050505",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      fontFamily:      "'JetBrains Mono','Space Mono','Courier New',monospace",
      overflow:        "hidden",
      zIndex:          9999,
    }}>

      {/* ── Ambient top glow ── */}
      <div style={{
        position:   "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width:      700, height: 200, pointerEvents: "none",
        background: "radial-gradient(ellipse,rgba(212,175,55,0.10) 0%,transparent 70%)",
      }} />

      {/* ── Authorization burst on unlock ── */}
      <AnimatePresence>
        {unlocking && (
          <motion.div
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 12, opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            style={{
              position: "absolute", inset: 0, margin: "auto",
              width: 80, height: 80, borderRadius: "50%",
              background: "radial-gradient(circle,rgba(212,175,55,0.35) 0%,transparent 70%)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Main card ── */}
      <motion.div
        animate={unlocking ? { scale: 1.04, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: unlocking ? 0.4 : 0 }}
        style={{
          background:   "rgba(14,12,10,0.97)",
          border:       "1px solid rgba(212,175,55,0.30)",
          borderRadius: 10,
          padding:      "52px 60px",
          maxWidth:     480,
          width:        "90%",
          textAlign:    "center",
          boxShadow:    "0 0 100px rgba(212,175,55,0.06)",
          position:     "relative",
        }}
      >
        {/* Logo line */}
        <div style={{ fontSize: 10, letterSpacing: "0.34em", color: "rgba(212,175,55,0.40)", marginBottom: 34 }}>
          NOVEE OS · TITAN V ENGINE · v5.2.0
        </div>

        {/* SVG Padlock */}
        <motion.svg
          viewBox="0 0 64 64" width={status === "AUTHORIZED" ? 0 : 64} height={status === "AUTHORIZED" ? 0 : 64}
          fill="none" style={{ margin: "0 auto 28px", display: "block" }}
          animate={unlocking ? { rotate: [0, -12, 12, 0], opacity: [1, 1, 1, 0] } : {}}
          transition={{ duration: 0.9 }}
        >
          <rect x="11" y="27" width="42" height="30" rx="4" stroke="#D4AF37" strokeWidth="1.4" />
          <path d="M19 27V21a13 13 0 0 1 26 0v6" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="32" cy="41" r="4" fill="#D4AF37" opacity="0.75" />
          <line x1="32" y1="45" x2="32" y2="51" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
        </motion.svg>

        {/* Unlock check */}
        <AnimatePresence>
          {status === "AUTHORIZED" && (
            <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              viewBox="0 0 64 64" width={64} height={64} fill="none"
              style={{ margin: "0 auto 28px", display: "block" }}
            >
              <circle cx="32" cy="32" r="28" stroke="#22c55e" strokeWidth="1.5" />
              <path d="M20 32 L28 40 L44 24" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Title */}
        <div style={{ fontSize: 18, letterSpacing: "0.22em", color: "#D4AF37", marginBottom: 8, fontWeight: 300 }}>
          {status === "AUTHORIZED" ? "SOVEREIGN AUTHORIZATION" : "SOVEREIGN AUTHORIZATION"}
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(245,242,237,0.30)", marginBottom: 36 }}>
          {status === "AUTHORIZED" ? "GRANTED · SYSTEM COMING ONLINE" : "REQUIRED"}
        </div>

        {/* Pulse dot */}
        <motion.div
          animate={status === "AUTHORIZED"
            ? { backgroundColor: ["#22c55e", "#22c55e"], scale: [1, 1.4, 1] }
            : { opacity: [1, 0.25, 1] }}
          transition={{ duration: status === "AUTHORIZED" ? 0.5 : 2, repeat: status === "AUTHORIZED" ? 3 : Infinity }}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: status === "AUTHORIZED" ? "#22c55e" : "#D4AF37",
            margin: "0 auto 24px",
            boxShadow: status === "AUTHORIZED" ? "0 0 16px #22c55e" : "0 0 12px #D4AF37",
          }}
        />

        {/* Status line */}
        <div style={{ fontSize: 10, letterSpacing: "0.20em", color: "rgba(212,175,55,0.55)", marginBottom: 28 }}>
          {status === "CONNECTING"           && "CONNECTING TO SOVEREIGN BRAIN…"}
          {status === "PENDING_SOVEREIGN_AUTH" && `STATUS: WAITING_FOR_SOVEREIGN_AUTHORIZATION${dots}`}
          {status === "AUTHORIZED"           && "STATUS: SOVEREIGN_LOCK_MELTED · INITIALIZING"}
          {status === "ERROR"                && "STATUS: HANDSHAKE_FAILED — CONTACT 360 ENTERPRISES"}
        </div>

        {/* QR code */}
        {qrSrc && status !== "AUTHORIZED" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.20em", color: "rgba(212,175,55,0.30)", marginBottom: 12 }}>
              ADMIN ACTIVATION QR
            </div>
            <div style={{
              width: 140, height: 140, margin: "0 auto",
              border: "1px solid rgba(212,175,55,0.22)", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 8, background: "#050505",
            }}>
              <img src={qrSrc} alt="Activation QR" style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
            </div>
          </div>
        )}

        {/* Device ID */}
        <div style={{ fontSize: 9, color: "rgba(212,175,55,0.30)", letterSpacing: "0.12em", marginBottom: 6 }}>
          DEVICE_ID: {deviceId}
        </div>
        <div style={{ fontSize: 9, color: "rgba(212,175,55,0.20)", letterSpacing: "0.12em", marginBottom: 28 }}>
          BATCH: {batchId}
        </div>

        {/* Legal */}
        <div style={{ fontSize: 8, color: "rgba(245,242,237,0.18)", letterSpacing: "0.14em", lineHeight: 1.9 }}>
          © 360 ENTERPRISES SERVICES LLC<br />
          JOHNIE MANUEL LEE COLLINS
        </div>
      </motion.div>

      {/* ── Bottom scan line ── */}
      <motion.div
        animate={{ y: ["0%", "100vh"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
        style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.18),transparent)",
          top: 0, pointerEvents: "none",
        }}
      />
    </div>
  );
}
