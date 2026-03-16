/**
 * Zustand global store — single source of truth for route state.
 *
 * Why Zustand: any component can read or write this store without prop drilling.
 * The store is only used in 'use client' components (Zustand is browser-side).
 *
 * State shape:
 *   startPoint       — where the route begins (set by map click or GPS)
 *   targetDistance   — desired route length in meters (slider input)
 *   generatedRoutes  — array of routes returned by the last generation
 *   selectedRouteIndex — which route is highlighted on the map
 *   isGenerating     — true while the API call is in flight
 *   error            — last error message, or null
 */

import { create } from 'zustand';
import type { Coordinate } from '@/types/geo';
import type { GeneratedRoute } from '@/types/route';
import { DEFAULT_DISTANCE_METERS } from '@/utils/constants';

interface RouteState {
  startPoint: Coordinate | null;
  targetDistance: number;
  generatedRoutes: GeneratedRoute[];
  selectedRouteIndex: number;
  isGenerating: boolean;
  error: string | null;

  setStartPoint: (point: Coordinate | null) => void;
  setTargetDistance: (distance: number) => void;
  selectRoute: (index: number) => void;
  clearRoutes: () => void;
  generateRoutes: () => Promise<void>;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  startPoint: null,
  targetDistance: DEFAULT_DISTANCE_METERS,
  generatedRoutes: [],
  selectedRouteIndex: 0,
  isGenerating: false,
  error: null,

  // Changing start point clears any existing routes so stale results aren't shown
  setStartPoint: (point) => set({ startPoint: point, generatedRoutes: [], error: null }),
  setTargetDistance: (distance) => set({ targetDistance: distance }),
  selectRoute: (index) => set({ selectedRouteIndex: index }),
  clearRoutes: () => set({ generatedRoutes: [], selectedRouteIndex: 0, error: null }),

  /**
   * Main action: calls the Next.js API route which calls ORS server-side.
   * The browser never directly contacts ORS — the API key stays on the server.
   * Generates `alternatives` routes in parallel (via different ORS seeds).
   */
  generateRoutes: async () => {
    const { startPoint, targetDistance } = get();
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
          alternatives: 3, // request 3 distinct routes (seeds 0, 1, 2)
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || `Failed to generate routes (${response.status})`,
        );
      }

      const data = (await response.json()) as { routes: GeneratedRoute[] };
      set({ generatedRoutes: data.routes, isGenerating: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to generate routes',
        isGenerating: false,
      });
    }
  },
}));
