/**
 * AviationstackAdapter — Phase 2: Flight Telemetry.
 *
 * Provides real-time flight status for guest arrival prediction.
 * A delayed flight → fatigue mood shift → Relaxed Luxury pre-calibration.
 * An on-time arrival → standard or elevated mood based on cabin class.
 *
 * Simulated mode: realistic synthetic data when AVIATIONSTACK_API_KEY is absent.
 * Live mode:      https://api.aviationstack.com/v1/flights
 */

const API_KEY = process.env["AVIATIONSTACK_API_KEY"];
const BASE    = "https://api.aviationstack.com/v1";

export type FlightStatus = {
  flightNumber:   string;
  airline:        string;
  origin:         string;
  destination:    string;
  status:         "scheduled" | "active" | "landed" | "cancelled" | "incident" | "diverted";
  delayMinutes:   number;
  estimatedArrival: string | null;
  cabinHint:      "economy" | "business" | "first" | "unknown";
  fatigueScore:   number;
};

export class AviationstackAdapter {

  static isLive(): boolean {
    return !!API_KEY;
  }

  static async getFlightStatus(flightNumber: string): Promise<FlightStatus> {
    if (!AviationstackAdapter.isLive()) {
      return AviationstackAdapter.simulate(flightNumber);
    }

    const url = `${BASE}/flights?access_key=${API_KEY}&flight_iata=${encodeURIComponent(flightNumber)}&limit=1`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Aviationstack ${res.status}`);

    const json = await res.json() as { data?: unknown[] };
    const row  = json.data?.[0] as Record<string, unknown> | undefined;
    if (!row) return AviationstackAdapter.simulate(flightNumber);

    const arr   = (row["arrival"] as Record<string, unknown>) ?? {};
    const dep   = (row["departure"] as Record<string, unknown>) ?? {};
    const delay = typeof arr["delay"] === "number" ? arr["delay"] : 0;

    return {
      flightNumber:    flightNumber.toUpperCase(),
      airline:         ((row["airline"] as Record<string, unknown>)?.["name"] as string) ?? "Unknown Airline",
      origin:          (dep["iata"] as string) ?? "???",
      destination:     (arr["iata"] as string) ?? "???",
      status:          (row["flight_status"] as FlightStatus["status"]) ?? "scheduled",
      delayMinutes:    delay,
      estimatedArrival: (arr["estimated"] as string | null) ?? null,
      cabinHint:       "unknown",
      fatigueScore:    AviationstackAdapter.calcFatigue(delay),
    };
  }

  private static calcFatigue(delayMinutes: number): number {
    if (delayMinutes > 180) return 90;
    if (delayMinutes > 60)  return 70;
    if (delayMinutes > 20)  return 50;
    return 20;
  }

  private static simulate(flightNumber: string): FlightStatus {
    const seed    = flightNumber.charCodeAt(0) + flightNumber.charCodeAt(flightNumber.length - 1);
    const delay   = [0, 0, 15, 45, 90, 180][seed % 6]!;
    const statuses: FlightStatus["status"][] = ["scheduled","active","landed","active","landed","scheduled"];
    const status  = statuses[seed % statuses.length]!;

    return {
      flightNumber:    flightNumber.toUpperCase(),
      airline:         ["Emirates", "Lufthansa", "Singapore Airlines", "Qatar Airways"][seed % 4]!,
      origin:          ["JFK", "LHR", "DXB", "SIN", "CDG"][seed % 5]!,
      destination:     "MCO",
      status,
      delayMinutes:    delay,
      estimatedArrival: new Date(Date.now() + (45 + delay) * 60000).toISOString(),
      cabinHint:       (["economy","business","first","unknown"] as FlightStatus["cabinHint"][])[seed % 4]!,
      fatigueScore:    AviationstackAdapter.calcFatigue(delay),
    };
  }
}
