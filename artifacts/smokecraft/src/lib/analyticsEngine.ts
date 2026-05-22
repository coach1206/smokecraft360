import { SessionType } from "../contexts/NoveeGuestProfileContext";

export type AnalyticsEventType =
  | "phase_enter"
  | "phase_exit"
  | "quiz_answer"
  | "pairing_made"
  | "xp_change"
  | "merit_change"
  | "product_selected"
  | "blend_saved"
  | "session_start"
  | "session_end";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  phase: string;
  data: any;
  timestamp: number;
  sessionType: SessionType;
  venueId?: string;
}

const DEBUG_STORAGE_KEY = "novee_debug_analytics";
const LIVE_STORAGE_KEY = "novee_live_analytics";

export const trackEvent = async (event: AnalyticsEvent) => {
  const { sessionType } = event;
  const storageKey = sessionType === "live" ? LIVE_STORAGE_KEY : DEBUG_STORAGE_KEY;

  // Save to sessionStorage
  let events: AnalyticsEvent[] = [];
  try {
    const existingRaw = sessionStorage.getItem(storageKey);
    events = existingRaw ? JSON.parse(existingRaw) : [];
  } catch { /* storage blocked — Safari private mode */ }
  events.push(event);
  try { sessionStorage.setItem(storageKey, JSON.stringify(events)); } catch { /* storage blocked */ }

  // If live, POST to API
  if (sessionType === "live") {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.error("Failed to POST live analytics:", err);
    }
  }
};

export const getSessionAnalytics = (sessionType: SessionType): AnalyticsEvent[] => {
  const storageKey = sessionType === "live" ? LIVE_STORAGE_KEY : DEBUG_STORAGE_KEY;
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export interface ManufacturerReport {
  flavorTrends: Record<string, number>;
  regionalInterest: Record<string, number>;
  pairingSuccessRates: Record<string, number>;
  inventoryDemand: Record<string, number>;
  highPerformingProducts: string[];
}

export const buildManufacturerReport = (events: AnalyticsEvent[]): ManufacturerReport => {
  // Aggregation logic
  const report: ManufacturerReport = {
    flavorTrends: {},
    regionalInterest: {},
    pairingSuccessRates: {},
    inventoryDemand: {},
    highPerformingProducts: [],
  };

  events.forEach(e => {
    if (e.type === "product_selected") {
      const product = e.data.productName;
      report.inventoryDemand[product] = (report.inventoryDemand[product] || 0) + 1;
    }
    // Add more aggregation logic as needed
  });

  return report;
};

export interface VenueRevenueReport {
  cigarPurchases: number;
  drinkPurchases: number;
  foodPurchases: number;
  pairingCombinations: number;
  sessionDwellTime: number;
}

export const buildVenueRevenueReport = (events: AnalyticsEvent[]): VenueRevenueReport => {
  const report: VenueRevenueReport = {
    cigarPurchases: 0,
    drinkPurchases: 0,
    foodPurchases: 0,
    pairingCombinations: 0,
    sessionDwellTime: 0,
  };

  events.forEach(e => {
    if (e.type === "pairing_made") {
      report.pairingCombinations++;
      if (e.data.cigar) report.cigarPurchases++;
      if (e.data.drink) report.drinkPurchases++;
      if (e.data.food) report.foodPurchases++;
    }
  });

  return report;
};
