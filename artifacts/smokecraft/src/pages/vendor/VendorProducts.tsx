import { useEffect, useState } from "react";
import { VendorLayout, VT } from "./VendorLayout";
import { Plus, Package, Clock, CheckCircle, XCircle, Edit2, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  submissionStatus: "pending" | "approved" | "rejected";
  strength: number;
  tier: string;
  imageUrl?: string;
  rejectionReason?: string;
  createdAt: string;
}

const STATUS_CFG = {
  pending:  { color: "#F6A623", label: "PENDING",  icon: Clock },
  approved: { color: "#18C98B", label: "APPROVED", icon: CheckCircle },
  rejected: { color: "#E94B5A", label: "REJECTED", icon: XCircle },
};

const CATS = ["cigar","alcohol","beer","wine","cocktail","food","coffee","tea","scent","candle"];

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(11,30,52,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: VT.card, borderRadius: 16, padding: "32px",
        width: "100%", maxWidth: 520, border: `1px solid ${VT.border}`,
        boxShadow: "0 24px 80px rgba(8,123,255,0.12)", position: "relative",
        maxHeight: "90dvh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "none",
          border: "none", cursor: "pointer", color: VT.sub,
        }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: VT.sub, letterSpacing: "0.16em", marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "11px 13px", background: VT.bg,
        border: `1.5px solid ${VT.border}`, borderRadius: 8,
        fontSize: 12, color: VT.text, fontFamily: VT.mono,
        outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState<"all" | "pending" | "approved" | "rejected">("all");

  const [form, setForm] = useState({
    name: "", category: "cigar", strength: "3",
    flavorNotes: "", moodTags: "", pairingTags: "", tier: "standard", imageUrl: "",
  });

  const token = localStorage.getItem("axiom_token");
  const h = { Authorization: `Bearer ${token}` };

  function load() {
    setLoading(true);
    fetch("/api/vendor/products", { headers: h })
      .then((r) => r.json())
      .then((d) => setProducts((d as any).products ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ name: "", category: "cigar", strength: "3", flavorNotes: "", moodTags: "", pairingTags: "", tier: "standard", imageUrl: "" });
    setError("");
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name, category: p.category, strength: String(p.strength),
      flavorNotes: "", moodTags: "", pairingTags: "",
      tier: p.tier, imageUrl: p.imageUrl ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      name:        form.name.trim(),
      category:    form.category,
      strength:    Number(form.strength),
      tier:        form.tier,
      imageUrl:    form.imageUrl.trim() || undefined,
      flavorNotes: form.flavorNotes.split(",").map((s) => s.trim()).filter(Boolean),
      moodTags:    form.moodTags.split(",").map((s) => s.trim()).filter(Boolean),
      pairingTags: form.pairingTags.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const url    = editId ? `/api/vendor/products/${editId}` : "/api/vendor/products";
    const method = editId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as any).error ?? "Save failed");
        return;
      }
      setShowModal(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filter === "all" ? products : products.filter((p) => p.submissionStatus === filter);

  return (
    <VendorLayout title="Products" subtitle="Submit and manage your product catalog" breadcrumb="VENDOR PORTAL">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 16px", borderRadius: 20,
              background: filter === f ? VT.accent : "transparent",
              border: `1.5px solid ${filter === f ? VT.accent : VT.border}`,
              color: filter === f ? "#fff" : VT.sub,
              fontSize: 9, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.12em", fontFamily: VT.mono, textTransform: "capitalize",
            }}
          >
            {f.toUpperCase()} {f !== "all" && `(${products.filter((p) => p.submissionStatus === (f as "pending" | "approved" | "rejected")).length})`}
          </button>
        ))}
        <button
          onClick={openNew}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 8,
            padding: "9px 20px", background: VT.accent, border: "none",
            borderRadius: 8, color: "#fff", fontSize: 10, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.12em", fontFamily: VT.mono,
          }}
        >
          <Plus size={13} /> SUBMIT PRODUCT
        </button>
      </div>

      {/* Product grid */}
      {loading ? (
        <div style={{ fontSize: 10, color: VT.sub, textAlign: "center", padding: "60px 0" }}>Loading products…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: VT.card, borderRadius: 12, border: `1px solid ${VT.border}`,
        }}>
          <Package size={36} color={VT.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: VT.text, marginBottom: 8 }}>No products yet</div>
          <div style={{ fontSize: 10, color: VT.sub, marginBottom: 24 }}>Submit your first product for review</div>
          <button
            onClick={openNew}
            style={{
              padding: "11px 28px", background: VT.accent, border: "none",
              borderRadius: 8, color: "#fff", fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: VT.mono,
            }}
          >
            SUBMIT PRODUCT
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map((p) => {
            const cfg  = STATUS_CFG[p.submissionStatus];
            const Icon = cfg.icon;
            return (
              <div
                key={p.id}
                style={{
                  background: VT.card, borderRadius: 12, padding: "20px",
                  border: `1px solid ${VT.border}`,
                  boxShadow: "0 2px 14px rgba(8,123,255,0.04)",
                }}
              >
                {/* Image */}
                <div style={{
                  width: "100%", height: 120, borderRadius: 8, marginBottom: 14,
                  background: "rgba(34,126,255,0.05)", border: `1px solid ${VT.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Package size={32} color={VT.border} />}
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: VT.text, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20,
                    background: `${cfg.color}12`, border: `1px solid ${cfg.color}28`,
                    flexShrink: 0,
                  }}>
                    <Icon size={9} color={cfg.color} />
                    <span style={{ fontSize: 8, fontWeight: 700, color: cfg.color, letterSpacing: "0.12em" }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 9, color: VT.sub, textTransform: "capitalize", marginBottom: 6 }}>
                  {p.category} · {p.tier} · Strength {p.strength}/5
                </div>

                {p.rejectionReason && (
                  <div style={{
                    padding: "8px 10px", background: "rgba(233,75,90,0.07)",
                    border: "1px solid rgba(233,75,90,0.20)", borderRadius: 6,
                    fontSize: 9, color: VT.red, marginBottom: 10, lineHeight: 1.5,
                  }}>
                    <strong>Rejection:</strong> {p.rejectionReason}
                  </div>
                )}

                {p.submissionStatus !== "approved" && (
                  <button
                    onClick={() => openEdit(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", background: "transparent",
                      border: `1px solid ${VT.border}`, borderRadius: 6,
                      color: VT.sub, fontSize: 9, fontWeight: 700,
                      cursor: "pointer", fontFamily: VT.mono,
                    }}
                  >
                    <Edit2 size={10} /> EDIT & RESUBMIT
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div style={{ fontSize: 14, fontWeight: 800, color: VT.text, marginBottom: 4 }}>
            {editId ? "Edit Product" : "Submit New Product"}
          </div>
          <div style={{ fontSize: 9, color: VT.sub, marginBottom: 24 }}>
            {editId ? "Update and resubmit for review" : "All submissions are reviewed before going live"}
          </div>

          <Field label="PRODUCT NAME *">
            <TextInput value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Grand Reserve Maduro" />
          </Field>

          <Field label="CATEGORY *">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.currentTarget.value }))}
              style={{
                width: "100%", padding: "11px 13px", background: VT.bg,
                border: `1.5px solid ${VT.border}`, borderRadius: 8,
                fontSize: 12, color: VT.text, fontFamily: VT.mono,
                outline: "none", boxSizing: "border-box",
              }}
            >
              {CATS.map((c) => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>)}
            </select>
          </Field>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="STRENGTH (1–5)">
                <TextInput value={form.strength} onChange={(v) => setForm((f) => ({ ...f, strength: v }))} placeholder="3" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="TIER">
                <select
                  value={form.tier}
                  onChange={(e) => setForm((f) => ({ ...f, tier: e.currentTarget.value }))}
                  style={{
                    width: "100%", padding: "11px 13px", background: VT.bg,
                    border: `1.5px solid ${VT.border}`, borderRadius: 8,
                    fontSize: 12, color: VT.text, fontFamily: VT.mono,
                    outline: "none", boxSizing: "border-box",
                  }}
                >
                  <option value="standard">Standard</option>
                  <option value="mid">Mid</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
            </div>
          </div>

          <Field label="FLAVOR NOTES (comma-separated)">
            <TextInput value={form.flavorNotes} onChange={(v) => setForm((f) => ({ ...f, flavorNotes: v }))} placeholder="cedar, cocoa, earth" />
          </Field>
          <Field label="MOOD TAGS (comma-separated)">
            <TextInput value={form.moodTags} onChange={(v) => setForm((f) => ({ ...f, moodTags: v }))} placeholder="relaxing, celebratory" />
          </Field>
          <Field label="PAIRING TAGS (comma-separated)">
            <TextInput value={form.pairingTags} onChange={(v) => setForm((f) => ({ ...f, pairingTags: v }))} placeholder="bourbon, coffee, steak" />
          </Field>
          <Field label="IMAGE URL (optional)">
            <TextInput value={form.imageUrl} onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))} placeholder="https://res.cloudinary.com/…" />
          </Field>

          {error && (
            <div style={{
              padding: "10px 14px", background: "rgba(233,75,90,0.08)",
              border: "1px solid rgba(233,75,90,0.25)", borderRadius: 8,
              fontSize: 10, color: VT.red, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                flex: 1, padding: "12px 0", background: "transparent",
                border: `1.5px solid ${VT.border}`, borderRadius: 8,
                color: VT.sub, fontSize: 10, fontWeight: 700,
                cursor: "pointer", fontFamily: VT.mono,
              }}
            >
              CANCEL
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              style={{
                flex: 2, padding: "12px 0",
                background: form.name.trim() ? VT.accent : VT.border,
                border: "none", borderRadius: 8,
                color: form.name.trim() ? "#fff" : VT.faint,
                fontSize: 10, fontWeight: 700, cursor: form.name.trim() ? "pointer" : "default",
                fontFamily: VT.mono,
              }}
            >
              {saving ? "SAVING…" : editId ? "RESUBMIT FOR REVIEW" : "SUBMIT FOR REVIEW"}
            </button>
          </div>
        </Modal>
      )}
    </VendorLayout>
  );
}
