# Project Phases

Progress tracker. Each phase builds on the last. Phases 1–2 use only free APIs.

---

## Phase 1 — Core Route Generation ✅ Complete

**Goal:** Generate and display routes from a start point and distance.

- [x] Next.js project with TypeScript, Tailwind, ESLint, Prettier
- [x] MapLibre GL map with click-to-set-start and GPS location
- [x] ORS integration: 3 alternative round-trip routes via seed values
- [x] Elevation profile extracted from ORS 3D coordinates (Haversine)
- [x] Route display: map layers + sidebar list + SVG elevation chart
- [x] Distance slider: 0.3 mi to 31 mi
- [x] Imperial unit formatting throughout (miles, feet)
- [x] Security: ORS key server-only, security headers, CSP, Zod validation
- [x] Rate limiting: self-enforced 38 req/min, 1,900 req/day

**APIs used:** OpenRouteService, OpenFreeMap tiles

---

## Phase 2 — Route Scoring 🔲 Next

**Goal:** Score each route so users can compare them meaningfully.

Types are already defined in `src/types/route.ts` (`RouteScore`, `ScoredRoute`).

- [ ] Overpass API service (`src/services/overpass/`)
  - [ ] Fetch sidewalk ways within route bounding box
  - [ ] Fetch road crossings near route
  - [ ] Fetch parks/natural areas near route (for scenic)
- [ ] Scoring library (`src/lib/scoring/`) — pure functions, fully unit-tested
  - [ ] `scoreElevation(ascent, descent, distanceMeters): number`
  - [ ] `scoreIntersections(crossingCount, distanceMeters): number`
  - [ ] `scoreSidewalk(routeGeometry, sidewalkWays): number`
  - [ ] `scoreScenic(routeGeometry, naturalFeatures): number`
  - [ ] `scoreOverall(scores, weights): number`
- [ ] Wire scoring into API route — returns `ScoredRoute[]`
- [ ] Display scores on RouteCard (badge or mini bar chart)
- [ ] Route preference UI (flatness / safety / scenic weight sliders)
- [ ] Sort routes by overall score by default

**Scoring formula summary:**

| Dimension     | Formula                                     | Weight |
| ------------- | ------------------------------------------- | ------ |
| Elevation     | `max(0, 100 - gainPerMile × 2)`             | 30%    |
| Intersections | `max(0, 100 - crossingsPerMile × 5)`        | 25%    |
| Sidewalk      | `(coveredMeters / totalMeters) × 100`       | 25%    |
| Scenic        | OSM natural/park feature density near route | 20%    |

See `docs/DEVELOPER.md` → Scoring System for full details.

**New APIs:** Overpass API (no key required)

---

## Phase 3 — User Accounts & History 🔲 Planned

**Goal:** Let users save routes, track stats, and see history.

- [ ] Auth (NextAuth.js or Clerk — TBD)
- [ ] Database (SQLite/Turso for local-first, or Postgres on Vercel)
- [ ] Save generated routes to user account
- [ ] Route history page with stats (total miles, avg elevation, etc.)
- [ ] Favorite/star routes
- [ ] Export route as GPX (for Garmin, Apple Watch import)
- [ ] Per-user preferences persisted (weight sliders, default distance)

---

## Phase 4 — Time-Based Input & Advanced Filters 🔲 Planned

**Goal:** More flexible input and smarter route selection.

- [ ] Input by time (e.g., "30 minute run") using estimated pace
- [ ] Filter by surface type (trail vs road vs mixed) using ORS `surface` extra_info
- [ ] Filter by max elevation gain
- [ ] Route difficulty rating (easy / moderate / hard)
- [ ] Street-level safety score using ORS `waycategory` (avoid highways, busy roads)

---

## Phase 5 — Mobile (iOS / watchOS / iPadOS) 🔲 Future

**Goal:** Native app leveraging device sensors and Apple Watch.

- [ ] Apple Developer Program account required (~$99/yr)
- [ ] React Native + Expo (shares business logic from `src/lib/` and `src/utils/`)
- [ ] or Swift/SwiftUI native (full platform integration, more work)
- [ ] Live route tracking with GPS during run
- [ ] Apple Watch complication: current pace, distance, turn-by-turn
- [ ] HealthKit integration: write workout data
- [ ] Offline mode: cache routes for areas without signal

**Note:** `src/lib/` (pure functions) and `src/utils/format.ts` are framework-agnostic and can be imported directly by a React Native app.

---

## Phase 6 — Production Web Deployment 🔲 Future

- [ ] Domain + hosting (Vercel free tier is a natural fit for Next.js)
- [ ] Rate limiting at the edge (Vercel middleware or Upstash Redis)
- [ ] Error monitoring (Sentry free tier)
- [ ] Analytics (Plausible or Fathom — privacy-respecting)
- [ ] ORS self-hosted instance if traffic grows beyond free tier
