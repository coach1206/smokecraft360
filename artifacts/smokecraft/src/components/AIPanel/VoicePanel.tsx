/**
 * VoicePanel — AI Sommelier commentary display.
 *
 * Renders deterministic commentary text from the recommend response.
 * All TTS playback controls (play/stop button, persona toggle, mic button)
 * have been removed. The panel is now a read-only commentary card.
 *
 * Degrades gracefully: no commentary → neutral "ready" state.
 */
import ExperienceFrame from "@/components/ExperienceFrame";
import type { RecommendCommentary } from "@/services/api";

export interface VoicePanelProps {
  commentary?:   RecommendCommentary;
  autoSpeak?:    boolean;
  onTranscript?: (text: string) => void;
  accent?:       string;
  testId?:       string;
}

export default function VoicePanel({
  commentary,
  accent  = "rgba(212,139,0,0.55)",
  testId  = "voice-panel",
}: VoicePanelProps) {
  return (
    <ExperienceFrame accent={accent} padding="22px 22px" testId={testId}>
      <p
        style={{
          margin:        "0 0 14px",
          fontSize:      10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color:         "#D48B00",
          fontWeight:    600,
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
              fontSize:   17,
              lineHeight: 1.45,
              margin:     "0 0 10px",
              color:      "#1A1A1B",
              fontWeight: 500,
            }}
          >
            {commentary.description}
          </p>
          {commentary.reasoning && (
            <p
              data-testid={`${testId}-reasoning`}
              style={{
                fontSize:   13,
                lineHeight: 1.55,
                margin:     "0 0 16px",
                color:      "#D4D0C8",
              }}
            >
              {commentary.reasoning}
            </p>
          )}
        </>
      ) : (
        <p
          style={{
            fontSize:   13,
            color:      "#A8A8A8",
            margin:     "0 0 16px",
            fontStyle:  "italic",
          }}
        >
          Pick a style and I'll talk you through the pairing.
        </p>
      )}
    </ExperienceFrame>
  );
}
