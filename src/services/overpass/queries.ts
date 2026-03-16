/**
 * Overpass QL query builders.
 *
 * All queries use a single combined bbox covering all routes in a generation
 * request, padded by BBOX_PADDING_DEG to catch features just outside route edges.
 *
 * One query fetches all data needed for scoring (crossings + sidewalks) so we
 * only make one request to Overpass per user action — being respectful to the
 * free public API.
 */

/** ~200 meters of padding around the route bbox in degrees (~0.002° ≈ 222m) */
const BBOX_PADDING_DEG = 0.002;

export interface BBoxParams {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/**
 * Pads the bbox by BBOX_PADDING_DEG on all sides so features at the route
 * edge are included. Returns Overpass bbox format: (south,west,north,east).
 */
function buildBBoxString(bbox: BBoxParams): string {
  const south = (bbox.minLat - BBOX_PADDING_DEG).toFixed(6);
  const west = (bbox.minLng - BBOX_PADDING_DEG).toFixed(6);
  const north = (bbox.maxLat + BBOX_PADDING_DEG).toFixed(6);
  const east = (bbox.maxLng + BBOX_PADDING_DEG).toFixed(6);
  return `${south},${west},${north},${east}`;
}

/**
 * Builds a single Overpass QL query fetching everything needed for Phase 2 scoring:
 *   - highway=crossing nodes  → safety score
 *   - footway=sidewalk ways   → sidewalk coverage score
 *   - sidewalk=left|right|both tagged roads → also counts as sidewalk coverage
 *
 * `out geom` returns full geometry (lat/lng per node) on ways, required for
 * turf.nearestPointOnLine proximity calculations.
 */
export function buildScoringQuery(bbox: BBoxParams): string {
  const bb = buildBBoxString(bbox);
  return `[out:json][timeout:25];
(
  node["highway"="crossing"](${bb});
  way["footway"="sidewalk"](${bb});
  way["sidewalk"~"left|right|both"](${bb});
);
out geom;`;
}

/**
 * Computes a combined bbox covering all route bboxes.
 * Used so a single Overpass query covers all 3 generated routes.
 */
export function combineBBoxes(bboxes: Array<[number, number, number, number]>): BBoxParams {
  // ORS bbox format is [minLng, minLat, maxLng, maxLat]
  return {
    minLng: Math.min(...bboxes.map((b) => b[0])),
    minLat: Math.min(...bboxes.map((b) => b[1])),
    maxLng: Math.max(...bboxes.map((b) => b[2])),
    maxLat: Math.max(...bboxes.map((b) => b[3])),
  };
}
