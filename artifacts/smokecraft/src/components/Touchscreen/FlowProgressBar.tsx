interface FlowProgressBarProps {
  steps: { id: string; label: string }[];
  currentStep: number;
}

export function FlowProgressBar({ steps, currentStep }: FlowProgressBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "12px 0",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        const dotColor = isComplete
          ? "#D48B00"
          : isActive
            ? "#D48B00"
            : "rgba(26,26,27,0.17)";

        return (
          <div
            key={step.id}
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
              <div
                style={{
                  width: isActive ? 14 : 10,
                  height: isActive ? 14 : 10,
                  borderRadius: "50%",
                  background: dotColor,
                  border: isActive ? "2px solid rgba(212,139,0,0.6)" : "none",
                  boxShadow: isActive ? "0 0 12px rgba(212,139,0,0.4)" : "none",
                  transition: "all 200ms ease",
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: isActive ? "#D48B00" : isComplete ? "rgba(26,26,27,0.68)" : "rgba(26,26,27,0.35)",
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.03em",
                  transition: "color 200ms ease",
                }}
              >
                {step.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: isComplete
                    ? "rgba(212,139,0,0.4)"
                    : "rgba(26,26,27,0.10)",
                  margin: "0 8px",
                  marginBottom: 18,
                  transition: "background 200ms ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
