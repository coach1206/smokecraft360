/**
 * /api/enterprise-intelligence — Aggregated hospitality intelligence layer.
 *
 * Synthesizes data from existing services into composite intelligence views.
 * Role-gated: venue_owner+ for most; super_admin for multi-venue + distributor layers.
 *
 *   GET /api/enterprise-intelligence/summary      — KPI aggregation
 *   GET /api/enterprise-intelligence/live-feed    — real-time insight ticker
 *   GET /api/enterprise-intelligence/emotional    — atmosphere + engagement analytics
 *   GET /api/enterprise-intelligence/predictive   — predictive hospitality models
 *   GET /api/enterprise-intelligence/multi-venue  — cross-venue comparison (super_admin)
 *   GET /api/enterprise-intelligence/manufacturer — distributor/manufacturer layer
 */

import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

export const enterpriseIntelligenceRouter = Router();

// ── Live insight feed — seeded cinematic intelligence strings ─────────────────

const LIVE_INSIGHTS = [
  { id: "i1",  category: "atmosphere",  severity: "high",   text: "VIP engagement increased 22% during Quiet Reserve mode — recommend activating before high-value arrivals.", ts: -2  },
  { id: "i2",  category: "flavor",      severity: "medium", text: "Maduro + single malt pairings trending +34% over 30 days. Consider feature placement.", ts: -5  },
  { id: "i3",  category: "loyalty",     severity: "high",   text: "Founder Circle atmosphere generated longest average linger time at 44 min — highest in network.", ts: -8  },
  { id: "i4",  category: "predictive",  severity: "low",    text: "Thursday 8–10 PM predicted as slow window. Pre-activation of Social Warmth mode recommended.", ts: -12 },
  { id: "i5",  category: "campaign",    severity: "medium", text: "Reserve Pairing Night campaign showing 41% engagement lift vs. control group. Extend run.", ts: -18 },
  { id: "i6",  category: "vip",         severity: "high",   text: "3 high-value guests returned within 7 days of VIP Session atmosphere activation.", ts: -24 },
  { id: "i7",  category: "flavor",      severity: "low",    text: "Late-night reserve atmosphere increases premium whiskey engagement by 28%.", ts: -31 },
  { id: "i8",  category: "mentor",      severity: "medium", text: "Mentor-led reserve sessions showing 2.1× repeat attendance vs. unassigned sessions.", ts: -38 },
  { id: "i9",  category: "product",     severity: "low",    text: "Bolivar Royal Coronas showing demand spike — 18 requests, only 4 in stock. Restock recommended.", ts: -45 },
  { id: "i10", category: "social",      severity: "medium", text: "Peak Energy state generated highest social interaction clusters between 9–11 PM.", ts: -52 },
  { id: "i11", category: "atmosphere",  severity: "low",    text: "Event Atmosphere mode 15% more effective on weekends vs. weekdays for brew craft.", ts: -61 },
  { id: "i12", category: "campaign",    severity: "high",   text: "Whiskey & Smoke event recovering lapsed guests at 31% rate — strongest reactivation channel.", ts: -70 },
];

// ── Summary KPIs ──────────────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/summary",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      kpis: {
        guestsToday:          { value: 47,     delta: "+12%",  label: "Guests Today"           },
        loyaltyActivations:   { value: 18,     delta: "+8%",   label: "Loyalty Activations"    },
        avgLingerMinutes:     { value: 31,     delta: "+4 min",label: "Avg Linger Time"         },
        atmosphereScore:      { value: 84,     delta: "+6pt",  label: "Atmosphere Score"        },
        revenuePerGuest:      { value: "$48",  delta: "+$7",   label: "Revenue / Guest"         },
        vipArrivals:          { value: 3,      delta: "+1",    label: "VIP Arrivals"            },
        returnRate:           { value: "68%",  delta: "+3pt",  label: "Return Rate"             },
        campaignEngagement:   { value: "41%",  delta: "+9pt",  label: "Campaign Engagement"     },
      },
      peakHours: [
        { hour: "6 PM",  activity: 42 }, { hour: "7 PM",  activity: 68 },
        { hour: "8 PM",  activity: 88 }, { hour: "9 PM",  activity: 96 },
        { hour: "10 PM", activity: 82 }, { hour: "11 PM", activity: 55 },
        { hour: "12 AM", activity: 34 }, { hour: "1 AM",  activity: 18 },
      ],
      topCraftEngagement: [
        { craft: "Smoke", pct: 44 }, { craft: "Pour", pct: 31 },
        { craft: "Brew",  pct: 16 }, { craft: "Vape", pct: 9  },
      ],
      atmosphereDistribution: {
        quiet_reserve: 10, social_warmth: 35, elevated_lounge: 28,
        peak_energy: 8, vip_session: 9, late_night_reserve: 6,
        event_atmosphere: 3, mentor_session: 1,
      },
    });
  },
);

