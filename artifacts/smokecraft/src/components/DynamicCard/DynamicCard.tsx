/**
 * DynamicCard — intelligent rotating lifestyle imagery card.
 *
 * Scene ordering pipeline
 * ───────────────────────
 * 1. Read UserProfile from UserProfileContext (persisted, reactive).
 * 2. Run getWeightedScenes() — scores every scene across 4 signals
 *    (preference, POS pairing, venue type, time-of-day), sorts descending.
 * 3. The highest-ranked scene starts the rotation; all scenes are available
 *    in weighted order so the most relevant imagery appears first.
 * 4. Re-ranking fires automatically whenever UserProfile changes
 *    (e.g. LiveEngineController delivers a new POS order every 5 s).
 * 5. Image shows a slow Ken Burns zoom (6 s) with a 700 ms cross-fade between scenes.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useUserProfile }      from "@/contexts/UserProfileContext";
import { getWeightedScenes }   from "@/lib/weightedEngine";
import type { CraftModule, CraftScene } from "@/data/craftScenes";

const ROTATION_MS = 3_500;
const FADE_MS     = 700;

interface Props {
  module:  CraftModule;
  onClick: () => void;
}

export default function DynamicCard({ module: mod, onClick }: Props) {
  const { profile } = useUserProfile();

  // Re-rank whenever profile changes
  const rankedScenes = useMemo(
    () => getWeightedScenes(mod.scenes, profile),
    [mod.scenes, profile],
  );

  const [current, setCurrent] = useState(0);
  const [fading,  setFading ] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>  | null>(null);
  const fadeRef  = useRef<ReturnType<typeof setTimeout>   | null>(null);

  // Reset to best-ranked scene when ranked order changes
  useEffect(() => {
    setCurrent(0);
    setFading(false);
  }, [rankedScenes]);

  const advance = useCallback(() => {
    setFading(true);
    fadeRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % rankedScenes.length);
      setFading(false);
    }, FADE_MS);
  }, [rankedScenes.length]);

  useEffect(() => {
    timerRef.current = setInterval(advance, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeRef.current)  clearTimeout(fadeRef.current);
    };
  }, [advance]);

  if (!rankedScenes.length) return null;

  const scene: CraftScene     = rankedScenes[current];
  const nextScene: CraftScene = rankedScenes[(current + 1) % rankedScenes.length];
  const topScore              = rankedScenes[0]?.score ?? 0;

  return (
    <motion.div
      whileHover={{ scale: 1.018 }}
      whileTap={{ scale: 0.982 }}
      onClick={onClick}
      style={{
        position:     "relative",
        borderRadius: 20,
        overflow:     "hidden",
        cursor:       "pointer",
        aspectRatio:  "16 / 10",
        background:   "#F5F2ED",
        border:       `1px solid ${mod.color}30`,
        boxShadow:    `0 8px 40px rgba(26,26,27,0.22), 0 0 0 1px ${mod.color}15`,
        userSelect:   "none",
      }}
    >
      {/* ── Current scene — Ken Burns zoom ── */}
      <motion.img
        key={scene.id}
        src={scene.image}
        alt={scene.label}
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
        style={{
          position:       "absolute",
          inset:          0,
          width:          "100%",
          height:         "100%",
          objectFit:      "cover",
          objectPosition: "center",
          opacity:        fading ? 0 : 1,
          transition:     `opacity ${FADE_MS}ms ease`,
          willChange:     "opacity, transform",
        }}
      />

      {/* ── Pre-load next image silently ── */}
      <img
        key={`pre-${nextScene.id}`}
        src={nextScene.image}
        alt=""
        aria-hidden
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", opacity: 0, pointerEvents: "none",
        }}
      />

      {/* ── Cinematic gradient overlay ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          linear-gradient(
            180deg,
            rgba(0,0,0,0.06) 0%,
            rgba(26,26,27,0.03) 38%,
            rgba(26,26,27,0.20) 70%,
            rgba(26,26,27,0.42) 100%
          ),
          linear-gradient(90deg, ${mod.color}18 0%, transparent 55%)
        `,
        pointerEvents: "none",
      }} />

      {/* ── Left accent strip ── */}
      <div style={{
        position: "absolute", left: 0, top: "18%", bottom: "18%",
        width: 3, background: mod.color, borderRadius: "0 2px 2px 0", opacity: 0.9,
      }} />

      {/* ── Craft badge (top-left) ── */}
      <div style={{
        position: "absolute", top: 14, left: 16,
        fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase",
        color: mod.color,
        background: "rgba(26,26,27,0.22)",
        backdropFilter: "blur(6px)",
        border: `1px solid ${mod.color}40`,
        borderRadius: 999,
        padding: "5px 10px",
      }}>
        {mod.badge}
      </div>

      {/* ── Scene dots + score indicator (top-right) ── */}
      <div style={{
        position: "absolute", top: 14, right: 16,
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {rankedScenes.map((s, i) => (
          <div key={s.id} style={{
            width:        i === current ? 16 : 6,
            height:       6,
            borderRadius: 3,
            background:   i === current ? mod.color : "rgba(255,255,255,0.28)",
            transition:   "width 0.35s ease, background 0.35s ease",
          }} />
        ))}
      </div>

      {/* ── Score pip — top-right corner, shows relevance signal ── */}
      {topScore > 5 && (
        <div style={{
          position: "absolute", top: 38, right: 16,
          fontSize: 9, color: `${mod.color}90`,
          letterSpacing: "0.1em",
        }}>
          ▲{topScore}
        </div>
      )}

      {/* ── Bottom content ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "24px 20px 18px",
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        {/* Module title */}
        <div style={{
          fontFamily: "var(--app-font-serif, Georgia, serif)",
          fontSize: 21, fontWeight: 800, color: "#1A1A1B",
          letterSpacing: "0.02em", lineHeight: 1.1,
          textShadow: "0 2px 12px rgba(26,26,27,0.32)",
        }}>
          {mod.title}
        </div>

        {/* Scene label + sub-label */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: mod.color, flexShrink: 0,
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.08em",
            opacity: fading ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}>
            {scene.label}
          </span>
          {scene.sub && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", fontStyle: "italic" }}>
              — {scene.sub}
            </span>
          )}
        </div>

        {/* CTA strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: mod.color,
          }}>
            Enter Experience
          </div>
          <div style={{
            flex: 1, height: 1,
            background: `linear-gradient(90deg, ${mod.color}60, transparent)`,
          }} />
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: `${mod.color}20`, border: `1px solid ${mod.color}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: mod.color,
          }}>→</div>
        </div>
      </div>
    </motion.div>
  );
}
