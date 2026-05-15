/**
 * Email service — thin wrapper around @sendgrid/mail.
 *
 * Design tenets:
 *   • LAZY init — the SDK is only configured on first use, so a missing
 *     SENDGRID_API_KEY does not crash boot. Routes / order hooks can call
 *     `sendEmail()` unconditionally and the function returns
 *     `{ sent: false, reason: "no_api_key" }` without throwing.
 *   • ENV-GATED — both SENDGRID_API_KEY *and* SENDGRID_FROM_EMAIL must be
 *     set; without a verified sender SendGrid rejects every send. The gate
 *     lets dev environments / unconfigured tenants no-op cleanly.
 *   • FIRE-AND-FORGET FRIENDLY — never throws. Every failure resolves to
 *     `{ sent: false, reason }` so callers can log without await-blocking
 *     the customer-facing request.
 *   • LOG, DON'T LEAK — the API key is never logged. The recipient and
 *     subject are logged at info; the HTML body is not.
 *
 * Templates live in `./emailTemplates.ts` so this file stays free of
 * domain-specific copy.
 */

import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

let configured = false;

/** One-time SendGrid client init. Idempotent + safe to call repeatedly. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  configured = true;
  return true;
}

export interface EmailAttachment {
  /** Base64-encoded file content. */
  content:     string;
  filename:    string;
  type:        string;
  disposition: "attachment" | "inline";
}

export interface SendEmailInput {
  to:        string;
  subject:   string;
  html:      string;
  /** Optional plaintext fallback. Auto-derived from `html` if omitted. */
  text?:     string;
  /** Override the global FROM if a tenant has its own verified sender. */
  fromOverride?: string;
  /** Optional file attachments. */
  attachments?: EmailAttachment[];
}

export type SendEmailResult =
  | { sent: true;  messageId?: string }
  | { sent: false; reason: "no_api_key" | "no_from_address" | "invalid_to" | "send_failed"; err?: unknown };

/** Send a transactional email. Never throws. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.to || !input.to.includes("@")) {
    return { sent: false, reason: "invalid_to" };
  }
  if (!ensureConfigured()) {
    logger.warn({ to: input.to, subject: input.subject }, "email skipped — SENDGRID_API_KEY not set");
    return { sent: false, reason: "no_api_key" };
  }
  const from = input.fromOverride ?? process.env.SENDGRID_FROM_EMAIL;
  if (!from) {
    logger.warn(
      { to: input.to, subject: input.subject },
      "email skipped — SENDGRID_FROM_EMAIL not set (verify a sender in SendGrid first)",
    );
    return { sent: false, reason: "no_from_address" };
  }

  try {
    const [resp] = await sgMail.send({
      to:          input.to,
      from,
      subject:     input.subject,
      html:        input.html,
      text:        input.text ?? stripHtml(input.html),
      attachments: input.attachments,
    });
    const messageId = resp?.headers?.["x-message-id"] as string | undefined;
    logger.info(
      { to: input.to, subject: input.subject, status: resp?.statusCode, messageId },
      "email sent",
    );
    return { sent: true, messageId };
  } catch (err) {
    /* SendGrid errors carry { code, response.body.errors } — log a useful
     * shape but never the API key. */
    const e = err as { code?: number; response?: { body?: unknown } };
    logger.error(
      { to: input.to, subject: input.subject, code: e.code, body: e.response?.body },
      "email send failed",
    );
    return { sent: false, reason: "send_failed", err };
  }
}

/** Conservative plaintext fallback — strips tags + collapses whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Health summary for /api/email/test and ops dashboards. Never returns the key. */
export function emailServiceStatus(): {
  apiKeyPresent: boolean;
  fromAddressPresent: boolean;
  ready: boolean;
} {
  const apiKeyPresent      = !!process.env.SENDGRID_API_KEY;
  const fromAddressPresent = !!process.env.SENDGRID_FROM_EMAIL;
  return {
    apiKeyPresent,
    fromAddressPresent,
    ready: apiKeyPresent && fromAddressPresent,
  };
}
