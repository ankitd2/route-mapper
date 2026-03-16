# Claude Context — Route Mapper

This file gives an AI assistant everything needed to regain context on this project quickly.

## What This App Does

Generates circular walking/running routes from a start point + distance. Returns up to 3 alternative routes with elevation profiles, scored on 4 dimensions (flatness, health, safety, sidewalk coverage). Web-first, eventual iOS/watchOS target. User is Boston-based — all display units are imperial (miles/feet).

## Current State

**Phase 2 is complete.** Routes are generated, scored, and ranked. See `docs/PHASES.md`.

What works:

- User sets start point (map click or GPS), picks distance, generates 3 routes
- Each route scored on: Flatness, Health/Workout, Safety (crossings), Sidewalk Coverage
- Route cards show 4 mini score bars + overall badge; sorted best-first
- Preference sliders (collapsible) let user re-weight dimensions → instant re-sort, no API call
- Preferences persist to localStorage via Zustand `persist` middleware
- Overpass failure degrades gracefully: elevation scores always work, others show "—"
- 22 unit tests cover all scoring functions (`npm test`)
- GitHub Actions CI: lint → test → build on every push/PR

What is NOT yet built:

- Scenic scoring (Phase 4)
- User accounts, saved routes, history (Phase 3)
- Mobile app (Phase 5)

## Critical Architecture Decisions

**ORS key is server-only.** `src/app/api/routes/generate/route.ts` is the only place ORS is called. The browser never touches the key. Do not move ORS calls to client components.

**`'use client'` boundary.** Any component using `useState`, `useEffect`, browser APIs, or Zustand store must have `'use client'` at the top.

**All distances stored in meters internally.** ORS works in meters. `src/utils/format.ts` converts to imperial for display only.

**3 routes via seed values.** ORS `round_trip.seed` controls route shape. Seeds 0/1/2 run concurrently via `Promise.allSettled` — one failure doesn't kill all three.

**Zustand store is the single source of truth.** `src/stores/routeStore.ts` holds all shared state. `setPreferences()` recalculates + re-sorts routes client-side without a new API call — this is what makes preference sliders feel instant.

**`ScoredRoute` extends `GeneratedRoute`.** Adding scoring didn't break existing map/chart components — they still receive a compatible type.

**-1 is the sentinel for "data unavailable"** in `RouteScore`. `calculateOverall()` skips dimensions with score === -1 and re-normalizes remaining weights. Never treat -1 as a real score.

## Key Files

| File                                      | What it does                                                |
| ----------------------------------------- | ----------------------------------------------------------- |
| `src/app/api/routes/generate/route.ts`    | Only API endpoint — orchestrates ORS → Overpass → scoring   |
| `src/services/openrouteservice/client.ts` | ORS client: rate limiting, request building, elevation calc |
| `src/services/overpass/client.ts`         | Overpass client: single combined bbox query per generation  |
| `src/services/overpass/queries.ts`        | Overpass QL query builders                                  |
| `src/lib/scoring/index.ts`                | Scoring orchestrator — entry point for scoring a route      |
| `src/lib/scoring/elevation.ts`            | `scoreFlatness()` and `scoreHealth()` — always available    |
| `src/lib/scoring/intersections.ts`        | `scoreSafety()` — requires Overpass crossing nodes          |
| `src/lib/scoring/sidewalk.ts`             | `scoreSidewalk()` — requires Overpass way geometries        |
| `src/lib/scoring/composite.ts`            | `calculateOverall()` — weighted average, skips -1 sentinels |
| `src/lib/scoring/scoring.test.ts`         | 22 unit tests for all scoring functions                     |
| `src/stores/routeStore.ts`                | Zustand store: all shared state + actions                   |
| `src/types/route.ts`                      | Core types — read this first                                |
| `src/utils/constants.ts`                  | API URLs, distance limits, map defaults, route colors       |
| `src/utils/format.ts`                     | All imperial unit conversion/formatting                     |
| `src/lib/validation/schemas.ts`           | Zod schemas for API input + preferences validation          |
| `docs/PHASES.md`                          | Phase tracker                                               |
| `docs/DEVELOPER.md`                       | API reference + scoring formulas                            |

## Phase 3 Entry Point

Next phase: user accounts + route history. Suggested starting points:

1. Auth: evaluate NextAuth.js (open source, Next.js-native) vs Clerk (hosted, easier)
2. Database: SQLite/Turso for local-first, or Postgres on Vercel for cloud
3. Add a `SavedRoute` type to `src/types/` extending `ScoredRoute` with userId + savedAt
4. New API route: `POST /api/routes/save`, `GET /api/routes/history`

## Environment

```
ORS_API_KEY=   # required, server-only, never client-side
```

ORS free tier: 2,000 req/day, 40 req/min. Self-limited to 1,900/day and 38/min in `client.ts`.
Overpass API: free, no key — one combined bbox query per generation.

## Commands

```bash
npm run dev     # start dev server at localhost:3000
npm run build   # type-check + production build
npm test        # vitest unit tests (22 tests)
npm run lint    # eslint
```

No database, no Docker, no other services. Just Next.js + ORS API + Overpass API.
