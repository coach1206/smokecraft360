import { type CSSProperties } from "react";

interface BackgroundLayerProps {
  image: string;
  overlay?: string;
  blur?: number;
  children: React.ReactNode;
  style?: CSSProperties;
}

export default function BackgroundLayer({
  image,
  overlay = "linear-gradient(180deg, rgba(15,13,10,0.82) 0%, rgba(10,8,6,0.92) 60%, rgba(5,4,3,0.97) 100%)",
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
        ...style,
      }}
    >
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
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          transform: blur > 0 ? "scale(1.05)" : undefined,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: overlay,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(212,175,55,0.04), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 3 }}>{children}</div>
    </div>
  );
}
