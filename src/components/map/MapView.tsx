'use client';

import { useCallback, useEffect, useRef } from 'react';
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

  // When startPoint is set outside the current viewport (e.g. via address search),
  // fly the map to it. Map clicks are already in-view so they don't trigger this.
  useEffect(() => {
    if (!mapRef.current || !startPoint || routes.length > 0) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds.contains([startPoint.lng, startPoint.lat])) {
      mapRef.current.flyTo({ center: [startPoint.lng, startPoint.lat], zoom: 14, duration: 700 });
    }
  }, [startPoint, routes.length]);

  // Fit map to selected route bbox when selection changes
  useEffect(() => {
    if (!mapRef.current || routes.length === 0) return;
    const route = routes[selectedRouteIndex];
    if (!route?.bbox) return;
    const [minLng, minLat, maxLng, maxLat] = route.bbox;
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: { top: 80, bottom: 200, left: 320, right: 80 },
        duration: 500,
        maxZoom: 15,
      },
    );
  }, [selectedRouteIndex, routes]);

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
          <div className="drop-shadow-lg">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
              <path
                d="M14 0C6.268 0 0 6.268 0 14c0 9.625 12.195 21.018 13.25 22.02a1 1 0 0 0 1.5 0C15.805 35.018 28 23.625 28 14 28 6.268 21.732 0 14 0z"
                fill="#18181b"
              />
              <circle cx="14" cy="14" r="5" fill="white" />
            </svg>
          </div>
        </Marker>
      )}
    </Map>
  );
}
