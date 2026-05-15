import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message, warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  confirmDisabled = false,
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
            <div style={{ fontSize: 13, color: "rgba(26,26,27,0.48)", lineHeight: 1.6, marginBottom: warning ? 12 : 24 }}>{message}</div>
            {warning && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px", borderRadius: 10, marginBottom: 24,
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)",
                textAlign: "left",
              }}>
                <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5, fontWeight: 500 }}>{warning}</span>
              </div>
            )}

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
                whileTap={confirmDisabled ? {} : { scale: 0.95 }}
                onClick={confirmDisabled ? undefined : onConfirm}
                disabled={confirmDisabled}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: confirmDisabled
                    ? "rgba(26,26,27,0.10)"
                    : danger
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #D48B00, #a98828)",
                  border: "none",
                  color: confirmDisabled ? "rgba(26,26,27,0.35)" : danger ? "#1A1A1B" : "#F5F2ED",
                  cursor: confirmDisabled ? "not-allowed" : "pointer",
                  minHeight: 48,
                  opacity: confirmDisabled ? 0.7 : 1,
                  transition: "background 0.15s, color 0.15s, opacity 0.15s",
                }}
              >{confirmLabel}</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
