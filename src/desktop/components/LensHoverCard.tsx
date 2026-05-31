import { useEffect, useState } from 'react';
import { analyzeLocationWithGemini } from '@/engine/gemini';
import { Star, MapPin, X } from 'lucide-react';
import { Popup } from 'react-leaflet';

interface LensHoverCardProps {
  location: { lat: number; lng: number };
  onClose: () => void;
}

interface GeminiData {
  name: string;
  description: string;
  rating: string;
  image_keyword: string;
}

export default function LensHoverCard({ location, onClose }: LensHoverCardProps) {
  const [data, setData] = useState<GeminiData | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    async function scanLocation() {
      setIsScanning(true);
      
      // Attempt to get API keys from environment
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      const backupKeysStr = import.meta.env.VITE_GEMINI_BACKUP_KEYS || '';
      const allKeys = [apiKey, ...backupKeysStr.split(',')].map(k => k.trim()).filter(Boolean);
      
      if (allKeys.length === 0) {
        console.warn('VITE_GEMINI_API_KEY is missing');
        setIsScanning(false);
        return;
      }

      const result = await analyzeLocationWithGemini(location.lat, location.lng, allKeys);
      if (result) {
        setData(result);
      } else {
        // Fallback data if Gemini fails
        setData({
          name: 'Lokasi Tidak Diketahui',
          description: 'Gemini tidak dapat mengidentifikasi area ini.',
          rating: 'N/A',
          image_keyword: 'map',
        });
      }
      setIsScanning(false);
    }

    scanLocation();
  }, [location.lat, location.lng]);

  return (
    <Popup 
      position={[location.lat, location.lng]} 
      closeButton={false} 
      className="lens-popup-override"
      eventHandlers={{
        remove: onClose
      }}
    >
      <div className="relative w-64 md:w-72 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden p-0 animate-in fade-in zoom-in duration-300">
        
        {/* Close Button overlay */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isScanning ? (
          <div className="flex flex-col items-center justify-center p-8 h-48">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#4285F4] animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '300ms' }}></div>
              <div className="w-3 h-3 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '450ms' }}></div>
            </div>
            <p className="text-sm font-semibold text-on-surface animate-pulse">Scanning area...</p>
          </div>
        ) : data ? (
          <div className="flex flex-col">
            <div className="h-32 w-full bg-surface-container-high relative">
              <img 
                src={`https://source.unsplash.com/random/400x200?${encodeURIComponent(data.image_keyword)}&sig=${location.lat}`}
                alt={data.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/e3efff/091d2e?text=Location';
                }}
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-base text-on-surface leading-tight pr-2">{data.name}</h4>
                <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md text-tertiary-container shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[11px] font-bold text-on-surface">{data.rating}</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant line-clamp-3 mb-3">
                {data.description}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant font-medium">
                <MapPin className="w-3 h-3" />
                <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Popup>
  );
}
