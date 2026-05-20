/**
 * GuestAmbientOverlay — persistent warm amber vignette over all guest routes.
 *
 * Applies dark obsidian edges + a subtle warm amber glow toward the center-bottom.
 * Communicates private lounge atmosphere throughout the entire guest journey.
 * Mounted in SubPageProviders — never unmounts.
 */

export default function GuestAmbientOverlay() {
  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        pointerEvents: "none",
        zIndex:        2,
        background: [
          /* Warm amber heat rising from bottom-center — simulates lounge light source */
          "radial-gradient(ellipse 88% 62% at 50% 100%, rgba(200,134,10,0.095) 0%, transparent 60%)",
          /* Left wall depth — obsidian dark edge */
          "radial-gradient(ellipse 52% 100% at 0% 50%, rgba(4,2,0,0.60) 0%, transparent 52%)",
          /* Right wall depth */
          "radial-gradient(ellipse 52% 100% at 100% 50%, rgba(4,2,0,0.56) 0%, transparent 52%)",
          /* Ceiling vignette — heavy, cinematic */
          "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(4,2,0,0.68) 0%, transparent 52%)",
          /* Floor vignette */
          "radial-gradient(ellipse 100% 42% at 50% 100%, rgba(4,2,0,0.50) 0%, transparent 56%)",
        ].join(", "),
      }}
    />
  );
}
