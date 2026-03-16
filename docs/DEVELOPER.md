# Developer Reference

## Data Flow

```
User action (click map / enter distance / press Generate)
  ↓
Zustand store → generateRoutes()
  ↓
POST /api/routes/generate  (browser → Next.js server)
  ↓
Zod validation (schemas.ts) — rejects bad input early
  ↓
generateMultipleRoutes() — 3 concurrent ORS requests (seeds 0, 1, 2)
  ↓
fetchOverpassData()  — 1 combined bbox query (crossings + sidewalks)
  ↓ [Overpass failure → null → graceful degradation, not an error]
scoreRoute() × 3  — pure functions, no network calls
  ↓
Sort ScoredRoute[] by overall score descending
  ↓
{ routes: ScoredRoute[] } → browser
  ↓
Zustand store updated → React re-renders map + sidebar

Preference slider change (no API call):
  setPreferences() → recalculate overall via calculateOverall() → re-sort → re-render
```

---

## API Reference

### OpenRouteService (ORS)

**Endpoint:** `POST https://api.openrouteservice.org/v2/directions/foot-walking/geojson`
**Auth:** `Authorization: <api_key>` header (server-side only, never exposed to browser)
**Free tier:** 2,000 req/day · 40 req/min (self-capped at 1,900/day · 38/min in `client.ts`)
**Sign up:** https://openrouteservice.org/dev/#/login

**Request body:**

```json
{
  "coordinates": [[-71.05, 42.36]],
  "elevation": "true",
  "extra_info": ["steepness", "surface", "waycategory"],
  "options": {
    "round_trip": { "length": 5000, "points": 3, "seed": 0 }
  },
  "instructions": true
}
```

Key parameters:

- `coordinates` — single `[lng, lat]`; ORS generates a loop back to start
- `elevation: "true"` — adds a 3rd coord `[lng, lat, elev_m]` to every point
- `round_trip.seed` — controls route shape; seeds 0/1/2 give 3 different routes
- `extra_info` — per-segment surface/steepness/road-category metadata (available for Phase 4)

**Response (abbreviated):**

```json
{
  "features": [{
    "geometry": { "type": "LineString", "coordinates": [[lng, lat, elev], ...] },
    "properties": {
      "summary": { "distance": 5123.4, "duration": 3842.1 },
      "ascent": 42.3, "descent": 42.1,
      "segments": [{ "steps": [{ "instruction": "Turn left", "distance": 120, "type": 1 }] }]
    }
  }]
}
```

`summary.distance` is actual meters (target ±10%). Elevation extracted via Haversine from 3D coordinates.

---

### Overpass API

**URL:** `POST https://overpass-api.de/api/interpreter`
**Auth:** None — free public API, no key required
**Docs:** https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
**Be respectful:** one query per user action, `User-Agent` header set, single combined bbox

We fetch **all scoring data in one query** per generation — crossings + sidewalks together:

```
[out:json][timeout:25];
(
  node["highway"="crossing"](south,west,north,east);
  way["footway"="sidewalk"](south,west,north,east);
  way["sidewalk"~"left|right|both"](south,west,north,east);
);
out geom;
```

`out geom` returns full `lat/lon` per node on ways — required for `turf.nearestPointOnLine`.
The bbox covers all 3 routes combined + 200m padding (`BBOX_PADDING_DEG = 0.002`).

**Response shape:**

```json
{
  "elements": [
    { "type": "node", "id": 123, "lat": 42.36, "lon": -71.05, "tags": { "highway": "crossing" } },
    { "type": "way",  "id": 456, "geometry": [{ "lat": ..., "lon": ... }], "tags": { "footway": "sidewalk" } }
  ]
}
```

Parsed in `client.ts` into `{ crossingNodes: OverpassNode[], sidewalkWays: OverpassWay[] }`.

---

### OpenFreeMap (Map Tiles)

