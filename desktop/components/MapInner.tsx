import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import LensHoverCard from './LensHoverCard';

interface MapControllerProps {
  lat: string | null;
  lng: string | null;
}

// All react-leaflet hooks must live inside <MapContainer>
function MapController({ lat, lng }: MapControllerProps) {
  const map = useMap();
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Listen for map clicks → trigger Gemini Lens
  useMapEvents({
    click(e) {
      setClickedLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.setView(e.latlng, map.getZoom(), { animate: true });
    },
  });

  // Fly to search result if URL params change
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([parseFloat(lat), parseFloat(lng)], 16, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [lat, lng, map]);

  // Auto-geolocation on first load
  useEffect(() => {
    if (!lat && !lng && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 15, {
            animate: true,
            duration: 1.5,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, [lat, lng, map]);

  return (
    <>
      {clickedLocation && (
        <LensHoverCard
          location={clickedLocation}
          onClose={() => setClickedLocation(null)}
        />
      )}
    </>
  );
}

interface MapInnerProps {
  lat: string | null;
  lng: string | null;
}

export default function MapInner({ lat, lng }: MapInnerProps) {
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      zoomControl={false}
      className="w-full h-full z-0"
    >
      {/* Google Maps Hybrid View */}
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        attribution="&copy; Google Maps"
        maxZoom={20}
      />

      {/* Zoom control bottom right */}
      <ZoomControl position="bottomright" />

      {/* Controller: handles clicks + flyTo + Lens card */}
      <MapController lat={lat} lng={lng} />
    </MapContainer>
  );
}
