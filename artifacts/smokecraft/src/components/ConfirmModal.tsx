import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm, onCancel,
}: ConfirmModalProps) {
  const accentColor = danger ? "#ef4444" : "#D48B00";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(26,26,27,0.32)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 400, borderRadius: 20,
              background: "linear-gradient(145deg, #1e1b17, #EFEBE0)",
              border: `1px solid ${accentColor}30`,
              padding: "28px 24px", textAlign: "center",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: `${accentColor}12`, border: `1px solid ${accentColor}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={28} color={accentColor} />
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1B", marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "rgba(26,26,27,0.48)", lineHeight: 1.6, marginBottom: 24 }}>{message}</div>

            <div style={{ display: "flex", gap: 12 }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: "rgba(26,26,27,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(26,26,27,0.58)", cursor: "pointer", minHeight: 48,
                }}
              >{cancelLabel}</motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onConfirm}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: danger
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #D48B00, #a98828)",
                  border: "none",
                  color: danger ? "#1A1A1B" : "#F5F2ED",
                  cursor: "pointer", minHeight: 48,
                }}
              >{confirmLabel}</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
