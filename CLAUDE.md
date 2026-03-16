# Claude Context — Route Mapper

This file gives an AI assistant everything needed to regain context on this project quickly.

## What This App Does

Generates circular walking/running routes from a start point + distance. Returns up to 3 alternative routes with elevation profiles, scored by flatness, safety, and scenery (scoring is Phase 2). Web-first, eventual iOS/watchOS target.

## Current State

**Phase 1 is complete.** The app generates and displays routes. See `docs/PHASES.md` for the full roadmap.

What works right now:

- User sets start point (map click or GPS)
- User picks distance via slider (0.3 mi – 31 mi)
- App calls ORS, returns 3 routes with different shapes (via seed values 0, 1, 2)
- Routes render on MapLibre map with elevation chart in sidebar
- All distances/elevations formatted in imperial units (miles/feet) — user is Boston-based

What is NOT yet built:

- Route scoring (`RouteScore` / `ScoredRoute` types exist in `src/types/route.ts` but no scoring logic)
- Overpass API integration (sidewalk/intersection data)
- User accounts, saved routes, history
- Mobile app

## Critical Architecture Decisions

**ORS key is server-only.** `src/app/api/routes/generate/route.ts` is the only place ORS is called. The browser never touches the key. Do not move ORS calls to client components.

**`'use client'` boundary.** Any component using `useState`, `useEffect`, browser APIs, or Zustand store must have `'use client'` at the top. Server components (no directive) cannot use these.

**All distances stored in meters internally.** ORS works in meters. `src/utils/format.ts` converts to imperial for display only. Do not change internal storage to miles.

**3 routes via seed values.** ORS round-trip mode accepts a `seed` integer that controls the route direction/shape. We call it 3 times concurrently with seeds 0, 1, 2 using `Promise.allSettled` so one failure doesn't kill all three.

**Zustand store is the single source of truth.** `src/stores/routeStore.ts` holds `startPoint`, `targetDistance`, `generatedRoutes`, `selectedRouteIndex`. Components read from the store, never from each other via props for shared state.

## Key Files to Check

| File                                      | What it does                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/app/api/routes/generate/route.ts`    | The only API endpoint. Entry point for all route generation.                            |
| `src/services/openrouteservice/client.ts` | ORS client: rate limiting, request building, response parsing, Haversine elevation calc |
| `src/stores/routeStore.ts`                | Zustand store: all shared app state + `generateRoutes()` action                         |
| `src/types/route.ts`                      | Core data types — read this first to understand data shape                              |
| `src/utils/constants.ts`                  | API URLs, distance limits, map defaults, route colors                                   |
| `src/utils/format.ts`                     | All imperial unit conversion/formatting                                                 |
| `src/lib/validation/schemas.ts`           | Zod schemas for API input validation                                                    |
| `docs/PHASES.md`                          | Phase tracker — check here for what's in scope next                                     |

## Phase 2 Entry Point

The next phase adds route scoring. Start here:

1. `src/types/route.ts` — `RouteScore` and `ScoredRoute` are already defined
2. Create `src/lib/scoring/` — pure functions, no external dependencies, unit-testable
3. Overpass API queries go in `src/services/overpass/` (mirrors ORS service pattern)
4. Scoring runs server-side in the API route after ORS returns routes

See `docs/DEVELOPER.md` → Scoring System for the design.

## Environment

```
ORS_API_KEY=   # required, server-only, never client-side
```

ORS free tier: 2,000 req/day, 40 req/min. We self-limit to 1,900/day and 38/min in `client.ts`.

## Commands

```bash
npm run dev     # start dev server at localhost:3000
npm run build   # type-check + production build
npm test        # vitest unit tests
npm run lint    # eslint
```

No database, no Docker, no other services. Just Next.js + ORS API.
