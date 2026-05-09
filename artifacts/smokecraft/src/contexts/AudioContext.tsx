import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VolumeX } from "lucide-react";

interface AudioContextValue {
  isMuted:    boolean;
  toggleMute: () => void;
  speak:      (text: string, craft?: string) => void;
  stopSpeak:  () => void;
}

const AudioCtx = createContext<AudioContextValue>({
  isMuted:    false,
  toggleMute: () => {},
  speak:      () => {},
  stopSpeak:  () => {},
});

export function useAudio() {
  return useContext(AudioCtx);
}

// ── Craft → ElevenLabs voice ID map (mirrors server DEFAULT_VOICES) ───────────
const CRAFT_VOICE_IDS: Record<string, string> = {
  smoke: "2EiwWnXFnvU5JabPnv8n", // Clyde — deep bass, The Warm Tobacconist
  pour:  "onwK4e9ZLuTAKqWW03F9", // Daniel — refined British, The Sommelier
  brew:  "TxGEqnHWrfWFTfGW9XjX", // Josh — friendly approachable, The Master Brewer
  vape:  "pNInz6obpgDQGcFmaJgB", // Adam — modern neutral, The Vape Artisan
};

// ── Toast shown briefly on mute toggle ───────────────────────────────────────
function AudioToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 14, scale: 0.92 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{   opacity: 0, y: -8,  scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position:       "fixed",
            top:            72,
            left:           "50%",
            transform:      "translateX(-50%)",
            zIndex:         99999,
            background:     "rgba(12,8,2,0.92)",
            border:         "1px solid rgba(212,175,55,0.45)",
            borderRadius:   12,
            padding:        "10px 20px",
            fontSize:       11,
            fontWeight:     700,
            letterSpacing:  "0.16em",
            textTransform:  "uppercase" as const,
            color:          "#d4af37",
            backdropFilter: "blur(14px)",
            boxShadow:      "0 8px 32px rgba(0,0,0,0.60)",
            pointerEvents:  "none",
            whiteSpace:     "nowrap",
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ElevenLabs TTS via server proxy ──────────────────────────────────────────
async function speakViaElevenLabs(
  text: string,
  craft: string | undefined,
  audioElRef: React.MutableRefObject<HTMLAudioElement | null>,
): Promise<boolean> {
  const voiceId = craft ? (CRAFT_VOICE_IDS[craft] ?? CRAFT_VOICE_IDS.smoke) : CRAFT_VOICE_IDS.smoke;
  try {
    const res = await fetch("/api/voice/speak", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: text.slice(0, 280), voiceId }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    if (audioElRef.current) {
      audioElRef.current.pause();
      URL.revokeObjectURL(audioElRef.current.src);
    }
    const el = new Audio(url);
    audioElRef.current = el;
    el.onended = () => { URL.revokeObjectURL(url); audioElRef.current = null; };
    await el.play();
    return true;
  } catch {
    return false;
  }
}

// ── Web Speech fallback ───────────────────────────────────────────────────────
function speakViaWebSpeech(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.rate   = 0.78;
  utt.pitch  = 0.72;
  utt.volume = 0.92;
  const voices = window.speechSynthesis.getVoices();
  const deep   = voices.find(v => /Daniel|Google UK English Male|Male|Alex/i.test(v.name));
  if (deep) utt.voice = deep;
  window.speechSynthesis.speak(utt);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem("axiom_audio_muted") === "1"; } catch { return false; }
  });
  const [toast, setToast]     = useState<string | null>(null);
  const toastTimer            = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const audioElRef            = useRef<HTMLAudioElement | null>(null);
  const isMutedRef            = useRef(isMuted);
  isMutedRef.current          = isMuted;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const stopSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try { localStorage.setItem("axiom_audio_muted", next ? "1" : "0"); } catch {}
      if (next) {
        window.speechSynthesis?.cancel();
        if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
        showToast("Mentor Audio: Muted");
      } else {
        showToast("Mentor Audio: Active");
      }
      return next;
    });
  }, [showToast]);

  const speak = useCallback((text: string, craft?: string) => {
    if (isMutedRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    speakViaElevenLabs(trimmed, craft, audioElRef).then(success => {
      if (!success && !isMutedRef.current) speakViaWebSpeech(trimmed);
    });
  }, []);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
  }, []);

  return (
    <AudioCtx.Provider value={{ isMuted, toggleMute, speak, stopSpeak }}>
      {children}
      <AudioToast message={toast} />
    </AudioCtx.Provider>
  );
}

// ── Persistent Gold Mute Toggle — drops into any header ──────────────────────
export function AudioWaveToggle() {
  const { isMuted, toggleMute } = useAudio();
  const bars = [0.5, 1.0, 0.7, 0.9, 0.6];

  return (
    <motion.button
      type="button"
      onClick={toggleMute}
      whileTap={{ scale: 0.88 }}
      animate={isMuted ? {} : { boxShadow: ["0 0 0px #D48B0000", "0 0 8px #D48B0055", "0 0 0px #D48B0000"] }}
      transition={isMuted ? {} : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      title={isMuted ? "Mentor Audio: Muted — click to enable" : "Mentor Audio: Active — click to mute"}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            6,
        background:     isMuted ? "rgba(26,26,27,0.18)" : "rgba(212,139,0,0.12)",
        border:         `1px solid ${isMuted ? "rgba(255,255,255,0.12)" : "rgba(212,139,0,0.50)"}`,
        borderRadius:   10,
        padding:        "8px 13px",
        cursor:         "pointer",
        backdropFilter: "blur(10px)",
        color:          isMuted ? "rgba(255,255,255,0.30)" : "#D48B00",
        transition:     "background 0.22s, border-color 0.22s, color 0.22s",
        minHeight:      36,
        flexShrink:     0,
      }}
    >
      {isMuted ? (
        <>
          <VolumeX size={14} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Muted
          </span>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
            {bars.map((h, i) => (
              <motion.div
                key={i}
                style={{ width: 2.5, borderRadius: 1.5, background: "#D48B00" }}
                animate={{ height: [h * 14 * 0.3, h * 14, h * 14 * 0.2] }}
                transition={{
                  duration:    0.42 + i * 0.07,
                  repeat:      Infinity,
                  repeatType:  "reverse",
                  ease:        "easeInOut",
                  delay:       i * 0.06,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#D48B00" }}>
            Audio
          </span>
        </>
      )}
    </motion.button>
  );
}
