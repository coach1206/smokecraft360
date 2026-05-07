/**
 * ProductImage — displays a product photo with:
 *   • Cloudinary URL transformation for optimal size/format
 *   • Real fallback images from /public/images/ (cigar.png, whiskey.png)
 *   • Branded placeholder when no image is available at all
 *   • Gradient overlay at the bottom for text legibility on dark cards
 */

import { useState } from "react";
import { cloudinaryOptimize } from "@/lib/cloudinary";

interface ProductImageProps {
  url?:       string | null;
  alt:        string;
  category:   string;
  height?:    number;
  className?: string;
  /** When true, uses a light-compatible (transparent) bottom gradient */
  lightCard?: boolean;
}

/** Map product categories to bundled fallback images */
const FALLBACK_IMAGES: Record<string, string> = {
  cigar:   "/images/cigar.png",
  alcohol: "/images/whiskey.png",
};

/** Per-category placeholder gradients — shown only when no fallback image exists */
const GRADIENTS: Record<string, string> = {
  cigar:   "linear-gradient(160deg, #2a1506 0%, #140a03 60%, #0d0603 100%)",
  alcohol: "linear-gradient(160deg, #0d1828 0%, #080f1a 60%, #050b14 100%)",
  food:    "linear-gradient(160deg, #1f1005 0%, #100803 60%, #0a0502 100%)",
  coffee:  "linear-gradient(160deg, #1a0f04 0%, #0e0903 60%, #090602 100%)",
  tea:     "linear-gradient(160deg, #081a09 0%, #041009 60%, #020b04 100%)",
  scent:   "linear-gradient(160deg, #1a0818 0%, #0f0510 60%, #09030a 100%)",
  candle:  "linear-gradient(160deg, #1f1802 0%, #100d01 60%, #0a0900 100%)",
};

/** Per-category decorative SVG marks for deepest fallback */
const MARKS: Record<string, string> = {
  cigar:   "M6 12h12M8 8l8 8M16 8l-8 8",
  alcohol: "M9 3h6l1 7H8L9 3zM7 10v8a2 2 0 002 2h6a2 2 0 002-2v-8",
  food:    "M12 2a7 7 0 017 7c0 4-7 13-7 13S5 13 5 9a7 7 0 017-7z",
  coffee:  "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3",
  tea:     "M17 8h1a4 4 0 010 8h-1M3 8h14v8a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM9 3c0-2 2-2 2-4",
  scent:   "M12 22V8M8 12l4-4 4 4M6 18l6-4 6 4",
  candle:  "M12 2v4M8 6c0-2 8-2 8 0v14H8V6z",
};


export function ProductImage({ url, alt, category, height = 220, className = "", lightCard = false }: ProductImageProps) {
  const cat        = category?.toLowerCase() ?? "cigar";
  const optimized  = url ? cloudinaryOptimize(url, 800, height * 2) : null;

  const [primaryError,  setPrimaryError]  = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const fallbackSrc = FALLBACK_IMAGES[cat] ?? null;

  const showPrimary  = !!optimized && !primaryError;
  const showFallback = !showPrimary && !!fallbackSrc && !fallbackError;

  return (
    <div
      className={`relative w-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ height }}
    >
      {showPrimary ? (
        <img
          src={optimized!}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setPrimaryError(true)}
          loading="lazy"
          decoding="async"
        />
      ) : showFallback ? (
        /* Real product photo fallback — object-contain so the transparent PNG stays clean */
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(160deg, rgba(20,12,4,0.6) 0%, rgba(245,242,237,0.8) 100%)" }}>
          <img
            src={fallbackSrc!}
            alt={alt}
            className="h-full w-auto max-w-full object-contain drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 8px 24px rgba(26,26,27,0.32))" }}
            onError={() => setFallbackError(true)}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <Placeholder category={cat} />
      )}

      {/* Bottom gradient — ensures text on the card below image reads clearly */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: "55%",
          background: lightCard
            ? "linear-gradient(to bottom, transparent 0%, rgba(240,228,210,0.9) 100%)"
            : "linear-gradient(to bottom, transparent 0%, rgba(245,242,237,0.92) 100%)",
        }}
      />
    </div>
  );
}

function Placeholder({ category }: { category: string }) {
  const gradient = GRADIENTS[category] ?? GRADIENTS.cigar;
  const path     = MARKS[category]    ?? MARKS.cigar;

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: gradient }}>
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,  rgba(212,139,0,0.8) 0px, transparent 1px, transparent 18px)," +
            "repeating-linear-gradient(-45deg, rgba(212,139,0,0.8) 0px, transparent 1px, transparent 18px)",
        }}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(212,139,0,0.18)"
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-14 h-14"
      >
        <path d={path} />
      </svg>
    </div>
  );
}
