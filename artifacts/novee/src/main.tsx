import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Stale-chunk auto-recovery ─────────────────────────────────────────────────
// When Vite dev server restarts or HMR invalidates a lazy chunk, the browser's
// JS module registry may hold an old version. Any subsequent dynamic import()
// of that chunk returns a "Failed to fetch" rejection. Detecting this here
// (in the main bundle — always fresh) triggers a full reload so the new chunk
// is fetched cleanly. Guard against reload loops with a 10s cooldown.
window.addEventListener("unhandledrejection", (e) => {
  const msg = String(e.reason?.message ?? e.reason ?? "");
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  ) {
    const LAST_KEY = "__nv_reload_at";
    const last = Number(sessionStorage.getItem(LAST_KEY) ?? 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(LAST_KEY, String(Date.now()));
      window.location.reload();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
