/**
 * SignatureCigarModal — 3-step Maestro del Fuego creation flow.
 *
 * Step 1: Band Design  — pick template, customise colors, emblem, font, brand name
 * Step 2: Cigar Spec   — strength, flavor, wrapper, optional pairing note
 * Step 3: Review       — full preview + submit / save draft
 *
 * Access: Maestro del Fuego only (60+ verified orders · 700+ XP).
 * Enforced on the backend; this modal also shows a gate screen for non-Maestro.
 */

import { useState, useCallback }              from "react";
import { motion, AnimatePresence }            from "framer-motion";
import {
  X, Crown, ChevronRight, ChevronLeft, Flame, Leaf,
  CheckCircle2, Lock, Send, FileEdit, AlertCircle,
} from "lucide-react";
import { CigarBandPreview }                   from "@/components/Band/CigarBandPreview";
import { COLOR_OPTIONS, EMBLEM_OPTIONS }      from "@/components/Band/bandConstants";
import {
  submitSignatureCigar, saveDraftSignatureCigar,
  type SignatureCigarPayload, type BoxDesignPayload,
}                                             from "@/services/api";
import type { BlendDesign }                   from "@/services/storage";

// ── Templates ─────────────────────────────────────────────────────────────────

export type BandTemplate = "classic-gold" | "modern-minimal" | "vintage-cuban" | "luxury-black";

interface Template {
  id:          BandTemplate;
  label:       string;
  description: string;
  design:      BlendDesign;
}

const TEMPLATES: Template[] = [
  {
    id: "classic-gold", label: "Classic Gold Label", description: "Timeless prestige, gilded borders",
    design: { primaryColor: "gold",     accentColor: "gold",     emblem: "crown",   textStyle: "serif"  },
  },
  {
    id: "modern-minimal", label: "Modern Minimal", description: "Clean lines, understated power",
    design: { primaryColor: "platinum", accentColor: "platinum", emblem: "star",    textStyle: "sans"   },
  },
  {
    id: "vintage-cuban", label: "Vintage Cuban", description: "Heritage craft, romantic flair",
    design: { primaryColor: "burgundy", accentColor: "burgundy", emblem: "flame",   textStyle: "italic" },
  },
  {
    id: "luxury-black", label: "Luxury Black", description: "Obsidian authority, elite finish",
    design: { primaryColor: "obsidian", accentColor: "obsidian", emblem: "diamond", textStyle: "serif"  },
  },
];

// ── Cigar spec constants ───────────────────────────────────────────────────────

const STRENGTH_LABELS = ["Mild", "Medium-Mild", "Medium", "Medium-Full", "Full"];
type FlavorDir = "sweet" | "bold" | "spicy" | "creamy" | "earthy" | "floral";
const FLAVOR_DIRS: { id: FlavorDir; emoji: string; label: string }[] = [
  { id: "sweet",  emoji: "🍯", label: "Sweet"  },
  { id: "bold",   emoji: "", label: "Bold"   },
  { id: "spicy",  emoji: "🌶", label: "Spicy"  },
  { id: "creamy", emoji: "🥛", label: "Creamy" },
  { id: "earthy", emoji: "🌿", label: "Earthy" },
  { id: "floral", emoji: "🌸", label: "Floral" },
];
const WRAPPER_TYPES = [
  { id: "claro",           label: "Claro",           desc: "Light, mild",           color: "rgba(220,200,155,0.8)" },
  { id: "natural",         label: "Natural",          desc: "Balanced, classic",     color: "rgba(195,160,90,0.8)"  },
  { id: "colorado",        label: "Colorado",         desc: "Medium, rich",          color: "rgba(155,115,60,0.8)"  },
  { id: "colorado-maduro", label: "Colorado Maduro",  desc: "Full, complex",         color: "rgba(100,70,35,0.85)"  },
  { id: "maduro",          label: "Maduro",           desc: "Dark, sweet, powerful", color: "rgba(55,35,15,0.9)"    },
];

