/**
 * ElevenLabs API key resolver.
 *
 * Two paths, in order:
 *   1. Replit Connectors v2 — fetched fresh each call (tokens expire). This
 *      is the production path: user authorizes via the Replit ElevenLabs
 *      connector and we never see the raw key.
 *   2. ELEVENLABS_API_KEY env var — fallback for local/dev or manual setup.
 *
 * Returns null when neither is available, so callers can return a clean 503
 * without crashing the server.
 *
 * NEVER cache the resolved key across requests — connector tokens rotate.
 */

interface ConnectorPayload {
  items?: Array<{
    settings?: Record<string, unknown>;
  }>;
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
  const fromConnector = await fromReplitConnector();
  if (fromConnector) return fromConnector;

  const fromEnv = process.env.ELEVENLABS_API_KEY;
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}

/** Default voice IDs — these are public ElevenLabs preset voices anyone can use. */
export const DEFAULT_VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL", // "Bella" — warm, friendly
  male:   "TxGEqnHWrfWFTfGW9XjX", // "Josh" — calm, professional
} as const;

export type VoicePersona = keyof typeof DEFAULT_VOICES;
