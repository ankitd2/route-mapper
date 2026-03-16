/**
 * Overpass API client — server-side only.
 *
 * Overpass API is a free, public OpenStreetMap query service. No API key required.
 * Be respectful: we make exactly one request per user route-generation action,
 * covering all 3 routes with a single combined bbox query.
 *
 * Docs: https://overpass-api.de / https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import { buildScoringQuery, combineBBoxes, type BBoxParams } from './queries';
import type { OverpassResponse, OverpassData, OverpassNode, OverpassWay } from './types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/** Max wait time for Overpass — generous since it can be slow under load */
const TIMEOUT_MS = 30_000;

export class OverpassError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'OverpassError';
  }
}

/**
 * Fetches raw Overpass data for a combined bbox.
 * Retries once on 429 (rate limited) or 503 (server overloaded) after a short delay.
 */
async function fetchOverpass(query: string, attempt = 1): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Identify ourselves — good practice for public APIs
        'User-Agent': 'RouteMapper/1.0 (health-fitness route app)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Retry once on rate limit or server overload
    if ((response.status === 429 || response.status === 503) && attempt === 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchOverpass(query, 2);
    }

    if (!response.ok) {
      throw new OverpassError(`Overpass API error: HTTP ${response.status}`, response.status);
    }

    return response.json() as Promise<OverpassResponse>;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof OverpassError) throw err;
    // AbortError = timeout
    throw new OverpassError(
      err instanceof Error && err.name === 'AbortError'
        ? 'Overpass API timed out'
        : `Overpass fetch failed: ${String(err)}`,
    );
  }
}

/**
 * Separates the raw Overpass response elements into typed buckets for use
 * by the scoring functions.
 *
 * Crossing nodes: `highway=crossing` — pedestrian road crossings
 * Sidewalk ways:  `footway=sidewalk` or `sidewalk=left|right|both` on roads
 */
function parseOverpassResponse(data: OverpassResponse): OverpassData {
  const crossingNodes: OverpassNode[] = [];
  const sidewalkWays: OverpassWay[] = [];

  for (const el of data.elements) {
    if (el.type === 'node') {
      crossingNodes.push(el as OverpassNode);
    } else if (el.type === 'way') {
      sidewalkWays.push(el as OverpassWay);
    }
  }

  return { crossingNodes, sidewalkWays };
}

/**
 * Main entry point. Fetches Overpass data for the combined bbox of all routes
 * and returns it parsed and ready for the scoring functions.
 *
 * Returns null on failure so callers can degrade gracefully — scoring functions
 * return -1 sentinels when Overpass data is unavailable, and the UI shows "—".
 */
export async function fetchOverpassData(
  bboxes: Array<[number, number, number, number]>,
): Promise<OverpassData | null> {
  try {
    const combined: BBoxParams = combineBBoxes(bboxes);
    const query = buildScoringQuery(combined);
    const raw = await fetchOverpass(query);
    return parseOverpassResponse(raw);
  } catch (err) {
    // Log for server-side debugging but don't propagate — scoring degrades gracefully
    console.warn('Overpass fetch failed (scoring will use -1 sentinels):', err);
    return null;
  }
}
