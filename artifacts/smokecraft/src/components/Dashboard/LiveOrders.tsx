/**
 * LiveOrders — real-time order management panel for the partner dashboard.
 *
 * Polls GET /api/orders every 30 seconds.
 * Groups orders by status: Pending → In Progress → Completed.
 * Staff can advance orders through the status pipeline.
 * Shows a pulsing badge when new pending orders arrive.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence }                   from "framer-motion";
import {
  ClipboardList, RefreshCw, AlertCircle,
  Hash, ShoppingBag, MapPin, CheckCircle, Loader2,
  Clock, Zap, ArrowRight,
} from "lucide-react";
import {
  fetchOrders, updateOrderStatus,
  type Order, type OrderStatus,
} from "@/services/api";
import { DEMO_MODE, DEMO_ORDERS } from "@/config/demo";

const POLL_MS = 30_000;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  table:    <Hash size={11} />,
  pickup:   <ShoppingBag size={11} />,
  delivery: <MapPin size={11} />,
};

const TYPE_LABELS: Record<string, string> = {
  table:    "Table",
  pickup:   "Pickup",
  delivery: "Delivery",
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending:     { bg: "rgba(212,139,0,0.07)",  border: "rgba(212,139,0,0.25)",  text: "rgba(212,139,0,0.8)"   },
  in_progress: { bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.25)",  text: "rgba(100,160,240,0.85)" },
  completed:   { bg: "rgba(74,222,128,0.06)",  border: "rgba(74,222,128,0.22)",  text: "rgba(74,222,128,0.75)"  },
  cancelled:   { bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",    text: "rgba(239,68,68,0.7)"    },
};

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 60_000)   return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function LiveOrders() {
  const [orders,    setOrders]    = useState<Order[]>(DEMO_MODE ? (DEMO_ORDERS as Order[]) : []);
  const [loading,   setLoading]   = useState(!DEMO_MODE);
  const [error,     setError]     = useState<string | null>(null);
  const [updating,  setUpdating]  = useState<Record<string, boolean>>({});
  const [newCount,  setNewCount]  = useState(0);
  const prevPendingCount = useRef(DEMO_MODE ? DEMO_ORDERS.filter((o) => o.status === "pending").length : 0);

  const load = useCallback(async (silent = false) => {
    // In demo mode, always serve local demo data — never hit the API
    if (DEMO_MODE) return;

    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);

      const pending = data.filter((o) => o.status === "pending").length;
      if (!silent && prevPendingCount.current !== undefined && pending > prevPendingCount.current) {
        setNewCount(pending - prevPendingCount.current);
        setTimeout(() => setNewCount(0), 5_000);
      }
      prevPendingCount.current = pending;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + polling (skipped in demo mode)
  useEffect(() => {
    if (DEMO_MODE) return;
    void load();
    const id = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleStatusUpdate = async (order: Order, newStatus: OrderStatus) => {
    setUpdating((u) => ({ ...u, [order.id]: true }));

    if (DEMO_MODE) {
      // Simulate a brief update delay, then apply locally — no API call
      await new Promise((r) => setTimeout(r, 400));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: newStatus } : o));
      setUpdating((u) => ({ ...u, [order.id]: false }));
      return;
    }

    try {
      const updated = await updateOrderStatus(order.id, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      prevPendingCount.current = orders.filter((o) => o.status === "pending" && o.id !== order.id).length;
    } catch { /* silently fail — next poll will correct */ }
    setUpdating((u) => ({ ...u, [order.id]: false }));
  };

  const pending    = orders.filter((o) => o.status === "pending");
  const inProgress = orders.filter((o) => o.status === "in_progress");
  const completed  = orders.filter((o) => o.status === "completed").slice(0, 5);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
              Live Orders
            </h2>
            {newCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.12em]"
                style={{ background: "rgba(212,139,0,0.15)", border: "1px solid rgba(212,139,0,0.4)", color: "rgba(212,139,0,0.9)" }}>
                <Zap size={8} />{newCount} new
              </motion.span>
            )}
          </div>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>
            {DEMO_MODE ? "Simulated orders — demo mode" : "Auto-refreshes every 30 s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status summary pills */}
          <div className="flex gap-1.5 items-center">
            <StatusPill count={pending.length}    label="Pending"     color={STATUS_COLORS.pending} />
            <StatusPill count={inProgress.length} label="In Progress" color={STATUS_COLORS.in_progress} />
          </div>
          <motion.button onClick={() => load()} className="p-2 rounded-lg"
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)" }}
            whileHover={{ borderColor: "rgba(212,139,0,0.3)" }} whileTap={{ scale: 0.95 }}>
            <RefreshCw size={12} style={{ color: "rgba(107,94,78,0.50)" }} className={loading ? "animate-spin" : ""} />
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
          <AlertCircle size={14} style={{ color: "rgba(239,68,68,0.7)" }} />
          <p className="text-sm" style={{ color: "rgba(239,68,68,0.75)" }}>{error}</p>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.6)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          <ClipboardList size={28} style={{ color: "rgba(212,139,0,0.2)" }} />
          <p className="text-sm italic" style={{ color: "rgba(107,94,78,0.35)" }}>No orders yet</p>
          <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(107,94,78,0.25)" }}>
            Orders appear here when customers request experiences
          </p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Pending */}
          {pending.length > 0 && (
            <OrderGroup
              title="Pending"
              colorKey="pending"
              orders={pending}
              updating={updating}
              primaryAction={{ label: "Mark In Progress", icon: <Zap size={11} />, status: "in_progress" }}
              secondaryAction={{ label: "Cancel", status: "cancelled" }}
              onAction={handleStatusUpdate}
            />
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <OrderGroup
              title="In Progress"
              colorKey="in_progress"
              orders={inProgress}
              updating={updating}
              primaryAction={{ label: "Mark Completed", icon: <CheckCircle size={11} />, status: "completed" }}
              secondaryAction={{ label: "Cancel", status: "cancelled" }}
              onAction={handleStatusUpdate}
            />
          )}

          {/* Recently Completed */}
          {completed.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(107,94,78,0.35)" }}>
                Recently Completed
              </p>
              <div className="space-y-2">
                {completed.map((order) => (
                  <CompactOrderRow key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({
  count, label, color,
}: {
  count: number;
  label: string;
  color: { bg: string; border: string; text: string };
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.12em]"
      style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>
      <span className="font-medium">{count}</span> {label}
    </div>
  );
}

function OrderGroup({
  title, colorKey, orders, updating, primaryAction, secondaryAction, onAction,
}: {
  title:           string;
  colorKey:        string;
  orders:          Order[];
  updating:        Record<string, boolean>;
  primaryAction:   { label: string; icon?: React.ReactNode; status: OrderStatus };
  secondaryAction: { label: string; status: OrderStatus };
  onAction:        (order: Order, status: OrderStatus) => void;
}) {
  const color = STATUS_COLORS[colorKey] ?? STATUS_COLORS.pending;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.18em]"
          style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color.text }} />
          {title} ({orders.length})
        </div>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color.border}, transparent)` }} />
      </div>
      <AnimatePresence>
        <div className="space-y-2">
          {orders.map((order) => (
            <motion.div key={order.id} layout
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}>
              <OrderCard
                order={order}
                isUpdating={updating[order.id] ?? false}
                primaryAction={primaryAction}
                secondaryAction={secondaryAction}
                onAction={onAction}
                accentColor={color}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

function OrderCard({
  order, isUpdating, primaryAction, secondaryAction, onAction, accentColor,
}: {
  order:           Order;
  isUpdating:      boolean;
  primaryAction:   { label: string; icon?: React.ReactNode; status: OrderStatus };
  secondaryAction: { label: string; status: OrderStatus };
  onAction:        (order: Order, status: OrderStatus) => void;
  accentColor:     { bg: string; border: string; text: string };
}) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const items   = [order.cigarName, order.drinkName, order.foodName].filter(Boolean);

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl"
      style={{ background: accentColor.bg, border: `1px solid ${accentColor.border}` }}>

      {/* Type icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)" }}>
        <span style={{ color: accentColor.text }}>{TYPE_ICONS[order.orderType] ?? <ShoppingBag size={11} />}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color: "rgba(220,200,165,0.85)" }}>
            {TYPE_LABELS[order.orderType] ?? order.orderType}
          </span>
          {order.tableNumber && (
            <span className="text-[8px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(26,26,27,0.07)", color: "rgba(107,94,78,0.52)" }}>
              Table {order.tableNumber}
            </span>
          )}
          <span className="text-[8px] ml-auto" style={{ color: "rgba(107,94,78,0.35)" }}>
            #{shortId}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {items.map((name) => (
              <span key={name} className="text-[9px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(200,180,140,0.7)" }}>
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[9px] italic mb-2" style={{ color: "rgba(107,94,78,0.35)" }}>No items listed</p>
        )}

        <div className="flex items-center gap-1.5">
          <Clock size={9} style={{ color: "rgba(107,94,78,0.35)" }} />
          <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.38)" }}>{formatAge(order.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <motion.button
          onClick={() => !isUpdating && onAction(order, primaryAction.status)}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.12em] transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, hsl(43 75% 38%), hsl(45 85% 48%))",
            color:      "#F5F2ED",
          }}
          whileTap={{ scale: 0.96 }}
        >
          {isUpdating
            ? <Loader2 size={9} className="animate-spin" />
            : <>{primaryAction.icon}<ArrowRight size={9} /></>
          }
          {primaryAction.label}
        </motion.button>
        <motion.button
          onClick={() => !isUpdating && onAction(order, secondaryAction.status)}
          disabled={isUpdating}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.12em] transition-all duration-200"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.40)" }}
          whileHover={{ borderColor: "rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.6)" }}
          whileTap={{ scale: 0.96 }}
        >
          {secondaryAction.label}
        </motion.button>
      </div>
    </div>
  );
}

function CompactOrderRow({ order }: { order: Order }) {
  const items   = [order.cigarName, order.drinkName, order.foodName].filter(Boolean);
  const shortId = order.id.slice(0, 8).toUpperCase();
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.1)" }}>
      <CheckCircle size={11} style={{ color: "rgba(74,222,128,0.5)" }} className="flex-shrink-0" />
      <span className="text-xs flex-1 truncate" style={{ color: "rgba(200,180,140,0.6)" }}>
        {items.join(" + ") || "Order"}
      </span>
      <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.30)" }}>#{shortId}</span>
      <span className="text-[8px]" style={{ color: "rgba(107,94,78,0.28)" }}>{formatAge(order.createdAt)}</span>
    </div>
  );
}
