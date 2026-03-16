/**
 * GET /api/search?q={query}
 *
 * Proxies address search to Nominatim. Nominatim's usage policy requires
 * a valid User-Agent and prohibits high-volume automated requests.
 * Running through a server-side route lets us set the header and keeps
 * the browser from hitting Nominatim directly.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RouteMapper/1.0 (route-mapper-app)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 60 }, // cache for 60s — same query hits same results
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
