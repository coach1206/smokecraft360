/**
 * UpgradePage (NOVEE OS) — phase: "upgrade_plan"
 *
 * Self-serve plan upgrade via Stripe Checkout.
 * Navigates back via NOVEE's phase system (setPhase → crafthub).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles, ArrowLeft, CreditCard, Settings } from "lucide-react";
import { useGuest } from "@/context/GuestProfileContext";
import { useLicense } from "@/contexts/LicenseContext";

const G = "#D4AF37";
const G2 = "rgba(212,175,55,0.70)";
const GB = "rgba(212,175,55,0.14)";
const GBo = "rgba(212,175,55,0.28)";
const INK = "#F5F2ED";
const MUTED = "rgba(245,242,237,0.55)";
const DIM = "rgba(245,242,237,0.25)";
const CARD = "rgba(18,14,8,0.88)";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono','Courier New',monospace";

type Plan = "starter" | "pro" | "premium";

interface PlanConfig {
  key:         Plan;
  label:       string;
  price:       string;
  priceNote:   string;
  description: string;
  highlight:   boolean;
}

const PLANS: PlanConfig[] = [
  {
    key:         "starter",
    label:       "Essential",
    price:       "$99",
    priceNote:   "/ month",
    description: "Core swipe experience, basic AI recommendations, loyalty management.",
    highlight:   false,
  },
  {
    key:         "pro",
    label:       "Pro",
    price:       "$199",
    priceNote:   "/ month",
    description: "Full Sovereign features — Revenue Brain, Swipe IQ, POS integration.",
    highlight:   true,
  },
  {
    key:         "premium",
    label:       "Premium",
    price:       "$499",
    priceNote:   "/ month",
    description: "Everything in Pro plus multi-venue Network Intelligence and forecasting.",
    highlight:   false,
  },
];

interface Feature {
  label:     string;
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
  { label: "Revenue Brain v2",                  essential: false,            sovereign: true },
  { label: "Multi-venue Network Intelligence",  essential: false,            sovereign: true },
  { label: "POS Adapter Integration",           essential: false,            sovereign: true },
  { label: "Personalization & Taste Profiles",  essential: false,            sovereign: true },
  { label: "Lounge League Competition",         essential: false,            sovereign: true },
  { label: "Financial Reconciliation",          essential: false,            sovereign: true },
  { label: "Enterprise Governance",             essential: false,            sovereign: true },
  { label: "Priority Support",                  essential: false,            sovereign: true },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)  return <Check size={15} color={G}   strokeWidth={2.5} />;
  if (value === false) return <X     size={14} color={DIM} strokeWidth={2} />;
  return <span style={{ fontSize: 11, color: G2, lineHeight: 1.3 }}>{value}</span>;
}

export default function UpgradePage() {
  const { setPhase }   = useGuest();
  const license        = useLicense();
  const [loadingPlan, setLoadingPlan]     = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const currentPlan  = license.plan;
  const hasActiveSub = license.status === "active" && currentPlan !== null && license.source === "stripe";

  async function startCheckout(plan: Plan) {
    setError(null);
    setLoadingPlan(plan);
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
        body: JSON.stringify({ plan, venueId: venueId || undefined }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
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

  function isCurrentPlan(plan: Plan): boolean { return currentPlan === plan; }
  function isDowngrade(plan: Plan): boolean {
    const order: Plan[] = ["starter", "pro", "premium"];
    return currentPlan !== null && order.indexOf(plan) < order.indexOf(currentPlan);
  }
  function planLabel(plan: Plan | null) {
    return PLANS.find((p) => p.key === plan)?.label ?? plan ?? "";
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #0C0804 0%, #080502 100%)",
      color: INK,
      fontFamily: "system-ui, sans-serif",
      overflowX: "hidden",
    }}>

      {/* Top gold rule */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 60,
        background: `linear-gradient(90deg, transparent 0%, ${G}60 20%, ${G} 50%, ${G}60 80%, transparent 100%)`,
        boxShadow: `0 0 32px 4px ${G}28`,
      }} />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => setPhase("crafthub")}
        style={{
          position: "fixed", top: 20, left: 18, zIndex: 50,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 10, padding: "8px 14px",
          color: MUTED, cursor: "pointer", fontSize: 13,
        }}
      >
        <ArrowLeft size={14} /> Back
      </motion.button>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "88px 20px 80px" }}>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{ textAlign: "center", marginBottom: 52 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: GB, border: `1px solid ${GBo}`,
            borderRadius: 20, padding: "6px 16px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            color: G2, fontFamily: MONO, marginBottom: 22,
          }}>
            <Sparkles size={12} color={G} />
            SOVEREIGN PLAN
          </div>

          <h1 style={{
            fontFamily: SERIF,
            fontSize: "clamp(32px, 6vw, 54px)",
            fontWeight: 600, lineHeight: 1.15,
            margin: "0 0 18px",
            background: `linear-gradient(135deg, ${INK} 40%, ${G} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Unlock the Full Platform
          </h1>

          <p style={{
            fontSize: 15, color: MUTED, lineHeight: 1.7,
            maxWidth: 520, margin: "0 auto",
          }}>
            Choose a plan that gives your venue the complete NOVEE OS intelligence stack.
          </p>

          {currentPlan && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginTop: 20,
              background: GB, border: `1px solid ${GBo}`,
              borderRadius: 20, padding: "6px 16px",
              fontSize: 12, color: G2, fontFamily: MONO,
            }}>
              Current plan:&nbsp;<strong style={{ color: G }}>{planLabel(currentPlan)}</strong>
            </div>
          )}
        </motion.div>

        {/* Plan cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16, marginBottom: 44,
          }}
        >
          {PLANS.map((p) => {
            const isCurrent = isCurrentPlan(p.key);
            const isDown    = isDowngrade(p.key);
            const loading   = loadingPlan === p.key;

            return (
              <div
                key={p.key}
                style={{
                  background: p.highlight
                    ? "linear-gradient(145deg, rgba(28,22,8,0.96), rgba(16,12,4,0.98))"
                    : CARD,
                  border: p.highlight
                    ? `1.5px solid ${GBo}`
                    : isCurrent
                    ? `1.5px solid rgba(212,175,55,0.40)`
                    : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18, padding: "26px 24px 28px",
                  position: "relative", overflow: "hidden",
                }}
              >
                {p.highlight && (
                  <div style={{
                    position: "absolute", top: -40, right: -40,
                    width: 180, height: 180,
                    background: `radial-gradient(circle, ${GB}, transparent 70%)`,
                    pointerEvents: "none",
                  }} />
                )}

                {isCurrent && (
                  <div style={{
                    position: "absolute", top: 13, right: 13,
                    background: GB, border: `1px solid ${GBo}`,
                    borderRadius: 10, padding: "3px 9px",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                    color: G, fontFamily: MONO,
                  }}>CURRENT</div>
                )}

                {p.highlight && !isCurrent && (
                  <div style={{
                    position: "absolute", top: 13, right: 13,
                    background: G, borderRadius: 10, padding: "3px 9px",
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
                    color: "#0C0804", fontFamily: MONO,
                  }}>POPULAR</div>
                )}

                <div style={{ marginBottom: 18, position: "relative" }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
                    color: p.highlight ? G : MUTED,
                    fontFamily: MONO, marginBottom: 6,
                  }}>
                    {p.label.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: INK }}>
                      {p.price}
                    </span>
                    <span style={{ fontSize: 12, color: MUTED }}>{p.priceNote}</span>
                  </div>
                  <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                    {p.description}
                  </div>
                </div>

                {isCurrent ? (
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
                    color: G, fontFamily: MONO,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: 14,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Check size={12} strokeWidth={2.5} /> Active Plan
                  </div>
                ) : isDown ? (
                  <div style={{
                    fontSize: 12, color: DIM,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: 14,
                  }}>
                    Contact support to downgrade
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: p.highlight ? `0 8px 28px ${G}44` : `0 4px 16px ${G}28` }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => startCheckout(p.key)}
                    disabled={loading || loadingPlan !== null}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%", padding: "12px 14px", borderRadius: 11,
                      background: p.highlight
                        ? `linear-gradient(135deg, ${G} 0%, #e8c040 100%)`
                        : GB,
                      border: p.highlight ? "none" : `1px solid ${GBo}`,
                      fontSize: 13, fontWeight: 700,
                      color: p.highlight ? "#0C0804" : G,
                      cursor: loading ? "wait" : "pointer",
                      letterSpacing: "0.04em",
                      boxShadow: p.highlight ? `0 4px 18px ${G}30` : "none",
                      opacity: (loading || loadingPlan !== null) ? 0.7 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <CreditCard size={14} />
                    {loading ? "Opening Checkout…" : `Upgrade to ${p.label}`}
                  </motion.button>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(200,50,50,0.10)",
              border: "1px solid rgba(200,50,50,0.30)",
              borderRadius: 10, padding: "12px 16px",
              color: "#ffb3b3", fontSize: 13, marginBottom: 28,
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Manage billing */}
        {hasActiveSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ textAlign: "center", marginBottom: 36 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openPortal}
              disabled={portalLoading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 11, padding: "11px 20px",
                color: MUTED, fontSize: 13, cursor: "pointer",
                opacity: portalLoading ? 0.6 : 1,
              }}
            >
              <Settings size={14} />
              {portalLoading ? "Opening…" : "Manage Billing & Invoices"}
            </motion.button>
          </motion.div>
        )}

        {/* Feature comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          style={{
            background: CARD,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18, overflow: "hidden",
            marginBottom: 36,
          }}
        >
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 110px 110px",
            padding: "13px 22px",
            background: "rgba(255,255,255,0.025)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: DIM, fontFamily: MONO }}>FEATURE</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: DIM, fontFamily: MONO, textAlign: "center" }}>ESSENTIAL</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: G, fontFamily: MONO, textAlign: "center" }}>SOVEREIGN</div>
          </div>

          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              style={{
                display: "grid", gridTemplateColumns: "1fr 110px 110px",
                padding: "12px 22px",
                borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, color: INK }}>{f.label}</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CellValue value={f.essential} />
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <CellValue value={f.sovereign} />
              </div>
            </div>
          ))}
        </motion.div>

        <p style={{ textAlign: "center", fontSize: 12, color: DIM }}>
          No long-term contracts · 30-day satisfaction guarantee · Secure checkout via Stripe
        </p>

      </div>
    </div>
  );
}
