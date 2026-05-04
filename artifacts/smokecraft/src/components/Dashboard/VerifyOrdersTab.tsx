/**
 * VerifyOrdersTab — Staff order verification panel.
 *
 * Shows all pending/unverified orders and lets staff:
 *  - Verify with one click (staff confirmation method)
 *  - View the QR code for an order
 *  - See which orders have already been verified + XP awarded
 *
 * Only visible to staff / manager / venue_owner / super_admin.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  QrCode, CheckCircle2, Clock, RefreshCw, ShieldCheck,
  Cigarette, Wine, UtensilsCrossed, Zap,
} from "lucide-react";
import {
  fetchOrders, verifyOrder, getOrderQrUrl,
  type Order,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import RippleButton from "@/components/RippleButton";

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.5)";

function StatusBadge({ verified, status }: { verified: boolean; status: string }) {
  if (verified) return (
    <span className="text-[7px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ background: "rgba(52,200,120,0.09)", border: "1px solid rgba(52,200,120,0.25)", color: "rgba(52,200,120,0.8)" }}>
      <CheckCircle2 size={8} />Verified
    </span>
  );
  return (
    <span className="text-[7px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", color: GOLD_DIM }}>
      <Clock size={8} />{status}
    </span>
  );
}

function QrModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const url = getOrderQrUrl(orderId);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(5,3,1,0.9)", backdropFilter: "blur(16px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div
        className="p-8 rounded-2xl flex flex-col items-center gap-4"
        style={{ background: "rgba(24,16,6,0.98)", border: "1px solid rgba(212,175,55,0.25)" }}
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}>
        <p className="font-serif text-lg" style={{ color: "rgba(225,205,165,0.9)", fontWeight: 300 }}>
          Order QR Code
        </p>
        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(180,155,100,0.45)" }}>
          Scan to verify this experience
        </p>
        <div className="w-52 h-52 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.15)" }}>
          <img src={url} alt="Order QR" className="w-full h-full object-contain" />
        </div>
        <p className="text-[8px] font-mono" style={{ color: "rgba(180,155,100,0.35)" }}>
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <button onClick={onClose}
          className="text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-lg"
          style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)", color: GOLD_DIM }}>
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

function OrderCard({ order, onVerified }: {
  order: Order;
  onVerified: (orderId: string, xp: number) => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [qrOpen,    setQrOpen]    = useState(false);

  const handleVerify = async () => {
    if (order.verified || verifying) return;
    setVerifying(true);
    try {
      const result = await verifyOrder(order.id, "staff");
      onVerified(order.id, result.xpResult?.xpAwarded ?? 0);
    } catch {
      /* no-op */
    } finally {
      setVerifying(false);
    }
  };

  const timeAgo = (() => {
    const ms = Date.now() - new Date(order.createdAt).getTime();
    const m  = Math.floor(ms / 60_000);
    const h  = Math.floor(m / 60);
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Just now";
  })();

  return (
    <>
      <AnimatePresence>{qrOpen && <QrModal orderId={order.id} onClose={() => setQrOpen(false)} />}</AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl flex items-center justify-between gap-4"
        style={{
          background: order.verified
            ? "rgba(52,200,120,0.03)"
            : "rgba(255,255,255,0.025)",
          border: order.verified
            ? "1px solid rgba(52,200,120,0.12)"
            : "1px solid rgba(255,255,255,0.07)",
          opacity: order.verified ? 0.7 : 1,
        }}>

        {/* Order details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge verified={order.verified} status={order.status} />
            <span className="text-[8px] font-mono" style={{ color: "rgba(180,155,100,0.3)" }}>
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-[8px]" style={{ color: "rgba(180,155,100,0.3)" }}>{timeAgo}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {order.cigarName && (
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "rgba(210,190,155,0.75)" }}>
                <Cigarette size={9} style={{ color: GOLD_DIM }} />{order.cigarName}
              </span>
            )}
            {order.drinkName && (
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "rgba(210,190,155,0.75)" }}>
                <Wine size={9} style={{ color: "rgba(130,150,212,0.6)" }} />{order.drinkName}
              </span>
            )}
            {order.foodName && (
              <span className="flex items-center gap-1 text-[10px]"
                style={{ color: "rgba(210,190,155,0.75)" }}>
                <UtensilsCrossed size={9} style={{ color: "rgba(160,200,120,0.55)" }} />{order.foodName}
              </span>
            )}
          </div>

          {order.verified && order.verificationMethod && (
            <p className="text-[8px] mt-1" style={{ color: "rgba(52,200,120,0.5)" }}>
              Verified via {order.verificationMethod}
              {order.verifiedAt ? ` · ${new Date(order.verifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        {!order.verified && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] uppercase tracking-[0.12em]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(180,155,100,0.5)" }}
              whileHover={{ borderColor: "rgba(212,175,55,0.3)", color: GOLD_DIM }}
              whileTap={{ scale: 0.96 }}>
              <QrCode size={10} />QR
            </motion.button>

            <RippleButton
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] uppercase tracking-[0.15em]"
              rippleColor="rgba(52,200,120,0.2)"
              style={{
                background:   "linear-gradient(135deg, rgba(52,200,120,0.12), rgba(52,200,120,0.07))",
                border:       "1px solid rgba(52,200,120,0.3)",
                color:        "rgba(52,200,120,0.85)",
                opacity:      verifying ? 0.6 : 1,
                cursor:       verifying ? "wait" : "pointer",
              }}>
              <ShieldCheck size={10} />
              {verifying ? "Verifying…" : "Verify"}
            </RippleButton>
          </div>
        )}

        {order.verified && (
          <div className="flex-shrink-0 text-center">
            <CheckCircle2 size={18} style={{ color: "rgba(52,200,120,0.6)" }} />
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function VerifyOrdersTab() {
  const { user }         = useAuth();
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toasts,   setToasts]   = useState<{ id: string; xp: number }[]>([]);
  const [filter,   setFilter]   = useState<"all" | "pending" | "verified">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleVerified = (orderId: string, xp: number) => {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, verified: true, status: "completed" } : o),
    );
    if (xp > 0) {
      const toastId = crypto.randomUUID();
      setToasts((t) => [...t, { id: toastId, xp }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toastId)), 4000);
    }
  };

  const displayed = orders.filter((o) => {
    if (filter === "pending")  return !o.verified;
    if (filter === "verified") return o.verified;
    return true;
  });

  const pendingCount  = orders.filter((o) => !o.verified).length;
  const verifiedCount = orders.filter((o) =>  o.verified).length;

  if (!user) return null;

  return (
    <div className="space-y-6 relative">

      {/* XP toast notifications */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl"
              style={{
                background: "rgba(24,16,6,0.98)",
                border: "1px solid rgba(212,175,55,0.35)",
                boxShadow: "0 0 24px rgba(212,175,55,0.12)",
              }}>
              <Zap size={13} style={{ color: GOLD }} />
              <div>
                <p className="text-xs font-serif" style={{ color: "rgba(230,210,175,0.9)", fontWeight: 300 }}>
                  Experience Verified
                </p>
                <p className="text-[9px]" style={{ color: GOLD_DIM }}>+{t.xp} XP awarded</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Order Verification
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
            Verify guest experiences · award XP · scan QR codes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[9px] px-2.5 py-1 rounded-full"
              style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", color: GOLD_DIM }}>
              {pendingCount} pending
            </span>
          )}
          <motion.button onClick={load}
            className="p-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.5)" }}
            whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.95 }}>
            <RefreshCw size={12} />
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Orders",  value: orders.length     },
          { label: "Pending",       value: pendingCount,  warn: true  },
          { label: "Verified",      value: verifiedCount, gold: true  },
        ].map(({ label, value, warn, gold }) => (
          <div key={label} className="p-4 rounded-xl text-center"
            style={{
              background: gold ? "rgba(212,175,55,0.04)" : warn ? "rgba(212,175,55,0.03)" : "rgba(255,255,255,0.025)",
              border:     gold ? "1px solid rgba(212,175,55,0.18)" : "1px solid rgba(255,255,255,0.06)",
            }}>
            <p className="text-2xl font-serif" style={{ color: gold ? GOLD : "rgba(210,190,155,0.8)", fontWeight: 300 }}>{value}</p>
            <p className="text-[8px] uppercase tracking-[0.18em] mt-1" style={{ color: "rgba(180,155,100,0.38)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-0.5 rounded-lg w-fit"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {(["pending", "verified", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-md text-[9px] uppercase tracking-[0.15em] transition-all duration-200"
            style={filter === f
              ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.85)" }
              : { color: "rgba(180,155,100,0.45)" }
            }>{f}</button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-12 text-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ShieldCheck size={24} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
          <p className="text-xs" style={{ color: "rgba(180,155,100,0.35)" }}>
            {filter === "pending" ? "No pending orders to verify" : "No orders found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayed.map((order) => (
              <OrderCard key={order.id} order={order} onVerified={handleVerified} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl p-4" style={{ background: "rgba(212,175,55,0.02)", border: "1px dashed rgba(212,175,55,0.1)" }}>
        <p className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.3)" }}>
          XP is only awarded on verified orders · Cigar +10 · Drink +8 · Food +4 · Full combo +20 bonus · New product +5 bonus
        </p>
      </div>
    </div>
  );
}
