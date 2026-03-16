/**
 * Composite score calculator — combines component scores using user preference weights.
 *
 * Key behaviors:
 *   - Scores of -1 are sentinels meaning "data unavailable" — they are EXCLUDED
 *     from the weighted average and their weights redistributed to available scores.
 *   - Weights are integers 0–10 from RoutePreferences; normalized to sum 1.0 here.
 *   - scenicWeight is accepted but ignored until Phase 4 (scenic score always -1).
 *   - Result is rounded to the nearest integer (0–100).
 */

import type { RouteScore, RoutePreferences } from '@/types/route';

/** Rounding helper for display-ready scores */
function round(value: number): number {
  return Math.round(value);
}

/**
 * Calculates the weighted composite score from the 4 component scores.
 *
 * Any component with score === -1 is skipped; remaining weights are normalized
 * so they still sum to 1.0. If ALL components are -1, returns 0.
 *
 * Called both server-side (with default prefs) and client-side (when user
 * adjusts preference sliders — instant re-sort without a new API call).
 */
export function calculateOverall(
  scores: Omit<RouteScore, 'overall'>,
  prefs: RoutePreferences,
): number {
  // Map each active dimension to its score and weight
  const dimensions: Array<{ score: number; weight: number }> = [
    { score: scores.flatness, weight: prefs.flatnessWeight },
    { score: scores.health, weight: prefs.healthWeight },
    { score: scores.safety, weight: prefs.safetyWeight },
    { score: scores.sidewalkCoverage, weight: prefs.sidewalkWeight },
    // scenic excluded until Phase 4 (score is always -1)
  ];

  // Filter out unavailable scores (-1 sentinel)
  const available = dimensions.filter((d) => d.score >= 0);
  if (available.length === 0) return 0;

  // Normalize weights so they sum to 1.0 across available dimensions
  const totalWeight = available.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) {
    // All weights are 0 — equal weighting fallback
    const equalWeight = 1 / available.length;
    return round(available.reduce((sum, d) => sum + d.score * equalWeight, 0));
  }

  const weighted = available.reduce((sum, d) => sum + d.score * (d.weight / totalWeight), 0);
  return round(weighted);
}
