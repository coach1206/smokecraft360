/**
 * OrdersModule — dedicated Orders & POS management page.
 * Route: /orders
 * Accent: #d4af37 (gold)
 *
 * Features:
 *  - Live order feed with status (pending / paid / cancelled)
 *  - Staff-tracked order rows (staffId, timestamp, total)
 *  - Verify orders inline
 *  - Quick-link to full POS terminal
 */
import { useLocation }        from "wouter";
import { motion }             from "framer-motion";
import { ArrowLeft, ExternalLink, ShoppingCart } from "lucide-react";
import { useVenueContext }    from "@/contexts/VenueContext";
import BackgroundLayer        from "@/components/Layout/BackgroundLayer";
import { VerifyOrdersTab }    from "@/components/Dashboard/VerifyOrdersTab";

const ACCENT = "#d4af37";

export default function OrdersModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();

  return (
    <BackgroundLayer
      image={getBackground("orders")}
      style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,8,6,0.82)", backdropFilter: "blur(10px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} /> Orders
            </div>
            <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>Live order management · staff tracked</div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/pos")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 12,
            background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`,
            color: ACCENT, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <ExternalLink size={13} /> Open POS Terminal
        </motion.button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <VerifyOrdersTab />
      </div>
    </BackgroundLayer>
  );
}
