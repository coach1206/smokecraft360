/**
 * LoungeEnvironment — global cinematic atmosphere wrapper.
 *
 * Applied once above the Router. Provides:
 *   1. Animated cinematic grain (via .lounge-grain ::after pseudo, position:fixed)
 *   2. Breathing ambient haze (walnut floor depth + whiskey amber whisper)
 *
 * Intentionally minimal — each page controls its own scene depth and focal
 * atmosphere. This layer is the "air in the room": always present, never
 * noticed, never dominant.
 */

import { memo } from "react";

interface Props {
  children: React.ReactNode;
}

export const LoungeEnvironment = memo(function LoungeEnvironment({ children }: Props) {
  return (
    <div
      className="lounge-grain"
      style={{ position: "relative", minHeight: "100vh" }}
    >
      {/* Breathing ambient haze — walnut floor depth + amber top whisper */}
      <div className="lounge-haze" aria-hidden />

      {children}
    </div>
  );
});