**URL:** `https://tiles.openfreemap.org/styles/liberty`
**Auth:** None — free, no key
**Source:** OpenStreetMap data, rendered as vector tiles by MapLibre GL

---

### Browser Geolocation API

No account needed. User must grant permission. Used in `src/hooks/useGeolocation.ts`.

- `enableHighAccuracy: true` — uses GPS when available
- `timeout: 10000` — 10s max wait
- `maximumAge: 300000` — accepts cached position up to 5 min old

---

## Scoring System

All scores are integers **0–100 where 100 is best**. The value **-1 is a sentinel** meaning "data unavailable" — used when Overpass is down. `calculateOverall()` skips -1 values and re-normalizes remaining weights.

### Flatness Score

_Always available — derived from ORS data._

Measures how flat the route is. High score = good for casual walkers, recovery runs.

```
gainFtPerMile = (ascent_m / 0.3048) / (distance_m / 1609.344)
flatness = max(0, 100 − gainFtPerMile × 1.5)
```

| Gain ft/mi | Score | Example                       |
| ---------- | ----- | ----------------------------- |
| 0          | 100   | Esplanade, Charles River path |
| 33         | 50    | Gentle rolling hills          |
| 67+        | 0     | Significant climbing          |

### Health Score

_Always available — derived from ORS data._

Measures workout quality / elevation challenge. High score = good for training.

```
health = min(100, 20 + gainFtPerMile × 1.2)
```

20 is the baseline (any walking has health benefit). Flatness and Health are **intentional opposites** — preference sliders let users express their trade-off.

| Gain ft/mi | Score |
| ---------- | ----- |
| 0          | 20    |
| 50         | 80    |
| 67+        | 100   |

### Safety Score

_Requires Overpass data. Returns -1 if Overpass is unavailable._

Fewer road crossings = safer, less interrupted run. Crossings within 20m of the route are counted.

```
crossingsPerMile = nearby_crossing_count / (distance_m / 1609.344)
safety = max(0, 100 − crossingsPerMile × 8)
```

| Crossings/mi | Score |
| ------------ | ----- |
| 0            | 100   |
| 6            | 52    |
| 12+          | ~4    |

### Sidewalk Coverage Score

_Requires Overpass data. Returns -1 if Overpass is unavailable._

Percentage of the route that has a nearby sidewalk. Samples the route every 30m, checks if any sidewalk way is within 15m.

```
coverage = (sample_points_with_nearby_sidewalk / total_sample_points) × 100
```

### Overall / Composite Score

Weighted average of available component scores. Weights are user-facing integers 0–10, normalized to sum 1.0 before calculation.

```
available = [d for d in dimensions if d.score != -1]
totalWeight = sum(d.weight for d in available)
overall = round(sum(d.score × d.weight/totalWeight for d in available))
```

If all weights are 0, falls back to equal weighting. If all scores are -1, returns 0.

**Recalculation:** The server calculates component scores (flatness, health, safety, sidewalk). `overall` is recalculated **client-side** in `setPreferences()` whenever sliders change — no API call needed.

---

## Security

- `ORS_API_KEY` only read in `src/services/openrouteservice/client.ts` (server-side only)
- Zod validates all API input before any service call
- Security headers in `next.config.ts`: `X-Frame-Options`, CSP, `Permissions-Policy: geolocation=(self)`
- Geolocation requested lazily (user click only), never on page load
- Overpass gets a descriptive `User-Agent` header — good practice for free public APIs

---

## Testing

```bash
npm test              # run all tests once
npm test -- --watch   # watch mode during development
```

Tests live alongside source in `src/**/*.test.ts`. Current coverage:

| File                              | Tests                                             |
| --------------------------------- | ------------------------------------------------- |
| `src/lib/scoring/scoring.test.ts` | 22 tests — elevation, safety, sidewalk, composite |

Scoring functions are pure (no network, no side effects) → easy to test exhaustively. New scoring dimensions should have tests before wiring into the API route.