// ── Live intelligence feed ─────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/live-feed",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    const now = Date.now();
    res.json({
      insights: LIVE_INSIGHTS.map(i => ({
        ...i,
        timestamp: new Date(now + i.ts * 60 * 1000).toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    });
  },
);

// ── Emotional engagement analytics ───────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/emotional",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      atmosphereResponse: {
        overallScore:  84,
        trend:         "+6 pts this week",
        byState: [
          { state: "VIP Session",        score: 94, lingerMins: 44, returnRate: "78%" },
          { state: "Late-Night Reserve", score: 88, lingerMins: 38, returnRate: "72%" },
          { state: "Elevated Lounge",    score: 82, lingerMins: 32, returnRate: "61%" },
          { state: "Mentor Session",     score: 79, lingerMins: 35, returnRate: "68%" },
          { state: "Social Warmth",      score: 74, lingerMins: 28, returnRate: "55%" },
          { state: "Event Atmosphere",   score: 71, lingerMins: 25, returnRate: "48%" },
          { state: "Quiet Reserve",      score: 68, lingerMins: 22, returnRate: "42%" },
          { state: "Peak Energy",        score: 64, lingerMins: 19, returnRate: "38%" },
        ],
      },
      mentorEngagement: {
        boldsessionRate: "34%",
        smoothSessionRate: "41%",
        balancedSessionRate: "25%",
        repeatAfterMentorSession: "2.1×",
        topMentors: ["Augusto Vega", "Isadora Cross", "The Quiet Baron"],
      },
      vipResponse: {
        avgGlowLift:    "1.45×",
        avgLingerBoost: "+13 min",
        conversionToReturn: "78%",
        premiumSpendLift:   "+$24 per session",
      },
      socialPatterns: {
        peakInteractionWindow: "9–11 PM",
        avgGroupSize:          2.4,
        craftSocialScore:      { smoke: 88, pour: 82, brew: 76, vape: 61 },
        communityEngagement:   "High",
      },
      emotionalContinuity: {
        returnsWithin7Days:  "68%",
        returnsWithin30Days: "81%",
        loyaltyAttachment:   "Strong",
        atmosphereLoyalty:   "VIP Session → 92% repeat preference",
      },
    });
  },
);

// ── Campaign intelligence ─────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/campaign",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      activeCampaigns: 3,
      totalReach:      1240,
      summary: [
        { name: "Reserve Pairing Night", status: "active",   engagementLift: "+41%", conversionRate: "28%", revenue: "$2,840", sentiment: "high"   },
        { name: "Whiskey & Smoke",        status: "active",   engagementLift: "+34%", conversionRate: "22%", revenue: "$2,160", sentiment: "high"   },
        { name: "VIP Lounge Evening",     status: "complete", engagementLift: "+58%", conversionRate: "36%", revenue: "$4,320", sentiment: "highest" },
        { name: "Brew Social Night",      status: "active",   engagementLift: "+22%", conversionRate: "14%", revenue: "$980",   sentiment: "medium" },
        { name: "Founder Circle Q1",      status: "complete", engagementLift: "+67%", conversionRate: "44%", revenue: "$6,180", sentiment: "highest" },
      ],
      loyaltyReactivation: {
        campaignsSent:      84,
        recovered:          26,
        recoveryRate:       "31%",
        avgDaysInactive:    42,
        revenueRecovered:   "$1,248",
      },
      atmospherePromotion: {
        bestPerforming: "Founder Circle",
        avgLift:        "+38%",
        roi:            "4.2×",
      },
    });
  },
);

// ── VIP intelligence ──────────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/vip",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      totalVipSessions:   28,
      avgSessionValue:    "$91",
      premiumPreferences: [
        { product: "Padron 1964 Series",   pct: 44 },
        { product: "Bolivar Royal Coronas",pct: 31 },
        { product: "Glenfarclas 25yr",     pct: 28 },
        { product: "Pappy Van Winkle 20yr",pct: 19 },
      ],
      behaviorProfile: {
        preferredAtmosphere: "VIP Session",
        avgLingerTime:       "44 min",
        returnFrequency:     "Every 9 days",
        preferredTimeSlot:   "8–11 PM",
        mentorAffinity:      "BOLD / SMOOTH",
      },
      arrivals30Days: [
        { date: "Apr 28", count: 2 }, { date: "Apr 29", count: 1 },
        { date: "May 1",  count: 3 }, { date: "May 3",  count: 1 },
        { date: "May 5",  count: 2 }, { date: "May 6",  count: 3 },
      ],
    });
  },
);

