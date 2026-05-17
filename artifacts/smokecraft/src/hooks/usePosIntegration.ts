/**
 * usePosIntegration
 *
 * Manages the bridge between the POS layer and the EAT (Environment, Asset,
 * Transactions) management command deck.
 *
 * Responsibilities:
 *   • Guest session snapshot persistence — saves the active guest journey
 *     path to sessionStorage before staff enters EAT mode, enabling a clean
 *     "Resume Guest Journey" handoff when staff exits.
 *   • EAT mode trigger — dispatches the "eat:enter" CustomEvent that the
 *     EATTransitionOverlay listens for to begin the cinematic handoff sequence.
 *   • Session restoration — provides a typed interface for reading and
 *     clearing the saved guest path from sessionStorage.
 */

import { useCallback } from "react";

const EAT_RESUME_KEY = "eat_guest_resume";

export interface PosIntegrationHandle {
  /**
   * Snapshot the current guest journey path so staff can return to it later.
   * @param path  The URL pathname to persist (e.g. "/craft-hub" or "/experience/smoke").
   */
  saveGuestSnapshot: (path: string) => void;

  /**
   * Read the cached guest journey path. Returns null if none is stored.
   */
  getGuestResumePath: () => string | null;

  /**
   * Clear the cached guest journey snapshot (call after resuming).
   */
  clearGuestSnapshot: () => void;

  /**
   * Dispatch the "eat:enter" window CustomEvent to trigger the cinematic
   * EAT transition overlay (Stage 1–4 handoff sequence).
   */
  triggerEATMode: () => void;
}

export function usePosIntegration(): PosIntegrationHandle {
  const saveGuestSnapshot = useCallback((path: string) => {
    try { sessionStorage.setItem(EAT_RESUME_KEY, path); } catch { /* ignore */ }
  }, []);

  const getGuestResumePath = useCallback((): string | null => {
    try { return sessionStorage.getItem(EAT_RESUME_KEY); } catch { return null; }
  }, []);

  const clearGuestSnapshot = useCallback(() => {
    try { sessionStorage.removeItem(EAT_RESUME_KEY); } catch { /* ignore */ }
  }, []);

  const triggerEATMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent("eat:enter"));
  }, []);

  return { saveGuestSnapshot, getGuestResumePath, clearGuestSnapshot, triggerEATMode };
}
