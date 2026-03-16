'use client';

import { useRouteStore } from '@/stores/routeStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useEffect } from 'react';
import { formatDistance } from '@/utils/format';
import { MIN_DISTANCE_METERS, MAX_DISTANCE_METERS } from '@/utils/constants';

export function GenerateRouteForm() {
  const {
    startPoint,
    targetDistance,
    isGenerating,
    error,
    setStartPoint,
    setTargetDistance,
    generateRoutes,
  } = useRouteStore();
  const { position, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  // When geolocation resolves, set it as start point
  useEffect(() => {
    if (position) {
      setStartPoint(position);
    }
  }, [position, setStartPoint]);

  return (
    <div className="space-y-5">
      {/* Location Input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Location</label>
        <button
          onClick={requestLocation}
          disabled={geoLoading}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {geoLoading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              Getting location...
            </span>
          ) : (
            'Use Current Location'
          )}
        </button>
        {startPoint && (
          <p className="mt-1.5 text-xs text-gray-500">
            {startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}
          </p>
        )}
        {!startPoint && !geoError && (
          <p className="mt-1.5 text-xs text-gray-500">Or click on the map to set a start point</p>
        )}
        {geoError && <p className="mt-1.5 text-xs text-red-500">{geoError}</p>}
      </div>

      {/* Distance Input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Target Distance: {formatDistance(targetDistance)}
        </label>
        <input
          type="range"
          min={MIN_DISTANCE_METERS}
          max={MAX_DISTANCE_METERS}
          step={100}
          value={targetDistance}
          onChange={(e) => setTargetDistance(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>{formatDistance(MIN_DISTANCE_METERS)}</span>
          <span>{formatDistance(MAX_DISTANCE_METERS)}</span>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateRoutes}
        disabled={!startPoint || isGenerating}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            Generating Routes...
          </span>
        ) : (
          'Generate Routes'
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
