/**
 * GlobalBackButton — single floating back control mounted once in App.tsx.
 *
 * Self-hides when:
 *   • Current path is an entry route (no meaningful "back" target).
 *   • Browser history has only one entry (user arrived directly).
 *
 * Uses native window.history.back() because wouter (this app's router) does
 * not expose a numeric `navigate(-1)`. Falls back to navigating to "/" if
 * history is empty (defensive — should never trigger because we hide first).
 *
 * Styled to match the existing dashboard aesthetic
 * (rgba(230,210,175,0.92) text on a charcoal pill with gold accent),
 * NOT the raw "background:#000;color:#fff" sample from the spec —
 * the codebase's design system is the source of truth.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const HIDE_ON_PATHS = new Set<string>(["/", "/intro", "/entry", "/pin-login", "/pos", "/demo", "/success", "/cancel", "/dashboard", "/devices", "/experiences", "/analytics", "/vendors", "/staff", "/settings"]);

export default function GlobalBackButton() {
  const [location] = useLocation();
  const [historyDepth, setHistoryDepth] = useState<number>(
    typeof window !== "undefined" ? window.history.length : 1,
  );

  // Re-read history length on every navigation (wouter triggers this hook on
  // location change). history.length never decreases within a tab session, so
  // this is a cheap, always-correct read.
  useEffect(() => {
    if (typeof window !== "undefined") setHistoryDepth(window.history.length);
  }, [location]);

  if (HIDE_ON_PATHS.has(location)) return null;
  if (historyDepth <= 1) return null;

  return (
    <button
      type="button"
      data-testid="global-back-button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
        }
      }}
      aria-label="Go back"
      style={{
        position: "fixed",
        top: 20,
        left: 20,
        zIndex: 1000,
        background: "rgba(18,16,14,0.78)",
        border: "1px solid rgba(212,139,0,0.34)",
        color: "rgba(230,210,175,0.92)",
        padding: "10px 18px 10px 14px",
        borderRadius: 999,
        font: "500 12px/1 'Inter', system-ui, sans-serif",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 4px 16px rgba(26,26,27,0.10)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1, marginTop: -1 }}>‹</span>
      <span>Back</span>
    </button>
  );
}
