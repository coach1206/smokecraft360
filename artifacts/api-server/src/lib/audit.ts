/**
 * Audit log helper. One call per privileged action.
 *
 *   await logAudit(req, {
 *     action:      "subscription.extend_grace",
 *     entityType:  "subscription",
 *     entityId:    sub.id,
 *     before:      { gracePeriodEndsAt: oldDate },
 *     after:       { gracePeriodEndsAt: newDate },
 *     venueId,
 *   });
 *
 * Writes are best-effort — failures are logged but never thrown so they
 * cannot block the underlying admin action.
 */

import { db, auditLogTable } from "@workspace/db";
import { logger }            from "./logger";
import type { Request }      from "express";
import type { AuthRequest }  from "../middleware/auth";

export interface AuditOpts {
  action:      string;
  entityType:  string;
  entityId?:   string | null;
  before?:     Record<string, unknown> | null;
  after?:      Record<string, unknown> | null;
  venueId?:    string | null;
}

function pickIp(req: Request): string | null {
  // Express sets req.ip from x-forwarded-for when `trust proxy` is on.
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0]!.trim();
  if (Array.isArray(fwd) && fwd[0]) return fwd[0];
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

export async function logAudit(req: AuthRequest, opts: AuditOpts): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      actorId:     req.user?.id   ?? null,
      actorRole:   req.user?.role ?? null,
      action:      opts.action,
      entityType:  opts.entityType,
      entityId:    opts.entityId ?? null,
      beforeState: opts.before ?? null,
      afterState:  opts.after ?? null,
      venueId:     opts.venueId ?? req.user?.venueId ?? null,
      ipAddress:   pickIp(req),
    });
  } catch (err) {
    logger.error({ err, opts }, "audit log write failed");
  }
}
