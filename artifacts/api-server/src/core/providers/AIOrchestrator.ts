/**
 * AIOrchestrator — Phase 2: Provider Abstraction
 *
 * Wraps the existing AIRouter with Integration Kernel credential vault support.
 * Business logic calls AIOrchestrator.generate() — provider selection,
 * failover, and token accounting are fully opaque.
 */

import { logger }          from "../../lib/logger";
import { routeAI }         from "../../services/ai/AIRouter";
import type { ChatMessage } from "../../services/ai/AIRouter";

export interface GenerateOptions {
  venueId:      string;
  messages:     ChatMessage[];
  model?:       string;
  maxTokens?:   number;
  temperature?: number;
}

export interface GenerateResult {
  content:          string;
  provider:         string;
  model:            string;
  promptTokens:     number;
  completionTokens: number;
  failoverUsed:     boolean;
}

export const AIOrchestrator = {
  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const result = await routeAI({
      venueId:     opts.venueId,
      messages:    opts.messages,
      model:       opts.model,
      maxTokens:   opts.maxTokens,
      temperature: opts.temperature,
    });

    logger.info(
      { venueId: opts.venueId, provider: result.provider, tokens: result.promptTokens + result.completionTokens, failover: result.failoverUsed },
      "AIOrchestrator: request complete",
    );

    return {
      content:          result.content,
      provider:         result.provider,
      model:            result.model,
      promptTokens:     result.promptTokens,
      completionTokens: result.completionTokens,
      failoverUsed:     result.failoverUsed,
    };
  },
};
