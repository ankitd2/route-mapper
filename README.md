# Route Mapper

A health/fitness web app for generating walk and run routes from any starting point. Enter a distance (or time), pick a location, and get multiple route options scored by elevation, safety, and scenery.

**Current status:** Phase 1 complete — route generation working. See [`docs/PHASES.md`](docs/PHASES.md).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your ORS API key (free at openrouteservice.org)
cp .env.example .env.local
# edit .env.local → ORS_API_KEY=your_key_here

# 3. Run dev server (no other servers needed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The map defaults to Boston.

```bash
npm run build    # production build + type-check
npm test         # run unit tests
npm run lint     # eslint check
```

---

## APIs Used

| API                                              | Purpose                                          | Key Required                                              | Free Tier                   |
| ------------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------- | --------------------------- |
| [OpenRouteService](https://openrouteservice.org) | Route generation with elevation                  | Yes — [sign up](https://openrouteservice.org/dev/#/login) | 2,000 req/day, 40 req/min   |
| [OpenFreeMap](https://openfreemap.org)           | Map tiles (OpenStreetMap data)                   | No                                                        | Unlimited                   |
| [Overpass API](https://overpass-api.de)          | OSM data for sidewalks/intersections _(Phase 2)_ | No                                                        | Rate-limited, be respectful |
| Browser Geolocation API                          | User's current location                          | No — user consent                                         | N/A                         |

**Required accounts:** Only OpenRouteService. Sign up free → create a token → paste into `.env.local`.

---

## Tech Stack

| Layer      | Tool                       | Why                                                            |
| ---------- | -------------------------- | -------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router)    | Server-side API routes keep ORS key secret; file-based routing |
| UI         | React 19 + Tailwind CSS v4 | Component model; utility-first CSS                             |
| Map        | MapLibre GL + react-map-gl | Open-source, WebGL-rendered, no API key                        |
| State      | Zustand                    | Simple global store; no boilerplate                            |
| Geo math   | Turf.js                    | Spatial operations (buffering, distance, intersection checks)  |
| Validation | Zod                        | Runtime schema validation on API routes                        |
| Language   | TypeScript (strict)        | Catches bugs at compile time                                   |
| Testing    | Vitest + Testing Library   | Fast unit tests                                                |

---

## Project Structure

```
src/
  app/
    api/routes/generate/   ← POST /api/routes/generate (server-side, key is safe here)
    explore/               ← /explore page
    page.tsx               ← / landing page
  components/
    map/                   ← MapLibre components (client-side)
    forms/                 ← GenerateRouteForm
    route/                 ← RouteCard, RouteList
  services/
    openrouteservice/      ← ORS API client + types
  stores/
    routeStore.ts          ← Zustand global state
  types/
    geo.ts                 ← Coordinate, BBox, ElevationPoint
    route.ts               ← GeneratedRoute, RouteScore, ScoredRoute
  utils/
    constants.ts           ← API URLs, distance limits, map defaults
    format.ts              ← Imperial unit formatters (miles, feet)
  lib/
    validation/schemas.ts  ← Zod schemas for API input
  hooks/
    useGeolocation.ts      ← Browser geolocation wrapper
```

---

## Environment Variables

| Variable      | Required | Description                                             |
| ------------- | -------- | ------------------------------------------------------- |
| `ORS_API_KEY` | Yes      | OpenRouteService API key. Never exposed to the browser. |

---

## Further Reading

- [`docs/PHASES.md`](docs/PHASES.md) — Phase progress and what's next
- [`docs/DEVELOPER.md`](docs/DEVELOPER.md) — Architecture, data flow, scoring design, API details
- [`CLAUDE.md`](CLAUDE.md) — Context file for AI-assisted development
