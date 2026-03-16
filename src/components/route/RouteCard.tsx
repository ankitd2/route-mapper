'use client';

import type { GeneratedRoute } from '@/types/route';
import { formatDistance, formatDuration, formatElevation } from '@/utils/format';
import { ROUTE_COLORS } from '@/utils/constants';

interface RouteCardProps {
  route: GeneratedRoute;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function RouteCard({ route, index, isSelected, onClick }: RouteCardProps) {
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition ${
        isSelected
          ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-gray-900">Route {index + 1}</span>
        {isSelected && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Selected
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-4 text-sm text-gray-600">
        <span>{formatDistance(route.distance)}</span>
        <span>{formatDuration(route.duration)}</span>
      </div>

      <div className="mt-1.5 flex gap-3 text-xs text-gray-500">
        <span>↗ {formatElevation(route.ascent)}</span>
        <span>↘ {formatElevation(route.descent)}</span>
      </div>
    </button>
  );
}
