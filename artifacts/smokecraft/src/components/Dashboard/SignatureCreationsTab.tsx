/**
 * SignatureCreationsTab — user-facing view of their own Signature Cigar requests.
 *
 * Shows:
 *  1. Status card for each submission (draft → submitted → review → approved → production)
 *  2. Band design preview per request
 *  3. Box design summary (if provided)
 *  4. Production stage progress bar
 *  5. Admin notes / rejected reason
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Crown, RefreshCw, Package, Clock, CheckCircle2,
  AlertCircle, Flame, ChevronDown, ChevronUp, Box,
} from "lucide-react";
import { fetchMySignatureRequests, fetchProgression, type SignatureRequestItem } from "@/services/api";
import { CigarBandPreview }       from "@/components/Band/CigarBandPreview";
import { SignatureCigarModal }    from "@/components/SignatureCigar/SignatureCigarModal";
import type { BlendDesign }       from "@/services/storage";

const GOLD     = "rgba(212,139,0,1)";
const GOLD_DIM = "rgba(212,139,0,0.55)";
const MUTED    = "rgba(180,155,100,0.4)";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_ORDER = ["draft", "submitted", "review", "approved", "production"] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:      { label: "Draft",       color: MUTED,                         icon: <Flame size={11} />        },
  submitted:  { label: "Submitted",   color: "rgba(180,155,100,0.75)",       icon: <Clock size={11} />        },
  review:     { label: "In Review",   color: GOLD_DIM,                      icon: <Clock size={11} />        },
  approved:   { label: "Approved",    color: "rgba(100,200,120,0.75)",       icon: <CheckCircle2 size={11} /> },
  production: { label: "Production",  color: "rgba(212,139,0,0.9)",         icon: <Package size={11} />      },
  rejected:   { label: "Rejected",    color: "rgba(200,80,80,0.6)",          icon: <AlertCircle size={11} />  },
};

const PRODUCTION_STAGES: Record<string, { label: string; pct: number }> = {
  "sample-batch":     { label: "Sample Batch",     pct: 33 },
  "limited-edition":  { label: "Limited Edition",  pct: 66 },
  "full-production":  { label: "Full Production",  pct: 100 },
};

const WRAPPER_LABELS: Record<string, string> = {
  "claro":           "Claro (Light)",
  "natural":         "Natural",
  "colorado":        "Colorado",
  "colorado-maduro": "Colorado Maduro",
  "maduro":          "Maduro (Dark)",
};

const LOGO_PLACEMENT_LABELS: Record<string, string> = {
  "top-center": "Top Center",
  "top-left":   "Top Left",
  "side-panel": "Side Panel",
};

// ── Band design → BlendDesign adapter ─────────────────────────────────────────

function bandToBlend(band: {
  primaryColor?: string; accentColor?: string;
  emblem?: string; fontStyle?: string;
}): BlendDesign {
  const colorMap: Record<string, string> = {
    gold: "gold", platinum: "platinum", burgundy: "burgundy", obsidian: "obsidian",
  };
  return {
    primaryColor: colorMap[band.primaryColor ?? ""] ?? "gold",
    accentColor:  colorMap[band.accentColor  ?? ""] ?? "gold",
    emblem:       band.emblem     ?? "crown",
    textStyle:    (band.fontStyle === "sans" ? "sans" : band.fontStyle === "italic" ? "italic" : "serif") as "serif" | "sans" | "italic",
  };
}

// ── Status progress bar ────────────────────────────────────────────────────────

function StatusProgress({ status }: { status: string }) {
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-2 py-2">
        <AlertCircle size={13} style={{ color: "rgba(200,80,80,0.65)" }} />
        <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,80,80,0.65)" }}>
          Request rejected
        </span>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const done    = i <= currentIdx;
          const current = i === currentIdx;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-2 h-2 rounded-full transition-colors"
                  style={{ background: done ? (current ? GOLD : "rgba(212,139,0,0.6)") : "rgba(255,255,255,0.1)" }} />
                <p className="text-[6px] uppercase tracking-wide text-center leading-tight hidden sm:block"
                  style={{ color: done ? (current ? GOLD_DIM : MUTED) : "rgba(26,26,27,0.17)" }}>
                  {s}
                </p>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div className="flex-1 h-px"
                  style={{ background: i < currentIdx ? "rgba(212,139,0,0.5)" : "rgba(26,26,27,0.10)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Request card ───────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: SignatureRequestItem }) {
  const [expanded, setExpanded] = useState(false);

  const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["submitted"]!;
  type ParsedBox = { boxColor?: string; logoPlacement?: string; labelText?: string; limitedEditionName?: string; finishStyle?: string };

  let band: ReturnType<typeof bandToBlend> = { primaryColor: "gold", accentColor: "gold", emblem: "crown", textStyle: "serif" };
  let spec: { strength?: number; flavorDirection?: string[]; wrapperType?: string } = {};
  let boxDesign: ParsedBox | null = null;

  try { band = bandToBlend(JSON.parse(req.bandDesign)); } catch { /* ignore */ }
  try { spec = JSON.parse(req.cigarSpec) as typeof spec; } catch { /* ignore */ }
  try { boxDesign = req.boxDesign ? (JSON.parse(req.boxDesign) as ParsedBox) : null; } catch { /* ignore */ }

  const productionStage = req.productionStage ? PRODUCTION_STAGES[req.productionStage] : null;

  return (
    <motion.div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Band preview */}
          <div className="flex-shrink-0 scale-75 origin-top-left -mb-2">
            <CigarBandPreview design={band} blendName={req.brandName} style="bold" size="sm" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h3 className="font-serif text-lg leading-tight" style={{ color: "rgba(220,200,165,0.9)", fontWeight: 300 }}>
                {req.brandName}
              </h3>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] uppercase tracking-wider flex-shrink-0"
                style={{ color: statusCfg.color, background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}30` }}>
                {statusCfg.icon}
                {statusCfg.label}
              </span>
            </div>

            {req.description && (
              <p className="text-xs mb-2 leading-snug" style={{ color: MUTED }}>{req.description}</p>
            )}

            <StatusProgress status={req.status} />

            {/* Production progress */}
            {productionStage && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[7px]" style={{ color: MUTED }}>
                  <span>Production stage: <span style={{ color: GOLD_DIM }}>{productionStage.label}</span></span>
                  <span>{productionStage.pct}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(26,26,27,0.09)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${productionStage.pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ background: "linear-gradient(90deg, rgba(160,110,10,0.8), rgba(212,139,0,0.9))" }} />
                </div>
              </div>
            )}

            {/* Admin notes */}
            {req.adminNotes && (
              <div className="mt-3 p-2.5 rounded-lg"
                style={{ background: "rgba(212,139,0,0.04)", border: "1px solid rgba(212,139,0,0.12)" }}>
                <p className="text-[7px] uppercase tracking-wider mb-1" style={{ color: GOLD_DIM }}>Admin Notes</p>
                <p className="text-[9px]" style={{ color: "rgba(200,180,145,0.7)" }}>{req.adminNotes}</p>
              </div>
            )}

            {/* Rejected reason */}
            {req.rejectedReason && (
              <div className="mt-3 p-2.5 rounded-lg"
                style={{ background: "rgba(200,80,80,0.04)", border: "1px solid rgba(200,80,80,0.15)" }}>
                <p className="text-[7px] uppercase tracking-wider mb-1" style={{ color: "rgba(200,80,80,0.6)" }}>Rejection Reason</p>
                <p className="text-[9px]" style={{ color: "rgba(200,150,150,0.7)" }}>{req.rejectedReason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-3 text-[8px] uppercase tracking-wider transition-colors"
          style={{ color: MUTED }}>
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? "Hide details" : "View full spec"}
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="px-5 pb-5 space-y-4"
              style={{ borderTop: "1px solid rgba(26,26,27,0.07)" }}>

              {/* Cigar spec */}
              <div className="pt-4">
                <p className="text-[7px] uppercase tracking-[0.2em] mb-3" style={{ color: MUTED }}>Cigar Specification</p>
                <div className="grid grid-cols-2 gap-3">
                  {spec.strength !== undefined && (
                    <div className="rounded-lg p-3"
                      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                      <p className="text-[7px] uppercase tracking-wider mb-1" style={{ color: MUTED }}>Strength</p>
                      <p className="text-xs font-serif" style={{ color: "rgba(210,190,155,0.8)" }}>
                        {["Mild","Medium-Mild","Medium","Medium-Full","Full"][spec.strength - 1] ?? `Level ${spec.strength}`}
                      </p>
                    </div>
                  )}
                  {spec.wrapperType && (
                    <div className="rounded-lg p-3"
                      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                      <p className="text-[7px] uppercase tracking-wider mb-1" style={{ color: MUTED }}>Wrapper</p>
                      <p className="text-xs font-serif" style={{ color: "rgba(210,190,155,0.8)" }}>
                        {WRAPPER_LABELS[spec.wrapperType] ?? spec.wrapperType}
                      </p>
                    </div>
                  )}
                  {spec.flavorDirection && spec.flavorDirection.length > 0 && (
                    <div className="col-span-2 rounded-lg p-3"
                      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                      <p className="text-[7px] uppercase tracking-wider mb-2" style={{ color: MUTED }}>Flavor Profile</p>
                      <div className="flex flex-wrap gap-1.5">
                        {spec.flavorDirection.map((f) => (
                          <span key={f} className="text-[8px] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(212,139,0,0.08)", border: "1px solid rgba(212,139,0,0.18)", color: GOLD_DIM }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Box design */}
              {boxDesign && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Box size={11} style={{ color: GOLD_DIM }} />
                    <p className="text-[7px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>Box Design</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Box Color",         value: boxDesign.boxColor },
                      { label: "Logo Placement",    value: boxDesign.logoPlacement ? LOGO_PLACEMENT_LABELS[boxDesign.logoPlacement] ?? boxDesign.logoPlacement : undefined },
                      { label: "Label Text",        value: boxDesign.labelText },
                      { label: "Limited Edition",   value: boxDesign.limitedEditionName },
                      { label: "Finish",            value: boxDesign.finishStyle },
                    ].filter((x) => x.value).map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-3"
                        style={{ background: "rgba(212,139,0,0.03)", border: "1px solid rgba(212,139,0,0.1)" }}>
                        <p className="text-[7px] uppercase tracking-wider mb-1" style={{ color: MUTED }}>{label}</p>
                        <p className="text-xs font-serif capitalize" style={{ color: "rgba(210,190,155,0.8)" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[7px]" style={{ color: "rgba(180,155,100,0.25)" }}>
                Submitted {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SignatureCreationsTab() {
  const [requests,   setRequests]   = useState<SignatureRequestItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [isMaestro,  setIsMaestro]  = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prog, reqs] = await Promise.allSettled([fetchProgression(), fetchMySignatureRequests()]);
      if (prog.status === "fulfilled") setIsMaestro((prog.value.level?.index ?? 0) >= 4);
      if (reqs.status === "fulfilled") setRequests(reqs.value);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Signature Creations
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: MUTED }}>
            Your custom cigar designs · Elite creator status
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button onClick={load}
            className="p-2 rounded-lg" whileTap={{ scale: 0.95 }}
            style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: MUTED }}>
            <RefreshCw size={12} />
          </motion.button>
          {isMaestro && (
            <motion.button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs uppercase tracking-[0.12em]"
              style={{ background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.28)", color: GOLD_DIM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Crown size={12} /> New Design
            </motion.button>
          )}
        </div>
      </div>

      {/* Maestro gate notice */}
      {!isMaestro && (
        <motion.div className="rounded-2xl p-6 text-center"
          style={{ background: "rgba(212,139,0,0.03)", border: "1px solid rgba(212,139,0,0.12)" }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Crown size={28} className="mx-auto mb-3" style={{ color: "rgba(212,139,0,0.3)" }} />
          <p className="font-serif text-lg mb-2" style={{ color: "rgba(220,200,165,0.8)", fontWeight: 300 }}>
            Maestro del Fuego Required
          </p>
          <p className="text-sm mb-5" style={{ color: MUTED }}>
            Reach 60+ verified experiences and 700+ XP to unlock elite cigar creation.
          </p>
          <div className="flex items-center justify-center gap-6">
            {[
              { label: "Verified Orders", value: "60+" },
              { label: "XP Required",    value: "700+" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-serif text-2xl" style={{ color: GOLD_DIM, fontWeight: 300 }}>{value}</p>
                <p className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Creator status (Maestro) */}
      {isMaestro && (
        <motion.div className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(120,80,5,0.15), rgba(212,139,0,0.05))", border: "1px solid rgba(212,139,0,0.22)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Crown size={22} style={{ color: GOLD, filter: "drop-shadow(0 0 6px rgba(212,139,0,0.4))" }} />
          <div>
            <p className="font-serif text-sm" style={{ color: GOLD_DIM, fontWeight: 300 }}>Signature Creator — Elite Status</p>
            <p className="text-[8px] mt-0.5" style={{ color: MUTED }}>
              Band design · Cigar spec · Custom box · Limited edition naming
            </p>
          </div>
        </motion.div>
      )}

      {/* Requests list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div className="w-6 h-6 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center">
          <Crown size={28} className="mx-auto mb-3" style={{ color: "rgba(180,155,100,0.15)" }} />
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            {isMaestro ? "No signature designs yet — create your first one" : "No submissions available"}
          </p>
          {isMaestro && (
            <motion.button onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl text-xs uppercase tracking-[0.15em]"
              style={{ background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.25)", color: GOLD_DIM }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              Start Creating
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => <RequestCard key={r.id} req={r} />)}
        </div>
      )}

      <SignatureCigarModal
        isOpen={showModal}
        isMaestro={isMaestro}
        onClose={() => setShowModal(false)}
        onSaved={() => { setShowModal(false); void load(); }}
      />
    </div>
  );
}
