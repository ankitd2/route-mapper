'use client';

import { Source, Layer } from 'react-map-gl/maplibre';
import type { GeneratedRoute } from '@/types/route';
import { ROUTE_COLORS } from '@/utils/constants';

interface RouteLayerProps {
  route: GeneratedRoute;
  index: number;
  isSelected: boolean;
}

export function RouteLayer({ route, index, isSelected }: RouteLayerProps) {
  const color = ROUTE_COLORS[index % ROUTE_COLORS.length]!;

  return (
    <Source id={`route-${route.id}`} type="geojson" data={route.geometry}>
      {/* Background stroke for selected route */}
      {isSelected && (
        <Layer
          id={`route-bg-${route.id}`}
          type="line"
          paint={{
            'line-color': color,
            'line-width': 8,
            'line-opacity': 0.3,
          }}
        />
      )}
      {/* Main route line */}
      <Layer
        id={`route-line-${route.id}`}
        type="line"
        paint={{
          'line-color': color,
          'line-width': isSelected ? 4 : 3,
          'line-opacity': isSelected ? 1 : 0.6,
        }}
        layout={{
          'line-cap': 'round',
          'line-join': 'round',
        }}
      />
    </Source>
  );
}
