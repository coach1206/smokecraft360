/**
 * eventThrottle — rate-limiting and adaptive sampling for the event bus.
 *
 * Prevents large venues from overwhelming the orchestration layer with:
 *   - Per-channel token bucket rate limiting
 *   - Per-venue event caps (sliding window)
 *   - Adaptive sampling (shed low-priority events under load)
 *   - Priority tiers: critical > high > normal > low
 *
 * Events shed under load are counted (not silently dropped) so telemetry
 * accurately reflects system pressure.
 */

import { logger }     from "../../lib/logger";
import { increment, setGauge } from "../observability/metricsCollector";

export type EventPriority = "critical" | "high" | "normal" | "low";

export interface ThrottleConfig {
  maxPerSecond:     number;   // token bucket refill rate
  burstCapacity:    number;   // max burst above steady rate
  shedBelowPriority:EventPriority; // shed events below this under load
}

interface TokenBucket {
  tokens:     number;
  lastRefill: number;
  shed:       number;   // total events shed since reset
  passed:     number;   // total events passed
}

interface VenueWindow {
  count:    number;
  windowMs: number;
  resetAt:  number;
}

const PRIORITY_WEIGHT: Record<EventPriority, number> = {
  critical: 4,
  high:     3,
  normal:   2,
  low:      1,
};

const DEFAULT_CONFIG: ThrottleConfig = {
  maxPerSecond:     200,
  burstCapacity:    500,
  shedBelowPriority:"low",
};

// Per-channel token buckets
const channelBuckets = new Map<string, TokenBucket>();
// Per-venue sliding window (1s)
const venueWindows   = new Map<string, VenueWindow>();
// Per-venue config overrides
const venueConfigs   = new Map<string, Partial<ThrottleConfig>>();

function getConfig(venueId?: string): ThrottleConfig {
  if (venueId) {
    const override = venueConfigs.get(venueId);
    if (override) return { ...DEFAULT_CONFIG, ...override };
  }
  return DEFAULT_CONFIG;
}

function refillBucket(bucket: TokenBucket, config: ThrottleConfig): void {
  const now     = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    config.burstCapacity,
    bucket.tokens + elapsed * config.maxPerSecond,
  );
  bucket.lastRefill = now;
}

export type ThrottleDecision = "pass" | "shed" | "block";

export interface ThrottleResult {
  decision:   ThrottleDecision;
  reason:     string;
  remaining:  number;
  shed:       number;
}

export function checkThrottle(
  channel:   string,
  priority:  EventPriority,
  venueId?:  string,
): ThrottleResult {
  const config = getConfig(venueId);
  const key    = venueId ? `${venueId}:${channel}` : channel;

  // Get or create bucket
  let bucket = channelBuckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.burstCapacity, lastRefill: Date.now(), shed: 0, passed: 0 };
    channelBuckets.set(key, bucket);
  }

  refillBucket(bucket, config);

  // Critical events always pass (even if over limit)
  if (priority === "critical") {
    bucket.passed++;
    return { decision:"pass", reason:"critical priority always passes", remaining: Math.floor(bucket.tokens), shed: bucket.shed };
  }

  // No tokens → block
  if (bucket.tokens < 1) {
    bucket.shed++;
    increment("backpressure", "events_blocked", 1, { channel, priority });
    return { decision:"block", reason:"rate limit exceeded", remaining: 0, shed: bucket.shed };
  }

  // Load shedding: shed low-priority events when bucket < 20%
  const pressureRatio = bucket.tokens / config.burstCapacity;
  if (pressureRatio < 0.2) {
    const priorityNum = PRIORITY_WEIGHT[priority];
    const threshold   = PRIORITY_WEIGHT[config.shedBelowPriority];
    if (priorityNum <= threshold) {
      bucket.shed++;
      increment("backpressure", "events_shed", 1, { channel, priority });
      return { decision:"shed", reason:`load shedding: pressure=${(pressureRatio*100).toFixed(0)}%`, remaining: Math.floor(bucket.tokens), shed: bucket.shed };
    }
  }

  // Consume token
  bucket.tokens--;
  bucket.passed++;

  // Venue sliding window cap
  if (venueId) {
    const now    = Date.now();
    let   window = venueWindows.get(venueId);
    if (!window || now > window.resetAt) {
      window = { count: 0, windowMs: 1000, resetAt: now + 1000 };
      venueWindows.set(venueId, window);
    }
    window.count++;
    const maxPerVenue = config.maxPerSecond * 3; // venue cap = 3× channel rate
    if (window.count > maxPerVenue) {
      increment("backpressure", "venue_cap_exceeded", 1, { venueId });
    }
  }

  setGauge("backpressure", "bucket_tokens", Math.floor(bucket.tokens), { channel });
  return { decision:"pass", reason:"ok", remaining: Math.floor(bucket.tokens), shed: bucket.shed };
}

export function setVenueThrottleConfig(venueId: string, config: Partial<ThrottleConfig>): void {
  venueConfigs.set(venueId, config);
  logger.info({ venueId, config }, "eventThrottle: venue config updated");
}

export function getThrottleStats(channel: string, venueId?: string): {
  tokens: number; shed: number; passed: number; pressurePct: number;
} {
  const key    = venueId ? `${venueId}:${channel}` : channel;
  const bucket = channelBuckets.get(key);
  const config = getConfig(venueId);
  if (!bucket) return { tokens:0, shed:0, passed:0, pressurePct:100 };
  refillBucket(bucket, config);
  return {
    tokens:      Math.floor(bucket.tokens),
    shed:        bucket.shed,
    passed:      bucket.passed,
    pressurePct: Math.round((1 - bucket.tokens / config.burstCapacity) * 100),
  };
}

/** Reset shed counters (call periodically) */
export function resetShedCounters(): void {
  for (const bucket of channelBuckets.values()) bucket.shed = 0;
}
