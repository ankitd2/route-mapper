'use client';

import { useRouteStore } from '@/stores/routeStore';
import { MapView } from '@/components/map/MapView';
import { ElevationChart } from '@/components/map/ElevationChart';
import { GenerateRouteForm } from '@/components/forms/GenerateRouteForm';
import { RouteList } from '@/components/route/RouteList';
import type { Coordinate } from '@/types/geo';

export function ExploreClient() {
  const { startPoint, generatedRoutes, selectedRouteIndex, setStartPoint, selectRoute } =
    useRouteStore();

  const selectedRoute = generatedRoutes[selectedRouteIndex];

  const handleMapClick = (coord: Coordinate) => {
    setStartPoint(coord);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:flex-row">
      {/* Map */}
      <div className="relative min-h-[300px] flex-1 lg:min-h-0">
        <MapView
          startPoint={startPoint}
          routes={generatedRoutes}
          selectedRouteIndex={selectedRouteIndex}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Sidebar */}
      <div className="w-full shrink-0 overflow-y-auto border-t border-gray-200 bg-gray-50 p-5 lg:w-96 lg:border-t-0 lg:border-l">
        <GenerateRouteForm />

        {generatedRoutes.length > 0 && (
          <div className="mt-6">
            <RouteList
              routes={generatedRoutes}
              selectedIndex={selectedRouteIndex}
              onSelectRoute={selectRoute}
            />

            {/* Elevation Chart for selected route */}
            {selectedRoute && selectedRoute.elevationProfile.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">Elevation Profile</h4>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <ElevationChart profile={selectedRoute.elevationProfile} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
