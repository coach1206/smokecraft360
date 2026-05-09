import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface AudioContextValue {
  isMuted:    boolean;
  toggleMute: () => void;
  speak:      (text: string) => void;
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

// ── Provider ──────────────────────────────────────────────────────────────────
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => {
    try { return localStorage.getItem("axiom_audio_muted") === "1"; } catch { return false; }
  });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer         = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try { localStorage.setItem("axiom_audio_muted", next ? "1" : "0"); } catch {}
      if (next) {
        window.speechSynthesis?.cancel();
        showToast("Mentor Audio: Muted");
      } else {
        showToast("Mentor Audio: Active");
      }
      return next;
    });
  }, [showToast]);

  const speak = useCallback((text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = 0.82;
    utt.pitch  = 0.78;
    utt.volume = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const deep   = voices.find(v => /Daniel|Google UK English Male|Male|Alex/i.test(v.name));
    if (deep) utt.voice = deep;
    window.speechSynthesis.speak(utt);
  }, [isMuted]);

  const stopSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  // Cancel speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return (
    <AudioCtx.Provider value={{ isMuted, toggleMute, speak, stopSpeak }}>
      {children}
      <AudioToast message={toast} />
    </AudioCtx.Provider>
  );
}

// ── Persistent Audio Wave Toggle — drops into any header ─────────────────────
export function AudioWaveToggle() {
  const { isMuted, toggleMute } = useAudio();
  const bars = [0.5, 1.0, 0.7, 0.9, 0.6];

  return (
    <motion.button
      type="button"
      onClick={toggleMute}
      whileTap={{ scale: 0.88 }}
      title={isMuted ? "Mentor Audio: Muted" : "Mentor Audio: Active"}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            5,
        background:     isMuted ? "rgba(26,26,27,0.10)" : "rgba(212,175,55,0.10)",
        border:         `1px solid ${isMuted ? "rgba(255,255,255,0.10)" : "rgba(212,175,55,0.38)"}`,
        borderRadius:   10,
        padding:        "8px 12px",
        cursor:         "pointer",
        backdropFilter: "blur(8px)",
        color:          isMuted ? "rgba(255,255,255,0.28)" : "#d4af37",
        transition:     "background 0.25s, border-color 0.25s, color 0.25s",
      }}
    >
      {isMuted ? (
        <VolumeX size={13} />
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 13 }}>
          {bars.map((h, i) => (
            <motion.div
              key={i}
              style={{ width: 2.5, borderRadius: 1, background: "#d4af37" }}
              animate={{ height: [h * 13 * 0.35, h * 13, h * 13 * 0.25] }}
              transition={{
                duration:    0.45 + i * 0.07,
                repeat:      Infinity,
                repeatType:  "reverse",
                ease:        "easeInOut",
                delay:       i * 0.06,
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}
