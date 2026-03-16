/**
 * OpenRouteService (ORS) API client.
 *
 * Runs SERVER-SIDE ONLY via the Next.js API route. The ORS_API_KEY is never
 * sent to the browser. Do not import this file from any 'use client' component.
 *
 * ORS free tier: 2,000 req/day · 40 req/min
 * Docs: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/geojson/post
 */

import { ORS_API_URL } from '@/utils/constants';
import type { Coordinate, ElevationPoint } from '@/types/geo';
import type { GeneratedRoute, RouteInstruction } from '@/types/route';
import type { ORSDirectionsResponse, ORSRouteFeature } from './types';

// Stay safely under ORS limits to avoid 429 errors
const RATE_LIMIT_PER_MINUTE = 38; // ORS allows 40
const RATE_LIMIT_PER_DAY = 1900; // ORS allows 2,000

// In-memory sliding windows — timestamps of recent requests
const minuteRequests: number[] = [];
const dayRequests: number[] = [];

/**
 * Sliding-window rate limiter. Throws before sending a request that would
 * exceed ORS quotas. Mutates the window arrays in place.
 */
function checkRateLimit(): void {
  const now = Date.now();

  // Evict timestamps that have aged out of each window
  while (minuteRequests.length > 0 && minuteRequests[0]! < now - 60_000) {
    minuteRequests.shift();
  }
  while (dayRequests.length > 0 && dayRequests[0]! < now - 86_400_000) {
    dayRequests.shift();
  }

  if (minuteRequests.length >= RATE_LIMIT_PER_MINUTE) {
    throw new ORSRateLimitError('Rate limit exceeded: too many requests per minute');
  }
  if (dayRequests.length >= RATE_LIMIT_PER_DAY) {
    throw new ORSRateLimitError('Rate limit exceeded: daily quota reached');
  }

  minuteRequests.push(now);
  dayRequests.push(now);
}

export class ORSRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ORSRateLimitError';
  }
}

export class ORSApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ORSApiError';
  }
}

/**
 * Low-level fetch wrapper. Attaches the API key, checks rate limits,
 * and normalizes errors into typed exceptions.
 */
