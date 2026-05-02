import { motion } from "framer-motion";
import { ProductResult } from "../services/api";
import { PairingCard } from "./PairingCard";

interface PairingsSectionProps {
  pairings: ProductResult[];
}

export function PairingsSection({ pairings }: PairingsSectionProps) {
  if (!pairings || pairings.length === 0) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.5 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-16 w-full max-w-2xl mx-auto"
      data-testid="pairings-section"
    >
      <motion.h3 variants={item} className="text-center font-serif text-2xl mb-8 text-primary/80">
        Recommended Pairings
      </motion.h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pairings.map((pairing) => (
          <motion.div key={pairing.id} variants={item}>
            <PairingCard product={pairing} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
