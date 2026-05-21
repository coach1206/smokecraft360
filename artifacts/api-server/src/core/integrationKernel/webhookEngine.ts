/**
 * Phase 12 — Webhook Infrastructure
 *
 * Inbound: receives provider webhook payloads, verifies HMAC-SHA256,
 *          persists to webhook_events, emits on kernelBus.
 *
 * Outbound: queues deliveries with retry (3× exponential back-off),
 *           persists status to webhook_deliveries.
 */

import { pool } from "@workspace/db";
import { kernelBus } from "./eventBus";
import { verifyWebhookSignature } from "./sdk";

/* ── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_WEBHOOK_TABLES = `
CREATE TABLE IF NOT EXISTS webhook_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      TEXT        NOT NULL,
  provider_name TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}',
  signature_ok  BOOLEAN     NOT NULL DEFAULT false,
  raw_headers   JSONB       NOT NULL DEFAULT '{}',
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wh_events_venue
  ON webhook_events (venue_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      TEXT        NOT NULL,
  provider_name TEXT        NOT NULL,
  target_url    TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'pending',
  attempt       INTEGER     NOT NULL DEFAULT 0,
  max_attempts  INTEGER     NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_status_code INTEGER,
  last_error    TEXT,
  delivered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wh_deliveries_venue
  ON webhook_deliveries (venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wh_deliveries_pending
  ON webhook_deliveries (status, next_retry_at)
  WHERE status IN ('pending','retry');
`;

let schemaReady = false;

export async function ensureWebhookSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_WEBHOOK_TABLES);
  schemaReady = true;
}

/* ── Inbound webhook processing ────────────────────────────────────────────── */

export interface InboundWebhookOptions {
  venueId:      string;
  providerName: string;
  eventType:    string;
  payload:      unknown;
  rawHeaders:   Record<string, string>;
  signature?:   string;
  secret?:      string;
}

export interface WebhookEvent {
  id:           string;
  venueId:      string;
  providerName: string;
  eventType:    string;
  payload:      unknown;
  signatureOk:  boolean;
  processedAt:  string | null;
  createdAt:    string;
}

export async function receiveWebhook(opts: InboundWebhookOptions): Promise<WebhookEvent> {
  await ensureWebhookSchema();

  const signatureOk = opts.signature && opts.secret
    ? verifyWebhookSignature(JSON.stringify(opts.payload), opts.signature, opts.secret)
    : true;

  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO webhook_events
       (venue_id, provider_name, event_type, payload, signature_ok, raw_headers, processed_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,now())
     RETURNING *`,
    [
      opts.venueId,
      opts.providerName,
      opts.eventType,
      JSON.stringify(opts.payload),
      signatureOk,
      JSON.stringify(opts.rawHeaders),
    ],
  );

  const event = rowToEvent(rows[0]!);
  return event;
}

export async function listInboundEvents(
  venueId: string,
  limit = 50,
  offset = 0,
): Promise<{ events: WebhookEvent[]; total: number }> {
  await ensureWebhookSchema();
  const [{ rows }, { rows: cnt }] = await Promise.all([
    pool.query<Record<string, unknown>>(
      `SELECT * FROM webhook_events WHERE venue_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [venueId, limit, offset],
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM webhook_events WHERE venue_id=$1`,
      [venueId],
    ),
  ]);
  return { events: rows.map(rowToEvent), total: Number(cnt[0]?.count ?? 0) };
}

/* ── Outbound webhook delivery ─────────────────────────────────────────────── */

export interface QueueDeliveryOptions {
  venueId:      string;
  providerName: string;
  targetUrl:    string;
  eventType:    string;
  payload?:     unknown;
  maxAttempts?: number;
}

export interface WebhookDelivery {
  id:             string;
  venueId:        string;
  providerName:   string;
  targetUrl:      string;
  eventType:      string;
  payload:        unknown;
  status:         "pending" | "delivered" | "retry" | "failed";
  attempt:        number;
  maxAttempts:    number;
  nextRetryAt:    string | null;
  lastStatusCode: number | null;
  lastError:      string | null;
  deliveredAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

export async function queueDelivery(opts: QueueDeliveryOptions): Promise<WebhookDelivery> {
  await ensureWebhookSchema();
  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO webhook_deliveries
       (venue_id, provider_name, target_url, event_type, payload, max_attempts)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     RETURNING *`,
    [opts.venueId, opts.providerName, opts.targetUrl, opts.eventType,
     JSON.stringify(opts.payload), opts.maxAttempts ?? 3],
  );
  return rowToDelivery(rows[0]!);
}

