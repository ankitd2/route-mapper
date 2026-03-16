/**
 * Zustand global store — single source of truth for route state and preferences.
 *
 * Phase 2 additions:
 *   - generatedRoutes is now ScoredRoute[] (extends GeneratedRoute with score)
 *   - preferences: RoutePreferences stored and persisted to localStorage
 *   - setPreferences: updates weights, recalculates overall for all current routes
 *     instantly (no API call) then re-sorts by the new composite
 *
 * The client-side recalculation is what makes preference sliders feel instant.
 * The server calculates raw component scores (flatness, health, safety, sidewalk).
 * The client owns the overall composite because it depends on user preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Coordinate } from '@/types/geo';
import type { ScoredRoute, RoutePreferences } from '@/types/route';
import { DEFAULT_PREFERENCES } from '@/types/route';
import { calculateOverall } from '@/lib/scoring/composite';
import { DEFAULT_DISTANCE_METERS } from '@/utils/constants';

interface RouteState {
  // Route generation state
  startPoint: Coordinate | null;
  targetDistance: number;
  generatedRoutes: ScoredRoute[];
  selectedRouteIndex: number;
  isGenerating: boolean;
  error: string | null;

  // Preference weights — persisted to localStorage
  preferences: RoutePreferences;

  // Actions
  setStartPoint: (point: Coordinate | null) => void;
  setTargetDistance: (distance: number) => void;
  selectRoute: (index: number) => void;
  clearRoutes: () => void;
  generateRoutes: () => Promise<void>;

  /**
   * Updates preference weights and immediately recalculates the overall composite
   * score for every currently-loaded route, then re-sorts. No API call needed.
   */
  setPreferences: (prefs: Partial<RoutePreferences>) => void;
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      startPoint: null,
      targetDistance: DEFAULT_DISTANCE_METERS,
      generatedRoutes: [],
      selectedRouteIndex: 0,
      isGenerating: false,
      error: null,
      preferences: DEFAULT_PREFERENCES,

      // Changing start point clears stale routes
      setStartPoint: (point) => set({ startPoint: point, generatedRoutes: [], error: null }),
      setTargetDistance: (distance) => set({ targetDistance: distance }),
      selectRoute: (index) => set({ selectedRouteIndex: index }),
      clearRoutes: () => set({ generatedRoutes: [], selectedRouteIndex: 0, error: null }),

      setPreferences: (newPrefs) => {
        const { preferences, generatedRoutes } = get();
        const merged = { ...preferences, ...newPrefs };

        // Recalculate overall for every route using the new weights, then re-sort
        const updatedRoutes = generatedRoutes
          .map((route) => ({
            ...route,
            score: {
              ...route.score,
              overall: calculateOverall(route.score, merged),
            },
          }))
          .sort((a, b) => b.score.overall - a.score.overall);

        set({ preferences: merged, generatedRoutes: updatedRoutes, selectedRouteIndex: 0 });
      },

      generateRoutes: async () => {
        const { startPoint, targetDistance, preferences } = get();
        if (!startPoint) {
          set({ error: 'Please set a starting location first' });
          return;
        }

        set({ isGenerating: true, error: null, generatedRoutes: [], selectedRouteIndex: 0 });

        try {
          const response = await fetch('/api/routes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start: startPoint,
              targetDistance,
              alternatives: 3,
              preferences, // send current weights so server can set initial overall
            }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(
              (data as { error?: string }).error ||
                `Failed to generate routes (${response.status})`,
            );
          }

          const data = (await response.json()) as { routes: ScoredRoute[] };

          // Recalculate overall client-side too — ensures it reflects current prefs
          // even if server used slightly different defaults
          const routes = data.routes
            .map((route) => ({
              ...route,
              score: {
                ...route.score,
                overall: calculateOverall(route.score, preferences),
              },
            }))
            .sort((a, b) => b.score.overall - a.score.overall);

          set({ generatedRoutes: routes, isGenerating: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to generate routes',
            isGenerating: false,
          });
        }
      },
    }),
    {
      name: 'route-mapper-preferences', // localStorage key
      // Only persist preferences — routes are transient, start point should reset
      partialize: (state) => ({ preferences: state.preferences }),
    },
  ),
);
