/**
 * ScoreOverlay — animated full-screen result reveal shown after a craft build completes.
 *
 * Displays the 0-5 craft score, tiered feedback label, and a rank pressure message.
 * Auto-dismissed by the parent after 4.8 s. No interaction required.
 */

import { motion } from "framer-motion";

interface ScoreOverlayProps {
  score:       number;
  feedback:    string;
  rankMessage: string | null;
  accentColor: string;
}

function scoreColor(score: number): string {
  if (score >= 4.5) return "#FFD700";
  if (score >= 3.5) return "#34d399";
  if (score >= 2.5) return "#f59e0b";
  return "#ef4444";
}

export default function ScoreOverlay({ score, feedback, rankMessage, accentColor }: ScoreOverlayProps) {
  const color = scoreColor(score);

  return (
    <motion.div
      key="score-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        position: "fixed", inset: 0, zIndex: 180,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ scale: 0.75, y: 32, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
        style={{
          textAlign: "center",
          padding: "52px 64px",
          borderRadius: 32,
          background: "rgba(12,9,7,0.97)",
          border: `1px solid ${color}40`,
          boxShadow: `0 60px 140px ${color}20, 0 0 0 1px rgba(255,255,255,0.04)`,
          maxWidth: 400,
        }}
      >
        {/* Score ring */}
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={60} cy={60} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <motion.circle
              cx={60} cy={60} r={52} fill="none"
              stroke={color} strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - score / 5) }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div style={{ position: "absolute", textAlign: "center" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 280, damping: 18 }}
              style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1 }}
            >
              {score.toFixed(1)}
            </motion.div>
            <div style={{ fontSize: 9, color: "rgba(232,224,200,0.45)", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 2 }}>/ 5.0</div>
          </div>
        </div>

        {/* Feedback */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          style={{
            fontFamily: "var(--app-font-serif, Georgia, serif)",
            fontSize: 18, fontWeight: 600, color: "#fff",
            margin: "0 0 12px", lineHeight: 1.3,
          }}
        >
          {feedback}
        </motion.p>

        {/* Rank pressure message */}
        {rankMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.4 }}
            style={{
              fontSize: 13, color: accentColor,
              fontWeight: 600, letterSpacing: "0.06em",
            }}
          >
            {rankMessage}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
