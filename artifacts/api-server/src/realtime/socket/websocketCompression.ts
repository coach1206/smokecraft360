/**
 * websocketCompression — payload compression utilities for WebSocket messages.
 *
 * Strategies:
 *   1. Field whitelisting: only emit fields the client needs (projection)
 *   2. Delta compression: emit only changed fields vs. last known state
 *   3. Numeric precision: round floats to 3 decimal places to shrink payload
 *   4. Null stripping: remove null/undefined fields from emissions
 *
 * Socket.IO perMessageDeflate is enabled at the transport level via
 * server config — this module handles application-level optimizations.
 */

export type CompressionProfile = "full" | "minimal" | "delta";

export interface CompressionOptions {
  profile?:    CompressionProfile;
  precision?:  number;  // decimal places (default 3)
  whitelist?:  string[];
}

/** Round all numeric values in an object to N decimal places */
function roundNumbers(obj: Record<string, unknown>, precision: number): Record<string, unknown> {
  const factor = 10 ** precision;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && !Number.isInteger(v)) {
      result[k] = Math.round(v * factor) / factor;
    } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      result[k] = roundNumbers(v as Record<string, unknown>, precision);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/** Strip null/undefined fields */
function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null),
  );
}

/** Apply field whitelist projection */
function applyWhitelist(
  obj: Record<string, unknown>,
  whitelist: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    whitelist.filter(k => k in obj).map(k => [k, obj[k]]),
  );
}

/** Compute delta between current and previous state */
function computeDelta(
  current:  Record<string, unknown>,
  previous: Record<string, unknown>,
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(current)) {
    if (JSON.stringify(v) !== JSON.stringify(previous[k])) {
      delta[k] = v;
    }
  }
  return delta;
}

/** Compress a WebSocket payload for emission */
export function compressPayload(
  payload:   Record<string, unknown>,
  opts:      CompressionOptions = {},
  previous?: Record<string, unknown>,
): Record<string, unknown> {
  const { profile = "minimal", precision = 3, whitelist } = opts;

  let result = { ...payload };

  // 1. Whitelist projection
  if (whitelist && whitelist.length > 0) {
    result = applyWhitelist(result, whitelist);
  }

  // 2. Delta if previous state provided
  if (profile === "delta" && previous) {
    result = computeDelta(result, previous);
    if (Object.keys(result).length === 0) return {}; // no change
  }

  // 3. Strip nulls (minimal + delta profiles)
  if (profile !== "full") {
    result = stripNulls(result);
  }

  // 4. Round numbers
  result = roundNumbers(result, precision);

  return result;
}

/** Standard whitelists per event type */
export const PAYLOAD_WHITELISTS: Record<string, string[]> = {
  intelligence_update: [
    "overallScore","engagementLevel","socialEnergy","activeGuests","decisionCount",
  ],
  twin_update: [
    "version","syncHealth","environmentalState","orchestrationStatus",
  ],
  awareness_update: [
    "overallScore","riskLevel","staffReadiness","guestSatisfaction","socialMomentum",
  ],
  momentum_update: [
    "direction","magnitude","velocity","horizon","confidence",
  ],
  conversion_update: [
    "overallProbability","estimatedRevenue","confidence","byCategory",
  ],
};
