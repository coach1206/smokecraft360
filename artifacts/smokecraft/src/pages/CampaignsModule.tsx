/**
 * CampaignsModule — dedicated Campaigns management page.
 * Route: /campaigns
 * Accent: #ec4899 (pink)
 *
 * Features:
 *  - Create, edit, activate / pause campaigns
 *  - Time-based promotions & product push rules
 *  - Impressions, conversions, performance tracking
 *  - Product assignment per campaign
 */
import { useLocation }          from "wouter";
import { motion }               from "framer-motion";
import { ArrowLeft, Megaphone } from "lucide-react";
import { CampaignsTab }        from "@/components/Dashboard/CampaignsTab";

const ACCENT = "#ec4899";

export default function CampaignsModule() {
  const [, navigate] = useLocation();

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#1A1A1B", overflow: "hidden", background: "#F5F2ED" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 24px",
        borderBottom: "1px solid rgba(212,139,0,0.10)",
        background: "rgba(16,14,12,0.97)",
        backdropFilter: "blur(16px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(212,139,0,0.06), 0 4px 20px rgba(26,26,27,0.06)",
      }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#2A2A2A", border: "1px solid rgba(212,139,0,0.18)", color: "#6B5E4E", cursor: "pointer", boxShadow: "0 2px 8px rgba(26,26,27,0.06)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} /> Campaigns
          </div>
          <div style={{ fontSize: 13, color: "#6B5E4E" }}>Promotions · time-based rules · conversion tracking</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <CampaignsTab />
      </div>
    </div>
  );
}
