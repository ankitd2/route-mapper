'use client';

import type { ScoredRoute } from '@/types/route';
import { formatDistance, formatDuration, formatElevation } from '@/utils/format';
import { ROUTE_COLORS } from '@/utils/constants';

interface RouteCardProps {
  route: ScoredRoute;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

/** Maps a 0–100 score to a Tailwind background color class */
function scoreColor(score: number): string {
  if (score < 0) return 'bg-gray-300'; // -1 sentinel = unavailable
  if (score >= 70) return 'bg-green-500'; // good
  if (score >= 40) return 'bg-yellow-400'; // moderate
  return 'bg-red-400'; // poor
}

/** Maps a 0–100 score to a human-readable label */
function scoreLabel(score: number): string {
  if (score < 0) return '—';
  return String(Math.round(score));
}

interface ScoreBarProps {
  label: string;
  score: number;
  title: string;
}

/** A compact labeled score bar: [FL ████░░░] */
function ScoreBar({ label, score, title }: ScoreBarProps) {
  const fillWidth = score < 0 ? 0 : score;
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <span className="w-5 shrink-0 text-right text-[10px] font-medium text-gray-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score)}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
    </div>
  );
}

export function RouteCard({ route, index, isSelected, onClick }: RouteCardProps) {
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;
  const { score } = route;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition ${
        isSelected
          ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {/* Header: color dot + title + overall badge */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-gray-900">Route {index + 1}</span>
        {isSelected && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Selected
          </span>
        )}
        {/* Overall score badge — right-aligned */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Score</span>
          <span
            className={`flex h-6 w-8 items-center justify-center rounded-md text-xs font-bold text-white ${scoreColor(score.overall)}`}
          >
            {scoreLabel(score.overall)}
          </span>
        </div>
      </div>

      {/* Distance + duration */}
      <div className="mt-2 flex gap-4 text-sm text-gray-600">
        <span>{formatDistance(route.distance)}</span>
        <span>{formatDuration(route.duration)}</span>
      </div>

      {/* Elevation gain/loss */}
      <div className="mt-1.5 flex gap-3 text-xs text-gray-500">
        <span>↗ {formatElevation(route.ascent)}</span>
        <span>↘ {formatElevation(route.descent)}</span>
      </div>

      {/* Score bars — 4 dimensions */}
      <div className="mt-3 space-y-1.5">
        <ScoreBar
          label="FL"
          score={score.flatness}
          title={`Flatness: ${scoreLabel(score.flatness)}/100`}
        />
        <ScoreBar
          label="HT"
          score={score.health}
          title={`Health/Workout: ${scoreLabel(score.health)}/100`}
        />
        <ScoreBar
          label="SF"
          score={score.safety}
          title={`Safety (crossings): ${scoreLabel(score.safety)}/100`}
        />
        <ScoreBar
          label="SW"
          score={score.sidewalkCoverage}
          title={`Sidewalk coverage: ${scoreLabel(score.sidewalkCoverage)}/100`}
        />
      </div>

      {/* Legend — only shown on selected card to reduce visual noise */}
      {isSelected && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
          <span>FL Flatness</span>
          <span>HT Health</span>
          <span>SF Safety</span>
          <span>SW Sidewalk</span>
        </div>
      )}
    </button>
  );
}
