/**
 * Kernel Provider Boot — auto-seeds live platform providers into the credential vault.
 *
 * Runs once on server startup. Registers OpenAI, Stripe, and ElevenLabs in
 * `integration_providers` using credentials sourced from environment variables.
 * Idempotent (ON CONFLICT DO UPDATE) — safe to call on every restart.
 *
 * Resilience contract:
 *   - DATA_ENCRYPTION_KEY absent → providers registered without encrypted
 *     credentials; health sweeps still work; key resolution falls back to env
 *     vars at runtime.
 *   - Provider env var absent → that provider is silently skipped.
 *   - DB unavailable → error is logged and startup continues (non-fatal).
 */

import { logger }                 from "../../lib/logger";
import { upsertProvider }         from "../integrationKernel/credentialVault";
import { isEncryptionConfigured } from "../../lib/encryption";
import type { CredentialPack }    from "../integrationKernel/credentialVault";
import type { ProviderCategory }  from "../integrationKernel/types";

export const SYSTEM_VENUE_ID =
  process.env["SYSTEM_VENUE_ID"] ?? "00000000-0000-0000-0000-000000000001";

interface ProviderSeed {
  providerName:    string;
  providerType:    ProviderCategory;
  displayName:     string;
  baseUrl:         string;
  credentials:     CredentialPack | null;
  dailyRequests?:  number;
  monthlyRequests?: number;
  monthlyTokens?:  number;
}

function buildSeeds(): ProviderSeed[] {
  const seeds: ProviderSeed[] = [];

  const openAiKey = process.env["OPENAI_API_KEY"];
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  const elevenKey = process.env["ELEVENLABS_API_KEY"];

  if (openAiKey && openAiKey.length > 0) {
    seeds.push({
      providerName:    "openai",
      providerType:    "ai",
      displayName:     "OpenAI (GPT-4o)",
      baseUrl:         "https://api.openai.com/v1",
      credentials:     { apiKey: openAiKey },
      dailyRequests:   2_000,
      monthlyRequests: 50_000,
      monthlyTokens:   5_000_000,
    });
  }

  if (stripeKey && stripeKey.length > 0 && !stripeKey.startsWith("<")) {
    seeds.push({
      providerName:    "stripe",
      providerType:    "payment",
      displayName:     "Stripe",
      baseUrl:         "https://api.stripe.com/v1",
      credentials:     { apiKey: stripeKey },
      dailyRequests:   10_000,
      monthlyRequests: 200_000,
    });
  }

  if (elevenKey && elevenKey.length > 0) {
    seeds.push({
      providerName:    "elevenlabs",
      providerType:    "voice",
      displayName:     "ElevenLabs TTS",
      baseUrl:         "https://api.elevenlabs.io/v1",
      credentials:     { apiKey: elevenKey },
      dailyRequests:   1_000,
      monthlyRequests: 20_000,
    });
  }

  return seeds;
}

export async function bootKernelProviders(): Promise<void> {
  const seeds = buildSeeds();

  if (seeds.length === 0) {
    logger.info("kernelProviderBoot: no provider env vars found — skipping seed");
    return;
  }

  const encReady = isEncryptionConfigured();
  if (!encReady) {
    logger.warn(
      "kernelProviderBoot: DATA_ENCRYPTION_KEY absent — providers will be registered " +
      "without encrypted credentials; runtime key resolution falls back to env vars",
    );
  }

  let seeded = 0;
  for (const seed of seeds) {
    try {
      await upsertProvider({
        venueId:      SYSTEM_VENUE_ID,
        providerName: seed.providerName,
        providerType: seed.providerType,
        displayName:  seed.displayName,
        endpointUrl:  seed.baseUrl,
        credentials:  (encReady && seed.credentials) ? seed.credentials : undefined,
        isPrimary:    true,
        isActive:     true,
        usageLimits: {
          dailyRequests:   seed.dailyRequests   ?? null,
          monthlyRequests: seed.monthlyRequests ?? null,
          monthlyTokens:   seed.monthlyTokens   ?? null,
          alertThreshold:  0.8,
        },
      });
      seeded++;
      logger.info({ provider: seed.providerName }, "kernelProviderBoot: provider seeded");
    } catch (err) {
      logger.warn({ err, provider: seed.providerName }, "kernelProviderBoot: seed failed — skipping");
    }
  }

  logger.info({ seeded, total: seeds.length }, "kernelProviderBoot: boot complete");
}
