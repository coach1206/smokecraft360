import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, CheckCircle2, Gift, AlertTriangle, XCircle, RotateCcw, Loader2, Undo2 } from "lucide-react";
import { usePosContext, type Product, type PaymentStatus } from "@/contexts/PosContext";
import { useVenueContext } from "@/contexts/VenueContext";
import { useEngagementContext } from "@/contexts/EngagementContext";
import KioskProductImage from "@/components/KioskProductImage";
import BackgroundLayer from "@/components/Layout/BackgroundLayer";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "cigar", label: "Cigars" },
  { id: "spirit", label: "Spirits" },
  { id: "beer", label: "Beer" },
  { id: "food", label: "Food" },
] as const;

const LOW_STOCK_THRESHOLD = 5;

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "#f59e0b",
  processing: "#5b8def",
  paid: "#34d399",
  failed: "#ef4444",
  refunded: "#a78bfa",
  voided: "#6b7280",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  voided: "Voided",
};

function ProductCard({ product, onAdd, disabled }: { product: Product; onAdd: () => void; disabled?: boolean }) {
  const isLow = product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0;
  const isOut = product.stock <= 0;
  const isDisabled = isOut || disabled;

  const catColors: Record<string, string> = {
    cigar: "#D48B00", spirit: "#5b8def", beer: "#f59e0b", food: "#34d399",
  };
  const accent = catColors[product.category] ?? "#D48B00";

  return (
    <motion.button
      whileHover={isDisabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={isDisabled ? {} : { scale: 0.96 }}
      onClick={isDisabled ? undefined : onAdd}
      disabled={isDisabled}
      style={{
        display: "flex", flexDirection: "column",
        background: "rgba(26,26,27,0.05)",
        border: `1px solid ${isDisabled ? "rgba(26,26,27,0.06)" : `${accent}25`}`,
        borderRadius: 16, overflow: "hidden",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.4 : 1,
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      <KioskProductImage
        src={product.image}
        alt={product.name}
        category={product.category}
        style={{ width: "100%", aspectRatio: "1" }}
      />
      <div style={{ padding: "10px 12px", textAlign: "left", flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "#e8e0c8",
          lineHeight: 1.3, marginBottom: 4,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
        }}>{product.name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>
            ${product.price}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: isLow ? "#f59e0b" : "rgba(232,224,200,0.35)",
          }}>
            {isOut ? "Out" : `${product.stock} left`}
          </span>
        </div>
      </div>
      {isLow && !isOut && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(245,158,11,0.2)",
          border: "1px solid rgba(245,158,11,0.4)",
          borderRadius: 8, padding: "3px 8px",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <AlertTriangle size={11} color="#f59e0b" />
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>Low</span>
        </div>
      )}
    </motion.button>
  );
}

function ProcessingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,26,27,0.45)",
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(91,141,239,0.12)",
          border: "2px solid rgba(91,141,239,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Loader2 size={40} color="#5b8def" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 24, fontWeight: 700, color: "#e8e0c8",
          fontFamily: "'Playfair Display', serif", margin: 0,
        }}
      >Processing Payment</motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ fontSize: 14, color: "rgba(232,224,200,0.5)" }}
      >Verifying with payment provider...</motion.div>
    </motion.div>
  );
}

function SuccessOverlay({ order, reward, onDismiss }: {
  order: { id: string; total: number; items: { product: Product; quantity: number }[] };
  reward: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,26,27,0.45)",
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        cursor: "pointer",
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "rgba(52,211,153,0.12)",
          border: "2px solid rgba(52,211,153,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <CheckCircle2 size={48} color="#34d399" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 28, fontWeight: 700, color: "#e8e0c8",
          fontFamily: "'Playfair Display', serif", margin: 0,
        }}
      >Payment Confirmed</motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ fontSize: 15, color: "rgba(232,224,200,0.5)" }}
      >{order.id} — ${order.total.toFixed(2)}</motion.div>

      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 24px", borderRadius: 16,
              background: "linear-gradient(135deg, rgba(212,139,0,0.15), rgba(212,139,0,0.05))",
              border: "1px solid rgba(212,139,0,0.35)",
            }}
          >
            <Gift size={24} color="#D48B00" />
            <span style={{ fontSize: 15, color: "#D48B00", fontWeight: 600 }}>
              {reward}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ fontSize: 12, color: "rgba(232,224,200,0.25)", marginTop: 8 }}
      >Tap anywhere to continue</motion.div>
    </motion.div>
  );
}

