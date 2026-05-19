import { motion } from "framer-motion";
import { useGuest } from "@/context/GuestProfileContext";
import { playClick } from "@/hooks/useAudio";
import { hapticClick } from "@/hooks/useHaptic";

export function BackButton() {
  const { history, goBack } = useGuest();
  if (history.length === 0) return null;

  function handleBack() {
    playClick();
    hapticClick();
    goBack();
  }

  return (
    <motion.button
      type="button"
      onPointerDown={handleBack}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        top: 36,
        left: 36,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(0,0,0,0.72)",
        border: "1.5px solid rgba(212,175,55,0.35)",
        borderRadius: 12,
        padding: "14px 24px",
        color: "#D4AF37",
        fontSize: 20,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
        cursor: "pointer",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.60)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>←</span>
      <span>BACK</span>
    </motion.button>
  );
}
