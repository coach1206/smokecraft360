/**
 * axiomPresenceEngine.ts — Axiom Presence Engine
 *
 * Deterministic data layer for the Presence Engine.
 * Handles: guest profiles, geofence state, arrival triggers,
 * session continuity, wallet passes, mentor greetings, presence intelligence.
 *
 * NO real geolocation. Uses browser Geolocation API with permission opt-in.
 * Wallet passes are UI stubs — real issuance needs server-side certificates.
 * All data is deterministic. No LLM calls.
 */

import type { GuestProfile, Mentor } from "@/contexts/GuestProfileContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PresenceStatus = "away" | "nearby" | "arrived" | "seated" | "departing";
export type VipTier        = "standard" | "member" | "reserve" | "founder";
export type ArrivalTrigger =
  | "geofence_enter"
  | "wifi_reconnect"
  | "wallet_scan"
  | "manual_check_in"
  | "staff_confirm";

export type PresenceAction =
  | "sms_welcome"
  | "mentor_greeting"
  | "reserve_invite"
  | "atmosphere_preload"
  | "event_invite"
  | "loyalty_bonus"
  | "pairing_suggestion"
  | "host_alert";

export interface GeofenceConfig {
  lat:        number;
  lng:        number;
  radiusM:    number; // meters
  venueName:  string;
}

export interface PresenceGuest {
  id:               string;
  firstName:        string;
  lastInitial:      string;
  phoneLast4:       string | null;
  vipTier:          VipTier;
  mentorId:         string | null;
  mentorName:       string | null;
  atmospherePref:   string | null;
  boldnessPref:     string | null;
  flavorTags:       string[];
  visitCount:       number;
  lastVisitAt:      string | null; // ISO
  loyaltyPoints:    number;
  savedBlends:      string[];
  activeReservation: string | null;
  optedIntoPresence: boolean;
  status:           PresenceStatus;
  arrivedAt:        string | null;
  trigger:          ArrivalTrigger | null;
}

export interface ArrivalEvent {
  id:           string;
  guestId:      string;
  guestName:    string;
  vipTier:      VipTier;
  trigger:      ArrivalTrigger;
  arrivedAt:    string;
  mentorGreeting: string | null;
  actionsTriggered: PresenceAction[];
  atmospherePreload: string | null;
  pairingSuggestion: string | null;
  loyaltyBonus:  number;
  acknowledged:  boolean;
  dismissed:     boolean;
}

export interface WalletPass {
  guestId:    string;
  guestName:  string;
  vipTier:    VipTier;
  mentorName: string | null;
  passCode:   string;
  loyaltyPoints: number;
  memberSince: string;
  benefits:   string[];
  qrData:     string;
  primaryColor: string;
  accentColor:  string;
}

export interface PresenceSession {
  guestId:      string;
  sessionStart: string;
  savedBlend:   string | null;
  lastPairing:  string | null;
  atmosphereSet: string | null;
  mentorNote:   string | null;
  resumable:    boolean;
}

export interface PresenceIntelligence {
  topReturnHour:   number;
  topReturnDay:    string;
  avgVisitFreqDays: number;
  vipArrivalRate:  number; // 0–1
  loyaltyActivationRate: number;
  peakPresenceHour: number;
  socialDensityScore: number;
  guestRetentionRate: number;
  geofenceOptInRate: number;
}

// ── VIP tier config ────────────────────────────────────────────────────────────

export const VIP_TIER_CONFIG: Record<VipTier, {
  label: string; color: string; bgColor: string; benefits: string[];
}> = {
  standard: {
    label:    "Member",
    color:    "#60a5fa",
    bgColor:  "rgba(96,165,250,0.10)",
    benefits: ["Loyalty points", "Swipe experience access", "Session memory"],
  },
  member: {
    label:    "Club Member",
    color:    "#34d399",
    bgColor:  "rgba(52,211,153,0.10)",
    benefits: ["Priority seating", "Monthly pairing credit", "Mentor access", "Event first look"],
  },
  reserve: {
    label:    "Reserve Society",
    color:    "#c9a84c",
    bgColor:  "rgba(201,168,76,0.12)",
    benefits: ["Reserve access", "Private events", "Dedicated mentor", "Cellar allocation"],
  },
  founder: {
    label:    "Founder Circle",
    color:    "#d4af37",
    bgColor:  "rgba(212,175,55,0.14)",
    benefits: ["Lifetime reserve access", "Founding pricing locked", "Private sessions", "Venue co-creation"],
  },
};

