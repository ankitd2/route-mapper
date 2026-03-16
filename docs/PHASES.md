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

## Phase 2 — Route Scoring ✅ Complete

**Goal:** Score each route on 4 dimensions. Users tune preference weights to re-rank routes instantly.

- [x] Overpass API service (`src/services/overpass/`) — crossings + sidewalks
- [x] Scoring library (`src/lib/scoring/`) — pure functions, fully unit-tested (22 tests)
  - [x] `scoreFlatness(ascentM, distanceM)` — flatness: 100 = completely flat
  - [x] `scoreHealth(ascentM, distanceM)` — workout quality: 20 baseline, 100 = hilly
  - [x] `scoreSafety(nodes, routeLine, distanceM)` — fewer crossings = higher score
  - [x] `scoreSidewalk(ways, routeLine)` — % of route with nearby sidewalk
  - [x] `calculateOverall(scores, prefs)` — weighted composite, skips -1 sentinels
- [x] Overpass query wired into API route — one combined bbox query per generation
- [x] API route returns `ScoredRoute[]`, sorted by overall score descending
- [x] RouteCard: 4 labeled mini score bars (FL/HT/SF/SW) + overall score badge
- [x] Preference sliders — collapsible in form, persisted to localStorage
- [x] Client-side re-rank: slider changes → instant re-sort, no API call
- [x] Graceful degradation: Overpass failure → routes still shown, safety/sidewalk show "—"
- [x] GitHub Actions CI workflow (lint → test → build on push/PR)

**Scoring formula summary:**

| Dimension | Formula                           | 100 = best for           |
| --------- | --------------------------------- | ------------------------ |
| Flatness  | `max(0, 100 − gainFt/mi × 1.5)`   | Casual walkers, recovery |
| Health    | `min(100, 20 + gainFt/mi × 1.2)`  | Runners, cardio training |
| Safety    | `max(0, 100 − crossings/mi × 8)`  | Everyone                 |
| Sidewalk  | `samplesWithin15m / total × 100`  | Everyone                 |
| Scenic    | _(Phase 4 — always -1 now)_       | —                        |
| Overall   | `Σ(score_i × normalizedWeight_i)` | —                        |

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
- [ ] Per-user preferences persisted to DB (currently localStorage)

---

## Phase 4 — Time-Based Input, Scenic Scoring & Advanced Filters 🔲 Planned

**Goal:** More flexible input, scenic scoring, and smarter route selection.

- [ ] Input by time (e.g., "30 minute run") using estimated pace
- [ ] Scenic score: Overpass parks/nature/water features within 100m of route
- [ ] Filter by surface type (trail vs road vs mixed) using ORS `surface` extra_info
- [ ] Filter by max elevation gain
- [ ] Route difficulty rating (easy / moderate / hard)
- [ ] Street-level safety using ORS `waycategory` (avoid highways, busy roads)

---

## Phase 5 — Mobile (iOS / watchOS / iPadOS) 🔲 Future

**Goal:** Native app leveraging device sensors and Apple Watch.

- [ ] Apple Developer Program account required (~$99/yr)
- [ ] React Native + Expo (shares `src/lib/` scoring + `src/utils/format.ts` directly)
- [ ] OR Swift/SwiftUI native (full platform integration, more work)
- [ ] Live route tracking with GPS during run
- [ ] Apple Watch complication: current pace, distance, turn-by-turn
- [ ] HealthKit integration: write workout data
- [ ] Offline mode: cache routes for areas without signal

**Note:** `src/lib/` (pure functions) and `src/utils/format.ts` are framework-agnostic.

---

## Phase 6 — Production Web Deployment 🔲 Future

- [ ] Domain + hosting (Vercel free tier — connect GitHub repo, takes 5 minutes)
- [ ] Rate limiting at the edge (Vercel middleware or Upstash Redis)
- [ ] Error monitoring (Sentry free tier)
- [ ] Analytics (Plausible or Fathom — privacy-respecting)
- [ ] ORS self-hosted instance if traffic grows beyond free tier