function FailedOverlay({ error, onRetry, onDismiss }: {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,26,27,0.45)",
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "rgba(239,68,68,0.12)",
          border: "2px solid rgba(239,68,68,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <XCircle size={48} color="#ef4444" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 24, fontWeight: 700, color: "#e8e0c8",
          fontFamily: "'Playfair Display', serif", margin: 0,
        }}
      >Payment Failed</motion.h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          fontSize: 14, color: "rgba(239,68,68,0.7)",
          maxWidth: 360, textAlign: "center", lineHeight: 1.5,
        }}
      >{error}</motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ display: "flex", gap: 12, marginTop: 12 }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDismiss}
          style={{
            padding: "14px 28px", borderRadius: 14,
            background: "rgba(26,26,27,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(232,224,200,0.6)", fontSize: 15, fontWeight: 600,
            cursor: "pointer",
          }}
        >Dismiss</motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          style={{
            padding: "14px 28px", borderRadius: 14,
            background: "linear-gradient(135deg, #D48B00, #a98828)",
            border: "none",
            color: "#F5F2ED", fontSize: 15, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <RotateCcw size={16} />
          Retry Payment
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default function PosMode() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const { getBackground } = useVenueContext();
  const [activeCategory, setActiveCategory] = useState("all");
  const [overlayState, setOverlayState] = useState<
    | { type: "processing" }
    | { type: "success"; order: { id: string; total: number; items: { product: Product; quantity: number }[] } }
    | { type: "failed"; orderId: string; error: string }
    | null
  >(null);
  const [checkoutCooldown, setCheckoutCooldown] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const filtered = activeCategory === "all"
    ? pos.products
    : pos.products.filter(p => p.category === activeCategory);

  const cartTotal = pos.cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartCount = pos.cart.reduce((sum, c) => sum + c.quantity, 0);
  const rewardEligible = cartTotal >= 50 && !pos.rewardCooldownActive;
  const rewardClose = cartTotal >= 50;

  const isLocked = pos.processingLock || overlayState?.type === "processing";

  const engagement = useEngagementContext();

  function handleAdd(productId: string) {
    if (overlayState || checkoutCooldown || isLocked) return;
    const ok = pos.addToCart(productId);
    if (ok) {
      setAddedId(productId);
      setTimeout(() => setAddedId(null), 300);
      engagement.trackAction("select", { productId });
    }
  }

  async function handleCheckout() {
    if (isLocked || pos.cart.length === 0) return;
    engagement.trackAction("confirm");
    setOverlayState({ type: "processing" });
    const order = await pos.checkout();
    if (!order) {
      setOverlayState(null);
      return;
    }
    if (order.status === "paid") {
      setOverlayState({ type: "success", order });
      engagement.trackAction("purchase", { orderId: order.id });
    } else if (order.status === "failed") {
      setOverlayState({ type: "failed", orderId: order.id, error: order.failureReason ?? "Payment failed" });
    } else {
      setOverlayState(null);
    }
  }

  async function handleRetry(orderId: string) {
    setOverlayState({ type: "processing" });
    const order = await pos.retryCheckout(orderId);
    if (!order) {
      setOverlayState({ type: "failed", orderId, error: pos.paymentError ?? "Retry failed" });
      return;
    }
    if (order.status === "paid") {
      setOverlayState({ type: "success", order });
    } else if (order.status === "failed") {
      setOverlayState({ type: "failed", orderId: order.id, error: order.failureReason ?? "Payment failed" });
    } else {
      setOverlayState(null);
    }
  }

  function handleDismissOverlay() {
    setOverlayState(null);
    pos.dismissReward();
    pos.dismissRewardBlocked();
    pos.clearPaymentError();
    setCheckoutCooldown(true);
    setTimeout(() => setCheckoutCooldown(false), 500);
  }

  const canRefund = pos.currentUser?.role?.toLowerCase() === "owner" || pos.currentUser?.role?.toLowerCase() === "manager";

  return (
    <BackgroundLayer image={getBackground("pos")} style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      color: "#e8e0c8", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(26,26,27,0.08)",
        background: "rgba(10,8,6,0.8)", backdropFilter: "blur(8px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(26,26,27,0.06)",
              border: "1px solid rgba(26,26,27,0.10)",
              color: "rgba(232,224,200,0.5)", cursor: "pointer",
            }}
          ><ArrowLeft size={20} /></motion.button>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#D48B00" }}>POS</span>
            {pos.currentUser && (
              <span style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", marginLeft: 10 }}>
                · {pos.currentUser.name} ({pos.currentUser.role})
              </span>
            )}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 13, color: "rgba(232,224,200,0.4)",
        }}>
          <ShoppingCart size={16} />
          <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div style={{
        flex: 1, display: "flex", overflow: "hidden", minHeight: 0,
      }}>
        <div style={{
          width: 240, flexShrink: 0, borderRight: "1px solid rgba(26,26,27,0.08)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em",
            color: "rgba(212,139,0,0.5)", fontWeight: 600,
          }}>Order History</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
            {pos.orders.length === 0 ? (
              <div style={{
                padding: 20, textAlign: "center",
                fontSize: 13, color: "rgba(232,224,200,0.2)",
              }}>No orders yet</div>
            ) : (
              pos.orders.map(order => {
                const statusColor = STATUS_COLORS[order.status];
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      padding: "12px 14px", marginBottom: 8,
                      background: "rgba(26,26,27,0.05)",
                      border: `1px solid ${statusColor}25`,
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: statusColor }}>{order.id}</span>
                      <span style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>${order.total.toFixed(2)}</span>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      fontSize: 11, color: "rgba(232,224,200,0.3)",
                    }}>
                      <span>
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        {order.rewardApplied && <span style={{ color: "#D48B00", marginLeft: 6 }}>★ Reward</span>}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: statusColor,
                        background: `${statusColor}15`,
                        padding: "2px 8px", borderRadius: 6,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    {order.status === "failed" && (
                      <motion.button
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRetry(order.id)}
                        disabled={isLocked}
                        style={{
                          marginTop: 8, width: "100%", padding: "8px 0",
                          borderRadius: 8,
                          background: "rgba(212,139,0,0.12)",
                          border: "1px solid rgba(212,139,0,0.25)",
                          color: "#D48B00", fontSize: 11, fontWeight: 600,
                          cursor: isLocked ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          opacity: isLocked ? 0.4 : 1,
                        }}
                      >
                        <RotateCcw size={12} />
                        Retry Payment
                      </motion.button>
                    )}
                    {order.status === "paid" && canRefund && (
                      <motion.button
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => pos.refundOrder(order.id)}
                        style={{
                          marginTop: 8, width: "100%", padding: "8px 0",
                          borderRadius: 8,
                          background: "rgba(167,139,250,0.08)",
                          border: "1px solid rgba(167,139,250,0.2)",
                          color: "#a78bfa", fontSize: 11, fontWeight: 600,
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <Undo2 size={12} />
                        Refund
                      </motion.button>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", minWidth: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, padding: "12px 16px",
            flexShrink: 0, overflowX: "auto",
          }}>
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: "10px 20px", borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  background: activeCategory === cat.id
                    ? "linear-gradient(135deg, #D48B00, #a98828)"
                    : "rgba(26,26,27,0.06)",
                  color: activeCategory === cat.id ? "#F5F2ED" : "rgba(232,224,200,0.5)",
                  border: `1px solid ${activeCategory === cat.id ? "#D48B00" : "rgba(26,26,27,0.08)"}`,
                  cursor: "pointer", whiteSpace: "nowrap",
                  minHeight: 44,
                }}
              >{cat.label}</motion.button>
            ))}
          </div>

          <div style={{
            flex: 1, overflowY: "auto", padding: "4px 16px 16px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 12, alignContent: "start",
          }}>
            {filtered.map(product => (
              <motion.div
                key={product.id}
                animate={addedId === product.id ? { scale: [1, 0.95, 1.02, 1] } : {}}
                transition={{ duration: 0.25 }}
              >
                <ProductCard product={product} onAdd={() => handleAdd(product.id)} disabled={isLocked} />
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: "1px solid rgba(26,26,27,0.08)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em",
            color: "rgba(212,139,0,0.5)", fontWeight: 600,
          }}>Current Order</div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
            <AnimatePresence mode="popLayout">
              {pos.cart.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: 24, textAlign: "center",
                    fontSize: 13, color: "rgba(232,224,200,0.2)",
                  }}
                >Tap a product to start an order</motion.div>
              ) : (
                pos.cart.map(item => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", marginBottom: 8,
                      background: "rgba(26,26,27,0.05)",
                      border: "1px solid rgba(26,26,27,0.08)",
                      borderRadius: 12,
                      opacity: isLocked ? 0.5 : 1,
                      pointerEvents: isLocked ? "none" : "auto",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "#e8e0c8",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{item.product.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>
                        ${item.product.price} each
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => pos.updateQuantity(item.product.id, -1)}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "rgba(26,26,27,0.06)",
                          border: "1px solid rgba(26,26,27,0.10)",
                          color: "#e8e0c8", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      ><Minus size={14} /></motion.button>
                      <span style={{
                        minWidth: 24, textAlign: "center",
                        fontSize: 15, fontWeight: 700, color: "#D48B00",
                      }}>{item.quantity}</span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => pos.updateQuantity(item.product.id, 1)}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "rgba(26,26,27,0.06)",
                          border: "1px solid rgba(26,26,27,0.10)",
                          color: "#e8e0c8", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      ><Plus size={14} /></motion.button>
                    </div>
                    <div style={{
                      minWidth: 56, textAlign: "right",
                      fontSize: 14, fontWeight: 700, color: "#e8e0c8",
                    }}>${(item.product.price * item.quantity).toFixed(2)}</div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => pos.removeFromCart(item.product.id)}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        color: "rgba(239,68,68,0.6)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    ><Trash2 size={14} /></motion.button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {rewardClose && pos.cart.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  margin: "0 12px", padding: "10px 14px",
                  background: rewardEligible
                    ? "linear-gradient(135deg, rgba(212,139,0,0.1), rgba(212,139,0,0.04))"
                    : "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))",
                  border: `1px solid ${rewardEligible ? "rgba(212,139,0,0.25)" : "rgba(239,68,68,0.2)"}`,
                  borderRadius: 12, display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <Gift size={16} color={rewardEligible ? "#D48B00" : "#ef4444"} />
                <span style={{ fontSize: 12, color: rewardEligible ? "#D48B00" : "#ef4444", fontWeight: 600 }}>
                  {rewardEligible ? "Reward unlocked! 10% off at checkout" : "Reward on cooldown — no discount this order"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            padding: 16, borderTop: "1px solid rgba(26,26,27,0.08)",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 4, fontSize: 13, color: "rgba(232,224,200,0.4)",
            }}>
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            {rewardEligible && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, fontSize: 13, color: "#D48B00",
              }}>
                <span>Reward Discount (10%)</span>
                <span>-${(cartTotal * 0.1).toFixed(2)}</span>
              </div>
            )}
            {rewardClose && !rewardEligible && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, fontSize: 13, color: "#ef4444",
              }}>
                <span>Reward (cooldown)</span>
                <span>—</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 16, fontSize: 20, fontWeight: 700, color: "#e8e0c8",
            }}>
              <span>Total</span>
              <span>${rewardEligible ? (cartTotal * 0.9).toFixed(2) : cartTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                whileTap={isLocked ? {} : { scale: 0.95 }}
                onClick={() => pos.clearCart()}
                disabled={pos.cart.length === 0 || isLocked}
                style={{
                  flex: 1, minHeight: 56, borderRadius: 14,
                  background: "rgba(26,26,27,0.06)",
                  border: "1px solid rgba(26,26,27,0.10)",
                  color: (pos.cart.length === 0 || isLocked) ? "rgba(232,224,200,0.2)" : "rgba(232,224,200,0.5)",
                  fontSize: 14, fontWeight: 600,
                  cursor: (pos.cart.length === 0 || isLocked) ? "not-allowed" : "pointer",
                }}
              >Clear</motion.button>
              <motion.button
                whileHover={(pos.cart.length > 0 && !isLocked) ? { scale: 1.02 } : {}}
                whileTap={(pos.cart.length > 0 && !isLocked) ? { scale: 0.97 } : {}}
                onClick={handleCheckout}
                disabled={pos.cart.length === 0 || isLocked}
                style={{
                  flex: 2, minHeight: 56, borderRadius: 14,
                  background: (pos.cart.length > 0 && !isLocked)
                    ? "linear-gradient(135deg, #D48B00, #a98828)"
                    : "rgba(212,139,0,0.12)",
                  color: (pos.cart.length > 0 && !isLocked) ? "#F5F2ED" : "rgba(212,139,0,0.3)",
                  fontSize: 16, fontWeight: 700,
                  border: "none",
                  cursor: (pos.cart.length > 0 && !isLocked) ? "pointer" : "not-allowed",
                  letterSpacing: "0.03em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {isLocked && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                {isLocked ? "Processing..." : `Checkout ${cartTotal > 0 ? `$${rewardEligible ? (cartTotal * 0.9).toFixed(2) : cartTotal.toFixed(2)}` : ""}`}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {overlayState?.type === "processing" && <ProcessingOverlay />}
        {overlayState?.type === "success" && (
          <SuccessOverlay
            order={overlayState.order}
            reward={pos.rewardMessage}
            onDismiss={handleDismissOverlay}
          />
        )}
        {overlayState?.type === "failed" && (
          <FailedOverlay
            error={overlayState.error}
            onRetry={() => handleRetry(overlayState.orderId)}
            onDismiss={handleDismissOverlay}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </BackgroundLayer>
  );
}
