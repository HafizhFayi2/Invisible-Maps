import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Lazy import Leaflet CSS + components to avoid SSR / hook issues
import 'leaflet/dist/leaflet.css';

// We dynamically import the inner map to avoid hook call errors
const MapInner = lazy(() => import('./MapInner'));

export default function MapArea() {
  const [searchParams] = useSearchParams();
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  return (
    <div className="w-full h-full relative bg-surface-dim">
      <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-on-surface-variant text-sm">Loading Map...</div>}>
        <MapInner lat={lat} lng={lng} />
      </Suspense>
    </div>
  );
}

