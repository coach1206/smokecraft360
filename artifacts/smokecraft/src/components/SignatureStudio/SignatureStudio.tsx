/**
 * SignatureStudio — full-screen modal creative suite unlocked at score ≥ 7.0.
 *
 * Tabs:   Preview | Design | History
 * Crafts: smoke | brew | pour | vape
 *
 * Features:
 *  - Craft-specific editor pane per tab (Design)
 *  - Live preview per craft (Preview)
 *  - Version history showing 3 most recent saved drafts (History)
 *  - PNG export via html2canvas
 *  - Debounced autosave to /api/design-drafts
 *  - "Submit to Venue" → POST /api/design-drafts with submitted flag
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence }                   from "framer-motion";
import { X, Download, Save, Send, Clock, RotateCcw, Check, Sparkles } from "lucide-react";
import html2canvas                                   from "html2canvas";
import {
  fetchDesignDrafts,
  saveDesignDraft,
  type DesignDraft,
}                                                    from "@/services/api";

import {
  SmokeDesignPanel,
  type SmokeDesignState,
  DEFAULT_SMOKE_STATE,
}                                                    from "./SmokeDesignPanel";
import {
  BrewDesignPanel,
  BrewPreview,
  type BrewDesignState,
  DEFAULT_BREW_STATE,
}                                                    from "./BrewDesignPanel";
import {
  PourDesignPanel,
  PourPreview,
  type PourDesignState,
  DEFAULT_POUR_STATE,
}                                                    from "./PourDesignPanel";
import {
  VapeDesignPanel,
  VapePreview,
  type VapeDesignState,
  DEFAULT_VAPE_STATE,
}                                                    from "./VapeDesignPanel";

type CraftType  = "smoke" | "brew" | "pour" | "vape";
type StudioTab  = "preview" | "design" | "history";

const CRAFT_LABEL: Record<CraftType, string> = {
  smoke: "SmokeCraft",
  brew:  "BrewCraft",
  pour:  "PourCraft",
  vape:  "VapeCraft",
};

const CRAFT_HEADLINE: Record<CraftType, string> = {
  smoke: "Your Signature Blend",
  brew:  "Your Signature Brew",
  pour:  "Your Signature Pour",
  vape:  "Your Signature Line",
};

const GOLD     = "rgba(212,175,55,0.95)";
const GOLD_DIM = "rgba(212,175,55,0.55)";
const MUTED    = "rgba(180,155,100,0.42)";

export interface SignatureStudioProps {
  isOpen:           boolean;
  craft:            CraftType;
  score:            number;
  accentColor:      string;
  onClose:          () => void;
  /** Optional seed from the CraftFlow reveal */
  initialStyleId?:  string;
  initialMoodId?:   string;
  featuredName?:    string;
}

type AllDesignState = {
  smoke: SmokeDesignState;
  brew:  BrewDesignState;
  pour:  PourDesignState;
  vape:  VapeDesignState;
};

function buildInitialSmokeState(
  state: SmokeDesignState,
  featuredName?: string,
): SmokeDesignState {
  if (featuredName && !state.bandName) {
    return { ...state, bandName: featuredName.slice(0, 28) };
  }
  return state;
}

