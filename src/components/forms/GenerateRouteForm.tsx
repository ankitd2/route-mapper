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
    preferences,
    setStartPoint,
    setTargetDistance,
    setPreferences,
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

      {/* Route Preferences — collapsible, persisted to localStorage */}
      <details className="group rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 select-none hover:bg-gray-50">
          Route Preferences
          {/* Chevron rotates when open */}
          <svg
            className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          <p className="text-xs text-gray-500">
            Adjust what matters most. Routes re-rank instantly as you move sliders.
          </p>
          <PreferenceSlider
            label="Flatness"
            description="Prefer flatter routes (casual walkers, recovery)"
            value={preferences.flatnessWeight}
            onChange={(v) => setPreferences({ flatnessWeight: v })}
          />
          <PreferenceSlider
            label="Health / Workout"
            description="Prefer elevation challenge (calorie burn, cardio)"
            value={preferences.healthWeight}
            onChange={(v) => setPreferences({ healthWeight: v })}
          />
          <PreferenceSlider
            label="Safety"
            description="Prefer fewer road crossings"
            value={preferences.safetyWeight}
            onChange={(v) => setPreferences({ safetyWeight: v })}
          />
          <PreferenceSlider
            label="Sidewalk Coverage"
            description="Prefer routes with dedicated sidewalks"
            value={preferences.sidewalkWeight}
            onChange={(v) => setPreferences({ sidewalkWeight: v })}
          />
        </div>
      </details>

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

interface PreferenceSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}

/** A labeled 0–10 integer slider for one preference weight */
function PreferenceSlider({ label, description, value, onChange }: PreferenceSliderProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
        title={description}
      />
      <p className="mt-0.5 text-[10px] text-gray-400">{description}</p>
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
