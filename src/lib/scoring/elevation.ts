/**
 * Elevation-based scoring — pure functions, no network calls.
 * Both scores derive from ORS `ascent` and `distance` which are always available.
 *
 * Flatness and Health are intentional opposites:
 *   - A casual walker wants HIGH flatness, LOW health (easy route)
 *   - A runner training wants LOW flatness, HIGH health (challenging route)
 * The preference sliders let users express this trade-off explicitly.
 */

const METERS_PER_FOOT = 0.3048;
const METERS_PER_MILE = 1609.344;

/** Convert meters of ascent and distance to feet-gained-per-mile */
function gainFeetPerMile(ascentMeters: number, distanceMeters: number): number {
  if (distanceMeters <= 0) return 0;
  const ascentFeet = ascentMeters / METERS_PER_FOOT;
  const distanceMiles = distanceMeters / METERS_PER_MILE;
  return ascentFeet / distanceMiles;
}

/**
 * Flatness score — how easy the route is elevation-wise.
 * 100 = perfectly flat. Decreases linearly with gain per mile.
 *
 * Formula: max(0, 100 − gainFt/mi × 1.5)
 * Examples (Boston context):
 *   0 ft/mi   → 100 (Esplanade, flat path)
 *   33 ft/mi  →  50 (gentle rolling hills)
 *   67+ ft/mi →   0 (significant climbing)
 */
export function scoreFlatness(ascentMeters: number, distanceMeters: number): number {
  const gain = gainFeetPerMile(ascentMeters, distanceMeters);
  return Math.max(0, 100 - gain * 1.5);
}

/**
 * Health score — workout quality / calorie burn potential.
 * 20 baseline because any walking has health benefit (never 0).
 * 100 = highly challenging route with significant elevation.
 *
 * Formula: min(100, 20 + gainFt/mi × 1.2)
 * Examples:
 *   0 ft/mi   →  20 (flat but still healthy walking)
 *   50 ft/mi  →  80 (good cardio workout)
 *   67+ ft/mi → 100 (hilly, max calorie burn)
 */
export function scoreHealth(ascentMeters: number, distanceMeters: number): number {
  const gain = gainFeetPerMile(ascentMeters, distanceMeters);
  return Math.min(100, 20 + gain * 1.2);
}
