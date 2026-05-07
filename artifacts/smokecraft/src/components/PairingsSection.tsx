import { motion } from "framer-motion";
import { ProductResult } from "../services/api";
import { PairingCard } from "./PairingCard";

interface PairingsSectionProps {
  pairings: ProductResult[];
}

export function PairingsSection({ pairings }: PairingsSectionProps) {
  if (!pairings || pairings.length === 0) return null;

  return (
    <motion.div
      className="mt-20 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      data-testid="pairings-section"
    >
      {/* Section divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.2))" }} />
        <h3
          className="font-serif text-2xl tracking-wider"
          style={{ color: "rgba(212,139,0,0.75)", fontWeight: 300, fontStyle: "italic" }}
        >
          Recommended Pairings
        </h3>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,139,0,0.2), transparent)" }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pairings.map((pairing, i) => (
          <motion.div
            key={pairing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <PairingCard product={pairing} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
