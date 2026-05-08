import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle: string;
  accent?: string;
}

export function OnboardingSequence({ title, subtitle, accent = "#D48B00" }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "55vh",
      textAlign: "center",
      padding: "60px 32px 40px",
    }}>
      {/* Title word-by-word reveal */}
      <motion.h1
        initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontSize: "clamp(32px, 6vw, 72px)",
          fontWeight: 300,
          color: "#F5F2ED",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          marginBottom: 28,
          lineHeight: 1.1,
        }}
      >
        {title}
      </motion.h1>

      {/* Amber divider */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        style={{
          width: 80,
          height: 1,
          background: accent,
          marginBottom: 28,
          transformOrigin: "center",
        }}
      />

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.7 }}
        style={{
          fontSize: "clamp(14px, 2vw, 19px)",
          color: "rgba(245,242,237,0.6)",
          maxWidth: 620,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          fontStyle: "italic",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}
      >
        {subtitle}
      </motion.p>
    </div>
  );
}

export default OnboardingSequence;
