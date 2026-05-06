import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Truck, Package, Send, Star, Check } from "lucide-react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useVenueContext } from "@/contexts/VenueContext";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const C = {
  header:    "linear-gradient(180deg, #12100E 0%, #0E0B08ee 100%)",
  border:    "rgba(255,210,120,0.12)",
  text:      "#F5E7C8",
  muted:     "#B39B77",
  dim:       "rgba(179,155,119,0.40)",
  card:      "rgba(255,255,255,0.045)",
  back:      "#211D19",
  backBorder:"rgba(255,210,120,0.18)",
  accent:    "#2DD4BF",
  bg:        "#080604",
};

export default function VendorsModule() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const cc = useCommandCenter();
  const { getBackground } = useVenueContext();
  const [restocked, setRestocked] = useState<Set<string>>(new Set());

  function handleRestock(vendorId: string, productId: string) {
    const prod = pos.products.find(p => p.id === productId);
    if (!prod) return;
    cc.requestRestock(vendorId, prod.name);
    setRestocked(prev => new Set(prev).add(`${vendorId}-${productId}`));
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg, color: C.text }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: `1px solid rgba(255,210,120,0.10)`, background: C.header, backdropFilter: "blur(16px)", flexShrink: 0, boxShadow: "0 1px 0 rgba(255,210,120,0.06), 0 4px 20px rgba(0,0,0,0.3)" }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, background: C.back, border: `1px solid ${C.backBorder}`, color: C.muted, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <ArrowLeft size={20} />
        </motion.button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>Vendors & Restock</div>
          <div style={{ fontSize: 13, color: C.muted }}>{cc.vendors.length} suppliers connected</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {cc.vendors.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", borderRadius: 16, background: C.card, border: `1px solid ${C.border}` }}>
            <Truck size={32} color={C.dim} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>No vendors connected</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>Vendor accounts will appear here once created</div>
          </div>
        ) : cc.vendors.map((vendor, vi) => {
          const vendorProducts = pos.products.filter(p => vendor.productIds.includes(p.id));
          return (
            <motion.div key={vendor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: vi * 0.06 }}
              style={{
                padding: "20px", borderRadius: 16,
                background: C.card,
                border: `1px solid rgba(6,182,212,0.18)`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
              }}>
              {/* Vendor header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Truck size={22} color={C.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{vendor.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{vendor.contact}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>{vendor.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>
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
                      background: isLow ? "rgba(245,158,11,0.05)" : "rgba(0,0,0,0.02)",
                      border: `1px solid ${isLow ? "rgba(245,158,11,0.18)" : "rgba(0,0,0,0.06)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <Package size={14} color={C.dim} />
                        <span style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.name}</span>
                        <span style={{ fontSize: 11, color: isLow ? "#f59e0b" : C.muted, flexShrink: 0 }}>{prod.stock} in stock</span>
                      </div>
                      <AnimatePresence mode="wait">
                        {sent ? (
                          <motion.div key="sent" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: 11, fontWeight: 600 }}>
                            <Check size={12} /> Sent
                          </motion.div>
                        ) : (
                          <motion.button key="restock" whileTap={{ scale: 0.9 }}
                            onClick={() => handleRestock(vendor.id, prod.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                              background: isLow ? "rgba(245,158,11,0.08)" : "rgba(6,182,212,0.08)",
                              border: `1px solid ${isLow ? "rgba(245,158,11,0.25)" : "rgba(6,182,212,0.2)"}`,
                              color: isLow ? "#f59e0b" : C.accent,
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
    </div>
  );
}
