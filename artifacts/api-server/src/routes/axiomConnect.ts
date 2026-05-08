/**
 * axiomConnect — Phase 2: Revenue Bridge routes.
 *
 * GET  /api/connect/status                    — adapter live/simulated status
 * POST /api/connect/guest-arrival             — full intelligence pull for guest arrival
 * GET  /api/connect/flight/:flightNumber      — flight telemetry only
 * GET  /api/connect/esim/:countryCode         — Airalo eSIM offers
 * GET  /api/connect/insurance/:destination    — Allianz quote
 * POST /api/connect/commerce                  — atomic commerce bundle (eSIM + insurance)
 */

import { Router } from "express";
import { z }      from "zod";
import { AxiomConnectGateway } from "../services/axiomConnect/AxiomConnectGateway";
import { AviationstackAdapter } from "../services/axiomConnect/AviationstackAdapter";
import { AiraloAdapter }        from "../services/axiomConnect/AiraloAdapter";
import { AllianzAdapter }       from "../services/axiomConnect/AllianzAdapter";

const router = Router();

// ── GET /api/connect/status ───────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  res.json(AxiomConnectGateway.getStatus());
});

// ── POST /api/connect/guest-arrival ──────────────────────────────────────────

const arrivalSchema = z.object({
  flightNumber: z.string().min(2).max(10).optional(),
  iataCode:     z.string().length(3).optional(),
  countryCode:  z.string().length(2).optional(),
  venueId:      z.string().uuid().optional(),
  guestId:      z.string().optional(),
});

router.post("/guest-arrival", async (req, res) => {
  const parsed = arrivalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const payload = await AxiomConnectGateway.processGuestArrival(parsed.data);
  res.json(payload);
});

// ── GET /api/connect/flight/:flightNumber ─────────────────────────────────────

router.get("/flight/:flightNumber", async (req, res) => {
  const status = await AviationstackAdapter.getFlightStatus(req.params["flightNumber"]!).catch(() => null);
  if (!status) { res.status(404).json({ error: "Flight not found" }); return; }
  res.json(status);
});

// ── GET /api/connect/esim/:countryCode ───────────────────────────────────────

router.get("/esim/:countryCode", async (req, res) => {
  const offers = await AiraloAdapter.getOffers(req.params["countryCode"]!).catch(() => []);
  res.json({ offers, count: offers.length });
});

// ── GET /api/connect/insurance/:destination ───────────────────────────────────

router.get("/insurance/:destination", async (req, res) => {
  const days  = parseInt(req.query["days"] as string ?? "7", 10);
  const quote = await AllianzAdapter.getQuote({ destination: req.params["destination"]!, durationDays: days }).catch(() => null);
  if (!quote) { res.status(503).json({ error: "Quote unavailable" }); return; }
  res.json(quote);
});

// ── POST /api/connect/commerce ────────────────────────────────────────────────

router.post("/commerce", async (req, res) => {
  const { countryCode, destination } = req.body ?? {};
  if (!countryCode) { res.status(400).json({ error: "countryCode required" }); return; }
  const bundle = await AxiomConnectGateway.getCommerceBundle(countryCode, destination);
  res.json(bundle);
});

export default router;
