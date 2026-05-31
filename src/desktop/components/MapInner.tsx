import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { SelectedLocation } from '@/types';
import { getAllMerchants, MerchantRow } from '@/services/supabase';
import LocationGuard from './LocationGuard';
import { Crosshair, LocateFixed, Plus, Minus } from 'lucide-react';

// ─── Icon Factories ───────────────────────────────────────────────────────────

/** AI scan pulsing marker (Google-colours) */
function createLensMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div class="lens-map-marker">
        <div class="lens-pulse-ring ring-blue"></div>
        <div class="lens-pulse-ring ring-red" style="animation-delay:0.15s"></div>
        <div class="lens-pulse-ring ring-yellow" style="animation-delay:0.3s"></div>
        <div class="lens-pulse-ring ring-green" style="animation-delay:0.45s"></div>
        <div class="lens-core"></div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

/** Radar sweep marker centred on the user's position */
function createRadarIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div class="radar-origin">
        <div class="radar-ring r1"></div>
        <div class="radar-ring r2"></div>
        <div class="radar-ring r3"></div>
        <div class="radar-sweep"></div>
        <div class="radar-dot"></div>
      </div>
    `,
    iconSize: [280, 280],
    iconAnchor: [140, 140],
  });
}

/** Diamond photo marker for each UMKM merchant */
function createMerchantIcon(merchant: MerchantRow, revealDelay: number, isSelected: boolean = false): L.DivIcon {
  const isFood = merchant.category?.toLowerCase().includes('food') || merchant.category?.toLowerCase().includes('cafe');
  
  // Choose SVG based on category (Fork/Knife for food, Store for retail)
  const iconSvg = isFood
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`;

  const activeOpacity = isSelected ? 'opacity-40' : '';
  const activeShadow = isSelected ? 'shadow-[0_12px_32px_rgba(16,185,129,0.25)] border-[#10b981]' : '';
  const activeBorder = isSelected ? 'border-[#10b981]' : '';

  return L.divIcon({
    className: '',
    html: `
      <div class="relative flex flex-col items-center group cursor-pointer pointer-events-auto" style="animation: merchant-reveal 0.5s ease-out both; animation-delay:${revealDelay}ms">
        <div class="absolute -bottom-1.5 w-6 h-2.5 bg-black/10 blur-[3px] rounded-full group-hover:bg-black/20 group-hover:w-8 transition-all duration-300"></div>
        <div class="absolute inset-0 bg-[#10b981] blur-[16px] opacity-0 group-hover:opacity-40 rounded-full transition-opacity duration-300 ${activeOpacity}"></div>
        <div class="w-12 h-12 bg-white rounded-2xl rounded-br-sm rotate-45 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center relative overflow-hidden group-hover:shadow-[0_12px_32px_rgba(16,185,129,0.25)] transition-all duration-300 z-10 box-border ${activeShadow}">
          <div class="absolute inset-0 rounded-2xl rounded-br-sm border-2 border-[#10b981]/10 group-hover:border-[#10b981] transition-all duration-300 pointer-events-none ${activeBorder}"></div>
          <div class="-rotate-45 flex flex-col items-center justify-center text-[#10b981]">
            ${iconSvg}
          </div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

/** User's live location dot */
function createUserLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div class="user-location-dot">
        <div class="user-location-pulse"></div>
        <div class="user-location-core"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// ─── CSS Injection ────────────────────────────────────────────────────────────

const RADAR_CSS = `
/* ─ Radar origin ─ */
.radar-origin {
  position: relative;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.radar-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(16,185,129,0.35);
  animation: radar-expand 3s ease-out infinite;
}
.radar-ring.r1 { width: 80px; height: 80px; animation-delay: 0s; }
.radar-ring.r2 { width: 160px; height: 160px; animation-delay: 0.5s; }
.radar-ring.r3 { width: 260px; height: 260px; animation-delay: 1s; }
@keyframes radar-expand {
  0%   { opacity: 0.8; transform: scale(0.95); }
  50%  { opacity: 0.4; }
  100% { opacity: 0;   transform: scale(1.05); }
}
.radar-sweep {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 270deg, rgba(16,185,129,0.3) 360deg);
  animation: radar-rotate 2.5s linear infinite;
  transform-origin: center center;
}
@keyframes radar-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.radar-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px 3px rgba(16,185,129,0.5);
  z-index: 10;
}

