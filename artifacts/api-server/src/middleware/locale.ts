/**
 * Passive Accept-Language parser.
 *
 * Parses the inbound Accept-Language header (RFC 7231 q-values), narrows it
 * to a supported locale, and exposes the result as `req.locale`. Does NOT
 * change any response body, error message, or business logic — the i18n
 * brief explicitly says "DO NOT change backend logic based on language".
 *
 * Future per-locale email templates / receipt copy can simply read
 * `req.locale` without re-parsing the header.
 */
import type { Request, Response, NextFunction } from "express";

export const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Best-match supported locale derived from the Accept-Language header. */
      locale?: Locale;
    }
  }
}

export function parseAcceptLanguage(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;
      return { tag: (tag ?? "").toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const c of candidates) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(c.tag)) return c.tag as Locale;
  }
  return DEFAULT_LOCALE;
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.locale = parseAcceptLanguage(req.headers["accept-language"]);
  next();
}
