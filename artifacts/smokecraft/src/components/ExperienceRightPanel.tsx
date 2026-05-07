/**
 * ExperienceRightPanel — glass right panel shown in results phase.
 *
 * Shows:
 *  - Experience name (serif headline)
 *  - Tagline / category badge
 *  - Top cigar / spirit details (strength, body, mood, tier)
 *  - Tasting notes as chips
 *  - "Why it works" — a derived 1-line rationale from the matched product
 *  - Whiskey / spirits pairing card
 *  - Quick action row (Order / Save)
 *
 * Type sizes intentionally large (11–18 px) per the kiosk readability brief
 * (target audience 35–75). No text below 11 px is permitted in this panel.
 */

import { motion }                       from "framer-motion";
import { ShoppingBag, Bookmark, Flame, Droplets, Wind, Sparkles } from "lucide-react";
import type { ProductResult }           from "@/services/api";

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.78)";
const MUTED    = "rgba(200,175,130,0.65)";

interface Props {
  product:         ProductResult;
  pairing?:        ProductResult;
  onOrder:         () => void;
  onSave:          () => void;
  experienceSaved: boolean;
}

function strengthLabel(v: number): string {
  if (v <= 1) return "Mild";
  if (v <= 2) return "Mild–Medium";
  if (v <= 3) return "Medium";
  if (v <= 4) return "Medium–Full";
  return "Full";
}

/** Build a one-line "Why it works" rationale from the matched product. */
function whyItWorks(product: ProductResult, pairing?: ProductResult): string {
  const notes = (product.flavorNotes ?? []).slice(0, 2);
  const mood  = product.moodTags?.[0];
  const sLab  = strengthLabel(product.strength).toLowerCase();
  const noteText =
    notes.length === 2 ? `${notes[0]} and ${notes[1]}` :
    notes.length === 1 ? `${notes[0]}` :
    "balanced";
  const moodFrag = mood ? `, perfect for a ${mood} moment` : "";
  const pairFrag = pairing
    ? ` Lifted by ${pairing.name} — its ${(pairing.flavorNotes?.[0] ?? "complementary")} character mirrors the ${notes[0] ?? "profile"}.`
    : "";
  return `Selected for its ${noteText} character with a ${sLab} body${moodFrag}.${pairFrag}`;
}

