/**
 * MentorChatBubble — streams OpenAI mentor response after each swipe.
 * Replaces static InsightBubble with live AI-generated commentary.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  mentorId:    string;
  craftType:   "smoke" | "pour" | "brew" | "vape";
  recentTags:  string[];
  guestLevel:  string;
  swipeAction: "add" | "skip" | null;
  itemName:    string | null;
  trigger:     number; // increment to trigger new fetch
}

const MENTOR_COLORS: Record<string, string> = {
  traditionalist: "#D48B00",
  scientist:      "#4FC3F7",
  collector:      "#CE93D8",
  social_expert:  "#A5D6A7",
  sommelier:      "#FFCC80",
  rebel:          "#EF9A9A",
};

const MENTOR_INITIALS: Record<string, string> = {
  traditionalist: "R",
  scientist:      "E",
  collector:      "J",
  social_expert:  "S",
  sommelier:      "A",
  rebel:          "M",
};

export default function MentorChatBubble({ mentorId, craftType, recentTags, guestLevel, swipeAction, itemName, trigger }: Props) {
  const [text,    setText]    = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef  = useRef<AbortController | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const color     = MENTOR_COLORS[mentorId] ?? "#D48B00";
  const initial   = MENTOR_INITIALS[mentorId] ?? "M";

  useEffect(() => {
    if (trigger === 0) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);

    setText("");
    setVisible(true);
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/mentor/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ mentorId, craftType, recentTags, guestLevel, swipeAction, itemName }),
          signal:  abortRef.current!.signal,
        });

        if (!res.ok || !res.body) throw new Error("No stream");

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = "";

        setLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) setText(prev => prev + json.content);
              if (json.done)    break;
            } catch { /* skip malformed */ }
          }
        }

        // Auto-dismiss after reading time
        timerRef.current = setTimeout(() => setVisible(false), 4800);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setLoading(false);
          setVisible(false);
        }
      }
    })();

    return () => { abortRef.current?.abort(); };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1     }}
          exit={{    opacity: 0, y: 8,  scale: 0.97  }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            position:        "absolute",
            bottom:          "5.5rem",
            left:            "50%",
            transform:       "translateX(-50%)",
            width:           "min(90vw, 380px)",
            background:      "rgba(26,26,27,0.82)",
            backdropFilter:  "blur(18px) saturate(1.2)",
            WebkitBackdropFilter: "blur(18px) saturate(1.2)",
            border:          `1px solid ${color}33`,
            borderRadius:    "16px",
            padding:         "14px 16px",
            boxShadow:       `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px ${color}18`,
            zIndex:          60,
            pointerEvents:   "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            {/* Mentor avatar */}
            <div style={{
              width:           "32px",
              height:          "32px",
              borderRadius:    "50%",
              background:      `radial-gradient(circle at 35% 35%, ${color}cc, ${color}44)`,
              border:          `1px solid ${color}66`,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              flexShrink:      0,
              fontFamily:      "'Cormorant Garamond', serif",
              fontSize:        "13px",
              fontWeight:      600,
              color:           "#fff",
              boxShadow:       `0 0 12px ${color}44`,
            }}>
              {initial}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize:   "11px",
                letterSpacing: "0.1em",
                color:      color,
                textTransform: "uppercase",
                marginBottom: "4px",
                opacity:    0.85,
              }}>
                {mentorId.replace(/_/g, " ")}
              </div>

              {loading ? (
                <div style={{ display: "flex", gap: "5px", paddingTop: "4px" }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                      style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: color,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p style={{
                  fontFamily:  "'Cormorant Garamond', serif",
                  fontSize:    "15px",
                  lineHeight:  "1.55",
                  color:       "#F5F2ED",
                  margin:      0,
                  fontStyle:   "italic",
                }}>
                  {text}
                  {/* Blinking cursor while streaming */}
                  {text.length > 0 && !text.endsWith(".") && !text.endsWith('"') && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      style={{ display: "inline-block", width: "2px", height: "14px",
                               background: color, marginLeft: "2px", verticalAlign: "middle" }}
                    />
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Ambient glow line */}
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: "absolute", bottom: 0, left: "10%", right: "10%",
              height: "1px",
              background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
              borderRadius: "1px",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