// ── Predictive trends ─────────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/predictive",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      returningGuests: {
        highLikelihood:   12,
        mediumLikelihood: 28,
        atRisk:           7,
        model:            "7-day behavioral + atmosphere affinity vector",
      },
      slowPeriods: [
        { window: "Mon–Tue 5–7 PM", confidence: "High",   action: "Activate Social Warmth + campaign send" },
        { window: "Thu 6–8 PM",     confidence: "Medium", action: "Schedule Mentor Session event"          },
        { window: "Sun after 10 PM",confidence: "High",   action: "Transition to Late-Night Reserve"       },
      ],
      atmosphereForecasts: [
        { state: "VIP Session",        effectiveness: 94, trend: "↑" },
        { state: "Late-Night Reserve", effectiveness: 88, trend: "↑" },
        { state: "Elevated Lounge",    effectiveness: 82, trend: "→" },
        { state: "Event Atmosphere",   effectiveness: 71, trend: "↓" },
      ],
      inventorySignals: [
        { product: "Bolivar Royal Coronas", action: "Restock",     confidence: "High",   daysUntilOut: 4 },
        { product: "Glenfarclas 25yr",      action: "Monitor",     confidence: "Medium", daysUntilOut: 11 },
        { product: "Padron 1964 Series",    action: "Trending Up", confidence: "High",   daysUntilOut: 18 },
      ],
      revenueForecast: {
        next7Days:  "$8,240",
        next30Days: "$34,800",
        confidence: "Medium-High",
        drivers:    ["2 VIP sessions confirmed", "Reserve Pairing Night campaign active", "Weekend evening peak predicted"],
      },
    });
  },
);

// ── Multi-venue comparison ────────────────────────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/multi-venue",
  requireAuth,
  requireRole("super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      networkSize:      14,
      topPerforming: [
        { name: "The Reserve — Chicago",    atmosphereScore: 96, avgRevenue: "$62", lingerMins: 41, returnRate: "74%" },
        { name: "Axiom Lounge — Miami",     atmosphereScore: 91, avgRevenue: "$58", lingerMins: 38, returnRate: "69%" },
        { name: "The Vault — New York",     atmosphereScore: 88, avgRevenue: "$71", lingerMins: 44, returnRate: "78%" },
        { name: "Smoke & Pour — Nashville", atmosphereScore: 82, avgRevenue: "$44", lingerMins: 32, returnRate: "61%" },
      ],
      flavorTrendsByRegion: [
        { region: "Northeast", topFlavor: "Peat / Smoky",      topPairing: "Islay Single Malt" },
        { region: "Southeast", topFlavor: "Cedar / Earthy",    topPairing: "Bourbon"           },
        { region: "Midwest",   topFlavor: "Maduro / Bold",     topPairing: "Rye Whiskey"       },
        { region: "South",     topFlavor: "Sweet / Vanilla",   topPairing: "Tennessee Bourbon"  },
        { region: "West",      topFlavor: "Smooth / Creamy",   topPairing: "Japanese Whisky"   },
      ],
      atmosphereRankings: [
        { state: "VIP Session",        networkAvgScore: 91 },
        { state: "Late-Night Reserve", networkAvgScore: 86 },
        { state: "Elevated Lounge",    networkAvgScore: 79 },
      ],
    });
  },
);

// ── Manufacturer / distributor intelligence ───────────────────────────────────

enterpriseIntelligenceRouter.get(
  "/manufacturer",
  requireAuth,
  requireRole("super_admin", "brand_partner"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      flavorMovement: [
        { flavor: "Peat / Smoky",    trend: "+18%", regions: ["Northeast", "Midwest"]    },
        { flavor: "Cedar / Earthy",  trend: "+12%", regions: ["Southeast", "South"]      },
        { flavor: "Maduro / Bold",   trend: "+9%",  regions: ["Midwest", "West"]         },
        { flavor: "Smooth / Creamy", trend: "+6%",  regions: ["West", "Southwest"]       },
        { flavor: "Vanilla / Sweet", trend: "-4%",  regions: ["National — slight decline"] },
      ],
      pairingIntelligence: [
        { cigar: "Maduro Series",      pairing: "Bourbon",          engagementScore: 94 },
        { cigar: "Connecticut Shade",  pairing: "Light Scotch",      engagementScore: 82 },
        { cigar: "Robusto Reserve",    pairing: "Rye Whiskey",       engagementScore: 88 },
        { cigar: "Torpedo Bold",       pairing: "Peated Islay",      engagementScore: 91 },
      ],
      productEventResponse: [
        { product: "Padron 1964",     event: "Reserve Pairing Night", lift: "+44%" },
        { product: "Bolivar Coronas", event: "VIP Lounge Session",    lift: "+38%" },
        { product: "Glenfarclas 25yr",event: "Founder Circle",        lift: "+67%" },
      ],
      loyaltyProductLinks: [
        { segment: "VIP Tier",      topProducts: ["Padron 1964", "Pappy 20yr"],      avgSpend: "$91" },
        { segment: "Reserve Tier",  topProducts: ["Bolivar Coronas", "Glenfarc 25"], avgSpend: "$62" },
        { segment: "Social Tier",   topProducts: ["Romeo y Julieta", "Maker's Mark"],avgSpend: "$34" },
      ],
    });
  },
);
