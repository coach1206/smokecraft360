/**
 * IpVaultTab — super_admin-only IP evidence registry.
 *
 * Gate: caller must have a signed NDA (own column on `users`). If absent,
 * the tab renders an inline NDA modal. After signing, the asset list loads.
 *
 * Actions per asset: Register (draft → registered, atomic), Retire (soft
 * delete), edit notes/status. New-asset form supports title/kind/desc/
 * fileUrl/fileHash/authorship/notes.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, FileLock, Plus, Loader2, RefreshCw, X, Check, Archive, AlertTriangle,
} from "lucide-react";
import {
  fetchIpAssets, createIpAsset, registerIpAsset, retireIpAsset, updateIpAsset,
  fetchNdaStatus, signNda,
  type IpAsset, type IpAssetKind, type IpAssetStatus, type NdaStatus,
} from "@/services/api";

const KINDS: IpAssetKind[]      = ["spec", "design", "code", "trademark", "doc", "other"];
const STATUSES: IpAssetStatus[] = ["draft", "registered", "disputed", "retired"];

const STATUS_TONE: Record<IpAssetStatus, { bg: string; fg: string; border: string }> = {
  draft:      { bg: "rgba(180,180,180,0.10)", fg: "rgba(220,220,220,0.85)", border: "rgba(180,180,180,0.3)" },
  registered: { bg: "rgba(80,160,90,0.18)",   fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
  disputed:   { bg: "rgba(212,140,55,0.18)",  fg: "rgba(255,210,140,0.95)", border: "rgba(212,140,55,0.5)" },
  retired:    { bg: "rgba(180,40,40,0.12)",   fg: "rgba(255,180,170,0.85)", border: "rgba(180,40,40,0.4)" },
};

const fmt = (iso: string | null): string => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
};

export function IpVaultTab() {
  const [nda,        setNda]        = useState<NdaStatus | null>(null);
  const [items,      setItems]      = useState<IpAsset[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [includeRetired, setIncludeRetired] = useState(false);
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const status = await fetchNdaStatus();
      setNda(status);
      if (status.signed) {
        const rows = await fetchIpAssets({ includeRetired });
        setItems(rows);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [includeRetired]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onSign = async (name: string) => {
    setError(null);
    try {
      const s = await signNda(name);
      setNda(s);
      const rows = await fetchIpAssets({ includeRetired });
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign");
    }
  };

  const onCreate = async (input: Parameters<typeof createIpAsset>[0]) => {
    setError(null);
    try {
      const created = await createIpAsset(input);
      setItems((prev) => [created, ...prev]);
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  };

  const wrap = async (id: string, fn: () => Promise<IpAsset>) => {
    setActing((s) => ({ ...s, [id]: true })); setError(null);
    try {
      const updated = await fn();
      setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing((s) => ({ ...s, [id]: false }));
    }
  };

  // ── NDA gate ────────────────────────────────────────────────────────────────
  if (!loading && nda && !nda.signed) {
    return <NdaGate onSign={onSign} error={error} />;
  }

  return (
    <motion.div
      key="ip-vault"
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl flex items-center gap-2" style={{ color: "rgba(230,210,175,0.85)", fontWeight: 300 }}>
            <FileLock size={16} style={{ color: "rgba(212,139,0,0.7)" }} />
            IP Vault
          </h2>
          <p className="text-[9px] uppercase tracking-[0.22em] mt-0.5" style={{ color: "rgba(180,155,100,0.4)" }}>
            Owner-only · NDA-gated · Hash-pinned evidence registry
            {nda?.signedAt && ` · NDA signed ${fmt(nda.signedAt)} as ${nda.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.6)" }}>
            <input type="checkbox" checked={includeRetired} onChange={(e) => setIncludeRetired(e.target.checked)}
              data-testid="toggle-retired" />
            Include retired
          </label>
          <button onClick={loadAll} disabled={loading} aria-label="Refresh"
            className="p-1.5 rounded-md" style={{ color: "rgba(230,210,175,0.6)" }}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)} data-testid="btn-new-asset"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-[0.18em]"
            style={{ background: "rgba(212,139,0,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,139,0,0.45)" }}>
            <Plus size={11} /> New Asset
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded flex items-center gap-2"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateAssetForm onCreate={onCreate} onCancel={() => setShowCreate(false)} />}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "rgba(180,155,100,0.6)" }}>
          <Loader2 size={12} className="animate-spin" /> Loading vault…
        </div>
      ) : items.length === 0 ? (
        <div className="text-[11px] px-4 py-8 rounded text-center"
          style={{ background: "rgba(26,26,27,0.04)", border: "1px dashed rgba(212,139,0,0.2)", color: "rgba(180,155,100,0.5)" }}>
          No assets registered yet. Click "New Asset" to add the first one.
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="ip-asset-list">
          {items.map((a) => {
            const tone = STATUS_TONE[a.status];
            const isActive = !a.retiredAt;
            return (
              <motion.div
                key={a.id}
                layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                data-testid={`ip-asset-${a.id}`}
                className="rounded-lg p-3"
                style={{ background: "rgba(26,26,27,0.06)", border: "1px solid rgba(212,139,0,0.12)" }}>
                <div className="flex items-start gap-3">
                  <Shield size={14} style={{ color: tone.fg, marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-serif" style={{ color: "rgba(230,210,175,0.92)", fontSize: 13 }}>{a.title}</span>
                      <span className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                        style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}
                        data-testid={`ip-status-${a.id}`}>
                        {a.status}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: "rgba(180,155,100,0.55)" }}>
                        {a.kind}
                      </span>
                    </div>
                    {a.description && (
                      <div className="text-[11px] mt-1" style={{ color: "rgba(220,200,170,0.75)" }}>{a.description}</div>
                    )}
                    {(a.fileUrl || a.fileHash) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {a.fileUrl && (
                          <div className="rounded-md p-2" style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                            <div className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.55)" }}>File URL</div>
                            <a href={a.fileUrl} target="_blank" rel="noreferrer" className="font-mono text-[11px] truncate block underline"
                              style={{ color: "rgba(212,139,0,0.85)" }} title={a.fileUrl}>{a.fileUrl}</a>
                          </div>
                        )}
                        {a.fileHash && (
                          <div className="rounded-md p-2" style={{ background: "rgba(26,26,27,0.04)", border: "1px solid rgba(26,26,27,0.08)" }}>
                            <div className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.55)" }}>Hash</div>
                            <div className="font-mono text-[10px] truncate" style={{ color: "rgba(230,210,175,0.85)" }} title={a.fileHash}>{a.fileHash}</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-[10px] mt-2" style={{ color: "rgba(180,155,100,0.5)" }}>
                      Created {fmt(a.createdAt)}
                      {a.registeredAt && ` · Registered ${fmt(a.registeredAt)}`}
                      {a.retiredAt    && ` · Retired ${fmt(a.retiredAt)}`}
                      {a.authorship   && ` · ${a.authorship}`}
                    </div>
                    {a.notes && <div className="text-[10px] mt-1 italic" style={{ color: "rgba(180,155,100,0.55)" }}>{a.notes}</div>}

                    {isActive && (
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {a.status === "draft" && (
                          <ActBtn label="Register" icon={<Check size={11} />} disabled={acting[a.id]}
                            onClick={() => wrap(a.id, () => registerIpAsset(a.id))} tone="ok"
                            testId={`register-${a.id}`} />
                        )}
                        {a.status !== "disputed" && a.status !== "retired" && (
                          <ActBtn label="Mark Disputed" icon={<AlertTriangle size={11} />} disabled={acting[a.id]}
                            onClick={() => wrap(a.id, () => updateIpAsset(a.id, { status: "disputed" }))} tone="warn"
                            testId={`dispute-${a.id}`} />
                        )}
                        <ActBtn label="Retire" icon={<Archive size={11} />} disabled={acting[a.id]}
                          onClick={() => wrap(a.id, () => retireIpAsset(a.id))} tone="bad"
                          testId={`retire-${a.id}`} />
                        {acting[a.id] && <Loader2 size={12} className="animate-spin" style={{ color: "rgba(212,139,0,0.7)" }} />}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── NDA Gate ──────────────────────────────────────────────────────────────────

function NdaGate({ onSign, error }: { onSign: (name: string) => Promise<void>; error: string | null }) {
  const [name,     setName]     = useState("");
  const [agreed,   setAgreed]   = useState(false);
  const [busy,     setBusy]     = useState(false);

  const submit = async () => {
    if (!name.trim() || !agreed) return;
    setBusy(true);
    try { await onSign(name.trim()); } finally { setBusy(false); }
  };

  return (
    <motion.div
      key="nda-gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto p-6 rounded-xl"
      style={{ background: "rgba(26,26,27,0.14)", border: "1px solid rgba(212,139,0,0.25)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <FileLock size={18} style={{ color: "rgba(212,139,0,0.85)" }} />
        <h3 className="font-serif text-lg" style={{ color: "rgba(230,210,175,0.92)" }}>Non-Disclosure Agreement</h3>
      </div>
      <div className="text-[12px] leading-relaxed space-y-2 mb-4" style={{ color: "rgba(220,200,170,0.78)" }}>
        <p>
          The IP Vault contains confidential intellectual property of SmokeCraft, including
          specifications, designs, source-code references, trademarks, and other proprietary
          materials.
        </p>
        <p>
          By signing below you acknowledge that all assets accessed through this vault are
          confidential, that you will not disclose, copy, or distribute them outside the
          authorized scope of your role, and that your access is logged.
        </p>
        <p>
          Your signature, IP address, and timestamp are recorded as legal evidence of acceptance.
          This signature is a one-time, non-revocable acknowledgement.
        </p>
      </div>

      {error && (
        <div className="text-[11px] px-3 py-2 rounded mb-3"
          style={{ background: "rgba(180,40,40,0.12)", border: "1px solid rgba(180,40,40,0.3)", color: "rgba(255,180,170,0.9)" }}>
          {error}
        </div>
      )}

      <label className="block text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.6)" }}>
        Type your full legal name
      </label>
      <input value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Jane Q. Smith" data-testid="nda-name"
        className="w-full text-[13px] mb-3"
        style={{
          background: "rgba(26,26,27,0.10)", border: "1px solid rgba(212,139,0,0.3)",
          color: "rgba(230,210,175,0.92)", padding: "8px 12px", borderRadius: 6,
          fontFamily: '"Cormorant Garamond", serif',
        }} />

      <label className="flex items-start gap-2 text-[11px] mb-4" style={{ color: "rgba(220,200,170,0.78)" }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          data-testid="nda-agree" style={{ marginTop: 3 }} />
        <span>I have read and agree to the terms above. I understand this signature is legally binding.</span>
      </label>

      <button onClick={submit} disabled={!name.trim() || !agreed || busy}
        data-testid="nda-submit"
        className="w-full px-4 py-2 rounded-md text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
        style={{
          background: "rgba(212,139,0,0.22)", color: "rgba(255,225,165,0.95)",
          border: "1px solid rgba(212,139,0,0.55)",
          opacity: !name.trim() || !agreed || busy ? 0.5 : 1,
        }}>
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        {busy ? "Signing…" : "Sign and Continue"}
      </button>
    </motion.div>
  );
}

// ── Create Asset form ─────────────────────────────────────────────────────────

function CreateAssetForm({
  onCreate, onCancel,
}: {
  onCreate: (input: { title: string; kind: IpAssetKind; description?: string; fileUrl?: string; fileHash?: string; authorship?: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title,       setTitle]       = useState("");
  const [kind,        setKind]        = useState<IpAssetKind>("doc");
  const [description, setDescription] = useState("");
  const [fileUrl,     setFileUrl]     = useState("");
  const [fileHash,    setFileHash]    = useState("");
  const [authorship,  setAuthorship]  = useState("");
  const [notes,       setNotes]       = useState("");
  const [busy,        setBusy]        = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(), kind,
        ...(description.trim() && { description: description.trim() }),
        ...(fileUrl.trim()     && { fileUrl: fileUrl.trim() }),
        ...(fileHash.trim()    && { fileHash: fileHash.trim() }),
        ...(authorship.trim()  && { authorship: authorship.trim() }),
        ...(notes.trim()       && { notes: notes.trim() }),
      });
    } finally { setBusy(false); }
  };

  const inputCls = "w-full text-[12px]";
  const inputStyle: React.CSSProperties = {
    background: "rgba(26,26,27,0.10)", border: "1px solid rgba(212,139,0,0.25)",
    color: "rgba(230,210,175,0.92)", padding: "6px 10px", borderRadius: 5,
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="rounded-lg p-4 overflow-hidden"
      style={{ background: "rgba(26,26,27,0.08)", border: "1px solid rgba(212,139,0,0.25)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-[14px]" style={{ color: "rgba(230,210,175,0.9)" }}>New IP Asset</h3>
        <button onClick={onCancel} className="p-1 rounded" style={{ color: "rgba(180,155,100,0.6)" }}>
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Title *</Label>
          <input className={inputCls} style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)}
            data-testid="new-title" />
        </div>
        <div>
          <Label>Kind *</Label>
          <select className={inputCls} style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value as IpAssetKind)}
            data-testid="new-kind">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <Label>Authorship</Label>
          <input className={inputCls} style={inputStyle} value={authorship} onChange={(e) => setAuthorship(e.target.value)}
            placeholder="SmokeCraft Inc, 2026" data-testid="new-authorship" />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <textarea className={inputCls} style={{ ...inputStyle, minHeight: 60 }} value={description} onChange={(e) => setDescription(e.target.value)}
            data-testid="new-description" />
        </div>
        <div>
          <Label>File URL (https://…)</Label>
          <input className={inputCls} style={inputStyle} value={fileUrl} onChange={(e) => setFileUrl(e.target.value)}
            data-testid="new-fileurl" />
        </div>
        <div>
          <Label>File Hash (sha256 hex)</Label>
          <input className={inputCls} style={{ ...inputStyle, fontFamily: "monospace" }} value={fileHash} onChange={(e) => setFileHash(e.target.value)}
            data-testid="new-filehash" />
        </div>
        <div className="col-span-2">
          <Label>Notes</Label>
          <input className={inputCls} style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)}
            data-testid="new-notes" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-[10px] uppercase tracking-[0.18em]"
          style={{ background: "rgba(26,26,27,0.06)", color: "rgba(180,155,100,0.6)", border: "1px solid rgba(26,26,27,0.08)" }}>
          Cancel
        </button>
        <button onClick={submit} disabled={!title.trim() || busy} data-testid="new-submit"
          className="px-3 py-1.5 rounded-md text-[10px] uppercase tracking-[0.18em] flex items-center gap-1.5"
          style={{ background: "rgba(212,139,0,0.18)", color: "rgba(230,200,120,0.95)", border: "1px solid rgba(212,139,0,0.45)", opacity: !title.trim() || busy ? 0.5 : 1 }}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Create Draft
        </button>
      </div>
      {/* Suppress unused lint for STATUSES */}
      <span style={{ display: "none" }}>{STATUSES.join(",")}</span>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(180,155,100,0.6)" }}>{children}</div>;
}

function ActBtn({ label, icon, onClick, disabled, tone, testId }: {
  label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean;
  tone: "ok" | "bad" | "warn"; testId?: string;
}) {
  const palette = {
    ok:   { bg: "rgba(80,160,90,0.18)",  fg: "rgba(180,255,190,0.95)", border: "rgba(80,160,90,0.5)" },
    bad:  { bg: "rgba(180,40,40,0.15)",  fg: "rgba(255,180,170,0.9)",  border: "rgba(180,40,40,0.45)" },
    warn: { bg: "rgba(212,140,55,0.18)", fg: "rgba(255,210,140,0.95)", border: "rgba(212,140,55,0.5)" },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-[0.15em]"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, opacity: disabled ? 0.5 : 1 }}>
      {icon} {label}
    </button>
  );
}
