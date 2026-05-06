/**
 * OrdersModule — Orders & POS management page.
 * Route: /orders
 */
import { useLocation }        from "wouter";
import { motion }             from "framer-motion";
import { ArrowLeft, ExternalLink, ShoppingCart } from "lucide-react";
import { VerifyOrdersTab }    from "@/components/Dashboard/VerifyOrdersTab";

export default function OrdersModule() {
  const [, navigate] = useLocation();

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#080604" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, padding: "14px 24px",
        borderBottom: "1px solid rgba(255,210,120,0.10)",
        background: "linear-gradient(180deg, #12100E 0%, #0E0B08ee 100%)",
        backdropFilter: "blur(16px)", flexShrink: 0,
        boxShadow: "0 1px 0 rgba(255,210,120,0.06), 0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "#211D19", border: "1px solid rgba(255,210,120,0.18)", color: "#B39B77", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#C9A84C", display: "flex", alignItems: "center", gap: 8 }}>
              <ShoppingCart size={18} /> Orders
            </div>
            <div style={{ fontSize: 13, color: "#B39B77" }}>Live order management · staff tracked</div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/pos")}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 12,
            background: "rgba(201,168,76,0.10)", border: "1px solid rgba(201,168,76,0.30)",
            color: "#C9A84C", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <ExternalLink size={13} /> Open Commerce Station
        </motion.button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <VerifyOrdersTab />
      </div>
    </div>
  );
}
