/**
 * Universal Provider Registry
 *
 * Canonical catalogue of every supported integration provider.
 * New providers are registered here — no code changes elsewhere required.
 * Business logic never calls external APIs directly; it uses this registry
 * to resolve an adapter.
 */

import type { ProviderDefinition, ProviderCategory } from "./types";

const REGISTRY: ProviderDefinition[] = [
  // ── AI ───────────────────────────────────────────────────────────────────
  { id: "openai",     name: "OpenAI",     category: "ai", description: "GPT-4o / GPT-4o-mini language models.", authType: "api_key", baseUrl: "https://api.openai.com/v1", docsUrl: "https://platform.openai.com/docs", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },
  { id: "anthropic",  name: "Anthropic",  category: "ai", description: "Claude 3 family models.", authType: "api_key", baseUrl: "https://api.anthropic.com/v1", docsUrl: "https://docs.anthropic.com", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },
  { id: "gemini",     name: "Google Gemini", category: "ai", description: "Gemini 1.5 Flash/Pro models.", authType: "api_key", baseUrl: "https://generativelanguage.googleapis.com/v1beta", docsUrl: "https://ai.google.dev/docs", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },

  // ── POS ──────────────────────────────────────────────────────────────────
  { id: "toast",      name: "Toast POS",   category: "pos", description: "Restaurant-grade POS and order management.", authType: "oauth2", baseUrl: "https://ws-api.toasttab.com", docsUrl: "https://doc.toasttab.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "square",     name: "Square POS",  category: "pos", description: "Square point-of-sale and payments.", authType: "oauth2", baseUrl: "https://connect.squareup.com/v2", docsUrl: "https://developer.squareup.com/docs", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "clover",     name: "Clover",      category: "pos", description: "Clover POS platform.", authType: "oauth2", baseUrl: "https://api.clover.com", docsUrl: "https://docs.clover.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "lightspeed", name: "Lightspeed",  category: "pos", description: "Lightspeed Restaurant POS.", authType: "api_key", baseUrl: "https://api.lightspeedapp.com/API/V3", docsUrl: "https://developers.lightspeedhq.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },

  // ── PAYMENT ──────────────────────────────────────────────────────────────
  { id: "stripe",     name: "Stripe",      category: "payment", description: "Full-stack payments and subscriptions.", authType: "api_key", baseUrl: "https://api.stripe.com/v1", docsUrl: "https://stripe.com/docs", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "paypal",     name: "PayPal",      category: "payment", description: "PayPal checkout and commerce.", authType: "oauth2", baseUrl: "https://api.paypal.com/v2", docsUrl: "https://developer.paypal.com/docs", isCustom: false, supportsWebhook: true, supportsHealthCheck: false },

  // ── MUSIC ────────────────────────────────────────────────────────────────
  { id: "spotify",    name: "Spotify",     category: "music", description: "Spotify playback and playlist control.", authType: "oauth2", baseUrl: "https://api.spotify.com/v1", docsUrl: "https://developer.spotify.com/documentation/web-api", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },
  { id: "sonos",      name: "Sonos",       category: "music", description: "Sonos multi-room audio control.", authType: "oauth2", baseUrl: "https://api.ws.sonos.com/control/api/v1", docsUrl: "https://developer.sonos.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },

  // ── LIGHTING ─────────────────────────────────────────────────────────────
  { id: "philips_hue", name: "Philips Hue", category: "lighting", description: "Hue smart lighting scenes.", authType: "api_key", baseUrl: "https://api.meethue.com", docsUrl: "https://developers.meethue.com", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },
  { id: "lutron",      name: "Lutron",      category: "lighting", description: "Lutron Caseta / RadioRA lighting.", authType: "bearer", docsUrl: "https://developer.lutron.com", isCustom: false, supportsWebhook: false, supportsHealthCheck: false },

  // ── COMMUNICATION ────────────────────────────────────────────────────────
  { id: "sendgrid",   name: "SendGrid",    category: "crm", description: "Transactional email delivery.", authType: "api_key", baseUrl: "https://api.sendgrid.com/v3", docsUrl: "https://docs.sendgrid.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "twilio",     name: "Twilio",      category: "crm", description: "SMS and voice messaging.", authType: "basic", baseUrl: "https://api.twilio.com/2010-04-01", docsUrl: "https://www.twilio.com/docs", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },

  // ── BOOKING ──────────────────────────────────────────────────────────────
  { id: "opentable",  name: "OpenTable",   category: "booking", description: "Restaurant reservations platform.", authType: "api_key", docsUrl: "https://platform.opentable.com/documentation", isCustom: false, supportsWebhook: true, supportsHealthCheck: false },
  { id: "resy",       name: "Resy",        category: "booking", description: "Resy reservations management.", authType: "api_key", docsUrl: "https://resy.com/data-insights", isCustom: false, supportsWebhook: false, supportsHealthCheck: false },

  // ── CRM ──────────────────────────────────────────────────────────────────
  { id: "hubspot",    name: "HubSpot CRM", category: "crm", description: "CRM contacts, deals, and marketing.", authType: "oauth2", baseUrl: "https://api.hubapi.com", docsUrl: "https://developers.hubspot.com", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },
  { id: "salesforce", name: "Salesforce",  category: "crm", description: "Enterprise CRM and sales automation.", authType: "oauth2", baseUrl: "https://login.salesforce.com", docsUrl: "https://developer.salesforce.com/docs", isCustom: false, supportsWebhook: true, supportsHealthCheck: true },

  // ── VOICE ────────────────────────────────────────────────────────────────
  { id: "elevenlabs", name: "ElevenLabs",  category: "voice", description: "AI voice synthesis and streaming.", authType: "api_key", baseUrl: "https://api.elevenlabs.io/v1", docsUrl: "https://docs.elevenlabs.io", isCustom: false, supportsWebhook: false, supportsHealthCheck: true },
  { id: "azure_voice", name: "Azure Cognitive Speech", category: "voice", description: "Azure text-to-speech.", authType: "api_key", docsUrl: "https://learn.microsoft.com/azure/cognitive-services/speech-service", isCustom: false, supportsWebhook: false, supportsHealthCheck: false },

  // ── ANALYTICS ────────────────────────────────────────────────────────────
  { id: "powerbi",    name: "Power BI",    category: "analytics", description: "Microsoft Power BI dashboards.", authType: "oauth2", docsUrl: "https://learn.microsoft.com/power-bi/developer/embedded", isCustom: false, supportsWebhook: false, supportsHealthCheck: false },
  { id: "tableau",    name: "Tableau",     category: "analytics", description: "Tableau data visualizations.", authType: "api_key", docsUrl: "https://help.tableau.com/current/api/rest_api", isCustom: false, supportsWebhook: false, supportsHealthCheck: false },
];

const registryMap = new Map<string, ProviderDefinition>(
  REGISTRY.map(p => [p.id, p])
);

export function getAllProviders(): ProviderDefinition[] {
  return REGISTRY;
}

export function getProvider(id: string): ProviderDefinition | undefined {
  return registryMap.get(id);
}

export function getProvidersByCategory(category: ProviderCategory): ProviderDefinition[] {
  return REGISTRY.filter(p => p.category === category);
}

export function getCategories(): ProviderCategory[] {
  const seen = new Set<ProviderCategory>();
  for (const p of REGISTRY) seen.add(p.category);
  return [...seen];
}

export function registerCustomProvider(def: ProviderDefinition): void {
  registryMap.set(def.id, def);
  REGISTRY.push(def);
}
