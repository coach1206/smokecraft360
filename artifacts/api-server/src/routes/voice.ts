/**
 * POST /api/voice/speak — proxies text-to-speech through the VoiceOrchestrator.
 *
 * All ElevenLabs calls flow through VoiceOrchestrator (circuit breaker + kernelBus
 * events + usage metering + credential vault). Never calls ElevenLabs directly.
 *
 *   Body:
 *   {
 *     "text":    "A bold, smoky pairing with cedar notes.",
 *     "persona": "female" | "male" | "smoke" | "pour" | "brew" | "vape",
 *     "voiceId": "EXAVITQu4vr4xnSDxMaL"  // optional override
 *   }
 *
 *   Responses:
 *   - 200 audio/mpeg                  — synthesized speech
 *   - 400 application/json            — bad input
 *   - 503 application/json            — ElevenLabs not configured
 *   - 502 application/json            — upstream ElevenLabs failure
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { allowOnly } from "../middleware/sanitize";
import { VoiceOrchestrator } from "../core/providers/VoiceOrchestrator";
import type { VoicePersona } from "../lib/elevenlabs";

const router: IRouter = Router();

/** Hard cap on text length to keep credits sane and latency low. */
const MAX_TEXT_CHARS = 280;

/** Venue ID for voice requests — uses system venue so usage is tracked centrally. */
const VOICE_VENUE_ID = process.env["SYSTEM_VENUE_ID"] ?? "00000000-0000-0000-0000-000000000001";

router.post(
  "/speak",
  allowOnly("text", "persona", "voiceId"),
  async (req: Request, res: Response) => {
    const { text, persona, voiceId } = req.body as {
      text?:    unknown;
      persona?: unknown;
      voiceId?: unknown;
    };

    if (typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: '"text" must be a non-empty string' });
      return;
    }
    const cleaned = text.trim().slice(0, MAX_TEXT_CHARS);

    const resolvedPersona: VoicePersona | undefined =
      typeof persona === "string" && persona in { female: 1, male: 1, smoke: 1, pour: 1, brew: 1, vape: 1 }
        ? persona as VoicePersona
        : undefined;

    const resolvedVoiceId =
      typeof voiceId === "string" && /^[A-Za-z0-9]{8,}$/.test(voiceId)
        ? voiceId
        : undefined;

    try {
      const result = await VoiceOrchestrator.synthesize({
        venueId:  VOICE_VENUE_ID,
        text:     cleaned,
        persona:  resolvedPersona,
        voiceId:  resolvedVoiceId,
      });

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Length", String(result.audioBuffer.length));
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Voice-Provider", result.provider);
      res.setHeader("X-Voice-Latency-Ms", String(result.latencyMs));
      res.send(result.audioBuffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("not configured") || msg.includes("API key")) {
        res.status(503).json({
          error:  "voice_not_configured",
          detail: "ElevenLabs connector is not authorized. Visit Replit integrations to connect.",
        });
        return;
      }

      if (msg.includes("circuit breaker OPEN")) {
        res.status(503).json({
          error:  "voice_circuit_breaker_open",
          detail: "Voice provider is temporarily unavailable. Please try again shortly.",
        });
        return;
      }

      req.log?.error({ err }, "VoiceOrchestrator: synthesis failed");
      res.status(502).json({ error: "voice_upstream_failed" });
    }
  },
);

export default router;
