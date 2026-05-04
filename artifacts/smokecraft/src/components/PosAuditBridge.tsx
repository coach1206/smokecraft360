import { useEffect, useRef } from "react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

export default function PosAuditBridge() {
  const pos = usePosContext();
  const cc = useCommandCenter();
  const prevOrdersRef = useRef(pos.orders);
  const prevUserRef = useRef(pos.currentUser);
  const prevProductsRef = useRef(pos.products);

  useEffect(() => {
    const prevOrders = prevOrdersRef.current;
    const currOrders = pos.orders;

    for (const order of currOrders) {
      const prev = prevOrders.find(o => o.id === order.id);

      if (!prev) {
        cc.addAuditEntry("order.created", `Order ${order.id} created — $${order.total.toFixed(2)} (${order.items.length} items)`, pos.currentUser?.name);
        if (!order.rewardApplied) {
          const rawTotal = order.items.reduce((s, c) => s + c.product.price * c.quantity, 0);
          if (rawTotal > 0 && rawTotal < 50) {
            cc.addAuditEntry("reward.blocked", `Reward not applied to ${order.id} — total $${rawTotal.toFixed(2)} below $50 threshold`, pos.currentUser?.name);
          }
        }
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
    const prevUser = prevUserRef.current;
    const currUser = pos.currentUser;

    if (prevUser && !currUser) {
      cc.addAuditEntry("auth.logout", `${prevUser.name} logged out`, prevUser.name);
    }

    if (!prevUser && currUser) {
      cc.addAuditEntry("auth.login", `${currUser.name} logged in (${currUser.role})`, currUser.name);
    }

    prevUserRef.current = currUser;
  }, [pos.currentUser, cc]);

  useEffect(() => {
    const prevProducts = prevProductsRef.current;
    const currProducts = pos.products;

    for (const curr of currProducts) {
      const prev = prevProducts.find(p => p.id === curr.id);
      if (prev && prev.stock !== curr.stock) {
        const delta = curr.stock - prev.stock;
        const direction = delta > 0 ? "increased" : "decreased";
        cc.addAuditEntry(
          "inventory.adjusted",
          `${curr.name} stock ${direction} by ${Math.abs(delta)} (${prev.stock} → ${curr.stock})`,
          pos.currentUser?.name,
        );
      }
    }

    prevProductsRef.current = currProducts;
  }, [pos.products, pos.currentUser, cc]);

  return null;
}
