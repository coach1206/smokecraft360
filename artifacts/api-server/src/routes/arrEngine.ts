/**
 * Platform ARR Engine — SaaS licensing take-rate pipeline.
 *
 * POST /api/analytics/arr-event   — payment handler broadcasts per-transaction fee
 * GET  /api/analytics/arr-summary — Developer Console polls multi-tenant ARR metrics
 */

import { Router } from "express";

const router = Router();

const PLATFORM_TAKE_RATE = 0.015; // 1.5 % software licensing fee

interface ArrEvent {
  eventId:    string;
  venueId:    string;
  totalCents: number;
  feeCents:   number;
  takeRate:   number;
  ts:         Date;
}

// Ring-buffer — keep last 10 k events in process memory
const events: ArrEvent[] = [];
const MAX_EVENTS = 10_000;

// ── POST /api/analytics/arr-event ────────────────────────────────────────────
router.post("/analytics/arr-event", (req, res) => {
  const { totalCents, venueId } = req.body as {
    totalCents?: number; venueId?: string;
  };

  if (typeof totalCents !== "number" || totalCents <= 0) {
    res.status(400).json({ ok: false, error: "totalCents must be a positive number" }); return;
  }

  const feeCents = Math.round(totalCents * PLATFORM_TAKE_RATE);
  const event: ArrEvent = {
    eventId:    `arr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    venueId:    venueId ?? "unknown",
    totalCents,
    feeCents,
    takeRate:   PLATFORM_TAKE_RATE,
    ts:         new Date(),
  };

  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);

  res.json({ ok: true, feeCents, takeRate: PLATFORM_TAKE_RATE, eventId: event.eventId });
});

// ── GET /api/analytics/arr-summary ───────────────────────────────────────────
router.get("/analytics/arr-summary", (_req, res) => {
  const totalGmvCents = events.reduce((s, e) => s + e.totalCents, 0);
  const totalFeeCents = events.reduce((s, e) => s + e.feeCents, 0);

  // Per-venue breakdown for multi-tenant view
  const byVenue: Record<string, { gmvCents: number; feeCents: number; txCount: number }> = {};
  for (const e of events) {
    const v = byVenue[e.venueId] ?? (byVenue[e.venueId] = { gmvCents: 0, feeCents: 0, txCount: 0 });
    v.gmvCents  += e.totalCents;
    v.feeCents  += e.feeCents;
    v.txCount   += 1;
  }

  // Annualised based on oldest event age; minimum 1 day window
  const oldestTs   = events[0]?.ts ?? new Date();
  const windowDays = Math.max(1, (Date.now() - oldestTs.getTime()) / 86_400_000);
  const annualizedFeeCents = Math.round((totalFeeCents / windowDays) * 365);

  res.json({
    takeRate:              PLATFORM_TAKE_RATE,
    totalTransactions:     events.length,
    totalGmvCents,
    totalPlatformFeeCents: totalFeeCents,
    annualizedArrCents:    annualizedFeeCents,
    windowDays:            Math.round(windowDays * 10) / 10,
    byVenue,
    lastEventAt:           events.at(-1)?.ts ?? null,
    fetchedAt:             new Date().toISOString(),
  });
});

export default router;
