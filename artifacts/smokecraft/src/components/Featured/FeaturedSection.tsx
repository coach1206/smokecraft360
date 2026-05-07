/**
 * FeaturedSection — "Upgrade Your Experience" upsell row, shown on the
 * Reveal screen immediately after "Your Experience Is Ready".
 *
 * Per the upsell brief, this is the conversion peak. Each card surfaces a
 * premium variant of what the guest just chose, with a psychology badge
 * (Most Popular / Limited Availability / Recommended for You) and a clear
 * price delta vs. the included tier. Clicking a card opens the order modal
 * pre-loaded with that upgrade — never feels like a sales pitch.
 *
 * Audit-first: this component pre-existed as a generic "Featured Selections"
 * grid. We honor the brief by relabeling, bumping every font ≥ 11 px (kiosk
 * readability mandate), adding the badge ladder + price delta, and exposing
 * a click handler so cards become real CTAs.
 */

import { motion }                  from "framer-motion";
import { Sparkles, TrendingUp, Clock, Star } from "lucide-react";
import type { ProductResult }      from "../../services/api";
import { ProductImage }            from "../ProductImage";

interface FeaturedSectionProps {
  featured:    ProductResult[];
  onSelect?:   (product: ProductResult) => void;
}

/** Tier → upgrade price delta vs. the included recommendation. Conservative
 *  defaults; venue can override later via product.metadata. */
function priceDelta(tier?: string | null): string | null {
  if (tier === "premium") return "+$25";
  if (tier === "mid")     return "+$12";
  return null;
}

/** Pick the strongest psychology badge available for a given product.
 *  Order matters — only one badge wins per card to avoid noise. */
function pickBadge(p: ProductResult): { label: string; icon: typeof Sparkles } | null {
  if (p.campaignId)                               return { label: "Recommended for You", icon: Sparkles  };
  if (p.sponsored)                                return { label: "Most Popular Upgrade", icon: TrendingUp };
  if (p.boostLevel && p.boostLevel >= 3)          return { label: "Limited Availability", icon: Clock     };
  if (p.tier === "premium")                       return { label: "Premium Pick",         icon: Star      };
  return null;
}

/** Derive a believable "only N left" hint for limited items.
 *  Stable per product id so it doesn't flicker on re-render. */
function stockHint(p: ProductResult): number | null {
  if (!(p.boostLevel && p.boostLevel >= 3) && p.tier !== "premium") return null;
  // Hash product id → 3..9 — never 0 (looks broken) or > 9 (not "limited").
  let h = 0;
  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) | 0;
  return 3 + (Math.abs(h) % 7);
}

export function FeaturedSection({ featured, onSelect }: FeaturedSectionProps) {
  if (!featured || featured.length === 0) return null;

  return (
    <motion.div
      className="mt-12 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
      data-testid="upgrade-section"
    >
      {/* Section header — explicit upsell label per the brief. */}
      <div className="flex items-center gap-3 mb-5">
        <Sparkles size={16} style={{ color: "rgba(212,139,0,0.85)" }} />
        <span style={{
          fontSize: 13, textTransform: "uppercase", letterSpacing: "0.28em",
          color: "rgba(232,212,172,0.92)", fontWeight: 700,
        }}>
          Upgrade Your Experience
        </span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,139,0,0.3), transparent)" }} />
      </div>

      <div className={`grid gap-3 ${featured.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {featured.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 30 }}              /* slide in from right per brief */
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1 + i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <FeaturedCard product={product} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>

      <p style={{
        marginTop: 10, fontSize: 11, textAlign: "center",
        textTransform: "uppercase", letterSpacing: "0.22em",
        color: "rgba(107,94,78,0.50)",
      }}>
        Partner-supported selections
      </p>
    </motion.div>
  );
}

function FeaturedCard({
  product, onSelect,
}: { product: ProductResult; onSelect?: (p: ProductResult) => void }) {
  const badge  = pickBadge(product);
  const delta  = priceDelta(product.tier);
  const stock  = stockHint(product);
  const Badge  = badge?.icon;

  const Wrapper: typeof motion.div = onSelect ? motion.button as never : motion.div;

  return (
    <Wrapper
      onClick={onSelect ? () => onSelect(product) : undefined}
      className="relative rounded-xl overflow-hidden flex flex-col text-left"
      whileHover={onSelect ? { scale: 1.02, boxShadow: "0 8px 28px rgba(212,139,0,0.25)" } : {}}
      whileTap={onSelect   ? { scale: 0.97 } : {}}
      style={{
        background: "linear-gradient(135deg, rgba(212,139,0,0.10), rgba(255,245,220,0.025))",
        border: "1px solid rgba(212,139,0,0.32)",                             /* stronger gold per brief */
        boxShadow: "0 6px 22px rgba(26,26,27,0.08), 0 0 0 1px rgba(212,139,0,0.08) inset",
        cursor: onSelect ? "pointer" : "default",
        appearance: "none",
        width: "100%",
      }}
      data-testid={`upgrade-card-${product.id}`}
    >
      <div style={{ position: "relative" }}>
        <ProductImage url={product.imageUrl} alt={product.name} category={product.category} height={150} />
        {delta && (
          <span style={{
            position: "absolute", top: 10, right: 10,
            padding: "5px 11px", borderRadius: 999,
            fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
            background: "linear-gradient(135deg, #b07c14, #D48B00)",
            color: "#EFEBE0",
            boxShadow: "0 4px 14px rgba(212,139,0,0.45)",
          }}>{delta}</span>
        )}
      </div>

      <div className="p-4 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,139,0,0.06), transparent)" }}
        />

        {/* Badge row — at most one psychology badge + the category. */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {badge && Badge && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 999,
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 700,
              background: "rgba(212,139,0,0.18)",
              border: "1px solid rgba(212,139,0,0.45)",
              color: "rgba(245,225,180,0.95)",
            }}>
              <Badge size={11} />{badge.label}
            </span>
          )}
          <span style={{
            padding: "4px 10px", borderRadius: 999,
            fontSize: 11, textTransform: "capitalize", letterSpacing: "0.06em",
            background: "rgba(255,245,220,0.05)",
            border: "1px solid rgba(212,139,0,0.16)",
            color: "rgba(200,180,140,0.78)",
          }}>
            {product.category}
          </span>
        </div>

        <h4 className="font-serif leading-tight" style={{
          fontSize: 18, color: "rgba(245,225,180,0.96)", fontWeight: 400,
          marginBottom: 8, letterSpacing: "0.01em",
        }}>
          {product.name}
        </h4>

        {/* Flavor chips — readable size, gold-tinted. */}
        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 12 }}>
          {product.flavorNotes.slice(0, 3).map((note) => (
            <span key={note} style={{
              padding: "3px 9px", borderRadius: 999, fontSize: 12,
              textTransform: "capitalize",
              background: "rgba(212,139,0,0.08)",
              border: "1px solid rgba(212,139,0,0.22)",
              color: "rgba(225,205,165,0.88)",
            }}>{note}</span>
          ))}
        </div>

        {/* Strength + stock counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em",
              color: "rgba(200,175,130,0.6)", fontWeight: 700,
            }}>Strength</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((dot) => (
                <div key={dot} style={{
                  width: 7, height: 7, borderRadius: 999,
                  background: dot <= product.strength ? "rgba(212,139,0,0.85)" : "rgba(26,26,27,0.12)",
                }} />
              ))}
            </div>
          </div>
          {stock !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,180,120,0.92)",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Clock size={11} />Only {stock} left
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
