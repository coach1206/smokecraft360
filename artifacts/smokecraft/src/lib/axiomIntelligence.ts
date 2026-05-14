/**
 * axiomIntelligence.ts — NOVEE OS Automated Intelligence Engine
 *
 * Deterministic rule engine that monitors venue signals and produces
 * typed TriggerEvent objects. No LLM calls. No network calls.
 *
 * Hybrid firing model:
 *   - LOW-RISK triggers (informational, content suggestions) → auto-fire
 *   - HIGH-IMPACT triggers (campaigns, guest alerts, inventory moves) → pending approval
 *
 * Consumers: AxiomIntelligenceContext (ticker), IntelligencePanel (UI)
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type TriggerSeverity = "info" | "opportunity" | "alert" | "critical";
export type TriggerCategory =
  | "traffic"
  | "loyalty"
  | "inventory"
  | "campaign"
  | "social"
  | "vip"
  | "recovery"
  | "atmosphere"
  | "event";

export type CampaignChannel =
  | "sms" | "email" | "push" | "instagram_post" | "instagram_story"
  | "facebook" | "member_alert" | "mentor_invite" | "reserve_alert";

export type TriggerFiringMode = "auto" | "approval_required";
export type TriggerStatus     = "pending" | "approved" | "dismissed" | "fired" | "skipped";

export interface TriggerAction {
  id:          string;
  label:       string;
  channel:     CampaignChannel;
  messageBody: string;
  cta:         string;
}

export interface TriggerEvent {
  id:          string;
  ruleId:      string;
  severity:    TriggerSeverity;
  category:    TriggerCategory;
  title:       string;
  insight:     string;
  rationale:   string;
  firingMode:  TriggerFiringMode;
  status:      TriggerStatus;
  actions:     TriggerAction[];
  firedAt:     string;
  autoFiredAt: string | null;
  metaScore:   number; // 0–100, revenue opportunity score
}

// ── Venue snapshot (derived from context data) ─────────────────────────────────

export interface VenueSnapshot {
  hourlyRevenue:    number[];        // indexed 0–23
  totalOrdersToday: number;
  lowStockCount:    number;
  outOfStockCount:  number;
  rewardConvRate:   number;          // 0–1
  activeGuests:     number;
  onlineDevices:    number;
  totalDevices:     number;
  hourOfDay:        number;          // 0–23
  dayOfWeek:        number;          // 0=Sun … 6=Sat
  campaignCount:    number;
  activeCampaigns:  number;
  avgOrderValue:    number;
  rewardTriggered:  number;
}

// ── Rule definitions ───────────────────────────────────────────────────────────

interface Rule {
  id:          string;
  category:    TriggerCategory;
  severity:    TriggerSeverity;
  firingMode:  TriggerFiringMode;
  cooldownMs:  number; // minimum ms between firings of same rule
  condition:   (snap: VenueSnapshot) => boolean;
  build:       (snap: VenueSnapshot) => Omit<TriggerEvent, "id" | "ruleId" | "firedAt" | "status" | "autoFiredAt" | "severity" | "category" | "firingMode">;
}

// ── Channel labels ─────────────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  sms:             "SMS",
  email:           "Email",
  push:            "Push",
  instagram_post:  "Instagram Post",
  instagram_story: "Instagram Story",
  facebook:        "Facebook",
  member_alert:    "Member Alert",
  mentor_invite:   "Mentor Invite",
  reserve_alert:   "Reserve Alert",
};

export const CHANNEL_COLOR: Record<CampaignChannel, string> = {
  sms:             "#22c55e",
  email:           "#60a5fa",
  push:            "#a78bfa",
  instagram_post:  "#f97316",
  instagram_story: "#ec4899",
  facebook:        "#3b82f6",
  member_alert:    "#D48B00",
  mentor_invite:   "#D48B00",
  reserve_alert:   "#34d399",
};

export const SEVERITY_COLOR: Record<TriggerSeverity, string> = {
  info:        "#60a5fa",
  opportunity: "#22c55e",
  alert:       "#f59e0b",
  critical:    "#ef4444",
};

export const SEVERITY_LABEL: Record<TriggerSeverity, string> = {
  info:        "Info",
  opportunity: "Opportunity",
  alert:       "Alert",
  critical:    "Critical",
};

export const CATEGORY_COLOR: Record<TriggerCategory, string> = {
  traffic:    "#60a5fa",
  loyalty:    "#34d399",
  inventory:  "#f97316",
  campaign:   "#ec4899",
  social:     "#a78bfa",
  vip:        "#D48B00",
  recovery:   "#fb923c",
  atmosphere: "#06b6d4",
  event:      "#D48B00",
};

// ── The Rules ─────────────────────────────────────────────────────────────────

export const INTELLIGENCE_RULES: Rule[] = [

  // ── Traffic rules ──────────────────────────────────────────────────────────

  {
    id:         "traffic.dead_period",
    category:   "traffic",
    severity:   "alert",
    firingMode: "approval_required",
    cooldownMs: 60 * 60 * 1000, // 1h
    condition: (s) => {
      // Dead period: < 3 orders AND prime hours (Thurs/Fri/Sat evening)
      const isPrime = s.dayOfWeek >= 4 && s.hourOfDay >= 18 && s.hourOfDay <= 23;
      return isPrime && s.totalOrdersToday < 3;
    },
    build: () => ({
      title:     "Traffic Below Thursday Baseline",
      insight:   "Order volume is below the expected Thursday evening pace. A Reserve Pairing Night push could recover $200–$400.",
      rationale: "Thursdays at 6–11 PM average 8+ orders. Current count is below threshold.",
      metaScore: 82,
      actions: [
        {
          id: "a1", label: "Launch Reserve Pairing Night",
          channel: "sms",
          messageBody: "Tonight at [Venue]: A hand-selected reserve pairing experience awaits. Limited seats — reserve yours now.",
          cta: "Reserve a Seat",
        },
        {
          id: "a2", label: "Post Atmosphere Story",
          channel: "instagram_story",
          messageBody: "Tonight's lounge is alive. Reserve pairings. Crafted experiences. Reserve your seat.",
          cta: "Swipe Up",
        },
      ],
    }),
  },

  {
    id:         "traffic.slow_hour_recovery",
    category:   "traffic",
    severity:   "opportunity",
    firingMode: "auto",
    cooldownMs: 2 * 60 * 60 * 1000, // 2h
    condition: (s) => {
      const isAfternoon = s.hourOfDay >= 14 && s.hourOfDay <= 17;
      const isQuiet     = s.totalOrdersToday < 2;
      return isAfternoon && isQuiet;
    },
    build: () => ({
      title:     "Afternoon Lull Detected",
      insight:   "Low order volume during afternoon hours. Auto-surfacing Happy Hour activation suggestion.",
      rationale: "2–5 PM is typically a dead period. A featured flight push has a 23% avg uplift.",
      metaScore: 61,
      actions: [
        {
          id: "a1", label: "Activate Happy Hour Promo",
          channel: "push",
          messageBody: "Tonight's flight is ready. Happy Hour: 4–7 PM. Come in and experience the lounge.",
          cta: "See What's On",
        },
      ],
    }),
  },

  {
    id:         "traffic.after_hours_push",
    category:   "atmosphere",
    severity:   "info",
    firingMode: "auto",
    cooldownMs: 24 * 60 * 60 * 1000, // 24h
    condition: (s) => s.hourOfDay >= 21 && s.totalOrdersToday > 5,
    build: () => ({
      title:     "After-Hours Momentum",
      insight:   "Strong evening energy. A late-night lounge post could extend dwell time and increase late revenue.",
      rationale: "Venues with late social posts see 15% longer dwell time on high-activity nights.",
      metaScore: 44,
      actions: [
        {
          id: "a1", label: "Post Late-Night Atmosphere",
          channel: "instagram_post",
          messageBody: "The evening is still alive at [Venue]. Cigars, spirits, and conversation — exactly as it should be.",
          cta: "Join the Energy",
        },
      ],
    }),
  },

  // ── Loyalty / Recovery rules ───────────────────────────────────────────────

  {
    id:         "loyalty.low_conversion",
    category:   "loyalty",
    severity:   "opportunity",
    firingMode: "approval_required",
    cooldownMs: 4 * 60 * 60 * 1000, // 4h
    condition: (s) => s.rewardConvRate < 0.15 && s.totalOrdersToday > 4,
    build: () => ({
      title:     "Loyalty Conversion Below Target",
      insight:   "Reward conversion is under 15% despite active orders. A member alert could re-engage loyalty tier guests.",
      rationale: "Guests with unredeemed points churn 2× faster. A reminder increases redemption by 38%.",
      metaScore: 68,
      actions: [
        {
          id: "a1", label: "Send Member Points Alert",
          channel: "member_alert",
          messageBody: "You have unclaimed rewards waiting at [Venue]. Visit this week to unlock your next tier.",
          cta: "Claim Your Rewards",
        },
        {
          id: "a2", label: "Email Loyalty Nudge",
          channel: "email",
          messageBody: "Your loyalty points are ready. [Name], you're just [X] points from [Tier]. Stop in this week.",
          cta: "See My Status",
        },
      ],
    }),
  },

  {
    id:         "recovery.vip_inactive",
    category:   "vip",
    severity:   "alert",
    firingMode: "approval_required",
    cooldownMs: 24 * 60 * 60 * 1000,
    condition: (s) => s.rewardTriggered === 0 && s.totalOrdersToday > 0 && s.dayOfWeek >= 2,
    build: () => ({
      title:     "VIP Engagement Gap Detected",
      insight:   "No loyalty rewards triggered today despite active orders. High-tier guests may be disengaging.",
      rationale: "VIP guests who don't earn rewards in a session are 3× more likely to shift venues.",
      metaScore: 75,
      actions: [
        {
          id: "a1", label: "Send Mentor Invitation",
          channel: "mentor_invite",
          messageBody: "Your mentor has a new selection waiting. An exclusive reserve has arrived — crafted for your palate.",
          cta: "See the Reserve",
        },
        {
          id: "a2", label: "Reserve Access Alert",
          channel: "reserve_alert",
          messageBody: "A private reserve session is open exclusively for [Name]. Your mentor is holding a seat.",
          cta: "Claim Access",
        },
      ],
    }),
  },

  {
    id:         "recovery.guest_win_back",
    category:   "recovery",
    severity:   "opportunity",
    firingMode: "approval_required",
    cooldownMs: 12 * 60 * 60 * 1000,
    condition: (s) => s.activeGuests === 0 && s.hourOfDay >= 16 && s.totalOrdersToday < 2,
    build: () => ({
      title:     "Guest Recovery Window Open",
      insight:   "No active guests during evening hours. A win-back push to lapsed members could recover traffic.",
      rationale: "Evening re-engagement messages sent at 4–6 PM see 34% higher open rates.",
      metaScore: 72,
      actions: [
        {
          id: "a1", label: "SMS Win-Back Campaign",
          channel: "sms",
          messageBody: "We've missed you at [Venue]. Tonight we have something special prepared — come back and experience it.",
          cta: "Reserve a Spot",
        },
        {
          id: "a2", label: "Email Re-Engagement",
          channel: "email",
          messageBody: "It's been a while. Your mentor has curated something worth returning for at [Venue].",
          cta: "See Tonight's Selection",
        },
      ],
    }),
  },

  // ── Inventory rules ────────────────────────────────────────────────────────

  {
    id:         "inventory.critical_out",
    category:   "inventory",
    severity:   "critical",
    firingMode: "auto",
    cooldownMs: 30 * 60 * 1000, // 30 min
    condition: (s) => s.outOfStockCount >= 2,
    build: (s) => ({
      title:     `${s.outOfStockCount} Products Out of Stock`,
      insight:   `${s.outOfStockCount} SKUs are unavailable. Auto-flagging for reorder and surfacing pairing alternatives.`,
      rationale: "Out-of-stock items directly suppress swipe recommendations and reduce order value.",
      metaScore: 91,
      actions: [
        {
          id: "a1", label: "Flag for Reorder",
          channel: "member_alert",
          messageBody: "Reorder alert: [X] products are currently out of stock. Vendor contact has been noted.",
          cta: "View Inventory",
        },
      ],
    }),
  },

  {
    id:         "inventory.stagnant_stock",
    category:   "inventory",
    severity:   "opportunity",
    firingMode: "approval_required",
    cooldownMs: 6 * 60 * 60 * 1000,
    condition: (s) => s.lowStockCount > 3 && s.activeCampaigns === 0,
    build: (s) => ({
      title:     "Stagnant Inventory — Pairing Push Recommended",
      insight:   `${s.lowStockCount} low-movement products detected with no active promotion. A mentor pairing campaign can clear stock without discounting.`,
      rationale: "Inventory tied to a mentor recommendation moves 2.4× faster than standalone promotions.",
      metaScore: 69,
      actions: [
        {
          id: "a1", label: "Launch Pairing Spotlight",
          channel: "instagram_post",
          messageBody: "Tonight's featured pairing: [Product] meets [Spirit]. Curated by your mentor. Available while it lasts.",
          cta: "Try the Pairing",
        },
        {
          id: "a2", label: "Member Alert — Limited Stock",
          channel: "member_alert",
          messageBody: "Limited quantities of a reserve selection are available tonight. Prioritized for members only.",
          cta: "Reserve Access",
        },
      ],
    }),
  },

  {
    id:         "inventory.low_stock_vip",
    category:   "vip",
    severity:   "opportunity",
    firingMode: "auto",
    cooldownMs: 4 * 60 * 60 * 1000,
    condition: (s) => s.lowStockCount >= 1 && s.lowStockCount < 4,
    build: () => ({
      title:     "Reserve Item Running Low — VIP Opportunity",
      insight:   "A low-stock item can be positioned as a premium exclusive to drive urgency among high-value guests.",
      rationale: "Scarcity framing increases perceived value and urgency. VIP guests respond 3× more than general messaging.",
      metaScore: 57,
      actions: [
        {
          id: "a1", label: "Reserve Society Alert",
          channel: "reserve_alert",
          messageBody: "A rare reserve is available for a limited time. As a Reserve Society member, you have first access.",
          cta: "Claim Access",
        },
      ],
    }),
  },

  // ── Social / Event rules ───────────────────────────────────────────────────

  {
    id:         "social.momentum",
    category:   "social",
    severity:   "opportunity",
    firingMode: "auto",
    cooldownMs: 3 * 60 * 60 * 1000,
    condition: (s) => s.activeGuests >= 3 && s.totalOrdersToday >= 5,
    build: (s) => ({
      title:     "Social Energy Rising",
      insight:   `${s.activeGuests} active guests and ${s.totalOrdersToday} orders. Auto-capturing tonight's atmosphere for a social post.`,
      rationale: "Posts made during active social periods see 2.8× more engagement than scheduled posts.",
      metaScore: 53,
      actions: [
        {
          id: "a1", label: "Post Atmosphere Story",
          channel: "instagram_story",
          messageBody: "Tonight the lounge is alive. Handcrafted experiences, curated blends, and the right atmosphere. Join us.",
          cta: "Come In Tonight",
        },
        {
          id: "a2", label: "Facebook Energy Post",
          channel: "facebook",
          messageBody: "The energy at [Venue] tonight is something special. Come experience it.",
          cta: "Join Tonight",
        },
      ],
    }),
  },

  {
    id:         "event.pairing_night",
    category:   "event",
    severity:   "opportunity",
    firingMode: "approval_required",
    cooldownMs: 48 * 60 * 60 * 1000, // 48h — don't repeat constantly
    condition: (s) => {
      const isFriday = s.dayOfWeek === 5;
      const isEarlyEvening = s.hourOfDay >= 15 && s.hourOfDay <= 18;
      return isFriday && isEarlyEvening && s.totalOrdersToday < 6;
    },
    build: () => ({
      title:     "Friday Pairing Night Opportunity",
      insight:   "Friday evening pre-traffic is lower than expected. A reserve pairing night push could fill the evening.",
      rationale: "Friday pairing events generate 3.2× the average order value of walk-in traffic.",
      metaScore: 88,
      actions: [
        {
          id: "a1", label: "SMS — Tonight's Pairing Night",
          channel: "sms",
          messageBody: "Tonight at [Venue]: a curated reserve pairing experience begins at 7 PM. Seats are limited.",
          cta: "Reserve Now",
        },
        {
          id: "a2", label: "Instagram Story — Live Lounge",
          channel: "instagram_story",
          messageBody: "This Friday. Curated reserve pairings. Crafted atmosphere. [Venue] — tonight only.",
          cta: "Swipe to Reserve",
        },
        {
          id: "a3", label: "Email — VIP First Access",
          channel: "email",
          messageBody: "As a valued member, you have first access to tonight's Reserve Pairing Night at [Venue].",
          cta: "Reserve My Seat",
        },
      ],
    }),
  },

  {
    id:         "campaign.no_active",
    category:   "campaign",
    severity:   "info",
    firingMode: "auto",
    cooldownMs: 8 * 60 * 60 * 1000,
    condition: (s) => s.activeCampaigns === 0 && s.campaignCount === 0,
    build: () => ({
      title:     "No Active Campaigns",
      insight:   "No promotions are currently running. Venues with at least one active campaign see 28% higher return visits.",
      rationale: "Passive venues lose 15–20% of their repeat traffic to competitors running active engagement.",
      metaScore: 48,
      actions: [
        {
          id: "a1", label: "Launch Quick Campaign",
          channel: "push",
          messageBody: "Your next favorite blend is waiting. Stop in this week and let your mentor guide the experience.",
          cta: "See What's On",
        },
      ],
    }),
  },

  // ── Atmosphere / ambient ───────────────────────────────────────────────────

  {
    id:         "atmosphere.featured_blend",
    category:   "atmosphere",
    severity:   "info",
    firingMode: "auto",
    cooldownMs: 24 * 60 * 60 * 1000,
    condition: (s) => s.hourOfDay >= 11 && s.hourOfDay <= 14,
    build: () => ({
      title:     "Daily Featured Blend Ready",
      insight:   "Midday is the optimal window to publish a featured blend post. Drives pre-evening reservation intent.",
      rationale: "Midday content posts see 31% higher save rates and correlate with 19% higher evening traffic.",
      metaScore: 41,
      actions: [
        {
          id: "a1", label: "Post Featured Blend",
          channel: "instagram_post",
          messageBody: "Today's featured blend: [Name]. Notes of cedar, dark cocoa, and a long, warm finish. Available tonight at [Venue].",
          cta: "Reserve a Tasting",
        },
      ],
    }),
  },

];

// ── Engine core ────────────────────────────────────────────────────────────────

let _ruleLastFired: Record<string, number> = {};

export function evaluateRules(
  snap:           VenueSnapshot,
  existingEvents: TriggerEvent[],
): TriggerEvent[] {
  const now      = Date.now();
  const newEvents: TriggerEvent[] = [];

  for (const rule of INTELLIGENCE_RULES) {
    // Cooldown check
    const lastFired = _ruleLastFired[rule.id] ?? 0;
    if (now - lastFired < rule.cooldownMs) continue;

    // Condition check
    if (!rule.condition(snap)) continue;

    // Don't duplicate active pending events for same rule
    const alreadyPending = existingEvents.some(
      e => e.ruleId === rule.id && (e.status === "pending" || e.status === "fired"),
    );
    if (alreadyPending) continue;

    // Build event
    const built = rule.build(snap);
    const event: TriggerEvent = {
      id:          `evt-${rule.id}-${now}`,
      ruleId:      rule.id,
      severity:    rule.severity,
      category:    rule.category,
      firingMode:  rule.firingMode,
      status:      rule.firingMode === "auto" ? "fired" : "pending",
      autoFiredAt: rule.firingMode === "auto" ? new Date().toISOString() : null,
      firedAt:     new Date().toISOString(),
      ...built,
    };

    newEvents.push(event);
    _ruleLastFired[rule.id] = now;
  }

  return newEvents;
}

export function buildVenueSnapshot(opts: {
  hourlyRevenue:  { hour: string; amount: number }[];
  orders:         { total: number; rewardApplied: boolean }[];
  products:       { stock: number }[];
  activeGuests:   number;
  onlineDevices:  number;
  totalDevices:   number;
  campaignCount:  number;
  activeCampaigns: number;
}): VenueSnapshot {
  const now    = new Date();
  const hour   = now.getHours();

  // Build indexed hourly revenue array [0..23]
  const hrArr  = new Array<number>(24).fill(0);
  for (const h of opts.hourlyRevenue) {
    const idx = parseInt(h.hour.replace(":00", ""), 10);
    if (!isNaN(idx) && idx >= 0 && idx < 24) hrArr[idx] = h.amount;
  }

  const totalOrdersToday = opts.orders.length;
  const rewardTriggered  = opts.orders.filter(o => o.rewardApplied).length;
  const rewardConvRate   = totalOrdersToday > 0 ? rewardTriggered / totalOrdersToday : 0;
  const avgOrderValue    = totalOrdersToday > 0
    ? opts.orders.reduce((s, o) => s + o.total, 0) / totalOrdersToday
    : 0;

  const outOfStockCount = opts.products.filter(p => p.stock === 0).length;
  const lowStockCount   = opts.products.filter(p => p.stock > 0 && p.stock <= 5).length;

  return {
    hourlyRevenue:    hrArr,
    totalOrdersToday,
    lowStockCount,
    outOfStockCount,
    rewardConvRate,
    activeGuests:     opts.activeGuests,
    onlineDevices:    opts.onlineDevices,
    totalDevices:     opts.totalDevices,
    hourOfDay:        hour,
    dayOfWeek:        now.getDay(),
    campaignCount:    opts.campaignCount,
    activeCampaigns:  opts.activeCampaigns,
    avgOrderValue,
    rewardTriggered,
  };
}

// ── Utility: reset cooldowns (for testing / demo) ──────────────────────────────

export function resetIntelligenceCooldowns() {
  _ruleLastFired = {};
}