// ── Small helpers ──────────────────────────────────────────────────────────────

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.5)";

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-400"
          style={{ background: i < step ? GOLD : "rgba(255,255,255,0.1)" }} />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] uppercase tracking-[0.25em] mb-2.5" style={{ color: "rgba(107,94,78,0.50)" }}>
      {children}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SignatureCigarModalProps {
  isOpen:     boolean;
  isMaestro:  boolean;
  onClose:    () => void;
  onSaved?:   () => void;
}

export function SignatureCigarModal({
  isOpen, isMaestro, onClose, onSaved,
}: SignatureCigarModalProps) {
  const [step, setStep] = useState(1);

  // Band design state
  const [template,    setTemplate]    = useState<BandTemplate>("classic-gold");
  const [brandName,   setBrandName]   = useState("");
  const [design,      setDesign]      = useState<BlendDesign>(TEMPLATES[0]!.design);
  const [nameError,   setNameError]   = useState<string | null>(null);

  // Cigar spec state
  const [strength,        setStrength]        = useState(3);
  const [flavorDirs,      setFlavorDirs]       = useState<FlavorDir[]>([]);
  const [wrapperType,     setWrapperType]      = useState("natural");
  const [preferredPairing, setPreferredPairing] = useState("");
  const [description,     setDescription]      = useState("");

  // Box design state
  const [boxColor,           setBoxColor]           = useState("#1a1008");
  const [logoPlacement,      setLogoPlacement]      = useState<BoxDesignPayload["logoPlacement"]>("top-center");
  const [labelText,          setLabelText]          = useState("");
  const [limitedEditionName, setLimitedEditionName] = useState("");
  const [finishStyle,        setFinishStyle]        = useState<BoxDesignPayload["finishStyle"]>("matte");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectTemplate = (t: Template) => {
    setTemplate(t.id);
    setDesign({ ...t.design });
  };

  const toggleFlavor = (f: FlavorDir) => {
    setFlavorDirs((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  };

  const validateStep1 = (): boolean => {
    const trimmed = brandName.trim();
    if (trimmed.length < 2)  { setNameError("Brand name must be at least 2 characters"); return false; }
    if (trimmed.length > 28) { setNameError("Brand name must be at most 28 characters"); return false; }
    setNameError(null);
    return true;
  };

  const validateStep2 = (): boolean => flavorDirs.length > 0;

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const boxDesignPayload = (): BoxDesignPayload | undefined => {
    if (!labelText.trim() && !limitedEditionName.trim()) return undefined;
    return {
      boxColor,
      logoPlacement,
      labelText:          labelText.trim(),
      limitedEditionName: limitedEditionName.trim(),
      finishStyle,
    };
  };

  const buildPayload = (status: "draft" | "submitted"): SignatureCigarPayload => ({
    brandName: brandName.trim(),
    bandDesign: {
      template,
      primaryColor: design.primaryColor,
      accentColor:  design.accentColor,
      fontStyle:    design.textStyle,
      emblem:       design.emblem,
      brandName:    brandName.trim(),
    },
    cigarSpec: {
      strength,
      flavorDirection:  flavorDirs,
      wrapperType:      wrapperType as never,
      preferredPairing: preferredPairing.trim() || undefined,
    },
    boxDesign:   boxDesignPayload(),
    description: description.trim() || undefined,
    status,
  });

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitSignatureCigar(buildPayload("submitted"));
      setSubmitted(true);
      onSaved?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [brandName, design, template, strength, flavorDirs, wrapperType, preferredPairing, description]);

  const handleSaveDraft = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveDraftSignatureCigar(buildPayload("draft"));
      setSubmitted(true);
      onSaved?.();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }, [brandName, design, template, strength, flavorDirs, wrapperType, preferredPairing, description]);

  const handleClose = () => {
    setStep(1); setTemplate("classic-gold"); setBrandName(""); setDesign(TEMPLATES[0]!.design);
    setNameError(null); setStrength(3); setFlavorDirs([]); setWrapperType("natural");
    setPreferredPairing(""); setDescription("");
    setBoxColor("#1a1008"); setLogoPlacement("top-center"); setLabelText("");
    setLimitedEditionName(""); setFinishStyle("matte");
    setSubmitting(false); setSubmitted(false); setSubmitError(null);
    onClose();
  };

  const currentDesignWithBrand: BlendDesign = {
    ...design,
    emblem: design.emblem,
    textStyle: design.textStyle,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80]"
            style={{ background: "rgba(26,26,27,0.42)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-4 bottom-4 z-[90] max-w-2xl mx-auto flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, hsl(24 18% 9%), hsl(22 18% 5%))",
              border: "1px solid rgba(212,139,0,0.22)",
              boxShadow: "0 30px 80px rgba(26,26,27,0.55), 0 0 80px rgba(212,139,0,0.07)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold line */}
            <div className="h-px flex-shrink-0" style={{ background: "linear-gradient(90deg, transparent, rgba(212,139,0,0.6), transparent)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown size={12} style={{ color: GOLD }} fill="rgba(212,139,0,0.25)" />
                  <span className="text-[8px] uppercase tracking-[0.3em]" style={{ color: GOLD_DIM }}>Maestro del Fuego</span>
                </div>
                <h2 className="font-serif text-xl" style={{ fontWeight: 300, color: "rgba(230,210,175,0.95)" }}>
                  Create Your Signature Cigar
                </h2>
              </div>
              <button onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.50)" }}>
                <X size={14} />
              </button>
            </div>

            {/* Not Maestro gate */}
            {!isMaestro && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-4">
                <Lock size={32} style={{ color: "rgba(212,139,0,0.25)" }} />
                <div className="text-center max-w-xs">
                  <p className="font-serif text-lg mb-2" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
                    Maestro del Fuego Required
                  </p>
                  <p className="text-sm" style={{ color: "rgba(107,94,78,0.50)" }}>
                    This tool unlocks at the highest tier. Reach 60+ verified experiences and 700+ XP to create your signature cigar.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <Stat label="Required XP"     value="700+"  />
                    <div className="w-px h-8" style={{ background: "rgba(212,139,0,0.1)" }} />
                    <Stat label="Verified Orders"  value="60+"   />
                  </div>
                </div>
              </div>
            )}

            {/* Success state */}
            {isMaestro && submitted && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-5">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <CheckCircle2 size={40} style={{ color: "rgba(52,200,120,0.8)" }} />
                </motion.div>
                <div className="text-center">
                  <p className="font-serif text-xl mb-1" style={{ color: "rgba(220,200,165,0.9)", fontWeight: 300 }}>
                    Design Received
                  </p>
                  <p className="text-sm" style={{ color: "rgba(107,94,78,0.50)" }}>
                    Your signature cigar concept has been submitted for review. Our team will be in touch.
                  </p>
                </div>
                <div className="mt-2">
                  <CigarBandPreview design={currentDesignWithBrand} blendName={brandName || "MY BLEND"} style="bold" size="md" />
                </div>
                <button onClick={handleClose}
                  className="px-6 py-2.5 rounded-lg text-xs uppercase tracking-[0.2em]"
                  style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.25)", color: GOLD_DIM }}>
                  Close
                </button>
              </div>
            )}

            {/* Main flow */}
            {isMaestro && !submitted && (
              <>
                {/* Step indicator */}
                <div className="px-6 pb-3 flex-shrink-0">
                  <StepIndicator step={step} total={4} />
                  <p className="text-[8px] uppercase tracking-[0.2em] mt-1.5" style={{ color: "rgba(107,94,78,0.35)" }}>
                    Step {step} of 4 — {step === 1 ? "Band Design" : step === 2 ? "Cigar Spec" : step === 3 ? "Box Design" : "Review & Submit"}
                  </p>
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  <AnimatePresence mode="wait">

                    {/* ── Step 1: Band Design ─────────────────────────────── */}
                    {step === 1 && (
                      <motion.div key="step1" className="space-y-5"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                        {/* Live preview */}
                        <div className="flex flex-col items-center py-5 rounded-xl"
                          style={{ background: "rgba(26,26,27,0.08)" }}>
                          <CigarBandPreview design={currentDesignWithBrand} blendName={brandName || "YOUR BRAND"} style="bold" size="md" />
                          <p className="mt-3 text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(107,94,78,0.35)" }}>Live Preview</p>
                        </div>

                        {/* Brand name */}
                        <div>
                          <SectionLabel>Brand Name</SectionLabel>
                          <input
                            className="w-full bg-transparent outline-none font-serif text-xl py-2 border-b transition-colors"
                            style={{ borderColor: nameError ? "rgba(239,68,68,0.4)" : "rgba(212,139,0,0.25)", color: "rgba(230,210,175,0.9)", caretColor: GOLD }}
                            placeholder="Name your cigar brand…"
                            maxLength={28}
                            value={brandName}
                            onChange={(e) => { setBrandName(e.target.value); setNameError(null); }}
                          />
                          {nameError && <p className="text-[9px] mt-1 text-red-400">{nameError}</p>}
                          <p className="text-[8px] mt-1" style={{ color: "rgba(107,94,78,0.30)" }}>{brandName.trim().length}/28 characters</p>
                        </div>

                        {/* Templates */}
                        <div>
                          <SectionLabel>Band Template</SectionLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map((t) => (
                              <button key={t.id} onClick={() => selectTemplate(t)}
                                className="p-3 rounded-xl text-left transition-all duration-200"
                                style={template === t.id
                                  ? { background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.38)" }
                                  : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)" }
                                }>
                                <p className="text-xs font-serif" style={{ color: template === t.id ? "rgba(230,210,175,0.9)" : "rgba(200,180,140,0.65)" }}>
                                  {t.label}
                                </p>
                                <p className="text-[8px] mt-0.5" style={{ color: "rgba(107,94,78,0.38)" }}>{t.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color customisation */}
                        <div>
                          <SectionLabel>Band Color</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((c) => (
                              <button key={c.id} onClick={() => setDesign((d) => ({ ...d, primaryColor: c.id, accentColor: c.id }))}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                                style={design.primaryColor === c.id
                                  ? { background: c.primary, border: `1px solid ${c.accent}`, color: c.text }
                                  : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.62)" }
                                }>
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.accent }} />
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emblem */}
                        <div>
                          <SectionLabel>Emblem</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {EMBLEM_OPTIONS.map((em) => (
                              <button key={em.id} onClick={() => setDesign((d) => ({ ...d, emblem: em.id }))}
                                className="px-3 py-2 rounded-lg text-xs transition-all"
                                style={design.emblem === em.id
                                  ? { background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.45)", color: "rgba(212,139,0,0.9)" }
                                  : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.58)" }
                                }>
                                {em.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font style */}
                        <div>
                          <SectionLabel>Lettering Style</SectionLabel>
                          <div className="flex gap-2">
                            {(["serif", "sans", "italic"] as const).map((fs) => (
                              <button key={fs} onClick={() => setDesign((d) => ({ ...d, textStyle: fs }))}
                                className="px-4 py-2 rounded text-sm transition-all flex-1"
                                style={{
                                  background: design.textStyle === fs ? "rgba(212,139,0,0.14)" : "rgba(26,26,27,0.06)",
                                  border: design.textStyle === fs ? "1px solid rgba(212,139,0,0.45)" : "1px solid rgba(26,26,27,0.10)",
                                  color: design.textStyle === fs ? "rgba(212,139,0,0.9)" : "rgba(107,94,78,0.58)",
                                  fontFamily: fs === "sans" ? "Inter" : "Cormorant Garamond, serif",
                                  fontStyle: fs === "italic" ? "italic" : "normal",
                                }}>
                                {fs.charAt(0).toUpperCase() + fs.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 2: Cigar Spec ──────────────────────────────── */}
                    {step === 2 && (
                      <motion.div key="step2" className="space-y-6"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                        {/* Strength */}
                        <div>
                          <SectionLabel>Strength</SectionLabel>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[9px]" style={{ color: "rgba(107,94,78,0.40)" }}>
                              <span>Mild</span><span>Full</span>
                            </div>
                            <input type="range" min={1} max={5} value={strength} onChange={(e) => setStrength(Number(e.target.value))}
                              className="w-full accent-yellow-500 cursor-pointer" />
                            <p className="text-center text-xs font-serif" style={{ color: GOLD_DIM }}>
                              {STRENGTH_LABELS[strength - 1]}
                            </p>
                          </div>
                        </div>

                        {/* Flavor direction */}
                        <div>
                          <SectionLabel>Flavor Direction (select at least one)</SectionLabel>
                          <div className="flex flex-wrap gap-2">
                            {FLAVOR_DIRS.map((f) => {
                              const active = flavorDirs.includes(f.id);
                              return (
                                <button key={f.id} onClick={() => toggleFlavor(f.id)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs transition-all"
                                  style={active
                                    ? { background: "rgba(212,139,0,0.14)", border: "1px solid rgba(212,139,0,0.4)", color: "rgba(212,139,0,0.9)" }
                                    : { background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.62)" }
                                  }>
                                  <span>{f.emoji}</span>{f.label}
                                </button>
                              );
                            })}
                          </div>
                          {flavorDirs.length === 0 && (
                            <p className="text-[9px] mt-1.5 text-amber-500/60">Please select at least one flavor direction</p>
                          )}
                        </div>

                        {/* Wrapper */}
                        <div>
                          <SectionLabel>Wrapper Type</SectionLabel>
                          <div className="space-y-2">
                            {WRAPPER_TYPES.map((w) => (
                              <button key={w.id} onClick={() => setWrapperType(w.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                                style={wrapperType === w.id
                                  ? { background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.3)" }
                                  : { background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }
                                }>
                                <div className="w-5 h-5 rounded-full flex-shrink-0 border border-white/10"
                                  style={{ background: w.color }} />
                                <div>
                                  <p className="text-xs" style={{ color: wrapperType === w.id ? "rgba(230,210,175,0.9)" : "rgba(200,180,140,0.65)" }}>
                                    {w.label}
                                  </p>
                                  <p className="text-[8px]" style={{ color: "rgba(107,94,78,0.38)" }}>{w.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Preferred pairing */}
                        <div>
                          <SectionLabel>Preferred Pairing <span style={{ opacity: 0.5 }}>(optional)</span></SectionLabel>
                          <input
                            className="w-full bg-transparent outline-none text-sm py-2 border-b transition-colors"
                            style={{ borderColor: "rgba(212,139,0,0.2)", color: "rgba(210,190,155,0.8)", caretColor: GOLD }}
                            placeholder="e.g. Macallan 12, Espresso…"
                            maxLength={80}
                            value={preferredPairing}
                            onChange={(e) => setPreferredPairing(e.target.value)}
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <SectionLabel>Vision <span style={{ opacity: 0.5 }}>(optional)</span></SectionLabel>
                          <textarea rows={2} maxLength={300} placeholder="Describe the story behind your cigar…"
                            value={description} onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-transparent outline-none resize-none text-sm py-2 px-0 border-b"
                            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(210,190,155,0.8)", caretColor: GOLD }} />
                          <p className="text-[8px] mt-1" style={{ color: "rgba(107,94,78,0.30)" }}>{description.length}/300</p>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step 3: Box Design ──────────────────────────────── */}
                    {step === 3 && (
                      <motion.div key="step3-box" className="space-y-6"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                        <p className="text-xs" style={{ color: "rgba(107,94,78,0.50)" }}>
                          Design the outer box for your limited edition run. All fields are optional — skip to go straight to review.
                        </p>

                        {/* Box colour */}
                        <div>
                          <SectionLabel>Box Color</SectionLabel>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={boxColor}
                              onChange={(e) => setBoxColor(e.target.value)}
                              className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                              style={{ outlineOffset: 2, outline: "1px solid rgba(212,139,0,0.3)" }}
                            />
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {["#1a1008","#0a0a14","#EFEBE0","#1c1408","#0c0c0c","#1a0808"].map((c) => (
                                <button key={c} onClick={() => setBoxColor(c)}
                                  className="w-7 h-7 rounded-lg border-2 transition-all"
                                  style={{ background: c, borderColor: boxColor === c ? "rgba(212,139,0,0.7)" : "rgba(255,255,255,0.1)" }} />
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded" style={{ background: boxColor, border: "1px solid rgba(26,26,27,0.17)" }} />
                            <p className="text-[9px] font-mono" style={{ color: "rgba(107,94,78,0.50)" }}>{boxColor}</p>
                          </div>
                        </div>

                        {/* Logo placement */}
                        <div>
                          <SectionLabel>Logo Placement</SectionLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {(["top-center","top-left","side-panel"] as const).map((lp) => (
                              <button key={lp} onClick={() => setLogoPlacement(lp)}
                                className="px-3 py-2.5 rounded-lg text-[9px] uppercase tracking-wider transition-all"
                                style={logoPlacement === lp
                                  ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.38)", color: "rgba(212,139,0,0.9)" }
                                  : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.50)" }
                                }>
                                {lp.replace(/-/g, " ")}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Finish style */}
                        <div>
                          <SectionLabel>Finish Style</SectionLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {(["matte","gloss","embossed"] as const).map((fs) => (
                              <button key={fs} onClick={() => setFinishStyle(fs)}
                                className="px-3 py-2.5 rounded-lg text-xs capitalize transition-all"
                                style={finishStyle === fs
                                  ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.38)", color: "rgba(212,139,0,0.9)" }
                                  : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.50)" }
                                }>
                                {fs}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Label text */}
                        <div>
                          <SectionLabel>Label Text <span style={{ opacity: 0.5 }}>(optional)</span></SectionLabel>
                          <input
                            className="w-full bg-transparent outline-none text-sm py-2 border-b transition-colors"
                            style={{ borderColor: "rgba(212,139,0,0.2)", color: "rgba(210,190,155,0.8)", caretColor: GOLD }}
                            placeholder="e.g. Reserve · Aged 5 Years…"
                            maxLength={60}
                            value={labelText}
                            onChange={(e) => setLabelText(e.target.value)}
                          />
                        </div>

                        {/* Limited edition name */}
                        <div>
                          <SectionLabel>Limited Edition Name <span style={{ opacity: 0.5 }}>(optional)</span></SectionLabel>
                          <input
                            className="w-full bg-transparent outline-none text-sm py-2 border-b transition-colors"
                            style={{ borderColor: "rgba(212,139,0,0.2)", color: "rgba(210,190,155,0.8)", caretColor: GOLD }}
                            placeholder="e.g. Reserve No. 1 · Grand Cru…"
                            maxLength={50}
                            value={limitedEditionName}
                            onChange={(e) => setLimitedEditionName(e.target.value)}
                          />
                          <p className="text-[8px] mt-1" style={{ color: "rgba(107,94,78,0.30)" }}>
                            This name will appear on the box lid and production label.
                          </p>
                        </div>

                      </motion.div>
                    )}

                    {/* ── Step 4: Review & Submit ─────────────────────────── */}
                    {step === 4 && (
                      <motion.div key="step3" className="space-y-5"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                        {/* Band preview */}
                        <div className="flex flex-col items-center py-6 rounded-xl" style={{ background: "rgba(26,26,27,0.08)" }}>
                          <CigarBandPreview design={currentDesignWithBrand} blendName={brandName || "MY BRAND"} style="bold" size="lg" />
                          <p className="mt-3 font-serif text-sm" style={{ color: "rgba(220,200,165,0.7)", fontWeight: 300 }}>
                            {brandName.trim() || "Your Brand"}
                          </p>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Template",   value: TEMPLATES.find((t) => t.id === template)?.label ?? template },
                            { label: "Strength",   value: STRENGTH_LABELS[strength - 1] ?? "" },
                            { label: "Wrapper",    value: WRAPPER_TYPES.find((w) => w.id === wrapperType)?.label ?? wrapperType },
                            { label: "Flavors",    value: flavorDirs.map((f) => FLAVOR_DIRS.find((d) => d.id === f)?.label).join(", ") },
                          ].map(({ label, value }) => (
                            <div key={label} className="p-3 rounded-xl"
                              style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                              <p className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(107,94,78,0.40)" }}>{label}</p>
                              <p className="text-xs mt-1 font-serif" style={{ color: "rgba(210,190,155,0.8)" }}>{value || "—"}</p>
                            </div>
                          ))}
                        </div>

                        {preferredPairing && (
                          <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(212,139,0,0.03)", border: "1px solid rgba(212,139,0,0.1)" }}>
                            <p className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(107,94,78,0.40)" }}>Preferred Pairing</p>
                            <p className="text-xs mt-1 font-serif italic" style={{ color: "rgba(210,190,155,0.7)" }}>{preferredPairing}</p>
                          </div>
                        )}

                        {description && (
                          <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                            <p className="text-[8px] uppercase tracking-[0.18em]" style={{ color: "rgba(107,94,78,0.40)" }}>Vision</p>
                            <p className="text-xs mt-1 italic" style={{ color: "rgba(200,180,145,0.6)" }}>{description}</p>
                          </div>
                        )}

                        {submitError && (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <AlertCircle size={12} style={{ color: "rgba(239,68,68,0.8)" }} />
                            <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>{submitError}</p>
                          </div>
                        )}

                        {/* Note */}
                        <div className="rounded-xl px-4 py-3" style={{ background: "rgba(212,139,0,0.03)", border: "1px dashed rgba(212,139,0,0.12)" }}>
                          <p className="text-[8px]" style={{ color: "rgba(107,94,78,0.38)" }}>
                            Submitting sends your concept for admin review. Our team will contact you about manufacturer assignment and production options.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer navigation */}
                <div className="flex-shrink-0 px-6 py-4 flex items-center gap-3"
                  style={{ borderTop: "1px solid rgba(26,26,27,0.08)" }}>

                  {step > 1 && (
                    <motion.button onClick={() => setStep((s) => s - 1)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em]"
                      style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.11)", color: "rgba(107,94,78,0.52)" }}
                      whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.97 }}>
                      <ChevronLeft size={12} />Back
                    </motion.button>
                  )}

                  <div className="flex-1" />

                  {step < 4 && (
                    <motion.button onClick={handleNext}
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em]"
                      style={{ background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "#F5F2ED" }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      {step === 3 ? "Review" : "Next"}<ChevronRight size={12} />
                    </motion.button>
                  )}

                  {step === 4 && (
                    <>
                      <motion.button onClick={handleSaveDraft} disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em]"
                        style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.11)", color: "rgba(107,94,78,0.52)", opacity: submitting ? 0.6 : 1 }}
                        whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.97 }}>
                        <FileEdit size={11} />Save Draft
                      </motion.button>

                      <motion.button onClick={handleSubmit} disabled={submitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs uppercase tracking-[0.15em] font-medium"
                        style={{
                          background: submitting ? "rgba(212,139,0,0.1)" : "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))",
                          color: submitting ? GOLD_DIM : "#F5F2ED",
                          opacity: submitting ? 0.7 : 1,
                        }}
                        whileHover={!submitting ? { scale: 1.02 } : {}}
                        whileTap={!submitting ? { scale: 0.97 } : {}}>
                        <Send size={11} />
                        {submitting ? "Submitting…" : "Submit Concept"}
                      </motion.button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-lg" style={{ color: "rgba(212,139,0,0.7)", fontWeight: 300 }}>{value}</p>
      <p className="text-[8px] uppercase tracking-[0.15em]" style={{ color: "rgba(107,94,78,0.38)" }}>{label}</p>
    </div>
  );
}
