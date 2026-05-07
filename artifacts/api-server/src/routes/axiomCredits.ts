/**
 * /api/credits — Axiom Credits (Tokenized Prestige currency)
 *
 * GET  /balance/:guestId         — current balance + tier info
 * POST /earn/:guestId            — award credits (session/mastery/referral)
 * POST /spend/:guestId           — spend credits on WifeX / DayOne360
 * GET  /ledger/:guestId          — full transaction history
 * GET  /ghost-tickers/:guestId   — mastery-gated exclusive ticker content
 *
 * Conversion rate: 1 mastery point → 10 Axiom Credits (on tier upgrade)
 * Ghost Tickers: Craftsman (41+) and Sommelier (71+) see exclusive content
 */

import { Router, type Request, type Response } from "express";
import { eq, desc, sum }                        from "drizzle-orm";
import { db, axiomCreditLedgerTable, guestProfilesTable, secretPassagesTable } from "@workspace/db";
import { z }                                    from "zod";

const router = Router();

// ── Balance helper ────────────────────────────────────────────────────────────

async function getBalance(guestId: string): Promise<number> {
  const result = await db
    .select({ total: sum(axiomCreditLedgerTable.amount) })
    .from(axiomCreditLedgerTable)
    .where(eq(axiomCreditLedgerTable.guestId, guestId));
  return parseInt(String(result[0]?.total ?? "0"), 10);
}

// ── Ghost Ticker content by tier ──────────────────────────────────────────────

const GHOST_TICKERS = {
  craftsman: [
    { id: "gt_c1", brandName: "CRAFTSMAN ACCESS", promoText: "Macallan 18yr private allocation — 2 bottles reserved for Craftsman tier this week", pointBonus: 50 },
    { id: "gt_c2", brandName: "CRAFTSMAN ACCESS", promoText: "Davidoff Anniversary #2 sampler — 3-pack exclusive. Tap to claim your allocation", pointBonus: 40 },
    { id: "gt_c3", brandName: "DayOne360 CORP",   promoText: "Craftsman Corporate Retreat Package — Dominican private villa from $3,200. Exclusive booking window closes Sunday", pointBonus: 60 },
  ],
  sommelier: [
    { id: "gt_s1", brandName: "SOMMELIER VAULT",  promoText: "Padron 1964 Anniversary Millennium reserve lot — 12 units allocated to Sommelier members. Silent access", pointBonus: 120 },
    { id: "gt_s2", brandName: "WIFEX CONCIERGE",  promoText: "Legal incorporation + residency advisory: 3 Caribbean jurisdictions. Sommelier exclusive — 2 slots remaining", pointBonus: 100 },
    { id: "gt_s3", brandName: "SOMMELIER VAULT",  promoText: "Macallan 25yr Sherry Oak private cask share — current bid $4,200. Sommelier pre-access open now", pointBonus: 150 },
    { id: "gt_s4", brandName: "DayOne360 CORP",   promoText: "Dominican Economic Zone relocation advisory: tax-free residency structuring. Sommelier-only briefing Thursday", pointBonus: 130 },
  ],
  grand_master: [
    { id: "gt_gm1", brandName: "GRAND MASTER",    promoText: "Axiom Golden Box — proprietary blend reserved exclusively for Grand Master holders. Your name is on one", pointBonus: 500 },
    { id: "gt_gm2", brandName: "WIFEX SOVEREIGN",  promoText: "Offshore trust structuring + DayOne360 sovereign residency bundle — Grand Master access only", pointBonus: 300 },
  ],
};

// ── GET /balance/:guestId ─────────────────────────────────────────────────────

router.get("/balance/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  const [profile] = await db
    .select({ masteryTier: guestProfilesTable.masteryTier, totalMastery: guestProfilesTable.totalMastery, firstName: guestProfilesTable.firstName })
    .from(guestProfilesTable)
    .where(eq(guestProfilesTable.id, guestId));

  if (!profile) { res.status(404).json({ error: "Guest not found" }); return; }

  const balance = await getBalance(guestId);
  res.json({
    guestId,
    balance,
    masteryTier:  profile.masteryTier,
    totalMastery: profile.totalMastery,
    ghostTickerAccess: ["craftsman","sommelier","grand_master"].includes(profile.masteryTier),
  });
});

// ── POST /earn/:guestId ───────────────────────────────────────────────────────

const EarnSchema = z.object({
  creditType: z.enum(["earned_mastery","earned_session","bonus_referral","admin_grant"]),
  amount:     z.number().int().positive(),
  note:       z.string().optional(),
  refId:      z.string().optional(),
  venueId:    z.string().uuid().optional(),
});

