/**
 * SignatureRequestsTab — Admin view for signature cigar requests.
 *
 * Features:
 *  - Filter by status
 *  - Assign manufacturer
 *  - Update status + production stage
 *  - Add admin notes
 *  - Reject with reason
 *
 * Visible to: super_admin, manager
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import {
  Crown, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Factory, Truck, Pencil, AlertCircle,
} from "lucide-react";
import { CigarBandPreview }                 from "@/components/Band/CigarBandPreview";
import {
  fetchAllSignatureCigars, adminUpdateSignatureCigar,
  fetchManufacturers,
  type SignatureCigarRecord, type Manufacturer,
} from "@/services/api";
import type { BlendDesign }                 from "@/services/storage";

const GOLD_DIM = "rgba(212,139,0,0.5)";

const STATUS_COLORS: Record<string, string> = {
  draft:      "rgba(107,94,78,0.62)",
  submitted:  "rgba(100,160,230,0.8)",
  review:     "rgba(230,180,60,0.9)",
  approved:   "rgba(52,200,120,0.85)",
  production: "rgba(212,139,0,0.95)",
  rejected:   "rgba(239,68,68,0.75)",
};

const ALL_STATUSES = ["draft", "submitted", "review", "approved", "production", "rejected"] as const;
type Status = typeof ALL_STATUSES[number];

const PRODUCTION_STAGES = [
  { id: "sample-batch",    label: "Sample Batch"    },
  { id: "limited-edition", label: "Limited Edition" },
  { id: "full-production", label: "Full Production" },
];

function bandDesign(record: SignatureCigarRecord): BlendDesign {
  const bd = record.bandDesign;
  return {
    primaryColor: bd.primaryColor ?? "gold",
    accentColor:  bd.accentColor  ?? "gold",
    emblem:       bd.emblem        ?? "crown",
    textStyle:    (bd.fontStyle    ?? "serif") as BlendDesign["textStyle"],
  };
}

// ── Request card ───────────────────────────────────────────────────────────────

function RequestCard({ record, manufacturers, onUpdated }: {
  record: SignatureCigarRecord;
  manufacturers: Manufacturer[];
  onUpdated: (updated: SignatureCigarRecord) => void;
}) {
  const [open,           setOpen]           = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [status,         setStatus]         = useState<Status>(record.status as Status);
  const [manufacturerId, setManufacturerId] = useState<string>(record.manufacturerId ?? "");
  const [stage,          setStage]          = useState(record.productionStage ?? "");
  const [adminNotes,     setAdminNotes]     = useState(record.adminNotes ?? "");
  const [rejectReason,   setRejectReason]   = useState(record.rejectedReason ?? "");
  const [error,          setError]          = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const updated = await adminUpdateSignatureCigar(record.id, {
        status:          status,
        manufacturerId:  manufacturerId || null,
        adminNotes:      adminNotes     || null,
        rejectedReason:  status === "rejected" ? (rejectReason || null) : null,
        productionStage: stage          || null,
      });
      onUpdated(updated);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const statusColor = STATUS_COLORS[record.status] ?? "rgba(107,94,78,0.58)";
  const design = bandDesign(record);

  return (
    <motion.div layout
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.09)" }}>

      {/* Summary row */}
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => setOpen((x) => !x)}>
        <div className="flex-shrink-0">
          <CigarBandPreview design={design} blendName={record.brandName} style="bold" size="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-serif text-sm" style={{ color: "rgba(220,200,165,0.85)", fontWeight: 300 }}>
              {record.brandName}
            </p>
            <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${statusColor}14`, border: `1px solid ${statusColor}30`, color: statusColor }}>
              {record.status}
            </span>
          </div>
          <p className="text-[8px] mt-0.5" style={{ color: "rgba(107,94,78,0.38)" }}>
            By {record.userName} · {new Date(record.createdAt).toLocaleDateString()}
          </p>
          {record.manufacturer && (
            <p className="text-[8px]" style={{ color: "rgba(212,139,0,0.45)" }}>
              Assigned: {record.manufacturer.name}
            </p>
          )}
        </div>

        <div className="flex-shrink-0">
          {open ? <ChevronUp size={12} style={{ color: GOLD_DIM }} /> : <ChevronDown size={12} style={{ color: "rgba(107,94,78,0.35)" }} />}
        </div>
      </button>

      {/* Expanded admin controls */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid rgba(26,26,27,0.08)" }}>

              {/* Cigar spec summary */}
              <div className="pt-3 grid grid-cols-2 gap-2 text-[8px]">
                {[
                  { label: "Strength",  value: ["Mild","Medium-Mild","Medium","Medium-Full","Full"][record.cigarSpec.strength - 1] },
                  { label: "Wrapper",   value: record.cigarSpec.wrapperType.replace("-", " ") },
                  { label: "Flavors",   value: record.cigarSpec.flavorDirection.join(", ") },
                  { label: "Pairing",   value: record.cigarSpec.preferredPairing ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span style={{ color: "rgba(107,94,78,0.40)" }}>{label}: </span>
                    <span style={{ color: "rgba(200,180,145,0.7)" }}>{value}</span>
                  </div>
                ))}
              </div>
              {record.description && (
                <p className="text-[9px] italic" style={{ color: "rgba(200,180,145,0.55)" }}>
                  "{record.description}"
                </p>
              )}

              {/* Status select */}
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(107,94,78,0.45)" }}>Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((s) => (
                    <button key={s} onClick={() => setStatus(s)}
                      className="px-2.5 py-1.5 rounded-lg text-[8px] uppercase tracking-wider transition-all"
                      style={status === s
                        ? { background: `${STATUS_COLORS[s]}18`, border: `1px solid ${STATUS_COLORS[s]}40`, color: STATUS_COLORS[s] }
                        : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.40)" }
                      }>{s}</button>
                  ))}
                </div>
              </div>

              {/* Production stage */}
              {(status === "approved" || status === "production") && (
                <div>
                  <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(107,94,78,0.45)" }}>Production Stage</p>
                  <div className="flex gap-2">
                    {PRODUCTION_STAGES.map((ps) => (
                      <button key={ps.id} onClick={() => setStage(ps.id)}
                        className="flex-1 py-1.5 rounded-lg text-[8px] uppercase tracking-wide transition-all"
                        style={stage === ps.id
                          ? { background: "rgba(212,139,0,0.1)", border: "1px solid rgba(212,139,0,0.3)", color: GOLD_DIM }
                          : { background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.40)" }
                        }>{ps.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manufacturer assignment */}
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(107,94,78,0.45)" }}>
                  Assign Manufacturer
                </p>
                <select value={manufacturerId} onChange={(e) => setManufacturerId(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs py-2 px-3 rounded-lg cursor-pointer"
                  style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.11)", color: "rgba(200,180,145,0.75)" }}>
                  <option value="">— No manufacturer —</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.specialty})</option>
                  ))}
                </select>
              </div>

              {/* Reject reason */}
              {status === "rejected" && (
                <div>
                  <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(239,68,68,0.5)" }}>Rejection Reason</p>
                  <input className="w-full bg-transparent outline-none text-xs py-1.5 px-0 border-b"
                    style={{ borderColor: "rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.7)" }}
                    placeholder="Explain why the concept is rejected…"
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                </div>
              )}

              {/* Admin notes */}
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] mb-1.5" style={{ color: "rgba(107,94,78,0.45)" }}>Admin Notes (shown to user)</p>
                <textarea rows={2} maxLength={500}
                  className="w-full bg-transparent outline-none resize-none text-xs py-1.5 px-0 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(200,180,145,0.7)" }}
                  placeholder="Optional note for the user…"
                  value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(239,68,68,0.75)" }}>
                  <AlertCircle size={11} />{error}
                </div>
              )}

              {/* Save */}
              <div className="flex justify-end gap-2 pt-1">
                <motion.button onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-lg text-[9px] uppercase tracking-[0.15em]"
                  style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)", color: "rgba(107,94,78,0.45)" }}
                  whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.97 }}>
                  Cancel
                </motion.button>
                <motion.button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] uppercase tracking-[0.15em]"
                  style={{ background: "linear-gradient(135deg, hsl(43 75% 42%), hsl(45 85% 52%))", color: "#F5F2ED", opacity: saving ? 0.7 : 1 }}
                  whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}>
                  {saving ? "Saving…" : "Save Changes"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SignatureRequestsTab() {
  const [records,       setRecords]       = useState<SignatureCigarRecord[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<Status | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, mfrs] = await Promise.all([
        fetchAllSignatureCigars(),
        fetchManufacturers(),
      ]);
      setRecords(recs);
      setManufacturers(mfrs);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleUpdated = (updated: SignatureCigarRecord) => {
    setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  const displayed = filter === "all"
    ? records
    : records.filter((r) => r.status === filter);

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = records.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Signature Requests
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(107,94,78,0.40)" }}>
            Maestro del Fuego cigar concepts · manufacturer pipeline
          </p>
        </div>
        <motion.button onClick={load}
          className="p-2 rounded-lg"
          style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(26,26,27,0.10)", color: "rgba(107,94,78,0.50)" }}
          whileHover={{ color: GOLD_DIM }} whileTap={{ scale: 0.95 }}>
          <RefreshCw size={12} />
        </motion.button>
      </div>

      {/* Status stats */}
      <div className="grid grid-cols-3 gap-2">
        {([["submitted","Pending"], ["approved","Approved"], ["production","In Production"]] as const).map(([s, label]) => (
          <div key={s} className="p-3 rounded-xl text-center"
            style={{ background: `${STATUS_COLORS[s] ?? "rgba(107,94,78,0.58)"}08`, border: `1px solid ${STATUS_COLORS[s] ?? "rgba(107,94,78,0.58)"}20` }}>
            <p className="text-xl font-serif" style={{ color: STATUS_COLORS[s], fontWeight: 300 }}>{counts[s] ?? 0}</p>
            <p className="text-[7px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "rgba(107,94,78,0.38)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 flex-wrap p-0.5 rounded-lg w-fit"
        style={{ background: "rgba(26,26,27,0.05)", border: "1px solid rgba(26,26,27,0.09)" }}>
        {(["all", ...ALL_STATUSES] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-2.5 py-1.5 rounded-md text-[8px] uppercase tracking-[0.12em] transition-all duration-200"
            style={filter === f
              ? { background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.25)", color: "rgba(212,139,0,0.85)" }
              : { color: "rgba(107,94,78,0.45)" }
            }>
            {f}{f !== "all" && counts[f as Status] ? ` (${counts[f as Status]})` : ""}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2"
            style={{ borderColor: "rgba(212,139,0,0.2)", borderTopColor: "rgba(212,139,0,0.7)" }}
            animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-12 text-center rounded-xl"
          style={{ background: "rgba(26,26,27,0.03)", border: "1px solid rgba(26,26,27,0.08)" }}>
          <Crown size={24} className="mx-auto mb-3" style={{ color: "rgba(107,94,78,0.20)" }} />
          <p className="text-xs" style={{ color: "rgba(107,94,78,0.38)" }}>
            No {filter === "all" ? "" : filter + " "}signature requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayed.map((r) => (
              <RequestCard key={r.id} record={r} manufacturers={manufacturers} onUpdated={handleUpdated} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
