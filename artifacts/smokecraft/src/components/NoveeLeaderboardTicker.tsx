import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

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

export function NoveeLeaderboardTicker() {
  const [idx, setIdx] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setIdx(i => (i + 1) % ENTRIES.length);
    }, 2800);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const entry = ENTRIES[idx];

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(212,175,55,0.06)",
        border: `1px solid rgba(212,175,55,0.22)`,
        borderRadius: 12,
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <span style={{
        fontSize: 11,
        letterSpacing: "0.36em",
        textTransform: "uppercase",
        color: `${GOLD}88`,
        fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
        whiteSpace: "nowrap",
      }}>
        LIVE LOUNGE BOARD
      </span>

      <div style={{ flex: 1, overflow: "hidden", position: "relative", height: 32 }}>
        {ENTRIES.map((e, i) => (
          <motion.div
            key={e.table}
            initial={false}
            animate={{
              y: i === idx ? 0 : i < idx ? -32 : 32,
              opacity: i === idx ? 1 : 0,
            }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ color: GOLD, fontSize: 22, fontWeight: 900 }}>
              TABLE {e.table}
            </span>
            <span style={{ color: "rgba(240,232,212,0.60)", fontSize: 18, fontWeight: 400 }}>
              is holding
            </span>
            <span style={{ color: "#F0E8D4", fontSize: 24, fontWeight: 800 }}>
              {e.pts} PTS
            </span>
            <span style={{ color: `${GOLD}55`, fontSize: 16 }}>· {e.name}</span>
          </motion.div>
        ))}
      </div>

      <div style={{
        display: "flex",
        gap: 5,
        flexShrink: 0,
      }}>
        {ENTRIES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === idx ? GOLD : `${GOLD}30`,
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
