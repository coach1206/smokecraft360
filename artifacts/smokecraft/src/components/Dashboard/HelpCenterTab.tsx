/**
 * HelpCenterTab — venue staff support queue + super-admin triage console.
 *
 * Backed by /api/support-tickets and /api/support-tickets/:id/messages
 * (see routes/supportTickets.ts + routes/supportTicketMessages.ts). Tenant
 * scope is enforced server-side: venue users see their own venue, super_admin
 * sees everything. Cross-tenant 404 (no existence leak) — same G3/G5/G6
 * pattern as ConflictsTab.
 *
 * Capabilities by role:
 *   - venue_owner / manager / staff: open new tickets, view + reply on own
 *     venue tickets, toggle own tickets between open ↔ closed.
 *   - super_admin: see all venues (or filter ?venueId=…), reply, and move
 *     any ticket to in_progress / resolved / closed (forward FORWARD-set
 *     fan-out fires a venue notification).
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy, Filter, RefreshCw, Loader2, Plus, X, Send, ArrowLeft,
  CircleDot, Clock, CheckCircle2, Lock, Flame,
} from "lucide-react";
import {
  listSupportTickets, getSupportTicket, createSupportTicket,
  patchSupportTicketStatus, listSupportTicketMessages, postSupportTicketMessage,
  type SupportTicket, type SupportTicketStatus, type SupportTicketPriority,
  type SupportTicketMessage,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed",
};
const STATUS_COLORS: Record<SupportTicketStatus, { bg: string; fg: string; border: string; icon: React.ReactNode }> = {
  open:        { bg: "rgba(212,140,55,0.15)", fg: "rgba(255,210,140,0.95)", border: "rgba(212,140,55,0.5)",  icon: <CircleDot size={11} /> },
  in_progress: { bg: "rgba(80,140,200,0.18)", fg: "rgba(180,220,255,0.95)", border: "rgba(80,140,200,0.5)",  icon: <Clock size={11} /> },
  resolved:    { bg: "rgba(80,160,90,0.15)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)",   icon: <CheckCircle2 size={11} /> },
  closed:      { bg: "rgba(180,180,180,0.08)", fg: "rgba(200,200,200,0.7)", border: "rgba(180,180,180,0.25)", icon: <Lock size={11} /> },
};

const PRIORITY_LABEL: Record<SupportTicketPriority, string> = {
  low: "Low", normal: "Normal", high: "High",
};
const PRIORITY_COLORS: Record<SupportTicketPriority, { fg: string; border: string }> = {
  low:    { fg: "rgba(180,180,180,0.7)",  border: "rgba(180,180,180,0.25)" },
  normal: { fg: "rgba(212,175,55,0.7)",   border: "rgba(212,175,55,0.3)"  },
  high:   { fg: "rgba(255,140,120,0.95)", border: "rgba(220,80,60,0.55)"  },
};

const formatDateTime = (iso: string): string => {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
};

type StatusFilter = SupportTicketStatus | "all";

export function HelpCenterTab() {
  const { user } = useAuth();
  const isSuper  = user?.role === "super_admin";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<StatusFilter>("open");
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { tickets: rows } = await listSupportTickets({
        status: filter === "all" ? undefined : filter,
        limit:  100,
      });
      setTickets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const onTicketUpdated = (updated: Partial<SupportTicket> & { id: string }) => {
    setTickets((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
    if (selected?.id === updated.id) setSelected((s) => s ? { ...s, ...updated } : s);
  };

  const onTicketCreated = (t: SupportTicket) => {
    setTickets((prev) => [t, ...prev]);
    setShowCompose(false);
  };

  if (selected) {
    return (
      <TicketDetail
        ticket={selected}
        isSuper={isSuper}
        currentUserId={user?.id ?? null}
        onBack={() => setSelected(null)}
        onTicketUpdated={onTicketUpdated}
      />
    );
  }

  return (
    <motion.div
      key="helpCenter"
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            Help Center
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
            Support tickets · {isSuper ? "All venues · Triage console" : "Your venue · Open ↔ Close"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={11} style={{ color: "rgba(180,155,100,0.5)" }} />
          {(["open", "in_progress", "resolved", "closed", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              data-testid={`help-filter-${f}`}
              className="px-2.5 py-1 rounded-full text-[9px] uppercase tracking-[0.15em] transition-all"
              style={filter === f
                ? { background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.45)" }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </button>
          ))}
          <button onClick={load} disabled={loading} aria-label="Refresh"
            data-testid="help-refresh"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "rgba(230,210,175,0.6)" }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          {!isSuper && (
            <button onClick={() => setShowCompose(true)}
              data-testid="help-new-ticket"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] uppercase tracking-[0.15em]"
              style={{ background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.45)" }}>
              <Plus size={11} /> New
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded"
          data-testid="help-error"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {error}
        </div>
      )}

      {showCompose && !isSuper && (
        <ComposeForm onCancel={() => setShowCompose(false)} onCreated={onTicketCreated} />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
          <Loader2 size={12} className="animate-spin" /> Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-[11px] px-4 py-8 rounded text-center"
          data-testid="help-empty"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(212,175,55,0.2)", color: "rgba(180,155,100,0.5)" }}>
          {filter === "open" ? "No open tickets. Quiet on the wire." : "No tickets in this view."}
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="help-tickets-list">
          <AnimatePresence mode="popLayout">
            {tickets.map((t) => {
              const c = STATUS_COLORS[t.status];
              const p = PRIORITY_COLORS[t.priority];
              return (
                <motion.button
                  key={t.id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  onClick={async () => {
                    try {
                      const fresh = await getSupportTicket(t.id);
                      setSelected(fresh);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to open ticket");
                    }
                  }}
                  data-testid={`help-ticket-${t.id}`}
                  className="w-full text-left rounded-lg p-3 transition-colors"
                  style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(212,175,55,0.12)" }}>
                  <div className="flex items-start gap-3">
                    <LifeBuoy size={14} style={{ color: c.fg, marginTop: 2, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-serif truncate" style={{ color: "rgba(230,210,175,0.92)", fontSize: 13, maxWidth: "100%" }}>
                          {t.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
                          data-testid={`help-ticket-status-${t.id}`}>
                          {c.icon} {STATUS_LABEL[t.status]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                          style={{ background: "transparent", color: p.fg, border: `1px solid ${p.border}` }}>
                          {t.priority === "high" && <Flame size={9} />} {PRIORITY_LABEL[t.priority]}
                        </span>
                      </div>
                      <div className="text-[11px] line-clamp-2" style={{ color: "rgba(230,210,175,0.6)" }}>
                        {t.body}
                      </div>
                      <div className="text-[10px] mt-2" style={{ color: "rgba(180,155,100,0.5)" }}>
                        Opened {formatDateTime(t.createdAt)} · Updated {formatDateTime(t.updatedAt)}
                        {t.resolvedAt && ` · Resolved ${formatDateTime(t.resolvedAt)}`}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ── Compose new ticket (venue staff only) ─────────────────────────────────────

function ComposeForm({ onCancel, onCreated }: {
  onCancel: () => void; onCreated: (t: SupportTicket) => void;
}) {
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("normal");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!subject.trim() || !body.trim() || submitting) return;
    setSubmitting(true); setErr(null);
    try {
      const created = await createSupportTicket({
        subject: subject.trim(), body: body.trim(), priority,
      });
      onCreated(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="rounded-lg p-4 space-y-3"
      data-testid="help-compose"
      style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(212,175,55,0.25)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "rgba(212,175,55,0.7)" }}>
          New Support Ticket
        </span>
        <button onClick={onCancel} className="p-1 rounded" style={{ color: "rgba(180,155,100,0.5)" }}>
          <X size={12} />
        </button>
      </div>
      <input value={subject} onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (max 200)" maxLength={200}
        data-testid="help-compose-subject"
        className="w-full text-[12px]"
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.2)",
          color: "rgba(230,210,175,0.92)", padding: "8px 10px", borderRadius: 5 }} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Describe the issue (max 5000)" maxLength={5000} rows={5}
        data-testid="help-compose-body"
        className="w-full text-[12px] resize-y"
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.2)",
          color: "rgba(230,210,175,0.92)", padding: "8px 10px", borderRadius: 5 }} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "rgba(180,155,100,0.55)" }}>
            Priority
          </span>
          {(["low", "normal", "high"] as const).map((p) => (
            <button key={p} onClick={() => setPriority(p)}
              data-testid={`help-compose-priority-${p}`}
              className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.15em]"
              style={priority === p
                ? { background: "rgba(212,175,55,0.2)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,175,55,0.5)" }
                : { background: "transparent", color: "rgba(180,155,100,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
        <button onClick={submit}
          disabled={!subject.trim() || !body.trim() || submitting}
          data-testid="help-compose-submit"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] uppercase tracking-[0.15em]"
          style={{ background: "rgba(80,160,90,0.2)", color: "rgba(180,255,190,0.95)",
            border: "1px solid rgba(80,160,90,0.5)",
            opacity: !subject.trim() || !body.trim() || submitting ? 0.5 : 1 }}>
          {submitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {submitting ? "Sending…" : "Send"}
        </button>
      </div>
      {err && (
        <div className="text-[11px] px-2 py-1 rounded"
          data-testid="help-compose-error"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {err}
        </div>
      )}
    </motion.div>
  );
}

// ── Detail view (thread + status transitions + reply) ────────────────────────

function TicketDetail({ ticket, isSuper, currentUserId, onBack, onTicketUpdated }: {
  ticket:        SupportTicket;
  isSuper:       boolean;
  currentUserId: string | null;
  onBack:        () => void;
  onTicketUpdated: (u: Partial<SupportTicket> & { id: string }) => void;
}) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [reply,    setReply]    = useState("");
  const [posting,  setPosting]  = useState(false);
  const [transitioning, setTransitioning] = useState<SupportTicketStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const { messages: rows } = await listSupportTicketMessages(ticket.id, { limit: 200 });
      setMessages(rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load thread");
    } finally {
      setLoading(false);
    }
  }, [ticket.id]);

  useEffect(() => { loadThread(); }, [loadThread]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!reply.trim() || posting) return;
    setPosting(true); setErr(null);
    try {
      const msg = await postSupportTicketMessage(ticket.id, reply.trim());
      setMessages((prev) => [...prev, msg]);
      setReply("");
      // Posting a message touches the ticket's updatedAt server-side.
      onTicketUpdated({ id: ticket.id, updatedAt: msg.createdAt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const transition = async (next: SupportTicketStatus) => {
    if (transitioning) return;
    setTransitioning(next); setErr(null);
    try {
      const updated = await patchSupportTicketStatus(ticket.id, next);
      onTicketUpdated({
        id: ticket.id, status: updated.status,
        updatedAt: updated.updatedAt, resolvedAt: updated.resolvedAt,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setTransitioning(null);
    }
  };

  // Allowed transitions (mirrors server VENUE_ALLOWED_STATUSES).
  const allowed: SupportTicketStatus[] = isSuper
    ? (["open", "in_progress", "resolved", "closed"] as SupportTicketStatus[]).filter((s) => s !== ticket.status)
    : (ticket.status === "open"   ? (["closed"] as SupportTicketStatus[])
      : ticket.status === "closed" ? (["open"]   as SupportTicketStatus[])
      : []);

  const c = STATUS_COLORS[ticket.status];
  const p = PRIORITY_COLORS[ticket.priority];

  return (
    <motion.div
      key={`detail-${ticket.id}`}
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
      className="space-y-4"
      data-testid={`help-detail-${ticket.id}`}>
      <button onClick={onBack}
        data-testid="help-back"
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(180,155,100,0.7)" }}>
        <ArrowLeft size={11} /> Back to tickets
      </button>

      <div className="rounded-lg p-4"
        style={{ background: "rgba(0,0,0,0.32)", border: "1px solid rgba(212,175,55,0.18)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-serif" style={{ color: "rgba(230,210,175,0.92)", fontSize: 16 }}>
                {ticket.subject}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
                data-testid="help-detail-status">
                {c.icon} {STATUS_LABEL[ticket.status]}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                style={{ color: p.fg, border: `1px solid ${p.border}` }}>
                {ticket.priority === "high" && <Flame size={9} />} {PRIORITY_LABEL[ticket.priority]}
              </span>
            </div>
            <div className="text-[10px]" style={{ color: "rgba(180,155,100,0.5)" }}>
              Opened {formatDateTime(ticket.createdAt)} · Updated {formatDateTime(ticket.updatedAt)}
              {ticket.resolvedAt && ` · Resolved ${formatDateTime(ticket.resolvedAt)}`}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[12px] whitespace-pre-wrap"
          style={{ color: "rgba(230,210,175,0.85)" }}>
          {ticket.body}
        </div>

        {allowed.length > 0 && (
          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            <span className="text-[9px] uppercase tracking-[0.18em] mr-1" style={{ color: "rgba(180,155,100,0.55)" }}>
              Move to:
            </span>
            {allowed.map((next) => {
              const nc = STATUS_COLORS[next];
              return (
                <button key={next} onClick={() => transition(next)}
                  disabled={transitioning !== null}
                  data-testid={`help-transition-${next}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-[0.15em] transition-all"
                  style={{ background: nc.bg, color: nc.fg, border: `1px solid ${nc.border}`,
                    opacity: transitioning !== null ? 0.5 : 1 }}>
                  {transitioning === next ? <Loader2 size={10} className="animate-spin" /> : nc.icon}
                  {STATUS_LABEL[next]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {err && (
        <div className="text-[11px] px-3 py-2 rounded"
          data-testid="help-detail-error"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {err}
        </div>
      )}

      <div className="rounded-lg"
        style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(212,175,55,0.1)" }}>
        <div className="px-3 py-2 text-[9px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(180,155,100,0.55)", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
          Thread
        </div>
        <div ref={threadRef}
          data-testid="help-thread"
          className="max-h-[420px] overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-[11px] text-center py-6"
              style={{ color: "rgba(180,155,100,0.45)" }}>
              No replies yet.
            </div>
          ) : (
            messages.map((m) => {
              const mine = currentUserId !== null && m.authorId === currentUserId;
              return (
                <div key={m.id}
                  data-testid={`help-msg-${m.id}`}
                  className="flex" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div className="max-w-[80%] rounded-lg p-2.5"
                    style={mine
                      ? { background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-[12px] whitespace-pre-wrap"
                      style={{ color: "rgba(230,210,175,0.92)" }}>
                      {m.body}
                    </div>
                    <div className="text-[9px] mt-1 uppercase tracking-[0.18em]"
                      style={{ color: "rgba(180,155,100,0.45)" }}>
                      {mine ? "You" : (isSuper ? m.authorId.slice(0, 8) : "Support")} · {formatDateTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {ticket.status !== "closed" || isSuper ? (
          <div className="p-3 flex items-end gap-2" style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Reply…" maxLength={5000} rows={2}
              data-testid="help-reply-input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              }}
              className="flex-1 text-[12px] resize-none"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.2)",
                color: "rgba(230,210,175,0.92)", padding: "8px 10px", borderRadius: 5 }} />
            <button onClick={send} disabled={!reply.trim() || posting}
              data-testid="help-reply-send"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] uppercase tracking-[0.15em]"
              style={{ background: "rgba(212,175,55,0.18)", color: "rgba(230,200,120,0.95)",
                border: "1px solid rgba(212,175,55,0.45)",
                opacity: !reply.trim() || posting ? 0.5 : 1 }}>
              {posting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Send
            </button>
          </div>
        ) : (
          <div className="p-3 text-[10px] text-center uppercase tracking-[0.18em]"
            style={{ color: "rgba(180,155,100,0.45)", borderTop: "1px solid rgba(212,175,55,0.08)" }}>
            Ticket is closed — reopen to reply.
          </div>
        )}
      </div>
    </motion.div>
  );
}
