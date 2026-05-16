/**
 * aiExplainability — generates human-readable explanations for every
 * AI decision made by the orchestration and cognition engines.
 *
 * Satisfies enterprise audit requirements and enables operator review.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type DecisionType =
  | "recommendation" | "orchestration" | "ambient" | "behavioral"
  | "predictive"     | "reinforcement"  | "cognition";

export interface ExplainableDecision {
  decisionId:  string;
  type:        DecisionType;
  venueId:     string;
  entityId?:   string;
  input:       Record<string, unknown>;
  output:      Record<string, unknown>;
  explanation: ExplanationBlock[];
  confidence:  number;
  timestamp:   number;
}

export interface ExplanationBlock {
  factor:      string;
  contribution: number; // –1 to 1
  direction:   "positive" | "negative" | "neutral";
  humanText:   string;
}

function factorText(factor: string, contribution: number): string {
  const abs  = Math.abs(contribution);
  const sign = contribution > 0 ? "increased" : "reduced";
  const mag  = abs > 0.3 ? "significantly" : abs > 0.1 ? "moderately" : "slightly";

  const factorLabels: Record<string, string> = {
    taste:          "Guest taste profile alignment",
    margin:         "Product profit margin",
    stock:          "Current stock availability",
    reliability:    "Vendor reliability history",
    premium:        "Premium item positioning",
    moodScore:      "Current venue mood score",
    atmosphere:     "Atmospheric engagement level",
    socialEnergy:   "Social group energy",
    timeMatch:      "Time-of-day pattern match",
    confidence:     "Decision confidence score",
    urgency:        "Trigger urgency level",
    impact:         "Expected business impact",
  };

  const label = factorLabels[factor] ?? factor;
  return contribution === 0
    ? `${label} had no effect on this decision.`
    : `${label} ${mag} ${sign} the decision score.`;
}

export function explainDecision(
  type:       DecisionType,
  venueId:    string,
  input:      Record<string, unknown>,
  output:     Record<string, unknown>,
  weights:    Record<string, number>,
  entityId?:  string,
): ExplainableDecision {
  const decisionId = `xai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const explanation: ExplanationBlock[] = Object.entries(weights).map(([factor, weight]) => {
    const rawValue   = typeof input[factor] === "number" ? (input[factor] as number) : 0.5;
    const contribution = (rawValue - 0.5) * weight * 2; // normalised –1 to 1
    return {
      factor,
      contribution: Math.round(contribution * 1000) / 1000,
      direction:    contribution > 0.05 ? "positive" : contribution < -0.05 ? "negative" : "neutral",
      humanText:    factorText(factor, contribution),
    };
  });

  explanation.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const totalContrib  = explanation.reduce((s, e) => s + Math.abs(e.contribution), 0);
  const confidence    = Math.min(0.99, 0.5 + totalContrib / 2);

  return {
    decisionId, type, venueId, entityId,
    input, output, explanation,
    confidence: Math.round(confidence * 100) / 100,
    timestamp:  Date.now(),
  };
}

export async function persistExplanation(decision: ExplainableDecision): Promise<void> {
  await pool.query(
    `INSERT INTO cognition_decisions
       (venue_id, decision_type, entity_id, confidence, inputs, output, reasoning, duration_ms)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, 0)`,
    [
      decision.venueId,
      decision.type,
      decision.entityId ?? null,
      decision.confidence,
      JSON.stringify(decision.input),
      JSON.stringify(decision.output),
      decision.explanation.map(e => e.humanText).join(" "),
    ],
  ).catch(err => logger.warn({ err }, "aiExplainability: persist failed (non-fatal)"));
}

export async function getExplanations(
  venueId: string,
  type?:   DecisionType,
  limit = 20,
): Promise<ExplainableDecision[]> {
  const typeFilter = type ? "AND decision_type = $3" : "";
  const params: unknown[] = [venueId, limit];
  if (type) params.push(type);

  const { rows } = await pool.query(
    `SELECT * FROM cognition_decisions
     WHERE venue_id = $1 ${typeFilter}
     ORDER BY decided_at DESC LIMIT $2`,
    params,
  );

  return rows.map(r => ({
    decisionId:  r.id,
    type:        r.decision_type as DecisionType,
    venueId:     r.venue_id,
    entityId:    r.entity_id ?? undefined,
    input:       r.inputs  ?? {},
    output:      r.output  ?? {},
    explanation: [{ factor: "recorded", contribution: 0, direction: "neutral", humanText: r.reasoning }],
    confidence:  r.confidence,
    timestamp:   new Date(r.decided_at).getTime(),
  }));
}
