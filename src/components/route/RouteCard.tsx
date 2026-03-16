'use client';

import type { Feature, LineString } from 'geojson';
import type { ScoredRoute } from '@/types/route';
import type { ElevationPoint } from '@/types/geo';
import { formatDistance, formatDuration, formatElevation } from '@/utils/format';
import { ROUTE_COLORS } from '@/utils/constants';

interface RouteCardProps {
  route: ScoredRoute;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function getDimensionHighlights(
  score: ScoredRoute['score'],
): { key: string; label: string; value: number }[] {
  const dims = [
    { key: 'flatness', label: 'Flat', value: score.flatness },
    { key: 'health', label: 'Workout', value: score.health },
    { key: 'safety', label: 'Safety', value: score.safety },
    { key: 'sidewalkCoverage', label: 'Sidewalks', value: score.sidewalkCoverage },
  ].filter((d) => d.value >= 0);
  return dims.sort((a, b) => b.value - a.value).slice(0, 2);
}

function chipClass(value: number): string {
  if (value >= 70) return 'bg-emerald-50 text-emerald-700';
  if (value >= 40) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-600';
}

/** Mini SVG of the route path, normalized to a fixed viewport */
function MiniRouteSVG({ geometry, color }: { geometry: Feature<LineString>; color: string }) {
  const coords = geometry.geometry.coordinates as [number, number][];
  if (coords.length < 2) return null;

  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const W = 80;
  const H = 80;
  const pad = 8;
  const lngRange = maxLng - minLng || 0.001;
  const latRange = maxLat - minLat || 0.001;
  const scale = Math.min((W - pad * 2) / lngRange, (H - pad * 2) / latRange);
  const offsetX = pad + (W - pad * 2 - lngRange * scale) / 2;
  const offsetY = pad + (H - pad * 2 - latRange * scale) / 2;

  const points = coords
    .map((c) => {
      const x = offsetX + (c[0] - minLng) * scale;
      const y = H - offsetY - (c[1] - minLat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}

/**
 * Elevation sparkline — shows the profile shape over the route distance.
 * Downsampled to ~40 points for rendering performance.
 * Shows where the hills are, not just total gain.
 */
function ElevationSparkline({ profile, color }: { profile: ElevationPoint[]; color: string }) {
  if (profile.length < 2) return null;

  // Downsample to max 40 points
  const step = Math.max(1, Math.floor(profile.length / 40));
  const sampled = profile.filter((_, i) => i % step === 0);
  // Always include last point for full-length line
  if (sampled[sampled.length - 1] !== profile[profile.length - 1]) {
    sampled.push(profile[profile.length - 1]!);
  }

  const elevations = sampled.map((p) => p.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;

  const W = 64;
  const H = 22;

  const points = sampled
    .map((p, i) => {
      const x = (i / (sampled.length - 1)) * W;
      const y = H - ((p.elevation - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Area path for a subtle fill
  const first = `0,${H}`;
  const last = `${W},${H}`;
  const areaPoints = `${first} ${points} ${last}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polygon points={areaPoints} fill={color} fillOpacity={0.08} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </svg>
  );
}

export function RouteCard({ route, index, isSelected, onClick }: RouteCardProps) {
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;
  const { score } = route;
  const highlights = getDimensionHighlights(score);

  return (
    <button
      onClick={onClick}
      className={`group w-64 flex-none cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-lg transition-all ${
        isSelected
          ? 'scale-[1.02] shadow-xl ring-2 ring-zinc-900/10'
          : 'hover:scale-[1.01] hover:shadow-xl'
      }`}
    >
      {/* Route color bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: color }} />

      <div className="flex gap-0 p-3">
        {/* Mini route SVG */}
        <div className="flex-none rounded-xl bg-zinc-50 p-1">
          <MiniRouteSVG geometry={route.geometry} color={color} />
        </div>

        {/* Stats */}
        <div className="min-w-0 flex-1 pl-3">
          {/* Route label */}
          <div className="flex items-center">
            <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              Route {index + 1}
            </span>
          </div>

          {/* Hero: distance */}
          <div className="mt-0.5 text-xl leading-none font-bold tracking-tight text-zinc-900">
            {formatDistance(route.distance)}
          </div>

          {/* Duration */}
          <div className="mt-0.5 text-xs text-zinc-500">{formatDuration(route.duration)}</div>

          {/* Elevation sparkline + gain */}
          <div className="mt-2 flex items-end gap-2">
            <ElevationSparkline profile={route.elevationProfile} color={color} />
            <span className="mb-0.5 text-[11px] font-medium text-zinc-500">
              +{formatElevation(route.ascent)}
            </span>
          </div>

          {/* Top dimension chips */}
          {highlights.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {highlights.map((d) => (
                <span
                  key={d.key}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chipClass(d.value)}`}
                  title={`${d.label}: ${Math.round(d.value)}/100`}
                >
                  {d.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
