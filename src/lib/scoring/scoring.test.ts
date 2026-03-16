/**
 * Unit tests for the scoring library.
 *
 * Scoring functions are pure — no network calls, no side effects.
 * Tests use concrete examples from the Boston context to keep them grounded.
 */

import { describe, it, expect } from 'vitest';
import { scoreFlatness, scoreHealth } from './elevation';
import { scoreSafety } from './intersections';
import { scoreSidewalk } from './sidewalk';
import { calculateOverall } from './composite';
import { DEFAULT_PREFERENCES } from '@/types/route';
import type { RouteScore } from '@/types/route';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { OverpassNode, OverpassWay } from '@/services/overpass/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a simple straight-line route for testing (south Boston waterfront direction) */
function makeRouteLine(lengthKm: number): Feature<LineString> {
  // Start near Boston waterfront, extend roughly east
  const start: [number, number] = [-71.05, 42.36];
  const end: [number, number] = [start[0] + lengthKm * 0.009, start[1]]; // ~0.009° lng per km
  return turf.lineString([start, end]);
}

function makeCrossingNode(lng: number, lat: number): OverpassNode {
  return { type: 'node', id: Math.random(), lat, lon: lng };
}

function makeSidewalkWay(coords: Array<[number, number]>): OverpassWay {
  return {
    type: 'way',
    id: Math.random(),
    geometry: coords.map(([lon, lat]) => ({ lon, lat })),
  };
}

// ─── Elevation scoring ────────────────────────────────────────────────────────

describe('scoreFlatness', () => {
  it('returns 100 for a completely flat route', () => {
    expect(scoreFlatness(0, 8000)).toBe(100);
  });

  it('decreases with more elevation gain', () => {
    const flat = scoreFlatness(0, 8000);
    const moderate = scoreFlatness(50, 8000); // more ascent
    const hilly = scoreFlatness(150, 8000); // even more ascent
    expect(flat).toBeGreaterThan(moderate);
    expect(moderate).toBeGreaterThan(hilly);
  });

  it('never goes below 0', () => {
    expect(scoreFlatness(1000, 1000)).toBeGreaterThanOrEqual(0);
  });

  it('handles zero distance without throwing', () => {
    expect(() => scoreFlatness(0, 0)).not.toThrow();
  });
});

describe('scoreHealth', () => {
  it('returns 20 baseline for a completely flat route', () => {
    expect(scoreHealth(0, 8000)).toBe(20);
  });

  it('increases with more elevation gain', () => {
    const flat = scoreHealth(0, 8000);
    const moderate = scoreHealth(50, 8000);
    const hilly = scoreHealth(150, 8000);
    expect(flat).toBeLessThan(moderate);
    expect(moderate).toBeLessThan(hilly);
  });

  it('never exceeds 100', () => {
    expect(scoreHealth(10000, 1000)).toBeLessThanOrEqual(100);
  });

  it('flatness + health are inversely related', () => {
    // For any route, high flatness → low health and vice versa
    const ascentM = 80;
    const distM = 8000;
    const flat = scoreFlatness(ascentM, distM);
    const health = scoreHealth(ascentM, distM);
    // Not a strict sum-to-120, but health > flatness for hilly routes
    expect(health).toBeGreaterThan(flat);
  });
});

// ─── Safety (intersection) scoring ───────────────────────────────────────────

