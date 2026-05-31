/**
 * pwa/hooks/useGPS.ts
 * GPS capture hook — requests geolocation and tracks position.
 */
import { useState, useEffect, useCallback } from 'react';

export interface GPSState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGPS(watchPosition = false): GPSState & { refresh: () => void } {
  const [state, setState] = useState<GPSState>({
    coords: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation not supported', loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    capture();
    if (!watchPosition) return;

    const id = navigator.geolocation?.watchPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => setState((s) => ({ ...s, error: err.message })),
      { enableHighAccuracy: true },
    );
    return () => { if (id !== undefined) navigator.geolocation?.clearWatch(id); };
  }, [capture, watchPosition]);

  return { ...state, refresh: capture };
}
