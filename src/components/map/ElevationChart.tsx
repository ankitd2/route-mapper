'use client';

import type { ElevationPoint } from '@/types/geo';
import { formatDistance, formatElevation } from '@/utils/format';

interface ElevationChartProps {
  profile: ElevationPoint[];
  className?: string;
}

export function ElevationChart({ profile, className = '' }: ElevationChartProps) {
  if (profile.length < 2) return null;

  const elevations = profile.map((p) => p.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const elevRange = maxElev - minElev || 1;
  const totalDistance = profile[profile.length - 1]?.distanceFromStart ?? 0;

  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 25, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = profile.map((p) => {
    const x = padding.left + (p.distanceFromStart / totalDistance) * chartWidth;
    const y = padding.top + chartHeight - ((p.elevation - minElev) / elevRange) * chartHeight;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${padding.left + chartWidth},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`;

  // Y-axis labels (3 ticks)
  const yTicks = [minElev, minElev + elevRange / 2, maxElev].map((elev) => ({
    label: formatElevation(elev),
    y: padding.top + chartHeight - ((elev - minElev) / elevRange) * chartHeight,
  }));

  // X-axis labels (3 ticks)
  const xTicks = [0, totalDistance / 2, totalDistance].map((dist) => ({
    label: formatDistance(dist),
    x: padding.left + (dist / totalDistance) * chartWidth,
  }));

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={padding.left + chartWidth}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text x={padding.left - 4} y={tick.y + 3} textAnchor="end" fontSize={8} fill="#6b7280">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#elevGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth={1.5} />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
          </linearGradient>
        </defs>

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text key={i} x={tick.x} y={height - 4} textAnchor="middle" fontSize={8} fill="#6b7280">
            {tick.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