describe('scoreSafety', () => {
  const routeLine = makeRouteLine(5); // 5km route
  const distanceM = 5000;

  it('returns 100 with no crossings', () => {
    expect(scoreSafety([], routeLine, distanceM)).toBe(100);
  });

  it('returns -1 when crossing data is null (Overpass unavailable)', () => {
    expect(scoreSafety(null, routeLine, distanceM)).toBe(-1);
  });

  it('decreases score with more crossings on the route', () => {
    // Place crossings directly on the route line
    const start = routeLine.geometry.coordinates[0]!;
    const mid =
      routeLine.geometry.coordinates[Math.floor(routeLine.geometry.coordinates.length / 2)]!;

    const fewCrossings = [makeCrossingNode(start[0]!, start[1]!)];
    const manyCrossings = Array.from({ length: 10 }, (_, i) =>
      makeCrossingNode(start[0]! + i * 0.001, start[1]!),
    );

    expect(scoreSafety(fewCrossings, routeLine, distanceM)).toBeGreaterThan(
      scoreSafety(manyCrossings, routeLine, distanceM),
    );

    // Suppress unused variable warning
    void mid;
  });

  it('ignores crossings far from the route', () => {
    // A crossing 1km away from the route — should not affect score
    const farNode = makeCrossingNode(-71.05 + 0.02, 42.36 + 0.5);
    expect(scoreSafety([farNode], routeLine, distanceM)).toBe(100);
  });

  it('never returns below 0', () => {
    const manyNodes = Array.from({ length: 50 }, (_, i) =>
      makeCrossingNode(-71.05 + i * 0.0001, 42.36),
    );
    expect(scoreSafety(manyNodes, routeLine, distanceM)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Sidewalk coverage scoring ────────────────────────────────────────────────

describe('scoreSidewalk', () => {
  const routeLine = makeRouteLine(1); // 1km for speed

  it('returns -1 when sidewalk data is null (Overpass unavailable)', () => {
    expect(scoreSidewalk(null, routeLine)).toBe(-1);
  });

  it('returns 0 when there are no sidewalks in the area', () => {
    expect(scoreSidewalk([], routeLine)).toBe(0);
  });

  it('returns high score when sidewalk runs parallel to the route', () => {
    // A sidewalk way running directly alongside the route (within 15m = ~0.00015°)
    const parallelSidewalk = makeSidewalkWay([
      [-71.05, 42.36 + 0.0001], // ~11m north of route start
      [-71.041, 42.36 + 0.0001], // ~11m north of route end
    ]);
    const score = scoreSidewalk([parallelSidewalk], routeLine);
    expect(score).toBeGreaterThan(50);
  });

  it('returns low score when sidewalk is far from the route', () => {
    // A sidewalk way 200m north of the route — outside the 15m threshold
    const farSidewalk = makeSidewalkWay([
      [-71.05, 42.362], // ~222m north
      [-71.041, 42.362],
    ]);
    const score = scoreSidewalk([farSidewalk], routeLine);
    expect(score).toBeLessThan(10);
  });
});

// ─── Composite scoring ────────────────────────────────────────────────────────

describe('calculateOverall', () => {
  const fullScores: Omit<RouteScore, 'overall'> = {
    flatness: 80,
    health: 40,
    safety: 70,
    sidewalkCoverage: 90,
    scenic: -1, // always -1 in Phase 2
  };

  it('returns a number between 0 and 100', () => {
    const result = calculateOverall(fullScores, DEFAULT_PREFERENCES);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('returns 0 when all scores are -1', () => {
    const noData: Omit<RouteScore, 'overall'> = {
      flatness: -1,
      health: -1,
      safety: -1,
      sidewalkCoverage: -1,
      scenic: -1,
    };
    expect(calculateOverall(noData, DEFAULT_PREFERENCES)).toBe(0);
  });

  it('correctly skips -1 sentinel scores (uses only available dimensions)', () => {
    // Only flatness available — overall should equal flatness
    const onlyFlatness: Omit<RouteScore, 'overall'> = {
      flatness: 75,
      health: -1,
      safety: -1,
      sidewalkCoverage: -1,
      scenic: -1,
    };
    expect(calculateOverall(onlyFlatness, DEFAULT_PREFERENCES)).toBe(75);
  });

  it('higher flatness weight shifts overall toward flatness score', () => {
    const flatHeavy = { ...DEFAULT_PREFERENCES, flatnessWeight: 10, healthWeight: 0 };
    const healthHeavy = { ...DEFAULT_PREFERENCES, flatnessWeight: 0, healthWeight: 10 };

    const flatResult = calculateOverall(fullScores, flatHeavy);
    const healthResult = calculateOverall(fullScores, healthHeavy);

    // flatness=80 > health=40, so flatness-heavy overall > health-heavy overall
    expect(flatResult).toBeGreaterThan(healthResult);
  });

  it('all-zero weights falls back to equal weighting', () => {
    const zeroWeights = {
      flatnessWeight: 0,
      healthWeight: 0,
      safetyWeight: 0,
      sidewalkWeight: 0,
      scenicWeight: 0,
    };
    const result = calculateOverall(fullScores, zeroWeights);
    // Average of [80, 40, 70, 90] = 70
    expect(result).toBe(70);
  });
});
