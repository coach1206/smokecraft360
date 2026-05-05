/**
 * Craft scoring engine — deterministic weighted formula.
 *
 * Derived from the Master System Prompt specification.
 * Used by POST /api/craft/score and internally for leaderboard ranking.
 */

export type BuildInput = {
  strength:     number;
  flavorMatch:  number;
  balance:      number;
  finish:       number;
  timeTaken:    number;
  converted:    boolean;
};

export function scoreBuild(input: BuildInput) {
  const quality     = (input.strength + input.flavorMatch) / 2;
  const consistency = (input.balance  + input.finish)      / 2;

  const speedScore =
    input.timeTaken < 600  ? 5 :
    input.timeTaken < 1200 ? 3 : 1;

  const conversionScore = input.converted ? 5 : 2;

  const finalScore =
    quality           * 0.4 +
    input.balance     * 0.2 +
    consistency       * 0.2 +
    speedScore        * 0.1 +
    conversionScore   * 0.1;

  let feedback = "";
  if      (finalScore < 2.5) feedback = "Weak blend. Structure missing.";
  else if (finalScore < 3.5) feedback = "Close. Pairing is off.";
  else if (finalScore < 4.5) feedback = "Strong build. Refine finish.";
  else                        feedback = "Elite blend. Feature-worthy.";

  return {
    score:    Number(finalScore.toFixed(2)),
    feedback,
  };
}
