import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MerchantMapPin } from '../../../src/types/merchant';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet marker icons issue fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icon for Merchant
const createCustomIcon = (type: string, color: string, bgColor: string, iconStr: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="flex flex-col items-center group cursor-pointer relative" style="transform: translate(-50%, -100%); width: 40px;">
        <div class="bg-surface-container-lowest p-1 rounded-full shadow-[0_4px_12px_rgba(0,109,55,0.2)] border border-surface-container mb-1 z-10 transition-transform group-hover:scale-110">
          <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center ${color}">
            <span class="material-symbols-outlined text-[18px]">${iconStr}</span>
          </div>
        </div>
        <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-surface-container-lowest -mt-[5px] drop-shadow-sm"></div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [0, 0],
  });
};

export default function MapPage() {
  const [merchants, setMerchants] = useState<MerchantMapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<[number, number]>([-6.200000, 106.816666]); // Default Jakarta

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        try {
          const res = await fetch(
            `/api/merchants?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=2000`,
          );
          const data = await res.json();
          setMerchants(data.merchants ?? []);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
      },
    );
  }, []);

  return (
    <div className="max-w-md mx-auto relative bg-surface-container-lowest text-on-surface font-body-md antialiased overflow-hidden h-[100dvh] w-full flex flex-col sm:border-x sm:border-zinc-200 shadow-2xl">
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 20px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { width: 100%; height: 100%; }
        .leaflet-control-container { display: none; }
      `}</style>

      {/* Top App Bar - Hidden on mobile, visible on md+ (but we are in mobile frame now, so let's keep it visible if we want, or hidden as per original) */}
      <header className="hidden md:flex absolute top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-sm items-center justify-between px-4 h-16 pt-safe">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high shrink-0">
            <img 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbgWaRPp2z9sYqUkIzJ7mUKbSo-UUq5eYfVDkXqAeiSjxbuQHnYE0HFha4nJRvsq99GY4hiBJX7IR1orRCkYYZNJ09jUo_3o_7i4SVr-JUFuGbjLBkGqZj6jMlqFxpUwpqANtB2bWlYxBvKxQmoDeuVofeQgiMqhtnQlz8_rq-N6fTH4Hq1YgXtCz6WqbaCPXrhBUPrHKw5wVRikcd5Rt3zASYz4Vkwz54OJ7nb5-ufTc_3pZZcRIecCPjyo7NqUK3A1AwMLgDEI5Z" 
              alt="Profile" 
            />
          </div>
          <h1 className="font-plus-jakarta text-xl font-extrabold tracking-tight text-emerald-600">Invisible Map</h1>
        </div>
        <button className="text-zinc-400 hover:text-emerald-500 p-2 rounded-full hover:bg-zinc-50 transition-colors">
          <span className="material-symbols-outlined">mic</span>
        </button>
      </header>

      {/* Map Canvas Area */}
      <main className="flex-1 relative w-full h-full bg-surface-variant overflow-hidden">
        
        {/* Leaflet Satellite Map */}
        <div className="absolute inset-0 w-full h-full z-0">
          <MapContainer center={userLoc} zoom={15} zoomControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            />
            {merchants.map((m, idx) => {
               // Determine icon based on mock category
               let bgColor = 'bg-tertiary-container';
               let color = 'text-on-tertiary-container';
               let icon = 'restaurant';
               if (m.category === 'Service') { bgColor = 'bg-secondary-container'; color = 'text-on-secondary-container'; icon = 'local_laundry_service'; }
               if (m.category === 'Retail') { bgColor = 'bg-surface-tint'; color = 'text-on-primary'; icon = 'storefront'; }

               return (
                 <Marker 
                   key={idx} 
                   position={[m.lat, m.lng]} 
                   icon={createCustomIcon(m.category || 'Food', color, bgColor, icon)}
                 >
                   <Popup className="font-label-sm">{m.name}</Popup>
                 </Marker>
               );
            })}
          </MapContainer>
          {/* Overlay to darken satellite a bit for UI readability */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none z-[400]"></div>
        </div>

        {/* User Location Indicator (Center Screen Overlay) */}
        <div className="absolute top-[45%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-[410] pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-primary-fixed/20 animate-pulse absolute"></div>
          <div className="w-6 h-6 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center z-10">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
          </div>
        </div>

        {/* Overlay UI Elements */}
        <div className="absolute inset-0 w-full h-full pointer-events-none flex flex-col justify-between pt-safe pb-24 md:pt-4 z-[420]">
          
          {/* Top Controls (Search & Filters) */}
          <div className="px-margin-mobile flex flex-col gap-sm pointer-events-auto mt-4 w-full">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex items-center px-4 h-12 w-full focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-shadow">
              <span className="material-symbols-outlined text-on-surface-variant mr-3">search</span>
              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant outline-none" 
                placeholder="Search for warungs, food carts..." 
                type="text"
              />
              <button className="text-primary hover:text-surface-tint p-2 -mr-2 rounded-full hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>

            <div className="flex gap-sm overflow-x-auto hide-scrollbar py-1">
              <button className="shrink-0 h-8 px-4 rounded-full bg-primary text-on-primary font-label-sm text-label-sm border border-transparent flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">tune</span> All
              </button>
              <button className="shrink-0 h-8 px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm border border-outline-variant hover:bg-surface-container-low flex items-center gap-1 shadow-sm transition-colors">
                <span className="material-symbols-outlined text-[16px]">restaurant</span> Food
              </button>
              <button className="shrink-0 h-8 px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm border border-outline-variant hover:bg-surface-container-low flex items-center gap-1 shadow-sm transition-colors">
                <span className="material-symbols-outlined text-[16px]">storefront</span> Retail
              </button>
              <button className="shrink-0 h-8 px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm border border-outline-variant hover:bg-surface-container-low flex items-center gap-1 shadow-sm transition-colors">
                <span className="material-symbols-outlined text-[16px]">handyman</span> Services
              </button>
            </div>
          </div>

          {/* Bottom Floating Actions & Discover Tray */}
          <div className="px-margin-mobile flex flex-col gap-md pointer-events-auto w-full mb-4">
            <div className="flex justify-end gap-3 mb-2">
              <button className="w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center border border-outline-variant hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">my_location</span>
              </button>
              <Link to="/scan" className="h-12 px-5 rounded-full bg-primary text-on-primary shadow-[0_4px_12px_rgba(0,109,55,0.3)] flex items-center justify-center font-label-bold text-label-bold uppercase tracking-wider hover:bg-surface-tint active:scale-95 transition-all">
                <span className="material-symbols-outlined mr-2">qr_code_scanner</span> Scan QRIS
              </Link>
            </div>

            {/* Discover Nearby Tray */}
            <div className="bg-surface-container-lowest rounded-t-[24px] rounded-b-xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border border-outline-variant overflow-hidden flex flex-col">
              <div className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-outline-variant/50"></div>
              </div>
              <div className="px-md pb-md">
                <h2 className="font-title-sm text-title-sm text-on-surface mb-sm">Discover Nearby</h2>
                
                <div className="flex gap-gutter-mobile overflow-x-auto hide-scrollbar pb-2">
                  {loading && <p className="text-zinc-500">Mencari merchant sekitar...</p>}
                  {!loading && merchants.length === 0 && (
                     <div className="shrink-0 w-64 rounded-xl border border-outline-variant bg-surface overflow-hidden shadow-sm p-4">
                       <p className="text-sm text-zinc-500">Tidak ada merchant di sekitar Anda.</p>
                     </div>
                  )}

                  {!loading && merchants.map((m, idx) => (
                    <div key={idx} className="shrink-0 w-64 rounded-xl border border-outline-variant bg-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className="h-24 w-full bg-surface-container relative">
                        <img 
                          alt="Merchant" 
                          className="w-full h-full object-cover" 
                          src={idx % 2 === 0 
                            ? "https://lh3.googleusercontent.com/aida-public/AB6AXuCYcHw7o3a88f-pfrfPRj-UAwnBAJVTZiAASv0nhFWzJL_NIwIQfLNiodsak6xLiEk1YGchwjD1hEDzoZwe1tFEp6Ya8D3N439Ql1Q5juTgfhBwam6l3nFnq2Ck-MShn6rkyhE6cEtWcf_9K8zqbsyVxyoZqAggkUwSdWPAnUeCh-I42FW81w4KJ1v4KYbjs26jrCqLQiRc5tvUnda3vbmQP1uFUxo0Dg8BBUnd-fF-G4tcUUunr6m-7sq7841rR1RfDkEVy6Hb2qhq"
                            : "https://lh3.googleusercontent.com/aida-public/AB6AXuC0X6guTLZr-HzNWbAbQIVjpe_dSAbmaHKdsiYZ4moeuJZSO9YosJ784lKsBVwcG9vDBXnrzxtljfKn7LEtYxZPCUv0tQfLbFyNrjsLAwbgeysY4BHMc43a7vR8StvrMjv59370XQprSvZFMiADYzxAZD49O-iySS_Y2MUfnSYpplMqiB5au1x7TR9bdO7ZqLGW50fkktWepVH4Jm2sR9OuA2HR3LFx7-a6wd66IhIloJhX1_Bqek5oebsN4lGzk8f2lVHh6qmh2nwv"}
                        />
                        {m.status === 'VERIFIED_INVISIBLE' && (
                          <div className="absolute top-2 right-2 bg-primary-container text-on-primary-container text-[10px] font-label-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-[12px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                            AI Verified
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-label-bold text-label-bold text-on-surface line-clamp-1">{m.name}</h3>
                          <span className="flex items-center text-tertiary-container text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[14px] mr-0.5" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                            4.8
                          </span>
                        </div>
                        <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-1 mb-2">
                          {m.category || 'Merchant'} • 120m away
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-2 py-0.5 rounded-md font-label-sm">Halal</span>
                          <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] px-2 py-0.5 rounded-md font-label-sm">QRIS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="absolute bottom-0 w-full z-[500] border-t rounded-t-lg bg-white border-zinc-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex justify-around items-center h-20 px-2 pb-safe">
        <Link to="/map" className="flex flex-col items-center justify-center text-emerald-600 bg-emerald-50 rounded-xl px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>map</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Map</span>
        </Link>
        <Link to="/discover" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">explore</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Discover</span>
        </Link>
        <Link to="/scan" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">qr_code_scanner</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Scan</span>
        </Link>
        <Link to="/contribute" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
