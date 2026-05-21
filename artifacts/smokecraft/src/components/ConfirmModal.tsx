import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  warning?: string;
  actionLabel?: string;
  onAction?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  confirmPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message, warning,
  actionLabel, onAction,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  confirmDisabled = false,
  confirmPhrase,
  onConfirm, onCancel,
}: ConfirmModalProps) {
  const accentColor = danger ? "#ef4444" : "#D48B00";
  const [typedPhrase, setTypedPhrase] = useState("");

  useEffect(() => {
    if (!open) setTypedPhrase("");
  }, [open]);

  const phraseMatches = !confirmPhrase || typedPhrase === confirmPhrase;
  const isDisabled = confirmDisabled || !phraseMatches;

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
            <div style={{ fontSize: 13, color: "rgba(26,26,27,0.48)", lineHeight: 1.6, marginBottom: warning ? 12 : (confirmPhrase ? 16 : 24) }}>{message}</div>
            {warning && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 14px", borderRadius: 10, marginBottom: confirmPhrase ? 16 : 24,
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)",
                textAlign: "left",
              }}>
                <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ flex: 1, margin: 0 }}>
                  <span style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5, fontWeight: 500 }}>{warning}</span>
                  {actionLabel && onAction && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={onAction}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        marginTop: 8, background: "none", border: "none",
                        padding: 0, cursor: "pointer",
                        fontSize: 12, fontWeight: 700, color: "#D48B00",
                        textDecoration: "underline", textUnderlineOffset: 3,
                      }}
                    >
                      {actionLabel}
                      <ExternalLink size={11} color="#D48B00" />
                    </motion.button>
                  )}
                </p>
              </div>
            )}

            {confirmPhrase && (
              <div style={{ marginBottom: 24, textAlign: "left" }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "rgba(26,26,27,0.55)",
                  marginBottom: 8, letterSpacing: "0.02em",
                }}>
                  Type <span style={{
                    fontFamily: "monospace", fontWeight: 700,
                    color: "#ef4444", background: "rgba(239,68,68,0.10)",
                    padding: "1px 5px", borderRadius: 4,
                  }}>{confirmPhrase}</span> to confirm
                </div>
                <input
                  type="text"
                  value={typedPhrase}
                  onChange={(e) => setTypedPhrase(e.target.value)}
                  placeholder={confirmPhrase}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    fontSize: 14, fontWeight: 600, fontFamily: "monospace",
                    background: "rgba(26,26,27,0.06)",
                    border: `1px solid ${typedPhrase && !phraseMatches ? "rgba(239,68,68,0.50)" : "rgba(26,26,27,0.14)"}`,
                    color: "#1A1A1B", outline: "none",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                />
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
                whileTap={isDisabled ? {} : { scale: 0.95 }}
                onClick={isDisabled ? undefined : onConfirm}
                disabled={isDisabled}
                style={{
                  flex: 1, padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: isDisabled
                    ? "rgba(26,26,27,0.10)"
                    : danger
                      ? "linear-gradient(135deg, #ef4444, #dc2626)"
                      : "linear-gradient(135deg, #D48B00, #a98828)",
                  border: "none",
                  color: isDisabled ? "rgba(26,26,27,0.35)" : danger ? "#1A1A1B" : "#F5F2ED",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  minHeight: 48,
                  opacity: isDisabled ? 0.7 : 1,
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
