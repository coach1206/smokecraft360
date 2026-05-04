import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Truck, Package, Send, Star, Check } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

export default function VendorsModule() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const [restocked, setRestocked] = useState<Set<string>>(new Set());

  function handleRestock(vendorId: string, productId: string) {
    const prod = pos.products.find(p => p.id === productId);
    if (!prod) return;
    cc.requestRestock(vendorId, prod.name);
    setRestocked(prev => new Set(prev).add(`${vendorId}-${productId}`));
  }

  return (
    <BackgroundLayer image="/images/cigar4.png" style={{ height: "100dvh", display: "flex", flexDirection: "column", color: "#e8e0c8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(232,224,200,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#06b6d4" }}>Vendors & Restock</div>
          <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{cc.vendors.length} suppliers connected</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {cc.vendors.map((vendor, vi) => {
          const vendorProducts = pos.products.filter(p => vendor.productIds.includes(p.id));
          return (
            <motion.div key={vendor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: vi * 0.06 }}
              style={{
                padding: "20px", borderRadius: 16,
                background: "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                border: "1px solid rgba(6,182,212,0.15)",
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Truck size={22} color="#06b6d4" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#e8e0c8" }}>{vendor.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(232,224,200,0.4)" }}>{vendor.contact}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>{vendor.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)", marginBottom: 12 }}>
                Last order: {vendor.lastOrder}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vendorProducts.map(prod => {
                  const key = `${vendor.id}-${prod.id}`;
                  const sent = restocked.has(key);
                  const isLow = prod.stock <= 5;
                  return (
                    <div key={prod.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10,
                      background: isLow ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isLow ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <Package size={14} color="rgba(232,224,200,0.3)" />
                        <span style={{ fontSize: 13, color: "#e8e0c8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span>
                        <span style={{ fontSize: 11, color: isLow ? "#f59e0b" : "rgba(232,224,200,0.3)", flexShrink: 0 }}>{prod.stock} in stock</span>
                      </div>
                      <AnimatePresence mode="wait">
                        {sent ? (
                          <motion.div key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontSize: 11, fontWeight: 600 }}>
                            <Check size={12} /> Sent
                          </motion.div>
                        ) : (
                          <motion.button key="restock" whileTap={{ scale: 0.9 }}
                            onClick={() => handleRestock(vendor.id, prod.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                              background: isLow ? "rgba(245,158,11,0.1)" : "rgba(6,182,212,0.08)",
                              border: `1px solid ${isLow ? "rgba(245,158,11,0.25)" : "rgba(6,182,212,0.2)"}`,
                              color: isLow ? "#f59e0b" : "#06b6d4",
                              cursor: "pointer", minHeight: 36,
                            }}>
                            <Send size={12} /> Restock
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </BackgroundLayer>
  );
}
