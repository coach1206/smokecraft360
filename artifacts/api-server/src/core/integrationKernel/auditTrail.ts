/**
 * Phase 16 — Audit Trail Hardening
 *
 * Append-only audit log with SHA-256 hash chaining.
 * Each entry stores the hash of the previous entry, making
 * retrospective tampering detectable. Tamper-check API included.
 */

import { createHash } from "crypto";
import { pool } from "@workspace/db";
import { kernelBus } from "./eventBus";

/* ── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_AUDIT_TABLE = `
CREATE TABLE IF NOT EXISTS integration_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seq           BIGSERIAL   UNIQUE NOT NULL,
  venue_id      TEXT        NOT NULL,
  actor_id      TEXT,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL,
  resource_id   TEXT,
  payload       JSONB       NOT NULL DEFAULT '{}',
  prev_hash     TEXT        NOT NULL DEFAULT '',
  entry_hash    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ik_audit_venue_time
  ON integration_audit_log (venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ik_audit_resource
  ON integration_audit_log (resource_type, resource_id);
`;

let schemaReady = false;

export async function ensureAuditSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_AUDIT_TABLE);
  schemaReady = true;
}

/* ── Hash computation ──────────────────────────────────────────────────────── */

function computeHash(
  prevHash:     string,
  actorId:      string | null,
  action:       string,
  resourceType: string,
  resourceId:   string | null,
  payload:      unknown,
  createdAt:    string,
): string {
  const raw = [prevHash, actorId ?? "", action, resourceType, resourceId ?? "",
               JSON.stringify(payload), createdAt].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

/* ── Write ─────────────────────────────────────────────────────────────────── */

export interface AuditEntry {
  id:           string;
  seq:          number;
  venueId:      string;
  actorId:      string | null;
  action:       string;
  resourceType: string;
  resourceId:   string | null;
  payload:      unknown;
  prevHash:     string;
  entryHash:    string;
  createdAt:    string;
}

export async function auditKernelAction(opts: {
  venueId:      string;
  actorId?:     string | null;
  action:       string;
  resourceType: string;
  resourceId?:  string | null;
  payload?:     unknown;
}): Promise<AuditEntry> {
  await ensureAuditSchema();

  const { rows: prev } = await pool.query<{ entry_hash: string }>(
    `SELECT entry_hash FROM integration_audit_log
     WHERE venue_id = $1
     ORDER BY seq DESC LIMIT 1`,
    [opts.venueId],
  );

  const prevHash  = prev[0]?.entry_hash ?? "";
  const now       = new Date().toISOString();
  const entryHash = computeHash(
    prevHash,
    opts.actorId ?? null,
    opts.action,
    opts.resourceType,
    opts.resourceId ?? null,
    opts.payload ?? {},
    now,
  );

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO integration_audit_log
       (venue_id, actor_id, action, resource_type, resource_id,
        payload, prev_hash, entry_hash, created_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
     RETURNING *`,
    [
      opts.venueId,
      opts.actorId ?? null,
      opts.action,
      opts.resourceType,
      opts.resourceId ?? null,
      JSON.stringify(opts.payload ?? {}),
      prevHash,
      entryHash,
      now,
    ],
  );

  const entry = rowToEntry(rows[0]!);

  kernelBus.emit("audit.entry_written", {
    venueId:      entry.venueId,
    auditId:      entry.id,
    action:       entry.action,
    resourceType: entry.resourceType,
    resourceId:   entry.resourceId,
    actorId:      entry.actorId,
    ts:           Date.now(),
  });

  return entry;
}

/* ── Read ──────────────────────────────────────────────────────────────────── */

export async function getAuditLog(
  venueId:       string,
  limit  = 50,
  offset = 0,
  filters?: { resourceType?: string; resourceId?: string; action?: string },
): Promise<{ entries: AuditEntry[]; total: number }> {
  await ensureAuditSchema();

  const conditions: string[] = ["venue_id = $1"];
  const params: unknown[]    = [venueId];
  let idx = 2;

  if (filters?.resourceType) {
    conditions.push(`resource_type = $${idx++}`);
    params.push(filters.resourceType);
  }
  if (filters?.resourceId) {
    conditions.push(`resource_id = $${idx++}`);
    params.push(filters.resourceId);
  }
  if (filters?.action) {
    conditions.push(`action = $${idx++}`);
    params.push(filters.action);
  }

  const where = conditions.join(" AND ");

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query<Record<string, unknown>>(
      `SELECT * FROM integration_audit_log WHERE ${where}
       ORDER BY seq DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM integration_audit_log WHERE ${where}`,
      params,
    ),
  ]);

  return {
    entries: rows.map(rowToEntry),
    total:   Number(countRows[0]?.count ?? 0),
  };
}

/* ── Tamper detection ──────────────────────────────────────────────────────── */

export interface TamperCheckResult {
  valid:        boolean;
  totalChecked: number;
  firstBadSeq:  number | null;
  message:      string;
}

export async function verifyAuditChain(venueId: string): Promise<TamperCheckResult> {
  await ensureAuditSchema();

  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM integration_audit_log
     WHERE venue_id = $1 ORDER BY seq ASC`,
    [venueId],
  );

  let prevHash = "";
  for (const row of rows) {
    const e = rowToEntry(row);
    if (e.prevHash !== prevHash) {
      return { valid: false, totalChecked: rows.indexOf(row), firstBadSeq: e.seq, message: "Hash chain broken" };
    }
    const expected = computeHash(
      e.prevHash, e.actorId, e.action, e.resourceType,
      e.resourceId, e.payload, e.createdAt,
    );
    if (expected !== e.entryHash) {
      return { valid: false, totalChecked: rows.indexOf(row), firstBadSeq: e.seq, message: "Entry hash mismatch" };
    }
    prevHash = e.entryHash;
  }

  return { valid: true, totalChecked: rows.length, firstBadSeq: null, message: "Chain intact" };
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function rowToEntry(r: Record<string, unknown>): AuditEntry {
  return {
    id:           String(r["id"] ?? ""),
    seq:          Number(r["seq"] ?? 0),
    venueId:      String(r["venue_id"] ?? ""),
    actorId:      r["actor_id"] != null ? String(r["actor_id"]) : null,
    action:       String(r["action"] ?? ""),
    resourceType: String(r["resource_type"] ?? ""),
    resourceId:   r["resource_id"] != null ? String(r["resource_id"]) : null,
    payload:      r["payload"] ?? {},
    prevHash:     String(r["prev_hash"] ?? ""),
    entryHash:    String(r["entry_hash"] ?? ""),
    createdAt:    r["created_at"] instanceof Date
      ? r["created_at"].toISOString()
      : String(r["created_at"] ?? ""),
  };
}
