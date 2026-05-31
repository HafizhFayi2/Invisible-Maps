import { useState, FormEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/services/supabase';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: 'database' | 'osm';
}

interface SearchBarProps {
  onResultSelect?: (result: SearchResult) => void;
}

export default function SearchBar({ onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      // 1. Priority Search: Supabase 'core_merchants'
      const { data: dbData, error: dbError } = await client
        .from('core_merchants')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (dbError) throw dbError;

      if (dbData && dbData.length > 0) {
        // We found it in DB
        const result: SearchResult = {
          id: dbData[0].id,
          name: dbData[0].name,
          address: dbData[0].address || '',
          lat: dbData[0].latitude,
          lng: dbData[0].longitude,
          source: 'database'
        };
        onResultSelect?.(result);
        setIsLoading(false);
        return;
      }

      // 2. Fallback Search: Nominatim OSM
      const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const osmData = await osmRes.json();

      if (osmData && osmData.length > 0) {
        const result: SearchResult = {
          id: `osm-${osmData[0].place_id}`,
          name: osmData[0].display_name.split(',')[0],
          address: osmData[0].display_name,
          lat: parseFloat(osmData[0].lat),
          lng: parseFloat(osmData[0].lon),
          source: 'osm'
        };
        onResultSelect?.(result);
      } else {
        setError('Data tidak ditemukan atau tidak tersedia');
        // Hide error after 3 seconds
        setTimeout(() => setError(null), 3000);
      }

    } catch (err) {
      console.error('Search error:', err);
      setError('Terjadi kesalahan saat mencari');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative pointer-events-auto w-full">
      <form 
        onSubmit={handleSearch}
        className="flex items-center w-full h-12 bg-surface border border-outline-variant rounded-xl transition-all duration-0 focus-within:border-primary focus-within:bg-surface-container-lowest"
      >
        <div className="pl-3 pr-2 text-on-surface-variant flex items-center justify-center">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for warungs, food carts..."
          className="flex-1 h-full bg-transparent outline-none border-none text-on-surface placeholder:text-on-surface-variant/70 text-sm font-medium"
        />
      </form>

      {/* Aesthetic Error Notification */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-error-container text-on-error-container text-sm font-medium rounded-xl shadow-md border border-error/20 flex items-center justify-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}
    </div>
  );
}
