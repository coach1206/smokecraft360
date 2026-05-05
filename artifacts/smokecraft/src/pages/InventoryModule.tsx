/**
 * InventoryModule — dedicated Inventory management page.
 * Route: /inventory
 * Accent: #5b8def (blue)
 *
 * Features:
 *  - Predictive intelligence (top sellers, low stock, demand)
 *  - Restock suggestions with distributor linkage
 *  - Profit tracking per SKU
 *  - Stock alerts + out-of-stock list
 */
import { useLocation }            from "wouter";
import { motion }                 from "framer-motion";
import { ArrowLeft, Package }     from "lucide-react";
import { useVenueContext }        from "@/contexts/VenueContext";
import BackgroundLayer            from "@/components/Layout/BackgroundLayer";
import { InventoryIntelligenceTab } from "@/components/Dashboard/InventoryIntelligenceTab";

const ACCENT = "#5b8def";

export default function InventoryModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();

  return (
    <BackgroundLayer
      image={getBackground("inventory")}
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
            <Package size={18} /> Inventory
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Stock control · 3-layer intelligence · restock automation</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <InventoryIntelligenceTab />
      </div>
    </BackgroundLayer>
  );
}
