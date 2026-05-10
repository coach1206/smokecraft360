/**
 * useSovereignSocket — listens for SOVEREIGN_GLOBAL_COMMAND events broadcast
 * by the API server and acts on them instantly on this kiosk.
 *
 * Mount once inside SubPageProviders via <SovereignSocketBridge />.
 * The hook is self-cleaning — it removes its listener on unmount.
 *
 * Socket commands are pre-authenticated server-side, so holdTime is passed
 * as PREAUTH_HOLD (Infinity) to bypass the dual-stage safety lock.
 *
 * Handled commands:
 *   BLACKOUT — body filter freeze + titan-blackout-active class
 *   API_LOCK — reserved for future API suspension overlay
 *   PURGE    — hard-navigates to /portal (clears all in-memory state)
 */

import { useEffect }            from "react";
import { socket }               from "@/lib/socket";
import { TitanNervousSystem, PREAUTH_HOLD } from "@/lib/titanNervousSystem";

interface SovereignGlobalCommand {
  type:            "BLACKOUT" | "API_LOCK" | "PURGE";
  venueId?:        string;
  timestamp?:      number;
  authorityLevel?: string;
}

export function useSovereignSocket(): void {
  useEffect(() => {
    function onCommand(cmd: SovereignGlobalCommand): void {
      if (cmd.type === "BLACKOUT" || cmd.type === "API_LOCK") {
        // Server-authenticated — bypass the 2 s hold requirement
        void TitanNervousSystem.override(cmd.type, PREAUTH_HOLD);
      }
      if (cmd.type === "PURGE") {
        // Hard redirect — clears React tree, session state, and in-flight requests
        window.location.href = "/portal";
      }
    }

    socket.on("SOVEREIGN_GLOBAL_COMMAND", onCommand);
    return () => { socket.off("SOVEREIGN_GLOBAL_COMMAND", onCommand); };
  }, []);
}