export const TRIGGER_LABEL: Record<ArrivalTrigger, string> = {
  geofence_enter: "Geofence Arrival",
  wifi_reconnect: "WiFi Reconnect",
  wallet_scan:    "Wallet Scan",
  manual_check_in: "Manual Check-In",
  staff_confirm:  "Staff Confirmed",
};

export const TRIGGER_COLOR: Record<ArrivalTrigger, string> = {
  geofence_enter:  "#22c55e",
  wifi_reconnect:  "#60a5fa",
  wallet_scan:     "#c9a84c",
  manual_check_in: "#a78bfa",
  staff_confirm:   "#34d399",
};

export const ACTION_LABEL: Record<PresenceAction, string> = {
  sms_welcome:       "SMS Welcome",
  mentor_greeting:   "Mentor Greeting",
  reserve_invite:    "Reserve Invite",
  atmosphere_preload:"Atmosphere Preload",
  event_invite:      "Event Invite",
  loyalty_bonus:     "Loyalty Bonus",
  pairing_suggestion:"Pairing Suggestion",
  host_alert:        "Host Alert",
};

// ── Mentor arrival greeting generator ─────────────────────────────────────────

const MENTOR_GREETINGS: Record<string, string[]> = {
  warm: [
    "Your preferred atmosphere is already being prepared.",
    "A reserve Maduro pairing aligns with your profile tonight.",
    "You left a Nicaraguan blend unfinished last session — it's been held.",
    "Your palate history suggests tonight's reserve selection is a strong match.",
    "A slow-burning cedar blend has arrived since your last visit.",
  ],
  bold: [
    "The reserve room is open. Your profile unlocks access tonight.",
    "A full-bodied Ligero arrived yesterday. Your mentor noted your affinity.",
    "Bold and complex tonight — the new reserve shipment matches your last three sessions.",
    "Your loyalty tier has unlocked the new cellar allocation.",
    "Tonight's feature was selected with guests like you in mind.",
  ],
  smooth: [
    "A lighter pairing evening is underway — your preferred atmosphere.",
    "The lounge has your usual atmosphere configured.",
    "A Connecticut Shade selection arrived — smooth and complex, as you prefer.",
    "Your mentor prepared a milder flight for your return visit.",
    "The evening's atmosphere matches your preference for calm and refined.",
  ],
  balanced: [
    "Welcome back. Your session continuity has been restored.",
    "Your profile was recognized. Tonight's selection aligns with your history.",
    "A curated pairing is waiting — built from your flavor history.",
    "Your mentor noted your last visit preferences. Tonight continues where you left off.",
    "Recognition confirmed. The lounge is ready for you.",
  ],
};

export function buildMentorGreeting(guest: PresenceGuest, mentor: Mentor | null): string {
  const style = mentor?.style ?? "balanced";
  const pool  = MENTOR_GREETINGS[style] ?? MENTOR_GREETINGS.balanced;
  // Deterministic pick based on guest ID + day of week
  const idx   = (guest.id.charCodeAt(0) + new Date().getDay()) % pool.length;
  return pool[idx];
}

// ── Arrival trigger resolver ───────────────────────────────────────────────────

export function resolveArrivalActions(guest: PresenceGuest): PresenceAction[] {
  const actions: PresenceAction[] = ["host_alert"];

  if (guest.vipTier === "reserve" || guest.vipTier === "founder") {
    actions.push("reserve_invite");
  }
  if (guest.mentorId) {
    actions.push("mentor_greeting");
  }
  if (guest.atmospherePref) {
    actions.push("atmosphere_preload");
  }
  if (guest.visitCount > 1) {
    actions.push("sms_welcome");
  }
  if (guest.loyaltyPoints > 50) {
    actions.push("loyalty_bonus");
  }
  if (guest.flavorTags.length > 0) {
    actions.push("pairing_suggestion");
  }

  return actions;
}

