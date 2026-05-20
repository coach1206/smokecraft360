import { useState, useEffect, useRef } from "react";
import { CRAFT_SCENES, CRAFT_CYCLE_MS } from "@/lib/craftAssets";
import type { CraftType } from "@/lib/craftAssets";

function timeOfDayOffset(): number {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 0;
  if (h >= 12 && h < 17) return 3;
  if (h >= 17 && h < 21) return 6;
  return 9;
}

interface Props {
  craft: CraftType;
  staggerOffset?: number;
  showLabel?: boolean;
  style?: React.CSSProperties;
}

export function NoveeRotatingCraftVisual({
  craft,
  staggerOffset = 0,
  showLabel = true,
  style,
}: Props) {
  const scenes       = CRAFT_SCENES[craft];
  const cycleDuration = CRAFT_CYCLE_MS[craft];
  const startIdx     = (timeOfDayOffset() + staggerOffset * 3) % 12;

  const [sceneIdx, setSceneIdx] = useState(startIdx);
  const [opacity,  setOpacity]  = useState(0);
  const swapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initT = setTimeout(() => setOpacity(1), 120);

    const interval = setInterval(() => {
      setOpacity(0);
      swapRef.current = setTimeout(() => {
        setSceneIdx(prev => (prev + 1) % 12);
        setOpacity(1);
      }, 1800);
    }, cycleDuration);

    return () => {
      clearTimeout(initT);
      clearInterval(interval);
      if (swapRef.current) clearTimeout(swapRef.current);
    };
  }, [cycleDuration]);

  const scene = scenes[sceneIdx];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: scene.bg,
        opacity,
        transition: "opacity 1.6s ease",
        ...style,
      }}
    >
      {/* Per-scene ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at ${scene.glowPos}, ${scene.glowColor} 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Scene label — bottom-left watermark */}
      {showLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 18,
            fontSize: 6,
            letterSpacing: "0.44em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.20)",
            fontFamily: "'Inter', sans-serif",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {scene.label}
        </div>
      )}
    </div>
  );
}
