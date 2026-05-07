import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ExperienceFrame from "@/components/ExperienceFrame";
import { useVoice }    from "@/hooks/useVoice";
import { useMic }      from "@/hooks/useMic";
import type { RecommendCommentary, VoicePersona } from "@/services/api";

/**
 * VoicePanel — right-column "AI brain" for any craft page.
 *
 * Renders deterministic commentary text from the recommend response,
 * a play/stop button (ElevenLabs TTS via /api/voice/speak), a persona
 * toggle (male/female), and a mic button for voice input.
 *
 * Auto-speak: when `commentary` changes AND `autoSpeak` is true, plays
 * once. Subsequent commentary swaps replay automatically.
 *
 * Degrades gracefully:
 *   - No commentary → renders a neutral "ready" state
 *   - Voice not configured → shows hint, hides play button
 *   - Mic unsupported → hides mic button
 *
 * Locale comes from i18n.language so the persona/copy can localize
 * later without prop plumbing.
 */
export interface VoicePanelProps {
  commentary?: RecommendCommentary;
  /** Auto-speak when commentary changes. Off by default to avoid surprise audio. */
  autoSpeak?:  boolean;
  /** Notified when mic transcript is finalized — host wires it to its own intent handler. */
  onTranscript?: (text: string) => void;
  /** Override accent color to match the host page (BrewCraft amber, PourCraft copper, etc.) */
  accent?:     string;
  testId?:     string;
}

const SPEAKABLE_LIMIT = 280;

function speakable(c: RecommendCommentary): string {
  const text = c.reasoning ? `${c.description} ${c.reasoning}` : c.description;
  return text.slice(0, SPEAKABLE_LIMIT);
}

export default function VoicePanel({
  commentary,
  autoSpeak    = false,
  onTranscript,
  accent       = "rgba(212,139,0,0.55)",
  testId       = "voice-panel",
}: VoicePanelProps) {
  const { i18n }   = useTranslation();
  const voice      = useVoice();
  const mic        = useMic();
  const [persona, setPersona] = useState<VoicePersona>("female");

  /* Auto-speak fresh commentary, gated on opt-in to avoid surprise audio
   * on initial render. We compare description text to deduplicate replays. */
  const lastSpoken = commentary?.description ?? "";
  useEffect(() => {
    if (!autoSpeak || !commentary) return;
    void voice.speak(speakable(commentary), persona);
    // intentionally not depending on `voice` (stable but recreated each render);
    // re-running on commentary or persona change is the desired behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, lastSpoken, persona]);

  /* Bubble the final transcript up once the user stops talking. */
  useEffect(() => {
    if (!mic.isListening && mic.transcript && onTranscript) {
      onTranscript(mic.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.isListening]);

  const voiceUnavailable = voice.error === "voice_not_configured";

  return (
    <ExperienceFrame accent={accent} padding="22px 22px" testId={testId}>
      <p
        style={{
          margin: "0 0 14px", fontSize: 10,
          letterSpacing: "0.32em", textTransform: "uppercase",
          color: "#D48B00", fontWeight: 600,
        }}
      >
        AI Sommelier
      </p>

      {commentary ? (
        <>
          <p
            data-testid={`${testId}-description`}
            style={{
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              fontSize: 17, lineHeight: 1.45,
              margin: "0 0 10px", color: "#1A1A1B",
              fontWeight: 500,
            }}
          >
            {commentary.description}
          </p>
          {commentary.reasoning && (
            <p
              data-testid={`${testId}-reasoning`}
              style={{
                fontSize: 13, lineHeight: 1.55,
                margin: "0 0 16px", color: "#D4D0C8",
              }}
            >
              {commentary.reasoning}
            </p>
          )}
        </>
      ) : (
        <p
          style={{
            fontSize: 13, color: "#A8A8A8",
            margin: "0 0 16px", fontStyle: "italic",
          }}
        >
          Pick a style and I'll talk you through the pairing.
        </p>
      )}

      {/* Persona toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }} role="radiogroup" aria-label="Voice persona">
        {(["female", "male"] as VoicePersona[]).map((p) => {
          const active = persona === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`${testId}-persona-${p}`}
              onClick={() => setPersona(p)}
              style={{
                flex: 1,
                background:    active ? "rgba(212,139,0,0.22)" : "rgba(26,26,27,0.06)",
                border:        `1px solid ${active ? "#D48B00" : "rgba(255,255,255,0.1)"}`,
                color:         active ? "#1A1A1B" : "#A8A8A8",
                padding:       "8px 0",
                borderRadius:  10,
                fontSize:      11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor:        "pointer",
                fontWeight:    600,
              }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Voice + mic controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!voiceUnavailable && (
          <button
            type="button"
            data-testid={`${testId}-play`}
            disabled={!commentary || voice.isLoading}
            onClick={() => {
              if (voice.isSpeaking) voice.stop();
              else if (commentary)  void voice.speak(speakable(commentary), persona);
            }}
            style={{
              flex: 1,
              background:    voice.isSpeaking ? "#5A2C08" : "#D48B00",
              color:         voice.isSpeaking ? "#1A1A1B" : "#0A0604",
              border:        "none",
              padding:       "12px 14px",
              borderRadius:  10,
              fontSize:      12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight:    700,
              cursor:        commentary ? "pointer" : "default",
              opacity:       commentary ? 1 : 0.4,
            }}
          >
            {voice.isLoading
              ? "Loading…"
              : voice.isSpeaking
                ? "Stop"
                : "▶ Speak it"}
          </button>
        )}

        {mic.supported && (
          <button
            type="button"
            data-testid={`${testId}-mic`}
            onClick={() => {
              if (mic.isListening) mic.stop();
              else mic.start(i18n.language === "es" ? "es-ES"
                          : i18n.language === "fr" ? "fr-FR"
                          : "en-US");
            }}
            aria-pressed={mic.isListening}
            style={{
              minWidth: 52,
              background:    mic.isListening ? "#8B1A1A" : "rgba(26,26,27,0.08)",
              color:         "#1A1A1B",
              border:        `1px solid ${mic.isListening ? "#FF4040" : "rgba(26,26,27,0.17)"}`,
              padding:       "12px 14px",
              borderRadius:  10,
              fontSize:      14,
              cursor:        "pointer",
            }}
            title={mic.isListening ? "Listening — tap to stop" : "Tap to talk"}
          >
            {mic.isListening ? "● REC" : "🎤"}
          </button>
        )}
      </div>

      {voiceUnavailable && (
        <p
          data-testid={`${testId}-voice-disabled`}
          style={{
            margin: "10px 0 0", fontSize: 11,
            color: "#A8A8A8", lineHeight: 1.4,
          }}
        >
          Connect ElevenLabs in Replit integrations to enable voice.
        </p>
      )}

      {mic.transcript && (
        <p
          data-testid={`${testId}-transcript`}
          style={{
            margin: "10px 0 0", fontSize: 12,
            color: "#E5E5E5", fontStyle: "italic",
          }}
        >
          “{mic.transcript}”
        </p>
      )}
    </ExperienceFrame>
  );
}
