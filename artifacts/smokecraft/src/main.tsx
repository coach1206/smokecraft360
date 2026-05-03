import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
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
