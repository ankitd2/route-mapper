import type { Feature, LineString } from 'geojson';
import type { Coordinate, ElevationPoint } from './geo';

/** Input to the /api/routes/generate endpoint */
export interface RouteRequest {
  start: Coordinate;
  targetDistance: number; // meters — ORS target, actual may differ ±10%
  alternatives?: number; // how many routes to generate (default 3, max 5)
}

/**
 * User-adjustable scoring weights (Phase 2).
 * Each value is 0–1; weights are normalized to sum to 1.0 before scoring.
 * Stored per-user in Phase 3 (database).
 */
export interface RoutePreferences {
  scenicWeight: number; // prefer parks, nature, waterways
  flatnessWeight: number; // prefer low elevation gain
  sidewalkWeight: number; // prefer routes with sidewalk coverage
  avoidBusyRoads: boolean; // penalize routes using high-traffic roads
}

/** A single generated route as returned by ORS and parsed by our client */
export interface GeneratedRoute {
  id: string;
  geometry: Feature<LineString>; // 2D GeoJSON for MapLibre rendering
  distance: number; // actual meters (from ORS summary)
  duration: number; // estimated seconds at walking pace
  elevationProfile: ElevationPoint[]; // one point per ORS coordinate, with cumulative distance
  ascent: number; // total meters gained (used in elevation score)
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
 * Per-dimension route scores (Phase 2).
 * All values 0–100 where 100 is best for a walker/runner.
 *
 * Scoring formulas (see docs/DEVELOPER.md for full detail):
 *   elevation    = max(0, 100 - gainPerMile × 2)
 *   intersections = max(0, 100 - crossingsPerMile × 5)
 *   sidewalk     = (coveredMeters / totalMeters) × 100
 *   scenic       = OSM natural/park feature density near route (0–100)
 *   overall      = weighted average using RoutePreferences weights
 */
export interface RouteScore {
  overall: number; // composite weighted score
  elevation: number; // flatness: 100 = no gain, 0 = very hilly
  intersections: number; // safety: 100 = no crossings, 0 = many crossings
  sidewalkCoverage: number; // 100 = full sidewalk, 0 = no sidewalk
  scenic: number; // 100 = parks/nature throughout, 0 = urban only
}

/** A GeneratedRoute enriched with Phase 2 scoring data */
export interface ScoredRoute extends GeneratedRoute {
  score: RouteScore;
}
