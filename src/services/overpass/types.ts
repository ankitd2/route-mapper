/**
 * Overpass API response types.
 * https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
 *
 * We use `out geom` which returns full node coordinates for ways,
 * enabling sidewalk coverage calculations with turf.nearestPointOnLine.
 */

/** A node is a single geographic point (e.g. a road crossing) */
export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

/**
 * A way is an ordered sequence of nodes forming a line (e.g. a sidewalk segment).
 * `geometry` is present when queried with `out geom`.
 */
export interface OverpassWay {
  type: 'way';
  id: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export type OverpassElement = OverpassNode | OverpassWay;

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

/** Parsed results separated by type for use in scoring functions */
export interface OverpassData {
  crossingNodes: OverpassNode[];
  sidewalkWays: OverpassWay[];
}
