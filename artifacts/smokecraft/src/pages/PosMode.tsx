import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, CheckCircle2, Gift, AlertTriangle } from "lucide-react";
import { usePosContext, type Product } from "@/contexts/PosContext";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "cigar", label: "Cigars" },
  { id: "spirit", label: "Spirits" },
  { id: "beer", label: "Beer" },
  { id: "food", label: "Food" },
] as const;

const LOW_STOCK_THRESHOLD = 5;

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const [imgError, setImgError] = useState(false);
  const isLow = product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0;
  const isOut = product.stock <= 0;

  const catColors: Record<string, string> = {
    cigar: "#d4af37", spirit: "#5b8def", beer: "#f59e0b", food: "#34d399",
  };
  const accent = catColors[product.category] ?? "#d4af37";

  return (
    <motion.button
      whileHover={isOut ? {} : { scale: 1.03, y: -2 }}
      whileTap={isOut ? {} : { scale: 0.96 }}
      onClick={isOut ? undefined : onAdd}
      disabled={isOut}
      style={{
        display: "flex", flexDirection: "column",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${isOut ? "rgba(255,255,255,0.04)" : `${accent}25`}`,
        borderRadius: 16, overflow: "hidden",
        cursor: isOut ? "not-allowed" : "pointer",
        opacity: isOut ? 0.4 : 1,
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{
        width: "100%", aspectRatio: "1", overflow: "hidden",
        background: imgError ? `linear-gradient(135deg, ${accent}15, ${accent}08)` : "#0a0806",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {imgError ? (
          <div style={{ fontSize: 36, color: accent, opacity: 0.3 }}>
            {product.category === "cigar" ? "◆" : product.category === "spirit" ? "◇" : product.category === "beer" ? "●" : "■"}
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        )}
      </div>
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

function CheckoutOverlay({ order, reward, onDismiss }: {
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
        background: "rgba(0,0,0,0.85)",
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
      >Order Complete</motion.h2>
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
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
              border: "1px solid rgba(212,175,55,0.35)",
            }}
          >
            <Gift size={24} color="#d4af37" />
            <span style={{ fontSize: 15, color: "#d4af37", fontWeight: 600 }}>
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

export default function PosMode() {
  const [, navigate] = useLocation();
  const pos = usePosContext();
  const [activeCategory, setActiveCategory] = useState("all");
  const [completedOrder, setCompletedOrder] = useState<{
    id: string; total: number; items: { product: Product; quantity: number }[];
  } | null>(null);
  const [checkoutCooldown, setCheckoutCooldown] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const filtered = activeCategory === "all"
    ? pos.products
    : pos.products.filter(p => p.category === activeCategory);

  const cartTotal = pos.cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const cartCount = pos.cart.reduce((sum, c) => sum + c.quantity, 0);
  const rewardClose = cartTotal >= 50;

  function handleAdd(productId: string) {
    if (completedOrder || checkoutCooldown) return;
    const ok = pos.addToCart(productId);
    if (ok) {
      setAddedId(productId);
      setTimeout(() => setAddedId(null), 300);
    }
  }

  function handleCheckout() {
    const order = pos.checkout();
    if (order) setCompletedOrder(order);
  }

  function handleDismissOverlay() {
    setCompletedOrder(null);
    pos.dismissReward();
    setCheckoutCooldown(true);
    setTimeout(() => setCheckoutCooldown(false), 500);
  }

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      background: "linear-gradient(180deg, #1a1714 0%, #0f0d0a 100%)",
      color: "#e8e0c8", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
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
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(232,224,200,0.5)", cursor: "pointer",
            }}
          ><ArrowLeft size={20} /></motion.button>
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#d4af37" }}>POS</span>
            {pos.currentUser && (
              <span style={{ fontSize: 12, color: "rgba(232,224,200,0.4)", marginLeft: 10 }}>
                {pos.currentUser.name} ({pos.currentUser.role})
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
          width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em",
            color: "rgba(212,175,55,0.5)", fontWeight: 600,
          }}>Completed Orders</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
            {pos.orders.length === 0 ? (
              <div style={{
                padding: 20, textAlign: "center",
                fontSize: 13, color: "rgba(232,224,200,0.2)",
              }}>No orders yet</div>
            ) : (
              pos.orders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: "12px 14px", marginBottom: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(52,211,153,0.15)",
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{order.id}</span>
                    <span style={{ fontSize: 12, color: "rgba(232,224,200,0.4)" }}>${order.total.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(232,224,200,0.3)" }}>
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    {order.rewardApplied && <span style={{ color: "#d4af37", marginLeft: 6 }}>★ Reward</span>}
                  </div>
                </motion.div>
              ))
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
                    ? "linear-gradient(135deg, #d4af37, #a98828)"
                    : "rgba(255,255,255,0.04)",
                  color: activeCategory === cat.id ? "#0a0806" : "rgba(232,224,200,0.5)",
                  border: `1px solid ${activeCategory === cat.id ? "#d4af37" : "rgba(255,255,255,0.06)"}`,
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
                <ProductCard product={product} onAdd={() => handleAdd(product.id)} />
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px",
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em",
            color: "rgba(212,175,55,0.5)", fontWeight: 600,
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
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
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
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#e8e0c8", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      ><Minus size={14} /></motion.button>
                      <span style={{
                        minWidth: 24, textAlign: "center",
                        fontSize: 15, fontWeight: 700, color: "#d4af37",
                      }}>{item.quantity}</span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => pos.updateQuantity(item.product.id, 1)}
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
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
                  background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))",
                  border: "1px solid rgba(212,175,55,0.25)",
                  borderRadius: 12, display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <Gift size={16} color="#d4af37" />
                <span style={{ fontSize: 12, color: "#d4af37", fontWeight: 600 }}>
                  Reward unlocked! 10% off at checkout
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            padding: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 4, fontSize: 13, color: "rgba(232,224,200,0.4)",
            }}>
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            {rewardClose && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 4, fontSize: 13, color: "#d4af37",
              }}>
                <span>Reward Discount (10%)</span>
                <span>-${(cartTotal * 0.1).toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: 16, fontSize: 20, fontWeight: 700, color: "#e8e0c8",
            }}>
              <span>Total</span>
              <span>${rewardClose ? (cartTotal * 0.9).toFixed(2) : cartTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => pos.clearCart()}
                disabled={pos.cart.length === 0}
                style={{
                  flex: 1, minHeight: 56, borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: pos.cart.length === 0 ? "rgba(232,224,200,0.2)" : "rgba(232,224,200,0.5)",
                  fontSize: 14, fontWeight: 600, cursor: pos.cart.length === 0 ? "not-allowed" : "pointer",
                }}
              >Clear</motion.button>
              <motion.button
                whileHover={pos.cart.length > 0 ? { scale: 1.02 } : {}}
                whileTap={pos.cart.length > 0 ? { scale: 0.97 } : {}}
                onClick={handleCheckout}
                disabled={pos.cart.length === 0}
                style={{
                  flex: 2, minHeight: 56, borderRadius: 14,
                  background: pos.cart.length > 0
                    ? "linear-gradient(135deg, #d4af37, #a98828)"
                    : "rgba(212,175,55,0.12)",
                  color: pos.cart.length > 0 ? "#0a0806" : "rgba(212,175,55,0.3)",
                  fontSize: 16, fontWeight: 700,
                  border: "none", cursor: pos.cart.length > 0 ? "pointer" : "not-allowed",
                  letterSpacing: "0.03em",
                }}
              >
                Checkout {cartTotal > 0 ? `$${rewardClose ? (cartTotal * 0.9).toFixed(2) : cartTotal.toFixed(2)}` : ""}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {completedOrder && (
          <CheckoutOverlay
            order={completedOrder}
            reward={pos.rewardMessage}
            onDismiss={handleDismissOverlay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
