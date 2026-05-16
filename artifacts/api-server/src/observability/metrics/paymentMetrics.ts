/**
 * paymentMetrics — payment lifecycle observability instruments.
 */

import { observe, increment, setGauge } from "../../platform/observability/metricsCollector";

export function recordPaymentTransition(
  from: string, to: string, durationMs: number, venueId: string,
): void {
  observe("payments.fsm", "transition_ms", durationMs, { from, to });
  increment("payments.fsm", "transitions", 1, { from, to });
  if (to === "failed" || to === "disputed") {
    increment("payments.fsm", "failures", 1, { reason: to, venueId });
  }
}

export function recordRefund(amountCents: number, type: "full" | "partial", venueId: string): void {
  observe("payments.refunds", "amount_cents", amountCents, { type, venueId });
  increment("payments.refunds", "count", 1, { type });
}

export function recordDispute(amountCents: number, venueId: string): void {
  observe("payments.disputes", "amount_cents", amountCents, { venueId });
  increment("payments.disputes", "count", 1, { venueId });
}

export function recordPaymentCapture(amountCents: number, provider: string, durationMs: number): void {
  observe("payments.capture", "duration_ms", durationMs, { provider });
  observe("payments.capture", "amount_cents", amountCents, { provider });
  increment("payments.capture", "count", 1, { provider });
}

export function setPaymentStuckGauge(venueId: string, count: number): void {
  setGauge("payments", "stuck_authorized", count, { venueId });
}
