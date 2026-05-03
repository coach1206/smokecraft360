/**
 * NewProductForm — modal form that lets venue staff submit a new product.
 *
 * Flow:
 *   1. (optional) Upload image  → POST /api/upload     → Cloudinary URL
 *   2. Submit product fields    → POST /api/products   → InventoryItem
 *   3. Parent appends the row to the dashboard list, no full reload.
 *
 * Auth + validation live on the server; this form is just a lean UI surface.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Loader2, Check } from "lucide-react";
import {
  createProduct, uploadProductImage,
  type InventoryItem, type NewProductPayload,
} from "@/services/api";

const CATEGORIES: NewProductPayload["category"][] = [
  "cigar", "alcohol", "wine", "cocktail", "food", "coffee", "tea", "scent", "candle",
];
const TIERS: NonNullable<NewProductPayload["tier"]>[] = ["standard", "mid", "premium"];

const splitCsv = (s: string): string[] =>
  s.split(",").map((x) => x.trim()).filter((x) => x.length > 0);

interface Props {
  onClose:   () => void;
  onCreated: (item: InventoryItem) => void;
}

export function NewProductForm({ onClose, onCreated }: Props) {
  const [name,        setName]        = useState("");
  const [category,    setCategory]    = useState<NewProductPayload["category"]>("cigar");
  const [tier,        setTier]        = useState<NonNullable<NewProductPayload["tier"]>>("standard");
  const [strength,    setStrength]    = useState(3);
  const [flavorNotes, setFlavorNotes] = useState("");
  const [moodTags,    setMoodTags]    = useState("");
  const [pairingTags, setPairingTags] = useState("");
  const [file,        setFile]        = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim())                  { setError("Name is required"); return; }
    const flavors = splitCsv(flavorNotes);
    if (flavors.length === 0)          { setError("Add at least one flavor note"); return; }

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (file) imageUrl = await uploadProductImage(file);

      const payload: NewProductPayload = {
        name:        name.trim(),
        category,
        tier,
        strength,
        flavorNotes: flavors,
        moodTags:    splitCsv(moodTags),
        pairingTags: splitCsv(pairingTags),
        ...(imageUrl ? { imageUrl } : {}),
      };
      const created = await createProduct(payload);
      setDone(true);
      onCreated(created);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background:   "rgba(0,0,0,0.35)",
    border:       "1px solid rgba(212,175,55,0.18)",
    color:        "rgba(230,210,175,0.92)",
    padding:      "8px 12px",
    borderRadius: 6,
    width:        "100%",
    fontSize:     12,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 9, textTransform: "uppercase", letterSpacing: "0.18em",
    color: "rgba(180,155,100,0.55)", marginBottom: 4, display: "block",
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(22 18% 7%), hsl(22 18% 4%))",
          border:     "1px solid rgba(212,175,55,0.25)",
          maxHeight:  "92vh",
        }}
        initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
          <div>
            <h3 className="font-serif" style={{ color: "rgba(230,210,175,0.9)", fontSize: 16, fontWeight: 300 }}>
              New Product Submission
            </h3>
            <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5"
              style={{ color: "rgba(180,155,100,0.45)" }}>
              Venue inventory · Reviewed by admin
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
            style={{ color: "rgba(230,210,175,0.6)" }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 120px)" }}>

          <div>
            <label style={labelStyle}>Product name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Padron 1964 Anniversary"
              style={inputStyle} required disabled={submitting} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as NewProductPayload["category"])}
                style={inputStyle} disabled={submitting}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value as NonNullable<NewProductPayload["tier"]>)}
                style={inputStyle} disabled={submitting}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Strength · {strength} / 5</label>
            <input type="range" min={1} max={5} step={1}
              value={strength} onChange={(e) => setStrength(Number(e.target.value))}
              disabled={submitting}
              style={{ width: "100%", accentColor: "#d4af37" }} />
          </div>

          <div>
            <label style={labelStyle}>Flavor notes * <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(180,155,100,0.4)" }}>(comma-separated)</span></label>
            <input value={flavorNotes} onChange={(e) => setFlavorNotes(e.target.value)}
              placeholder="cocoa, leather, espresso"
              style={inputStyle} required disabled={submitting} />
          </div>

          <div>
            <label style={labelStyle}>Mood tags <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(180,155,100,0.4)" }}>(comma-separated)</span></label>
            <input value={moodTags} onChange={(e) => setMoodTags(e.target.value)}
              placeholder="celebration, late-night"
              style={inputStyle} disabled={submitting} />
          </div>

          <div>
            <label style={labelStyle}>Pairing tags <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(180,155,100,0.4)" }}>(comma-separated)</span></label>
            <input value={pairingTags} onChange={(e) => setPairingTags(e.target.value)}
              placeholder="bourbon, rye, dark-rum"
              style={inputStyle} disabled={submitting} />
          </div>

          <div>
            <label style={labelStyle}>Product photo <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(180,155,100,0.4)" }}>(optional · jpg/png/webp · ≤ 8 MB)</span></label>
            <label className="flex items-center gap-2 cursor-pointer transition-all"
              style={{ ...inputStyle, justifyContent: "flex-start" }}>
              <Upload size={13} style={{ color: "rgba(212,175,55,0.7)" }} />
              <span style={{ color: file ? "rgba(230,210,175,0.92)" : "rgba(180,155,100,0.5)" }}>
                {file ? file.name : "Choose image…"}
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden" disabled={submitting}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {error && (
            <div className="text-[11px] px-3 py-2 rounded"
              style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(180,155,100,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || done}
              className="flex-[2] px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all"
              style={{
                background: done ? "rgba(80,160,90,0.25)" : "rgba(212,175,55,0.18)",
                color:      done ? "rgba(180,255,190,0.95)" : "rgba(230,200,120,0.95)",
                border:     `1px solid ${done ? "rgba(80,160,90,0.5)" : "rgba(212,175,55,0.45)"}`,
                opacity:    submitting ? 0.7 : 1,
              }}>
              {submitting && <Loader2 size={12} className="animate-spin" />}
              {done && <Check size={12} />}
              {done ? "Submitted" : submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
