/**
 * Sidewalk coverage scoring — what percentage of the route has a nearby sidewalk.
 *
 * Method: sample the route at regular intervals (every SAMPLE_INTERVAL_M meters),
 * then for each sample point check if any sidewalk way passes within SIDEWALK_RADIUS_KM.
 * Coverage = (points with nearby sidewalk) / (total sample points) × 100.
 *
 * Data source: Overpass `footway=sidewalk` ways and roads with `sidewalk=left|right|both`.
 * Proximity tool: turf.nearestPointOnLine — finds closest point on each way geometry.
 */

import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { OverpassWay } from '@/services/overpass/types';

/** Sample a point every N meters along the route */
const SAMPLE_INTERVAL_M = 30;

/** A sidewalk within this distance of a sample point counts as "covered" */
const SIDEWALK_RADIUS_KM = 0.015; // 15 meters

/**
 * Converts an OverpassWay (with `out geom` coordinates) to a turf LineString feature.
 * Ways without geometry (shouldn't happen with `out geom` but defensive) are skipped.
 */
function wayToLineString(way: OverpassWay): Feature<LineString> | null {
  if (!way.geometry || way.geometry.length < 2) return null;
  return turf.lineString(way.geometry.map((node) => [node.lon, node.lat]));
}

/**
 * Samples points along the route every SAMPLE_INTERVAL_M meters using turf.along.
 * Returns an array of [lng, lat] turf point features.
 */
function sampleRoutePoints(routeLine: Feature<LineString>): Array<ReturnType<typeof turf.point>> {
  const routeLengthKm = turf.length(routeLine, { units: 'kilometers' });
  const intervalKm = SAMPLE_INTERVAL_M / 1000;
  const points: Array<ReturnType<typeof turf.point>> = [];

  for (let distKm = 0; distKm <= routeLengthKm; distKm += intervalKm) {
    points.push(turf.along(routeLine, distKm, { units: 'kilometers' }));
  }

  return points;
}

/**
 * Sidewalk coverage score — percentage of route with nearby sidewalk, 0–100.
 *
 * Returns -1 if sidewalkWays is null (Overpass unavailable).
 * Returns 0 if no sidewalks exist in the area (legitimately uncovered).
 */
export function scoreSidewalk(
  sidewalkWays: OverpassWay[] | null,
  routeLine: Feature<LineString>,
): number {
  // -1 sentinel: data unavailable
  if (sidewalkWays === null) return -1;

  // Convert all ways to turf line features, drop any with missing geometry
  const sidewalkLines = sidewalkWays
    .map(wayToLineString)
    .filter((line): line is Feature<LineString> => line !== null);

  if (sidewalkLines.length === 0) return 0;

  const samplePoints = sampleRoutePoints(routeLine);
  if (samplePoints.length === 0) return 0;

  // For each sample point, check if ANY sidewalk way is within SIDEWALK_RADIUS_KM
  let coveredCount = 0;
  for (const point of samplePoints) {
    const isCovered = sidewalkLines.some((line) => {
      const nearest = turf.nearestPointOnLine(line, point, { units: 'kilometers' });
      return (nearest.properties.dist ?? Infinity) <= SIDEWALK_RADIUS_KM;
    });
    if (isCovered) coveredCount++;
  }

  return (coveredCount / samplePoints.length) * 100;
}
