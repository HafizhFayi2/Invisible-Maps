import React, { useEffect, useState, useCallback } from 'react';
import { Store, Clock, BarChart2, Star, ArrowRight, ScanLine, Map, Shield, Calendar, MapPin, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMerchantCount, getRecentMerchants, getQrisMerchantCount, getRecentActivities, MerchantRow, ScanActivityRow } from '@/services/supabase';
import QRISScanner from '../components/QRISScanner';

// ─── Skeleton Components ──────────────────────────────────────────────────────

function MetricSkeleton() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-gray-100 rounded-full mb-2" />
        <div className="h-8 w-16 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

function MerchantCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 animate-pulse">
      <div className="w-full h-28 bg-gray-100 rounded-lg mb-3" />
      <div className="h-3 w-3/4 bg-gray-200 rounded-full mb-2" />
      <div className="h-3 w-1/2 bg-gray-100 rounded-full mb-3" />
      <div className="h-5 w-16 bg-gray-100 rounded-full" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface HomeViewProps {
  onMerchantAdded?: () => void;
  onOpenScanner?: () => void;
}

export default function HomeView({ onMerchantAdded, onOpenScanner }: HomeViewProps) {
  const navigate = useNavigate();
  const [merchantCount, setMerchantCount] = useState<number | null>(null);
  const [qrisCount, setQrisCount] = useState<number | null>(null);
  const [recentMerchants, setRecentMerchants] = useState<MerchantRow[]>([]);
  const [recentActivities, setRecentActivities] = useState<ScanActivityRow[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  // Forward scanner open to parent if provided
  const openScanner = () => { if (onOpenScanner) onOpenScanner(); else setShowScanner(true); };

  const loadData = useCallback(() => {
    setLoadingMetrics(true);
    setLoadingMerchants(true);
    setLoadingActivities(true);

    getMerchantCount()
      .then(setMerchantCount)
      .finally(() => setLoadingMetrics(false));

    getQrisMerchantCount()
      .then(setQrisCount);

    getRecentMerchants(3)
      .then(setRecentMerchants)
      .finally(() => setLoadingMerchants(false));

    getRecentActivities(5)
      .then(setRecentActivities)
      .finally(() => setLoadingActivities(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Called after a successful QRIS scan
  const handleScanSuccess = useCallback((merchant: MerchantRow) => {
    console.log('[HomeView] QRIS scan success:', merchant.name);
    // Refresh metrics & recent list
    loadData();
    // Bubble up to DesktopApp so the map refreshes
    onMerchantAdded?.();
  }, [loadData, onMerchantAdded]);

  const metrics = merchantCount !== null
    ? [
        {
          title: 'Total Merchants',
          value: merchantCount.toLocaleString(),
          icon: <Store className="text-emerald-600 w-5 h-5" />,
          bg: 'bg-emerald-50',
        },
        {
          title: 'Newly Added',
          value: recentMerchants.length.toString(),
          icon: <Clock className="text-teal-600 w-5 h-5" />,
          bg: 'bg-teal-50',
        },
        {
          title: 'With QRIS',
          // Real count from DB (nmid IS NOT NULL), fallback while loading
          value: qrisCount !== null ? qrisCount.toLocaleString() : '…',
          icon: <BarChart2 className="text-blue-600 w-5 h-5" />,
          bg: 'bg-blue-50',
        },
      ]
    : [];

  const getMerchantThumb = (m: MerchantRow) => {
    if (m.images && m.images.length > 0) return m.images[0];
    if (m.image_urls) {
      try {
        const arr = JSON.parse(m.image_urls as string);
        if (Array.isArray(arr) && arr.length > 0) return arr[0];
      } catch {
        if (typeof m.image_urls === 'string') return m.image_urls;
      }
    }
    return `https://placehold.co/300x160/f0fdf4/10b981?text=${encodeURIComponent(m.name?.slice(0, 8) || 'UMKM')}`;
  };

  return (
    <div 
      className="max-w-6xl mx-auto p-4 md:p-8 relative w-full pb-20 md:pb-8"
    >

      <h1 className="text-3xl md:text-5xl font-bold text-emerald-700 mb-2 mt-4">Welcome Back</h1>
      <p className="text-slate-500 mb-8 text-sm">Live data from the Invisible Map database.</p>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Metrics */}
        <div className="w-full md:w-1/3">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Live Metrics</h2>
          <div className="flex gap-4 flex-col">
            {loadingMetrics
              ? [0, 1, 2].map((i) => <MetricSkeleton key={i} />)
              : metrics.map((m, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className={`${m.bg} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      {m.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{m.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{m.value}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Recent Merchants */}
        <div className="w-full md:w-2/3">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex justify-between items-center">
            Newest Merchants
            <button
              onClick={() => navigate('/discover')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 group"
            >
              View All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {loadingMerchants
              ? [0, 1, 2, 4].map((i) => <MerchantCardSkeleton key={i} />)
              : recentMerchants.length === 0
                ? (
                    <div className="col-span-2 text-slate-400 text-sm py-10">
                      No merchant data found. Run the seed script.
                    </div>
                  )
                : recentMerchants.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md transition"
                      onClick={() => navigate('/discover')}
                    >
                      <img
                        src={getMerchantThumb(m)}
                        alt={m.name}
                        className="w-full h-28 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/300x160/f0fdf4/10b981?text=UMKM';
                        }}
                      />
                      <h3 className="font-semibold text-sm mb-1 text-gray-900 truncate">{m.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-1 gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs truncate">{m.city || 'Indonesia'}</span>
                      </div>
                      {m.category && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                          {m.category}
                        </span>
                      )}
                    </div>
                  ))}
          </div>
        </div>
      </div>

      {/* ── Recent Mapping Activities Section ── */}
      <div className="mt-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />
          Recent Mapping Activities
        </h2>
        {loadingActivities ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-50 rounded-xl border border-gray-100/50" />
            ))}
          </div>
        ) : recentActivities.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No scan activities logged yet. Scan some QRIS to populate.</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => navigate(`/explore?lat=${act.lat}&lng=${act.lng}`)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl border border-gray-50 bg-slate-50/30 hover:bg-slate-50 hover:border-emerald-200 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 leading-snug truncate">{act.merchant_name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-0.5 whitespace-nowrap"><MapPin className="w-3 h-3 text-slate-400" /> <span className="truncate max-w-[100px]">{act.merchant_city || 'Unknown City'}</span></span>
                      <span className="hidden sm:inline">•</span>
                      <span className="font-mono text-[10px] whitespace-nowrap">NMID: {act.nmid}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-0.5 whitespace-nowrap"><Calendar className="w-3 h-3" /> {new Date(act.scanned_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full ${
                    act.result_status === 'VERIFIED_INVISIBLE' || act.result_status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : act.result_status === 'SCANNED' || act.result_status === 'UNVERIFIED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {act.result_status}
                  </span>
                  <span className="flex items-center text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                    <Shield className="w-3 h-3 text-emerald-500 mr-0.5" />
                    {act.result_confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── QRIS Scanner Modal ── */}
      {showScanner && (
        <QRISScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
