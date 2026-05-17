import { useEffect, useRef } from "react";
import { usePosContext } from "@/contexts/PosContext";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

export default function PosAuditBridge() {
  const pos = usePosContext();
  const cc = useCommandCenter();
  const prevOrdersRef = useRef(pos.orders);
  const prevUserRef = useRef(pos.currentUser);
  const ccRef = useRef(cc);
  ccRef.current = cc;
  const prevRewardBlockedRef = useRef(pos.rewardBlocked);

  useEffect(() => {
    const prevOrders = prevOrdersRef.current;
    const currOrders = pos.orders;
    const audit = ccRef.current;

    for (const order of currOrders) {
      const prev = prevOrders.find(o => o.id === order.id);

      if (!prev) {
        audit.addAuditEntry("order.created", `Order ${order.id} created — $${order.total.toFixed(2)} (${order.items.length} items)`, pos.currentUser?.name);
        if (!order.rewardApplied) {
          const rawTotal = order.items.reduce((s, c) => s + c.product.price * c.quantity, 0);
          if (rawTotal > 0 && rawTotal < 50) {
            audit.addAuditEntry("reward.blocked", `Reward not applied to ${order.id} — total $${rawTotal.toFixed(2)} below $50 threshold`, pos.currentUser?.name);
          }
        }
        continue;
      }

      if (prev.status !== order.status) {
        switch (order.status) {
          case "processing":
            audit.addAuditEntry("checkout.started", `Checkout started for ${order.id}`, pos.currentUser?.name);
            break;
          case "paid":
            audit.addAuditEntry("payment.confirmed", `Payment confirmed for ${order.id} — $${order.total.toFixed(2)}`, pos.currentUser?.name);
            if (order.rewardApplied) {
              audit.addAuditEntry("reward.applied", `Reward discount applied to ${order.id}`, pos.currentUser?.name);
            }
            break;
          case "failed":
            audit.addAuditEntry("payment.failed", `Payment failed for ${order.id}: ${order.failureReason ?? "Unknown error"}`, pos.currentUser?.name);
            break;
          case "refunded":
            audit.addAuditEntry("order.refunded", `Refund issued for ${order.id} — $${order.total.toFixed(2)}`, pos.currentUser?.name);
            break;
        }
      }
    }

    prevOrdersRef.current = currOrders;
  }, [pos.orders, pos.currentUser]);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    const currUser = pos.currentUser;
    const audit = ccRef.current;

    if (prevUser && !currUser) {
      audit.addAuditEntry("auth.logout", `${prevUser.name} logged out`, prevUser.name);
    }

    if (!prevUser && currUser) {
      audit.addAuditEntry("auth.login", `${currUser.name} logged in (${currUser.role})`, currUser.name);
      // ── EAT Mode: cinematic management handoff for elevated roles ──────
      const EAT_TRIGGER_ROLES = ["admin", "super_admin", "venue_owner", "sovereign", "manager"];
      if (EAT_TRIGGER_ROLES.includes(currUser.role)) {
        window.dispatchEvent(new CustomEvent("eat:enter"));
      }
    }

    prevUserRef.current = currUser;
  }, [pos.currentUser]);

  useEffect(() => {
    const prev = prevRewardBlockedRef.current;
    const curr = pos.rewardBlocked;
    if (curr && curr !== prev) {
      ccRef.current.addAuditEntry("reward.cooldown", curr, pos.currentUser?.name);
    }
    prevRewardBlockedRef.current = curr;
  }, [pos.rewardBlocked, pos.currentUser]);

  return null;
}
