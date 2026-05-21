/**
 * ElevenLabs API key resolver.
 *
 * Three paths, in order:
 *   1. Integration Kernel credential vault — encrypted DB record seeded by
 *      kernelProviderBoot (preferred for production; survives connector outages).
 *   2. Replit Connectors v2 — fetched fresh each call (tokens expire). This
 *      is the original production path via the Replit ElevenLabs connector.
 *   3. ELEVENLABS_API_KEY env var — fallback for local/dev or manual setup.
 *
 * Returns null when none is available, so callers can return a clean 503
 * without crashing the server.
 *
 * NEVER cache the resolved key across requests — connector tokens rotate.
 */

interface ConnectorPayload {
  items?: Array<{
    settings?: Record<string, unknown>;
  }>;
}

async function fromKernelVault(): Promise<string | null> {
  const venueId = process.env["SYSTEM_VENUE_ID"] ?? "00000000-0000-0000-0000-000000000001";
  try {
    const { listProviders, readCredentials } = await import("../core/integrationKernel/credentialVault");
    const providers = await listProviders(venueId, "voice");
    const el = providers.find(p => p.providerName === "elevenlabs" && p.isActive);
    if (el) {
      const creds = await readCredentials(el.id, venueId);
      if (creds.apiKey && creds.apiKey.length > 0) return creds.apiKey;
    }
  } catch {
    /* vault not ready — fall through */
  }
  return null;
}

async function fromReplitConnector(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) return null;

  const replIdentity   = process.env.REPL_IDENTITY;
  const webReplRenewal = process.env.WEB_REPL_RENEWAL;
  const xReplitToken =
    replIdentity   ? `repl ${replIdentity}` :
    webReplRenewal ? `depl ${webReplRenewal}` :
                     null;
  if (!xReplitToken) return null;

  let resp: Response;
  try {
    resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=elevenlabs`,
      { headers: { Accept: "application/json", "X_REPLIT_TOKEN": xReplitToken } },
    );
  } catch {
    return null;
  }
  if (!resp.ok) return null;

  let data: ConnectorPayload;
  try { data = (await resp.json()) as ConnectorPayload; }
  catch { return null; }

  const settings = data.items?.[0]?.settings ?? {};
  /* The ElevenLabs connector exposes the key under one of these property
   * names depending on the connector revision. Try them in order. */
  const candidates = ["api_key", "apiKey", "ELEVENLABS_API_KEY", "elevenlabs_api_key"];
  for (const k of candidates) {
    const v = settings[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export async function resolveElevenLabsKey(): Promise<string | null> {
  const fromVault = await fromKernelVault();
  if (fromVault) return fromVault;

  const fromConnector = await fromReplitConnector();
  if (fromConnector) return fromConnector;

  const fromEnv = process.env.ELEVENLABS_API_KEY;
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

/**
 * Default voice IDs — public ElevenLabs preset voices.
 *
 * Craft persona assignments:
 *   smoke → "Clyde"  (2EiwWnXFnvU5JabPnv8n) — deep bass, authoritative warm American male
 *   pour  → "Daniel" (onwK4e9ZLuTAKqWW03F9) — British, refined, precise
 *   brew  → "Josh"   (TxGEqnHWrfWFTfGW9XjX) — friendly, casual, approachable
 *   vape  → "Adam"   (pNInz6obpgDQGcFmaJgB) — modern, clear, neutral
 *
 * "male" maps to Clyde (smoke default) for backwards-compat.
 */
export const DEFAULT_VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL", // "Bella" — warm, friendly
  male:   "2EiwWnXFnvU5JabPnv8n", // "Clyde" — deep bass, warm American male
  smoke:  "2EiwWnXFnvU5JabPnv8n", // "Clyde" — The Warm Tobacconist
  pour:   "onwK4e9ZLuTAKqWW03F9", // "Daniel" — The Sommelier
  brew:   "TxGEqnHWrfWFTfGW9XjX", // "Josh" — The Master Brewer
  vape:   "pNInz6obpgDQGcFmaJgB", // "Adam" — The Vape Artisan
} as const;

export type VoicePersona = keyof typeof DEFAULT_VOICES;
