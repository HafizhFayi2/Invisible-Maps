import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Pin marker merah di titik klik
const redPin = L.divIcon({
  className: '',
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#EA4335;border:2px solid white;box-shadow:0 0 6px rgba(234,67,53,0.8)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 17, { animate: false });
  }, [lat, lng, map]);
  return null;
}

interface MiniMapProps {
  lat: number;
  lng: number;
}

export default function MiniMap({ lat, lng }: MiniMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      attributionControl={false}
      className="w-full h-full"
      style={{ background: '#0a0a12' }}
    >
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        maxZoom={20}
      />
      <Marker position={[lat, lng]} icon={redPin} />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  );
}
