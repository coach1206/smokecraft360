/**
 * UpgradePage — /upgrade
 *
 * Plan comparison page: Essential vs Sovereign.
 * Reached when any "Upgrade to Sovereign" CTA is tapped.
 */

import { motion } from "framer-motion";
import { Check, X, Sparkles, ArrowLeft, Mail, Phone } from "lucide-react";

const C = {
  bg:       "#0d0c0b",
  gold:     "#D48B00",
  goldDim:  "rgba(212,139,0,0.70)",
  goldBg:   "rgba(212,139,0,0.10)",
  goldBord: "rgba(212,139,0,0.28)",
  ink:      "#F5F2ED",
  muted:    "rgba(245,242,237,0.52)",
  dim:      "rgba(245,242,237,0.25)",
  card:     "rgba(22,21,19,0.92)",
  serif:    "'Cormorant Garamond', Georgia, serif",
  mono:     "'JetBrains Mono','Courier New',monospace",
};

interface Feature {
  label: string;
  essential: boolean | string;
  sovereign: boolean | string;
}

const FEATURES: Feature[] = [
  { label: "Swipe Experience Engine",           essential: true,             sovereign: true },
  { label: "AI Recommendations",                essential: "Basic",          sovereign: "Full semantic + pairing" },
  { label: "Inventory Management",              essential: true,             sovereign: true },
  { label: "Loyalty & Points System",           essential: true,             sovereign: true },
  { label: "Analytics Dashboard",               essential: "7-day window",   sovereign: "Unlimited + forecasting" },
  { label: "Swipe Intelligence (IQ)",           essential: false,            sovereign: true },
  { label: "Revenue Brain v2 (scoring)",        essential: false,            sovereign: true },
  { label: "Multi-venue Network Intelligence",  essential: false,            sovereign: true },
  { label: "POS Adapter Integration",           essential: false,            sovereign: true },
  { label: "Personalization & Taste Profiles",  essential: false,            sovereign: true },
  { label: "Lounge League Competition",         essential: false,            sovereign: true },
  { label: "Axiom Receipt Experience",          essential: false,            sovereign: true },
  { label: "Financial Reconciliation",          essential: false,            sovereign: true },
  { label: "Design Playground",                 essential: false,            sovereign: true },
  { label: "Signature Studio",                  essential: false,            sovereign: true },
  { label: "Enterprise Governance",             essential: false,            sovereign: true },
  { label: "Priority Support",                  essential: false,            sovereign: true },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)  return <Check size={16} color={C.gold} strokeWidth={2.5} />;
  if (value === false) return <X     size={14} color={C.dim}  strokeWidth={2} />;
  return <span style={{ fontSize: 12, color: C.goldDim, lineHeight: 1.3 }}>{value}</span>;
}

