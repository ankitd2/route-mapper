/**
 * POST /api/routes/generate
 *
 * Pipeline:
 *   1. Validate input (Zod)
 *   2. Generate routes via ORS (3 concurrent requests with different seeds)
 *   3. Fetch Overpass data for the combined route bbox (crossings + sidewalks)
 *   4. Score each route → ScoredRoute[]
 *   5. Sort by overall score descending
 *   6. Return to client — client recalculates overall when preferences change
 *
 * Error codes:
 *   400 — invalid request body
 *   429 — ORS rate limit reached
 *   502 — ORS API error
 *   500 — unexpected server error
 *
 * Overpass failures degrade gracefully: routes are still returned with
 * elevation-based scores; safety/sidewalk show as -1 (UI displays "—").
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateMultipleRoutes,
  ORSRateLimitError,
  ORSApiError,
} from '@/services/openrouteservice/client';
import { fetchOverpassData } from '@/services/overpass/client';
import { scoreRoute } from '@/lib/scoring';
import { generateRouteSchema } from '@/lib/validation/schemas';
import type { ScoredRoute } from '@/types/route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate all input before touching any external service
    const parsed = generateRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { start, targetDistance, alternatives, preferences } = parsed.data;

    // Step 1: Generate routes from ORS (concurrent, different seeds → different shapes)
    const routes = await generateMultipleRoutes(start, targetDistance, alternatives);

    // Step 2: Fetch Overpass data for all routes in a single combined bbox query.
    // Returns null on failure — scoreRoute handles null gracefully with -1 sentinels.
    const overpassData = await fetchOverpassData(routes.map((r) => r.bbox));

    // Step 3: Score each route. overall is set here but client recalculates it
    // instantly when the user adjusts preference sliders.
    const scoredRoutes: ScoredRoute[] = routes.map((route) => ({
      ...route,
      score: scoreRoute(route, overpassData, preferences),
    }));

    // Step 4: Sort best-first by overall score
    scoredRoutes.sort((a, b) => b.score.overall - a.score.overall);

    return NextResponse.json({ routes: scoredRoutes });
  } catch (error) {
    if (error instanceof ORSRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof ORSApiError) {
      return NextResponse.json(
        { error: 'Routing service error', details: error.message },
        { status: 502 },
      );
    }

    console.error('Route generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
