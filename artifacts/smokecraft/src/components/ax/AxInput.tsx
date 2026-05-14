/**
 * AxInput — universal form input for NOVEE OS.
 * Validation states, error handling, accessibility support.
 * Step 1 of 10 — Universal Component Library (AppInput)
 */

import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface AxInputBaseProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Left-side icon */
  leftIcon?: LucideIcon;
  /** Right-side content (e.g. clear button or unit label) */
  rightSlot?: ReactNode;
}

type AxInputProps = AxInputBaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;
type AxTextareaProps = AxInputBaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { multiline: true };

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(26,26,27,0.52)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: 6,
};

const HINT_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(26,26,27,0.35)",
  marginTop: 5,
  lineHeight: 1.5,
};

const ERROR_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "#ef4444",
  marginTop: 5,
  lineHeight: 1.5,
};

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  background: "rgba(26,26,27,0.07)",
  border: "1px solid rgba(212,139,0,0.18)",
  borderRadius: 8,
  color: "rgba(26,26,27,0.88)",
  fontSize: 13,
  padding: "10px 12px",
  outline: "none",
  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box",
  appearance: "none",
};

const INPUT_FOCUSED: React.CSSProperties = {
  borderColor: "rgba(212,139,0,0.55)",
  boxShadow: "0 0 0 2px rgba(212,139,0,0.12)",
};

const INPUT_ERROR: React.CSSProperties = {
  borderColor: "rgba(239,68,68,0.5)",
  boxShadow: "0 0 0 2px rgba(239,68,68,0.1)",
};

export const AxInput = forwardRef<HTMLInputElement, AxInputProps>(function AxInput(
  { label, error, hint, leftIcon: LeftIcon, rightSlot, style, onFocus, onBlur, ...rest },
  ref,
) {
  return (
    <div style={{ position: "relative" }}>
      {label && <label style={LABEL_STYLE}>{label}</label>}
      <div style={{ position: "relative" }}>
        {LeftIcon && (
          <div style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: "rgba(26,26,27,0.35)", pointerEvents: "none",
          }}>
            <LeftIcon size={13} />
          </div>
        )}
        <input
          ref={ref}
          {...rest}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? INPUT_ERROR.borderColor as string : INPUT_FOCUSED.borderColor as string;
            e.currentTarget.style.boxShadow   = error ? INPUT_ERROR.boxShadow  as string : INPUT_FOCUSED.boxShadow  as string;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.5)" : "rgba(212,139,0,0.18)";
            e.currentTarget.style.boxShadow   = "none";
            onBlur?.(e);
          }}
          style={{
            ...INPUT_BASE,
            ...(error ? INPUT_ERROR : {}),
            paddingLeft: LeftIcon ? 32 : 12,
            paddingRight: rightSlot ? 36 : 12,
            ...style,
          }}
        />
        {rightSlot && (
          <div style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            color: "rgba(26,26,27,0.35)",
          }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && <p style={ERROR_STYLE}>{error}</p>}
      {hint && !error && <p style={HINT_STYLE}>{hint}</p>}
    </div>
  );
});

/** Multi-line textarea variant */
export const AxTextarea = forwardRef<HTMLTextAreaElement, Omit<AxTextareaProps, "multiline">>(
  function AxTextarea({ label, error, hint, style, onFocus, onBlur, ...rest }, ref) {
    return (
      <div>
        {label && <label style={LABEL_STYLE}>{label}</label>}
        <textarea
          ref={ref}
          {...rest}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.5)" : "rgba(212,139,0,0.55)";
            e.currentTarget.style.boxShadow   = error ? "0 0 0 2px rgba(239,68,68,0.1)" : "0 0 0 2px rgba(212,139,0,0.12)";
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.5)" : "rgba(212,139,0,0.18)";
            e.currentTarget.style.boxShadow   = "none";
            onBlur?.(e);
          }}
          style={{
            ...INPUT_BASE,
            ...(error ? INPUT_ERROR : {}),
            resize: "vertical",
            minHeight: 80,
            ...style,
          }}
        />
        {error && <p style={ERROR_STYLE}>{error}</p>}
        {hint && !error && <p style={HINT_STYLE}>{hint}</p>}
      </div>
    );
  },
);