export default function UpgradePage() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(160deg, ${C.bg} 0%, #110f0c 100%)`,
      color: C.ink,
      fontFamily: "system-ui, sans-serif",
      overflowX: "hidden",
    }}>

      {/* ── Back button ── */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => window.history.back()}
        style={{
          position: "fixed", top: 18, left: 18, zIndex: 50,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 10, padding: "8px 14px",
          color: C.muted, cursor: "pointer", fontSize: 13,
        }}
      >
        <ArrowLeft size={14} /> Back
      </motion.button>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "88px 20px 80px" }}>

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: C.goldBg, border: `1px solid ${C.goldBord}`,
            borderRadius: 20, padding: "6px 16px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            color: C.goldDim, fontFamily: C.mono,
            marginBottom: 22,
          }}>
            <Sparkles size={12} color={C.gold} />
            SOVEREIGN PLAN
          </div>

          <h1 style={{
            fontFamily: C.serif,
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 600, lineHeight: 1.15,
            margin: "0 0 18px",
            background: `linear-gradient(135deg, ${C.ink} 40%, ${C.gold} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Unlock the Full Platform
          </h1>

          <p style={{
            fontSize: 16, color: C.muted,
            lineHeight: 1.7, maxWidth: 520, margin: "0 auto",
          }}>
            Sovereign gives your venue the complete Axiom OS intelligence stack —
            from AI-driven recommendations to enterprise-grade financial reconciliation.
          </p>
        </motion.div>

        {/* ── Tier cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20, marginBottom: 48,
          }}
        >
          {/* Essential card */}
          <div style={{
            background: C.card,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, padding: "28px 28px 32px",
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
                color: C.muted, fontFamily: C.mono, marginBottom: 8,
              }}>
                ESSENTIAL
              </div>
              <div style={{
                fontFamily: C.serif, fontSize: 28, fontWeight: 600,
                color: C.ink, marginBottom: 6,
              }}>
                Core Features
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Everything you need to get started — swipe experience, basic
                recommendations, and loyalty management.
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              color: C.muted, fontFamily: C.mono,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingTop: 16, marginTop: 4,
            }}>
              CURRENT PLAN
            </div>
          </div>

          {/* Sovereign card */}
          <div style={{
            background: `linear-gradient(145deg, rgba(30,24,10,0.95), rgba(18,15,6,0.97))`,
            border: `1.5px solid ${C.goldBord}`,
            borderRadius: 20, padding: "28px 28px 32px",
            position: "relative", overflow: "hidden",
          }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 180, height: 180,
              background: `radial-gradient(circle, rgba(212,139,0,0.14), transparent 70%)`,
              pointerEvents: "none",
            }} />

            <div style={{ marginBottom: 20, position: "relative" }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
                color: C.gold, fontFamily: C.mono, marginBottom: 8,
              }}>
                SOVEREIGN
              </div>
              <div style={{
                fontFamily: C.serif, fontSize: 28, fontWeight: 600,
                color: C.ink, marginBottom: 6,
              }}>
                Full Intelligence Stack
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                The complete platform — AI scoring, revenue forecasting, POS
                integration, Lounge League, and every premium feature unlocked.
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 8px 28px rgba(212,139,0,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const el = document.getElementById("upgrade-contact");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "13px 26px", borderRadius: 12,
                background: `linear-gradient(135deg, ${C.gold} 0%, #f0a800 100%)`,
                border: "none",
                fontSize: 14, fontWeight: 700, color: "#1A1A1B",
                cursor: "pointer", letterSpacing: "0.04em",
                boxShadow: "0 4px 18px rgba(212,139,0,0.35)",
              }}
            >
              <Sparkles size={15} />
              Contact Sales
            </motion.button>
          </div>
        </motion.div>

        {/* ── Feature comparison table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          style={{
            background: C.card,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20, overflow: "hidden",
            marginBottom: 60,
          }}
        >
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 120px 120px",
            padding: "14px 24px",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: C.dim, fontFamily: C.mono }}>
              FEATURE
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: C.dim, fontFamily: C.mono, textAlign: "center" }}>
              ESSENTIAL
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: C.gold, fontFamily: C.mono, textAlign: "center" }}>
              SOVEREIGN
            </div>
          </div>

          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: "grid", gridTemplateColumns: "1fr 120px 120px",
                padding: "13px 24px",
                borderBottom: i < FEATURES.length - 1
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 14, color: C.ink }}>{f.label}</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CellValue value={f.essential} />
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CellValue value={f.sovereign} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Contact / Sales CTA ── */}
        <motion.div
          id="upgrade-contact"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{
            background: `linear-gradient(145deg, rgba(30,24,10,0.95), rgba(18,15,6,0.97))`,
            border: `1px solid ${C.goldBord}`,
            borderRadius: 24, padding: "40px 36px",
            textAlign: "center", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", top: -60, left: "50%",
            transform: "translateX(-50%)",
            width: 320, height: 160,
            background: `radial-gradient(ellipse, rgba(212,139,0,0.12), transparent 70%)`,
            pointerEvents: "none",
          }} />

          <Sparkles size={28} color={C.gold} style={{ marginBottom: 16 }} />

          <h2 style={{
            fontFamily: C.serif,
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 600, color: C.ink,
            margin: "0 0 12px",
          }}>
            Ready to Go Sovereign?
          </h2>

          <p style={{
            fontSize: 15, color: C.muted,
            lineHeight: 1.7, maxWidth: 460, margin: "0 auto 32px",
          }}>
            Our team will walk you through setup, migrate your existing data, and
            have your venue running on the full intelligence stack within 48 hours.
          </p>

          <div style={{
            display: "flex", gap: 14,
            justifyContent: "center", flexWrap: "wrap",
          }}>
            <motion.a
              whileHover={{ scale: 1.03, boxShadow: "0 8px 28px rgba(212,139,0,0.5)" }}
              whileTap={{ scale: 0.97 }}
              href="mailto:sales@profoundinnovations.com?subject=Sovereign%20Plan%20Inquiry"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 30px", borderRadius: 14,
                background: `linear-gradient(135deg, ${C.gold} 0%, #f0a800 100%)`,
                border: "none",
                fontSize: 14, fontWeight: 700, color: "#1A1A1B",
                cursor: "pointer", letterSpacing: "0.04em",
                textDecoration: "none",
                boxShadow: "0 4px 18px rgba(212,139,0,0.32)",
              }}
            >
              <Mail size={15} />
              Email Sales
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="tel:+18005550100"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 30px", borderRadius: 14,
                background: C.goldBg,
                border: `1px solid ${C.goldBord}`,
                fontSize: 14, fontWeight: 600, color: C.gold,
                cursor: "pointer", letterSpacing: "0.04em",
                textDecoration: "none",
              }}
            >
              <Phone size={15} />
              Call Us
            </motion.a>
          </div>

          <p style={{
            marginTop: 24, fontSize: 12, color: C.dim,
          }}>
            No long-term contracts · 30-day satisfaction guarantee · White-glove onboarding
          </p>
        </motion.div>

      </div>
    </div>
  );
}
