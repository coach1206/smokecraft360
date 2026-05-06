/**
 * responseFormat — shared API response envelope and error handling.
 *
 * Canonical shape:
 *   { success: true,  data: T,      meta?: PaginationMeta }
 *   { success: false, error: string, code?: string }
 *
 * Usage in route handlers:
 *   import { sendSuccess, sendError, ApiError } from "../middleware/responseFormat";
 *
 *   router.get("/items", async (req, res, next) => {
 *     try {
 *       const items = await fetchItems();
 *       return sendSuccess(res, items, { total: items.length });
 *     } catch (err) {
 *       next(err);
 *     }
 *   });
 *
 * Mount AFTER all route handlers in app.ts:
 *   app.use(notFoundHandler);
 *   app.use(globalErrorHandler);
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

// ── Pagination meta ────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total?:   number;
  page?:    number;
  perPage?: number;
  hasMore?: boolean;
  [key: string]: unknown;
}

// ── Success envelope ───────────────────────────────────────────────────────────

export interface SuccessEnvelope<T = unknown> {
  success: true;
  data:    T;
  meta?:   PaginationMeta;
}

// ── Error envelope ─────────────────────────────────────────────────────────────

export interface ErrorEnvelope {
  success: false;
  error:   string;
  code?:   string;
}

// ── ApiError — throw this to produce a structured HTTP error response ──────────

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Response helpers ───────────────────────────────────────────────────────────

/**
 * Send a successful JSON response using the canonical envelope.
 */
export function sendSuccess<T>(
  res:    Response,
  data:   T,
  meta?:  PaginationMeta,
  status = 200,
): void {
  const body: SuccessEnvelope<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  res.status(status).json(body);
}

/**
 * Send an error JSON response using the canonical envelope.
 */
export function sendError(
  res:     Response,
  message: string,
  status = 500,
  code?:   string,
): void {
  const body: ErrorEnvelope = code
    ? { success: false, error: message, code }
    : { success: false, error: message };
  res.status(status).json(body);
}

// ── Middleware ─────────────────────────────────────────────────────────────────

/**
 * 404 catch-all — must be mounted after all route handlers.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  const body: ErrorEnvelope = { success: false, error: "Not found" };
  res.status(404).json(body);
}

/**
 * Global error handler — must be mounted last (4-argument signature required by Express).
 * Handles:
 *   - ApiError instances (structured, intentional errors from route handlers)
 *   - Express body-parser errors (413 PayloadTooLarge, 400 SyntaxError)
 *   - Unexpected runtime errors (500)
 */
export function globalErrorHandler(
  err:  Error,
  req:  Request,
  res:  Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const log = (req as typeof req & { log?: typeof logger }).log ?? logger;

  if (err instanceof ApiError) {
    log.info({ statusCode: err.statusCode, code: err.code, message: err.message }, "ApiError");
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  log.error({ err }, "Unhandled error");

  const e      = err as Error & { status?: number; statusCode?: number; type?: string };
  const status = e.status ?? e.statusCode ?? 500;

  const message =
    status === 413 ? "Payload too large" :
    status === 400 ? "Invalid request"   :
    "Something went wrong";

  sendError(res, message, status);
}
