/**
 * aiSimulation — AI behavior simulation for orchestration dry-runs.
 *
 * Simulates:
 *   - Recommendation engine responses (deterministic, seeded)
 *   - Orchestration rule evaluation outcomes
 *   - Context interpretation variations (time-of-day, occupancy, etc.)
 *   - Digital twin state evolution over simulated time
 *   - Policy gate decisions under varying confidence levels
 *
 * Used for:
 *   - Testing orchestration logic without real guest data
 *   - What-if scenario analysis
 *   - Governance policy calibration
 */

import { logger }     from "../lib/logger";
import { increment }  from "../platform/observability/metricsCollector";

export type SimulationScenario =
  | "peak_hour"          // high occupancy, aggressive recommendations
  | "quiet_period"       // low occupancy, conservative
  | "special_event"      // branded event, all-hands
  | "staff_shortage"     // degraded service mode
  | "inventory_crisis"   // multiple items low-stock
  | "network_partition"; // distributed system failure

export interface SimulatedContext {
  venueId:       string;
  scenario:      SimulationScenario;
  occupancy:     number;     // 0–1
  timeOfDay:     "morning" | "afternoon" | "evening" | "late_night";
  inventoryScore:number;     // 0–1 (1=full, 0=empty)
  staffScore:    number;     // 0–1
  ambientScore:  number;     // 0–1 (noise/mood)
  ts:            number;
}

export interface SimulatedRecommendation {
  productId:   string;
  score:       number;     // 0–100
  confidence:  number;     // 0–1
  reason:      string;
  craftType:   "smoke" | "pour" | "brew" | "vape";
}

export interface AiSimulationResult {
  scenarioId:      string;
  scenario:        SimulationScenario;
  context:         SimulatedContext;
  recommendations: SimulatedRecommendation[];
  rulesTriggered:  string[];
  policyDecisions: Array<{ action: string; allowed: boolean; reason: string }>;
  durationMs:      number;
  ts:              number;
}

const SCENARIO_PARAMS: Record<SimulationScenario, Partial<SimulatedContext>> = {
  peak_hour:         { occupancy: 0.85, inventoryScore: 0.7,  staffScore: 0.9, ambientScore: 0.8 },
  quiet_period:      { occupancy: 0.15, inventoryScore: 0.95, staffScore: 0.6, ambientScore: 0.3 },
  special_event:     { occupancy: 1.0,  inventoryScore: 0.5,  staffScore: 1.0, ambientScore: 0.95 },
  staff_shortage:    { occupancy: 0.6,  inventoryScore: 0.8,  staffScore: 0.3, ambientScore: 0.5 },
  inventory_crisis:  { occupancy: 0.7,  inventoryScore: 0.1,  staffScore: 0.9, ambientScore: 0.6 },
  network_partition: { occupancy: 0.5,  inventoryScore: 0.8,  staffScore: 0.8, ambientScore: 0.5 },
};

// Seeded RNG (xorshift32)
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function buildContext(venueId: string, scenario: SimulationScenario, seed: number): SimulatedContext {
  const rng    = makeRng(seed);
  const params = SCENARIO_PARAMS[scenario];
  const hours  = new Date().getUTCHours();
  const tod    = hours < 11 ? "morning" : hours < 16 ? "afternoon" : hours < 22 ? "evening" : "late_night";

  return {
    venueId,
    scenario,
    occupancy:     params.occupancy!  + (rng() - 0.5) * 0.1,
    timeOfDay:     tod,
    inventoryScore:params.inventoryScore! + (rng() - 0.5) * 0.1,
    staffScore:    params.staffScore!  + (rng() - 0.5) * 0.1,
    ambientScore:  params.ambientScore! + (rng() - 0.5) * 0.1,
    ts:            Date.now(),
  };
}

function generateRecommendations(ctx: SimulatedContext, seed: number): SimulatedRecommendation[] {
  const rng      = makeRng(seed + 1);
  const count    = Math.ceil(ctx.occupancy * 5) + 1;
  const crafts: Array<"smoke"|"pour"|"brew"|"vape"> = ["smoke","pour","brew","vape"];

  return Array.from({ length: count }, (_, i) => ({
    productId:  `sim_product_${Math.floor(rng() * 100)}`,
    score:      Math.round(ctx.occupancy * 60 + rng() * 40),
    confidence: Math.round((0.5 + ctx.inventoryScore * 0.4 + rng() * 0.1) * 100) / 100,
    reason:     ctx.occupancy > 0.7 ? "high_demand_match" : "preference_match",
    craftType:  crafts[i % crafts.length]!,
  }));
}

function evaluateRules(ctx: SimulatedContext): string[] {
  const fired: string[] = [];
  if (ctx.inventoryScore < 0.2) fired.push("low_inventory_alert");
  if (ctx.occupancy > 0.8)      fired.push("high_occupancy_recommendations");
  if (ctx.staffScore < 0.4)     fired.push("staff_shortage_throttle");
  if (ctx.ambientScore > 0.85)  fired.push("premium_upsell_trigger");
  if (ctx.scenario === "network_partition") fired.push("offline_mode_activate");
  return fired;
}

export async function runAiSimulation(
  venueId:  string,
  scenario: SimulationScenario,
  seed?:    number,
): Promise<AiSimulationResult> {
  const scenarioId = `aisim_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const start      = Date.now();
  const rngSeed    = seed ?? Math.floor(Math.random() * 2 ** 31);

  const ctx             = buildContext(venueId, scenario, rngSeed);
  const recommendations = generateRecommendations(ctx, rngSeed);
  const rulesTriggered  = evaluateRules(ctx);

  // Simulate policy decisions for triggered rules
  const policyDecisions = rulesTriggered.map(rule => ({
    action:  rule,
    allowed: ctx.staffScore > 0.3 && ctx.inventoryScore > 0.1,
    reason:  ctx.staffScore > 0.3 ? "constraints_clear" : "staff_shortage_block",
  }));

  increment("simulation.ai", "scenarios_run", 1, { scenario });
  logger.info({ scenarioId, scenario, venueId, rngSeed }, "aiSimulation: scenario completed");

  return {
    scenarioId,
    scenario,
    context:         ctx,
    recommendations,
    rulesTriggered,
    policyDecisions,
    durationMs:      Date.now() - start,
    ts:              Date.now(),
  };
}
