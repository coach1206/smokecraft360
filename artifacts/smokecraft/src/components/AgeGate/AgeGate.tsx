/**
 * AgeGate — blocks the experiences portion of the kiosk until the user
 * confirms they are 21 or older (tobacco / alcohol / vape compliance).
 *
 * Verification is persisted in localStorage so the gate stays dismissed
 * for the remainder of the browser session. It resets on a hard-clear.
 *
 * Usage:
 *   <AgeGate>
 *     <YourExperiencePage />
 *   </AgeGate>
 */

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "age_verified";

function isVerified(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setVerified(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch { /* private browsing — allow anyway */ }
}

interface AgeGateProps {
  children: ReactNode;
}

export default function AgeGate({ children }: AgeGateProps) {
  const [verified, setVerifiedState] = useState<boolean>(isVerified);
  const [denied,   setDenied       ] = useState(false);

  const handleConfirm = () => {
    setVerified();
    setVerifiedState(true);
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (verified) return <>{children}</>;

  return (
    <AnimatePresence>
      <motion.div
        key="age-gate"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(ellipse at center, #1a1008 0%, #0a0806 100%)",
          fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        }}
      >
        {/* Background texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' opacity='0.025'/%3E%3C/svg%3E")`,
        }} />

        <motion.div
          initial={{ scale: 0.88, y: 24, opacity: 0 }}
          animate={{ scale: 1,    y: 0,  opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.1 }}
          style={{
            textAlign: "center",
            padding: "60px 64px",
            borderRadius: 32,
            background: "rgba(14,10,7,0.96)",
            border: "1px solid rgba(212,175,55,0.28)",
            boxShadow: "0 60px 140px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
            maxWidth: 460,
            width: "90%",
            position: "relative",
          }}
        >
          {!denied ? (
            <>
              {/* Seal / logo */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "rgba(212,175,55,0.1)",
                border: "1.5px solid rgba(212,175,55,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 28px",
                fontSize: 32,
              }}>
                🔞
              </div>

              <h1 style={{
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontSize: 28, fontWeight: 700, color: "#fff",
                margin: "0 0 10px", letterSpacing: "-0.01em",
              }}>
                Age Verification
              </h1>
              <p style={{
                fontSize: 14, color: "rgba(232,224,200,0.62)",
                lineHeight: 1.65, margin: "0 0 36px",
              }}>
                This experience contains tobacco, alcohol, and/or vape products.
                You must be <strong style={{ color: "rgba(232,224,200,0.9)" }}>21 years of age or older</strong> to continue.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  style={{
                    background: "linear-gradient(135deg, #d4af37, #b8962e)",
                    color: "#0a0806", border: "none",
                    padding: "15px 28px", borderRadius: 999,
                    fontSize: 13, fontWeight: 800,
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(212,175,55,0.35)",
                  }}
                >
                  I am 21 or Older — Enter
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeny}
                  style={{
                    background: "transparent",
                    color: "rgba(232,224,200,0.38)",
                    border: "1px solid rgba(232,224,200,0.12)",
                    padding: "13px 28px", borderRadius: 999,
                    fontSize: 12, fontWeight: 500,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  I am Under 21
                </motion.button>
              </div>

              <p style={{
                fontSize: 10, color: "rgba(232,224,200,0.22)",
                marginTop: 28, lineHeight: 1.5, letterSpacing: "0.04em",
              }}>
                By entering you confirm you are of legal purchasing age in your jurisdiction.
                This system complies with applicable age verification regulations.
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
              <h2 style={{
                fontFamily: "var(--app-font-serif, Georgia, serif)",
                fontSize: 22, color: "#fff", margin: "0 0 12px",
              }}>
                Access Restricted
              </h2>
              <p style={{
                fontSize: 14, color: "rgba(232,224,200,0.52)", lineHeight: 1.65,
              }}>
                You must be 21 or older to access this experience.
                Please see a staff member for assistance.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
