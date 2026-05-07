/**
 * affiliateLink — Axiom Revenue Bridge utilities
 *
 * Builds affiliate URLs and fires click-log before every outbound redirect.
 * Pure functions (no React) — safe to call from any component or handler.
 *
 * URL shape:  https://target.com?aff_id=VENUE_ID&sub_id=GUEST_KEY&source=axiom_crafthub
 * Guest key:  firstName-lastInitial-phoneLast4 (deterministic, cross-session linkable)
 */

const GUEST_STORAGE_KEY = "smokecraft_guest";
const BASE              = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Identity readers ──────────────────────────────────────────────────────────

function readToken(): string {
  return (
    localStorage.getItem("axiom_jwt") ??
    localStorage.getItem("auth_token") ??
    localStorage.getItem("axiom_token") ??
    localStorage.getItem("smokecraft_token") ??
    ""
  );
}

export function getAffiliateVenueId(): string | null {
  const t = readToken();
  if (!t) return null;
  try { return (JSON.parse(atob(t.split(".")[1]!)) as { venueId?: string }).venueId ?? null; }
  catch { return null; }
}

export function getVenueDisplayName(): string {
  return localStorage.getItem("axiom_venue_name") ?? "This Venue";
}

export function buildGuestKey(): string {
  try {
    const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return "guest";
    const parsed = JSON.parse(raw) as {
      profile?: { firstName?: string; lastInitial?: string; phoneLast4?: string | null };
    };
    const p = parsed?.profile;
    if (!p) return "guest";
    return [p.firstName?.toLowerCase(), p.lastInitial?.toLowerCase(), p.phoneLast4]
      .filter(Boolean)
      .join("-") || "guest";
  } catch {
    return "guest";
  }
}

// ── Link builder ──────────────────────────────────────────────────────────────

export function buildAffiliateLink(baseUrl: string): string {
  const venueId  = getAffiliateVenueId();
  const guestKey = buildGuestKey();
  try {
    const url = new URL(baseUrl);
    if (venueId) url.searchParams.set("aff_id", venueId);
    url.searchParams.set("sub_id", guestKey);
    url.searchParams.set("source", "axiom_crafthub");
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ── Click logger (non-blocking) ───────────────────────────────────────────────

export async function logOutboundClick(
  pillarType: "DAYONE360_LEISURE" | "DAYONE360_CORP" | "WIFEX",
  staffId?: string,
): Promise<void> {
  const venueId  = getAffiliateVenueId();
  const guestKey = buildGuestKey();
  if (!venueId) return;
  try {
    await fetch(`${BASE}/api/referrals/log-click`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ venueId, guestKey, pillarType, staffId, source: "axiom_crafthub" }),
    });
  } catch {
    // Non-blocking — never interrupt the guest redirect
  }
}

// ── Cinematic outbound redirect ───────────────────────────────────────────────

export function handleOutboundRedirect(
  pillarType: "DAYONE360_LEISURE" | "DAYONE360_CORP" | "WIFEX",
  targetUrl:  string,
  staffId?:   string,
): void {
  void logOutboundClick(pillarType, staffId);
  window.open(buildAffiliateLink(targetUrl), "_blank", "noopener,noreferrer");
}
