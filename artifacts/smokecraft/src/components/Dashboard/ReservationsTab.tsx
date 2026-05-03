/**
 * ReservationsTab — incoming reservation queue for venue staff.
 *
 * Reads /api/reservations/venue/:venueId, lets staff accept / reject /
 * mark fulfilled / mark no-show. A "+ New Reservation" button opens a
 * lean walk-in form so staff can capture phone-in or door reservations.
 *
 * Tenant scoping is enforced by the server — the auth user's venueId is
 * read from useAuth() and passed as the route param.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, Check, X, UserPlus, Loader2, Users, StickyNote, Phone,
  CircleCheck, CircleX, Clock,
} from "lucide-react";
import {
  fetchVenueReservations, updateReservationStatus, createReservation,
  type Reservation, type ReservationStatus,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending:   "Pending",
  accepted:  "Accepted",
  rejected:  "Rejected",
  cancelled: "Cancelled",
  fulfilled: "Fulfilled",
  no_show:   "No-show",
};

const STATUS_COLORS: Record<ReservationStatus, { bg: string; fg: string; border: string }> = {
  pending:   { bg: "rgba(212,175,55,0.12)", fg: "rgba(230,200,120,0.95)", border: "rgba(212,175,55,0.4)" },
  accepted:  { bg: "rgba(80,160,90,0.15)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
  rejected:  { bg: "rgba(180,40,40,0.12)",  fg: "rgba(255,180,170,0.9)",  border: "rgba(180,40,40,0.45)" },
  cancelled: { bg: "rgba(180,180,180,0.08)", fg: "rgba(180,180,180,0.7)", border: "rgba(180,180,180,0.25)" },
  fulfilled: { bg: "rgba(80,140,200,0.15)", fg: "rgba(180,220,255,0.95)", border: "rgba(80,140,200,0.45)" },
  no_show:   { bg: "rgba(120,60,60,0.15)",  fg: "rgba(255,180,180,0.85)", border: "rgba(120,60,60,0.45)" },
};

const formatDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
};

export function ReservationsTab() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? null;

  const [items,    setItems]    = useState<Reservation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [acting,   setActing]   = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!venueId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchVenueReservations(venueId);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const transition = async (r: Reservation, next: ReservationStatus) => {
    setActing((s) => ({ ...s, [r.id]: true }));
    try {
      const updated = await updateReservationStatus(r.id, next);
      setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setActing((s) => ({ ...s, [r.id]: false }));
    }
  };

  if (!venueId) {
    return (
      <div className="text-[11px] px-4 py-6 rounded"
        style={{ background: "rgba(180,40,40,0.10)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,200,190,0.9)" }}>
        Your account is not linked to a venue. Reservations are scoped per venue and cannot be shown.
      </div>
    );
  }

  return (
    <motion.div
      key="reservations"
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Reservations
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
            Incoming RSVPs · Walk-in entry · Accept / reject queue
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="reservations-new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-[0.15em] transition-all"
          style={{
            background: "rgba(212,175,55,0.18)",
            color:      "rgba(230,200,120,0.95)",
            border:     "1px solid rgba(212,175,55,0.45)",
          }}>
          <UserPlus size={11} /> New Reservation
        </button>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
          <Loader2 size={12} className="animate-spin" /> Loading reservations…
        </div>
      ) : items.length === 0 ? (
        <div className="text-[11px] px-4 py-8 rounded text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(212,175,55,0.2)", color: "rgba(180,155,100,0.5)" }}>
          No reservations yet. Tap "+ New Reservation" to capture a walk-in.
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="reservations-list">
          <AnimatePresence mode="popLayout">
            {items.map((r) => {
              const colors = STATUS_COLORS[r.status];
              const isPending  = r.status === "pending";
              const isAccepted = r.status === "accepted";
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  data-testid={`reservation-row-${r.id}`}
                  className="rounded-lg p-3 flex items-center justify-between gap-3"
                  style={{
                    background: "rgba(0,0,0,0.28)",
                    border:     "1px solid rgba(212,175,55,0.12)",
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif" style={{ color: "rgba(230,210,175,0.92)", fontSize: 13 }}>
                        {r.guestName ?? "Account holder"}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                        style={{ background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}
                        data-testid={`reservation-status-${r.id}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      {r.paymentMode !== "none" && (
                        <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(180,155,100,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {r.paymentMode === "deposit" ? `Deposit · $${((r.depositCents ?? 0)/100).toFixed(2)}` : "Pay at venue"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: "rgba(180,155,100,0.65)" }}>
                      <span className="flex items-center gap-1"><CalendarClock size={10} /> {formatDateTime(r.requestedAt)}</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {r.partySize}</span>
                      {r.guestPhone && <span className="flex items-center gap-1"><Phone size={10} /> {r.guestPhone}</span>}
                    </div>
                    {r.productName && (
                      <div className="text-[10px] mt-1" style={{ color: "rgba(212,175,55,0.7)" }}>
                        Reserving: {r.productName}
                      </div>
                    )}
                    {r.notes && (
                      <div className="flex items-start gap-1.5 mt-1.5 text-[10px]" style={{ color: "rgba(180,155,100,0.55)" }}>
                        <StickyNote size={10} className="mt-[1px]" /> {r.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending && (
                      <>
                        <ActionBtn label="Accept" icon={<Check size={11} />} disabled={acting[r.id]}
                          onClick={() => transition(r, "accepted")}
                          tone="ok" testId={`accept-${r.id}`} />
                        <ActionBtn label="Reject" icon={<X size={11} />} disabled={acting[r.id]}
                          onClick={() => transition(r, "rejected")}
                          tone="bad" testId={`reject-${r.id}`} />
                      </>
                    )}
                    {isAccepted && (
                      <>
                        <ActionBtn label="Fulfilled" icon={<CircleCheck size={11} />} disabled={acting[r.id]}
                          onClick={() => transition(r, "fulfilled")}
                          tone="info" testId={`fulfill-${r.id}`} />
                        <ActionBtn label="No-show" icon={<CircleX size={11} />} disabled={acting[r.id]}
                          onClick={() => transition(r, "no_show")}
                          tone="bad" testId={`noshow-${r.id}`} />
                      </>
                    )}
                    {acting[r.id] && <Loader2 size={12} className="animate-spin" style={{ color: "rgba(212,175,55,0.7)" }} />}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <NewReservationForm
            onClose={() => setShowForm(false)}
            onCreated={(r) => setItems((prev) => [r, ...prev])}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Inline button + form helpers ─────────────────────────────────────────────

function ActionBtn({
  label, icon, onClick, disabled, tone, testId,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "ok" | "bad" | "info";
  testId?: string;
}) {
  const palette = {
    ok:   { bg: "rgba(80,160,90,0.18)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
    bad:  { bg: "rgba(180,40,40,0.15)",  fg: "rgba(255,180,170,0.9)",  border: "rgba(180,40,40,0.45)" },
    info: { bg: "rgba(80,140,200,0.18)", fg: "rgba(180,220,255,0.95)", border: "rgba(80,140,200,0.5)" },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-[0.15em] transition-all"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, opacity: disabled ? 0.5 : 1 }}>
      {icon} {label}
    </button>
  );
}

function NewReservationForm({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (r: Reservation) => void;
}) {
  const [guestName,   setGuestName]   = useState("");
  const [guestPhone,  setGuestPhone]  = useState("");
  const [partySize,   setPartySize]   = useState(2);
  const [requestedAt, setRequestedAt] = useState(() => {
    // default: 1 hour from now, formatted for datetime-local input
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [paymentMode, setPaymentMode] = useState<"none" | "deposit" | "pay_at_venue">("none");
  const [depositDollars, setDepositDollars] = useState("25");
  const [notes,       setNotes]       = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!guestName.trim()) { setError("Guest name is required for walk-ins"); return; }

    const requestedIso = new Date(requestedAt).toISOString();

    setSubmitting(true);
    try {
      const created = await createReservation({
        guestName:   guestName.trim(),
        guestPhone:  guestPhone.trim() || undefined,
        partySize,
        requestedAt: requestedIso,
        paymentMode,
        ...(paymentMode === "deposit"
          ? { depositCents: Math.max(100, Math.round(Number(depositDollars) * 100)) }
          : {}),
        notes: notes.trim() || undefined,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
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
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.15)" }}>
          <div>
            <h3 className="font-serif" style={{ color: "rgba(230,210,175,0.9)", fontSize: 16, fontWeight: 300 }}>
              New Walk-in Reservation
            </h3>
            <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.45)" }}>
              Captured by venue staff · Bound to your venue
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
            style={{ color: "rgba(230,210,175,0.6)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(92vh - 120px)" }}>
          <div>
            <label style={labelStyle}>Guest name *</label>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Mr. Hernandez" style={inputStyle} required disabled={submitting}
              data-testid="reservation-guest-name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="(555) 555-5555" style={inputStyle} disabled={submitting} />
            </div>
            <div>
              <label style={labelStyle}>Party size</label>
              <input type="number" min={1} max={50} value={partySize}
                onChange={(e) => setPartySize(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                style={inputStyle} disabled={submitting} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Requested date &amp; time *</label>
            <input type="datetime-local" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)}
              style={inputStyle} required disabled={submitting}
              data-testid="reservation-requested-at" />
          </div>

          <div>
            <label style={labelStyle}>Payment mode</label>
            <div className="flex gap-1.5">
              {(["none", "deposit", "pay_at_venue"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setPaymentMode(m)}
                  disabled={submitting}
                  className="flex-1 px-2 py-1.5 rounded-md text-[9px] uppercase tracking-[0.15em] transition-all"
                  style={paymentMode === m
                    ? { background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.45)" }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(255,255,255,0.06)" }
                  }>
                  {m === "none" ? "None" : m === "deposit" ? "Deposit" : "Pay at venue"}
                </button>
              ))}
            </div>
          </div>

          {paymentMode === "deposit" && (
            <div>
              <label style={labelStyle}>Deposit amount (USD) <span style={{ textTransform: "none", letterSpacing: 0, color: "rgba(180,155,100,0.4)" }}>(min $1.00)</span></label>
              <input type="number" min={1} step={1} value={depositDollars}
                onChange={(e) => setDepositDollars(e.target.value)}
                style={inputStyle} disabled={submitting} />
              <p className="text-[9px] mt-1" style={{ color: "rgba(180,155,100,0.45)" }}>
                Recorded for tracking only — Stripe deposit collection ships in a follow-up brief.
              </p>
            </div>
          )}

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Allergies, seating preference, occasion…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} disabled={submitting} />
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
            <button type="submit" disabled={submitting} data-testid="reservation-submit"
              className="flex-[2] px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all"
              style={{
                background: "rgba(212,175,55,0.18)",
                color:      "rgba(230,200,120,0.95)",
                border:     "1px solid rgba(212,175,55,0.45)",
                opacity:    submitting ? 0.7 : 1,
              }}>
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
              {submitting ? "Submitting…" : "Create reservation"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
