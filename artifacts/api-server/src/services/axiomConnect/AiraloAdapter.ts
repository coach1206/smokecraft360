/**
 * AiraloAdapter — Phase 2: eSIM Commerce.
 *
 * Fetches eSIM data plan offers for international guests.
 * Cross-domain upsell: arriving guests need connectivity → Airalo eSIM.
 * Integrated into the SPIRITS and CIGAR modules as ambient offer cards.
 *
 * Simulated mode: realistic regional offers when AIRALO_API_KEY is absent.
 * Live mode:      https://partners.airalo.com (OAuth2 partner API)
 */

const API_KEY = process.env["AIRALO_API_KEY"];
const BASE    = "https://partners.airalo.com/v1";

export type EsimOffer = {
  id:            string;
  operator:      string;
  countryCode:   string;
  dataGb:        number;
  validityDays:  number;
  priceCents:    number;
  currency:      string;
  networkType:   "4G" | "5G";
  featured:      boolean;
};

export class AiraloAdapter {

  static isLive(): boolean {
    return !!API_KEY;
  }

  static async getOffers(countryCode: string): Promise<EsimOffer[]> {
    if (!AiraloAdapter.isLive()) {
      return AiraloAdapter.simulate(countryCode);
    }

    const url = `${BASE}/packages?filter[country]=${countryCode}&limit=6`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal:  AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Airalo ${res.status}`);

    const json = await res.json() as { data?: unknown[] };
    return (json.data ?? []).slice(0, 6).map((pkg: unknown) => {
      const p = pkg as Record<string, unknown>;
      return {
        id:           String(p["id"] ?? ""),
        operator:     String(p["operator_title"] ?? p["title"] ?? ""),
        countryCode,
        dataGb:       Number(p["data"]    ?? 1),
        validityDays: Number(p["validity"] ?? 7),
        priceCents:   Math.round(Number(p["price"] ?? 9.99) * 100),
        currency:     "USD",
        networkType:  "5G" as const,
        featured:     false,
      };
    });
  }

  private static simulate(countryCode: string): EsimOffer[] {
    const operators = ["Airalo Global", "Holafly", "Nomad", "Saily"];
    return [1, 3, 5, 10].map((gb, i) => ({
      id:           `sim-${countryCode}-${gb}gb`,
      operator:     operators[i % operators.length]!,
      countryCode,
      dataGb:       gb,
      validityDays: [7, 14, 30, 30][i]!,
      priceCents:   [499, 999, 1699, 2999][i]!,
      currency:     "USD",
      networkType:  i > 1 ? "5G" : "4G",
      featured:     i === 1,
    }));
  }
}
