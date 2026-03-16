'use client';

import { useRouteStore } from '@/stores/routeStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useEffect, useRef, useState } from 'react';
import { formatDistance } from '@/utils/format';
import { MIN_DISTANCE_METERS, MAX_DISTANCE_METERS } from '@/utils/constants';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

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

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Set start point from geolocation
  useEffect(() => {
    if (position) setStartPoint(position);
  }, [position, setStartPoint]);

  // Debounced Nominatim search
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      } catch {
        /* network error — ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectResult = (result: NominatimResult) => {
    setStartPoint({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setQuery(result.display_name.split(',')[0] ?? result.display_name);
    setResults([]);
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      {/* Start — search + geo button in one row */}
      <div ref={searchContainerRef} className="relative">
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 pr-1.5 pl-3 transition-colors focus-within:border-zinc-400 focus-within:bg-white">
          {/* Search / spinner icon */}
          {searching ? (
            <Spinner className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          ) : startPoint && !query ? (
            <svg
              className="h-3.5 w-3.5 shrink-0 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5 shrink-0 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={startPoint ? 'Search to change start…' : 'Search address…'}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
          />

          {/* Clear button */}
          {query && (
            <button
              onClick={clearSearch}
              className="shrink-0 p-1 text-zinc-300 hover:text-zinc-500"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* GPS button — inside the input, right side */}
          <button
            onClick={requestLocation}
            disabled={geoLoading}
            title="Use my location"
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
          >
            {geoLoading ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            )}
          </button>
        </div>

        {/* Status below input */}
        {geoError && <p className="mt-1 text-[11px] text-red-500">{geoError}</p>}
        {!geoError && startPoint && !query && (
          <p className="mt-1 text-[11px] text-zinc-400">
            {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}
          </p>
        )}
        {!geoError && !startPoint && !query && (
          <p className="mt-1 text-[11px] text-zinc-400">or tap anywhere on the map</p>
        )}

        {/* Results dropdown */}
        {showDropdown && (
          <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-xl">
            {results.map((r) => {
              const [primary, ...rest] = r.display_name.split(',');
              const secondary = rest.slice(0, 2).join(',').trim();
              return (
                <button
                  key={r.place_id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectResult(r)}
                  className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-zinc-50"
                >
                  <span className="text-sm font-medium text-zinc-800">{primary}</span>
                  {secondary && <span className="text-[11px] text-zinc-400">{secondary}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Distance */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">Distance</span>
          <span className="text-sm font-semibold text-zinc-900 tabular-nums">
            {formatDistance(targetDistance)}
          </span>
        </div>
        <input
          type="range"
          min={MIN_DISTANCE_METERS}
          max={MAX_DISTANCE_METERS}
          step={100}
          value={targetDistance}
          onChange={(e) => setTargetDistance(Number(e.target.value))}
          className="w-full accent-zinc-900"
        />
      </div>

      {/* Generate */}
      <button
        onClick={generateRoutes}
        disabled={!startPoint || isGenerating}
        className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner className="h-3.5 w-3.5" /> Generating...
          </span>
        ) : (
          'Generate Routes'
        )}
      </button>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
