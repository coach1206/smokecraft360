/**
 * AudioContext — silent data-flow context.
 *
 * All audio playback (HTML5 SpeechSynthesis, ElevenLabs TTS) has been removed.
 * speak() and stopSpeak() are no-ops. isMuted / toggleMute are retained for
 * backwards-compatibility with any code that checks the mute flag, but they
 * no longer control audio (there is none).
 *
 * AudioWaveToggle has been converted from an audio control into a silent
 * kinetic data-flow pulse indicator — a purely visual ambient element.
 */

import { createContext, useContext, useCallback, useState } from "react";
import { motion } from "framer-motion";

interface AudioContextValue {
  isMuted:    boolean;
  toggleMute: () => void;
  speak:      (text: string, craft?: string) => void;
  stopSpeak:  () => void;
}

const AudioCtx = createContext<AudioContextValue>({
  isMuted:    true,
  toggleMute: () => {},
  speak:      () => {},
  stopSpeak:  () => {},
});

export function useAudio() {
  return useContext(AudioCtx);
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute  = useCallback(() => setIsMuted(p => !p), []);
  const speak       = useCallback(() => {}, []);
  const stopSpeak   = useCallback(() => {}, []);

  return (
    <AudioCtx.Provider value={{ isMuted, toggleMute, speak, stopSpeak }}>
      {children}
    </AudioCtx.Provider>
  );
}

/**
 * DataFlowPulse — silent kinetic ambient indicator.
 *
 * Visualises background intelligence data flow as five independently-
 * animated vertical bars with a gold + green glow. No click handler,
 * no audio state, no labels — pure tactile visual presence.
 */
export function AudioWaveToggle() {
  const BAR_HEIGHTS = [0.45, 0.90, 0.65, 1.0, 0.55];
  const DELAYS      = [0, 0.09, 0.17, 0.06, 0.22];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      aria-hidden="true"
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        gap:            3,
        height:         28,
        padding:        "0 10px",
        borderRadius:   10,
        background:     "rgba(212,175,55,0.06)",
        border:         "1px solid rgba(212,175,55,0.18)",
        backdropFilter: "blur(10px)",
        flexShrink:     0,
        pointerEvents:  "none",
      }}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          style={{
            width:        3,
            borderRadius: 2,
            background:   i % 2 === 0
              ? "rgba(212,175,55,0.80)"
              : "rgba(74,222,128,0.70)",
            boxShadow: i % 2 === 0
              ? "0 0 6px rgba(212,175,55,0.55)"
              : "0 0 6px rgba(74,222,128,0.40)",
          }}
          animate={{
            height: [
              `${h * 18 * 0.25}px`,
              `${h * 18}px`,
              `${h * 18 * 0.15}px`,
            ],
            opacity: [0.55, 1, 0.45],
          }}
          transition={{
            duration:   0.68 + i * 0.11,
            repeat:     Infinity,
            repeatType: "reverse",
            ease:       "easeInOut",
            delay:      DELAYS[i],
          }}
        />
      ))}
    </motion.div>
  );
}
