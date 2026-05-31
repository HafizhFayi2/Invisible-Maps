import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { SelectedLocation } from '@/types';
import { MerchantRow } from '@/services/supabase';

const MapInner = lazy(() => import('./MapInner'));

interface MapAreaProps {
  onLocationClick: (location: SelectedLocation) => void;
  onMerchantClick?: (merchant: MerchantRow) => void;
  onUserPosChange?: (pos: [number, number] | null) => void;
  refreshKey?: number;
}

export default function MapArea({ onLocationClick, onMerchantClick, onUserPosChange, refreshKey }: MapAreaProps) {
  const [searchParams] = useSearchParams();
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  return (
    <div className="w-full h-full relative">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-sm">
          Loading Map...
        </div>
      }>
        <MapInner
          lat={lat}
          lng={lng}
          onLocationClick={onLocationClick}
          onMerchantClick={onMerchantClick}
          onUserPosChange={onUserPosChange}
          refreshKey={refreshKey}
        />
      </Suspense>
    </div>
  );
}
