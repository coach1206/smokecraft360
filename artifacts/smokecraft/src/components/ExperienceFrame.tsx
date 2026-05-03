import type { ReactNode, CSSProperties } from "react";

/**
 * ExperienceFrame — shared kiosk card wrapper used to keep
 * SmokeCraft / BrewCraft / PourCraft visually consistent.
 *
 * Single source of truth for: rounded corners, dark glass tint,
 * gold-tinted hairline border, and shadow depth. Pages that need a
 * brighter / accent-tinted variant pass `accent` to colorize the border.
 *
 * (Distinct name from VaultModal's internal `ExperienceCard` to avoid
 *  collision; this one is a layout primitive, that one is a list item.)
 */
export interface ExperienceFrameProps {
  children:    ReactNode;
  accent?:     string;
  padding?:    string | number;
  className?:  string;
  style?:      CSSProperties;
  testId?:     string;
}

export default function ExperienceFrame({
  children,
  accent  = "rgba(212,175,55,0.22)",
  padding = "24px 26px",
  className,
  style,
  testId,
}: ExperienceFrameProps) {
  return (
    <div
      data-testid={testId}
      className={className}
      style={{
        position:        "relative",
        background:      "rgba(14,9,4,0.78)",
        border:          `1px solid ${accent}`,
        borderRadius:    20,
        padding,
        backdropFilter:  "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
        color: "#F5EBDD",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
