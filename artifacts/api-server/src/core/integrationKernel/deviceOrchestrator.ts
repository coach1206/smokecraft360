/**
 * Phase 11 — Device Orchestration
 *
 * Manages physical/virtual devices per venue: kiosks, POS terminals,
 * tablets, display screens. Each device can be assigned a primary provider
 * and emits heartbeat events for liveness tracking.
 */

import { pool } from "@workspace/db";
import { kernelBus } from "./eventBus";

/* ── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_DEVICES_TABLE = `
CREATE TABLE IF NOT EXISTS integration_devices (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            TEXT        NOT NULL,
  device_name         TEXT        NOT NULL,
  device_type         TEXT        NOT NULL DEFAULT 'kiosk',
  status              TEXT        NOT NULL DEFAULT 'offline',
  assigned_provider_id TEXT,
  last_heartbeat      TIMESTAMPTZ,
  ip_address          TEXT,
  firmware_version    TEXT,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ik_devices_venue
  ON integration_devices (venue_id);
CREATE INDEX IF NOT EXISTS idx_ik_devices_status
  ON integration_devices (venue_id, status);
`;

let schemaReady = false;

export async function ensureDeviceSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_DEVICES_TABLE);
  schemaReady = true;
}

/* ── Types ─────────────────────────────────────────────────────────────────── */

export type DeviceType   = "kiosk" | "pos_terminal" | "tablet" | "display" | "sensor" | "gateway" | "other";
export type DeviceStatus = "online" | "offline" | "degraded" | "maintenance";

export interface Device {
  id:                 string;
  venueId:            string;
  deviceName:         string;
  deviceType:         DeviceType;
  status:             DeviceStatus;
  assignedProviderId: string | null;
  lastHeartbeat:      string | null;
  ipAddress:          string | null;
  firmwareVersion:    string | null;
  metadata:           Record<string, unknown>;
  isActive:           boolean;
  createdAt:          string;
  updatedAt:          string;
}

export interface RegisterDeviceInput {
  venueId:            string;
  deviceName:         string;
  deviceType:         DeviceType;
  assignedProviderId?: string | null;
  ipAddress?:          string | null;
  firmwareVersion?:    string | null;
  metadata?:           Record<string, unknown>;
}

/* ── CRUD ──────────────────────────────────────────────────────────────────── */

export async function registerDevice(input: RegisterDeviceInput): Promise<Device> {
  await ensureDeviceSchema();
  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO integration_devices
       (venue_id, device_name, device_type, assigned_provider_id,
        ip_address, firmware_version, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     RETURNING *`,
    [
      input.venueId,
      input.deviceName,
      input.deviceType,
      input.assignedProviderId ?? null,
      input.ipAddress ?? null,
      input.firmwareVersion ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rowToDevice(rows[0]!);
}

export async function listDevices(venueId: string, type?: DeviceType): Promise<Device[]> {
  await ensureDeviceSchema();
  const { rows } = type
    ? await pool.query<Record<string, unknown>>(
        `SELECT * FROM integration_devices WHERE venue_id=$1 AND device_type=$2 ORDER BY device_name`,
        [venueId, type],
      )
    : await pool.query<Record<string, unknown>>(
        `SELECT * FROM integration_devices WHERE venue_id=$1 ORDER BY device_name`,
        [venueId],
      );
  return rows.map(rowToDevice);
}

export async function getDeviceById(id: string, venueId: string): Promise<Device | null> {
  await ensureDeviceSchema();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM integration_devices WHERE id=$1 AND venue_id=$2`,
    [id, venueId],
  );
  return rows[0] ? rowToDevice(rows[0]) : null;
}

