# Route Mapper

A health/fitness web app for generating walk and run routes from any starting point. Enter a distance, pick a location, and get up to 3 route options scored and ranked by flatness, workout quality, safety, and sidewalk coverage.

**Current status:** Phase 2 complete — route generation + scoring working. See [`docs/PHASES.md`](docs/PHASES.md).

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

Open [http://localhost:3000](http://localhost:3000). Map defaults to Boston.

```bash
npm run build    # production build + type-check
npm test         # unit tests (22 tests)
npm run lint     # eslint check
```

---

## Features

- Click the map or use GPS to set a start point
- Distance slider (0.3 mi – 31 mi)
- 3 alternative route shapes generated concurrently
- Each route scored on 4 dimensions (0–100, higher = better):
  - **FL Flatness** — how flat the route is
  - **HT Health** — elevation challenge / workout quality
  - **SF Safety** — fewer road crossings = higher score
  - **SW Sidewalk** — percentage of route with dedicated sidewalk
- **Preference sliders** — adjust weights per dimension, routes re-rank instantly (no API call)
- Preferences saved to browser storage automatically
- Elevation profile chart for the selected route
- Graceful degradation: if sidewalk/crossing data is unavailable, elevation scores still work

---

## APIs Used

| API                                              | Purpose                              | Key Required                                                   | Free Tier                 |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------- | ------------------------- |
| [OpenRouteService](https://openrouteservice.org) | Route generation with elevation      | Yes — [sign up free](https://openrouteservice.org/dev/#/login) | 2,000 req/day, 40 req/min |
| [OpenFreeMap](https://openfreemap.org)           | Map tiles (OpenStreetMap data)       | No                                                             | Unlimited                 |
| [Overpass API](https://overpass-api.de)          | Sidewalk + crossing data for scoring | No                                                             | Free, be respectful       |
| Browser Geolocation API                          | User's current location              | No — user consent                                              | N/A                       |

**Only one account needed:** OpenRouteService. Sign up free → create a token → paste into `.env.local`.

---

## Tech Stack

| Layer      | Tool                       | Why                                                    |
| ---------- | -------------------------- | ------------------------------------------------------ |
| Framework  | Next.js 15 (App Router)    | Server API routes keep ORS key secret                  |
| UI         | React 19 + Tailwind CSS v4 | Component model; utility-first CSS                     |
| Map        | MapLibre GL + react-map-gl | Open-source WebGL map, no API key                      |
| State      | Zustand (with persist)     | Simple global store; preferences saved to localStorage |
| Geo math   | Turf.js                    | Buffering, proximity checks, route sampling            |
| Validation | Zod                        | Runtime schema validation on API routes                |
| Language   | TypeScript (strict)        | Type safety across the full stack                      |
| Testing    | Vitest                     | Fast unit tests for scoring functions                  |

---

## Project Structure

```
src/
  app/api/routes/generate/   ← POST endpoint — ORS → Overpass → scoring pipeline
  components/
    forms/                   ← GenerateRouteForm + preference sliders
    map/                     ← MapLibre map + elevation chart
    route/                   ← RouteCard (score bars) + RouteList
  services/
    openrouteservice/        ← ORS client (server-side only)
    overpass/                ← Overpass client + QL query builders
  lib/
    scoring/                 ← Pure scoring functions + unit tests
    validation/              ← Zod schemas
  stores/routeStore.ts       ← Global state + instant preference re-ranking
  types/route.ts             ← ScoredRoute, RouteScore, RoutePreferences
  utils/format.ts            ← Imperial unit formatters (miles, feet)
```

---

## Environment Variables

| Variable      | Required | Description                                                    |
| ------------- | -------- | -------------------------------------------------------------- |
| `ORS_API_KEY` | Yes      | OpenRouteService key. Server-side only, never sent to browser. |

---

## Docs

- [`docs/PHASES.md`](docs/PHASES.md) — Phase progress and roadmap
- [`docs/DEVELOPER.md`](docs/DEVELOPER.md) — Data flow, API reference, scoring formulas
- [`CLAUDE.md`](CLAUDE.md) — AI context file for resuming development
