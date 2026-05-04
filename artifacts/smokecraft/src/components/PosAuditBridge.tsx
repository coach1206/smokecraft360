import { useEffect, useRef } from "react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

export default function PosAuditBridge() {
  const pos = usePosContext();
  const cc = useCommandCenter();
  const prevOrdersRef = useRef(pos.orders);
  const prevCartLenRef = useRef(pos.cart.length);

  useEffect(() => {
    const prevOrders = prevOrdersRef.current;
    const currOrders = pos.orders;

    for (const order of currOrders) {
      const prev = prevOrders.find(o => o.id === order.id);

      if (!prev) {
        cc.addAuditEntry("order.created", `Order ${order.id} created — $${order.total.toFixed(2)} (${order.items.length} items)`, pos.currentUser?.name);
        continue;
      }

      if (prev.status !== order.status) {
        switch (order.status) {
          case "processing":
            cc.addAuditEntry("checkout.started", `Checkout started for ${order.id}`, pos.currentUser?.name);
            break;
          case "paid":
            cc.addAuditEntry("payment.confirmed", `Payment confirmed for ${order.id} — $${order.total.toFixed(2)}`, pos.currentUser?.name);
            if (order.rewardApplied) {
              cc.addAuditEntry("reward.applied", `Reward discount applied to ${order.id}`, pos.currentUser?.name);
            }
            break;
          case "failed":
            cc.addAuditEntry("payment.failed", `Payment failed for ${order.id}: ${order.failureReason ?? "Unknown error"}`, pos.currentUser?.name);
            break;
          case "refunded":
            cc.addAuditEntry("order.refunded", `Refund issued for ${order.id} — $${order.total.toFixed(2)}`, pos.currentUser?.name);
            break;
        }
      }
    }

    prevOrdersRef.current = currOrders;
  }, [pos.orders, pos.currentUser, cc]);

  useEffect(() => {
    if (!pos.currentUser && prevCartLenRef.current > 0) {
      cc.addAuditEntry("auth.logout", "User logged out");
    }
    prevCartLenRef.current = pos.cart.length;
  }, [pos.currentUser, pos.cart.length, cc]);

  return null;
}