export async function updateDevice(
  id:      string,
  venueId: string,
  patch: Partial<Pick<Device, "deviceName" | "deviceType" | "assignedProviderId" | "ipAddress" | "firmwareVersion" | "metadata" | "isActive">>,
): Promise<Device | null> {
  await ensureDeviceSchema();
  const sets: string[]  = ["updated_at = now()"];
  const vals: unknown[] = [];
  let   idx = 1;

  if (patch.deviceName         !== undefined) { sets.push(`device_name=$${idx++}`);          vals.push(patch.deviceName); }
  if (patch.deviceType         !== undefined) { sets.push(`device_type=$${idx++}`);          vals.push(patch.deviceType); }
  if (patch.assignedProviderId !== undefined) { sets.push(`assigned_provider_id=$${idx++}`); vals.push(patch.assignedProviderId); }
  if (patch.ipAddress          !== undefined) { sets.push(`ip_address=$${idx++}`);           vals.push(patch.ipAddress); }
  if (patch.firmwareVersion    !== undefined) { sets.push(`firmware_version=$${idx++}`);     vals.push(patch.firmwareVersion); }
  if (patch.metadata           !== undefined) { sets.push(`metadata=$${idx++}::jsonb`);      vals.push(JSON.stringify(patch.metadata)); }
  if (patch.isActive           !== undefined) { sets.push(`is_active=$${idx++}`);            vals.push(patch.isActive); }

  vals.push(id, venueId);
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE integration_devices SET ${sets.join(",")} WHERE id=$${idx} AND venue_id=$${idx + 1} RETURNING *`,
    vals,
  );
  return rows[0] ? rowToDevice(rows[0]) : null;
}

export async function deleteDevice(id: string, venueId: string): Promise<boolean> {
  await ensureDeviceSchema();
  const { rowCount } = await pool.query(
    `DELETE FROM integration_devices WHERE id=$1 AND venue_id=$2`,
    [id, venueId],
  );
  return (rowCount ?? 0) > 0;
}

/* ── Heartbeat ─────────────────────────────────────────────────────────────── */

export async function recordHeartbeat(
  id:      string,
  venueId: string,
  status:  DeviceStatus = "online",
): Promise<Device | null> {
  await ensureDeviceSchema();
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE integration_devices
     SET last_heartbeat=now(), status=$3, updated_at=now()
     WHERE id=$1 AND venue_id=$2
     RETURNING *`,
    [id, venueId, status],
  );
  if (!rows[0]) return null;
  const device = rowToDevice(rows[0]);

  kernelBus.emit("device.status_changed", {
    venueId:    device.venueId,
    deviceId:   device.id,
    deviceName: device.deviceName,
    prevStatus: "unknown",
    newStatus:  device.status,
    ts:         Date.now(),
  });

  return device;
}

/* ── Stale device sweep ─────────────────────────────────────────────────────── */

export async function markStaleDevicesOffline(
  venueId:           string,
  staleThresholdMs = 120_000,
): Promise<number> {
  await ensureDeviceSchema();
  const cutoff = new Date(Date.now() - staleThresholdMs).toISOString();
  const { rowCount } = await pool.query(
    `UPDATE integration_devices
     SET status='offline', updated_at=now()
     WHERE venue_id=$1 AND status='online'
       AND (last_heartbeat IS NULL OR last_heartbeat < $2)`,
    [venueId, cutoff],
  );
  return rowCount ?? 0;
}

/* ── Row mapper ─────────────────────────────────────────────────────────────── */

function rowToDevice(r: Record<string, unknown>): Device {
  const meta = r["metadata"];
  return {
    id:                 String(r["id"] ?? ""),
    venueId:            String(r["venue_id"] ?? ""),
    deviceName:         String(r["device_name"] ?? ""),
    deviceType:         (r["device_type"] as DeviceType) ?? "other",
    status:             (r["status"] as DeviceStatus) ?? "offline",
    assignedProviderId: r["assigned_provider_id"] != null ? String(r["assigned_provider_id"]) : null,
    lastHeartbeat:      r["last_heartbeat"] instanceof Date
      ? r["last_heartbeat"].toISOString()
      : r["last_heartbeat"] != null ? String(r["last_heartbeat"]) : null,
    ipAddress:          r["ip_address"] != null ? String(r["ip_address"]) : null,
    firmwareVersion:    r["firmware_version"] != null ? String(r["firmware_version"]) : null,
    metadata:           (typeof meta === "object" && meta !== null ? meta : {}) as Record<string, unknown>,
    isActive:           Boolean(r["is_active"] ?? true),
    createdAt:          r["created_at"] instanceof Date ? r["created_at"].toISOString() : String(r["created_at"] ?? ""),
    updatedAt:          r["updated_at"] instanceof Date ? r["updated_at"].toISOString() : String(r["updated_at"] ?? ""),
  };
}
