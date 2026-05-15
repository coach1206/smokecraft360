/**
 * Email templates — pure functions returning { subject, html }.
 *
 * Kept free of side effects so they're trivially unit-testable and so a
 * future template registry / preview UI can render them without touching
 * SendGrid. All HTML is inline-styled (no <style> blocks) because most
 * mail clients strip <head> styles.
 */

const BRAND_GOLD     = "#D4AF37";
const BRAND_CHARCOAL = "#1a1410";
const BRAND_CREAM    = "#e6d2af";

export interface OrderReceiptInput {
  orderId:    string;
  /** Friendly product names to print in the receipt body. */
  items:      Array<{ label: string; name: string }>;
  /** "table" | "pickup" | "delivery" — verbatim from the order row. */
  orderType:  string;
  tableNumber?: string | null;
  venueName?:   string | null;
  /** Optional total in cents (only present once the payment is captured). */
  totalCents?:  number | null;
}

export function orderReceipt(input: OrderReceiptInput): { subject: string; html: string } {
  const venue = input.venueName ?? "Your venue";
  const subject = `${venue} — order confirmation`;

  const itemsHtml = input.items.length
    ? input.items.map(i => `
      <tr>
        <td style="padding:8px 0;color:${BRAND_CREAM};font-size:12px;text-transform:uppercase;letter-spacing:0.18em;width:90px;">${escape(i.label)}</td>
        <td style="padding:8px 0;color:#fff;font-family:Georgia,serif;font-size:18px;">${escape(i.name)}</td>
      </tr>`).join("")
    : `<tr><td style="padding:8px 0;color:${BRAND_CREAM};font-style:italic;">No items recorded.</td></tr>`;

  const totalLine = typeof input.totalCents === "number"
    ? `<div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(212,175,55,0.32);">
         <span style="color:${BRAND_CREAM};font-size:11px;text-transform:uppercase;letter-spacing:0.22em;">Total</span>
         <span style="color:#fff;float:right;font-family:Georgia,serif;font-size:22px;">$${(input.totalCents / 100).toFixed(2)}</span>
       </div>`
    : "";

  const fulfillmentLine = input.orderType === "table" && input.tableNumber
    ? `Bringing it to table ${escape(input.tableNumber)}.`
    : input.orderType === "pickup"
    ? "Ready for pickup at the bar shortly."
    : input.orderType === "delivery"
    ? "Out for delivery."
    : "We're preparing your order.";

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:${BRAND_CHARCOAL};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:${BRAND_CHARCOAL};">
    <div style="font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${BRAND_GOLD};margin-bottom:14px;">Receipt</div>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:400;font-size:32px;color:#fff;">${escape(venue)}</h1>
    <p style="margin:0 0 32px;color:${BRAND_CREAM};font-size:14px;line-height:1.6;">${fulfillmentLine}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:0;">${itemsHtml}</table>

    ${totalLine}

    <p style="margin:36px 0 0;color:rgba(230,210,175,0.6);font-size:11px;line-height:1.6;">
      Order reference: <span style="font-family:Menlo,Monaco,monospace;color:${BRAND_CREAM};">${escape(input.orderId)}</span><br/>
      Show this confirmation to staff if you need to amend the order.
    </p>
  </div>
</body></html>`.trim();

  return { subject, html };
}

export interface TestEmailInput { recipient: string }

export function testEmail(input: TestEmailInput): { subject: string; html: string } {
  return {
    subject: "SmokeCraft — email service test",
    html: `
<!doctype html>
<html><body style="margin:0;padding:48px;background:${BRAND_CHARCOAL};font-family:-apple-system,sans-serif;">
  <div style="max-width:480px;margin:0 auto;color:#fff;">
    <div style="font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${BRAND_GOLD};margin-bottom:14px;">Diagnostic</div>
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:28px;">SendGrid is wired up.</h1>
    <p style="color:${BRAND_CREAM};font-size:14px;line-height:1.6;">
      This message confirms ${escape(input.recipient)} can receive transactional email
      from the SmokeCraft platform. You can safely delete it.
    </p>
  </div>
</body></html>`.trim(),
  };
}

export interface TelemetryDigestInput {
  adminName:          string;
  venueLabel:         string;
  windowDays:         number;
  totalEvents:        number;
  ritualEngagement:   number;
  topEventTypes:      Array<{ event_type: string; cnt: number }>;
  generatedAt:        string;
  optOutUrl:          string;
}

export function telemetryDigest(input: TelemetryDigestInput): { subject: string; html: string } {
  const subject = `Weekly Telemetry Digest — ${input.venueLabel}`;

  const topRows = input.topEventTypes.slice(0, 5).map(e =>
    `<tr>
       <td style="padding:6px 8px;color:${BRAND_CREAM};font-family:Menlo,Monaco,monospace;font-size:12px;">${escape(e.event_type)}</td>
       <td style="padding:6px 8px;color:#fff;font-size:14px;text-align:right;">${e.cnt.toLocaleString()}</td>
     </tr>`,
  ).join("") || `<tr><td colspan="2" style="padding:8px;color:${BRAND_CREAM};font-style:italic;font-size:13px;">No events recorded.</td></tr>`;

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:${BRAND_CHARCOAL};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 32px;background:${BRAND_CHARCOAL};">
    <div style="font-size:11px;letter-spacing:0.42em;text-transform:uppercase;color:${BRAND_GOLD};margin-bottom:14px;">E.A.T. Engine · Weekly Digest</div>
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-weight:400;font-size:28px;color:#fff;">${escape(input.venueLabel)}</h1>
    <p style="margin:0 0 32px;color:${BRAND_CREAM};font-size:13px;">Hello ${escape(input.adminName)} — here is your ${input.windowDays}-day telemetry summary.<br/>The full CSV is attached.</p>

    <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:${BRAND_CREAM};">Total Events</div>
          <div style="font-size:34px;font-family:Georgia,serif;color:#fff;margin-top:4px;">${input.totalEvents.toLocaleString()}</div>
        </td>
        <td style="padding:16px 20px;border-left:1px solid rgba(212,175,55,0.18);">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:${BRAND_CREAM};">Ritual Engagement</div>
          <div style="font-size:34px;font-family:Georgia,serif;color:#fff;margin-top:4px;">${input.ritualEngagement}%</div>
        </td>
      </tr>
    </table>

    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:${BRAND_GOLD};margin-bottom:10px;">Top Event Types</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
      ${topRows}
    </table>

    <p style="margin:0;color:rgba(230,210,175,0.5);font-size:11px;line-height:1.8;">
      Generated ${escape(input.generatedAt)} · ${input.windowDays}-day window<br/>
      To stop receiving these digests:
      <a href="${escape(input.optOutUrl)}" style="color:${BRAND_GOLD};">unsubscribe</a>
    </p>
  </div>
</body></html>`.trim();

  return { subject, html };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
