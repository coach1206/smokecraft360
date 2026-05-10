/**
 * useSovereignSocket — listens for SOVEREIGN_COMMAND events emitted by the API
 * server and acts on them instantly on this kiosk.
 *
 * Mount once inside SubPageProviders via <SovereignSocketBridge />.
 * The hook is self-cleaning — it removes its listener on unmount.
 *
 * Handled commands:
 *   BLACKOUT — calls TitanNervousSystem.override('BLACKOUT') → body filter freeze
 *   PURGE    — hard-navigates to /portal (clears all in-memory state)
 *   API_LOCK — calls TitanNervousSystem.override('API_LOCK') for future use
 */

import { useEffect } from "react";
import { socket }              from "@/lib/socket";
import { TitanNervousSystem }  from "@/lib/titanNervousSystem";

interface SovereignCommand {
  type:           "BLACKOUT" | "API_LOCK" | "PURGE";
  timestamp?:     number;
  authorityLevel?: string;
}

export function useSovereignSocket(): void {
  useEffect(() => {
    function onCommand(cmd: SovereignCommand): void {
      if (cmd.type === "BLACKOUT") {
        TitanNervousSystem.override("BLACKOUT");
      }
      if (cmd.type === "API_LOCK") {
        TitanNervousSystem.override("API_LOCK");
      }
      if (cmd.type === "PURGE") {
        // Hard redirect — clears React tree, session state, and in-flight requests
        window.location.href = "/portal";
      }
    }

    socket.on("SOVEREIGN_COMMAND", onCommand);
    return () => { socket.off("SOVEREIGN_COMMAND", onCommand); };
  }, []);
}
