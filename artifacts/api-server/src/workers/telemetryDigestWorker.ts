/**
 * telemetryDigestWorker — Weekly E.A.T. Engine telemetry digest emails.
 *
 * Runs once a week (configurable via TELEMETRY_DIGEST_INTERVAL_MS for testing).
 * For every venue it:
 *   1. Fetches the 7-day telemetry summary.
 *   2. Builds the same CSV shape the EATDashboard exports manually
 *      (section headers, CRLF line endings, and quoting identical to
 *      buildCsvContent() in EATDashboard.tsx).
 *   3. Emails it to every eligible admin for that venue who has NOT opted out:
 *      - venue_owner / manager: receive a digest for their own venue.
 *      - super_admin: receives a digest for every active venue; if they have no
 *        venueId they get a single global-aggregate digest.
 *
 * Opt-out unsubscribe links are HMAC-signed (SHA-256, keyed on SESSION_SECRET)
 * so they cannot be forged or used to unsubscribe another user.
 *
 * Non-fatal: errors are logged per-recipient so a single bad address does not
 * block the rest of the send batch. Missing SendGrid credentials cause the run
 * to be skipped with a warn log rather than crashing the server.
 */

import crypto from "crypto";
import { db }                   from "@workspace/db";
import { usersTable, venuesTable } from "@workspace/db";
import { sql, eq, or, and, ne }    from "drizzle-orm";
import { sendEmail }            from "../services/email";
import { telemetryDigest }      from "../services/emailTemplates";
import { logger }               from "../lib/logger";

const WINDOW_DAYS = 7;
const INTERVAL_MS = Number(process.env["TELEMETRY_DIGEST_INTERVAL_MS"]) || 7 * 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

// ── HMAC token helpers ────────────────────────────────────────────────────────

