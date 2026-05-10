/**
 * useSovereignSocket — listens for SOVEREIGN_GLOBAL_DISRUPTION events broadcast
 * by the API server and acts on them instantly on this kiosk.
 *
 * Mount once inside SubPageProviders via <SovereignSocketBridge />.
 * The hook is self-cleaning — it removes its listener on unmount.
 *
 * Commands arrive pre-authenticated from the server. We pass a hold duration
 * of 2001 ms — just above the 2 s threshold — to satisfy validateCommand()
 * without requiring physical interaction on the receiving device.
 *
 * Handled commands:
 *   BLACKOUT — body filter freeze + titan-blackout-active class
 *   API_LOCK — reserved for future API suspension overlay
 *   PURGE    — hard-navigates to /portal (clears all in-memory state)
 *
 * 5.2.0: event renamed SOVEREIGN_GLOBAL_COMMAND → SOVEREIGN_GLOBAL_DISRUPTION
 */

import { useEffect }         from "react";
import { socket }            from "@/lib/socket";
import { TitanNervousSystem } from "@/lib/titanNervousSystem";

interface SovereignGlobalDisruption {
  type:      "BLACKOUT" | "API_LOCK" | "PURGE";
  timestamp: number;
  origin:    string;
  mode:      string;
}

/** Hold value that satisfies validateCommand() on receiving kiosks (2001 ≥ 2000). */
const SERVER_PREAUTH_HOLD = 2001;

export function useSovereignSocket(): void {
  useEffect(() => {
    function onDisruption(cmd: SovereignGlobalDisruption): void {
      if (cmd.type === "BLACKOUT" || cmd.type === "API_LOCK") {
        // Server-authenticated — passes validateCommand with SERVER_PREAUTH_HOLD
        void TitanNervousSystem.executeGlobalCommand(cmd.type, SERVER_PREAUTH_HOLD);
      }
      if (cmd.type === "PURGE") {
        // Hard redirect — clears React tree, session state, and in-flight requests
        window.location.href = "/portal";
      }
    }

    socket.on("SOVEREIGN_GLOBAL_DISRUPTION", onDisruption);
    return () => { socket.off("SOVEREIGN_GLOBAL_DISRUPTION", onDisruption); };
  }, []);
}
