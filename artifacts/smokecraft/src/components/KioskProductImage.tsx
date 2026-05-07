import { useState } from "react";
import type { Product } from "@/contexts/PosContext";

const CATEGORY_ICONS: Record<Product["category"], { path: string; color: string }> = {
  cigar: {
    path: "M6 12h12M8 8l8 8M16 8l-8 8",
    color: "#D48B00",
  },
  spirit: {
    path: "M9 3h6l1 7H8L9 3zM7 10v8a2 2 0 002 2h6a2 2 0 002-2v-8",
    color: "#5b8def",
  },
  beer: {
    path: "M17 8h1a4 4 0 010 8h-1M3 8h14v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8z",
    color: "#f59e0b",
  },
  food: {
    path: "M12 2a7 7 0 017 7c0 4-7 13-7 13S5 13 5 9a7 7 0 017-7z",
    color: "#34d399",
  },
};

interface KioskProductImageProps {
  src: string;
  alt: string;
  category: Product["category"];
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export default function KioskProductImage({
  src,
  alt,
  category,
  width = "100%",
  height = "100%",
  borderRadius = 0,
  style,
}: KioskProductImageProps) {
  const [error, setError] = useState(false);
  const icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.cigar;

  if (error || !src) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius,
          overflow: "hidden",
          background: `linear-gradient(135deg, ${icon.color}15, ${icon.color}08)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          ...style,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={icon.color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "40%", height: "40%", opacity: 0.35 }}
        >
          <path d={icon.path} />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        overflow: "hidden",
        background: "#F5F2ED",
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}
