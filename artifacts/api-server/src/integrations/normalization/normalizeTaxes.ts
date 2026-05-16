/**
 * normalizeTaxes — canonicalizes tax data from any POS provider.
 *
 * Handles:
 *   - Flat rate taxes (pct of sale)
 *   - Tiered taxes (jurisdiction-specific)
 *   - Inclusion taxes (tax-inclusive pricing)
 *   - Compound taxes (tax on tax)
 *   - Tax snapshots (immutable at time of transaction)
 *
 * Critical for financial integrity and accounting export.
 */

import { z } from "zod/v4";

export const UniversalTaxSchema = z.object({
  id:             z.string(),
  posTaxId:       z.string(),
  provider:       z.string(),
  venueId:        z.string(),
  name:           z.string(),
  jurisdiction:   z.string().default("venue"),
  taxType:        z.enum(["flat_rate","tiered","inclusive","compound"]).default("flat_rate"),
  rate:           z.number().min(0).max(1),         // 0.08 = 8%
  ratePct:        z.number().min(0).max(100),       // 8.0 = 8%
  isInclusive:    z.boolean().default(false),       // already included in price
  isCompound:     z.boolean().default(false),       // applied on top of other taxes
  appliesToCrafts:z.array(z.string()).default([]),  // [] = all
  isActive:       z.boolean().default(true),
  effectiveFrom:  z.string().optional(),
  effectiveTo:    z.string().optional(),
  meta:           z.record(z.string(), z.unknown()).default({}),
  syncedAt:       z.string().datetime(),
});
export type UniversalTax = z.infer<typeof UniversalTaxSchema>;

export interface TaxSnapshot {
  taxes:          UniversalTax[];
  snapshotAt:     string;
  totalRatePct:   number;
  inclusiveRatePct:number;
}

export interface TaxCalculation {
  subtotalCents:  number;
  taxCents:       number;
  totalCents:     number;
  breakdown:      TaxLineItem[];
}

export interface TaxLineItem {
  taxId:       string;
  name:        string;
  ratePct:     number;
  amountCents: number;
  inclusive:   boolean;
}

type RawProvider = Record<string, unknown>;

function parseRate(raw: unknown): number {
  const n = Number(raw);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n; // normalize 8.0 → 0.08
}

export function normalizeTax(
  raw:      RawProvider,
  provider: string,
  venueId:  string,
): UniversalTax {
  const now  = new Date().toISOString();
  const id   = String(raw["id"] ?? raw["tax_id"] ?? raw["tax_rate_id"] ?? "");
  const name = String(raw["name"] ?? raw["tax_name"] ?? raw["label"] ?? "Tax");
  const rate = parseRate(raw["percentage"] ?? raw["rate"] ?? raw["tax_rate"] ?? raw["amount"] ?? 0);

  return UniversalTaxSchema.parse({
    id,
    posTaxId:    id,
    provider,
    venueId,
    name,
    jurisdiction:String(raw["jurisdiction"] ?? raw["region"] ?? "venue"),
    taxType:     raw["type"] === "INCLUSIVE" ? "inclusive" :
                 raw["compound"] ? "compound" : "flat_rate",
    rate,
    ratePct:     Math.round(rate * 10000) / 100, // 0.0825 → 8.25
    isInclusive: Boolean(raw["inclusion_type"] === "ADDITIVE" ? false : raw["is_inclusive"] ?? raw["inclusive"] ?? false),
    isCompound:  Boolean(raw["compound"] ?? raw["is_compound"] ?? false),
    isActive:    Boolean(raw["enabled"] ?? raw["is_active"] ?? raw["active"] ?? true),
    meta:        { provider, originalId: id },
    syncedAt:    now,
  });
}

export function calculateTaxes(
  subtotalCents: number,
  taxes:         UniversalTax[],
): TaxCalculation {
  const activeTaxes = taxes.filter(t => t.isActive);
  const breakdown: TaxLineItem[] = [];
  let   taxCents = 0;

  // Step 1: inclusive taxes (extract from price)
  const inclusiveTaxes = activeTaxes.filter(t => t.isInclusive);
  for (const tax of inclusiveTaxes) {
    // inclusive: tax = price * rate / (1 + rate)
    const amount = Math.round(subtotalCents * tax.rate / (1 + tax.rate));
    breakdown.push({ taxId: tax.id, name: tax.name, ratePct: tax.ratePct, amountCents: amount, inclusive: true });
  }

  // Step 2: flat-rate additive taxes
  const flatTaxes = activeTaxes.filter(t => !t.isInclusive && !t.isCompound);
  for (const tax of flatTaxes) {
    const amount = Math.round(subtotalCents * tax.rate);
    breakdown.push({ taxId: tax.id, name: tax.name, ratePct: tax.ratePct, amountCents: amount, inclusive: false });
    taxCents += amount;
  }

  // Step 3: compound taxes (applied on base + flat taxes)
  const compoundTaxes = activeTaxes.filter(t => t.isCompound);
  for (const tax of compoundTaxes) {
    const base   = subtotalCents + taxCents;
    const amount = Math.round(base * tax.rate);
    breakdown.push({ taxId: tax.id, name: tax.name, ratePct: tax.ratePct, amountCents: amount, inclusive: false });
    taxCents += amount;
  }

  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents, breakdown };
}

export function snapshotTaxes(taxes: UniversalTax[]): TaxSnapshot {
  const active = taxes.filter(t => t.isActive);
  const totalRate   = active.filter(t => !t.isInclusive).reduce((s, t) => s + t.ratePct, 0);
  const inclusiveRate = active.filter(t => t.isInclusive).reduce((s, t) => s + t.ratePct, 0);
  return {
    taxes:            active,
    snapshotAt:       new Date().toISOString(),
    totalRatePct:     Math.round(totalRate * 100) / 100,
    inclusiveRatePct: Math.round(inclusiveRate * 100) / 100,
  };
}
