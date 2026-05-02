/**
 * ExperienceRightPanel — glass right panel shown in results phase.
 *
 * Shows:
 *  - Experience name (serif headline)
 *  - Tagline / category badge
 *  - Top cigar details (strength, body, origin)
 *  - Whiskey / spirits pairing
 *  - Flavor notes as chips
 *  - Quick action row (Order / Save)
 */

import { motion }                       from "framer-motion";
import { ShoppingBag, Bookmark, Flame, Droplets, Wind } from "lucide-react";
import type { ProductResult }           from "@/services/api";

const GOLD     = "rgba(212,175,55,1)";
const GOLD_DIM = "rgba(212,175,55,0.6)";
const MUTED    = "rgba(180,155,100,0.4)";

interface Props {
  product:         ProductResult;
  pairing?:        ProductResult;
  onOrder:         () => void;
  onSave:          () => void;
  experienceSaved: boolean;
}

export function ExperienceRightPanel({ product, pairing, onOrder, onSave, experienceSaved }: Props) {
  const strengthLabel = (v: number) => {
    if (v <= 1) return "Mild";
    if (v <= 2) return "Mild–Medium";
    if (v <= 3) return "Medium";
    if (v <= 4) return "Medium–Full";
    return "Full";
  };

  return (
    <div className="space-y-5 pt-8">

      {/* Category badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2">
        <Flame size={9} style={{ color: GOLD_DIM }} />
        <span className="text-[7px] uppercase tracking-[0.3em]" style={{ color: GOLD_DIM }}>
          {product.category === "cigar" ? "Signature Cigar" : "Curated Spirit"}
        </span>
      </motion.div>

      {/* Main name */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <h2 className="font-serif leading-tight"
          style={{
            fontSize: "clamp(1.25rem, 3vw, 1.6rem)",
            fontWeight: 300,
            color: "rgba(230,210,175,0.92)",
            letterSpacing: "0.02em",
          }}>
          {product.name}
        </h2>
        {product.tier && (
          <p className="text-[8px] uppercase tracking-[0.2em] mt-1" style={{ color: MUTED }}>
            {product.tier}
          </p>
        )}
      </motion.div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(212,175,55,0.1)" }} />

      {/* Details grid */}
      {/* Details */}
      <motion.div
        className="grid grid-cols-2 gap-2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {product.strength !== undefined && (
          <DetailChip icon={<Wind size={8} />} label="Strength" value={strengthLabel(product.strength)} />
        )}
        {product.category && (
          <DetailChip icon={<Flame size={8} />} label="Type" value={product.category} />
        )}
        {product.moodTags && product.moodTags.length > 0 && (
          <DetailChip icon={<Droplets size={8} />} label="Mood" value={product.moodTags[0] ?? ""} />
        )}
        {product.tier && (
          <DetailChip icon={<Wind size={8} />} label="Tier" value={product.tier} />
        )}
      </motion.div>

      {/* Flavor notes */}
      {product.flavorNotes && product.flavorNotes.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <p className="text-[7px] uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
            Tasting Notes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {product.flavorNotes.slice(0, 6).map((note) => (
              <span key={note}
                className="px-2 py-1 rounded-full text-[7px] capitalize"
                style={{ background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", color: GOLD_DIM }}>
                {note}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pairing tags */}
      {product.pairingTags && product.pairingTags.length > 0 && (
        <motion.p
          className="text-[9px] leading-relaxed italic"
          style={{ color: "rgba(180,155,100,0.5)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          Pairs with: {product.pairingTags.slice(0, 3).join(", ")}
        </motion.p>
      )}

      {/* Pairing */}
      {pairing && (
        <motion.div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(212,175,55,0.1)" }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-[7px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>Perfect Pairing</p>
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <Droplets size={11} style={{ color: GOLD_DIM }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm leading-tight" style={{ color: "rgba(210,190,155,0.8)", fontWeight: 300 }}>
                {pairing.name}
              </p>
              {pairing.flavorNotes && pairing.flavorNotes.length > 0 && (
                <p className="text-[7px] mt-1" style={{ color: MUTED }}>
                  {pairing.flavorNotes.slice(0, 3).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* Actions */}
      <motion.div className="space-y-2"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <motion.button
          onClick={onOrder}
          className="sc-btn-primary w-full flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <ShoppingBag size={12} />Order Now
        </motion.button>

        <motion.button
          onClick={onSave}
          disabled={experienceSaved}
          className="sc-btn-ghost w-full flex items-center justify-center gap-2"
          whileHover={!experienceSaved ? { borderColor: "rgba(212,175,55,0.4)", color: GOLD } : {}}
          whileTap={!experienceSaved ? { scale: 0.97 } : {}}>
          <Bookmark size={12} />
          {experienceSaved ? "Saved" : "Save Experience"}
        </motion.button>
      </motion.div>

    </div>
  );
}

function DetailChip({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-1 mb-1" style={{ color: "rgba(180,155,100,0.35)" }}>
        {icon}
        <span className="text-[6px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-[9px] font-medium capitalize" style={{ color: "rgba(200,180,145,0.75)" }}>
        {value}
      </p>
    </div>
  );
}
