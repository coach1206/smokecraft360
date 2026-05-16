/**
 * SovereignLockOverlay — shared locked-feature gate component.
 *
 * Variants:
 *   "fullpage" — full-screen centered layout (DesignerPage)
 *   "modal"    — floating dialog with backdrop (SignatureStudio)
 *   "inline"   — centered block within a tab/section (LoungeLeagueTab)
 *
 * Always renders: lock icon · "ESSENTIAL MODE ACTIVE" · feature name ·
 * optional description · "Upgrade to Sovereign" CTA → /upgrade
 */

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const GOLD     = "rgba(212,139,0,0.95)";
const GOLD_DIM = "rgba(212,139,0,0.70)";
const GOLD_BG  = "rgba(212,139,0,0.12)";
const GOLD_BORDER = "rgba(212,139,0,0.35)";

export interface SovereignLockOverlayProps {
  variant: "fullpage" | "modal" | "inline";
  featureName: string;
  description?: string;
  isOpen?: boolean;
  onClose?: () => void;
  /** Fullpage only — rendered as an absolute back button */
  onBack?: () => void;
}

function LockCore({ featureName, description }: { featureName: string; description?: string }) {
  const [, navigate] = useLocation();

  return (
    <>
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: GOLD_BG,
        border: `1.5px solid ${GOLD_BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Lock size={26} color={GOLD_DIM} />
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD_DIM, fontFamily: "monospace" }}>
        ESSENTIAL MODE ACTIVE
      </div>

      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 24, fontWeight: 600, color: "#F5F2ED",
        textAlign: "center", lineHeight: 1.25,
      }}>
        {featureName}
      </div>

      {description && (
        <div style={{
          fontSize: 14, color: "rgba(245,242,237,0.55)",
          lineHeight: 1.7, textAlign: "center", maxWidth: 320,
        }}>
          {description}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.03, boxShadow: "0 8px 28px rgba(212,139,0,0.45)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/upgrade")}
        style={{
          marginTop: 8,
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 32px", borderRadius: 14,
          background: "linear-gradient(135deg, #D48B00 0%, #f0a800 100%)",
          border: "none",
          fontSize: 14, fontWeight: 700, color: "#1A1A1B",
          cursor: "pointer", letterSpacing: "0.04em",
          boxShadow: "0 4px 16px rgba(212,139,0,0.32)",
        }}
      >
        <Sparkles size={15} />
        Upgrade to Sovereign
      </motion.button>
    </>
  );
}

export function SovereignLockOverlay({
  variant,
  featureName,
  description,
  isOpen,
  onClose,
  onBack,
}: SovereignLockOverlayProps) {
  if (variant === "fullpage") {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg, #1a1a1b 0%, #0d0d0e 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20, padding: "40px 24px",
        position: "relative",
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position: "absolute", top: 20, left: 20,
              background: "none", border: "none",
              color: "rgba(245,242,237,0.55)",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            }}
          >
            ← Back
          </button>
        )}
        <LockCore featureName={featureName} description={description} />
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              data-testid="sovereign-backdrop"
              className="fixed inset-0 z-[280]"
              style={{ background: "rgba(26,26,27,0.45)", backdropFilter: "blur(8px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-label={`${featureName} locked`}
              className="fixed inset-x-4 top-1/2 z-[290] max-w-sm mx-auto rounded-2xl overflow-hidden p-8"
              style={{
                background: "linear-gradient(165deg, hsl(22 16% 8%), hsl(20 16% 5%))",
                border: "1px solid rgba(212,139,0,0.2)",
                transform: "translateY(-50%)",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 16,
              }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={e => e.stopPropagation()}
            >
              <LockCore featureName={featureName} description={description} />
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    marginTop: 4, padding: "10px 28px", borderRadius: 10,
                    border: "1px solid rgba(212,139,0,0.25)",
                    background: "rgba(212,139,0,0.07)",
                    color: GOLD_DIM, cursor: "pointer",
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  Not Now
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  if (variant === "inline") {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 16,
        padding: "48px 24px", textAlign: "center",
      }}>
        <LockCore featureName={featureName} description={description} />
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px", borderRadius: 10,
              border: "1px solid rgba(212,139,0,0.25)",
              background: "rgba(212,139,0,0.07)",
              color: GOLD_DIM, cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return null;
}
