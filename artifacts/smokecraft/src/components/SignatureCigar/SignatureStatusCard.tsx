/**
 * SignatureStatusCard — shows a user's signature cigar design + production status.
 *
 * Displayed on the Home page for Maestro del Fuego users who have submitted a design.
 */

import { useState, useEffect }         from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { Crown, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { CigarBandPreview }            from "@/components/Band/CigarBandPreview";
import { fetchMySignatureCigars, type SignatureCigarRecord } from "@/services/api";
import type { BlendDesign }            from "@/services/storage";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  draft:      { label: "Draft",       color: "rgba(180,155,100,0.7)", dot: "rgba(180,155,100,0.5)" },
  submitted:  { label: "Submitted",   color: "rgba(100,160,230,0.8)", dot: "rgba(100,160,230,0.6)" },
  review:     { label: "In Review",   color: "rgba(230,180,60,0.9)",  dot: "rgba(212,175,55,0.7)"  },
  approved:   { label: "Approved",    color: "rgba(52,200,120,0.9)",  dot: "rgba(52,200,120,0.7)"  },
  production: { label: "Production",  color: "rgba(212,175,55,1)",    dot: "rgba(212,175,55,0.9)"  },
  rejected:   { label: "Rejected",    color: "rgba(239,68,68,0.75)",  dot: "rgba(239,68,68,0.55)"  },
};

const STAGE_LABELS: Record<string, string> = {
  "sample-batch":   "Sample Batch",
  "limited-edition": "Limited Edition",
  "full-production": "Full Production",
};

function bandDesignFromRecord(record: SignatureCigarRecord): BlendDesign {
  const bd = record.bandDesign;
  return {
    primaryColor: bd.primaryColor ?? "gold",
    accentColor:  bd.accentColor  ?? "gold",
    emblem:       bd.emblem        ?? "crown",
    textStyle:    (bd.fontStyle    ?? "serif") as BlendDesign["textStyle"],
  };
}

interface SignatureStatusCardProps {
  onCreateNew: () => void;
}

export function SignatureStatusCard({ onCreateNew }: SignatureStatusCardProps) {
  const [records,   setRecords]   = useState<SignatureCigarRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMySignatureCigars();
      setRecords(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return (
    <div className="flex justify-center py-6">
      <motion.div className="w-6 h-6 rounded-full border-2"
        style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: "rgba(212,175,55,0.6)" }}
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  );

  const latest = records[0];

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{
        background: "linear-gradient(160deg, rgba(30,20,5,0.9), rgba(15,10,2,0.95))",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 0 40px rgba(212,175,55,0.06)",
      }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown size={13} style={{ color: "rgba(212,175,55,0.8)" }} fill="rgba(212,175,55,0.2)" />
          <span className="text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(212,175,55,0.6)" }}>
            Signature Creator
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ color: "rgba(180,155,100,0.4)" }}>
            <RefreshCw size={10} />
          </button>
          {records.length > 1 && (
            <button onClick={() => setExpanded((x) => !x)}
              className="text-[8px] uppercase tracking-[0.15em] flex items-center gap-1"
              style={{ color: "rgba(180,155,100,0.4)" }}>
              {expanded ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              {records.length} designs
            </button>
          )}
        </div>
      </div>

      {!latest ? (
        /* No designs yet */
        <div className="text-center py-4">
          <p className="font-serif text-sm mb-3" style={{ color: "rgba(210,190,155,0.6)", fontWeight: 300 }}>
            Your cigar identity awaits
          </p>
          <motion.button onClick={onCreateNew}
            className="px-5 py-2.5 rounded-lg text-xs uppercase tracking-[0.18em]"
            style={{ background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "hsl(22 18% 6%)" }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            Create Signature Cigar
          </motion.button>
        </div>
      ) : (
        /* Latest design */
        <DesignRow record={latest} onCreateNew={onCreateNew} isLatest />
      )}

      <AnimatePresence>
        {expanded && records.slice(1).map((r) => (
          <motion.div key={r.id}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="pt-3 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <DesignRow record={r} onCreateNew={onCreateNew} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DesignRow({ record, onCreateNew, isLatest = false }: {
  record: SignatureCigarRecord;
  onCreateNew: () => void;
  isLatest?: boolean;
}) {
  const design = bandDesignFromRecord(record);
  const status = STATUS_CONFIG[record.status] ?? STATUS_CONFIG["draft"]!;

  return (
    <div className="space-y-3">
      {/* Band preview */}
      <div className="flex justify-center">
        <CigarBandPreview design={design} blendName={record.brandName} style="bold" size="sm" />
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
            {record.brandName}
          </p>
          <p className="text-[8px]" style={{ color: "rgba(180,155,100,0.35)" }}>
            {new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
            <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>
          {record.productionStage && (
            <p className="text-[8px] mt-0.5" style={{ color: "rgba(180,155,100,0.38)" }}>
              {STAGE_LABELS[record.productionStage] ?? record.productionStage}
            </p>
          )}
        </div>
      </div>

      {/* Admin notes */}
      {record.adminNotes && (
        <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}>
          <p className="text-[8px] uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(180,155,100,0.38)" }}>Note from team</p>
          <p className="text-xs" style={{ color: "rgba(200,180,145,0.65)" }}>{record.adminNotes}</p>
        </div>
      )}

      {record.rejectedReason && (
        <div className="px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[8px] uppercase tracking-[0.15em] mb-1" style={{ color: "rgba(239,68,68,0.5)" }}>Reason</p>
          <p className="text-xs" style={{ color: "rgba(239,68,68,0.65)" }}>{record.rejectedReason}</p>
        </div>
      )}

      {/* Create new — only on most recent if draft/rejected */}
      {isLatest && (record.status === "draft" || record.status === "rejected") && (
        <motion.button onClick={onCreateNew}
          className="w-full py-2 text-xs uppercase tracking-[0.18em] rounded-lg"
          style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.6)" }}
          whileHover={{ color: "rgba(212,175,55,0.9)", borderColor: "rgba(212,175,55,0.4)" }}
          whileTap={{ scale: 0.97 }}>
          Create New Concept
        </motion.button>
      )}
    </div>
  );
}
