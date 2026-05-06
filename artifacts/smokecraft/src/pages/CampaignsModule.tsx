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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#F5E7C8", overflow: "hidden", background: "#080604" }}>
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
          <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} /> Campaigns
          </div>
          <div style={{ fontSize: 13, color: "#B39B77" }}>Promotions · time-based rules · conversion tracking</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <CampaignsTab />
      </div>
    </div>
  );
}
