import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// ── Local fonts — offline-first kiosk resilience ─────────────────────────────
// Loaded from /node_modules/@fontsource/ via Vite, bundled at build time.
// Takes precedence over the Google Fonts CDN fallback in index.html.
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";

// ── Kiosk pinch-zoom guard ─────────────────────────────────────────────────
// CSS touch-action:none blocks panning but some browsers still honour
// native pinch-zoom via gesturestart. These non-passive listeners stop it
// at the JS level — essential for a locked-screen tablet deployment.
document.addEventListener("gesturestart",  (e) => e.preventDefault(), { passive: false });
document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
document.addEventListener("gestureend",    (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) e.preventDefault();   // block 2-finger pinch-zoom
}, { passive: false });
// Side-effect import — bootstraps i18next with EN/ES/FR resources, browser
// language detection, and localStorage persistence (key: "pi_language").
// Must run before App renders so the first paint already reflects the saved
// or detected language.
import "./i18n";

// ── PWA: register service worker ──────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // SW registration failures are non-fatal — the app still works
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
