import { type CSSProperties } from "react";

interface BackgroundLayerProps {
  image?: string;
  overlay?: string;
  blur?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}

export default function BackgroundLayer({
  image,
  blur = 0,
  children,
  style,
}: BackgroundLayerProps) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflow: "hidden",
        background: "#F5F2ED",
        ...style,
      }}
    >
      {image && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.05,
            filter: blur > 0 ? `blur(${blur}px)` : "blur(4px)",
            transform: "scale(1.05)",
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1, display: "contents" }}>
        {children}
      </div>
    </div>
  );
}
