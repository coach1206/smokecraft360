/**
 * DynamicCard — rotating lifestyle imagery card for the Craft Hub.
 *
 * Cycles through a curated scene array every ROTATION_MS milliseconds using
 * a smooth cross-fade (opacity-based CSS transition so it works with
 * html2canvas and avoids Framer Motion AnimatePresence teardown flicker).
 *
 * Props
 * ─────
 * module   — CraftModule definition (scenes, title, color, route, badge)
 * onClick  — called when the card is tapped / clicked
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { CraftModule, CraftScene } from "@/data/craftScenes";

const ROTATION_MS = 3_500;
const FADE_MS     = 700;

interface Props {
  module:  CraftModule;
  onClick: () => void;
}

export default function DynamicCard({ module: mod, onClick }: Props) {
  const [current, setCurrent]   = useState(0);
  const [next,    setNext   ]   = useState<number | null>(null);
  const [visible, setVisible]   = useState(true); // true = current showing
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const advance = useCallback(() => {
    const nextIdx = (current + 1) % mod.scenes.length;
    // Start fade-out
    setVisible(false);
    setNext(nextIdx);

    // After fade completes, swap & fade back in
    fadeRef.current = setTimeout(() => {
      setCurrent(nextIdx);
      setNext(null);
      setVisible(true);
    }, FADE_MS);
  }, [current, mod.scenes.length]);

  // Reset cycle when module changes
  useEffect(() => {
    setCurrent(0);
    setNext(null);
    setVisible(true);
  }, [mod.id]);

  // Rotation interval
  useEffect(() => {
    timerRef.current = setInterval(advance, ROTATION_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeRef.current)  clearTimeout(fadeRef.current);
    };
  }, [advance]);

  const scene: CraftScene     = mod.scenes[current];
  const nextScene: CraftScene | null = next !== null ? mod.scenes[next] : null;

  return (
    <motion.div
      whileHover={{ scale: 1.018 }}
      whileTap={{ scale: 0.982 }}
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "16 / 10",
        background: "#0a0806",
        border: `1px solid ${mod.color}30`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px ${mod.color}15`,
        userSelect: "none",
      }}
    >
      {/* ── Current scene image ── */}
      <img
        key={scene.id}
        src={scene.image}
        alt={scene.label}
        style={{
          position:   "absolute",
          inset:      0,
          width:      "100%",
          height:     "100%",
          objectFit:  "cover",
          objectPosition: "center",
          opacity:    visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          willChange: "opacity",
        }}
      />

      {/* ── Pre-load next image (hidden, already in cache when swapped in) ── */}
      {nextScene && (
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
      )}

      {/* ── Cinematic gradient overlay ── */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: `
          linear-gradient(
            180deg,
            rgba(0,0,0,0.08) 0%,
            rgba(0,0,0,0.12) 40%,
            rgba(0,0,0,0.55) 72%,
            rgba(0,0,0,0.82) 100%
          ),
          linear-gradient(
            90deg,
            ${mod.color}18 0%,
            transparent 60%
          )
        `,
        pointerEvents: "none",
      }} />

      {/* ── Accent color strip (left edge) ── */}
      <div style={{
        position:  "absolute",
        left:      0, top: "20%", bottom: "20%",
        width:     3,
        background: mod.color,
        borderRadius: "0 2px 2px 0",
        opacity:   0.9,
      }} />

      {/* ── Top-left badge ── */}
      <div style={{
        position:   "absolute",
        top:        16, left: 18,
        fontSize:   10,
        fontWeight: 800,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color:      mod.color,
        background: `rgba(0,0,0,0.55)`,
        backdropFilter: "blur(6px)",
        border:     `1px solid ${mod.color}40`,
        borderRadius: 999,
        padding:    "5px 10px",
      }}>
        {mod.badge}
      </div>

      {/* ── Scene dots (bottom-right) ── */}
      <div style={{
        position:   "absolute",
        top:        16, right: 18,
        display:    "flex", gap: 5,
      }}>
        {mod.scenes.map((_, i) => (
          <div key={i} style={{
            width:        i === current ? 16 : 6,
            height:       6,
            borderRadius: 3,
            background:   i === current ? mod.color : "rgba(255,255,255,0.3)",
            transition:   "width 0.35s ease, background 0.35s ease",
          }} />
        ))}
      </div>

      {/* ── Bottom content ── */}
      <div style={{
        position: "absolute",
        bottom:   0, left: 0, right: 0,
        padding:  "24px 22px 20px",
        display:  "flex",
        flexDirection: "column",
        gap:      6,
      }}>
        {/* Module title */}
        <div style={{
          fontFamily:    "var(--app-font-serif, Georgia, serif)",
          fontSize:      22,
          fontWeight:    800,
          color:         "#fff",
          letterSpacing: "0.02em",
          lineHeight:    1.1,
          textShadow:    "0 2px 12px rgba(0,0,0,0.7)",
        }}>
          {mod.title}
        </div>

        {/* Scene label + sub-label */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        8,
        }}>
          <div style={{
            width:  6, height: 6, borderRadius: "50%",
            background: mod.color, flexShrink: 0,
          }} />
          <span style={{
            fontSize:      12,
            fontWeight:    600,
            color:         "rgba(255,255,255,0.85)",
            letterSpacing: "0.08em",
            opacity:       visible ? 1 : 0,
            transition:    `opacity ${FADE_MS}ms ease`,
          }}>
            {scene.label}
          </span>
          {scene.sub && (
            <span style={{
              fontSize:  11,
              color:     "rgba(255,255,255,0.45)",
              fontStyle: "italic",
            }}>
              — {scene.sub}
            </span>
          )}
        </div>

        {/* CTA strip */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        8,
          marginTop:  4,
        }}>
          <div style={{
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         mod.color,
          }}>
            Enter Experience
          </div>
          <div style={{
            flex:        1,
            height:      1,
            background:  `linear-gradient(90deg, ${mod.color}60, transparent)`,
          }} />
          <div style={{
            width:        28, height: 28,
            borderRadius: "50%",
            background:   `${mod.color}20`,
            border:       `1px solid ${mod.color}50`,
            display:      "flex", alignItems: "center", justifyContent: "center",
            fontSize:     13, color: mod.color,
          }}>
            →
          </div>
        </div>
      </div>
    </motion.div>
  );
}
