/**
 * UpgradeRequired (NOVEE OS) — phase: "upgrade_required"
 *
 * Gating screen shown when a user attempts to access a Sovereign-only feature.
 * Navigation uses NOVEE's phase system.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Lock, ArrowLeft, CreditCard, Settings } from "lucide-react";
import { useGuest } from "@/context/GuestProfileContext";

const G    = "#D4AF37";
const GB   = "rgba(212,175,55,0.14)";
const GBo  = "rgba(212,175,55,0.28)";
const INK  = "#F5F2ED";
const MUTED = "rgba(245,242,237,0.55)";
const DIM   = "rgba(245,242,237,0.25)";

type Plan = "starter" | "pro" | "premium";

interface UpgradeRequiredProps {
  featureName?: string;
  planHint?:    Plan;
}

export default function UpgradeRequired({ featureName = "This Feature", planHint = "pro" }: UpgradeRequiredProps) {
  const { setPhase }                          = useGuest();
  const [loading, setLoading]                 = useState(false);
  const [portalLoading, setPortalLoading]     = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    setLoading(true);
    try {
      const token   = localStorage.getItem("axiom_token") ?? "";
      const venueId = localStorage.getItem("smokecraft_venue") ?? "";
      const res = await fetch("/api/subscriptions/create-checkout", {
        method:      "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: planHint, venueId: venueId || undefined }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setError(null);
    setPortalLoading(true);
    try {
      const token = localStorage.getItem("axiom_token") ?? "";
      const res = await fetch("/api/subscriptions/portal", {
        method:      "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal");
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #0C0804 0%, #080502 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "system-ui, sans-serif",
      position: "relative",
    }}>

      {/* Top gold rule */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 60,
        background: `linear-gradient(90deg, transparent 0%, ${G}60 20%, ${G} 50%, ${G}60 80%, transparent 100%)`,
        boxShadow: `0 0 32px 4px ${G}28`,
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 500, height: 260,
        background: `radial-gradient(ellipse at 50% 0%, ${GB} 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(18,14,8,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${GBo}`,
          borderRadius: 20,
          padding: "40px 36px",
          textAlign: "center",
          boxShadow: `0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Inner ambient */}
        <div style={{
          position: "absolute", top: -60, left: "50%",
          transform: "translateX(-50%)",
          width: 280, height: 140,
          background: `radial-gradient(ellipse, ${GB}, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Lock badge */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${G}22 0%, ${G}0d 100%)`,
            border: `1.5px solid ${G}44`,
            marginBottom: 24,
            position: "relative",
          }}
        >
          <Lock size={30} color={G} strokeWidth={1.6} />
          <div style={{
            position: "absolute", top: -6, right: -6,
            background: G, borderRadius: "50%",
            width: 24, height: 24,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Crown size={13} color="#0C0804" strokeWidth={2} />
          </div>
        </motion.div>

        {/* Tier label */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: GB, border: `1px solid ${GBo}`,
          borderRadius: 20, padding: "4px 14px", marginBottom: 20,
        }}>
          <Crown size={12} color={G} strokeWidth={2} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: G,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Sovereign Tier Only
          </span>
        </div>

        {/* Feature name */}
        <h1 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 26, fontWeight: 700, color: INK,
          margin: "0 0 12px", lineHeight: 1.25,
        }}>
          {featureName}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 14, color: MUTED,
          lineHeight: 1.65, margin: "0 0 32px",
        }}>
          This feature is reserved for venues on the{" "}
          <span style={{ color: G, fontWeight: 600 }}>Sovereign</span>{" "}
          plan. Upgrade to unlock full access to{" "}
          {featureName.toLowerCase()} and the complete intelligence stack.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: GBo, margin: "0 0 28px" }} />

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(200,50,50,0.10)",
            border: "1px solid rgba(200,50,50,0.28)",
            borderRadius: 10, padding: "10px 14px",
            color: "#ffb3b3", fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: `0 8px 28px ${G}44` }}
            whileTap={{ scale: 0.97 }}
            onClick={startCheckout}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: loading
                ? `${G}88`
                : `linear-gradient(135deg, ${G} 0%, #e8c040 100%)`,
              color: "#0C0804",
              borderRadius: 12,
              padding: "15px 20px",
              fontWeight: 700, fontSize: 14,
              border: "none",
              cursor: loading ? "wait" : "pointer",
              boxShadow: `0 2px 12px ${G}44`,
              minHeight: 52,
              transition: "opacity 0.15s",
            }}
          >
            <CreditCard size={15} strokeWidth={2} />
            {loading ? "Opening Checkout…" : "Upgrade to Sovereign"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPhase("upgrade_plan")}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: GB, border: `1px solid ${GBo}`,
              borderRadius: 12, padding: "13px 20px",
              fontWeight: 600, fontSize: 13, color: G,
              cursor: "pointer", minHeight: 46,
            }}
          >
            View Plan Comparison
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={openPortal}
            disabled={portalLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 12, padding: "12px 20px",
              fontWeight: 600, fontSize: 13, color: MUTED,
              cursor: portalLoading ? "wait" : "pointer",
              opacity: portalLoading ? 0.6 : 1, minHeight: 44,
            }}
          >
            <Settings size={14} strokeWidth={2} />
            {portalLoading ? "Opening…" : "Manage Existing Billing"}
          </motion.button>

          <button
            onClick={() => setPhase("crafthub")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "transparent", color: DIM,
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "12px 20px",
              fontWeight: 600, fontSize: 13,
              cursor: "pointer", minHeight: 44,
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to Dashboard
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: 28, fontSize: 12, color: DIM, textAlign: "center" }}
      >
        Payments processed securely via Stripe.{" "}
        <a href="mailto:support@axiom-os.com" style={{ color: G, textDecoration: "none" }}>
          Contact support
        </a>{" "}
        for help.
      </motion.p>
    </div>
  );
}
