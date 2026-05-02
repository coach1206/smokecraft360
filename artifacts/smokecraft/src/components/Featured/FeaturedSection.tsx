import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ProductResult } from "../../services/api";

interface FeaturedSectionProps {
  featured: ProductResult[];
}

export function FeaturedSection({ featured }: FeaturedSectionProps) {
  if (!featured || featured.length === 0) return null;

  return (
    <motion.div
      className="mt-10 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: "rgba(212,175,55,0.6)" }} />
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "rgba(212,175,55,0.55)" }}>
            Featured Selections
          </span>
          <Sparkles size={12} style={{ color: "rgba(212,175,55,0.6)" }} />
        </div>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.2), transparent)" }} />
      </div>

      {/* Cards */}
      <div className={`grid gap-3 ${featured.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {featured.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 + i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturedCard product={product} />
          </motion.div>
        ))}
      </div>

      <p className="mt-3 text-[8px] text-center uppercase tracking-[0.22em]" style={{ color: "rgba(180,155,100,0.22)" }}>
        Partner-supported selections
      </p>
    </motion.div>
  );
}

function FeaturedCard({ product }: { product: ProductResult }) {
  return (
    <div
      className="relative p-4 rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(212,175,55,0.07), rgba(255,255,255,0.02))",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(212,175,55,0.06) inset",
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.05), transparent)" }}
      />

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3">
        {product.sponsored && (
          <span
            className="text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.28)",
              color: "rgba(212,175,55,0.8)",
            }}
          >
            <Sparkles size={8} />
            Featured
          </span>
        )}
        {!product.sponsored && product.boostLevel && product.boostLevel >= 2 && (
          <span
            className="text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(212,175,55,0.07)",
              border: "1px solid rgba(212,175,55,0.18)",
              color: "rgba(212,175,55,0.6)",
            }}
          >
            Recommended
          </span>
        )}
        <span
          className="text-[8px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(180,155,100,0.5)",
          }}
        >
          {product.category}
        </span>
      </div>

      {/* Name */}
      <h4 className="font-serif text-base leading-tight mb-2" style={{ color: "rgba(230,210,175,0.88)", fontWeight: 400 }}>
        {product.name}
      </h4>

      {/* Flavor tags */}
      <div className="flex flex-wrap gap-1.5">
        {product.flavorNotes.slice(0, 3).map((note) => (
          <span
            key={note}
            className="text-[9px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(212,175,55,0.12)",
              color: "rgba(200,180,140,0.65)",
            }}
          >
            {note}
          </span>
        ))}
      </div>

      {/* Strength indicator */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.35)" }}>
          Strength
        </span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((dot) => (
            <div
              key={dot}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: dot <= product.strength
                  ? "rgba(212,175,55,0.6)"
                  : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
