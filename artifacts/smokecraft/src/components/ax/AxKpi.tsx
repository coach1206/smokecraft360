/**
 * AxKpi — animated KPI counter tile used across all NOVEE OS dashboards.
 * Animates numeric values from 0 → target over 900ms on mount/update.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AxCard } from "./AxCard";

interface AxKpiProps {
  label: string;
  value: string | number;
  /** Prefix unit rendered before value (e.g. "$") */
  prefix?: string;
  /** Suffix unit rendered after value (e.g. "%") */
  suffix?: string;
  /** Accent / glow colour hex */
  color?: string;
  /** Small sub-line below value (e.g. "+live") */
  sub?: string;
  /** Optional Lucide icon element */
  icon?: React.ElementType;
}

const GOLD = "#D48B00";

export function AxKpi({ label, value, prefix, suffix, color, sub, icon: Icon }: AxKpiProps) {
  const c = color ?? GOLD;
  const numVal = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const isNum = !isNaN(numVal) && typeof value === "number";

  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!isNum) return;
    const start = Date.now();
    const dur = 900;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * numVal));
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [numVal, isNum]);

  return (
    <AxCard glow={c} style={{ padding: "18px 20px" }}>
      {Icon && <Icon size={13} color={c} style={{ marginBottom: 8 }} />}
      <div style={{
        fontSize: 10, color: "rgba(26,26,27,0.50)",
        textTransform: "uppercase", letterSpacing: "0.11em", marginBottom: 6,
      }}>
        {label}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          fontSize: 28, fontWeight: 700, color: c,
          fontFamily: "'Cormorant Garamond', serif", lineHeight: 1,
        }}
      >
        {prefix}{isNum ? display.toLocaleString() : value}{suffix}
      </motion.div>
      {sub && (
        <div style={{
          fontSize: 11, color: "rgba(26,26,27,0.44)",
          marginTop: 5, letterSpacing: "0.04em",
        }}>
          {sub}
        </div>
      )}
    </AxCard>
  );
}
