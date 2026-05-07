import { motion } from "framer-motion";
import type { FoodResult } from "../../services/api";
import { ProductImage } from "../ProductImage";

interface FoodSectionProps {
  foodPairings: FoodResult[];
}

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  wings:      { color: "rgba(220,150,60,0.75)",  label: "Wings"      },
  steak:      { color: "rgba(180,55,55,0.75)",   label: "Steak"      },
  salad:      { color: "rgba(70,155,70,0.75)",   label: "Salad"      },
  appetizers: { color: "rgba(212,139,0,0.75)",  label: "Appetizers" },
  seafood:    { color: "rgba(65,135,195,0.75)",  label: "Seafood"    },
  desserts:   { color: "rgba(155,75,155,0.75)",  label: "Desserts"   },
};

export function FoodSection({ foodPairings }: FoodSectionProps) {
  if (!foodPairings || foodPairings.length === 0) return null;

  return (
    <motion.div
      className="mt-16 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Section header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.15))" }} />
        <div className="text-center">
          <h3
            className="font-serif text-2xl tracking-wider"
            style={{ color: "rgba(212,139,0,0.7)", fontWeight: 300, fontStyle: "italic" }}
          >
            Complete Your Experience
          </h3>
          <p className="text-[9px] uppercase tracking-[0.28em] mt-1" style={{ color: "rgba(180,155,100,0.38)" }}>
            Recommended Food Pairings
          </p>
        </div>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,139,0,0.15), transparent)" }} />
      </div>

      {/* Food cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {foodPairings.map((food, i) => {
          const meta = CATEGORY_META[food.category] ?? { color: "rgba(180,155,100,0.6)", label: food.category };
          return (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.5 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <FoodCard food={food} meta={meta} rank={i} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function FoodCard({
  food,
  meta,
  rank,
}: {
  food:  FoodResult;
  meta:  { color: string; label: string };
  rank:  number;
}) {
  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden group transition-all duration-500"
      style={{
        background: "linear-gradient(145deg, rgba(26,26,27,0.05), rgba(26,26,27,0.03))",
        border:     "1px solid rgba(26,26,27,0.09)",
        boxShadow:  "0 4px 20px rgba(26,26,27,0.06)",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = meta.color.replace("0.75", "0.3");
        (e.currentTarget as HTMLElement).style.boxShadow  = `0 8px 32px rgba(26,26,27,0.10), 0 0 0 1px ${meta.color.replace("0.75", "0.15")}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,26,27,0.09)";
        (e.currentTarget as HTMLElement).style.boxShadow  = "0 4px 20px rgba(26,26,27,0.06)";
      }}
    >
      {/* Rank glow for top pick */}
      {rank === 0 && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,139,0,0.06), transparent)" }}
        />
      )}

      {/* Food image */}
      <ProductImage
        url={food.imageUrl}
        alt={food.name}
        category={food.category}
        height={140}
      />

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 relative z-10">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[9px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full font-medium"
            style={{
              background: meta.color.replace("0.75", "0.12"),
              color:      meta.color.replace("0.75", "0.85"),
              border:     `1px solid ${meta.color.replace("0.75", "0.25")}`,
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* Food name */}
        <h4 className="font-serif text-lg leading-snug mb-2" style={{ color: "rgba(230,210,175,0.9)", fontWeight: 400 }}>
          {food.name}
        </h4>

        {/* Description */}
        <p className="text-xs leading-relaxed flex-1" style={{ color: "rgba(180,155,100,0.6)" }}>
          {food.description}
        </p>

        {/* Flavor tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {food.flavorTags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(200,180,140,0.6)" }}>
              {tag}
            </span>
          ))}
        </div>

        {/* "Best Pairing" label for top pick */}
        {rank === 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(212,139,0,0.1)" }}>
            <p className="text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(212,139,0,0.45)" }}>
              ✦ Best Match
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
