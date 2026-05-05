/**
 * RewardsModule — dedicated Loyalty & Rewards management page.
 * Route: /rewards
 * Accent: #34d399 (emerald)
 *
 * Features:
 *  - Create and manage reward catalogue (discount / free item / experience)
 *  - Points per purchase configuration
 *  - Pending redemptions queue (fulfil / cancel)
 *  - Level-gated rewards (Explorer → Maestro)
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
      style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,8,6,0.82)", backdropFilter: "blur(10px)", flexShrink: 0,
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} /> Rewards
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Loyalty engine · points · redemptions</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <LoyaltyRewardsTab />
      </div>
    </BackgroundLayer>
  );
}
