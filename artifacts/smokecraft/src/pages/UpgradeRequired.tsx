import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Crown, Lock, ArrowLeft, Mail } from "lucide-react";

const C = {
  bg:     "#F5F2ED",
  panel:  "rgba(26,26,27,0.06)",
  border: "rgba(212,139,0,0.20)",
  gold:   "#D48B00",
  text:   "rgba(26,26,27,0.90)",
  muted:  "rgba(26,26,27,0.50)",
  dim:    "rgba(26,26,27,0.28)",
};

export default function UpgradeRequired() {
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const featureName = params.get("feature") ?? "This Feature";

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Ambient top glow */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 480,
          height: 220,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(212,139,0,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(239,235,224,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "40px 36px",
          textAlign: "center",
          boxShadow:
            "0 4px 32px rgba(26,26,27,0.08), 0 1px 4px rgba(26,26,27,0.06)",
        }}
      >
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
            background: `linear-gradient(135deg, ${C.gold}22 0%, ${C.gold}11 100%)`,
            border: `1.5px solid ${C.gold}44`,
            marginBottom: 24,
            position: "relative",
          }}
        >
          <Lock size={30} color={C.gold} strokeWidth={1.6} />
          <div
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              background: C.gold,
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Crown size={13} color="#fff" strokeWidth={2} />
          </div>
        </motion.div>

        {/* Tier label */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${C.gold}18`,
            border: `1px solid ${C.gold}33`,
            borderRadius: 20,
            padding: "4px 14px",
            marginBottom: 20,
          }}
        >
          <Crown size={12} color={C.gold} strokeWidth={2} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.gold,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Sovereign Tier Only
          </span>
        </div>

        {/* Feature name */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 26,
            fontWeight: 700,
            color: C.text,
            margin: "0 0 12px",
            lineHeight: 1.25,
          }}
        >
          {featureName}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 14.5,
            color: C.muted,
            lineHeight: 1.65,
            margin: "0 0 32px",
          }}
        >
          This feature is reserved for venues on the{" "}
          <span style={{ color: C.gold, fontWeight: 600 }}>Sovereign</span>{" "}
          plan. Upgrade your venue to unlock full access to{" "}
          {featureName.toLowerCase()} and the complete suite of advanced
          capabilities.
        </p>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: C.border,
            margin: "0 0 28px",
          }}
        />

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a
            href="mailto:upgrade@axiom-os.com?subject=Sovereign Upgrade Inquiry"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: C.gold,
              color: "#fff",
              borderRadius: 12,
              padding: "15px 20px",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: `0 2px 12px ${C.gold}44`,
              transition: "opacity 0.15s",
              minHeight: 52,
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.88")
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")
            }
          >
            <Mail size={15} strokeWidth={2} />
            Contact Us to Upgrade
          </a>

          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "transparent",
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "14px 20px",
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
              minHeight: 52,
              transition: "color 0.15s",
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLButtonElement).style.color = C.text)
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLButtonElement).style.color = C.muted)
            }
          >
            <ArrowLeft size={15} strokeWidth={2} />
            Back to Dashboard
          </button>
        </div>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: 28,
          fontSize: 12.5,
          color: C.dim,
          textAlign: "center",
        }}
      >
        Already on Sovereign? Contact your account manager or{" "}
        <a
          href="mailto:support@axiom-os.com"
          style={{ color: C.gold, textDecoration: "none" }}
        >
          support@axiom-os.com
        </a>
      </motion.p>
    </div>
  );
}
