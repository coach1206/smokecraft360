/**
 * /success — Stripe payment success landing page.
 *
 * Shown after a successful Stripe Checkout.
 * Reads ?session_id= from the URL for reference display.
 */

import { useEffect, useState } from "react";
import { motion }              from "framer-motion";
import { CheckCircle, Clock }  from "lucide-react";
import { BRAND }               from "@/config/brand";

export default function PaymentSuccess() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);

  const shortRef = sessionId ? sessionId.replace("cs_", "").slice(0, 10).toUpperCase() : null;

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: BRAND.background }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(212,139,0,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Animated ring */}
      <div className="relative mb-10">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(212,139,0,0.3)" }}
          animate={{ scale: [1, 1.7, 1.7], opacity: [0.7, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", repeatDelay: 0.8 }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(212,139,0,0.18)" }}
          animate={{ scale: [1, 2.1, 2.1], opacity: [0.5, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.5, repeatDelay: 0.8 }}
        />

        <motion.div
          className="relative w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(212,139,0,0.15), rgba(180,130,30,0.08))",
            border:     "1px solid rgba(212,139,0,0.45)",
            boxShadow:  "0 0 50px rgba(212,139,0,0.22), 0 0 100px rgba(212,139,0,0.06) inset",
          }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        >
          <CheckCircle size={42} style={{ color: "rgba(212,139,0,0.92)" }} />
        </motion.div>
      </div>

      {/* Copy */}
      <motion.div
        className="text-center max-w-sm relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand name */}
        <p
          className="text-[9px] uppercase tracking-[0.45em] mb-4"
          style={{ color: "rgba(212,139,0,0.5)" }}
        >
          {BRAND.name}
        </p>

        <h1
          className="font-serif text-3xl leading-snug mb-4"
          style={{ fontWeight: 300, color: "rgba(235,215,175,0.95)" }}
        >
          Welcome to<br />{BRAND.name}
        </h1>

        <p className="text-base mb-2" style={{ color: "rgba(180,155,100,0.7)" }}>
          Your experience is being prepared.
        </p>
        <p className="text-sm mb-8" style={{ color: "rgba(180,155,100,0.45)" }}>
          A staff member will have everything ready for you shortly.
        </p>

        {/* Reference */}
        {shortRef && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock size={11} style={{ color: "rgba(180,155,100,0.35)" }} />
            <span
              className="text-[9px] uppercase tracking-[0.22em]"
              style={{ color: "rgba(180,155,100,0.4)" }}
            >
              Payment ref: {shortRef}
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          className="mx-auto w-24 h-px mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.3), transparent)",
          }}
        />

        {/* Return button */}
        <motion.a
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-xs uppercase tracking-[0.25em]"
          style={{
            background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
            color:      "hsl(22 18% 6%)",
            boxShadow:  "0 4px 24px rgba(212,139,0,0.28)",
          }}
          whileHover={{ scale: 1.03, boxShadow: "0 6px 32px rgba(212,139,0,0.4)" }}
          whileTap={{ scale: 0.97 }}
        >
          Return to {BRAND.shortName}
        </motion.a>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-6 text-[8px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(180,155,100,0.2)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {BRAND.copyright}
      </motion.p>
    </div>
  );
}
