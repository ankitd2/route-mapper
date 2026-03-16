# Developer Reference

## Data Flow

```
User action (click map / enter distance / press Generate)
  ↓
Zustand store (routeStore.ts) — generateRoutes()
  ↓
POST /api/routes/generate  (browser → Next.js server)
  ↓
Zod validation (schemas.ts)
  ↓
generateMultipleRoutes() — 3 concurrent ORS requests (seeds 0, 1, 2)
  ↓
ORS API: POST /v2/directions/foot-walking/geojson
  ↓
parseRouteFeature() — extracts elevation profile, instructions, waypoints
  ↓
{ routes: GeneratedRoute[] } → browser
  ↓
Zustand store updated → React re-renders map + sidebar
```

## API Reference

### OpenRouteService (ORS)

**Endpoint:** `POST https://api.openrouteservice.org/v2/directions/foot-walking/geojson`
**Auth:** `Authorization: <api_key>` header
**Free tier:** 2,000 req/day · 40 req/min (we cap at 1,900/day · 38/min)
**Sign up:** https://openrouteservice.org/dev/#/login

**Request body:**

```json
{
  "coordinates": [[-71.05, 42.36]],
  "elevation": "true",
  "extra_info": ["steepness", "surface", "waycategory"],
  "options": {
    "round_trip": {
      "length": 5000,
      "points": 3,
      "seed": 0
    }
  },
  "instructions": true
}
```

Key parameters:

- `coordinates` — single point `[lng, lat]`; ORS generates a loop back to it
- `elevation: "true"` — adds a 3rd coordinate `[lng, lat, elevation_meters]` to every point
- `round_trip.length` — target distance in meters
- `round_trip.seed` — integer controlling route shape; different seeds = different routes
- `round_trip.points` — number of intermediate waypoints (3 creates a triangular-ish loop)
- `extra_info` — returns per-segment metadata: steepness class, surface type, road category

**Response (GeoJSON FeatureCollection):**

```json
{
  "features": [{
    "geometry": { "type": "LineString", "coordinates": [[lng, lat, elev], ...] },
    "properties": {
      "summary": { "distance": 5123.4, "duration": 3842.1 },
      "ascent": 42.3,
      "descent": 42.1,
      "segments": [{ "steps": [{ "instruction": "Turn left", "distance": 120, "type": 1, "way_points": [0, 8] }] }],
      "extras": { "steepness": {...}, "surface": {...}, "waycategory": {...} }
    }
  }]
}
```

`summary.distance` and `summary.duration` are the actual route values (not target). ORS approximates the target distance; actual may vary ±10%.

### OpenFreeMap (Map Tiles)

**URL:** `https://tiles.openfreemap.org/styles/liberty`
**No API key.** Serves vector tiles from OpenStreetMap data. Used by MapLibre GL for rendering.

### Overpass API _(Phase 2)_

**URL:** `https://overpass-api.de/api/interpreter`
**No API key.** Query language for OpenStreetMap data.

Example — fetch sidewalks within a bounding box:

```
[out:json];
way["footway"="sidewalk"]({{bbox}});
out geom;
```

Example — fetch intersections near a route:

```
[out:json];
node["highway"="crossing"]({{bbox}});
out;
```

Be respectful: cache results, add `User-Agent`, avoid hammering. Consider a 1s delay between queries.

### Browser Geolocation API

No account needed. User must grant permission. Used in `src/hooks/useGeolocation.ts`.

- `enableHighAccuracy: true` — uses GPS when available
- `timeout: 10000` — 10s max
- `maximumAge: 300000` — accepts cached position up to 5 min old

---

## Scoring System _(Phase 2 Design)_

All scoring produces a 0–100 value where **100 is best** for a walker/runner (flat, safe, scenic).

### Elevation Score

Measures how flat the route is. Derived from ORS `ascent` value (total meters gained).

```
gainPerMile = ascent_meters / route_miles
score = max(0, 100 - gainPerMile * 2)
```

Examples: 0 ft/mi gain → 100. 50 ft/mi gain → 100 (gentle). 150 ft/mi gain → ~9 (hilly). Capped at 0.

### Intersection Score

Measures how many road crossings interrupt the route. Fetched from Overpass.

```
crossingsPerMile = crossing_count / route_miles
score = max(0, 100 - crossingsPerMile * 5)
```

High crossings = lower score. A route with 4 crossings/mile scores 80.

### Sidewalk Coverage Score

Percentage of the route that has adjacent sidewalk coverage. Requires Overpass sidewalk geometry + Turf.js buffer intersection.

```
score = (metersWithSidewalk / totalRouteMeters) * 100
```

Implementation: Buffer the route line by 15m, intersect with sidewalk ways from Overpass, measure overlap ratio.

### Scenic Score _(Phase 3 research)_

Potential data sources (all free, varying quality):

- OSM tags: `natural=wood`, `leisure=park`, `waterway=river` — buffer + intersect with route
- OSM `landuse=grass/forest` — area coverage along route
- Street View imagery analysis — complex, likely out of scope for now

Initial implementation: count OSM natural/park features within 100m of route, normalize to 0–100.

### Overall / Composite Score

Weighted average of the four component scores. Default weights:

```
overall = (elevation × 0.30) + (intersections × 0.25) + (sidewalk × 0.25) + (scenic × 0.20)
```

These weights will be exposed as user preferences (`RoutePreferences` in `src/types/route.ts`). A user who wants a flat run raises `flatnessWeight`; one who wants a scenic stroll raises `scenicWeight`. The weights are normalized to sum to 1.0 before calculating.

### Implementation Location

All scoring logic goes in `src/lib/scoring/` as pure functions with no network calls. Network calls (Overpass queries) go in `src/services/overpass/`. The API route (`src/app/api/routes/generate/route.ts`) orchestrates: generate routes via ORS → fetch enrichment data via Overpass → score each route → return `ScoredRoute[]`.

---

## Security

- `ORS_API_KEY` is only ever read in `src/services/openrouteservice/client.ts`, which runs server-side only
- Zod validates all API input before it touches any service
- Security headers set in `next.config.ts`: `X-Frame-Options`, CSP, `Permissions-Policy: geolocation=(self)`
- Geolocation is requested lazily (only when user clicks "Use Current Location"), never on page load

---

## Testing

```bash
npm test              # run all tests
npm test -- --watch   # watch mode
```

Tests live in `src/**/*.test.ts`. The scoring functions in `src/lib/scoring/` should have full unit test coverage — they are pure functions with no side effects, making them easy to test.

Test utilities: Vitest + Testing Library + jsdom. Setup in `src/test/setup.ts`.