export default function SignatureStudio({
  isOpen,
  craft,
  score,
  accentColor,
  onClose,
  featuredName,
}: SignatureStudioProps) {
  const [activeTab,    setActiveTab]    = useState<StudioTab>("design");
  const [designState,  setDesignState]  = useState<AllDesignState>({
    smoke: buildInitialSmokeState(DEFAULT_SMOKE_STATE, featuredName),
    brew:  DEFAULT_BREW_STATE,
    pour:  DEFAULT_POUR_STATE,
    vape:  DEFAULT_VAPE_STATE,
  });
  const [drafts,       setDrafts]       = useState<DesignDraft[]>([]);
  const [loadingDrafts,setLoadingDrafts]= useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [draftName,    setDraftName]    = useState("");

  const previewRef     = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load drafts on mount
  useEffect(() => {
    if (!isOpen) return;
    setLoadingDrafts(true);
    fetchDesignDrafts(craft).then(d => {
      setDrafts(d);
      setLoadingDrafts(false);
    }).catch(() => setLoadingDrafts(false));
  }, [isOpen, craft]);

  // Reset submitted state when re-opened
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setSubmitError(null);
      setSaved(false);
      setExportDone(false);
      setActiveTab("design");
    }
  }, [isOpen]);

  // Seed band name from featured product on craft=smoke
  useEffect(() => {
    if (isOpen && craft === "smoke" && featuredName && !designState.smoke.bandName) {
      setDesignState(prev => ({
        ...prev,
        smoke: { ...prev.smoke, bandName: featuredName.slice(0, 28) },
      }));
    }
  }, [isOpen, craft, featuredName]);

  const currentDesign = designState[craft];

  const setCurrentDesign = useCallback((update: AllDesignState[CraftType]) => {
    setDesignState(prev => ({ ...prev, [craft]: update }));
    setSaved(false);
    // Debounced autosave
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void saveDesignDraft({
        craft,
        draftName: draftName || `${CRAFT_LABEL[craft]} Draft`,
        payload:   update as unknown as Record<string, unknown>,
      }).then(d => {
        if (d) setDrafts(prev => [d, ...prev.filter(x => x.id !== d.id)].slice(0, 3));
      });
    }, 1200);
  }, [craft, draftName]);

  // --- Save draft manually ---
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const d = await saveDesignDraft({
        craft,
        draftName: draftName || `${CRAFT_LABEL[craft]} Draft`,
        payload:   currentDesign as unknown as Record<string, unknown>,
      });
      if (d) {
        setDrafts(prev => [d, ...prev.filter(x => x.id !== d.id)].slice(0, 3));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }, [craft, draftName, currentDesign]);

  // --- Restore a draft ---
  const handleRestoreDraft = useCallback((draft: DesignDraft) => {
    const payload = draft.payload as unknown as AllDesignState[CraftType];
    setDesignState(prev => ({ ...prev, [craft]: payload }));
    if (draft.draftName) setDraftName(draft.draftName);
    setActiveTab("design");
  }, [craft]);

  // --- PNG export via html2canvas ---
  const handleExport = useCallback(async () => {
    if (!previewRef.current) {
      setActiveTab("preview");
      return;
    }
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: "#0a0806",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const url  = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const name = (
        craft === "smoke" ? (currentDesign as SmokeDesignState).bandName :
        craft === "brew"  ? (currentDesign as BrewDesignState).brandName :
        craft === "pour"  ? (currentDesign as PourDesignState).labelName :
        (currentDesign as VapeDesignState).flavorName
      ) || CRAFT_LABEL[craft];
      link.href     = url;
      link.download = `${name.replace(/\s+/g, "_")}_signature.png`;
      link.click();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    } catch {
      // silently fail — user still has the studio
    } finally {
      setExporting(false);
    }
  }, [craft, currentDesign]);

  // --- Submit to Venue ---
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const name = (
        craft === "smoke" ? (currentDesign as SmokeDesignState).bandName :
        craft === "brew"  ? (currentDesign as BrewDesignState).brandName :
        craft === "pour"  ? (currentDesign as PourDesignState).labelName :
        (currentDesign as VapeDesignState).flavorName
      ) || "Untitled";

      await saveDesignDraft({
        craft,
        draftName:    name,
        payload:      { ...(currentDesign as unknown as Record<string, unknown>), submitted: true, submittedAt: new Date().toISOString(), score },
        lockedFields: ["submitted"],
      });
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [craft, currentDesign, score]);

  const tabs: Array<{ id: StudioTab; label: string }> = [
    { id: "preview", label: "Preview" },
    { id: "design",  label: "Design"  },
    { id: "history", label: "History" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[280]"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-5 bottom-5 z-[290] max-w-2xl mx-auto flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(165deg, hsl(22 16% 8%), hsl(20 16% 5%))",
              border: "1px solid rgba(212,175,55,0.2)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.95), 0 0 80px rgba(212,175,55,0.06)",
            }}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold rule */}
            <div className="h-px w-full flex-shrink-0"
              style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }} />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles size={13} style={{ color: GOLD }} />
                  <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: GOLD_DIM }}>
                    {CRAFT_LABEL[craft]} · Signature Studio
                  </p>
                </div>
                <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.95)", fontWeight: 300 }}>
                  {CRAFT_HEADLINE[craft]}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Score badge */}
                <div className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.18em]"
                  style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.28)", color: GOLD_DIM }}>
                  Score {(score / 10).toFixed(1)}
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: MUTED }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex-shrink-0 flex gap-1 px-6 pb-3">
              {tabs.map(t => (
                <button key={t.id} onClick={() => {
                  if (t.id === "preview") {
                    setActiveTab("preview");
                  } else {
                    setActiveTab(t.id);
                  }
                }}
                  className="px-4 py-2 rounded-lg text-xs uppercase tracking-[0.2em] transition-all"
                  style={activeTab === t.id
                    ? { background: "rgba(212,175,55,0.13)", border: "1px solid rgba(212,175,55,0.4)", color: GOLD }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: MUTED }
                  }>
                  {t.label}
                </button>
              ))}

              {/* Draft name (inline) */}
              <input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                maxLength={40}
                placeholder="Draft name…"
                className="ml-auto bg-transparent outline-none text-xs py-1.5 px-2.5 rounded-lg border"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(210,190,155,0.7)", width: 130 }}
              />
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <AnimatePresence mode="wait">
                {activeTab === "preview" && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0   }}
                    exit={{ opacity: 0, x: 12    }}
                    transition={{ duration: 0.2 }}
                  >
                    <div ref={previewRef} data-export-preview>
                      {craft === "smoke" && (
                        <SmokeDesignPanel
                          state={currentDesign as SmokeDesignState}
                          onChange={s => setCurrentDesign(s)}
                          tab="preview"
                        />
                      )}
                      {craft === "brew" && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="p-8 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 300 }}>
                            <BrewPreview state={currentDesign as BrewDesignState} />
                          </div>
                          <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
                            Bottle Label Preview
                          </p>
                        </div>
                      )}
                      {craft === "pour" && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="p-8 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 300 }}>
                            <PourPreview state={currentDesign as PourDesignState} />
                          </div>
                          <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
                            Signature Drink Preview
                          </p>
                        </div>
                      )}
                      {craft === "vape" && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="p-8 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", minHeight: 300 }}>
                            <VapePreview state={currentDesign as VapeDesignState} />
                          </div>
                          <p className="text-[8px] uppercase tracking-[0.28em]" style={{ color: MUTED }}>
                            Device Preview
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "design" && (
                  <motion.div
                    key="design"
                    initial={{ opacity: 0, x: 12  }}
                    animate={{ opacity: 1, x: 0   }}
                    exit={{ opacity: 0, x: -12  }}
                    transition={{ duration: 0.2 }}
                  >
                    {craft === "smoke" && (
                      <SmokeDesignPanel
                        state={currentDesign as SmokeDesignState}
                        onChange={s => setCurrentDesign(s)}
                        tab="design"
                      />
                    )}
                    {craft === "brew" && (
                      <BrewDesignPanel
                        state={currentDesign as BrewDesignState}
                        onChange={s => setCurrentDesign(s)}
                        tab="design"
                      />
                    )}
                    {craft === "pour" && (
                      <PourDesignPanel
                        state={currentDesign as PourDesignState}
                        onChange={s => setCurrentDesign(s)}
                        tab="design"
                      />
                    )}
                    {craft === "vape" && (
                      <VapeDesignPanel
                        state={currentDesign as VapeDesignState}
                        onChange={s => setCurrentDesign(s)}
                        tab="design"
                      />
                    )}
                  </motion.div>
                )}

                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 12  }}
                    animate={{ opacity: 1, x: 0   }}
                    exit={{ opacity: 0, x: -12  }}
                    transition={{ duration: 0.2 }}
                    className="py-4 space-y-3"
                  >
                    <p className="text-[9px] uppercase tracking-[0.24em] mb-4" style={{ color: MUTED }}>
                      Recent Drafts — {CRAFT_LABEL[craft]}
                    </p>

                    {loadingDrafts ? (
                      <div className="flex justify-center py-8">
                        <motion.div className="w-5 h-5 rounded-full border-2"
                          style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.6)" }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                      </div>
                    ) : drafts.length === 0 ? (
                      <div className="py-8 text-center">
                        <Clock size={22} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.2)" }} />
                        <p className="text-xs" style={{ color: MUTED }}>
                          No saved drafts yet — design something and save it first.
                        </p>
                      </div>
                    ) : (
                      drafts.map((draft, i) => (
                        <motion.div
                          key={draft.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center justify-between gap-3 p-4 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-serif truncate" style={{ color: "rgba(220,200,165,0.85)" }}>
                              {draft.draftName || "Untitled Draft"}
                            </p>
                            <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>
                              {new Date(draft.updatedAt).toLocaleString()}
                              {Boolean(draft.payload["submitted"]) && (
                                <span className="ml-2 text-[8px] uppercase tracking-[0.15em]"
                                  style={{ color: "rgba(100,200,120,0.7)" }}>
                                  · Submitted
                                </span>
                              )}
                            </p>
                          </div>
                          <motion.button
                            onClick={() => handleRestoreDraft(draft)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-[0.16em]"
                            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)", color: GOLD_DIM }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <RotateCcw size={10} /> Restore
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="flex-shrink-0 border-t px-6 py-4 flex items-center gap-2.5"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>

              {/* Export PNG */}
              <motion.button
                onClick={() => {
                  if (activeTab !== "preview") {
                    setActiveTab("preview");
                    setTimeout(() => void handleExport(), 300);
                  } else {
                    void handleExport();
                  }
                }}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-[0.15em]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: exportDone ? "rgba(100,200,120,0.8)" : MUTED }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}>
                {exportDone ? <Check size={12} /> : <Download size={12} />}
                {exportDone ? "Saved" : "Export PNG"}
              </motion.button>

              {/* Save draft */}
              <motion.button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-[0.15em]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: saved ? "rgba(100,200,120,0.8)" : MUTED }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}>
                {saved ? <Check size={12} /> : <Save size={12} />}
                {saving ? "Saving…" : saved ? "Saved" : "Save Draft"}
              </motion.button>

              {/* Submit to Venue */}
              {!submitted ? (
                <motion.button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em] font-medium"
                  style={{
                    background: submitting
                      ? "rgba(212,175,55,0.08)"
                      : "linear-gradient(135deg, rgba(120,80,5,0.9), rgba(212,175,55,0.85))",
                    color: submitting ? GOLD_DIM : "#0a0806",
                    border: submitting ? "1px solid rgba(212,175,55,0.2)" : "none",
                    boxShadow: submitting ? "none" : "0 8px 24px rgba(212,175,55,0.3)",
                  }}
                  whileHover={!submitting ? { scale: 1.02 } : {}}
                  whileTap={!submitting ? { scale: 0.97 } : {}}>
                  <Send size={12} />
                  {submitting ? "Submitting…" : "Submit to Venue"}
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs uppercase tracking-[0.18em]"
                  style={{ background: "rgba(100,200,120,0.1)", border: "1px solid rgba(100,200,120,0.3)", color: "rgba(100,200,120,0.9)" }}>
                  <Check size={12} /> Your signature is pending venue review
                </motion.div>
              )}

              {submitError && (
                <p className="text-[9px] absolute bottom-16 left-6 right-6 text-center"
                  style={{ color: "rgba(239,68,68,0.75)" }}>
                  {submitError}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