function signUnsubscribeToken(userId: string): string {
  const secret = process.env["SESSION_SECRET"] ?? "changeme";
  return crypto.createHmac("sha256", secret).update(`digest-optout:${userId}`).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = signUnsubscribeToken(userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ── CSV builder ───────────────────────────────────────────────────────────────
// Exactly mirrors buildCsvContent() in EATDashboard.tsx:
//   • Section headers use "##" (not "#")
//   • Date-range line: "# Date range: last N day(s)"
//   • event_type and module_name values are double-quote escaped per RFC 4180
//   • module_slug is also quoted (matching dashboard)
//   • Lines joined with CRLF ("\r\n")

interface TelemetrySummary {
  total:            number;
  dailyCounts:      { day: string; cnt: number }[];
  topEventTypes:    { event_type: string; cnt: number }[];
  moduleUsage:      { module_name: string; module_slug: string; event_count: number }[];
  ritualEngagement: number;
}

function buildCsv(summary: TelemetrySummary, windowDays: number): string {
  const rows: string[] = [];

  rows.push("# E.A.T. Engine Telemetry Export");
  rows.push(`# Date range: last ${windowDays} day(s)`);
  rows.push(`# Generated: ${new Date().toISOString()}`);
  rows.push("");

  rows.push("## Daily Counts");
  rows.push("date,events");
  for (const d of summary.dailyCounts) {
    rows.push(`${d.day},${d.cnt}`);
  }
  rows.push("");

  rows.push("## Top Event Types");
  rows.push("event_type,count");
  for (const e of summary.topEventTypes) {
    rows.push(`"${e.event_type.replace(/"/g, '""')}",${e.cnt}`);
  }
  rows.push("");

  rows.push("## Module Usage");
  rows.push("module_name,module_slug,event_count");
  for (const m of summary.moduleUsage) {
    rows.push(`"${m.module_name.replace(/"/g, '""')}","${m.module_slug}",${m.event_count}`);
  }
  rows.push("");

  rows.push("## Summary");
  rows.push("metric,value");
  rows.push(`total_events,${summary.total}`);
  rows.push(`ritual_engagement_pct,${summary.ritualEngagement}`);

  return rows.join("\r\n");
}

// ── Telemetry summary query ───────────────────────────────────────────────────
// Same aggregation logic as buildSummary() in kernel.ts.

async function fetchSummary(windowDays: number, venueId: string | null): Promise<TelemetrySummary> {
  const venueFilter = venueId
    ? sql` AND venue_id = ${venueId}::uuid`
    : sql``;

  const totalResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM telemetry_events
    WHERE occurred_at >= NOW() - (${windowDays} || ' days')::interval
    ${venueFilter}
  `);
  const total = (totalResult.rows[0] as { total: number }).total;

  const dailyResult = await db.execute(sql`
    SELECT
      gs.day::date::text AS day,
      COALESCE(c.cnt, 0)::int AS cnt
    FROM (
      SELECT generate_series(
        (NOW() - (${windowDays} || ' days')::interval)::date,
        NOW()::date - INTERVAL '1 day',
        '1 day'::interval
      )::date AS day
    ) gs
    LEFT JOIN (
      SELECT DATE_TRUNC('day', occurred_at)::date AS day, COUNT(*)::int AS cnt
      FROM telemetry_events
      WHERE occurred_at >= NOW() - (${windowDays} || ' days')::interval
      ${venueFilter}
      GROUP BY 1
    ) c USING (day)
    ORDER BY gs.day ASC
  `);
  const dailyCounts = dailyResult.rows as { day: string; cnt: number }[];

  const topResult = await db.execute(sql`
    SELECT event_type, COUNT(*)::int AS cnt
    FROM telemetry_events
    WHERE occurred_at >= NOW() - (${windowDays} || ' days')::interval
    ${venueFilter}
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10
  `);
  const topEventTypes = topResult.rows as { event_type: string; cnt: number }[];

  const moduleResult = await db.execute(sql`
    SELECT
      km.name AS module_name,
      km.slug AS module_slug,
      COUNT(te.id)::int AS event_count
    FROM kernel_modules km
    LEFT JOIN telemetry_events te
      ON te.module_id = km.id
      AND te.occurred_at >= NOW() - (${windowDays} || ' days')::interval
      ${venueId ? sql`AND te.venue_id = ${venueId}::uuid` : sql``}
    GROUP BY km.id, km.name, km.slug
    ORDER BY event_count DESC
  `);
  const moduleUsage = moduleResult.rows as { module_name: string; module_slug: string; event_count: number }[];

  const ritualResult = await db.execute(sql`
    SELECT
      SUM(CASE WHEN event_type = 'swipe_start'    THEN 1 ELSE 0 END)::int AS starts,
      SUM(CASE WHEN event_type = 'build_complete' THEN 1 ELSE 0 END)::int AS completions
    FROM telemetry_events
    WHERE occurred_at >= NOW() - (${windowDays} || ' days')::interval
    ${venueFilter}
  `);
  const { starts, completions } = ritualResult.rows[0] as { starts: number; completions: number };
  const ritualEngagement = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  return { total, dailyCounts, topEventTypes, moduleUsage, ritualEngagement };
}

// ── Main digest run ───────────────────────────────────────────────────────────

async function runDigest(): Promise<void> {
  logger.info("[TelemetryDigest] Starting weekly digest run");

  // Eligible roles: venue_owner and manager (scoped to their venue),
  // and super_admin (scoped to their venueId if set, or all venues if null).
  const recipients = await db
    .select({
      id:      usersTable.id,
      name:    usersTable.name,
      email:   usersTable.email,
      role:    usersTable.role,
      venueId: usersTable.venueId,
    })
    .from(usersTable)
    .where(
      and(
        or(
          eq(usersTable.role, "super_admin"),
          eq(usersTable.role, "venue_owner"),
          eq(usersTable.role, "manager"),
        ),
        ne(usersTable.telemetryDigestOptOut, true),
      ),
    );

  if (recipients.length === 0) {
    logger.info("[TelemetryDigest] No eligible recipients — skipping");
    return;
  }

  // Fetch the authoritative list of active venues for super_admin fan-out.
  // Using venuesTable prevents the fan-out from depending on whether a venue
  // happens to have a manager/owner recipient in the current send cycle.
  let activeVenueIds: string[] = [];
  try {
    const venueRows = await db
      .select({ id: venuesTable.id })
      .from(venuesTable)
      .where(eq(venuesTable.active, true));
    activeVenueIds = venueRows.map(r => r.id);
  } catch (err) {
    logger.warn({ err }, "[TelemetryDigest] Failed to load active venues — super_admin fan-out may be incomplete");
  }

  // Build the send list: { user, venueId } pairs.
  type SendTarget = { user: (typeof recipients)[number]; venueId: string | null };
  const sendTargets: SendTarget[] = [];

  for (const user of recipients) {
    if (user.role === "super_admin") {
      if (user.venueId !== null) {
        // Venue-scoped super_admin → digest for their own venue only.
        sendTargets.push({ user, venueId: user.venueId });
      } else {
        // Unscoped super_admin → one digest per active venue.
        // Falls back to a single global digest if no venues exist yet.
        const venues = activeVenueIds.length > 0 ? activeVenueIds : [null];
        for (const vid of venues) {
          sendTargets.push({ user, venueId: vid });
        }
      }
    } else {
      // venue_owner / manager: must have a venueId — skip otherwise to avoid
      // leaking cross-tenant aggregate data to a tenant-scoped role.
      if (!user.venueId) {
        logger.warn({ userId: user.id, role: user.role }, "[TelemetryDigest] Skipping tenant-scoped user with no venueId");
        continue;
      }
      sendTargets.push({ user, venueId: user.venueId });
    }
  }

  // Pre-fetch summaries per unique venueId to avoid redundant DB round trips.
  const summaryCache = new Map<string | null, TelemetrySummary>();
  const uniqueVenueIds = [...new Set(sendTargets.map(t => t.venueId))];
  for (const vid of uniqueVenueIds) {
    try {
      summaryCache.set(vid, await fetchSummary(WINDOW_DAYS, vid));
    } catch (err) {
      logger.error({ err, venueId: vid }, "[TelemetryDigest] Failed to fetch summary — skipping venue");
    }
  }

  const appDomain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim() ?? "localhost";
  const baseUrl   = appDomain.startsWith("http") ? appDomain : `https://${appDomain}`;
  const generatedAt = new Date().toUTCString();

  let sent = 0;
  let failed = 0;

  for (const { user, venueId } of sendTargets) {
    const summary = summaryCache.get(venueId);
    if (!summary) continue;

    const csv      = buildCsv(summary, WINDOW_DAYS);
    const csvB64   = Buffer.from(csv, "utf-8").toString("base64");
    const filename = `telemetry-${venueId ?? "global"}-${new Date().toISOString().slice(0, 10)}.csv`;
    const venueLabel = venueId ? `Venue ${venueId.slice(0, 8)}` : "All Venues";

    const token     = signUnsubscribeToken(user.id);
    const optOutUrl = `${baseUrl}/api/users/me/telemetry-digest?token=${token}&uid=${user.id}`;

    const { subject, html } = telemetryDigest({
      adminName:        user.name,
      venueLabel,
      windowDays:       WINDOW_DAYS,
      totalEvents:      summary.total,
      ritualEngagement: summary.ritualEngagement,
      topEventTypes:    summary.topEventTypes,
      generatedAt,
      optOutUrl,
    });

    const result = await sendEmail({
      to:      user.email,
      subject,
      html,
      attachments: [{
        content:     csvB64,
        filename,
        type:        "text/csv",
        disposition: "attachment",
      }],
    });

    if (result.sent) {
      sent++;
      logger.info({ to: user.email, venueId }, "[TelemetryDigest] Digest sent");
    } else {
      failed++;
      logger.warn({ to: user.email, venueId, reason: result.reason }, "[TelemetryDigest] Digest send failed");
    }
  }

  logger.info({ sent, failed }, "[TelemetryDigest] Weekly digest run complete");
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function startTelemetryDigestWorker(): void {
  if (timer !== null) return;
  logger.info({ intervalMs: INTERVAL_MS }, "[TelemetryDigest] Worker started");
  timer = setInterval(() => {
    runDigest().catch(err => logger.error({ err }, "[TelemetryDigest] Unhandled error in digest run"));
  }, INTERVAL_MS);
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    (timer as ReturnType<typeof setInterval>).unref();
  }
}

export function stopTelemetryDigestWorker(): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  logger.info("[TelemetryDigest] Worker stopped");
}
