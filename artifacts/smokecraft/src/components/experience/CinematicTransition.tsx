import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  children: ReactNode;
  motionKey?: string;
}

export function CinematicTransition({ children, motionKey = "cinematic" }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default CinematicTransition;
