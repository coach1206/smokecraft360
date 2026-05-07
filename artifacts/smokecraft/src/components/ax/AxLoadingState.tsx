/**
 * AxLoadingState — cinematic skeleton loader for dashboard data.
 * Replaces "Loading…" text strings with a premium animated shimmer.
 */

import { motion } from "framer-motion";

interface AxLoadingStateProps {
  rows?: number;
  columns?: number;
  /** Height of each skeleton row (default 72px) */
  rowHeight?: number;
  message?: string;
}

function Shimmer({ w = "100%", h = 72 }: { w?: string | number; h?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: w, height: h,
        background: "linear-gradient(90deg, rgba(26,26,27,0.06) 0%, rgba(26,26,27,0.10) 50%, rgba(26,26,27,0.06) 100%)",
        borderRadius: 10,
        border: "1px solid rgba(212,139,0,0.1)",
      }}
    />
  );
}

export function AxLoadingState({ rows = 3, columns = 4, rowHeight = 72, message }: AxLoadingStateProps) {
  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        marginBottom: 16,
      }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} h={rowHeight} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} h={48} />
      ))}
      {message && (
        <div style={{
          fontSize: 11, color: "rgba(240,232,212,0.3)",
          textAlign: "center", marginTop: 20,
          letterSpacing: "0.06em",
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
