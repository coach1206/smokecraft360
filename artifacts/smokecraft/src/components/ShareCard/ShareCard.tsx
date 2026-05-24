import { useRef, useState, useCallback, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share2, X, Check } from "lucide-react";
import html2canvas from "html2canvas";
import { logShareEvent } from "@/services/api";

export interface ShareCardProps {
  craftType: "smoke" | "brew" | "pour" | "vape" | "wine" | string;
  styleTitle: string;
  moodTitle: string;
  recommendationName: string;
  score: number;
  accent: string;
  accentSoft: string;
  onClose: () => void;
}

const CRAFT_LABELS: Record<string, string> = {
  smoke: "Craft Cigar Build",
  brew:  "Craft Beer Build",
  pour:  "Craft Pour Build",
  vape:  "Craft Vape Build",
};

const CRAFT_GLYPHS: Record<string, string> = {
  smoke: "◆",
  brew:  "◬",
  pour:  "◈",
  vape:  "◉",
};

function ScoreBadge({ score, accent, accentSoft }: { score: number; accent: string; accentSoft: string }) {
  const out5 = (score / 20).toFixed(1);
  const pct  = Math.min(100, Math.max(0, score));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `conic-gradient(${accent} ${pct}%, rgba(26,26,27,0.10) 0%)`,
        boxShadow: `0 0 28px ${accent}55`,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#F5F2ED",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column",
        }}>
          <span style={{
            fontSize: 18, fontWeight: 800, color: accent,
            fontFamily: "Georgia, serif", lineHeight: 1,
          }}>{out5}</span>
          <span style={{ fontSize: 9, color: "rgba(26,26,27,0.48)", letterSpacing: "0.15em" }}>/ 5</span>
        </div>
      </div>
      <span style={{
        fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase",
        color: accentSoft, fontWeight: 700,
      }}>Score</span>
    </div>
  );
}

