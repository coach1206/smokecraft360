/**
 * Input sanitization middleware.
 *
 * Two utilities:
 *
 *   rejectDeepPayloads  — global middleware: blocks payloads nested deeper than
 *                         MAX_DEPTH (prevents DoS / prototype pollution vectors)
 *
 *   allowOnly(...keys)  — route middleware factory: strips any key NOT in the
 *                         allow-list before the handler runs, so handlers never
 *                         see unexpected fields regardless of what the client sends
 */

import { type Request, type Response, type NextFunction } from "express";

const MAX_DEPTH = 4;

function depth(value: unknown, current = 0): number {
  if (current > MAX_DEPTH)                       return current;
  if (value === null || typeof value !== "object") return current;
  let max = current;
  for (const v of Object.values(value as object)) {
    const d = depth(v, current + 1);
    if (d > max) max = d;
    if (max > MAX_DEPTH) break; // short-circuit
  }
  return max;
}

/**
 * Rejects any request body nested beyond MAX_DEPTH levels.
 * Apply globally before route handlers.
 */
export function rejectDeepPayloads(req: Request, res: Response, next: NextFunction): void {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    if (depth(req.body) > MAX_DEPTH) {
      res.status(400).json({ error: "Request body structure is invalid" });
      return;
    }
  }
  next();
}

/**
 * Factory — strips any top-level keys not in the allow-list.
 *
 * Usage:
 *   router.post("/", allowOnly("category", "flavorPreferences", "strength", "mood"), handler)
 */
export function allowOnly(...keys: string[]) {
  const allowed = new Set(keys);
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body !== null && typeof req.body === "object" && !Array.isArray(req.body)) {
      for (const key of Object.keys(req.body as Record<string, unknown>)) {
        if (!allowed.has(key)) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete (req.body as Record<string, unknown>)[key];
        }
      }
    }
    next();
  };
}
