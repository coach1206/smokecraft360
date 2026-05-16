/**
 * privacyControls — data access controls and anonymization utilities.
 *
 * All guest PII access must go through these controls when privacy
 * regulation applies. Provides deterministic pseudonymization.
 */

import { createHash } from "crypto";
import { logger }     from "../lib/logger";
import { pool }       from "@workspace/db";
import { hasActiveConsent } from "./consentTracking";

export type DataCategory = "identity" | "behavioral" | "financial" | "location" | "biometric";

export interface AccessRequest {
  requesterId:   string;
  requesterRole: string;
  targetId:      string;
  category:      DataCategory;
  purpose:       string;
  venueId:       string;
}

export interface AccessDecision {
  allowed:    boolean;
  reason:     string;
  masked?:    boolean;
  auditRef:   string;
}

const ROLE_CATEGORY_ALLOW: Record<string, DataCategory[]> = {
  super_admin:  ["identity","behavioral","financial","location","biometric"],
  admin:        ["identity","behavioral","financial"],
  staff:        ["identity","behavioral"],
  patron:       ["identity"],
  guest:        [],
};

export async function checkAccess(req: AccessRequest): Promise<AccessDecision> {
  const auditRef = `prv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const allowed  = ROLE_CATEGORY_ALLOW[req.requesterRole]?.includes(req.category) ?? false;

  // Consent gate for AI profiling
  if (req.category === "behavioral" && !(await hasActiveConsent(req.targetId, "ai_profiling"))) {
    await logAccess(auditRef, req, false, "no_consent");
    return { allowed: false, reason: "no_consent:ai_profiling", auditRef };
  }

  await logAccess(auditRef, req, allowed, allowed ? "role_allowed" : "role_denied");
  return {
    allowed,
    reason: allowed ? "role_allowed" : "insufficient_role",
    masked: allowed && req.requesterRole !== "super_admin" && req.category === "identity",
    auditRef,
  };
}

async function logAccess(
  ref:     string,
  req:     AccessRequest,
  allowed: boolean,
  reason:  string,
): Promise<void> {
  await pool.query(
    `INSERT INTO security_audit_trail
       (action, actor_id, resource_type, resource_id, metadata, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NULL, NOW())`,
    [
      `privacy:${allowed ? "allow" : "deny"}:${req.category}`,
      req.requesterId,
      `privacy:${req.category}`,
      req.targetId,
      JSON.stringify({ reason, purpose: req.purpose, venueId: req.venueId }),
    ],
  ).catch(err => logger.warn({ err }, "privacyControls: audit log failed"));
}

/** Deterministic pseudonymization — same input always produces same pseudonym. */
export function pseudonymize(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 16);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local[0]}***@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/\d(?=\d{4})/g, "*");
}

export async function anonymizeGuest(guestId: string, venueId: string): Promise<void> {
  const salt = `${venueId}:anon:${Date.now()}`;
  await pool.query(
    `UPDATE guest_profiles
     SET first_name   = $1,
         last_initial = 'X',
         updated_at   = NOW()
     WHERE id::text = $2`,
    [pseudonymize(guestId, salt), guestId],
  ).catch(err => logger.warn({ err }, "privacyControls: anonymize failed"));
  logger.info({ guestId }, "privacyControls: guest anonymized");
}
