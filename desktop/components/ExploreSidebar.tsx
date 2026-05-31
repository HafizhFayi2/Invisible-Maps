import { useEffect, useState } from 'react';
import SearchBar from './SearchBar';
import { getSupabaseClient, MerchantRow } from '@/services/supabase';
import { Utensils, Shirt, Store, Settings, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExploreSidebar() {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>('Street Food');

  useEffect(() => {
    async function loadMerchants() {
      setIsLoading(true);
      try {
        const client = getSupabaseClient();
        // Fetch real data from supabase
        let query = client.from('core_merchants').select('*').limit(10);
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data) {
          setMerchants(data as MerchantRow[]);
        }
      } catch (err) {
        console.error('Failed to load merchants:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMerchants();
  }, [activeCategory]);

  const categories = [
    { name: 'Street Food', icon: Utensils, id: 'food' },
    { name: 'Laundry', icon: Shirt, id: 'laundry' },
    { name: 'Warung', icon: Store, id: 'warung' },
    { name: 'Services', icon: Settings, id: 'services' },
  ];

  return (
    <aside className="w-[380px] h-full flex-shrink-0 bg-surface flex flex-col border-r border-outline-variant z-10 overflow-hidden">
      <div className="p-4 flex flex-col gap-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-on-surface">Nearby Merchants</h2>
          <p className="text-sm text-on-surface-variant">Local discovery filters</p>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Category Filters */}
        <div className="flex flex-col gap-2 mt-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium w-full text-left",
                activeCategory === cat.name
                  ? "bg-[#5cb8fd] text-[#00476e]" // Reference to the blue selected state in image
                  : "text-on-surface hover:bg-surface-container"
              )}
            >
              <cat.icon className="w-5 h-5" />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discover Nearby Section */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">
          Discover Nearby
        </h3>
        
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center">No merchants found.</p>
          ) : (
            merchants.map((merchant) => (
              <div key={merchant.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant hover:shadow-md transition-shadow cursor-pointer">
                {/* Dummy Image for now, since DB might not have images yet, or we can use a generic gradient */}
                <div className="h-32 bg-surface-container-high relative">
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#2ecc71] border-2 border-white shadow-sm"></div>
                  {/* Provide a dummy nice background if no image */}
                  <img 
                    src={`https://source.unsplash.com/random/400x200?${merchant.category || 'store'}&sig=${merchant.id}`} 
                    alt={merchant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/e3efff/091d2e?text=Store';
                    }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-on-surface text-base">{merchant.name}</h4>
                    <div className="flex items-center gap-1 text-tertiary-container">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold text-on-surface">4.8</span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3">120m away • {merchant.city || 'Menteng'}</p>
                  <div className="flex gap-2">
                    {merchant.category && (
                      <span className="px-2 py-1 bg-surface-container text-on-surface text-[10px] font-bold rounded-md">
                        {merchant.category}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-[#d9eaff] text-[#006397] text-[10px] font-bold rounded-md">
                      QRIS
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
