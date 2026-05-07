import { type ReactNode } from "react";

interface TouchCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  imageUrl?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: "default" | "large";
  variant?: "default" | "gold" | "glass";
}

export function TouchCard({
  label,
  description,
  icon,
  imageUrl,
  onClick,
  disabled = false,
  size = "default",
  variant = "default",
}: TouchCardProps) {
  const isLarge = size === "large";

  const bg =
    variant === "gold"
      ? "linear-gradient(160deg, rgba(212,139,0,0.18) 0%, rgba(212,139,0,0.06) 100%)"
      : variant === "glass"
        ? "rgba(26,26,27,0.06)"
        : "linear-gradient(160deg, rgba(26,26,27,0.08) 0%, rgba(26,26,27,0.04) 100%)";

  const borderColor =
    variant === "gold"
      ? "rgba(212,139,0,0.4)"
      : "rgba(26,26,27,0.10)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isLarge ? 16 : 10,
        minHeight: isLarge ? 200 : 120,
        padding: isLarge ? "28px 20px" : "20px 16px",
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "transform 150ms ease, box-shadow 150ms ease",
        width: "100%",
        textAlign: "center",
        WebkitTapHighlightColor: "transparent",
        position: "relative",
        overflow: "hidden",
      }}
      onPointerDown={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.transform = "scale(0.97)";
        }
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
      onPointerLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      {imageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.15,
          }}
        />
      )}
      {icon && (
        <div style={{ fontSize: isLarge ? 40 : 28, lineHeight: 1, position: "relative", zIndex: 1 }}>
          {icon}
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontSize: isLarge ? 18 : 15,
            fontWeight: 600,
            color: variant === "gold" ? "#D48B00" : "#e8e0c8",
            letterSpacing: "0.02em",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: isLarge ? 13 : 11,
              color: "rgba(232,224,200,0.55)",
              marginTop: 4,
              lineHeight: 1.4,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {description}
          </div>
        )}
      </div>
    </button>
  );
}
