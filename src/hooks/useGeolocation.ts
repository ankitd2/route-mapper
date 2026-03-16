'use client';

import { useState, useCallback } from 'react';
import type { Coordinate } from '@/types/geo';

interface GeolocationState {
  position: Coordinate | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: { lng: pos.coords.longitude, lat: pos.coords.latitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        let message = 'Unable to get your location';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable location access in your browser.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out.';
        }
        setState({ position: null, error: message, loading: false });
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 300_000, // 5 minutes
      },
    );
  }, []);

  return { ...state, requestLocation };
}
