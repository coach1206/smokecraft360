import { useState } from "react";
import { useLocation } from "wouter";
import { VT } from "./VendorLayout";

const CATS = ["cigar", "alcohol", "beer", "wine", "cocktail", "food", "coffee", "tea", "scent", "candle"];

function Input({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: VT.sub, letterSpacing: "0.16em", marginBottom: 7 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "12px 14px", background: VT.bg,
          border: `1.5px solid ${VT.border}`, borderRadius: 8,
          fontSize: 12, color: VT.text, fontFamily: VT.mono,
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export default function VendorOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    productCategories: [] as string[],
    catalogUrl: "",
    agreementSigned: false,
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (c: string) =>
    setForm((f) => ({
      ...f,
      productCategories: f.productCategories.includes(c)
        ? f.productCategories.filter((x) => x !== c)
        : [...f.productCategories, c],
    }));

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("axiom_token");
      const res = await fetch("/api/vendor/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          productCategories: form.productCategories.join(","),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? "Submission failed");
        return;
      }
      navigate("/vendor/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: "Company Details",
      subtitle: "Basic information about your brand",
      content: (
        <>
          <Input label="COMPANY NAME *" value={form.companyName} onChange={set("companyName")} placeholder="Artisan Tobacco Co." />
          <Input label="CONTACT EMAIL *" type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="partner@yourbrand.com" />
          <Input label="CONTACT PHONE" value={form.contactPhone} onChange={set("contactPhone")} placeholder="+1 (555) 000-0000" />
          <Input label="WEBSITE" value={form.website} onChange={set("website")} placeholder="https://yourbrand.com" />
        </>
      ),
      valid: form.companyName.trim().length > 0 && form.contactEmail.trim().includes("@"),
    },
    {
      title: "Product Categories",
      subtitle: "Select all categories that apply to your catalog",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CATS.map((c) => {
            const active = form.productCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                style={{
                  padding: "9px 18px", borderRadius: 20,
                  background: active ? VT.accent : "transparent",
                  border: `1.5px solid ${active ? VT.accent : VT.border}`,
                  color: active ? "#fff" : VT.sub,
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                  letterSpacing: "0.10em", fontFamily: VT.mono,
                  textTransform: "capitalize",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      ),
      valid: form.productCategories.length > 0,
    },
    {
      title: "Catalog & Agreement",
      subtitle: "Final step before your account goes live",
      content: (
        <>
          <Input label="CATALOG URL (OPTIONAL)" value={form.catalogUrl} onChange={set("catalogUrl")} placeholder="https://yourbrand.com/catalog.pdf" />
          <div style={{
            padding: "18px 20px", background: "rgba(8,123,255,0.04)",
            border: `1.5px solid ${VT.border}`, borderRadius: 10, marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: VT.text, marginBottom: 8 }}>
              Vendor Agreement
            </div>
            <div style={{ fontSize: 10, color: VT.sub, lineHeight: 1.7, marginBottom: 16 }}>
              By submitting this form, you agree to the NOVEE OS Vendor Terms of Service.
              Your account will be reviewed by an administrator before products are listed.
              All product submissions are subject to platform approval.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.agreementSigned}
                onChange={(e) => setForm((f) => ({ ...f, agreementSigned: e.currentTarget.checked }))}
                style={{ width: 16, height: 16, accentColor: VT.accent }}
              />
              <span style={{ fontSize: 10, color: VT.text, fontFamily: VT.mono }}>
                I agree to the Vendor Terms of Service
              </span>
            </label>
          </div>
        </>
      ),
      valid: form.agreementSigned,
    },
  ];

  const current = steps[step]!;

  return (
    <div style={{
      minHeight: "100dvh", background: VT.bg, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: VT.mono, padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: VT.accent, letterSpacing: "0.28em", marginBottom: 10 }}>
            EEIE VENDOR PORTAL
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: VT.text, fontFamily: VT.serif, marginBottom: 6 }}>
            Brand Partner Onboarding
          </div>
          <div style={{ fontSize: 11, color: VT.sub }}>
            Complete your profile to access the vendor portal
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? VT.accent : VT.border,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: VT.card, borderRadius: 16, padding: "36px 32px",
          border: `1px solid ${VT.border}`, boxShadow: "0 8px 48px rgba(8,123,255,0.07)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: VT.text, marginBottom: 4 }}>{current.title}</div>
          <div style={{ fontSize: 10, color: VT.sub, marginBottom: 28, letterSpacing: "0.06em" }}>{current.subtitle}</div>

          {current.content}

          {error && (
            <div style={{
              padding: "10px 14px", background: "rgba(233,75,90,0.08)",
              border: `1px solid rgba(233,75,90,0.25)`, borderRadius: 8,
              fontSize: 10, color: VT.red, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{
                  flex: 1, padding: "13px 0", background: "transparent",
                  border: `1.5px solid ${VT.border}`, borderRadius: 10,
                  color: VT.sub, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  letterSpacing: "0.14em", fontFamily: VT.mono,
                }}
              >
                BACK
              </button>
            )}
            <button
              onClick={() => step < steps.length - 1 ? setStep((s) => s + 1) : submit()}
              disabled={!current.valid || saving}
              style={{
                flex: 2, padding: "13px 0", background: current.valid ? VT.accent : VT.border,
                border: "none", borderRadius: 10,
                color: current.valid ? "#fff" : VT.faint,
                fontSize: 10, fontWeight: 700, cursor: current.valid ? "pointer" : "default",
                letterSpacing: "0.14em", fontFamily: VT.mono, transition: "all 0.2s",
              }}
            >
              {saving ? "SUBMITTING…" : step < steps.length - 1 ? "CONTINUE" : "SUBMIT APPLICATION"}
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 9, color: VT.faint }}>
          Step {step + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
