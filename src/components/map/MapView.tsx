'use client';

import { useCallback, useRef } from 'react';
import Map, { NavigationControl, GeolocateControl, Marker } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE_URL, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/utils/constants';
import type { Coordinate } from '@/types/geo';
import type { GeneratedRoute } from '@/types/route';
import { RouteLayer } from './RouteLayer';

interface MapViewProps {
  startPoint: Coordinate | null;
  routes: GeneratedRoute[];
  selectedRouteIndex: number;
  onMapClick: (coord: Coordinate) => void;
}

export function MapView({ startPoint, routes, selectedRouteIndex, onMapClick }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    },
    [onMapClick],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: startPoint?.lng ?? DEFAULT_CENTER[0],
        latitude: startPoint?.lat ?? DEFAULT_CENTER[1],
        zoom: DEFAULT_ZOOM,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE_URL}
      onClick={handleClick}
      cursor="crosshair"
    >
      <NavigationControl position="top-right" />
      <GeolocateControl position="top-right" trackUserLocation />

      {routes.map((route, index) => (
        <RouteLayer
          key={route.id}
          route={route}
          index={index}
          isSelected={index === selectedRouteIndex}
        />
      ))}

      {startPoint && (
        <Marker longitude={startPoint.lng} latitude={startPoint.lat} anchor="bottom">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg">
            S
          </div>
        </Marker>
      )}
    </Map>
  );
}