router.post("/earn/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  const parsed = EarnSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const balance = await getBalance(guestId);
  const newBalance = balance + parsed.data.amount;

  await db.insert(axiomCreditLedgerTable).values({
    guestId,
    creditType:   parsed.data.creditType,
    amount:       parsed.data.amount,
    balanceAfter: newBalance,
    note:         parsed.data.note ?? null,
    refId:        parsed.data.refId ?? null,
    venueId:      parsed.data.venueId ?? null,
  });

  res.json({ ok: true, balance: newBalance, awarded: parsed.data.amount });
});

// ── POST /spend/:guestId ──────────────────────────────────────────────────────

// ── Pillar URL map ────────────────────────────────────────────────────────────

const PILLAR_BASE_URLS: Record<string, string> = {
  spent_wifex:          "https://wifex.com/exclusive",
  spent_dayone360:      "https://dayone360.com/exclusive",
  spent_dayone360_corp: "https://corp.dayone360.com/exclusive",
};

const SpendSchema = z.object({
  creditType: z.enum(["spent_wifex","spent_dayone360"]),
  amount:     z.number().int().positive(),
  note:       z.string().optional(),
  refId:      z.string().optional(),
  venueId:    z.string().uuid().optional(),
});

router.post("/spend/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  const parsed = SpendSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const balance = await getBalance(guestId);
  if (balance < parsed.data.amount) {
    res.status(402).json({ error: "Insufficient Axiom Credits", balance, required: parsed.data.amount });
    return;
  }

  const newBalance = balance - parsed.data.amount;

  // Debit the ledger
  await db.insert(axiomCreditLedgerTable).values({
    guestId,
    creditType:   parsed.data.creditType,
    amount:       -parsed.data.amount,
    balanceAfter: newBalance,
    note:         parsed.data.note ?? null,
    refId:        parsed.data.refId ?? null,
    venueId:      parsed.data.venueId ?? null,
  });

  // Generate a Secret Passage — one-time token, 24-hour TTL
  const baseUrl  = PILLAR_BASE_URLS[parsed.data.creditType] ?? "https://wifex.com/exclusive";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [passage] = await db
    .insert(secretPassagesTable)
    .values({
      guestId,
      targetPillar:  parsed.data.creditType,
      creditAmount:  parsed.data.amount,
      redirectUrl:   baseUrl,
      expiresAt,
      venueId:       parsed.data.venueId ?? null,
    })
    .returning({ token: secretPassagesTable.token });

  const secretUrl = `${baseUrl}?token=${passage!.token}&aff_id=${parsed.data.venueId ?? ""}`;

  res.json({ ok: true, balance: newBalance, spent: parsed.data.amount, secretPassage: { token: passage!.token, url: secretUrl, expiresAt } });
});

// ── GET /passage/:token — verify & redeem a Secret Passage ───────────────────

router.get("/passage/:token", async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };
  const [row] = await db
    .select()
    .from(secretPassagesTable)
    .where(eq(secretPassagesTable.token, token));

  if (!row)           { res.status(404).json({ valid: false, reason: "Token not found" }); return; }
  if (row.used)       { res.status(410).json({ valid: false, reason: "Token already used" }); return; }
  if (row.expiresAt < new Date()) { res.status(410).json({ valid: false, reason: "Token expired" }); return; }

  // Mark used
  await db
    .update(secretPassagesTable)
    .set({ used: true, usedAt: new Date() })
    .where(eq(secretPassagesTable.token, token));

  res.json({ valid: true, guestId: row.guestId, targetPillar: row.targetPillar, redirectUrl: row.redirectUrl });
});

// ── GET /ledger/:guestId ──────────────────────────────────────────────────────

router.get("/ledger/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  const rows = await db
    .select()
    .from(axiomCreditLedgerTable)
    .where(eq(axiomCreditLedgerTable.guestId, guestId))
    .orderBy(desc(axiomCreditLedgerTable.createdAt))
    .limit(50);

  const balance = rows.length > 0 ? rows[0]!.balanceAfter : 0;
  res.json({ guestId, balance, ledger: rows });
});

// ── GET /ghost-tickers/:guestId ───────────────────────────────────────────────

router.get("/ghost-tickers/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  const [profile] = await db
    .select({ masteryTier: guestProfilesTable.masteryTier })
    .from(guestProfilesTable)
    .where(eq(guestProfilesTable.id, guestId));

  if (!profile) { res.status(404).json({ error: "Guest not found" }); return; }

  const tier = profile.masteryTier;
  const items: typeof GHOST_TICKERS.craftsman = [];

  if (tier === "craftsman" || tier === "sommelier" || tier === "grand_master") {
    items.push(...GHOST_TICKERS.craftsman);
  }
  if (tier === "sommelier" || tier === "grand_master") {
    items.push(...GHOST_TICKERS.sommelier);
  }
  if (tier === "grand_master") {
    items.push(...GHOST_TICKERS.grand_master);
  }

  res.json({ guestId, masteryTier: tier, ghostTickers: items, hasAccess: items.length > 0 });
});

export default router;
