/**
 * POST /api/voice/speak — proxies text-to-speech through ElevenLabs.
 *
 * Browser never sees the API key. Audio is streamed back as audio/mpeg
 * for the frontend to play via a Blob URL. Falls back gracefully when
 * the connector hasn't been authorized yet.
 *
 *   Body:
 *   {
 *     "text":    "A bold, smoky pairing with cedar notes.",
 *     "persona": "female" | "male",          // default female
 *     "voiceId": "EXAVITQu4vr4xnSDxMaL"      // optional override
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
import { resolveElevenLabsKey, DEFAULT_VOICES, type VoicePersona } from "../lib/elevenlabs";

const router: IRouter = Router();

/** Hard cap on text length to keep credits sane and latency low.
 *  Aligned with the frontend's 280-char `speakable()` clip in VoicePanel
 *  so a tampered client can't sneak in a long string. */
const MAX_TEXT_CHARS = 280;

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

    let resolvedVoiceId: string;
    if (typeof voiceId === "string" && /^[A-Za-z0-9]{8,}$/.test(voiceId)) {
      resolvedVoiceId = voiceId;
    } else {
      const key: VoicePersona = persona === "male" ? "male" : "female";
      resolvedVoiceId = DEFAULT_VOICES[key];
    }

    const apiKey = await resolveElevenLabsKey();
    if (!apiKey) {
      res.status(503).json({
        error:  "voice_not_configured",
        detail: "ElevenLabs connector is not authorized for this project. Visit Replit integrations to connect.",
      });
      return;
    }

    let upstream: Response | globalThis.Response;
    try {
      upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(resolvedVoiceId)}`,
        {
          method:  "POST",
          headers: {
            "xi-api-key":   apiKey,
            "Content-Type": "application/json",
            "Accept":       "audio/mpeg",
          },
          body: JSON.stringify({
            text:     cleaned,
            model_id: "eleven_monolingual_v1",
          }),
        },
      );
    } catch (err) {
      req.log.error({ err }, "elevenlabs request threw");
      res.status(502).json({ error: "voice_upstream_unreachable" });
      return;
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      req.log.warn({ status: upstream.status, detail: detail.slice(0, 200) }, "elevenlabs upstream error");
      res.status(502).json({ error: "voice_upstream_failed", status: upstream.status });
      return;
    }

    const audioBuffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(audioBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.send(audioBuffer);
  },
);

export default router;
