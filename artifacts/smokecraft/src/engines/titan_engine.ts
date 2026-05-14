/**
 * TitanEngine — NOVEE OS frontend sovereign data engine.
 *
 * Singleton object mirroring the backend TitanEngine spec:
 *   handleNFCTap(serialNumber)        — hardware coin/tag → identity lookup
 *   logPalateSentiment(data)          — real-time flavor event → War Room feed
 *   spendPrestige(guestId, amt, tgt)  — credit spend → Secret Passage link
 *   syncEnvironment(venueId)          — pull live IoT atmosphere reading
 *   wakeUpSage(profile)               — fires onSageWake subscribers
 *
 * Usage:
 *   TitanEngine.handleNFCTap(event.serialNumber);
 *   TitanEngine.onSageWake(profile => setGuestProfile(profile));
 */

const BASE = (typeof import.meta !== "undefined"
  ? (import.meta.env.BASE_URL as string)
  : "/"
).replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TitanGuestProfile {
  id:               string;
  firstName:        string;
  lastName?:        string;
  publicId:         string;
  masteryTier:      string;
  totalMastery:     number;
  assignedMentorId: string | null;
  flavorHistory:    unknown[];
}

export interface SagePayload {
  wakeUp:        boolean;
  mentorId:      string | null;
  masteryTier:   string;
  flavorHistory: unknown[];
  greeting:      string;
}

export interface NfcTapResult {
  success:   boolean;
  guestName?: string;
  profile?:  TitanGuestProfile;
  sage?:     SagePayload;
  message?:  string;
  redirect?: string;
}

export interface SentimentPayload {
  guestId?:       string;
  venueId?:       string;
  region?:        string;
  craftType?:     string;
  palateProfile:  string;
  nudgeAccepted?: boolean;
  brandId?:       string;
  productId?:     string;
}

export interface AtmosphereReading {
  venueId:            string;
  temperatureCelsius: number | null;
  humidityPct:        number | null;
  vitality:           number | null;
  isDeviant:          boolean;
  deviationNote:      string | null;
  lastUpdated:        string | null;
}

type SageWakeListener = (profile: TitanGuestProfile, sage: SagePayload) => void;

// ── Engine singleton ──────────────────────────────────────────────────────────

const _sageListeners: SageWakeListener[] = [];

const TitanEngine = {
  /**
   * Called on every hardware NFC tap (event.serialNumber from NDEFReader).
   * Looks up guest by physical token. On match, fires sage wake-up listeners.
   */
  async handleNFCTap(nfcTagId: string, venueId?: string): Promise<NfcTapResult> {
    try {
      const r = await fetch(`${BASE}/api/iot/nfc-tap`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nfcTagId, venueId }),
      });
      const data = (await r.json()) as NfcTapResult;
      if (data.success && data.profile && data.sage) {
        _sageListeners.forEach(fn => fn(data.profile!, data.sage!));
      }
      return data;
    } catch {
      return { success: false, message: "NFC tap failed — network error" };
    }
  },

  /**
   * Log a real-time palate sentiment event to the War Room feed.
   * Call after every draft pick, nudge acceptance, or flavor selection.
   */
  async logPalateSentiment(payload: SentimentPayload): Promise<void> {
    try {
      await fetch(`${BASE}/api/palate/log-sentiment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
    } catch { /* non-blocking */ }
  },

  /**
   * Spend NOVEE Credits and receive a Secret Passage URL.
   * Returns { token, url, expiresAt } on success, null on insufficient balance.
   */
  async spendPrestige(
    guestId:      string,
    amount:       number,
    targetPillar: "spent_wifex" | "spent_dayone360",
    venueId?:     string,
  ): Promise<{ token: string; url: string; expiresAt: string } | null> {
    try {
      const r = await fetch(`${BASE}/api/credits/spend/${guestId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creditType: targetPillar, amount, venueId }),
      });
      if (r.status === 402) return null; // insufficient credits
      const d = (await r.json()) as { secretPassage?: { token: string; url: string; expiresAt: string } };
      return d.secretPassage ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Pull the live IoT atmosphere reading for a venue.
   */
  async syncEnvironment(venueId: string): Promise<AtmosphereReading | null> {
    try {
      const r = await fetch(`${BASE}/api/iot/atmosphere/${venueId}`);
      if (!r.ok) return null;
      return (await r.json()) as AtmosphereReading;
    } catch {
      return null;
    }
  },

  /**
   * Register a listener that fires whenever an NFC tap successfully
   * identifies a guest and wakes their Sage.
   */
  onSageWake(fn: SageWakeListener): () => void {
    _sageListeners.push(fn);
    return () => {
      const i = _sageListeners.indexOf(fn);
      if (i > -1) _sageListeners.splice(i, 1);
    };
  },
};

export default TitanEngine;
