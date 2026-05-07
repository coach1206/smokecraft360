/**
 * AxStatusDot — animated pulsing dot for device/connection status indicators.
 */

import { motion } from "framer-motion";

type DotStatus = "online" | "offline" | "warning" | "idle" | "unknown";

const COLOR: Record<DotStatus, string> = {
  online:  "#34d399",
  offline: "#ef4444",
  warning: "#f59e0b",
  idle:    "#60a5fa",
  unknown: "rgba(26,26,27,0.25)",
};

interface AxStatusDotProps {
  status: DotStatus | string;
  size?: number;
  pulse?: boolean;
}

export function AxStatusDot({ status, size = 7, pulse = true }: AxStatusDotProps) {
  const color = COLOR[status as DotStatus] ?? COLOR.unknown;
  const shouldPulse = pulse && status === "online";

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {shouldPulse && (
        <motion.span
          animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: size, height: size,
            borderRadius: "50%",
            background: color,
          }}
        />
      )}
      <span style={{
        width: size, height: size,
        borderRadius: "50%",
        background: color,
        display: "block",
        flexShrink: 0,
      }} />
    </span>
  );
}
