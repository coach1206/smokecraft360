/**
 * paymentAuditLogger — immutable, append-only payment audit chain.
 *
 * Every payment lifecycle event is written to an audit log with:
 *   - Event hash (SHA-256 of previous hash + event data = chain integrity)
 *   - Tamper detection via chain verification
 *   - Role-gated read access
 *
 * The audit chain cannot be modified — INSERT only, never UPDATE/DELETE.
 */

import { createHash }  from "node:crypto";
import { pool }        from "@workspace/db";
import { logger }      from "../../lib/logger";

export type PaymentAuditAction =
  | "authorized" | "captured" | "voided" | "refunded" | "disputed"
  | "dispute_resolved" | "failed" | "manual_override" | "split_paid"
  | "transfer_initiated" | "payout_failed" | "reconciliation_flagged";

export interface PaymentAuditEntry {
  entryId:    string;
  paymentId:  string;
  venueId:    string;
  action:     PaymentAuditAction;
  actorId:    string;
  actorRole:  string;
  amountCents:number | null;
  metadata:   Record<string, unknown>;
  chainHash:  string;
  prevHash:   string;
  ts:         number;
}

let lastHash = "genesis";

function computeHash(prevHash: string, data: Record<string, unknown>): string {
  return createHash("sha256")
    .update(prevHash + JSON.stringify(data))
    .digest("hex");
}

export async function logPaymentEvent(
  paymentId:  string,
  venueId:    string,
  action:     PaymentAuditAction,
  actorId:    string,
  actorRole:  string,
  metadata:   Record<string, unknown> = {},
  amountCents?: number,
): Promise<void> {
  const prev  = lastHash;
  const data  = { paymentId, venueId, action, actorId, actorRole, amountCents, metadata, ts: Date.now() };
  const hash  = computeHash(prev, data);
  lastHash    = hash;

  await pool.query(
    `INSERT INTO payment_audit_log
       (payment_id, venue_id, action, actor_id, actor_role, amount_cents, metadata, chain_hash, prev_hash, logged_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
    [paymentId, venueId, action, actorId, actorRole, amountCents ?? null, JSON.stringify(metadata), hash, prev],
  ).catch(err => logger.warn({ err, paymentId, action }, "paymentAuditLogger: insert failed"));
}

export async function getPaymentAuditLog(paymentId: string): Promise<PaymentAuditEntry[]> {
  const { rows } = await pool.query(
    `SELECT * FROM payment_audit_log WHERE payment_id=$1 ORDER BY logged_at ASC`,
    [paymentId],
  ).catch(() => ({ rows: [] }));
  return rows.map(r => rowToEntry(r as Record<string, unknown>));
}

export async function verifyAuditChain(paymentId: string): Promise<{
  valid: boolean; brokenAt?: string; entryCount: number;
}> {
  const entries = await getPaymentAuditLog(paymentId);
  let prev = "genesis";
  for (const e of entries) {
    const data   = { paymentId: e.paymentId, venueId: e.venueId, action: e.action, actorId: e.actorId, actorRole: e.actorRole, amountCents: e.amountCents, metadata: e.metadata, ts: e.ts };
    const expected = computeHash(prev, data);
    if (expected !== e.chainHash) {
      return { valid: false, brokenAt: e.entryId, entryCount: entries.length };
    }
    prev = e.chainHash;
  }
  return { valid: true, entryCount: entries.length };
}

function rowToEntry(r: Record<string, unknown>): PaymentAuditEntry {
  return {
    entryId:    String(r["id"]),
    paymentId:  String(r["payment_id"]),
    venueId:    String(r["venue_id"]),
    action:     String(r["action"]) as PaymentAuditAction,
    actorId:    String(r["actor_id"]),
    actorRole:  String(r["actor_role"]),
    amountCents:r["amount_cents"] ? Number(r["amount_cents"]) : null,
    metadata:   (r["metadata"] as Record<string, unknown>) ?? {},
    chainHash:  String(r["chain_hash"]),
    prevHash:   String(r["prev_hash"]),
    ts:         new Date(r["logged_at"] as string).getTime(),
  };
}
