/**
 * posOrders.ts — Live POS order ingestion: two endpoints on one router.
 *
 * POST /api/pos/order
 *   Internal / kiosk-to-kiosk trigger. Accepts a pre-normalized orderType
 *   directly (used by the LiveEngineController simulator and internal tooling).
 *
 * POST /api/pos/webhook
 *   External webhook that real POS terminals call (Square, Toast, Stripe
 *   Terminal, Clover, or any custom adapter). Handles:
 *     1. HMAC-SHA256 signature verification (POS_WEBHOOK_SECRET env var).
 *        Falls back to permissive mode when the secret is not set so dev
 *        environments work without configuration.
 *     2. Product-name → order-type mapping (Cohiba → cigar, Macallan → whiskey, …).
 *     3. Multi-vendor payload normalization — Square, Toast, and Stripe all
 *        serialize line items in different shapes; normalizeOrder handles all.
 *   On success, broadcasts `pos_order` via Socket.io to every connected kiosk
 *   so the Dynamic Visual Card Engine re-ranks scenes in real-time.
 *
 * Setup (production)
 * ─────────────────
 * 1. In your POS dashboard create a webhook pointing at:
 *    https://YOUR_DOMAIN/api/pos/webhook
 * 2. Set POS_WEBHOOK_SECRET to the signing secret your POS generates.
 * 3. Select "order.created" / "checkout.completed" event types.
 * 4. Done — real orders → webhook → Socket.io → instant scene re-rank.
 */

import { Router, type Request, type Response } from "express";
import { createHmac, timingSafeEqual }          from "node:crypto";
import { z }                                     from "zod";
import { getIO }                                 from "../lib/socketServer";
import { logger }                                from "../lib/logger";

const router = Router();

// ── Product name → order type map ────────────────────────────────────────────
// Extend freely. Keys are matched case-sensitively first, then falls through
// to fuzzy keyword matching on the lowercased item name string.

const PRODUCT_TO_TYPE: Record<string, string> = {
  // Cigars
  "Cohiba":             "cigar",
  "Cohiba Robusto":     "cigar",
  "Montecristo No. 2":  "cigar",
  "Montecristo":        "cigar",
  "Padron 1964":        "cigar",
  "Padron":             "cigar",
  "Romeo y Julieta":    "cigar",
  "Arturo Fuente":      "cigar",
  "Davidoff":           "cigar",

  // Whiskey / spirits
  "Macallan 12":        "whiskey",
  "Macallan 18":        "whiskey",
  "Macallan":           "whiskey",
  "Old Fashioned":      "whiskey",
  "Whiskey Neat":       "whiskey",
  "Hennessy VSOP":      "whiskey",
  "Hennessy":           "whiskey",
  "Johnnie Walker":     "whiskey",
  "Glenfiddich":        "whiskey",
  "Bourbon Sour":       "whiskey",

  // Beer
  "IPA Draft":          "beer",
  "Guinness":           "beer",
  "Lager":              "beer",
  "Craft Lager":        "beer",
  "Dark Stout":         "beer",
  "Beer Flight":        "beer",

  // Vape / hookah
  "Hookah Mint":        "vape",
  "Hookah Double Apple":"vape",
  "Hookah Grape":       "vape",
  "Vape Mango":         "vape",
  "Vape Menthol":       "vape",
  "Premium Vape":       "vape",
};

type OrderType = "cigar" | "whiskey" | "beer" | "vape";

// ── Fuzzy keyword fallback ────────────────────────────────────────────────────

function fuzzyDetect(joined: string): OrderType | null {
  if (joined.includes("cigar") || joined.includes("cohiba") || joined.includes("fuente")) return "cigar";
  if (joined.includes("whiskey") || joined.includes("whisky") || joined.includes("bourbon")
      || joined.includes("scotch") || joined.includes("macallan") || joined.includes("hennessy")) return "whiskey";
  if (joined.includes("beer") || joined.includes("ipa") || joined.includes("lager")
      || joined.includes("stout") || joined.includes("ale") || joined.includes("draft")) return "beer";
  if (joined.includes("hookah") || joined.includes("vape") || joined.includes("shisha")) return "vape";
  return null;
}

// ── Multi-vendor payload normalizer ──────────────────────────────────────────
// Handles Square order events, Toast check events, Stripe Terminal, and a
// generic flat shape { items: [...] } for custom adapters.

interface NormalizedOrder {
  orderType: OrderType | null;
  items:     string[];
}

function normalizeOrder(body: Record<string, unknown>): NormalizedOrder {
  // Collect raw line items from wherever this POS puts them
  const rawItems: unknown[] =
    (body?.data as any)?.object?.order?.line_items ??  // Square
    (body?.order as any)?.line_items ??                // Toast
    (body?.data as any)?.order?.line_items ??          // Stripe Terminal
    (body as any)?.line_items ??                       // generic
    (body as any)?.items ??                            // custom adapter
    [];

  const names: string[] = (rawItems as any[])
    .map((i: any) =>
      i?.name ?? i?.item_name ?? i?.title ?? i?.display_name ?? i?.catalog_object_id ?? ""
    )
    .filter((n: string) => n.length > 0);

  let detectedType: OrderType | null = null;

  // Exact product name lookup first
  for (const name of names) {
    const mapped = PRODUCT_TO_TYPE[name] as OrderType | undefined;
    if (mapped) { detectedType = mapped; break; }
  }

  // Fuzzy keyword fallback
  if (!detectedType && names.length) {
    detectedType = fuzzyDetect(names.join(" ").toLowerCase());
  }

  return { orderType: detectedType, items: names };
}