export async function processDelivery(deliveryId: string, venueId: string): Promise<WebhookDelivery> {
  await ensureWebhookSchema();
  const { rows: dr } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM webhook_deliveries WHERE id=$1 AND venue_id=$2`,
    [deliveryId, venueId],
  );
  if (!dr[0]) throw new Error("Delivery not found");
  const delivery = rowToDelivery(dr[0]);

  let statusCode: number | null = null;
  let error: string | null = null;
  let success = false;

  try {
    const res = await fetch(delivery.targetUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "NoveeOS-Webhook/1.0" },
      body:    JSON.stringify(delivery.payload),
      signal:  AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    success    = res.status >= 200 && res.status < 300;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const attempt = delivery.attempt + 1;
  const willRetry = !success && attempt < delivery.maxAttempts;
  const nextRetry = willRetry
    ? new Date(Date.now() + Math.pow(2, attempt) * 5_000).toISOString()
    : null;
  const newStatus = success ? "delivered" : willRetry ? "retry" : "failed";

  const { rows: updated } = await pool.query<Record<string, unknown>>(
    `UPDATE webhook_deliveries SET
       status=$3, attempt=$4, next_retry_at=$5,
       last_status_code=$6, last_error=$7,
       delivered_at=CASE WHEN $8 THEN now() ELSE NULL END,
       updated_at=now()
     WHERE id=$1 AND venue_id=$2
     RETURNING *`,
    [deliveryId, venueId, newStatus, attempt, nextRetry, statusCode, error, success],
  );

  const result = rowToDelivery(updated[0]!);

  if (success) {
    kernelBus.emit("webhook.delivered", {
      venueId, deliveryId, providerName: result.providerName,
      targetUrl: result.targetUrl, statusCode: statusCode ?? 0,
      attempt, ts: Date.now(),
    });
  } else if (!willRetry) {
    kernelBus.emit("webhook.failed", {
      venueId, deliveryId, providerName: result.providerName,
      targetUrl: result.targetUrl, error: error ?? "HTTP error",
      attempt, willRetry: false, ts: Date.now(),
    });
  }

  return result;
}

export async function listDeliveries(
  venueId: string,
  status?: string,
  limit = 50,
): Promise<WebhookDelivery[]> {
  await ensureWebhookSchema();
  const { rows } = status
    ? await pool.query<Record<string, unknown>>(
        `SELECT * FROM webhook_deliveries WHERE venue_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3`,
        [venueId, status, limit],
      )
    : await pool.query<Record<string, unknown>>(
        `SELECT * FROM webhook_deliveries WHERE venue_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [venueId, limit],
      );
  return rows.map(rowToDelivery);
}

/* ── Row mappers ────────────────────────────────────────────────────────────── */

function rowToEvent(r: Record<string, unknown>): WebhookEvent {
  return {
    id:           String(r["id"] ?? ""),
    venueId:      String(r["venue_id"] ?? ""),
    providerName: String(r["provider_name"] ?? ""),
    eventType:    String(r["event_type"] ?? ""),
    payload:      r["payload"] ?? {},
    signatureOk:  Boolean(r["signature_ok"]),
    processedAt:  r["processed_at"] instanceof Date ? r["processed_at"].toISOString()
      : r["processed_at"] != null ? String(r["processed_at"]) : null,
    createdAt:    r["created_at"] instanceof Date ? r["created_at"].toISOString() : String(r["created_at"] ?? ""),
  };
}

function rowToDelivery(r: Record<string, unknown>): WebhookDelivery {
  return {
    id:             String(r["id"] ?? ""),
    venueId:        String(r["venue_id"] ?? ""),
    providerName:   String(r["provider_name"] ?? ""),
    targetUrl:      String(r["target_url"] ?? ""),
    eventType:      String(r["event_type"] ?? ""),
    payload:        r["payload"] ?? {},
    status:         (r["status"] as WebhookDelivery["status"]) ?? "pending",
    attempt:        Number(r["attempt"] ?? 0),
    maxAttempts:    Number(r["max_attempts"] ?? 3),
    nextRetryAt:    r["next_retry_at"] instanceof Date ? r["next_retry_at"].toISOString()
      : r["next_retry_at"] != null ? String(r["next_retry_at"]) : null,
    lastStatusCode: r["last_status_code"] != null ? Number(r["last_status_code"]) : null,
    lastError:      r["last_error"] != null ? String(r["last_error"]) : null,
    deliveredAt:    r["delivered_at"] instanceof Date ? r["delivered_at"].toISOString()
      : r["delivered_at"] != null ? String(r["delivered_at"]) : null,
    createdAt:      r["created_at"] instanceof Date ? r["created_at"].toISOString() : String(r["created_at"] ?? ""),
    updatedAt:      r["updated_at"] instanceof Date ? r["updated_at"].toISOString() : String(r["updated_at"] ?? ""),
  };
}
