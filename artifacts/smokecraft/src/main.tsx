import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