// ── HMAC signature verifier ───────────────────────────────────────────────────
// Supports multiple header conventions (Square, Stripe, generic X-Pos-Signature).
// When POS_WEBHOOK_SECRET is not set we allow all traffic (dev-mode permissive).

function verifySignature(req: Request): boolean {
  const secret = process.env["POS_WEBHOOK_SECRET"];
  if (!secret) return true; // not configured — permissive (dev only)

  const sig =
    (req.headers["x-pos-signature"] as string | undefined) ??
    (req.headers["x-square-signature"] as string | undefined) ??
    (req.headers["stripe-signature"] as string | undefined);

  if (!sig) return false;

  const payload  = JSON.stringify(req.body);
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const provided = sig.startsWith("sha256=") ? sig.slice(7) : sig;

  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

// ── Zod schema for internal direct trigger ───────────────────────────────────

const ORDER_TYPES = ["cigar", "whiskey", "beer", "vape"] as const;

const DirectOrderSchema = z.object({
  orderType: z.enum(ORDER_TYPES),
  items:     z.array(z.unknown()).optional(),
  venueId:   z.string().uuid().optional(),
  tableId:   z.string().optional(),
});

// ── POST /api/pos/order — internal / simulator trigger ───────────────────────

router.post("/pos/order", (req: Request, res: Response) => {
  const parsed = DirectOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
    return;
  }

  const { orderType, items, venueId, tableId } = parsed.data;

  try {
    const io  = getIO();
    const ts  = Date.now();

    // Legacy broadcast (backwards compat)
    io.emit("pos_order", { orderType, items, venueId, tableId, ts });

    // Normalized live-event — routed to venue room when venueId is known,
    // global broadcast as fallback so clients without join_venue still receive
    const livePayload = {
      eventType:      "ORDER_PLACED" as const,
      venueId:        venueId ?? undefined,
      lineItems:      (items ?? []).map((name: string) => ({ name, productId: "", qty: 1, priceCents: 0 })),
      totalCents:     0,
      guestSessionId: null,    // not available from direct trigger
      timestamp:      new Date(ts).toISOString(),
    };
    if (venueId) {
      io.to(`venue:${venueId}`).emit("pos:ORDER_PLACED", livePayload);
    } else {
      io.emit("pos:ORDER_PLACED", livePayload);
    }

    req.log.info({ orderType, venueId }, "POS direct order broadcast");
    res.json({ success: true, broadcast: io.engine.clientsCount });
  } catch (err) {
    req.log.warn({ err }, "Socket.io not ready for POS broadcast");
    res.status(503).json({ error: "Real-time engine not ready" });
  }
});

// ── POST /api/pos/webhook — external POS terminal webhook ────────────────────

router.post("/pos/webhook", (req: Request, res: Response) => {
  // Signature check
  if (!verifySignature(req)) {
    logger.warn({ ip: req.ip }, "POS webhook: signature verification failed");
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const { orderType, items } = normalizeOrder(req.body as Record<string, unknown>);

  if (!orderType) {
    // POS sends many event types we don't care about (catalog syncs, heartbeats…)
    req.log.debug({ items }, "POS webhook: no recognisable order type — ignored");
    res.json({ ok: true, ignored: true });
    return;
  }

  try {
    const io  = getIO();
    const ts  = Date.now();
    const body = req.body as Record<string, unknown>;
    const webhookVenueId = typeof body["venueId"] === "string" ? body["venueId"] : undefined;

    // Legacy broadcast
    io.emit("pos_order", { orderType, items, ts });

    // Normalized live-event broadcast
    const livePayload = {
      eventType:      "ORDER_PLACED" as const,
      venueId:        webhookVenueId,
      lineItems:      items.map((name: string) => ({ name, productId: "", qty: 1, priceCents: 0 })),
      totalCents:     0,
      guestSessionId: null,    // not available from webhook
      timestamp:      new Date(ts).toISOString(),
    };
    if (webhookVenueId) {
      io.to(`venue:${webhookVenueId}`).emit("pos:ORDER_PLACED", livePayload);
    } else {
      io.emit("pos:ORDER_PLACED", livePayload);
    }

    req.log.info({ orderType, itemCount: items.length }, "POS webhook broadcast");
    res.json({ ok: true, orderType, broadcast: io.engine.clientsCount });
  } catch (err) {
    req.log.warn({ err }, "Socket.io not ready for POS webhook broadcast");
    res.status(503).json({ error: "Real-time engine not ready" });
  }
});

export default router;
