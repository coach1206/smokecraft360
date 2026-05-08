/**
 * LicenseRevenueManager — Module + BYOD License Engine.
 *
 * Manages a la carte module entitlements and BYOD (Bring-Your-Own-Hardware)
 * software-only licenses per venue.
 *
 * Modules available:
 *   founder-intelligence  — God-view heatmaps + what-if simulator
 *   sonic-dna             — Venue acoustic intelligence
 *   vip-atmosphere        — VIP + Investor Shadow modes
 *   environmental-ai      — Full 8-mode atmosphere engine
 *   experience-replay     — Session replay + behavioral recording
 *   premium-mentor-voices — ElevenLabs premium voice pack
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export const AVAILABLE_MODULES: Record<string, { name: string; priceCents: number; description: string }> = {
  "founder-intelligence":   { name: "Founder Intelligence",    priceCents: 24900, description: "God-view heatmaps + what-if simulator" },
  "sonic-dna":              { name: "Sonic DNA",               priceCents: 14900, description: "Venue acoustic intelligence" },
  "vip-atmosphere":         { name: "VIP Atmosphere Pack",     priceCents:  9900, description: "VIP + Investor Shadow atmospheric modes" },
  "environmental-ai":       { name: "Environmental AI",        priceCents: 19900, description: "Full 8-mode atmosphere engine" },
  "experience-replay":      { name: "Experience Replay",       priceCents: 12900, description: "Session replay + behavioral recording" },
  "premium-mentor-voices":  { name: "Premium Mentor Voices",   priceCents:  7900, description: "ElevenLabs premium voice synthesis pack" },
  "byod":                   { name: "BYOD License",            priceCents: 19900, description: "Software-only deployment on own hardware" },
};

export interface ModuleEntitlement {
  id:              string;
  venueId:         string;
  moduleId:        string;
  moduleName:      string;
  priceCents:      number;
  billingInterval: string;
  status:          "active" | "suspended" | "expired";
  activatedAt:     string;
  expiresAt?:      string;
  usageCount:      number;
  lastUsedAt?:     string;
}

export class LicenseRevenueManager {

  static async activateModule(venueId: string, moduleId: string, billingInterval = "monthly"): Promise<ModuleEntitlement> {
    const mod = AVAILABLE_MODULES[moduleId];
    if (!mod) throw new Error(`Unknown module: ${moduleId}`);

    const { rows } = await pool.query<{ id: string; activated_at: string }>(
      `INSERT INTO module_entitlements
         (venue_id, module_id, module_name, price_cents, billing_interval, status)
       VALUES ($1,$2,$3,$4,$5,'active')
       ON CONFLICT (venue_id, module_id) DO UPDATE
         SET status = 'active', billing_interval = $5
       RETURNING id, activated_at`,
      [venueId, moduleId, mod.name, mod.priceCents, billingInterval],
    );

    logger.info({ venueId, moduleId, priceCents: mod.priceCents }, "module activated");

    return {
      id: rows[0]!.id, venueId, moduleId, moduleName: mod.name,
      priceCents: mod.priceCents, billingInterval,
      status: "active", activatedAt: rows[0]!.activated_at,
      usageCount: 0,
    };
  }

  static async suspendModule(venueId: string, moduleId: string): Promise<void> {
    await pool.query(
      `UPDATE module_entitlements SET status = 'suspended' WHERE venue_id = $1 AND module_id = $2`,
      [venueId, moduleId],
    );
    logger.info({ venueId, moduleId }, "module suspended");
  }

  static async checkAccess(venueId: string, moduleId: string): Promise<boolean> {
    const { rows } = await pool.query<{ status: string }>(
      `SELECT status FROM module_entitlements WHERE venue_id = $1 AND module_id = $2`,
      [venueId, moduleId],
    ).catch(() => ({ rows: [] as { status: string }[] }));
    return rows[0]?.status === "active";
  }

  static async recordUsage(venueId: string, moduleId: string): Promise<void> {
    await pool.query(
      `UPDATE module_entitlements
       SET usage_count = usage_count + 1, last_used_at = NOW()
       WHERE venue_id = $1 AND module_id = $2 AND status = 'active'`,
      [venueId, moduleId],
    ).catch(() => {});
  }

  static async listForVenue(venueId: string): Promise<ModuleEntitlement[]> {
    const { rows } = await pool.query<{
      id: string; venue_id: string; module_id: string; module_name: string;
      price_cents: number; billing_interval: string; status: string;
      activated_at: string; expires_at: string | null; usage_count: number; last_used_at: string | null;
    }>(
      `SELECT * FROM module_entitlements WHERE venue_id = $1 ORDER BY activated_at DESC`,
      [venueId],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id: r.id, venueId: r.venue_id, moduleId: r.module_id, moduleName: r.module_name,
      priceCents: r.price_cents, billingInterval: r.billing_interval,
      status: r.status as ModuleEntitlement["status"],
      activatedAt: r.activated_at, expiresAt: r.expires_at ?? undefined,
      usageCount: r.usage_count, lastUsedAt: r.last_used_at ?? undefined,
    }));
  }

  static getModuleCatalog() {
    return Object.entries(AVAILABLE_MODULES).map(([id, m]) => ({ id, ...m }));
  }
}
