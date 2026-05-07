/**
 * useKioskLock — Zero-Exit Kiosk Mode browser hardening.
 *
 * Disables all standard browser escape mechanisms so the Axiom OS
 * terminal cannot be accidentally (or intentionally) exited by a patron.
 *
 * Locks applied:
 *   - Right-click context menu
 *   - F-key shortcuts (F1–F12: DevTools, help, fullscreen toggle, etc.)
 *   - Ctrl/Cmd + R (reload), W (close), T (new tab), L (address bar)
 *   - Text selection on the document body
 *   - Drag-and-drop on non-interactive elements
 *   - Double-tap zoom on iOS (touch-action: manipulation via CSS)
 *
 * Staff escape hatch (5-tap on the time display) is NOT disabled here —
 * that's handled at the component level in CraftHubInner.
 *
 * Should be called once at the top of the root kiosk shell.
 */

import { useEffect } from "react";

export function useKioskLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // ── Context menu ─────────────────────────────────────────────────────────
    const blockContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", blockContext);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    const blockKeys = (e: KeyboardEvent) => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const fKeys = e.key.match(/^F\d{1,2}$/);

      // Block all F-keys except F11 on non-kiosk builds (always block here)
      if (fKeys) { e.preventDefault(); return; }

      // Block Ctrl/Cmd combos that escape the app
      if (ctrl && ["r","R","w","W","t","T","n","N","l","L","u","U","s","S","p","P"].includes(e.key)) {
        e.preventDefault();
        return;
      }

      // Block Alt+F4 (Windows close), Alt+Left (back nav)
      if (e.altKey && (e.key === "F4" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", blockKeys);

    // ── Text selection ────────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.id    = "axiom-kiosk-lock";
    style.textContent = `
      body { user-select: none; -webkit-user-select: none; }
      input, textarea { user-select: text; -webkit-user-select: text; }
    `;
    document.head.appendChild(style);

    // ── Drag protection ───────────────────────────────────────────────────────
    const blockDrag = (e: DragEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (!["INPUT", "TEXTAREA"].includes(tag)) e.preventDefault();
    };
    document.addEventListener("dragstart", blockDrag);

    // ── Back/forward gesture (history navigation) ─────────────────────────────
    // Pushes a dummy state so back-swipe stays on the same page
    history.pushState(null, "", location.href);
    const blockPop = () => history.pushState(null, "", location.href);
    window.addEventListener("popstate", blockPop);

    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown",     blockKeys);
      document.removeEventListener("dragstart",   blockDrag);
      window.removeEventListener("popstate",      blockPop);
      document.getElementById("axiom-kiosk-lock")?.remove();
    };
  }, [enabled]);
}
