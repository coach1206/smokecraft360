import { type ReactNode } from "react";
import { FlowProgressBar } from "./FlowProgressBar";

interface TouchFlowShellProps {
  title: string;
  steps: { id: string; label: string }[];
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showNext?: boolean;
}

const BTN_BASE: React.CSSProperties = {
  minHeight: 72,
  padding: "0 32px",
  border: "none",
  borderRadius: 14,
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "0.04em",
  cursor: "pointer",
  transition: "transform 100ms ease, opacity 100ms ease",
  WebkitTapHighlightColor: "transparent",
  fontFamily: "'Inter', sans-serif",
};

export function TouchFlowShell({
  title,
  steps,
  currentStep,
  children,
  onBack,
  onNext,
  onCancel,
  nextLabel = "Next",
  nextDisabled = false,
  showNext = true,
}: TouchFlowShellProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg, #0c0a07 0%, #F5F2ED 100%)",
        color: "#e8e0c8",
        display: "flex",
        flexDirection: "column",
        padding: "24px 20px env(safe-area-inset-bottom, 20px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#D48B00",
            margin: 0,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h1>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid rgba(26,26,27,0.14)",
              borderRadius: 12,
              color: "rgba(232,224,200,0.6)",
              padding: "0 20px",
              fontSize: 14,
              cursor: "pointer",
              minHeight: 72,
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <FlowProgressBar steps={steps} currentStep={currentStep} />

      <div style={{ flex: 1, padding: "16px 0", overflow: "auto" }}>{children}</div>

      <div style={{ display: "flex", gap: 12, paddingTop: 16 }}>
        {!isFirst && onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              ...BTN_BASE,
              flex: 1,
              background: "rgba(26,26,27,0.08)",
              color: "rgba(232,224,200,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Back
          </button>
        )}
        {showNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            style={{
              ...BTN_BASE,
              flex: isFirst ? 1 : 2,
              background: nextDisabled
                ? "rgba(212,139,0,0.15)"
                : "linear-gradient(180deg, #D48B00 0%, #a98828 100%)",
              color: nextDisabled ? "rgba(232,224,200,0.4)" : "#F5F2ED",
              opacity: nextDisabled ? 0.6 : 1,
              cursor: nextDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isLast ? "Complete" : nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
