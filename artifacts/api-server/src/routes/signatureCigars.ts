/**
 * Signature Cigar routes
 *
 * POST   /api/signature-cigars          — submit a new design (Maestro del Fuego only)
 * GET    /api/signature-cigars          — list my own requests (any auth)
 * GET    /api/signature-cigars/all      — list all requests for admin review
 * GET    /api/signature-cigars/:id      — get one request
 * PATCH  /api/signature-cigars/:id      — update my own draft
 * PATCH  /api/signature-cigars/:id/admin — admin update (status, manufacturer, notes)
 * DELETE /api/signature-cigars/:id      — delete my own draft
 *
 * Access control:
 *  - Create: requires Maestro del Fuego level (index 4, ≥60 orders AND ≥700 XP)
 *  - Admin routes: super_admin or manager only
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, sql }                        from "drizzle-orm";
import Stripe                                   from "stripe";
import {
  db,
  signatureRequestsTable,
  userProgressionTable,
  manufacturersTable,
  usersTable,
  SIGNATURE_STATUSES,
  type SignatureStatus,
  type ProductionStage,
  PRODUCTION_STAGES,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { requireActiveLicense }                 from "../middleware/license";
import { z }                                    from "zod";

// ── Pricing for custom design fees (cents) ────────────────────────────────────
//
//   band-only            $99        (within brief's $50–$200 range)
//   band + box           $249       (within brief's $100–$500 range)
//   band + box + limited $499       (premium tier)
//
// Charged via Stripe Checkout when the user finalises a "submitted" request.
const DESIGN_FEES = {
  band:           9_900,
  bandWithBox:   24_900,
  premiumLimited: 49_900,
} as const;

function computeDesignFee(hasBox: boolean, isLimitedEdition: boolean): number {
  if (isLimitedEdition && hasBox) return DESIGN_FEES.premiumLimited;
  if (hasBox)                     return DESIGN_FEES.bandWithBox;
  return DESIGN_FEES.band;
}

function getStripeOrFail(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") return null;
  return new Stripe(key);
}

function getAppUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:80";
}

const router: IRouter = Router();

// ── Brand name validation ──────────────────────────────────────────────────────

const BLOCKED_WORDS = [
  "fuck", "shit", "ass", "bitch", "damn", "crap", "bastard", "nazi", "hate",
];

function validateBrandName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2)  return "Brand name must be at least 2 characters";
  if (trimmed.length > 28) return "Brand name must be at most 28 characters";
  const lower = trimmed.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) return "Brand name contains prohibited content";
  }
  return null;
}

// ── Maestro check ──────────────────────────────────────────────────────────────

const MAESTRO_MIN_ORDERS = 60;
const MAESTRO_MIN_XP     = 700;

async function checkMaestro(userId: string): Promise<boolean> {
  const [row] = await db
    .select({
      xp:                  userProgressionTable.xp,
      totalVerifiedOrders: userProgressionTable.totalVerifiedOrders,
    })
    .from(userProgressionTable)
    .where(eq(userProgressionTable.userId, userId))
    .limit(1);

  if (!row) return false;
  return row.xp >= MAESTRO_MIN_XP && row.totalVerifiedOrders >= MAESTRO_MIN_ORDERS;
}

// ── Inline Zod schemas ─────────────────────────────────────────────────────────

const bandDesignSchema = z.object({
  template:     z.enum(["classic-gold", "modern-minimal", "vintage-cuban", "luxury-black"]),
  primaryColor: z.string().min(1),
  accentColor:  z.string().min(1),
  fontStyle:    z.enum(["serif", "sans", "italic"]),
  emblem:       z.string().min(1),
  brandName:    z.string().min(2).max(28),
});

const cigarSpecSchema = z.object({
  strength:         z.number().int().min(1).max(5),
  flavorDirection:  z.array(z.enum(["sweet", "bold", "spicy", "creamy", "earthy", "floral"])).min(1),
  wrapperType:      z.enum(["claro", "natural", "colorado", "colorado-maduro", "maduro"]),
  preferredPairing: z.string().max(80).optional(),
});

const boxDesignSchema = z.object({
  boxColor:           z.string().min(1).max(40),
  woodTone:           z.enum(["mahogany", "walnut", "cedar", "ebony", "maple"]).optional(),
  logoUrl:            z.string().url().nullable().optional(),
  logoPlacement:      z.enum(["top-center", "top-left", "side-panel"]),
  labelText:          z.string().max(18),
  limitedEditionName: z.string().max(40),
  finishStyle:        z.enum(["matte", "gloss", "embossed"]),
});

// ── POST /api/signature-cigars ────────────────────────────────────────────────

const submitSchema = z.object({
  brandName:   z.string().min(2).max(28),
  bandDesign:  bandDesignSchema,
  cigarSpec:   cigarSpecSchema,
  boxDesign:   boxDesignSchema.nullable().optional(),
  description: z.string().max(300).optional(),
  status:      z.enum(["draft", "submitted"]).optional().default("draft"),
});

router.post(
  "/",
  requireAuth,
  requireActiveLicense,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const isMaestro = await checkMaestro(userId);
    if (!isMaestro) {
      res.status(403).json({
        error: "Signature cigar creation requires Maestro del Fuego status (60+ verified orders · 700+ XP)",
      });
      return;
    }

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid submission", details: parsed.error.issues });
      return;
    }

    const { brandName, bandDesign, cigarSpec, boxDesign, description, status } = parsed.data;

    // Brand name validation
    const nameError = validateBrandName(brandName);
    if (nameError) { res.status(400).json({ error: nameError }); return; }

    // Duplicate brand name check (across all users)
    const [dup] = await db
      .select({ id: signatureRequestsTable.id })
      .from(signatureRequestsTable)
      .where(sql`lower(${signatureRequestsTable.brandName}) = lower(${brandName})`)
      .limit(1);

    if (dup) {
      res.status(409).json({ error: "That brand name is already taken. Please choose another." });
      return;
    }

    const [request] = await db
      .insert(signatureRequestsTable)
      .values({
        userId,
        brandName:  brandName.trim(),
        bandDesign: JSON.stringify(bandDesign),
        cigarSpec:  JSON.stringify(cigarSpec),
        boxDesign:  boxDesign ? JSON.stringify(boxDesign) : null,
        description,
        status:     status as SignatureStatus,
      })
      .returning();

    req.log.info({ requestId: request!.id, userId, brandName, status }, "Signature cigar created");
    res.status(201).json(request);
  },
);

// ── GET /api/signature-cigars/all ─────────────────────────────────────────────

router.get(
  "/all",
  requireAuth,
  requireRole("super_admin", "manager"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select({
        request:      signatureRequestsTable,
        userName:     usersTable.name,
        manufacturer: manufacturersTable,
      })
      .from(signatureRequestsTable)
      .leftJoin(usersTable, eq(signatureRequestsTable.userId, usersTable.id))
      .leftJoin(manufacturersTable, eq(signatureRequestsTable.manufacturerId, manufacturersTable.id))
      .orderBy(desc(signatureRequestsTable.createdAt))
      .limit(200);

    res.json(rows.map((r) => ({
      ...r.request,
      bandDesign: JSON.parse(r.request.bandDesign),
      cigarSpec:  JSON.parse(r.request.cigarSpec),
      userName:   r.userName ?? "Unknown",
      manufacturer: r.manufacturer ?? null,
    })));
  },
);

// ── GET /api/signature-cigars ─────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const rows = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.userId, userId))
      .orderBy(desc(signatureRequestsTable.createdAt))
      .limit(20);

    res.json(rows.map((r) => ({
      ...r,
      bandDesign: JSON.parse(r.bandDesign),
      cigarSpec:  JSON.parse(r.cigarSpec),
    })));
  },
);

// ── GET /api/signature-cigars/:id ─────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    const userId = req.user!.id;
    const role   = req.user!.role;

    const [row] = await db
      .select({
        request:      signatureRequestsTable,
        manufacturer: manufacturersTable,
      })
      .from(signatureRequestsTable)
      .leftJoin(manufacturersTable, eq(signatureRequestsTable.manufacturerId, manufacturersTable.id))
      .where(eq(signatureRequestsTable.id, id))
      .limit(1);

    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    const adminRoles = ["super_admin", "manager"];
    if (row.request.userId !== userId && !adminRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    res.json({
      ...row.request,
      bandDesign:   JSON.parse(row.request.bandDesign),
      cigarSpec:    JSON.parse(row.request.cigarSpec),
      manufacturer: row.manufacturer ?? null,
    });
  },
);

// ── PATCH /api/signature-cigars/:id ───────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.id, id))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (existing.status !== "draft") {
      res.status(400).json({ error: "Only draft requests can be edited" }); return;
    }

    const parsed = submitSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues }); return;
    }

    const { brandName, bandDesign, cigarSpec, boxDesign, description, status } = parsed.data;

    if (brandName) {
      const nameError = validateBrandName(brandName);
      if (nameError) { res.status(400).json({ error: nameError }); return; }

      const [dup] = await db
        .select({ id: signatureRequestsTable.id })
        .from(signatureRequestsTable)
        .where(sql`lower(${signatureRequestsTable.brandName}) = lower(${brandName}) AND ${signatureRequestsTable.id} != ${id}`)
        .limit(1);

      if (dup) {
        res.status(409).json({ error: "That brand name is already taken." }); return;
      }
    }

    const [updated] = await db
      .update(signatureRequestsTable)
      .set({
        ...(brandName  ? { brandName: brandName.trim() }        : {}),
        ...(bandDesign ? { bandDesign: JSON.stringify(bandDesign) } : {}),
        ...(cigarSpec  ? { cigarSpec: JSON.stringify(cigarSpec) }   : {}),
        ...(boxDesign !== undefined
          ? { boxDesign: boxDesign === null ? null : JSON.stringify(boxDesign) }
          : {}),
        ...(description !== undefined ? { description }          : {}),
        ...(status ? { status: status as SignatureStatus }      : {}),
        updatedAt: new Date(),
      })
      .where(eq(signatureRequestsTable.id, id))
      .returning();

    res.json({
      ...updated!,
      bandDesign: JSON.parse(updated!.bandDesign),
      cigarSpec:  JSON.parse(updated!.cigarSpec),
    });
  },
);

// ── PATCH /api/signature-cigars/:id/admin ─────────────────────────────────────

const adminUpdateSchema = z.object({
  status:          z.enum(SIGNATURE_STATUSES as unknown as [string, ...string[]]).optional(),
  manufacturerId:  z.string().uuid().nullable().optional(),
  adminNotes:      z.string().max(500).nullable().optional(),
  rejectedReason:  z.string().max(300).nullable().optional(),
  productionStage: z.enum(PRODUCTION_STAGES as unknown as [string, ...string[]]).nullable().optional(),
});

router.patch(
  "/:id/admin",
  requireAuth,
  requireRole("super_admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");

    const [existing] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.id, id))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const parsed = adminUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues }); return;
    }

    const { status, manufacturerId, adminNotes, rejectedReason, productionStage } = parsed.data;

    const [updated] = await db
      .update(signatureRequestsTable)
      .set({
        ...(status           !== undefined ? { status: status as SignatureStatus }               : {}),
        ...(manufacturerId   !== undefined ? { manufacturerId }                                  : {}),
        ...(adminNotes       !== undefined ? { adminNotes }                                      : {}),
        ...(rejectedReason   !== undefined ? { rejectedReason }                                  : {}),
        ...(productionStage  !== undefined ? { productionStage: productionStage as ProductionStage } : {}),
        updatedAt: new Date(),
      })
      .where(eq(signatureRequestsTable.id, id))
      .returning();

    req.log.info({ id, status, updatedBy: req.user!.id }, "Signature request updated by admin");
    res.json({
      ...updated!,
      bandDesign: JSON.parse(updated!.bandDesign),
      cigarSpec:  JSON.parse(updated!.cigarSpec),
    });
  },
);

// ── POST /api/signature-cigars/:id/purchase ───────────────────────────────────
//
// Creates a Stripe Checkout Session for the design fee. On payment success,
// the webhook handler advances the request from "draft" → "submitted" so the
// admin queue picks it up. Idempotent: re-purchasing a request that's already
// past draft is rejected up front.

router.post(
  "/:id/purchase",
  requireAuth,
  requireActiveLicense,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.id, id))
      .limit(1);

    if (!existing)                       { res.status(404).json({ error: "Not found" });                          return; }
    if (existing.userId !== userId)      { res.status(403).json({ error: "Forbidden" });                          return; }
    if (existing.status !== "draft")     { res.status(409).json({ error: "Only draft requests can be purchased" }); return; }

    const hasBox       = !!existing.boxDesign;
    const boxParsed    = hasBox ? (() => { try { return JSON.parse(existing.boxDesign!); } catch { return null; } })() : null;
    const isLimited    = !!boxParsed?.limitedEditionName && String(boxParsed.limitedEditionName).trim().length > 0;
    const amountCents  = computeDesignFee(hasBox, isLimited);

    const stripe = getStripeOrFail();
    if (!stripe) {
      res.status(503).json({ error: "Payment processing is not available" });
      return;
    }

    const base = getAppUrl();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode:     "payment",
        currency: "usd",
        line_items: [{
          price_data: {
            currency:     "usd",
            product_data: {
              name:        `Custom Signature Design — ${existing.brandName}`,
              description: hasBox
                ? "Includes custom band + box design"
                : "Custom band design",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        metadata: {
          purpose:            "signature_design",
          signatureRequestId: existing.id,
          userId,
        },
        success_url: `${base}/signature-cigars?status=success&id=${existing.id}`,
        cancel_url:  `${base}/signature-cigars?status=cancelled&id=${existing.id}`,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        const status = (err.statusCode ?? 502) >= 500 ? 502 : (err.statusCode ?? 502);
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }

    req.log.info({ requestId: id, sessionId: session.id, amountCents }, "Signature design checkout created");
    res.status(201).json({ checkoutUrl: session.url, amountCents });
  },
);

/**
 * Mark a signature request as paid+submitted after Stripe checkout success.
 * Called from the stripeWebhook handler. Idempotent.
 */
export async function markSignatureRequestSubmitted(requestId: string): Promise<void> {
  const [existing] = await db
    .select({ status: signatureRequestsTable.status })
    .from(signatureRequestsTable)
    .where(eq(signatureRequestsTable.id, requestId))
    .limit(1);
  if (!existing || existing.status !== "draft") return;

  await db.update(signatureRequestsTable)
    .set({ status: "submitted", updatedAt: new Date() })
    .where(eq(signatureRequestsTable.id, requestId));
}

// ── DELETE /api/signature-cigars/:id ─────────────────────────────────────────

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    const userId = req.user!.id;

    const [existing] = await db
      .select()
      .from(signatureRequestsTable)
      .where(eq(signatureRequestsTable.id, id))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (existing.status !== "draft") {
      res.status(400).json({ error: "Only draft requests can be deleted" }); return;
    }

    await db.delete(signatureRequestsTable).where(eq(signatureRequestsTable.id, id));
    res.status(204).end();
  },
);

export default router;
