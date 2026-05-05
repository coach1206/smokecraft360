import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useVoice } from "@/hooks/useVoice";
import { isCoachMuted, setCoachMuted, playSFX } from "@/services/sound";
import { getCoachLines, pickCoachLine } from "@/config/craftCoachLines";
import type { CraftMoodCard, CraftStyleCard } from "@/components/CraftFlow";

type Phase     = "intro" | "style" | "profile" | "match" | "reveal";
type CraftType = "smoke" | "brew" | "pour" | "vape";

interface FixOption {
  label:  string;
  desc:   string;
  action: () => void;
}

export interface AICoachProps {
  craft:         CraftType;
  phase:         Phase;
  accentColor:   string;
  score:         number;
  prevScore:     number;
  styles:        CraftStyleCard[];
  moods:         CraftMoodCard[];
  selectedStyle: CraftStyleCard | null;
  selectedMood:  CraftMoodCard | null;
  onFixApplied:  (style: CraftStyleCard, mood: CraftMoodCard | null) => void;
}

const MAX_SPEAK = 160;

const CRAFT_GLYPH: Record<CraftType, string> = {
  smoke: "🎯",
  brew:  "🍺",
  pour:  "🥃",
  vape:  "💨",
};

export default function AICoach({
  craft,
  phase,
  accentColor,
  score,
  prevScore,
  styles,
  moods,
  selectedStyle,
  selectedMood,
  onFixApplied,
}: AICoachProps) {
  const voice = useVoice();

  const [muted,     setMuted]     = useState<boolean>(() => isCoachMuted());
  const [line,      setLine]      = useState<string>("");
  const [showFix,   setShowFix]   = useState<boolean>(false);
  const [fixOptions, setFixOptions] = useState<FixOption[]>([]);

  /** Track the phase we last processed so we fire exactly once per transition. */
  const lastPhaseRef = useRef<Phase>("intro");
  /** Track whether we are currently in a bad-combo state. */
  const lastBadRef   = useRef<boolean>(false);
  /** Stable voice ref so effects don't need `voice` as a dep. */
  const voiceRef     = useRef(voice);
  useEffect(() => { voiceRef.current = voice; });

  // Bad-combo: score meaningfully low and dropping while a mood has been chosen.
  const isBadCombo = score < 40 && score < prevScore && selectedMood !== null;

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const speakLine = useCallback((text: string) => {
    if (muted) return;
    void voiceRef.current.speak(text.slice(0, MAX_SPEAK));
  }, [muted]);

  const buildFixOptions = useCallback((): FixOption[] => {
    // A — Safe: a style whose .mood field matches the selected mood
    const safeStyle =
      styles.find(s => selectedMood && s.mood === selectedMood.id && s.id !== selectedStyle?.id) ??
      styles.find(s => s.strength <= 2 && s.id !== selectedStyle?.id);

    // B — Balanced: median-strength style (different from safe if possible)
    const sorted        = [...styles].sort((a, b) => a.strength - b.strength);
    const balancedStyle = sorted[Math.floor(sorted.length / 2)];

    // C — Risk it: keep style, switch to a "bold" or last mood
    const boldMood = moods.find(m => m.id === "bold") ?? moods[moods.length - 1];

    const opts: FixOption[] = [];

    if (safeStyle) {
      opts.push({
        label:  "A — Safe Fix",
        desc:   `Switch to "${safeStyle.title}"`,
        action: () => {
          playSFX("tap");
          onFixApplied(safeStyle, selectedMood);
        },
      });
    }

    if (balancedStyle && balancedStyle.id !== safeStyle?.id) {
      opts.push({
        label:  "B — Balanced",
        desc:   `Try "${balancedStyle.title}"`,
        action: () => {
          playSFX("tap");
          onFixApplied(balancedStyle, selectedMood);
        },
      });
    }

    if (boldMood && selectedStyle) {
      opts.push({
        label:  "C — Risk It",
        desc:   `Keep style, switch to "${boldMood.title}" mood`,
        action: () => {
          playSFX("tap");
          if (selectedStyle) onFixApplied(selectedStyle, boldMood);
        },
      });
    }

    return opts;
  }, [styles, moods, selectedStyle, selectedMood, onFixApplied]);

  // ------------------------------------------------------------------
  // Phase-transition effect
  // ------------------------------------------------------------------
  useEffect(() => {
    if (lastPhaseRef.current === phase) return;
    lastPhaseRef.current = phase;

    // Determine the right event key
    type EventKey =
      | "phase_intro"
      | "phase_style"
      | "phase_profile"
      | "phase_match"
      | "phase_reveal_praise"
      | "phase_reveal_challenge";

    const eventMap: Record<Phase, EventKey> = {
      intro:   "phase_intro",
      style:   "phase_style",
      profile: "phase_profile",
      match:   "phase_match",
      reveal:  score >= 60 ? "phase_reveal_praise" : "phase_reveal_challenge",
    };
    const event = eventMap[phase];

    const newLine = pickCoachLine(getCoachLines(craft, event));
    setLine(newLine);
    setShowFix(false);

    if (!muted) {
      playSFX("swoosh");
      speakLine(newLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ------------------------------------------------------------------
  // Bad-combo detection effect
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isBadCombo && !lastBadRef.current) {
      lastBadRef.current = true;
      const newLine = pickCoachLine(getCoachLines(craft, "bad_combo"));
      setLine(newLine);
      const opts = buildFixOptions();
      setFixOptions(opts);
      setShowFix(true);
      if (!muted) {
        playSFX("error");
        speakLine(newLine);
      }
    } else if (!isBadCombo) {
      lastBadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBadCombo, craft]);

  // ------------------------------------------------------------------
  // Score-milestone effect (first time score crosses 70)
  // ------------------------------------------------------------------
  const prevScoreRef = useRef(score);
  useEffect(() => {
    if (!muted && score >= 70 && prevScoreRef.current < 70) {
      playSFX("success");
    }
    prevScoreRef.current = score;
  }, [score, muted]);

  // ------------------------------------------------------------------
  // Mute toggle
  // ------------------------------------------------------------------
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setCoachMuted(next);
    if (next) voiceRef.current.stop();
    else playSFX("tap");
  };

  // Don't render anything during the intro phase — coach activates at style.
  if (phase === "intro") return null;

  return (
    <div
      data-testid="ai-coach"
      style={{
        position:      "fixed",
        bottom:        24,
        left:          24,
        zIndex:        1200,
        maxWidth:      308,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="popLayout">
        {/* ── A/B/C Fix card ── */}
        {showFix && fixOptions.length > 0 && (
          <motion.div
            key="fix-card"
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginBottom:    10,
              background:      "rgba(10,6,4,0.94)",
              border:          "1px solid rgba(210,70,70,0.32)",
              borderRadius:    14,
              padding:         "12px 14px",
              backdropFilter:  "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              pointerEvents:   "all",
            }}
          >
            <p style={{
              margin:          "0 0 9px",
              fontSize:        10,
              letterSpacing:   "0.26em",
              textTransform:   "uppercase",
              color:           "rgba(220,130,130,0.9)",
              fontWeight:      700,
            }}>
              Fix Options
            </p>

            {fixOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => { opt.action(); setShowFix(false); }}
                style={{
                  display:       "block",
                  width:         "100%",
                  marginBottom:  6,
                  padding:       "8px 11px",
                  borderRadius:  9,
                  border:        `1px solid ${accentColor}28`,
                  background:    `${accentColor}0d`,
                  cursor:        "pointer",
                  textAlign:     "left",
                  color:         "#E8E0C8",
                  transition:    "background 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accentColor}0d`; }}
              >
                <span style={{
                  fontSize:      10,
                  fontWeight:    700,
                  color:         accentColor,
                  letterSpacing: "0.14em",
                  marginRight:   8,
                }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: 11, color: "rgba(232,224,200,0.72)" }}>
                  {opt.desc}
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowFix(false)}
              style={{
                marginTop:     4,
                fontSize:      9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color:         "rgba(232,224,200,0.3)",
                background:    "transparent",
                border:        "none",
                cursor:        "pointer",
                padding:       "2px 0",
              }}
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* ── Coach bubble ── */}
        {line && (
          <motion.div
            key={`bubble-${phase}-${muted ? "m" : "u"}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0   }}
            exit={{    opacity: 0, x: -8  }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display:         "flex",
              alignItems:      "flex-start",
              gap:             10,
              background:      "rgba(10,8,6,0.84)",
              border:          `1px solid ${accentColor}26`,
              borderRadius:    14,
              padding:         "11px 12px",
              backdropFilter:  "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              pointerEvents:   "all",
            }}
          >
            {/* Avatar glyph */}
            <div style={{
              width:          30,
              height:         30,
              flexShrink:     0,
              borderRadius:   "50%",
              border:         `1.5px solid ${accentColor}55`,
              background:     `${accentColor}14`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       14,
              userSelect:     "none",
            }}>
              {CRAFT_GLYPH[craft]}
            </div>

            {/* Coach line text */}
            <p style={{
              flex:       1,
              margin:     0,
              fontSize:   12,
              lineHeight: 1.48,
              color:      "rgba(232,224,200,0.92)",
              fontFamily: "var(--app-font-serif, Georgia, serif)",
              minWidth:   0,
            }}>
              {line}
            </p>

            {/* Mute toggle */}
            <button
              type="button"
              data-testid="ai-coach-mute"
              onClick={toggleMute}
              title={muted ? "Unmute coach" : "Mute coach"}
              style={{
                flexShrink:  0,
                background:  "transparent",
                border:      "none",
                cursor:      "pointer",
                color:       muted ? "rgba(232,224,200,0.28)" : `${accentColor}bb`,
                padding:     "2px 0 2px 4px",
                lineHeight:  1,
              }}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