// ── Pairing suggestion ────────────────────────────────────────────────────────

const PAIRING_BY_BOLDNESS: Record<string, string> = {
  bold:   "Full-bodied Ligero with aged single malt — cedar finish, long and warm.",
  medium: "Medium-bodied Habano with an añejo rum — honey notes, smooth transition.",
  light:  "Connecticut Shade with chilled Prosecco — bright finish, delicate.",
  default:"Reserve Maduro with bourbon — classic, reliable, warm.",
};

export function buildPairingSuggestion(guest: PresenceGuest): string {
  const b = guest.boldnessPref?.toLowerCase() ?? "default";
  return PAIRING_BY_BOLDNESS[b] ?? PAIRING_BY_BOLDNESS.default;
}

// ── Wallet pass builder ────────────────────────────────────────────────────────

const TIER_COLORS: Record<VipTier, { primary: string; accent: string }> = {
  standard: { primary: "#1e3a5f", accent: "#60a5fa" },
  member:   { primary: "#1a3a2e", accent: "#34d399" },
  reserve:  { primary: "#2a1f0a", accent: "#c9a84c" },
  founder:  { primary: "#1a1400", accent: "#d4af37" },
};

export function buildWalletPass(guest: PresenceGuest, mentor: Mentor | null): WalletPass {
  const { primary, accent } = TIER_COLORS[guest.vipTier];
  const cfg = VIP_TIER_CONFIG[guest.vipTier];
  return {
    guestId:      guest.id,
    guestName:    `${guest.firstName} ${guest.lastInitial}.`,
    vipTier:      guest.vipTier,
    mentorName:   guest.mentorName ?? mentor?.name ?? null,
    passCode:     `SC-${guest.id.slice(0, 4).toUpperCase()}-${guest.phoneLast4 ?? "0000"}`,
    loyaltyPoints: guest.loyaltyPoints,
    memberSince:  guest.lastVisitAt
      ? new Date(guest.lastVisitAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "New Member",
    benefits:     cfg.benefits,
    qrData:       `AXIOM:${guest.id}:${guest.vipTier}`,
    primaryColor: primary,
    accentColor:  accent,
  };
}

// ── Presence intelligence builder ─────────────────────────────────────────────

export function buildPresenceIntelligence(guests: PresenceGuest[]): PresenceIntelligence {
  const opted    = guests.filter(g => g.optedIntoPresence);
  const arrived  = guests.filter(g => g.arrivedAt != null);
  const vips     = arrived.filter(g => g.vipTier !== "standard");
  const loyal    = arrived.filter(g => g.loyaltyPoints > 0);

  // Deterministic stats from guest data
  const totalVisits = guests.reduce((s, g) => s + g.visitCount, 0);
  const avgFreq     = guests.length > 0 ? Math.round(totalVisits / guests.length) : 0;

  return {
    topReturnHour:        19, // 7 PM — most common arrival from seed data
    topReturnDay:         "Friday",
    avgVisitFreqDays:     avgFreq,
    vipArrivalRate:       arrived.length > 0 ? vips.length / arrived.length : 0,
    loyaltyActivationRate: arrived.length > 0 ? loyal.length / arrived.length : 0,
    peakPresenceHour:     20,
    socialDensityScore:   Math.min(100, guests.length * 8),
    guestRetentionRate:   guests.filter(g => g.visitCount > 1).length / Math.max(guests.length, 1),
    geofenceOptInRate:    opted.length / Math.max(guests.length, 1),
  };
}

// ── Seed guest profiles (realistic demo data) ──────────────────────────────────

export function buildSeedGuests(): PresenceGuest[] {
  const now = new Date().toISOString();
  return [
    {
      id: "g-001", firstName: "Marcus", lastInitial: "T", phoneLast4: "4827",
      vipTier: "reserve", mentorId: "m-01", mentorName: "Juan Valez",
      atmospherePref: "classic", boldnessPref: "bold",
      flavorTags: ["cedar", "leather", "cocoa"],
      visitCount: 14, lastVisitAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      loyaltyPoints: 840, savedBlends: ["Cohiba Behike 52", "Liga Privada No. 9"],
      activeReservation: "Reserve Session — Fri 8PM",
      optedIntoPresence: true, status: "nearby",
      arrivedAt: null, trigger: null,
    },
    {
      id: "g-002", firstName: "Priya", lastInitial: "S", phoneLast4: "3391",
      vipTier: "founder", mentorId: "m-03", mentorName: "Reina Cortez",
      atmospherePref: "elevated", boldnessPref: "medium",
      flavorTags: ["vanilla", "caramel", "oak"],
      visitCount: 31, lastVisitAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      loyaltyPoints: 2200, savedBlends: ["Arturo Fuente OpusX", "Padrón 1964"],
      activeReservation: null,
      optedIntoPresence: true, status: "arrived",
      arrivedAt: new Date(Date.now() - 12 * 60000).toISOString(), trigger: "geofence_enter",
    },
    {
      id: "g-003", firstName: "Devon", lastInitial: "K", phoneLast4: "7740",
      vipTier: "member", mentorId: "m-02", mentorName: "Sebastián Mora",
      atmospherePref: "relaxed", boldnessPref: "light",
      flavorTags: ["smooth", "honey", "wheat"],
      visitCount: 6, lastVisitAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      loyaltyPoints: 310, savedBlends: ["Montecristo White"],
      activeReservation: null,
      optedIntoPresence: true, status: "seated",
      arrivedAt: new Date(Date.now() - 45 * 60000).toISOString(), trigger: "wifi_reconnect",
    },
    {
      id: "g-004", firstName: "Camille", lastInitial: "R", phoneLast4: "2219",
      vipTier: "reserve", mentorId: "m-04", mentorName: "Lila Ashford",
      atmospherePref: "bold", boldnessPref: "bold",
      flavorTags: ["tobacco", "leather", "earth"],
      visitCount: 9, lastVisitAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      loyaltyPoints: 670, savedBlends: ["Davidoff Yamasa"],
      activeReservation: "Cellar Tasting — Tonight",
      optedIntoPresence: true, status: "away",
      arrivedAt: null, trigger: null,
    },
    {
      id: "g-005", firstName: "Elias", lastInitial: "M", phoneLast4: "5583",
      vipTier: "standard", mentorId: null, mentorName: null,
      atmospherePref: "classic", boldnessPref: "medium",
      flavorTags: ["cedar", "vanilla"],
      visitCount: 2, lastVisitAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      loyaltyPoints: 80, savedBlends: [],
      activeReservation: null,
      optedIntoPresence: false, status: "away",
      arrivedAt: null, trigger: null,
    },
    {
      id: "g-006", firstName: "Nadia", lastInitial: "V", phoneLast4: "9912",
      vipTier: "member", mentorId: "m-01", mentorName: "Juan Valez",
      atmospherePref: "elevated", boldnessPref: "light",
      flavorTags: ["floral", "light", "citrus"],
      visitCount: 5, lastVisitAt: now,
      loyaltyPoints: 230, savedBlends: ["Romeo y Julieta Reserve"],
      activeReservation: null,
      optedIntoPresence: true, status: "arrived",
      arrivedAt: new Date(Date.now() - 3 * 60000).toISOString(), trigger: "wallet_scan",
    },
  ];
}

// ── Geofence distance calculator (Haversine) ───────────────────────────────────

export function haversineDistanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6371000; // Earth radius in metres
  const d1 = (lat2 - lat1) * Math.PI / 180;
  const d2 = (lng2 - lng1) * Math.PI / 180;
  const a  =
    Math.sin(d1 / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(d2 / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
