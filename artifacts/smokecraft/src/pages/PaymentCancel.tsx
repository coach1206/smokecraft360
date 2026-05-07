/**
 * /cancel — Stripe payment cancellation landing page.
 *
 * Shown when the user exits Stripe Checkout without completing payment.
 */

import { motion }    from "framer-motion";
import { XCircle }   from "lucide-react";
import { BRAND }     from "@/config/brand";

export default function PaymentCancel() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: BRAND.background }}
    >
      {/* Subtle red ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 45%, rgba(120,40,30,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Icon */}
      <motion.div
        className="relative w-24 h-24 rounded-full flex items-center justify-center mb-10"
        style={{
          background: "rgba(239,68,68,0.06)",
          border:     "1px solid rgba(239,68,68,0.25)",
          boxShadow:  "0 0 40px rgba(239,68,68,0.08)",
        }}
        initial={{ scale: 0, rotate: 20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
      >
        <XCircle size={38} style={{ color: "rgba(239,68,68,0.65)" }} />
      </motion.div>

      {/* Copy */}
      <motion.div
        className="text-center max-w-sm relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-[9px] uppercase tracking-[0.45em] mb-4"
          style={{ color: "rgba(212,139,0,0.45)" }}
        >
          {BRAND.name}
        </p>

        <h1
          className="font-serif text-3xl leading-snug mb-4"
          style={{ fontWeight: 300, color: "rgba(235,215,175,0.88)" }}
        >
          Order Canceled
        </h1>

        <p className="text-sm mb-8" style={{ color: "rgba(107,94,78,0.52)" }}>
          Your {BRAND.name} experience was canceled.
          <br />No charge was made.
        </p>

        {/* Divider */}
        <div
          className="mx-auto w-16 h-px mb-8"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.25), transparent)",
          }}
        />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.a
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-xs uppercase tracking-[0.22em]"
            style={{
              background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
              color:      "#F5F2ED",
              boxShadow:  "0 4px 20px rgba(212,139,0,0.22)",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Try Again
          </motion.a>

          <motion.a
            href="/"
            className="inline-flex items-center px-5 py-3 rounded-full text-xs uppercase tracking-[0.22em]"
            style={{
              background: "rgba(26,26,27,0.06)",
              border:     "1px solid rgba(26,26,27,0.11)",
              color:      "rgba(107,94,78,0.52)",
            }}
            whileHover={{ borderColor: "rgba(212,139,0,0.3)", color: "rgba(212,139,0,0.7)" }}
            whileTap={{ scale: 0.97 }}
          >
            Return Home
          </motion.a>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-6 text-[8px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(107,94,78,0.18)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {BRAND.copyright}
      </motion.p>
    </div>
  );
}