async function fetchORS(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<ORSDirectionsResponse> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    throw new Error('ORS_API_KEY environment variable is not set');
  }

  checkRateLimit();

  const response = await fetch(`${ORS_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json, application/geo+json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new ORSApiError(`ORS API error: ${errorText}`, response.status);
  }

  return response.json() as Promise<ORSDirectionsResponse>;
}

/**
 * Converts a raw ORS GeoJSON feature into our internal GeneratedRoute shape.
 *
 * ORS returns coordinates as [lng, lat, elevation_meters] when elevation=true.
 * We walk the coordinate array to:
 *   1. Build an elevation profile with cumulative distance (Haversine formula)
 *   2. Strip elevation from the 2D geometry used by MapLibre
 *   3. Flatten segment steps into a simple instruction list
 */
function parseRouteFeature(feature: ORSRouteFeature, seed: number): GeneratedRoute {
  const coords = feature.geometry.coordinates;
  const { summary, segments, ascent, descent } = feature.properties;

  // Build elevation profile — walk coords and accumulate distance using Haversine
  let cumulativeDistance = 0;
  const elevationProfile: ElevationPoint[] = coords.map((coord, i) => {
    if (i > 0) {
      const prev = coords[i - 1]!;
      // Haversine formula: great-circle distance between two lat/lng points
      // Result is in meters (Earth radius = 6,371,000 m)
      const dlng = ((coord[0]! - prev[0]!) * Math.PI) / 180;
      const dlat = ((coord[1]! - prev[1]!) * Math.PI) / 180;
      const a =
        Math.sin(dlat / 2) ** 2 +
        Math.cos((prev[1]! * Math.PI) / 180) *
          Math.cos((coord[1]! * Math.PI) / 180) *
          Math.sin(dlng / 2) ** 2;
      cumulativeDistance += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return {
      lng: coord[0]!,
      lat: coord[1]!,
      elevation: coord[2] ?? 0, // meters; 0 fallback if ORS omits it
      distanceFromStart: cumulativeDistance,
    };
  });

  // Flatten all segment steps into a single instruction list
  const instructions: RouteInstruction[] = segments.flatMap((segment) =>
    segment.steps.map((step) => ({
      text: step.instruction,
      distance: step.distance,
      duration: step.duration,
      type: step.type,
    })),
  );

  // Extract waypoints — the coordinate index where each step ends
  const waypoints: Coordinate[] = [
    { lng: coords[0]![0]!, lat: coords[0]![1]! },
    ...segments.flatMap((segment) =>
      segment.steps
        .filter((step) => step.way_points[1] !== undefined)
        .map((step) => {
          const idx = step.way_points[1]!;
          const c = coords[idx];
          return c ? { lng: c[0]!, lat: c[1]! } : { lng: coords[0]![0]!, lat: coords[0]![1]! };
        }),
    ),
  ];

  return {
    id: `route-${seed}-${Date.now()}`,
    // 2D geometry only — MapLibre does not use the elevation coordinate
    geometry: {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords.map((c) => [c[0]!, c[1]!]),
      },
      properties: {},
    },
    distance: summary.distance, // actual meters (may differ from target by ~10%)
    duration: summary.duration, // seconds
    elevationProfile,
    ascent: ascent ?? 0, // total meters gained (used for elevation score in Phase 2)
    descent: descent ?? 0,
    bbox: [
      Math.min(...coords.map((c) => c[0]!)),
      Math.min(...coords.map((c) => c[1]!)),
      Math.max(...coords.map((c) => c[0]!)),
      Math.max(...coords.map((c) => c[1]!)),
    ],
    waypoints,
    instructions,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a single round-trip route using ORS.
 *
 * The `seed` value controls which direction ORS explores for the loop —
 * different seeds produce geometrically distinct routes from the same start
 * point and target distance. Seeds are arbitrary integers; 0, 1, 2 give
 * good variety without redundancy.
 */
export async function generateRoundTripRoute(
  start: Coordinate,
  targetDistance: number,
  seed: number = 0,
): Promise<GeneratedRoute> {
  const data = await fetchORS('/v2/directions/foot-walking/geojson', {
    coordinates: [[start.lng, start.lat]],
    elevation: 'true',
    // extra_info is returned per-segment and will feed Phase 2 scoring:
    //   steepness → elevation difficulty
    //   surface   → trail vs road vs mixed
    //   waycategory → busy road detection
    extra_info: ['steepness', 'surface', 'waycategory'],
    options: {
      round_trip: {
        length: targetDistance, // meters
        points: 3, // intermediate waypoints; 3 creates a triangular loop
        seed,
      },
    },
    instructions: true,
  });

  const feature = data.features[0];
  if (!feature) {
    throw new ORSApiError('No route returned from ORS', 404);
  }

  return parseRouteFeature(feature, seed);
}

/**
 * Generates `count` route alternatives concurrently using different seeds.
 *
 * Uses Promise.allSettled so a single ORS failure doesn't kill all routes —
 * if 1 of 3 requests fails, we return the 2 that succeeded. Only throws
 * if every request fails.
 */
export async function generateMultipleRoutes(
  start: Coordinate,
  targetDistance: number,
  count: number = 3,
): Promise<GeneratedRoute[]> {
  // Seeds 0..count-1 give distinct route shapes
  const promises = Array.from({ length: count }, (_, i) =>
    generateRoundTripRoute(start, targetDistance, i),
  );

  const results = await Promise.allSettled(promises);

  const routes: GeneratedRoute[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      routes.push(result.value);
    }
  }

  if (routes.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected');
    if (firstError && firstError.status === 'rejected') {
      throw firstError.reason;
    }
    throw new ORSApiError('No routes could be generated', 500);
  }

  return routes;
}
