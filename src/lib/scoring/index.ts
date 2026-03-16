/**
 * Scoring orchestrator — takes a single GeneratedRoute + Overpass data and
 * returns a complete RouteScore.
 *
 * Called server-side from the API route after ORS + Overpass data is fetched.
 * The `overall` score is also recalculated client-side whenever preferences change
 * (using calculateOverall directly from the Zustand store action).
 */

import type { Feature, LineString } from 'geojson';
import type { GeneratedRoute, RouteScore, RoutePreferences } from '@/types/route';
import type { OverpassData } from '@/services/overpass/types';
import { scoreFlatness, scoreHealth } from './elevation';
import { scoreSafety } from './intersections';
import { scoreSidewalk } from './sidewalk';
import { calculateOverall } from './composite';
import { DEFAULT_PREFERENCES } from '@/types/route';

/**
 * Scores a single route against Overpass data.
 *
 * @param route         The generated route from ORS
 * @param overpassData  Parsed Overpass response, or null if Overpass failed
 * @param prefs         Preference weights for the overall composite (defaults used server-side)
 */
export function scoreRoute(
  route: GeneratedRoute,
  overpassData: OverpassData | null,
  prefs: RoutePreferences = DEFAULT_PREFERENCES,
): RouteScore {
  // Extract the 2D route geometry for turf operations
  const routeLine = route.geometry as Feature<LineString>;

  // Elevation-based scores — always available (ORS data)
  const flatness = scoreFlatness(route.ascent, route.distance);
  const health = scoreHealth(route.ascent, route.distance);

  // Overpass-based scores — -1 sentinel if data unavailable
  const safety = scoreSafety(overpassData?.crossingNodes ?? null, routeLine, route.distance);
  const sidewalkCoverage = scoreSidewalk(overpassData?.sidewalkWays ?? null, routeLine);

  const partial = { flatness, health, safety, sidewalkCoverage, scenic: -1 };
  const overall = calculateOverall(partial, prefs);

  return { overall, ...partial };
}

// Re-export individual scorers and composite for direct use (e.g. client-side recalc)
export { scoreFlatness, scoreHealth } from './elevation';
export { scoreSafety } from './intersections';
export { scoreSidewalk } from './sidewalk';
export { calculateOverall } from './composite';
