/**
 * DemoNdaModal — full-screen NDA gate for /demo.
 *
 * Captures: full name, initials, drawn signature (canvas, mouse + touch via
 * Pointer Events), and an explicit "I agree to the terms" checkbox. The
 * "Enter Experience" button stays disabled until every field is complete
 * AND a non-empty signature has been drawn.
 *
 * On success: POSTs to /api/nda/demo-sign, sets sessionStorage flag
 * `demoNdaSigned=1`, fades out (300 ms), then calls `onComplete()` so the
 * parent can boot the demo experience.
 *
 * Distinct from the IP-vault NDA route at /api/nda/sign — that one is the
 * lightweight per-user gate; this one is the rich pre-auth ceremony.
 */

import { useRef, useState, useMemo, useEffect } from "react";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";
import { enqueue } from "@/services/offlineQueue";

export const DEMO_NDA_FLAG = "demoNdaSigned";

export function hasSignedDemoNda(): boolean {
  try { return sessionStorage.getItem(DEMO_NDA_FLAG) === "1"; }
  catch { return false; }
}

function trackNdaEvent(eventType: string, metadata?: Record<string, unknown>) {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, metadata }),
  }).catch(() => {});
}

interface Props {
  onComplete: () => void;
  deviceId?: string | null;
  venueId?: string | null;
}

