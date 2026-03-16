/**
 * POST /api/routes/generate
 *
 * Receives a start coordinate and target distance from the browser,
 * calls ORS server-side (key never leaves the server), and returns
 * an array of GeneratedRoute objects.
 *
 * Error codes:
 *   400 — invalid request body (Zod validation failed)
 *   429 — ORS rate limit reached
 *   502 — ORS API error (bad gateway)
 *   500 — unexpected server error
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateMultipleRoutes,
  ORSRateLimitError,
  ORSApiError,
} from '@/services/openrouteservice/client';
import { generateRouteSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input before touching any external service
    const parsed = generateRouteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { start, targetDistance, alternatives } = parsed.data;

    // Calls ORS `alternatives` times concurrently with different seed values
    const routes = await generateMultipleRoutes(start, targetDistance, alternatives);

    return NextResponse.json({ routes });
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
