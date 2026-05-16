/**
 * complianceExports — generates audit and data portability exports
 * for regulatory compliance requests.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type ExportFormat = "json" | "csv";
export type ExportType   = "audit_trail" | "consent_history" | "data_portability" | "ai_decisions";

export interface ExportManifest {
  exportId:    string;
  type:        ExportType;
  entityId:    string;
  requestedBy: string;
  format:      ExportFormat;
  status:      "pending" | "complete" | "failed";
  recordCount: number;
  generatedAt: number;
  expiresAt:   number;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys   = Object.keys(rows[0]);
  const header = keys.join(",");
  const lines  = rows.map(r =>
    keys.map(k => {
      const v = r[k];
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

async function fetchAuditTrail(entityId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT action, actor_id, resource_type, resource_id, created_at, metadata
     FROM security_audit_trail
     WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 10000`,
    [entityId],
  );
  return rows;
}

async function fetchConsentHistory(entityId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT action, metadata, created_at
     FROM security_audit_trail
     WHERE actor_id = $1 AND action LIKE 'consent:%'
     ORDER BY created_at DESC`,
    [entityId],
  );
  return rows.map(r => ({ ...r, ...(r.metadata as Record<string, unknown>) }));
}

async function fetchAIDecisions(entityId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT decision_type, confidence, inputs, output, reasoning, decided_at
     FROM cognition_decisions WHERE entity_id = $1
     ORDER BY decided_at DESC LIMIT 1000`,
    [entityId],
  );
  return rows;
}

async function fetchDataPortability(entityId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await pool.query(
    `SELECT first_name, last_initial, created_at, updated_at
     FROM guest_profiles WHERE id::text = $1 LIMIT 1`,
    [entityId],
  );
  return rows;
}

export async function generateExport(
  entityId:    string,
  type:        ExportType,
  format:      ExportFormat,
  requestedBy: string,
): Promise<{ manifest: ExportManifest; data: string }> {
  const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case "audit_trail":      rows = await fetchAuditTrail(entityId);     break;
    case "consent_history":  rows = await fetchConsentHistory(entityId); break;
    case "ai_decisions":     rows = await fetchAIDecisions(entityId);    break;
    case "data_portability": rows = await fetchDataPortability(entityId);break;
  }

  const data = format === "csv" ? toCSV(rows) : JSON.stringify(rows, null, 2);

  const manifest: ExportManifest = {
    exportId, type, entityId, requestedBy, format,
    status:      "complete",
    recordCount: rows.length,
    generatedAt: Date.now(),
    expiresAt:   Date.now() + 7 * 24 * 3_600_000, // 7 days
  };

  logger.info({ exportId, type, entityId, recordCount: rows.length }, "complianceExports: generated");
  return { manifest, data };
}
