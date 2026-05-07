/**
 * RewardsModule — Loyalty & Rewards management page.
 * Route: /rewards
 */
import { useLocation }          from "wouter";
import { motion }               from "framer-motion";
import { ArrowLeft, Gift }      from "lucide-react";
import { LoyaltyRewardsTab }   from "@/components/Dashboard/LoyaltyRewardsTab";

const ACCENT = "#34d399";

export default function RewardsModule() {
  const [, navigate] = useLocation();

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#F5F2ED", color: "#1A1A1B" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid rgba(212,139,0,0.10)",
        background: "linear-gradient(180deg, #12100E 0%, #EFEBE0ee 100%)",
        backdropFilter: "blur(16px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)",
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#2A2A2A", border: "1px solid rgba(212,139,0,0.18)", color: "#6B5E4E", cursor: "pointer", boxShadow: "0 2px 8px rgba(26,26,27,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#34D399", display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} /> Loyalty & Rewards
          </div>
          <div style={{ fontSize: 13, color: "#6B5E4E" }}>Loyalty engine · points · redemptions</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <LoyaltyRewardsTab />
      </div>
    </div>
  );
}
