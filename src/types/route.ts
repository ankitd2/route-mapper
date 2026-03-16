import type { Feature, LineString } from 'geojson';
import type { Coordinate, ElevationPoint } from './geo';

/** Input to the /api/routes/generate endpoint */
export interface RouteRequest {
  start: Coordinate;
  targetDistance: number; // meters — ORS target, actual may differ ±10%
  alternatives?: number; // how many routes to generate (default 3, max 5)
}

/**
 * User-adjustable scoring weights.
 * Values are integers 0–10 (user-facing); normalized to sum 1.0 internally before scoring.
 * scenicWeight is reserved but ignored in the composite until Phase 4.
 * Persisted to localStorage via Zustand persist middleware.
 */
export interface RoutePreferences {
  flatnessWeight: number; // prefer low elevation gain (casual walkers, recovery)
  healthWeight: number; // prefer elevation challenge (workout quality, calorie burn)
  safetyWeight: number; // prefer fewer road crossings
  sidewalkWeight: number; // prefer routes with sidewalk coverage
  scenicWeight: number; // reserved — Phase 4 (parks/nature proximity)
}

/** Default weights — equal across the 4 active dimensions */
export const DEFAULT_PREFERENCES: RoutePreferences = {
  flatnessWeight: 5,
  healthWeight: 5,
  safetyWeight: 5,
  sidewalkWeight: 5,
  scenicWeight: 0, // inactive until Phase 4
};

/** A single generated route as returned by ORS and parsed by our client */
export interface GeneratedRoute {
  id: string;
  geometry: Feature<LineString>; // 2D GeoJSON for MapLibre rendering
  distance: number; // actual meters (from ORS summary)
  duration: number; // estimated seconds at walking pace
  elevationProfile: ElevationPoint[]; // one point per ORS coordinate, with cumulative distance
  ascent: number; // total meters gained
  descent: number; // total meters lost
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  waypoints: Coordinate[]; // key turn points along the route
  instructions: RouteInstruction[]; // turn-by-turn text directions
  createdAt: string; // ISO timestamp
}

/** A single turn-by-turn instruction from ORS */
export interface RouteInstruction {
  text: string; // human-readable, e.g. "Turn left onto Main St"
  distance: number; // meters until next instruction
  duration: number; // seconds until next instruction
  type: number; // ORS instruction type code (0=left, 1=right, 11=straight, etc.)
}

/**
 * Per-dimension route scores. All active values 0–100 where 100 is best.
 * -1 is a sentinel meaning "not calculated" — used when Overpass data is unavailable
 * or when a dimension is deferred (scenic). calculateOverall() skips -1 values
 * and normalizes remaining weights to 1.0 automatically.
 *
 * Formulas (full detail in docs/DEVELOPER.md):
 *   flatness  = max(0, 100 − gainFt/mi × 1.5)        always available (ORS data)
 *   health    = min(100, 20 + gainFt/mi × 1.2)        always available (ORS data)
 *   safety    = max(0, 100 − crossings/mi × 8)        requires Overpass
 *   sidewalk  = samplesWithin15m / totalSamples × 100  requires Overpass
 *   scenic    = -1 sentinel until Phase 4
 *   overall   = Σ(score_i × normalizedWeight_i), client-calculated
 */
export interface RouteScore {
  overall: number; // composite weighted score, recalculated client-side
  flatness: number; // 100 = perfectly flat, 0 = very hilly
  health: number; // 100 = maximum workout challenge, 20 = flat baseline
  safety: number; // 100 = no road crossings, 0 = frequent crossings
  sidewalkCoverage: number; // 100 = full sidewalk coverage, 0 = none
  scenic: number; // -1 until Phase 4
}

/** A GeneratedRoute enriched with Phase 2 scoring data */
export interface ScoredRoute extends GeneratedRoute {
  score: RouteScore;
}