export function DemoNdaModal({ onComplete, deviceId, venueId }: Props) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");
  const [agreed,   setAgreed]   = useState(false);
  const [hasInk,   setHasInk]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [fading,   setFading]   = useState(false);

  const sessionId = useMemo(() => {
    try {
      const k = "demoNdaSessionId";
      let v = sessionStorage.getItem(k);
      if (!v) { v = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem(k, v); }
      return v;
    } catch { return null; }
  }, []);

  useEffect(() => {
    trackNdaEvent("nda_viewed", { deviceId, venueId, sessionId });
  }, []);

  const canSubmit = fullName.trim().length >= 2
                 && initials.trim().length >= 1
                 && agreed
                 && hasInk
                 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null); setSubmitting(true);
    const dataUrl = padRef.current?.getDataUrl();
    if (!dataUrl) { setError("Please draw your signature."); setSubmitting(false); return; }

    const payload = {
      fullName: fullName.trim(),
      initials: initials.trim(),
      signatureData: dataUrl,
      agreed: true as const,
      ...(sessionId ? { sessionId } : {}),
      ...(deviceId ? { deviceId } : {}),
      ...(venueId ? { venueId } : {}),
    };

    try {
      const r = await fetch("/api/nda/demo-sign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error || `Signature failed (${r.status})`);
        setSubmitting(false);
        return;
      }
      try { sessionStorage.setItem(DEMO_NDA_FLAG, "1"); } catch { /* noop */ }
      setFading(true);
      window.setTimeout(() => onComplete(), 320);
    } catch {
      if (!navigator.onLine) {
        enqueue("nda", payload as unknown as Record<string, unknown>);
        try { sessionStorage.setItem(DEMO_NDA_FLAG, "1"); } catch { /* noop */ }
        setFading(true);
        window.setTimeout(() => onComplete(), 320);
      } else {
        setError("Network error — please try again.");
        setSubmitting(false);
      }
    }
  }

  return (
    <div
      data-testid="demo-nda-modal"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(8,6,4,0.96)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, opacity: fading ? 0 : 1,
        transition: "opacity 300ms ease-out", overflowY: "auto",
      }}
    >
      <div style={{
        background: "linear-gradient(180deg, #14110c 0%, #0a0806 100%)",
        border: "1px solid rgba(212,175,55,0.35)", borderRadius: 16,
        padding: 32, maxWidth: 640, width: "100%", color: "#e8e0c8",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        position: "relative",
      }}>
        <button
          type="button"
          onClick={() => { window.history.length > 1 ? window.history.back() : (window.location.href = "/"); }}
          style={{
            position: "absolute", top: 16, left: 16,
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#d4af37", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}
        >&larr; Back</button>

        <div style={{
          marginTop: 36, marginBottom: 20, padding: "20px 24px",
          background: "rgba(212,175,55,0.06)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 12,
        }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 24, color: "#d4af37", letterSpacing: "0.04em", fontFamily: "'Playfair Display', serif" }}>
            Non-Disclosure Agreement
          </h2>
          <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.65, opacity: 0.85 }}>
            Access to the SmokeCraft 360 demo environment is provided in strict confidence.
            By signing below, the undersigned agrees to the following terms:
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, opacity: 0.75 }}>
            <li>You will not disclose, reproduce, or share any proprietary system designs, user interfaces, workflows, or data observed during this demo session with any third party.</li>
            <li>You will not reverse-engineer, decompile, or attempt to derive the source code, algorithms, or trade secrets of the SmokeCraft 360 platform.</li>
            <li>All materials, screenshots, recordings, or notes taken during this session remain the intellectual property of Profound Innovations / 360 Enterprise Services.</li>
            <li>This agreement remains in effect for a period of two (2) years from the date of signing.</li>
            <li>Violation of these terms may result in legal action and liability for damages.</li>
          </ol>
        </div>

        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#d4af37", letterSpacing: "0.04em" }}>
          Sign Below
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 12, opacity: 0.5 }}>
          Complete all fields to proceed to the demo experience.
        </p>

        <label style={lbl}>Full Name
          <input
            data-testid="nda-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            maxLength={200}
            style={inp}
          />
        </label>

        <label style={lbl}>Initials
          <input
            data-testid="nda-initials"
            value={initials}
            onChange={(e) => setInitials(e.target.value.toUpperCase())}
            placeholder="JS"
            maxLength={12}
            style={{ ...inp, maxWidth: 120, letterSpacing: "0.2em" }}
          />
        </label>

        <div style={{ marginTop: 14 }}>
          <div style={{ ...lblText, marginBottom: 6 }}>Signature</div>
          <SignaturePad
            ref={padRef}
            width={560}
            height={180}
            onChange={(_dataUrl, isEmpty) => setHasInk(!isEmpty)}
          />
          <button
            type="button"
            data-testid="nda-clear"
            onClick={() => padRef.current?.clear()}
            style={{
              marginTop: 6, fontSize: 12, background: "transparent",
              color: "#d4af37", border: "none", cursor: "pointer", padding: 0,
            }}
          >Clear signature</button>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer" }}>
          <input
            data-testid="nda-agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "#d4af37" }}
          />
          <span style={{ fontSize: 14 }}>I agree to the terms above.</span>
        </label>

        {error && (
          <div data-testid="nda-error" style={{
            marginTop: 14, padding: "10px 12px", background: "rgba(180,40,40,0.15)",
            border: "1px solid rgba(220,80,80,0.45)", borderRadius: 8,
            color: "#ffb4b4", fontSize: 13,
          }}>{error}</div>
        )}

        <button
          data-testid="nda-submit"
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 22, width: "100%", padding: "14px 16px",
            background: canSubmit ? "linear-gradient(180deg, #d4af37 0%, #a98828 100%)" : "rgba(212,175,55,0.18)",
            color: canSubmit ? "#0a0806" : "rgba(232,224,200,0.5)",
            border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
            letterSpacing: "0.05em", cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background 200ms",
          }}
        >{submitting ? "Signing…" : "Enter Experience"}</button>
      </div>
    </div>
  );
}

const lblText: React.CSSProperties = { fontSize: 12, textTransform: "uppercase",
  letterSpacing: "0.12em", opacity: 0.7 };
const lbl: React.CSSProperties = { display: "block", marginTop: 16, ...lblText };
const inp: React.CSSProperties = {
  marginTop: 6, width: "100%", padding: "10px 12px",
  background: "#0a0806", color: "#fff",
  border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
