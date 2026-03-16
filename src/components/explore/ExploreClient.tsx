'use client';

import { useState } from 'react';
import { useRouteStore } from '@/stores/routeStore';
import { MapView } from '@/components/map/MapView';
import { GenerateRouteForm } from '@/components/forms/GenerateRouteForm';
import { RouteCard } from '@/components/route/RouteCard';
import type { Coordinate } from '@/types/geo';

export function ExploreClient() {
  const { startPoint, generatedRoutes, selectedRouteIndex, setStartPoint, selectRoute } =
    useRouteStore();

  const [formCollapsed, setFormCollapsed] = useState(false);

  const handleMapClick = (coord: Coordinate) => {
    setStartPoint(coord);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <MapView
          startPoint={startPoint}
          routes={generatedRoutes}
          selectedRouteIndex={selectedRouteIndex}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Floating left panel: logo + form */}
      <div className="absolute top-4 left-4 w-72 space-y-2">
        {/* Brand mark + collapse toggle */}
        <div className="flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-zinc-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="5" r="2" />
              <path d="M7 19h4a6 6 0 0 0 6-6V7" />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">RouteMapper</span>
          </div>
          <button
            onClick={() => setFormCollapsed((c) => !c)}
            className="rounded-md p-1 text-zinc-400 transition hover:text-zinc-700"
            aria-label={formCollapsed ? 'Expand form' : 'Collapse form'}
          >
            <svg
              className={`h-4 w-4 transition-transform ${formCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Form card — hidden when collapsed */}
        {!formCollapsed && (
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm">
            <GenerateRouteForm />
          </div>
        )}
      </div>

      {/* Horizontal route cards */}
      {generatedRoutes.length > 0 && (
        <div className="absolute right-0 bottom-6 left-0">
          <div className="scrollbar-none flex gap-3 overflow-x-auto pr-6 pb-1 pl-[308px]">
            {generatedRoutes.map((route, index) => (
              <RouteCard
                key={route.id}
                route={route}
                index={index}
                isSelected={index === selectedRouteIndex}
                onClick={() => selectRoute(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