export function ExperienceRightPanel({ product, pairing, onOrder, onSave, experienceSaved }: Props) {
  return (
    <div className="space-y-5 pt-6">

      {/* Category badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2">
        <Flame size={14} style={{ color: GOLD_DIM }} />
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.28em", color: GOLD_DIM, fontWeight: 700 }}>
          {product.category === "cigar"
            ? "Signature Cigar"
            : product.category === "beer"
            ? "Craft Brew"
            : "Curated Spirit"}
        </span>
      </motion.div>

      {/* Main name */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <h2 className="font-serif leading-tight"
          style={{
            fontSize: "clamp(1.45rem, 3.2vw, 1.85rem)",   // ~23–30 px
            fontWeight: 400,
            color: "rgba(245,225,180,0.96)",
            letterSpacing: "0.02em",
          }}>
          {product.name}
        </h2>
        {product.tier && (
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", marginTop: 6, color: MUTED, fontWeight: 600 }}>
            {product.tier}
          </p>
        )}
      </motion.div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(212,139,0,0.16)" }} />

      {/* Details grid */}
      <motion.div
        className="grid grid-cols-2 gap-2.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {product.strength !== undefined && (
          <DetailChip icon={<Wind size={13} />} label="Strength" value={strengthLabel(product.strength)} />
        )}
        {product.category && (
          <DetailChip icon={<Flame size={13} />} label="Type" value={product.category} />
        )}
        {product.moodTags && product.moodTags.length > 0 && (
          <DetailChip icon={<Droplets size={13} />} label="Mood" value={product.moodTags[0] ?? ""} />
        )}
        {product.tier && (
          <DetailChip icon={<Wind size={13} />} label="Tier" value={product.tier} />
        )}
      </motion.div>

      {/* Flavor notes */}
      {product.flavorNotes && product.flavorNotes.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.22em", marginBottom: 8, color: MUTED, fontWeight: 700 }}>
            Tasting Notes
          </p>
          <div className="flex flex-wrap gap-2">
            {product.flavorNotes.slice(0, 6).map((note) => (
              <span key={note}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  textTransform: "capitalize",
                  background: "rgba(212,139,0,0.10)",
                  border: "1px solid rgba(212,139,0,0.28)",
                  color: "rgba(232,210,170,0.92)",
                  fontWeight: 500,
                }}>
                {note}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Why it works ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.55 }}
        style={{
          padding: "14px 14px 12px",
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(212,139,0,0.10), rgba(212,139,0,0.03))",
          border: "1px solid rgba(212,139,0,0.22)",
          boxShadow: "inset 0 1px 0 rgba(255,225,160,0.06)",
        }}
        data-testid="why-it-works"
      >
        <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
          <Sparkles size={13} style={{ color: GOLD }} />
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.24em", color: GOLD, fontWeight: 700 }}>
            Why it works
          </span>
        </div>
        <p style={{
          fontSize: 14, lineHeight: 1.55, color: "rgba(232,212,172,0.92)",
          letterSpacing: "0.01em", fontWeight: 400,
        }}>
          {whyItWorks(product, pairing)}
        </p>
      </motion.div>

      {/* Pairing tags */}
      {product.pairingTags && product.pairingTags.length > 0 && (
        <motion.p
          style={{ fontSize: 13, lineHeight: 1.5, fontStyle: "italic", color: "rgba(210,190,155,0.72)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          Pairs with: {product.pairingTags.slice(0, 3).join(", ")}
        </motion.p>
      )}

      {/* Pairing card */}
      {pairing && (
        <motion.div
          className="rounded-xl"
          style={{
            padding: 14,
            background: "rgba(255,245,220,0.04)",
            border: "1px solid rgba(212,139,0,0.18)",
          }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.24em", color: MUTED, fontWeight: 700, marginBottom: 10 }}>
            Perfect Pairing
          </p>
          <div className="flex items-start gap-3">
            <div className="rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ width: 36, height: 36, background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)" }}>
              <Droplets size={16} style={{ color: GOLD_DIM }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif leading-tight" style={{
                fontSize: 16, color: "rgba(230,210,170,0.94)", fontWeight: 400,
              }}>
                {pairing.name}
              </p>
              {pairing.flavorNotes && pairing.flavorNotes.length > 0 && (
                <p style={{ fontSize: 12, marginTop: 4, color: MUTED, lineHeight: 1.4 }}>
                  {pairing.flavorNotes.slice(0, 3).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(26,26,27,0.08)" }} />

      {/* Actions */}
      <motion.div className="space-y-2.5"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <motion.button
          onClick={onOrder}
          className="sc-btn-primary w-full flex items-center justify-center gap-2"
          style={{ fontSize: 14, padding: "12px 18px", fontWeight: 700, letterSpacing: "0.12em" }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 22px rgba(212,139,0,0.35)" }}
          whileTap={{ scale: 0.96 }}>
          <ShoppingBag size={16} />Order Now
        </motion.button>

        <motion.button
          onClick={onSave}
          disabled={experienceSaved}
          className="sc-btn-ghost w-full flex items-center justify-center gap-2"
          style={{ fontSize: 13, padding: "11px 18px", fontWeight: 600, letterSpacing: "0.12em" }}
          whileHover={!experienceSaved ? { borderColor: "rgba(212,139,0,0.5)", color: GOLD } : {}}
          whileTap={!experienceSaved ? { scale: 0.96 } : {}}>
          <Bookmark size={15} />
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
    <div className="rounded-lg"
      style={{
        padding: "10px 12px",
        background: "rgba(255,245,220,0.04)",
        border: "1px solid rgba(212,139,0,0.14)",
      }}>
      <div className="flex items-center gap-1.5" style={{ marginBottom: 5, color: "rgba(200,175,130,0.65)" }}>
        {icon}
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>{label}</span>
      </div>
      <p style={{
        fontSize: 16, fontWeight: 500, textTransform: "capitalize",
        color: "rgba(232,212,172,0.95)", letterSpacing: "0.01em",
      }}>
        {value}
      </p>
    </div>
  );
}
