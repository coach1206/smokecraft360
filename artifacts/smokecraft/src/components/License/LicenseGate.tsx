/**
 * LicenseGate — visual enforcement layer for subscription state.
 *
 *   active    → renders nothing (children render normally)
 *   past_due  → renders a top-of-screen warning banner with countdown
 *   canceled  → renders a full-screen lock overlay that disables interaction
 *
 * Wraps the entire app inside App.tsx so every route is protected.
 *
 * Note: this is UX only. The server-side `requireActiveLicense` middleware
 * is the actual security boundary — never trust client-side gating alone.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, AlertTriangle, CreditCard, LifeBuoy, Sparkles } from "lucide-react";
import { useLicense } from "../../contexts/LicenseContext";
import { useVenue }   from "../../contexts/VenueContext";

const SUPPORT_EMAIL = "support@smokecraft360.com";

/** Format a future ISO timestamp as "in 3h 12m" (or "soon" within 1m). */
function useRetryCountdown(iso: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [iso]);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 60_000) return "any moment";
  const totalMin = Math.floor(ms / 60_000);
  const hours    = Math.floor(totalMin / 60);
  const minutes  = totalMin % 60;
  if (hours >= 24) {
    const d = Math.floor(hours / 24);
    return `in ${d}d ${hours % 24}h`;
  }
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export function LicenseGate() {
  const license   = useLicense();
  const venue     = useVenue();
  const retryIn   = useRetryCountdown(license.nextRetryAt);

  if (license.loading) return null;

  // ── Past-due grace banner ─────────────────────────────────────────────────
  if (license.status === "past_due") {
    return (
      <AnimatePresence>
        <motion.div
          key="banner"
          className="fixed top-0 inset-x-0 z-[200] px-5 py-3 flex items-center justify-between gap-4"
          style={{
            background: "linear-gradient(90deg, rgba(180,80,30,0.95), rgba(140,50,10,0.95))",
            color: "rgba(255,240,220,0.95)",
            borderBottom: "1px solid rgba(255,180,100,0.4)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                Payment issue detected — update to avoid interruption
              </p>
              <p className="text-[11px] opacity-80">
                {license.daysRemaining !== null && license.daysRemaining > 0 && (
                  <>Service pauses in {license.daysRemaining} day{license.daysRemaining === 1 ? "" : "s"}</>
                )}
                {retryIn && (
                  <>
                    {license.daysRemaining !== null && license.daysRemaining > 0 ? " · " : ""}
                    Next attempt {retryIn}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {license.canUpgrade && (
              <button
                onClick={() => upgradePlan(license.plan === "starter" ? "pro" : "premium")}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] uppercase tracking-[0.15em] font-medium transition-colors"
                style={{
                  background: "rgba(255,215,140,0.18)",
                  border:     "1px solid rgba(255,220,150,0.5)",
                  color:      "rgba(255,250,240,0.98)",
                }}
              >
                <Sparkles size={12} />
                Upgrade to {license.plan === "starter" ? "Pro" : "Premium"}
              </button>
            )}
            <button
              onClick={() => openBillingPortal()}
              className="px-4 py-1.5 rounded text-xs uppercase tracking-[0.15em] font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.15)",
                border:     "1px solid rgba(255,255,255,0.35)",
                color:      "rgba(255,250,240,0.98)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
            >
              Fix Billing
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Hard lock screen ──────────────────────────────────────────────────────
  if (license.status === "canceled" || license.status === "none") {
    return (
      <AnimatePresence>
        <motion.div
          key="lock"
          className="fixed inset-0 z-[300] flex items-center justify-center px-6"
          style={{
            background: "radial-gradient(circle at center, rgba(20,12,8,0.97), rgba(0,0,0,0.99))",
            backdropFilter: "blur(12px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Block all interaction with the underlying app
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <motion.div
            className="max-w-md w-full text-center"
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0,  opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 26, delay: 0.1 }}
          >
            {/* Brand */}
            <p
              className="font-serif text-3xl mb-1"
              style={{ color: "rgba(212,175,55,0.95)", fontWeight: 300, letterSpacing: "0.04em" }}
            >
              {venue.logoText}
            </p>
            <p className="text-[10px] uppercase tracking-[0.4em] mb-10" style={{ color: "rgba(180,155,100,0.45)" }}>
              {venue.tagline}
            </p>

            {/* Lock icon */}
            <div
              className="w-20 h-20 mx-auto mb-7 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(212,175,55,0.08)",
                border:     "1px solid rgba(212,175,55,0.3)",
                boxShadow:  "0 0 40px rgba(212,175,55,0.12)",
              }}
            >
              <Lock size={32} style={{ color: "rgba(212,175,55,0.85)" }} />
            </div>

            {/* Message */}
            <h2
              className="font-serif text-2xl mb-3"
              style={{ color: "rgba(230,210,175,0.95)", fontWeight: 300 }}
            >
              Subscription Required to Continue
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(180,155,100,0.65)" }}>
              Please renew your service to unlock this experience.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => openBillingPortal()}
                className="flex items-center justify-center gap-2 py-3.5 px-6 rounded font-serif text-sm uppercase tracking-[0.2em] transition-all"
                style={{
                  background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                  color:      "hsl(22 18% 6%)",
                  boxShadow:  "0 0 30px rgba(212,175,55,0.18)",
                }}
              >
                <CreditCard size={15} />
                Renew Now
              </button>

              {license.canUpgrade && (
                <button
                  onClick={() => upgradePlan(license.plan === "starter" ? "pro" : "premium")}
                  className="flex items-center justify-center gap-2 py-3 px-6 rounded text-xs uppercase tracking-[0.18em] transition-colors"
                  style={{
                    background: "rgba(212,175,55,0.1)",
                    border:     "1px solid rgba(212,175,55,0.4)",
                    color:      "rgba(230,210,175,0.9)",
                  }}
                >
                  <Sparkles size={13} />
                  Upgrade Plan
                </button>
              )}

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=SmokeCraft%20360%20%E2%80%94%20${encodeURIComponent(venue.logoText)}%20Subscription`}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded text-xs uppercase tracking-[0.18em] transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border:     "1px solid rgba(255,255,255,0.1)",
                  color:      "rgba(180,155,100,0.7)",
                }}
              >
                <LifeBuoy size={13} />
                Contact Support
              </a>
            </div>

            {license.offline && (
              <p className="mt-8 text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(180,155,100,0.3)" }}>
                Offline — showing last known status
              </p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

/**
 * Open the Stripe Billing Portal in a new tab. The route requires auth, so
 * if the venue owner isn't signed in we fall back to a contact mailto.
 */
async function openBillingPortal(): Promise<void> {
  try {
    const r = await fetch("/api/billing/portal", {
      method:      "POST",
      credentials: "include",
    });
    if (r.ok) {
      const { url } = await r.json() as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
  } catch { /* fall through */ }
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=SmokeCraft%20360%20Renewal`;
}

/** Start a plan upgrade via Stripe Checkout (subscription mode). */
async function upgradePlan(plan: "pro" | "premium"): Promise<void> {
  try {
    const r = await fetch("/api/subscriptions/create-checkout", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ plan }),
    });
    if (r.ok) {
      const { checkoutUrl } = await r.json() as { checkoutUrl: string };
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      return;
    }
  } catch { /* fall through */ }
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=SmokeCraft%20360%20Upgrade`;
}
