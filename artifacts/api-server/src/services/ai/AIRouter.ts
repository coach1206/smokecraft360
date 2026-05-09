/**
 * AIRouter — Provider Abstraction Layer
 *
 * Routes AI requests dynamically to OpenAI / Anthropic / Gemini
 * based on the venue's billing mode (AXIOM_MANAGED vs BYOK).
 *
 * No hardcoded OpenAI dependency. Supports auto-failover across
 * configured providers when primary is degraded.
 */

import { eq, and, isNull } from "drizzle-orm";
import { db, venueAiBillingModesTable, venueAiProvidersTable, venueApiKeysTable, venueApiUsageTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import { decryptField } from "../../lib/encryption";

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type ProviderName = "openai" | "anthropic" | "gemini" | "azure_openai";

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }

export interface AIRouterOptions {
  venueId:     string;
  messages:    ChatMessage[];
  model?:      string;
  maxTokens?:  number;
  temperature?: number;
}

export interface AIRouterResult {
  content:       string;
  provider:      ProviderName;
  model:         string;
  promptTokens:  number;
  completionTokens: number;
  billingMode:   "axiom_managed" | "byok";
  failoverUsed:  boolean;
}

/* ── AXIOM platform key resolver ────────────────────────────────────────────── */

function axiomKeyFor(provider: ProviderName): string | undefined {
  switch (provider) {
    case "openai":     return process.env["OPENAI_API_KEY"];
    case "anthropic":  return process.env["ANTHROPIC_API_KEY"];
    case "gemini":     return process.env["GEMINI_API_KEY"];
    case "azure_openai": return process.env["AZURE_OPENAI_API_KEY"];
  }
}

/* ── Provider call implementations ─────────────────────────────────────────── */

async function callOpenAI(
  apiKey: string, messages: ChatMessage[], model: string, maxTokens: number, temperature: number,
): Promise<{ content: string; promptTokens: number; completionTokens: number; model: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number };
    model: string;
  };
  return {
    content:          data.choices[0]?.message.content ?? "",
    promptTokens:     data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    model:            data.model,
  };
}

async function callAnthropic(
  apiKey: string, messages: ChatMessage[], model: string, maxTokens: number,
): Promise<{ content: string; promptTokens: number; completionTokens: number; model: string }> {
  const system = messages.find(m => m.role === "system")?.content ?? "";
  const turns  = messages.filter(m => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":    apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, system, messages: turns, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    content: { text: string }[];
    usage: { input_tokens: number; output_tokens: number };
    model: string;
  };
  return {
    content:          data.content[0]?.text ?? "",
    promptTokens:     data.usage.input_tokens,
    completionTokens: data.usage.output_tokens,
    model:            data.model,
  };
}

async function callGemini(
  apiKey: string, messages: ChatMessage[], model: string, maxTokens: number,
): Promise<{ content: string; promptTokens: number; completionTokens: number; model: string }> {
  const parts = messages.map(m => ({ text: `${m.role}: ${m.content}` }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens } }),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
    usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
  };
  return {
    content:          data.candidates[0]?.content.parts[0]?.text ?? "",
    promptTokens:     data.usageMetadata.promptTokenCount,
    completionTokens: data.usageMetadata.candidatesTokenCount,
    model,
  };
}

/* ── Default models per provider ────────────────────────────────────────────── */

const DEFAULT_MODELS: Record<ProviderName, string> = {
  openai:      "gpt-4o-mini",
  anthropic:   "claude-3-haiku-20240307",
  gemini:      "gemini-1.5-flash",
  azure_openai: "gpt-4o-mini",
};

/* ── Single provider dispatch ───────────────────────────────────────────────── */

async function dispatchToProvider(
  provider: ProviderName,
  apiKey:   string,
  messages: ChatMessage[],
  model:    string,
  maxTokens: number,
  temperature: number,
): Promise<{ content: string; promptTokens: number; completionTokens: number; model: string }> {
  switch (provider) {
    case "openai":
    case "azure_openai":
      return callOpenAI(apiKey, messages, model, maxTokens, temperature);
    case "anthropic":
      return callAnthropic(apiKey, messages, model, maxTokens);
    case "gemini":
      return callGemini(apiKey, messages, model, maxTokens);
  }
}

/* ── Usage accounting ───────────────────────────────────────────────────────── */

async function recordUsage(
  venueId:  string,
  provider: ProviderName,
  mode:     "axiom_managed" | "byok",
  tokens:   number,
  estimatedCostCents: number,
): Promise<void> {
  const bucketDate = new Date().toISOString().slice(0, 10);
  try {
    await db
      .insert(venueApiUsageTable)
      .values({ venueId, providerName: provider, billingMode: mode, bucketDate,
                requestCount: 1, tokenCount: tokens, estimatedCostCents })
      .onConflictDoNothing();
    // If row already exists, increment inline
    await db.execute(
      `UPDATE venue_api_usage
       SET request_count = request_count + 1,
           token_count   = token_count + ${tokens},
           estimated_cost_cents = estimated_cost_cents + ${estimatedCostCents},
           updated_at = now()
       WHERE venue_id = '${venueId}'
         AND provider_name = '${provider}'
         AND bucket_date = '${bucketDate}'`
    );
  } catch (err) {
    logger.warn({ err }, "AIRouter: failed to record usage");
  }
}

