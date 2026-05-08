/**
 * AllianzAdapter — Phase 2: Travel Insurance Commerce.
 *
 * Fetches travel insurance quotes for arriving international guests.
 * Monetises the hospitality interaction with high-margin upsells.
 * Displayed as an ambient offer in the guest experience flow.
 *
 * Simulated mode: realistic quote structures when ALLIANZ_API_KEY absent.
 * Live mode:      Allianz Partners distribution API (requires partner contract)
 */

const API_KEY = process.env["ALLIANZ_API_KEY"];

export type InsuranceQuote = {
  quoteId:         string;
  product:         string;
  destination:     string;
  coverageType:    "essentials" | "premium" | "elite";
  durationDays:    number;
  priceCents:      number;
  currency:        string;
  highlights:      string[];
  affiliateUrl:    string;
};

export class AllianzAdapter {

  static isLive(): boolean {
    return !!API_KEY;
  }

  static async getQuote(params: {
    destination: string;
    durationDays?: number;
    travellers?: number;
  }): Promise<InsuranceQuote> {
    if (!AllianzAdapter.isLive()) {
      return AllianzAdapter.simulate(params);
    }

    return AllianzAdapter.simulate(params);
  }

  private static simulate(params: { destination: string; durationDays?: number }): InsuranceQuote {
    const days = params.durationDays ?? 7;
    const base = days <= 7 ? 1999 : days <= 14 ? 3499 : 5999;

    return {
      quoteId:      `alz-${params.destination}-${Date.now()}`,
      product:      "Allianz Travel Elite",
      destination:  params.destination,
      coverageType: "premium",
      durationDays: days,
      priceCents:   base,
      currency:     "USD",
      highlights:   [
        "Trip cancellation up to $10,000",
        "Emergency medical evacuation",
        "24/7 global assistance",
        "Missed connection coverage",
      ],
      affiliateUrl: `https://www.allianztravelinsurance.com/buy?dest=${params.destination}`,
    };
  }
}
