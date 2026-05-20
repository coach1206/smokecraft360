import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuest } from "../context/GuestProfileContext";

export const RevenueOptimizationOverlay: React.FC = () => {
  const { profile } = useGuest();
  const [isStaff, setIsStaff] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const checkStaff = () => {
      const pin = localStorage.getItem("novee_staff_pin");
      if (pin) setIsStaff(true);
    };
    checkStaff();
    window.addEventListener("storage", checkStaff);
    return () => window.removeEventListener("storage", checkStaff);
  }, []);

  if (!isStaff || profile.sessionType !== "live") return null;

  const getUpsellRecommendation = () => {
    if (profile.visitPairings === 0) {
      return "Guest has not paired a drink — suggest top shelf Rum or Cognac.";
    }
    if (profile.visitPairings === 1) {
      return "Guest has one pairing. Suggest a chocolate or cheese accompaniment to maximize yield.";
    }
    return "Guest ritual complete. Monitor for post-ritual sales opportunity.";
  };

  const estimatedSpend = (profile.visitPairings * 45) + 35;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80, // Above Novee OS bar
        right: 20,
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              background: "rgba(10, 10, 10, 0.95)",
              border: "1px solid #D4AF37",
              borderRadius: 8,
              padding: 16,
              width: 280,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              color: "#D4AF37",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8, letterSpacing: 1 }}>STAFF INTEL</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: "bold" }}>REVENUE SIGNALS</div>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>${estimatedSpend} EST.</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(212, 175, 55, 0.2)", paddingTop: 12 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>RECOMMENDED UPSELL</div>
              <div style={{ fontSize: 11, lineHeight: 1.4, color: "#fff" }}>
                {getUpsellRecommendation()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          background: "#D4AF37",
          color: "#000",
          border: "none",
          borderRadius: 20,
          padding: "8px 16px",
          fontSize: 10,
          fontWeight: "bold",
          cursor: "pointer",
          width: "100%",
          boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
        }}
      >
        {isCollapsed ? "STAFF INTEL" : "CLOSE"}
      </motion.button>
    </div>
  );
};
