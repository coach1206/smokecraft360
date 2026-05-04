import { type ReactNode } from "react";

interface TouchStepProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function TouchStep({ title, description, children }: TouchStepProps) {
  return (
    <div style={{ animation: "touchStepIn 250ms ease-out" }}>
      <style>{`
        @keyframes touchStepIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#e8e0c8",
          margin: "0 0 4px",
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            fontSize: 14,
            color: "rgba(232,224,200,0.55)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      <div>{children}</div>
    </div>
  );
}
