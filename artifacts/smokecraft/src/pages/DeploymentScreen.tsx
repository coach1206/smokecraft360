/**
 * DeploymentScreen — /deployment
 *
 * NOVEE OS System Provisioning & Onboarding Gateway.
 * Renders a permanent QR code pointing to /api/download/latest?action=download
 * so the QR never changes even when the download URL is rotated server-side.
 * Fetches live step-by-step instructions from the same API endpoint.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";

// ── Design tokens (Obsidian / Gold system) ────────────────────────────────────

const T = {
  bg:        "#000000",
  panel:     "rgba(255,255,255,0.034)",
  border:    "rgba(212,175,55,0.22)",
  gold:      "#D4AF37",
  goldSoft:  "rgba(212,175,55,0.60)",
  goldDim:   "rgba(212,175,55,0.28)",
  text:      "rgba(255,252,245,0.92)",
  muted:     "rgba(255,252,245,0.46)",
  error:     "#C0392B",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Instructions {
  step1: string;
  step2: string;
  step3: string;
}

interface DeployConfig {
  version:      string;
  releasedAt:   string;
  downloadUrl:  string;
  instructions: Instructions;
}

// ── Ambient particles ─────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  r: 0.8 + Math.random() * 1.6, dur: 12 + Math.random() * 14,
  del: Math.random() * 10, op: 0.03 + Math.random() * 0.09,
}));

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeploymentScreen() {
  const [qrSrc,        setQrSrc]        = useState<string>("");
  const [config,       setConfig]       = useState<DeployConfig | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(false);
  const [copied,       setCopied]       = useState(false);

  // The QR payload is a *permanent* redirect route — the server resolves the
  // actual download URL behind it, so the QR never has to change.
  const permanentRoute = `${window.location.origin}/api/download/latest?action=download`;

  // ── Generate QR on mount ──────────────────────────────────────────────────
  useEffect(() => {
    QRCode.toDataURL(permanentRoute, {
      width:  256,
      margin: 2,
      color:  { dark: "#D4AF37", light: "#050505" },
      errorCorrectionLevel: "M",
    })
      .then(setQrSrc)
      .catch(() => {});
  }, [permanentRoute]);

  // ── Fetch live config (instructions + version) ────────────────────────────
  useEffect(() => {
    fetch("/api/download/latest", { headers: { Accept: "application/json" } })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DeployConfig & { success: boolean }>;
      })
      .then(data => {
        if (data.success) setConfig(data);
        else setFetchError(true);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  function copyRoute() {
    navigator.clipboard.writeText(permanentRoute).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  }

  const steps: string[] = config
    ? [config.instructions.step1, config.instructions.step2, config.instructions.step3]
    : [];

  return (
    <div style={{
      minHeight: "100dvh", background: T.bg,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", position: "relative", overflow: "hidden",
      padding: "40px 24px",
    }}>

      {/* ── Ambient particles ── */}
      {PARTICLES.map(p => (
        <motion.div key={p.id}
          animate={{ y: [0, -28, 0], opacity: [p.op * 0.4, p.op, p.op * 0.4] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.r * 2, height: p.r * 2, borderRadius: "50%",
            background: T.gold, pointerEvents: "none" }}
        />
      ))}

      {/* ── Radial glow core ── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 40% at 50% 50%, rgba(212,175,55,0.045) 0%, transparent 72%)",
      }} />

      {/* ── Main panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
        style={{
          width: "100%", maxWidth: 820, position: "relative", zIndex: 2,
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          padding: "40px 40px 48px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{
            fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.42em", textTransform: "uppercase",
            color: T.goldDim, margin: "0 0 10px",
          }}>NOVEE OS</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(2.2rem,4.5vw,3.2rem)", fontWeight: 300,
            color: T.gold, margin: "0 0 8px", letterSpacing: "0.08em",
          }}>System Provisioning</h1>
          <p style={{
            fontFamily: "'Inter',sans-serif", fontSize: 15,
            color: T.muted, margin: 0, letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>Onboarding Gateway — Kiosk &amp; Tablet Deployment</p>
        </div>

        {/* Body: QR + Instructions side by side */}
        <div style={{
          display: "flex", gap: 40, alignItems: "flex-start",
          flexWrap: "wrap",
        }}>

          {/* QR panel */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              background: "#050505",
              border: `1px solid ${T.border}`,
              borderRadius: 14, padding: 18,
              display: "inline-flex", flexDirection: "column", alignItems: "center",
              gap: 14,
              boxShadow: `0 0 32px rgba(212,175,55,0.08)`,
            }}>
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Scan to install NOVEE OS"
                  style={{ width: 200, height: 200, display: "block", borderRadius: 6 }}
                />
              ) : (
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: 200, height: 200, borderRadius: 6,
                    background: "rgba(212,175,55,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    color: T.goldDim, letterSpacing: "0.24em" }}>GENERATING…</span>
                </motion.div>
              )}

              <div style={{ textAlign: "center" }}>
                <p style={{
                  fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.32em", textTransform: "uppercase",
                  color: T.goldSoft, margin: "0 0 4px",
                }}>SCAN TO INSTALL</p>
                <p style={{
                  fontFamily: "'Inter',sans-serif", fontSize: 11,
                  color: T.muted, margin: 0,
                }}>Points to permanent redirect route</p>
              </div>
            </div>

            {/* Copy link */}
            <button
              onClick={copyRoute}
              style={{
                marginTop: 14, width: "100%",
                background: "transparent",
                border: `1px solid ${T.goldDim}`,
                borderRadius: 8,
                padding: "10px 16px",
                fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: copied ? T.gold : T.muted,
                cursor: "pointer",
                transition: "color 0.3s, border-color 0.3s",
              }}
            >
              {copied ? "✓ COPIED" : "COPY LINK"}
            </button>

            {/* Version pill */}
            {config && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginTop: 12, textAlign: "center",
                  fontFamily: "'Inter',sans-serif", fontSize: 11,
                  color: T.goldDim, letterSpacing: "0.18em",
                }}
              >
                v{config.version} &nbsp;·&nbsp;{new Date(config.releasedAt).toLocaleDateString()}
              </motion.div>
            )}
          </div>

          {/* Instructions panel */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: "clamp(1.5rem,2.8vw,2rem)", fontWeight: 400,
              color: T.text, margin: "0 0 28px", letterSpacing: "0.05em",
            }}>SmokeCraft Implementation Steps</h3>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {[1, 2, 3].map(n => (
                    <motion.div key={n}
                      animate={{ opacity: [0.2, 0.55, 0.2] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: n * 0.2 }}
                      style={{
                        height: 52, borderRadius: 8,
                        background: "rgba(212,175,55,0.06)",
                      }}
                    />
                  ))}
                </motion.div>
              ) : fetchError ? (
                <motion.p key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{
                    fontFamily: "'Inter',sans-serif", fontSize: 15,
                    color: T.error, letterSpacing: "0.08em",
                  }}
                >
                  Failed to retrieve live instruction metadata. Refresh to retry.
                </motion.p>
              ) : (
                <motion.ol key="steps"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ paddingLeft: 0, margin: 0, listStyle: "none",
                    display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {steps.map((text, idx) => (
                    <motion.li key={idx}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.12, duration: 0.55 }}
                      style={{
                        display: "flex", gap: 16, alignItems: "flex-start",
                        padding: "18px 20px",
                        background: "rgba(212,175,55,0.04)",
                        border: `1px solid rgba(212,175,55,0.10)`,
                        borderRadius: 10,
                      }}
                    >
                      {/* Step number badge */}
                      <span style={{
                        flexShrink: 0,
                        width: 32, height: 32,
                        borderRadius: "50%",
                        border: `1.5px solid ${T.goldDim}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Cormorant Garamond',serif",
                        fontSize: 18, color: T.goldSoft, fontWeight: 600,
                      }}>{idx + 1}</span>

                      <p style={{
                        fontFamily: "'Inter',sans-serif",
                        fontSize: 15, lineHeight: 1.65,
                        color: T.text, margin: 0, letterSpacing: "0.02em",
                      }}>{text}</p>
                    </motion.li>
                  ))}
                </motion.ol>
              )}
            </AnimatePresence>

            {/* Permanent route display */}
            <div style={{
              marginTop: 32, padding: "14px 18px",
              background: "rgba(0,0,0,0.40)",
              border: `1px solid rgba(212,175,55,0.12)`,
              borderRadius: 8,
            }}>
              <p style={{
                fontFamily: "'Inter',sans-serif", fontSize: 10,
                color: T.goldDim, letterSpacing: "0.32em",
                textTransform: "uppercase", margin: "0 0 6px",
              }}>PERMANENT DOWNLOAD ROUTE</p>
              <p style={{
                fontFamily: "'Inter',sans-serif", fontSize: 13,
                color: T.muted, margin: 0, wordBreak: "break-all",
                letterSpacing: "0.02em",
              }}>{permanentRoute}</p>
              <p style={{
                fontFamily: "'Inter',sans-serif", fontSize: 11,
                color: "rgba(212,175,55,0.30)", margin: "8px 0 0",
                letterSpacing: "0.06em",
              }}>
                This route is static. Update the download URL at any time via
                POST /api/admin/update-deployment — the QR code never changes.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom label */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{
          position: "relative", zIndex: 2, marginTop: 28,
          fontFamily: "'Inter',sans-serif", fontSize: 11,
          color: "rgba(212,175,55,0.22)", letterSpacing: "0.38em",
          textTransform: "uppercase",
        }}
      >
        360 Enterprises Services LLC — Sovereign Distribution
      </motion.p>
    </div>
  );
}
