import { motion } from "framer-motion";
import { ProductResult } from "../services/api";
import { ProductImage } from "./ProductImage";

interface PairingCardProps {
  product: ProductResult;
}

export function PairingCard({ product }: PairingCardProps) {
  return (
    <motion.div
      className="glass-card rounded-xl overflow-hidden flex flex-col h-full cursor-default"
      whileHover={{
        y: -4,
        boxShadow: "0 20px 50px rgba(26,26,27,0.32), 0 0 20px rgba(212,139,0,0.1)",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      data-testid={`pairing-card-${product.id}`}
    >
      {/* Product image */}
      <ProductImage
        url={product.imageUrl}
        alt={product.name}
        category={product.category}
        height={180}
      />

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Top accent */}
        <div
          className="h-px w-full mb-4 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.3), transparent)" }}
        />

        <div className="flex justify-between items-start mb-2">
          <span
            className="text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
            style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.2)", color: "rgba(212,139,0,0.7)" }}
          >
            {product.category}
          </span>
          <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(107,94,78,0.45)" }}>
            {product.tier}
          </span>
        </div>

        <h3 className="font-serif text-lg leading-tight mb-3 text-foreground" style={{ fontWeight: 400 }}>
          {product.name}
        </h3>

        <p className="text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(107,94,78,0.52)" }}>
          Tasting Notes
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.flavorNotes.slice(0, 3).map((note) => (
            <span key={note} className="px-2.5 py-0.5 text-[10px] rounded-full"
              style={{ background: "rgba(26,26,27,0.07)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(210,190,155,0.8)" }}>
              {note}
            </span>
          ))}
          {product.flavorNotes.length > 3 && (
            <span className="px-2.5 py-0.5 text-[10px] rounded-full"
              style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(180,160,120,0.6)" }}>
              +{product.flavorNotes.length - 3}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3" style={{ borderTop: "1px solid rgba(26,26,27,0.08)" }}>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(107,94,78,0.50)" }}>
            Pairs beautifully with
          </p>
          <p className="text-xs italic" style={{ color: "rgba(212,139,0,0.65)" }}>
            {product.pairingTags.slice(0, 2).join(", ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
