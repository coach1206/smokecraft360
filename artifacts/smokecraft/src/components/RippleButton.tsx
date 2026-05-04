import { useState, useCallback, useRef, type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RippleSpawn {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  rippleColor?: string;
  as?: "button" | "div";
}

let rippleId = 0;

export default function RippleButton({
  children,
  onClick,
  disabled = false,
  className = "",
  style,
  rippleColor = "rgba(212,175,55,0.25)",
  as = "button",
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<RippleSpawn[]>([]);
  const containerRef = useRef<HTMLElement>(null);

  const spawn = useCallback(
    (e: MouseEvent) => {
      if (disabled) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;
      const id = ++rippleId;
      setRipples((prev) => [...prev, { id, x, y, size }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 500);
    },
    [disabled],
  );

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      spawn(e);
      if (onClick && !disabled) onClick(e);
    },
    [onClick, disabled, spawn],
  );

  const Tag = as === "div" ? "div" : "button";
  const extraProps = as === "button" ? { disabled, type: "button" as const } : {};

  return (
    <Tag
      ref={containerRef as any}
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onClick={handleClick as any}
      {...extraProps}
    >
      {children}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.6, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: r.x - r.size / 2,
              top: r.y - r.size / 2,
              width: r.size,
              height: r.size,
              borderRadius: "50%",
              background: rippleColor,
              pointerEvents: "none",
            }}
          />
        ))}
      </AnimatePresence>
    </Tag>
  );
}
