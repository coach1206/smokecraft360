import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SessionData {
  visitPairings: number;
  sessionType: string;
  phase: string;
}

function readSessionData(): SessionData {
  try {
    const raw = sessionStorage.getItem("novee_session_checkpoint");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        visitPairings: parsed.profile?.visitPairings ?? 0,
        sessionType:   parsed.profile?.sessionType   ?? "live",
        phase:         parsed.phase                  ?? "",
      };
    }
  } catch { /* silent */ }
  return { visitPairings: 0, sessionType: "live", phase: "" };
}

export const RevenueOptimizationOverlay: React.FC = () => {
  const [isStaff,      setIsStaff]      = useState(false);
  const [isCollapsed,  setIsCollapsed]  = useState(true);
  const [sessionData,  setSessionData]  = useState<SessionData>(readSessionData);

  useEffect(() => {
    const checkStaff = () => {
      const pin = localStorage.getItem("novee_staff_pin");
      setIsStaff(!!pin);
    };
    checkStaff();
    window.addEventListener("storage", checkStaff);
    return () => window.removeEventListener("storage", checkStaff);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSessionData(readSessionData()), 2000);
    return () => clearInterval(id);
  }, []);

  if (!isStaff || sessionData.sessionType !== "live") return null;

  const getUpsellRecommendation = () => {
    if (sessionData.visitPairings === 0)
      return "Guest has not paired a drink — suggest top shelf Rum or Cognac.";
    if (sessionData.visitPairings === 1)
      return "Guest has one pairing. Suggest a chocolate or cheese accompaniment to maximize yield.";
    return "Guest ritual complete. Monitor for post-ritual sales opportunity.";
  };

  const estimatedSpend = sessionData.visitPairings * 45 + 35;

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, fontFamily: "monospace" }}>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              background: "rgba(10,10,10,0.95)",
              border: "1px solid #C8860A",
              borderRadius: 8, padding: 16, width: 280,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              color: "#C8860A", marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8, letterSpacing: 1 }}>STAFF INTEL</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: "bold" }}>REVENUE SIGNALS</div>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>${estimatedSpend} EST.</div>
            </div>
            <div style={{ borderTop: "1px solid rgba(200,134,10,0.2)", paddingTop: 12 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>RECOMMENDED UPSELL</div>
              <div style={{ fontSize: 11, lineHeight: 1.4, color: "#fff" }}>{getUpsellRecommendation()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          background: "#C8860A", color: "#000", border: "none",
          borderRadius: 20, padding: "8px 16px", fontSize: 10,
          fontWeight: "bold", cursor: "pointer", width: "100%",
          boxShadow: "0 4px 12px rgba(200,134,10,0.3)",
        }}
      >
        {isCollapsed ? "STAFF INTEL" : "CLOSE"}
      </motion.button>
    </div>
  );
};
