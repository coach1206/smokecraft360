/**
 * RewardsModule — Loyalty & Rewards management page.
 * Route: /rewards
 */
import { useLocation }          from "wouter";
import { motion }               from "framer-motion";
import { ArrowLeft, Gift }      from "lucide-react";
import { useVenueContext }      from "@/contexts/VenueContext";
import BackgroundLayer          from "@/components/Layout/BackgroundLayer";
import { LoyaltyRewardsTab }   from "@/components/Dashboard/LoyaltyRewardsTab";

const ACCENT = "#34d399";

export default function RewardsModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();

  return (
    <BackgroundLayer
      image={getBackground("rewards")}
      style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(245,242,235,0.96)", backdropFilter: "blur(12px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(26,20,16,0.5)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} /> Rewards
          </div>
          <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)" }}>Loyalty engine · points · redemptions</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <LoyaltyRewardsTab />
      </div>
    </BackgroundLayer>
  );
}
