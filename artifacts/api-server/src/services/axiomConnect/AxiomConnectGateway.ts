/**
 * AxiomConnectGateway — Phase 2: Revenue Bridge.
 *
 * Unified entry point for all external intelligence feeds.
 * Each adapter auto-detects whether its API key is configured.
 * Without keys → graceful simulation mode (real logic, synthetic data).
 * With keys    → live API calls to the real service.
 *
 * Feeds into:
 *   - VenueSoulCache (guest arrival telemetry → mood shifts)
 *   - EnvironmentalModeEngine (flight delays → atmosphere adjustment)
 *   - Atomic Commerce (Airalo/Allianz cross-domain upsells)
 */

import { AviationstackAdapter, type FlightStatus }  from "./AviationstackAdapter";
import { AiraloAdapter,        type EsimOffer }      from "./AiraloAdapter";
import { AllianzAdapter,       type InsuranceQuote } from "./AllianzAdapter";
import { MoodShiftEngine,      type MoodShift }      from "./MoodShiftEngine";
import { getIO }    from "../../lib/socketServer";
import { logger }   from "../../lib/logger";

export interface GatewayStatus {
  aviationstack: "live" | "simulated";
  airalo:        "live" | "simulated";
  allianz:       "live" | "simulated";
}

export interface ConnectPayload {
  flightStatus?:     FlightStatus | null;
  esimOffers?:       EsimOffer[];
  insuranceQuote?:   InsuranceQuote | null;
  moodShift?:        MoodShift | null;
  timestamp:         string;
}

export class AxiomConnectGateway {

  static getStatus(): GatewayStatus {
    return {
      aviationstack: AviationstackAdapter.isLive() ? "live" : "simulated",
      airalo:        AiraloAdapter.isLive()        ? "live" : "simulated",
      allianz:       AllianzAdapter.isLive()       ? "live" : "simulated",
    };
  }

  /**
   * Full intelligence pull for a guest arrival event.
   * Runs all adapters in parallel and synthesises the mood shift.
   */
  static async processGuestArrival(params: {
    flightNumber?: string;
    iataCode?:     string;
    countryCode?:  string;
    venueId?:      string;
    guestId?:      string;
  }): Promise<ConnectPayload> {

    const [flightStatus, esimOffers, insuranceQuote] = await Promise.all([
      params.flightNumber
        ? AviationstackAdapter.getFlightStatus(params.flightNumber).catch(() => null)
        : Promise.resolve(null),
      params.countryCode
        ? AiraloAdapter.getOffers(params.countryCode).catch(() => [])
        : Promise.resolve([]),
      AllianzAdapter.getQuote({ destination: params.iataCode ?? "INT" }).catch(() => null),
    ]);

    const moodShift = MoodShiftEngine.derive({ flightStatus, esimOffers, insuranceQuote });

    if (moodShift && params.venueId) {
      getIO().to(`venue:${params.venueId}`).emit("neural:mood_shift", {
        guestId:   params.guestId,
        venueId:   params.venueId,
        moodShift,
        timestamp: new Date().toISOString(),
      });

      logger.info({ guestId: params.guestId, mood: moodShift.mood, intensity: moodShift.intensity }, "mood shift dispatched");
    }

    return {
      flightStatus,
      esimOffers,
      insuranceQuote,
      moodShift,
      timestamp: new Date().toISOString(),
    };
  }

  /** Lightweight flight-only telemetry for environmental mode triggers. */
  static async getFlightTelemetry(flightNumber: string): Promise<FlightStatus | null> {
    return AviationstackAdapter.getFlightStatus(flightNumber).catch(() => null);
  }

  /** Atomic commerce bundle — Airalo + Allianz offers for upsell. */
  static async getCommerceBundle(countryCode: string, destination?: string) {
    const [esim, insurance] = await Promise.all([
      AiraloAdapter.getOffers(countryCode).catch(() => []),
      AllianzAdapter.getQuote({ destination: destination ?? "INT" }).catch(() => null),
    ]);
    return { esim, insurance, timestamp: new Date().toISOString() };
  }
}
