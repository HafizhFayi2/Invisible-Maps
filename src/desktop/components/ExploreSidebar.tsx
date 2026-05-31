import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient, MerchantRow } from '@/services/supabase';
import { Utensils, Shirt, Store, Settings, Activity, Navigation, Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'motion/react';

// ─── Haversine Distance Calculator ───────────────────────────────────────────
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 100) return '< 100m';
  if (meters < 1000) return `~${Math.round(meters / 10) * 10}m`;
  return `~${(meters / 1000).toFixed(1)}km`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ExploreSidebarProps {
  merchantCount: number | null;
  userPos: [number, number] | null;
}

export default function ExploreSidebar({ merchantCount, userPos }: ExploreSidebarProps) {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // ── Bottom Sheet State ──
  const controls = useAnimation();
  const [sheetState, setSheetState] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const navigate = useNavigate();

  useEffect(() => {
    async function loadMerchants() {
      setIsLoading(true);
      try {
        const client = getSupabaseClient();
        let query = client.from('core_merchants').select('*');
        
        if (activeCategory === 'Food') {
          query = query.ilike('category', '%Food%');
        } else if (activeCategory === 'Warung') {
          query = query.ilike('category', '%Retail%');
        } else if (activeCategory === 'Laundry' || activeCategory === 'Services') {
          query = query.ilike('category', '%Services%');
        }

        if (searchQuery.trim() !== '') {
          query = query.ilike('name', `%${searchQuery}%`);
        }

        const { data, error } = await query.limit(50);
        
        if (error) throw error;
        if (data) {
          let result = data as MerchantRow[];
          if (userPos) {
            result = result
              .filter(m => m.lat != null && m.lng != null)
              .sort((a, b) => {
                const distA = getDistanceMeters(userPos[0], userPos[1], a.lat!, a.lng!);
                const distB = getDistanceMeters(userPos[0], userPos[1], b.lat!, b.lng!);
                return distA - distB;
              })
              .slice(0, 20);
          } else {
            result = result.slice(0, 20);
          }
          setMerchants(result);
        }
      } catch (err) {
        console.error('[Sidebar] Failed to load merchants:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    const timer = setTimeout(() => loadMerchants(), 300);
    return () => clearTimeout(timer);
  }, [activeCategory, searchQuery, userPos]);

  // ── Handle Dragging & Snapping ──
  const getSnapPoints = () => {
    if (typeof window === 'undefined') return { full: 0, half: 0, collapsed: 0 };
    const h = window.innerHeight;
    return {
      full: 0, // Top of its container
      half: h * 0.45, // Halfway down
      collapsed: h - 220 // Push down so only top part is visible (accounting for padding)
    };
  };

  useEffect(() => {
    if (isMobile) {
      controls.start({ y: getSnapPoints()[sheetState], transition: { type: 'spring', bounce: 0.15, duration: 0.5 } });
    } else {
      controls.start({ y: 0 }); // Desktop doesn't use translate Y for state
    }
  }, [sheetState, isMobile, controls]);

  const handleDragEnd = (e: any, info: PanInfo) => {
    if (!isMobile) return;
    const points = getSnapPoints();
    const currentY = info.offset.y + getSnapPoints()[sheetState];
    const velocity = info.velocity.y;

    if (velocity < -400) {
      setSheetState(prev => prev === 'collapsed' ? 'half' : 'full');
    } else if (velocity > 400) {
      setSheetState(prev => prev === 'full' ? 'half' : 'collapsed');
    } else {
      const distFull = Math.abs(currentY - points.full);
      const distHalf = Math.abs(currentY - points.half);
      const distCollapsed = Math.abs(currentY - points.collapsed);
      const min = Math.min(distFull, distHalf, distCollapsed);
      if (min === distFull) setSheetState('full');
      else if (min === distHalf) setSheetState('half');
      else setSheetState('collapsed');
    }
  };

  const CATEGORIES = [
    { name: "All", icon: Activity },
    { name: "Food", icon: Utensils },
    { name: "Laundry", icon: Shirt },
    { name: "Warung", icon: Store },
    { name: "Services", icon: Settings },
  ];

  const getThumbnail = (m: MerchantRow) => {
    try {
      if (m.image_urls) {
        let urls = typeof m.image_urls === 'string' ? JSON.parse(m.image_urls) : m.image_urls;
        if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' && urls[0].startsWith('[')) {
           urls = JSON.parse(urls[0]);
        }
        if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') {
          return urls[0].replace(/^"|"$/g, '');
        }
      }
    } catch (e) {}
    return `https://placehold.co/400x160/141420/4285F4?text=${encodeURIComponent(m.category || 'Store')}`;
  };

  const getMerchantDistance = (m: MerchantRow): string => {
    if (!userPos || m.lat == null || m.lng == null) return '---';
    return formatDistance(getDistanceMeters(userPos[0], userPos[1], m.lat, m.lng));
  };

  return (
    <motion.div 
      initial={false}
      animate={controls}
      drag={isMobile ? "y" : false}
      dragConstraints={{ top: 0, bottom: isMobile ? getSnapPoints().collapsed : 0 }}
      dragElastic={0.1}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className={cn(
        "w-full md:w-[380px] lg:w-[420px] absolute left-0 md:left-6 md:bottom-6 z-[100] glass-panel rounded-t-[32px] md:rounded-[32px] flex flex-col pointer-events-auto shadow-[0_-16px_40px_-10px_rgba(0,0,0,0.08)] md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden",
        isMobile ? "h-[calc(100dvh-120px)] bottom-0" : "h-full max-h-[calc(100vh-140px)]"
      )}>
      
      {/* Mobile Handle */}
      <div 
        onClick={() => setSheetState(prev => prev === 'collapsed' ? 'half' : prev === 'half' ? 'full' : 'collapsed')}
        className="md:hidden w-full flex justify-center pt-4 pb-2 shrink-0 cursor-grab active:cursor-grabbing hover:bg-white/10 touch-none"
      >
        <div className="w-12 h-1.5 bg-[var(--border-light)] rounded-full" />
      </div>

      <div className="p-4 md:p-6 pb-3 md:pb-4 shrink-0 pt-2 md:pt-6">
        <div 
          onClick={() => { if (isMobile) setSheetState(prev => prev === 'collapsed' ? 'half' : 'collapsed'); }}
          className="flex items-center justify-between mb-3 md:mb-6 cursor-pointer md:cursor-default"
        >
          <div>
            <h2 className="text-[20px] md:text-[26px] font-extrabold tracking-tight text-[var(--text-main)]">Nearby Radar</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <p className="text-[11px] md:text-[12px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                {merchantCount !== null ? `${merchantCount} DEVICES FOUND` : 'LOADING...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 md:w-11 md:h-11 shadow-inner rounded-full bg-[var(--accent-glass)] border border-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] shrink-0">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            {/* Chevron Toggle on Mobile */}
            <div className="md:hidden w-6 h-6 flex items-center justify-center text-[var(--text-muted)] shrink-0">
              {sheetState === 'collapsed' ? <ChevronUp size={16} strokeWidth={3} /> : <ChevronDown size={16} strokeWidth={3} />}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative group/search mb-3 md:mb-5">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-teal-400 rounded-xl md:rounded-[20px] blur-md opacity-0 group-focus-within/search:opacity-[0.15] transition-opacity duration-500 pointer-events-none" />
          <div className="relative bg-white/80 backdrop-blur-xl border border-[var(--glass-border)] rounded-xl md:rounded-[20px] flex items-center shadow-sm hover:shadow-md transition-shadow">
            <Search className="ml-3 md:ml-4 text-[var(--text-muted)] group-focus-within/search:text-[var(--accent)] transition-colors shrink-0" size={16} strokeWidth={2.5} />
            <input 
              className="w-full bg-transparent py-2.5 md:py-4 px-3 text-[13px] md:text-[15px] font-bold text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="mr-2 p-1.5 bg-white rounded-lg shadow-sm border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent-glass)] transition-all shrink-0">
              <Filter size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        {/* Category pills */}
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[12px] font-bold whitespace-nowrap transition-all box-border shadow-sm",
                  isActive 
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)]" 
                    : "bg-white/70 backdrop-blur-md border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white"
                )}
              >
                <Icon size={14} strokeWidth={2.5} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Merchant list */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 pt-2 scrollbar-hide">
        <div className="flex flex-col gap-2.5 md:gap-3">
          {isLoading ? (
             Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 md:p-4 rounded-[16px] bg-white/30 animate-pulse border border-[var(--glass-border)] flex gap-3 items-center">
                <div className="w-11 h-11 rounded-[14px] bg-white/50 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-white/50 rounded-full w-2/3" />
                  <div className="h-2.5 bg-white/40 rounded-full w-1/2" />
                </div>
              </div>
            ))
          ) : merchants.length === 0 ? (
             <p className="text-xs font-bold text-[var(--text-muted)] text-center py-10">No merchants found.</p>
          ) : (
            <AnimatePresence>
              {merchants.map((merchant, idx) => {
                const distanceText = getMerchantDistance(merchant);
                const isNearby = userPos && merchant.lat != null && merchant.lng != null 
                  ? getDistanceMeters(userPos[0], userPos[1], merchant.lat, merchant.lng) < 500
                  : false;

                return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  key={merchant.id}
                  onClick={() => {
                    if (merchant.lat && merchant.lng) {
                      navigate(`?lat=${merchant.lat}&lng=${merchant.lng}`);
                    }
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.95)', y: -2 }}
                  className="p-3.5 md:p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-[var(--glass-border)] hover:border-[var(--accent)]/30 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex gap-3 md:gap-4 items-center group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--accent)]/5 to-transparent rounded-full blur-[20px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Thumbnail */}
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm border border-black/5 relative z-10 overflow-hidden bg-white">
                    <img 
                      src={getThumbnail(merchant)} 
                      alt={merchant.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x160/141420/4285F4?text=Store';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col gap-1 relative z-10 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-[14px] md:text-[15px] text-[var(--text-main)] leading-none group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                        {merchant.name}
                      </h4>
                      {/* Distance badge — real value from Haversine */}
                      <span className={cn(
                        "text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-sm border shrink-0",
                        isNearby
                          ? "text-[var(--accent)] bg-[var(--accent-glass)] border-[var(--accent)]/10"
                          : "text-[var(--text-muted)] bg-[var(--border-light)] border-transparent"
                      )}>
                        {distanceText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-muted)]">
                      <span className="text-[var(--text-main)] bg-[var(--border-light)] px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider truncate max-w-[80px]">
                        {merchant.category || 'Retail'}
                      </span>
                      <div className="flex items-center gap-1 group-hover:text-[var(--text-main)] transition-colors whitespace-nowrap">
                        <Navigation size={11} strokeWidth={3} /> 
                        <span>{distanceText === '---' ? 'No location' : 'away'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
