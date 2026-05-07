/**
 * OrderConfirmation — full-screen success overlay shown after an order is placed.
 *
 * Displays:
 *  - "Your experience is being prepared"
 *  - Order type and reference ID
 *  - Animated gold ring + smoke effect
 *  - Dismiss button
 */

import { useEffect } from "react";
import { motion }    from "framer-motion";
import {
  CheckCircle, Hash, ShoppingBag, MapPin, Clock,
} from "lucide-react";
import type { OrderType } from "@/services/api";

interface OrderConfirmationProps {
  orderId:   string;
  orderType: OrderType;
  onDismiss: () => void;
}

const TYPE_CONFIG: Record<OrderType, { icon: React.ReactNode; label: string; subtitle: string }> = {
  table:    { icon: <Hash size={14} />,        label: "Request at Table", subtitle: "A staff member will be with you shortly" },
  pickup:   { icon: <ShoppingBag size={14} />, label: "Pickup",           subtitle: "Collect your order from the bar when ready" },
  delivery: { icon: <MapPin size={14} />,      label: "Delivery",         subtitle: "Your order is on its way to you" },
};

export function OrderConfirmation({ orderId, orderType, onDismiss }: OrderConfirmationProps) {
  const config = TYPE_CONFIG[orderType];
  const shortId = orderId.slice(0, 8).toUpperCase();

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 12_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "rgba(5,3,1,0.96)", backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,139,0,0.07) 0%, transparent 70%)" }} />

      {/* Animated ring */}
      <div className="relative mb-10">
        {/* Outer pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(212,139,0,0.3)" }}
          animate={{ scale: [1, 1.6, 1.6], opacity: [0.8, 0, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", repeatDelay: 0.6 }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: "1px solid rgba(212,139,0,0.2)" }}
          animate={{ scale: [1, 1.9, 1.9], opacity: [0.6, 0, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.4, repeatDelay: 0.6 }}
        />

        {/* Icon circle */}
        <motion.div
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(212,139,0,0.15), rgba(180,130,30,0.08))",
            border:     "1px solid rgba(212,139,0,0.4)",
            boxShadow:  "0 0 40px rgba(212,139,0,0.2), 0 0 80px rgba(212,139,0,0.08) inset",
          }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.15 }}
        >
          <CheckCircle size={36} style={{ color: "rgba(212,139,0,0.9)" }} />
        </motion.div>
      </div>

      {/* Text */}
      <motion.div
        className="text-center max-w-xs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="font-serif text-3xl mb-3 leading-tight"
          style={{ fontWeight: 300, color: "rgba(235,215,175,0.95)" }}>
          Your experience<br />is being prepared
        </h2>

        <p className="text-sm mb-6" style={{ color: "rgba(180,155,100,0.6)" }}>
          {config.subtitle}
        </p>

        {/* Order type badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.22)" }}>
            <span style={{ color: "rgba(212,139,0,0.7)" }}>{config.icon}</span>
            <span className="text-xs uppercase tracking-[0.2em]" style={{ color: "rgba(212,139,0,0.75)" }}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Reference number */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Clock size={11} style={{ color: "rgba(180,155,100,0.35)" }} />
          <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "rgba(180,155,100,0.4)" }}>
            Ref: {shortId}
          </span>
        </div>

        {/* Dismiss button */}
        <motion.button
          onClick={onDismiss}
          className="px-8 py-3 rounded-full text-xs uppercase tracking-[0.25em]"
          style={{
            background: "rgba(26,26,27,0.07)",
            border:     "1px solid rgba(255,255,255,0.1)",
            color:      "rgba(180,155,100,0.65)",
          }}
          whileHover={{ background: "rgba(212,139,0,0.08)", borderColor: "rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.8)" }}
          whileTap={{ scale: 0.97 }}
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
