import { motion } from "framer-motion";

/**
 * CigarBurnLoader — cinematic loading screen.
 * Shows an SVG cigar with animated ember glow, burn line, and rising smoke.
 * Auto-calls onComplete after the burn animation finishes (~2.8s + 0.4s buffer).
 */
interface CigarBurnLoaderProps {
  onComplete: () => void;
}

export function CigarBurnLoader({ onComplete }: CigarBurnLoaderProps) {
  return (
    <motion.div
      key="cigar-loader"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(120,70,10,0.25) 0%, transparent 70%), hsl(22 18% 5%)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      onAnimationComplete={() => {
        // Trigger completion after the burn animation duration + buffer
        setTimeout(onComplete, 3200);
      }}
      data-testid="loading-state"
    >
      {/* Ambient glow behind the cigar */}
      <motion.div
        className="absolute w-64 h-24 rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.9, 1.1, 0.9] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Smoke wisps above the ember */}
      <div className="relative mb-2" style={{ height: "80px", width: "200px" }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${14 + i * 6}px`,
              height: `${14 + i * 6}px`,
              background: "rgba(200,180,150,0.18)",
              filter: "blur(10px)",
              left: `${80 + (i - 1) * 12}px`,
              bottom: 0,
            }}
            animate={{
              y: [0, -(40 + i * 18)],
              x: [(i - 1) * 4, (i - 1) * 14 + (i % 2 === 0 ? 8 : -8)],
              scaleX: [1, 1.8 + i * 0.3],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2.8 + i * 0.6,
              delay: i * 0.7,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* The cigar */}
      <div className="relative flex items-center" style={{ width: "220px", height: "22px" }}>

        {/* Ember tip — glowing orange/red dot */}
        <div className="relative flex-shrink-0 z-10">
          <div
            className="ember-glow w-4 h-4 rounded-full"
            style={{
              background: "radial-gradient(circle, #fff5e0 0%, #ff7820 40%, #cc3000 100%)",
              boxShadow: "0 0 8px 4px rgba(255,120,30,0.8), 0 0 20px 8px rgba(255,60,0,0.4)",
            }}
          />
        </div>

        {/* Ash segment — light grey, short */}
        <div
          className="flex-shrink-0 h-[10px] rounded-r-full"
          style={{
            width: "18px",
            background: "linear-gradient(90deg, #b0a090, #d8d0c0)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
          }}
        />

        {/* Burning section — animated width shrink = burn */}
        <div
          className="cigar-burn h-[14px] rounded-none overflow-hidden flex-shrink-0"
          style={{
            background: "linear-gradient(90deg, #5c3a1e, #7a4e28, #6b4020)",
            boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.5)",
            width: "100px",
          }}
        />

        {/* Unburned body — tobacco brown */}
        <div
          className="flex-1 h-[16px]"
          style={{
            background: "linear-gradient(90deg, #8B5E3C, #A0714A, #7A5030)",
            boxShadow: "inset 0 2px 3px rgba(0,0,0,0.4), inset 0 -1px 2px rgba(255,255,255,0.05)",
          }}
        />

        {/* Cap / sealed end */}
        <div
          className="flex-shrink-0 h-[16px] w-3 rounded-r-full"
          style={{
            background: "linear-gradient(90deg, #7A5030, #5C3820)",
            boxShadow: "inset 0 2px 2px rgba(0,0,0,0.5)",
          }}
        />
      </div>

      {/* Text */}
      <motion.p
        className="mt-12 font-serif text-xl tracking-[0.3em] uppercase"
        style={{ color: "rgba(212,175,55,0.75)" }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        Crafting your experience
      </motion.p>

      <motion.div
        className="mt-3 flex gap-1"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ background: "rgba(212,175,55,0.6)" }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
