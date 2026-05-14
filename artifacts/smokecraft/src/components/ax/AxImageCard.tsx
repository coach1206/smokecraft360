/**
 * AxImageCard — universal lazy-loading image card for NOVEE OS.
 * Supports all inventory/product/tile images with:
 *   - Lazy loading via IntersectionObserver
 *   - Skeleton loader while loading
 *   - Graceful fallback (craft initials + dark gradient)
 *   - Aspect ratio enforcement
 *   - Optional hover zoom
 *   - Optional overlay label
 *
 * Step 1 of 10 — Universal Image System
 */

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";

interface AxImageCardProps {
  src?: string | null;
  alt?: string;
  /** aspect-ratio CSS value (default: "4/3") */
  aspect?: string;
  /** Hover zoom effect (default: true) */
  zoom?: boolean;
  /** Fallback label when no image is available */
  fallbackLabel?: string;
  /** Fallback accent color */
  fallbackColor?: string;
  /** Overlay rendered on top of the image */
  overlay?: ReactNode;
  /** Border radius override (default: 10) */
  radius?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function AxImageCard({
  src, alt, aspect = "4/3", zoom = true, fallbackLabel,
  fallbackColor = "#D48B00", overlay, radius = 10, style, onClick,
}: AxImageCardProps) {
  const [loaded, setLoaded]   = useState(false);
  const [error,  setError]    = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "120px" },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [src]);

  const showFallback = !src || error;
  const showSkeleton = src && !error && !loaded;

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: "relative",
        aspectRatio: aspect,
        borderRadius: radius,
        overflow: "hidden",
        background: "rgba(26,26,27,0.06)",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Skeleton shimmer */}
      {showSkeleton && (
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ position: "absolute", inset: 0, background: "rgba(26,26,27,0.08)" }}
        />
      )}

      {/* Actual image (lazy) */}
      {src && visible && !error && (
        <motion.img
          src={src}
          alt={alt ?? ""}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          whileHover={zoom ? { scale: 1.04 } : undefined}
        />
      )}

      {/* Fallback */}
      {showFallback && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 6,
          background: `radial-gradient(ellipse at 50% 30%, ${fallbackColor}18 0%, rgba(245,242,237,0.60) 100%)`,
        }}>
          {fallbackLabel ? (
            <div style={{
              fontSize: 22, fontWeight: 700,
              fontFamily: "'Cormorant Garamond', serif",
              color: fallbackColor, opacity: 0.55,
              letterSpacing: "0.06em",
            }}>
              {fallbackLabel.slice(0, 2).toUpperCase()}
            </div>
          ) : (
            <ImageIcon size={20} color={`${fallbackColor}55`} strokeWidth={1.2} />
          )}
        </div>
      )}

      {/* Overlay */}
      {overlay && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {overlay}
        </div>
      )}
    </div>
  );
}