function ShareCardVisual({
  craftType, styleTitle, moodTitle, recommendationName, score, accent, accentSoft, cardRef,
}: ShareCardProps & { cardRef: RefObject<HTMLDivElement | null> }) {
  const label = CRAFT_LABELS[craftType] ?? "Craft Build";
  const glyph = CRAFT_GLYPHS[craftType] ?? "◆";
  const rankLabel =
    score >= 80 ? "Elite Build"    :
    score >= 60 ? "Strong Build"   :
    score >= 40 ? "Solid Build"    :
    "Keep Crafting";

  return (
    <div
      ref={cardRef}
      style={{
        width: 400,
        minHeight: 240,
        background: `linear-gradient(145deg, #EFEBE0 0%, #F5F2ED 60%, #1a1206 100%)`,
        border: `1.5px solid ${accent}55`,
        borderRadius: 20,
        padding: "28px 28px 24px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Georgia, serif",
        flexShrink: 0,
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 220, height: 220, borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: `radial-gradient(circle, ${accentSoft}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
          }}>
            <span style={{ color: accent, fontSize: 12, fontFamily: "monospace" }}>{glyph}</span>
            <span style={{
              fontSize: 9, letterSpacing: "0.38em", textTransform: "uppercase",
              color: accent, fontWeight: 700, fontFamily: "system-ui, sans-serif",
            }}>{label}</span>
          </div>
          <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        </div>
        <ScoreBadge score={score} accent={accent} accentSoft={accentSoft} />
      </div>

      {/* Recommendation name */}
      <div style={{ marginBottom: 18 }}>
        <p style={{
          margin: "0 0 4px", fontSize: 9,
          letterSpacing: "0.3em", textTransform: "uppercase",
          color: "rgba(26,26,27,0.44)", fontFamily: "system-ui, sans-serif",
        }}>Top Pick</p>
        <h2 style={{
          margin: 0, fontSize: 22, fontWeight: 600, color: "#1A1A1B",
          lineHeight: 1.2,
        }}>{recommendationName}</h2>
      </div>

      {/* Style + Mood tags */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[styleTitle, moodTitle].filter(Boolean).map((tag, i) => (
          <span key={i} style={{
            padding: "5px 12px",
            borderRadius: 999,
            background: `${accent}18`,
            border: `1px solid ${accent}35`,
            color: "rgba(26,26,27,0.72)",
            fontSize: 11, fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "0.05em",
          }}>{tag}</span>
        ))}
        <span style={{
          padding: "5px 12px",
          borderRadius: 999,
          background: `${accent}28`,
          border: `1px solid ${accent}55`,
          color: accent,
          fontSize: 11, fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.08em",
        }}>{rankLabel}</span>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: `1px solid ${accent}20`,
        paddingTop: 14, marginTop: 4,
      }}>
        <span style={{
          fontSize: 10, color: "rgba(26,26,27,0.35)",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.12em",
        }}>smokecraft.app</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: i <= Math.round(score / 20) ? accent : `${accent}25`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShareCard(props: ShareCardProps) {
  const { accent, accentSoft, onClose } = props;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [canNativeShare] = useState(() => typeof navigator !== "undefined" && !!navigator.share);

  const captureCanvas = useCallback(async (): Promise<Blob> => {
    if (!cardRef.current) throw new Error("Card not mounted");
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      }, "image/png", 1.0);
    });
  }, []);

  const handleDownload = useCallback(async () => {
    setStatus("generating");
    try {
      const blob = await captureCanvas();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "smokecraft-build.png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
      void logShareEvent({
        craftType:          props.craftType,
        score:              props.score,
        recommendationName: props.recommendationName,
        shareMethod:        "download",
      });
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }, [captureCanvas, props.craftType, props.score, props.recommendationName]);

  const handleShare = useCallback(async () => {
    setStatus("generating");
    try {
      const blob = await captureCanvas();
      const file = new File([blob], "smokecraft-build.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title:  "My SmokeCraft Build",
          text:   `I just built my perfect match on SmokeCraft — ${props.recommendationName}!`,
        });
        setStatus("done");
        setTimeout(() => setStatus("idle"), 2000);
        void logShareEvent({
          craftType:          props.craftType,
          score:              props.score,
          recommendationName: props.recommendationName,
          shareMethod:        "native",
        });
      } else {
        await handleDownload();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2500);
      }
    }
  }, [captureCanvas, handleDownload, props.craftType, props.score, props.recommendationName]);

  return (
    <AnimatePresence>
      <motion.div
        key="share-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(5,4,3,0.88)",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
            maxWidth: 440, width: "100%",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <p style={{
                margin: "0 0 2px", fontSize: 9,
                letterSpacing: "0.38em", textTransform: "uppercase",
                color: accent, fontWeight: 700,
              }}>Share Your Build</p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(26,26,27,0.44)" }}>
                Export your craft result as an image
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(26,26,27,0.08)", border: "none",
                width: 32, height: 32, borderRadius: 999,
                color: "rgba(26,26,27,0.52)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* The shareable card — what gets captured */}
          <ShareCardVisual {...props} cardRef={cardRef} />

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <motion.button
              type="button"
              onClick={handleDownload}
              disabled={status === "generating"}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: 999,
                border: `1px solid ${accent}50`,
                background: `${accent}14`,
                color: accent,
                fontSize: 11, fontWeight: 700,
                letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: status === "generating" ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                opacity: status === "generating" ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {status === "done" ? <Check size={13} /> : <Download size={13} />}
              {status === "generating" ? "Generating…" : status === "done" ? "Saved!" : "Save PNG"}
            </motion.button>

            {canNativeShare && (
              <motion.button
                type="button"
                onClick={handleShare}
                disabled={status === "generating"}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: `linear-gradient(135deg, ${accent}, ${accentSoft})`,
                  color: "#F5F2ED",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  cursor: status === "generating" ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  opacity: status === "generating" ? 0.6 : 1,
                  transition: "opacity 0.2s",
                  boxShadow: `0 8px 22px ${accent}50`,
                }}
              >
                <Share2 size={13} />
                Share
              </motion.button>
            )}
          </div>

          {status === "error" && (
            <p style={{ margin: 0, fontSize: 11, color: "#E5818F", textAlign: "center" }}>
              Could not export image — please try again.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
