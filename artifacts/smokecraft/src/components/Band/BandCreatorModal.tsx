import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Lock, Share2, Check } from "lucide-react";
import { CigarBandPreview } from "./CigarBandPreview";
import { COLOR_OPTIONS, EMBLEM_OPTIONS, BLEND_STYLES, TEXT_STYLES } from "./bandConstants";
import type { BlendDesign, SavedBlend } from "../../services/storage";

interface BandCreatorModalProps {
  isOpen: boolean;
  isElite: boolean;
  cigarBaseName: string;
  pairingName: string;
  onClose: () => void;
  onSave: (blend: Omit<SavedBlend, "id" | "createdAt">) => void;
}

const DEFAULT_DESIGN: BlendDesign = {
  primaryColor: "gold",
  accentColor:  "gold",
  emblem:       "crown",
  textStyle:    "serif",
};

export function BandCreatorModal({
  isOpen, isElite, cigarBaseName, pairingName, onClose, onSave,
}: BandCreatorModalProps) {
  const [blendName, setBlendName]   = useState("");
  const [description, setDesc]      = useState("");
  const [style, setStyle]           = useState("bold");
  const [design, setDesign]         = useState<BlendDesign>(DEFAULT_DESIGN);
  const [saved, setSaved]           = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [copied, setCopied]         = useState(false);

  const availableColors  = COLOR_OPTIONS.filter((c) => isElite || !c.eliteOnly);
  const availableEmblems = EMBLEM_OPTIONS.filter((e) => isElite || !e.eliteOnly);
  const availableStyles  = BLEND_STYLES;
  const availableText    = TEXT_STYLES.filter((t) => isElite || !t.eliteOnly);

  const setDesignField = <K extends keyof BlendDesign>(key: K, value: BlendDesign[K]) =>
    setDesign((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    onSave({ blendName: blendName || "My Blend", description, style, design, cigarBaseName, pairingName });
    setSaved(true);
  };

  const handleShare = async () => {
    const text = `🌿 ${blendName || "My Blend"} — a ${style} experience, paired with ${pairingName}. Crafted on SmokeCraft.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
    setShareVisible(true);
  };

  const handleClose = () => {
    setSaved(false);
    setShareVisible(false);
    setBlendName("");
    setDesc("");
    setStyle("bold");
    setDesign(DEFAULT_DESIGN);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-6 bottom-6 z-[90] max-w-3xl mx-auto flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, hsl(24 18% 9%), hsl(22 18% 5%))",
              border: "1px solid rgba(212,175,55,0.2)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.9), 0 0 60px rgba(212,175,55,0.06)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* Gold top line */}
            <div className="h-px w-full flex-shrink-0" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 flex-shrink-0">
              <div>
                <h2 className="font-serif text-2xl" style={{ fontWeight: 300, color: "rgba(230,210,175,0.95)" }}>
                  Create My Blend
                </h2>
                <p className="text-[10px] uppercase tracking-[0.3em] mt-0.5" style={{ color: "rgba(212,175,55,0.45)" }}>
                  Design your cigar identity
                </p>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.5)" }}>
                <X size={15} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-7">

              {/* Live band preview */}
              <div className="flex flex-col items-center py-6 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                <CigarBandPreview design={design} blendName={blendName} style={style} size="md" />
                <p className="mt-4 text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(180,155,100,0.35)" }}>Live Preview</p>
              </div>

              {/* Blend name */}
              <div>
                <Label>Blend Name</Label>
                <input
                  className="w-full bg-transparent outline-none font-serif text-2xl py-2 border-b transition-colors"
                  style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(230,210,175,0.9)", caretColor: "rgba(212,175,55,0.8)" }}
                  placeholder="Name your blend…"
                  maxLength={28}
                  value={blendName}
                  onChange={(e) => setBlendName(e.target.value)}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(212,175,55,0.55)"; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(212,175,55,0.25)"; }}
                />
              </div>

              {/* Style */}
              <div>
                <Label>Style</Label>
                <div className="flex flex-wrap gap-2">
                  {availableStyles.map((s) => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      className="px-4 py-2 rounded-full text-sm font-serif tracking-wide transition-all duration-300"
                      style={style === s.id
                        ? { background: "rgba(212,175,55,0.16)", border: "1px solid rgba(212,175,55,0.5)", color: "rgba(212,175,55,0.95)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,155,100,0.6)" }
                      }
                    >{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Primary Color */}
              <div>
                <Label>Band Color</Label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_OPTIONS.map((c) => {
                    const locked = c.eliteOnly && !isElite;
                    const active = design.primaryColor === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => !locked && setDesignField("primaryColor", c.id)}
                        title={locked ? `${c.label} — Elite only` : c.label}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200"
                        style={{
                          background: active ? c.primary : "rgba(255,255,255,0.04)",
                          border: active ? `1px solid ${c.accent}` : "1px solid rgba(255,255,255,0.08)",
                          color: active ? c.text : locked ? "rgba(180,155,100,0.3)" : "rgba(180,155,100,0.65)",
                          opacity: locked ? 0.55 : 1,
                          cursor: locked ? "not-allowed" : "pointer",
                        }}
                      >
                        <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: c.accent }} />
                        {c.label}
                        {locked && <Lock size={9} className="ml-0.5" style={{ color: "rgba(212,175,55,0.4)" }} />}
                      </button>
                    );
                  })}
                </div>
                {!isElite && (
                  <p className="mt-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(212,175,55,0.35)" }}>
                    <Crown size={9} className="inline mr-1" />Obsidian, Platinum, Jade & Rose unlock at Elite
                  </p>
                )}
              </div>

              {/* Emblem */}
              <div>
                <Label>Emblem</Label>
                <div className="flex flex-wrap gap-2">
                  {EMBLEM_OPTIONS.map((em) => {
                    const locked = em.eliteOnly && !isElite;
                    const active = design.emblem === em.id;
                    return (
                      <button
                        key={em.id}
                        onClick={() => !locked && setDesignField("emblem", em.id)}
                        title={locked ? `${em.label} — Elite only` : em.label}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                        style={{
                          background: active ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.04)",
                          border: active ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.08)",
                          color: active ? "rgba(212,175,55,0.95)" : locked ? "rgba(180,155,100,0.3)" : "rgba(180,155,100,0.6)",
                          opacity: locked ? 0.55 : 1,
                          cursor: locked ? "not-allowed" : "pointer",
                        }}
                      >
                        {em.label}
                        {locked && <Lock size={9} style={{ color: "rgba(212,175,55,0.35)" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text style */}
              <div>
                <Label>Lettering</Label>
                <div className="flex gap-2">
                  {TEXT_STYLES.map((t) => {
                    const locked = t.eliteOnly && !isElite;
                    const active = design.textStyle === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => !locked && setDesignField("textStyle", t.id as BlendDesign["textStyle"])}
                        className="px-4 py-2 rounded text-sm transition-all duration-200 flex items-center gap-1.5"
                        style={{
                          background: active ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.04)",
                          border: active ? "1px solid rgba(212,175,55,0.45)" : "1px solid rgba(255,255,255,0.08)",
                          color: active ? "rgba(212,175,55,0.9)" : locked ? "rgba(180,155,100,0.3)" : "rgba(180,155,100,0.6)",
                          fontFamily: t.id === "sans" ? "'Inter'" : "'Cormorant Garamond', serif",
                          fontStyle: t.id === "italic" ? "italic" : "normal",
                          opacity: locked ? 0.55 : 1,
                          cursor: locked ? "not-allowed" : "pointer",
                        }}
                      >
                        {t.label}
                        {locked && <Lock size={9} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>
                  Description <span style={{ color: "rgba(180,155,100,0.35)", fontSize: "10px" }}>(optional)</span>
                </Label>
                <textarea
                  rows={2}
                  maxLength={120}
                  placeholder="Describe your signature blend…"
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-transparent outline-none resize-none text-sm py-2 px-0 border-b transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(210,190,155,0.8)", caretColor: "rgba(212,175,55,0.8)" }}
                />
              </div>

              {/* Based on */}
              <div className="flex gap-6 pb-2">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(180,155,100,0.4)" }}>Based On</p>
                  <p className="font-serif text-sm italic" style={{ color: "rgba(210,190,155,0.7)" }}>{cigarBaseName || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(180,155,100,0.4)" }}>Paired With</p>
                  <p className="font-serif text-sm italic" style={{ color: "rgba(210,190,155,0.7)" }}>{pairingName || "—"}</p>
                </div>
              </div>

              {/* Share card preview */}
              <AnimatePresence>
                {shareVisible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(212,175,55,0.2)", background: "rgba(0,0,0,0.3)" }}
                  >
                    <div className="p-5">
                      <p className="text-[9px] uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(212,175,55,0.45)" }}>Share Card</p>
                      <div className="flex justify-center mb-3">
                        <CigarBandPreview design={design} blendName={blendName} style={style} size="sm" />
                      </div>
                      <p className="text-xs text-center font-serif italic" style={{ color: "rgba(210,190,155,0.6)" }}>
                        {blendName || "My Blend"} · {style} · paired with {pairingName}
                      </p>
                      <p className="mt-3 text-center text-[9px] uppercase tracking-[0.2em]" style={{ color: copied ? "rgba(100,200,120,0.8)" : "rgba(180,155,100,0.35)" }}>
                        {copied ? "✓ Copied to clipboard" : "Text copied — paste to share"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 px-7 py-5 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Share */}
              <motion.button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-3 rounded text-xs uppercase tracking-[0.18em]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(180,155,100,0.55)" }}
                whileHover={{ borderColor: "rgba(212,175,55,0.35)", color: "rgba(212,175,55,0.75)" }}
                whileTap={{ scale: 0.97 }}
              >
                <Share2 size={13} />
                Share
              </motion.button>

              {/* Save */}
              <motion.button
                onClick={handleSave}
                disabled={saved}
                className="flex-1 flex items-center justify-center gap-2 py-3 font-serif text-base tracking-[0.18em] uppercase rounded transition-all duration-400"
                style={saved
                  ? { background: "rgba(100,200,120,0.12)", border: "1px solid rgba(100,200,120,0.3)", color: "rgba(100,200,120,0.8)" }
                  : { background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "hsl(22 18% 6%)", boxShadow: "0 0 30px rgba(212,175,55,0.1)" }
                }
                whileHover={!saved ? { boxShadow: "0 0 40px rgba(212,175,55,0.2)" } : {}}
                whileTap={!saved ? { scale: 0.99 } : {}}
              >
                <AnimatePresence mode="wait">
                  {saved ? (
                    <motion.span key="done" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Check size={15} />Saved to Vault · +15pts
                    </motion.span>
                  ) : (
                    <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Save Blend
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(180,155,100,0.5)" }}>
      {children}
    </p>
  );
}
