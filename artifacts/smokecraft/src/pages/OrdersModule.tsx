/**
 * OrdersModule — Orders & POS management page.
 * Route: /orders
 */
import { useLocation }        from "wouter";
import { motion }             from "framer-motion";
import { ArrowLeft, ExternalLink, ShoppingCart } from "lucide-react";
import { useVenueContext }    from "@/contexts/VenueContext";
import BackgroundLayer        from "@/components/Layout/BackgroundLayer";
import { VerifyOrdersTab }    from "@/components/Dashboard/VerifyOrdersTab";

const ACCENT = "#9A7820";

export default function OrdersModule() {
  const [, navigate] = useLocation();
  const { getBackground } = useVenueContext();

  return (
    <BackgroundLayer
      image={getBackground("orders")}
      style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "12px 20px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(245,242,235,0.96)", backdropFilter: "blur(12px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(26,20,16,0.5)", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} /> Orders
            </div>
            <div style={{ fontSize: 11, color: "rgba(26,20,16,0.45)" }}>Live order management · staff tracked</div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/pos")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 12,
            background: `${ACCENT}12`, border: `1px solid ${ACCENT}35`,
            color: ACCENT, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <ExternalLink size={13} /> Open Commerce Station
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <VerifyOrdersTab />
      </div>
    </BackgroundLayer>
  );
}