/* ─ Merchant photo marker ─ */
/* ─ Merchant Diamond Pin ─ */
.merchant-map-pin {
  width: 40px;
  height: 40px;
  position: relative;
  animation: merchant-reveal 0.5s ease-out both;
  display: flex;
  align-items: center;
  justify-content: center;
}
@keyframes merchant-reveal {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}
.pin-inner {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 8px;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1.5px solid rgba(16,185,129,0.3);
  transition: all 0.3s ease;
}
.pin-inner > svg {
  transform: rotate(-45deg);
}

/* Glow effect when selected */
.merchant-map-pin.merchant-glow-active .pin-inner {
  border: 2px solid #10b981;
  background: #ecfdf5; /* emerald-50 */
  box-shadow: 0 0 20px 5px rgba(16,185,129,0.6);
  transform: rotate(45deg) scale(1.15);
}

/* ─ User location dot ─ */
.user-location-dot {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-location-pulse {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(59,130,246,0.3);
  animation: user-pulse 2s ease-out infinite;
}
@keyframes user-pulse {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
.user-location-core {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2.5px solid #fff;
  box-shadow: 0 0 6px rgba(59,130,246,0.6);
  position: relative;
  z-index: 2;
}

/* ─ Lens click marker ─ */
.lens-map-marker { position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center; }
.lens-pulse-ring { position:absolute; width:48px; height:48px; border-radius:50%; border:2px solid; animation:lens-pulse 1.4s ease-out infinite; opacity:0; }
.ring-blue { border-color:#4285F4; }
.ring-red  { border-color:#EA4335; }
.ring-yellow { border-color:#FBBC05; }
.ring-green  { border-color:#34A853; }
@keyframes lens-pulse { 0% { transform:scale(0.5); opacity:0.8; } 100% { transform:scale(2.5); opacity:0; } }
.lens-core { width:14px; height:14px; border-radius:50%; background:#fff; border:2px solid #333; box-shadow:0 0 0 2px rgba(255,255,255,0.4); }
`;

function injectRadarCSS() {
  if (document.getElementById('radar-map-styles')) return;
  const style = document.createElement('style');
  style.id = 'radar-map-styles';
  style.textContent = RADAR_CSS;
  document.head.appendChild(style);
}

// ─── Map Controller ───────────────────────────────────────────────────────────

interface MapControllerProps {
  lat: string | null;
  lng: string | null;
  onLocationClick: (loc: SelectedLocation) => void;
  onMerchantClick?: (merchant: MerchantRow) => void;
  userPos: [number, number] | null;
  merchants: MerchantRow[];
  revealed: boolean;
  onMapReady: (map: LeafletMap) => void;
}

function MapController({
  lat,
  lng,
  onLocationClick,
  onMerchantClick,
  userPos,
  merchants,
  revealed,
  onMapReady,
}: MapControllerProps) {
  const map = useMap();
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);
  const merchantLayerRef = useRef<L.LayerGroup | null>(null);

  // Expose map instance to parent (so buttons outside MapContainer can control it)
  useEffect(() => {
    onMapReady(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useMapEvents({
    click(e) {
      const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setClickedPos(pos);
      onLocationClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  // Fly to merchant when URL params set (zoom deep enough to see the warung)
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([parseFloat(lat), parseFloat(lng)], 19, { animate: true, duration: 1.8 });
    }
  }, [lat, lng, map]);

  // Also fly to userPos when it first becomes available
  useEffect(() => {
    if (userPos) {
      map.flyTo(userPos, 17, { animate: true, duration: 1.5 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos]);

  // Place merchant photo markers once radar reveals them
  useEffect(() => {
    if (!revealed || merchants.length === 0) return;

    // Clean up old layer
    if (merchantLayerRef.current) {
      map.removeLayer(merchantLayerRef.current);
    }

    const layer = L.layerGroup();
    merchants.forEach((m, idx) => {
      if (!m.lat || !m.lng) return;
      const delay = idx * 80; // stagger per marker
      const isSelected = String(m.lat) === String(lat) && String(m.lng) === String(lng);
      const icon = createMerchantIcon(m, delay, isSelected);
      const marker = L.marker([m.lat, m.lng], { icon });

      // Tooltip on hover
      marker.bindTooltip(
        `<div style="font-family:system-ui;font-size:12px;font-weight:600;color:#065f46;padding:2px 4px">${m.name}</div>`,
        { direction: 'top', offset: [0, -30], permanent: false }
      );

      // Navigate to Discover when merchant marker is clicked
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onMerchantClick?.(m);
      });

      layer.addLayer(marker);
    });

    layer.addTo(map);
    merchantLayerRef.current = layer;

    return () => {
      if (merchantLayerRef.current) map.removeLayer(merchantLayerRef.current);
    };
  }, [revealed, merchants, map, lat, lng]);

  return (
    <>
      {/* User location dot */}
      {userPos && (
        <Marker position={userPos} icon={createUserLocationIcon()} />
      )}

      {/* Radar sweep (only during scanning phase) */}
      {userPos && !revealed && (
        <Marker position={userPos} icon={createRadarIcon()} />
      )}

      {/* AI scan click marker */}
      {clickedPos && (
        <Marker position={clickedPos} icon={createLensMarkerIcon()} />
      )}
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

type GeoState = 'idle' | 'requesting' | 'granted' | 'denied';

interface MapInnerProps {
  lat: string | null;
  lng: string | null;
  onLocationClick: (loc: SelectedLocation) => void;
  onMerchantClick?: (merchant: MerchantRow) => void;
  onUserPosChange?: (pos: [number, number] | null) => void;
  refreshKey?: number;
}

export default function MapInner({ lat, lng, onLocationClick, onMerchantClick, onUserPosChange, refreshKey }: MapInnerProps) {
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [revealed, setRevealed] = useState(false);
  const radarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the Leaflet map instance — set by MapController via onMapReady
  const mapRef = useRef<LeafletMap | null>(null);

  // Inject CSS once
  useEffect(() => {
    injectRadarCSS();
  }, []);

  // Load all merchants from DB
  useEffect(() => {
    getAllMerchants().then(setMerchants);
  }, [refreshKey]);

  const requestGeo = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('denied');
      return;
    }
    setGeoState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords);
        onUserPosChange?.(coords);
        setGeoState('granted');
        setRevealed(false);

        // 3-second radar scan → then reveal merchants
        if (radarTimerRef.current) clearTimeout(radarTimerRef.current);
        radarTimerRef.current = setTimeout(() => {
          setRevealed(true);
        }, 3000);
      },
      () => {
        setGeoState('denied');
        onUserPosChange?.(null);
        setRevealed(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onUserPosChange]);

  // Auto-request on mount
  useEffect(() => {
    requestGeo();
    return () => {
      if (radarTimerRef.current) clearTimeout(radarTimerRef.current);
    };
  }, [requestGeo]);

  // ── Map control handlers (run OUTSIDE MapContainer to avoid Leaflet click interception)
  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mapRef.current?.zoomIn();
  };
  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mapRef.current?.zoomOut();
  };
  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (userPos) {
      mapRef.current?.flyTo(userPos, 17, { animate: true, duration: 1.2 });
    } else {
      requestGeo();
    }
  };

  const showGuard = geoState === 'idle' || geoState === 'requesting' || geoState === 'denied';

  return (
    <div className="w-full h-full relative">
      {/* Map (always rendered so it loads in background) */}
      <MapContainer
        center={userPos ?? defaultCenter}
        zoom={15}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution="&copy; Google Maps"
          maxZoom={20}
        />
        <MapController
          lat={lat}
          lng={lng}
          onLocationClick={onLocationClick}
          onMerchantClick={onMerchantClick}
          userPos={userPos}
          merchants={merchants}
          revealed={revealed || geoState === 'denied'}
          onMapReady={(m) => { mapRef.current = m; }}
        />
      </MapContainer>

      {/* ── Map Controls — OUTSIDE MapContainer to prevent Leaflet click interception ── */}
      <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-[1500] pointer-events-none flex flex-col items-end">
        <div className="glass-panel p-1.5 md:p-2 rounded-[20px] md:rounded-[24px] flex flex-col gap-1.5 md:gap-2 shadow-xl pointer-events-auto">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleLocate}
            title={userPos ? 'Kembali ke lokasi saya' : 'Aktifkan lokasi'}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[14px] md:rounded-[16px] bg-white/60 hover:bg-white hover:shadow-sm transition-all border group relative ${
              userPos
                ? 'text-[var(--accent)] border-[var(--accent)]/20 hover:border-[var(--accent)]/40'
                : 'text-orange-500 border-orange-200 hover:border-orange-400 animate-pulse'
            }`}
          >
            <LocateFixed size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            {!userPos && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white" />
            )}
          </button>
          <div className="h-px bg-[var(--border-light)] mx-2 md:mx-3"></div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleZoomIn}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[14px] md:rounded-[16px] bg-white/60 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-[var(--glass-border)] group"
          >
            <Plus size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleZoomOut}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[14px] md:rounded-[16px] bg-white/60 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-[var(--glass-border)] group"
          >
            <Minus size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Privacy Guard Overlay */}
      {showGuard && (
        <LocationGuard
          onGranted={requestGeo}
          isRequesting={geoState === 'requesting'}
          isDenied={geoState === 'denied'}
        />
      )}

      {/* Radar scanning HUD */}
      {geoState === 'granted' && !revealed && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-[1500] pointer-events-auto">
          <div className="glass-panel rounded-full px-5 md:px-6 py-2.5 md:py-3.5 flex items-center gap-4 md:gap-5 shadow-[0_12px_24px_-8px_rgba(16,185,129,0.2)] md:shadow-[0_16px_32px_-12px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-[var(--accent)]"></span>
              </div>
              <span className="text-[11px] md:text-[13px] font-extrabold tracking-[0.2em] uppercase text-[var(--text-main)] leading-none mt-0.5">Scanning</span>
            </div>
            <div className="w-px h-4 md:h-5 bg-[var(--border-light)]"></div>
            <span className="text-[11px] md:text-[13px] font-bold text-[var(--text-muted)] flex items-center gap-2">
              <Crosshair size={12} className="md:w-3.5 md:h-3.5" strokeWidth={2.5}/> Radar Active
            </span>
          </div>
        </div>
      )}

      {/* Reveal count badge / Active state */}
      {geoState === 'granted' && revealed && merchants.length > 0 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-[1500] pointer-events-auto hover:-translate-y-1 transition-transform duration-300">
          <div className="glass-panel rounded-full px-5 md:px-6 py-2.5 md:py-3.5 flex items-center gap-4 md:gap-5 shadow-[0_12px_24px_-8px_rgba(16,185,129,0.2)] md:shadow-[0_16px_32px_-12px_rgba(16,185,129,0.2)]" style={{ animation: 'merchant-reveal 0.5s ease-out both' }}>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-[var(--accent)]"></span>
              </div>
              <span className="text-[11px] md:text-[13px] font-extrabold tracking-[0.2em] uppercase text-[var(--text-main)] leading-none mt-0.5">Active</span>
            </div>
            <div className="w-px h-4 md:h-5 bg-[var(--border-light)]"></div>
            <span className="text-[11px] md:text-[13px] font-bold text-[var(--text-muted)] flex items-center gap-2">
              <Crosshair size={12} className="md:w-3.5 md:h-3.5" strokeWidth={2.5}/> Scanning Area
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