/* ── Main router ────────────────────────────────────────────────────────────── */

export async function routeAI(opts: AIRouterOptions): Promise<AIRouterResult> {
  const { venueId, messages, maxTokens = 512, temperature = 0.7 } = opts;

  // 1. Resolve billing mode for this venue
  const [billingRow] = await db
    .select()
    .from(venueAiBillingModesTable)
    .where(eq(venueAiBillingModesTable.venueId, venueId))
    .limit(1);

  const mode          = billingRow?.mode ?? "axiom_managed";
  const failoverChain = (billingRow?.failoverChain as string[] | null) ?? [];
  const failoverOn    = billingRow?.failoverEnabled ?? false;

  // 2. Build ordered list of providers to try
  let providerQueue: ProviderName[];

  if (mode === "byok") {
    // Connected providers for this venue, primary first
    const connectedRows = await db
      .select()
      .from(venueAiProvidersTable)
      .where(
        and(
          eq(venueAiProvidersTable.venueId, venueId),
          eq(venueAiProvidersTable.status, "connected"),
          isNull(venueAiProvidersTable.disconnectedAt),
        )
      );
    const primary   = connectedRows.filter(r => r.isPrimary).map(r => r.providerName as ProviderName);
    const secondary = connectedRows.filter(r => !r.isPrimary).map(r => r.providerName as ProviderName);
    providerQueue = [...primary, ...secondary];
    if (providerQueue.length === 0) {
      // Degrade gracefully to AXIOM_MANAGED
      logger.warn({ venueId }, "AIRouter: BYOK venue has no connected providers — degrading to AXIOM_MANAGED");
      providerQueue = ["openai"];
    }
  } else {
    // AXIOM_MANAGED — use AXIOM platform keys
    providerQueue = ["openai"];
    if (failoverOn && failoverChain.length > 0) {
      providerQueue = [...new Set(["openai", ...failoverChain as ProviderName[]])];
    }
  }

  // 3. Try providers in order, with failover
  let failoverUsed = false;
  let lastErr: Error | null = null;

  for (let i = 0; i < providerQueue.length; i++) {
    const provider = providerQueue[i];
    if (i > 0) failoverUsed = true;

    try {
      let apiKey: string;

      if (mode === "byok") {
        // Fetch + decrypt venue's BYOK key
        const providerRow = await db
          .select()
          .from(venueAiProvidersTable)
          .where(and(eq(venueAiProvidersTable.venueId, venueId), eq(venueAiProvidersTable.providerName, provider)))
          .limit(1);
        const pid = providerRow[0]?.id;
        if (!pid) continue;

        const keyRow = await db
          .select()
          .from(venueApiKeysTable)
          .where(and(eq(venueApiKeysTable.venueId, venueId), eq(venueApiKeysTable.providerId, pid), isNull(venueApiKeysTable.revokedAt)))
          .limit(1);
        if (!keyRow[0]) continue;
        apiKey = decryptField(keyRow[0].encryptedKey);
      } else {
        apiKey = axiomKeyFor(provider) ?? "";
        if (!apiKey) {
          // Try next if AXIOM key not configured for this provider
          continue;
        }
      }

      const model = opts.model ?? DEFAULT_MODELS[provider];
      const result = await dispatchToProvider(provider, apiKey, messages, model, maxTokens, temperature);

      const totalTokens = result.promptTokens + result.completionTokens;
      const costCents   = Math.round(totalTokens * 0.002); // rough $0.002 / 1k tokens
      await recordUsage(venueId, provider, mode, totalTokens, costCents);

      return {
        content:          result.content,
        provider,
        model:            result.model,
        promptTokens:     result.promptTokens,
        completionTokens: result.completionTokens,
        billingMode:      mode,
        failoverUsed,
      };
    } catch (err) {
      lastErr = err as Error;
      logger.warn({ venueId, provider, err }, "AIRouter: provider failed, attempting failover");
      // Mark provider degraded
      await db
        .update(venueAiProvidersTable)
        .set({ status: "degraded", lastErrorMsg: (err as Error).message, updatedAt: new Date() })
        .where(and(eq(venueAiProvidersTable.venueId, venueId), eq(venueAiProvidersTable.providerName, provider)));
    }
  }

  throw new Error(`AIRouter: all providers exhausted. Last error: ${lastErr?.message}`);
}
