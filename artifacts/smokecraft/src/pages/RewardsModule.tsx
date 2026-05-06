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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#080604", color: "#F5E7C8" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid rgba(255,210,120,0.10)",
        background: "linear-gradient(180deg, #12100E 0%, #0E0B08ee 100%)",
        backdropFilter: "blur(16px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(255,210,120,0.06), 0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#211D19", border: "1px solid rgba(255,210,120,0.18)", color: "#B39B77", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#34D399", display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} /> Loyalty & Rewards
          </div>
          <div style={{ fontSize: 13, color: "#B39B77" }}>Loyalty engine · points · redemptions</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <LoyaltyRewardsTab />
      </div>
    </div>
  );
}
