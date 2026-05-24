import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGoldenBoxStore } from "@/store/useGoldenBoxStore";

const ENTRIES = [
  { table: 4,  pts: 185, name: "Martinez" },
  { table: 11, pts: 162, name: "Ashford"  },
  { table: 7,  pts: 144, name: "Vance"    },
  { table: 2,  pts: 131, name: "Robles"   },
  { table: 9,  pts: 118, name: "Chandra"  },
  { table: 15, pts: 107, name: "Faulkner" },
  { table: 3,  pts:  98, name: "Osei"     },
  { table: 6,  pts:  91, name: "Tanaka"   },
];

const GOLD = "#D4AF37";
const ROTATION_MS = 5500;

export function NoveeLeaderboardTicker() {
  const [idx,      setIdx]      = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { tickerPaused } = useGoldenBoxStore();

  const effectivePaused = isPaused || tickerPaused;

  useEffect(() => {
    if (effectivePaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setIdx(i => (i + 1) % ENTRIES.length);
    }, ROTATION_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [effectivePaused]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={e => { e.preventDefault(); setIsPaused(p => !p); }}
      style={{
        width: "100%",
        background: "rgba(212,175,55,0.05)",
        border: `1px solid rgba(212,175,55,0.20)`,
        borderRadius: 12,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        overflow: "hidden",
        position: "relative",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span style={{
        fontSize: 11,
        letterSpacing: "0.36em",
        textTransform: "uppercase" as const,
        color: `${GOLD}77`,
        fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
      }}>
        LIVE LOUNGE
      </span>

      <div style={{ flex: 1, overflow: "hidden", position: "relative", height: 34 }}>
        {ENTRIES.map((e, i) => (
          <motion.div
            key={e.table}
            initial={false}
            animate={{
              y: i === idx ? 0 : i < idx ? -34 : 34,
              opacity: i === idx ? 1 : 0,
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ color: GOLD, fontSize: 20, fontWeight: 900 }}>
              TABLE {e.table}
            </span>
            <span style={{ color: "rgba(240,232,212,0.55)", fontSize: 17, fontWeight: 400 }}>
              is holding
            </span>
            <span style={{ color: "#F0E8D4", fontSize: 22, fontWeight: 800 }}>
              {e.pts} PTS
            </span>
            <span style={{ color: `${GOLD}44`, fontSize: 15 }}>
              · {e.name}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {effectivePaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 5, flexShrink: 0,
              background: "rgba(14,12,9,0.85)", border: `1px solid ${GOLD}44`,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.60rem", letterSpacing: "0.22em", color: GOLD, fontWeight: 700,
            }}>
              PAUSED
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        {ENTRIES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === idx ? GOLD : `${GOLD}25`,
              transition: "background 0.4s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
