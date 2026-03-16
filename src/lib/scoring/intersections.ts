/**
 * Safety scoring — counts road crossings near the route.
 *
 * More crossings = more danger + disruption to flow (stopping, looking both ways,
 * waiting for signals). A lower crossing count per mile scores higher.
 *
 * Data source: Overpass `highway=crossing` nodes.
 * Proximity method: buffer the route line by CROSSING_BUFFER_KM, then check
 * which crossing nodes fall inside the buffer polygon using turf.
 */

import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { OverpassNode } from '@/services/overpass/types';

const METERS_PER_MILE = 1609.344;

/** Crossings within this distance of the route are counted */
const CROSSING_BUFFER_KM = 0.02; // 20 meters

/**
 * Safety score — inversely proportional to road crossings per mile.
 *
 * Formula: max(0, 100 − crossings/mi × 8)
 * Examples:
 *   0 crossings/mi  → 100 (trail with no road crossings)
 *   6 crossings/mi  →  52 (moderate urban — a crossing every few blocks)
 *  12+ crossings/mi →   4 (dense downtown grid)
 *
 * Returns -1 if crossingNodes is null (Overpass unavailable).
 */
export function scoreSafety(
  crossingNodes: OverpassNode[] | null,
  routeLine: Feature<LineString>,
  distanceMeters: number,
): number {
  // -1 sentinel: data unavailable, caller skips this in composite
  if (crossingNodes === null) return -1;
  if (distanceMeters <= 0) return 100;

  // Buffer the route line → polygon to test crossing proximity
  const buffer = turf.buffer(routeLine, CROSSING_BUFFER_KM, { units: 'kilometers' });
  if (!buffer) return 100;

  // Count crossings that fall inside the buffer
  const nearbyCrossings = crossingNodes.filter((node) => {
    const point = turf.point([node.lon, node.lat]);
    return turf.booleanPointInPolygon(point, buffer);
  });

  const distanceMiles = distanceMeters / METERS_PER_MILE;
  const crossingsPerMile = nearbyCrossings.length / distanceMiles;

  return Math.max(0, 100 - crossingsPerMile * 8);
}
