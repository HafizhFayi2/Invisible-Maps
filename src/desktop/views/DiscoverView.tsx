import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, MapPin, Coffee, Clock, Banknote, ScanLine, Navigation, ShieldCheck, Loader2, Store, Bell, X, AlertTriangle, Bookmark, BookmarkCheck } from 'lucide-react';
import { getRecentMerchants, getMerchantById, MerchantRow } from '@/services/supabase';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DiscoverSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-6 animate-pulse">
      <div className="col-span-2 space-y-6">
        <div className="grid grid-cols-3 gap-4 h-96">
          <div className="col-span-2 bg-gray-200 rounded-2xl" />
          <div className="col-span-1 flex flex-col gap-4">
            <div className="w-full h-44 bg-gray-200 rounded-2xl" />
            <div className="w-full h-44 bg-gray-200 rounded-2xl" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="h-4 w-40 bg-gray-200 rounded-full mb-4" />
          <div className="w-full h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
      <div className="col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="h-4 w-20 bg-gray-200 rounded-full mb-4" />
          <div className="h-8 w-48 bg-gray-200 rounded-full mb-3" />
          <div className="space-y-3 mb-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 bg-gray-100 rounded-full w-3/4" />
            ))}
          </div>
          <div className="h-12 bg-gray-100 rounded-xl mb-3" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DiscoverView() {
  const [featured, setFeatured] = useState<MerchantRow | null>(null);
  const [allMerchants, setAllMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_merchants') ?? '[]');
    } catch { return []; }
  });
  const toastRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');

  const getThumb = (m: MerchantRow, idx = 0) => {
    let urls: string[] = [];
    try {
      if (m.images && m.images.length > 0) {
        urls = m.images;
      } else if (m.image_urls) {
        let parsed = typeof m.image_urls === 'string' ? JSON.parse(m.image_urls) : m.image_urls;
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string' && parsed[0].startsWith('[')) {
           parsed = JSON.parse(parsed[0]);
        }
        if (Array.isArray(parsed)) {
          urls = parsed.map((u: any) => typeof u === 'string' ? u.replace(/^"|"$/g, '') : u);
        } else if (typeof parsed === 'string') {
          urls = [parsed.replace(/^"|"$/g, '')];
        }
      }
    } catch (e) {
      if (typeof m.image_urls === 'string') urls = [m.image_urls];
    }
    if (urls.length > idx) return urls[idx];
    return null;
  };

  // Load featured merchant: prefer ?merchantId= param, else fetch recent list
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (merchantId) {
      getMerchantById(merchantId)
        .then((m) => {
          if (m) {
            setFeatured(m);
            // Also load all merchants for the "More Nearby" sidebar
            getRecentMerchants(20).then((data) => {
              const withPhotos = data.filter((r) => getThumb(r, 0) != null);
              setAllMerchants(withPhotos.length > 0 ? withPhotos : data);
            });
          } else {
            setError('Merchant tidak ditemukan.');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Gagal memuat data merchant.');
          setLoading(false);
        });
      return;
    }

    getRecentMerchants(20)
      .then((data) => {
        // Filter out merchants without photos
        const withPhotos = data.filter((m) => getThumb(m, 0) != null);
        if (withPhotos.length > 0) {
          setFeatured(withPhotos[0]);
          setAllMerchants(withPhotos);
        } else if (data.length > 0) {
          setFeatured(data[0]);
          setAllMerchants(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[DiscoverView] Fetch error:', err);
        setError('Gagal memuat merchant terdekat. Silakan coba lagi.');
        setLoading(false);
      });
  }, [merchantId]);

  useEffect(() => {
    if (showToast && toastRef.current) {
      toastRef.current.focus();
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="bg-gray-50 w-full">
        <div className="max-w-6xl mx-auto p-6">
          <DiscoverSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 w-full flex items-center justify-center p-6 min-h-[50vh]">
        <div className="bg-white p-8 rounded-2xl border border-red-100 shadow-sm max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Terjadi Kesalahan</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              getRecentMerchants(20)
                .then((data) => {
                  const withPhotos = data.filter((m) => getThumb(m, 0) != null);
                  if (withPhotos.length > 0) {
                    setFeatured(withPhotos[0]);
                    setAllMerchants(withPhotos);
                  } else if (data.length > 0) {
                    setFeatured(data[0]);
                    setAllMerchants(data);
                  }
                  setLoading(false);
                })
                .catch((err) => {
                  setError('Gagal memuat merchant terdekat. Silakan coba lagi.');
                  setLoading(false);
                });
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 px-6 rounded-xl transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!featured) {
    return (
      <div className="bg-gray-50 w-full flex items-center justify-center">
        <div className="text-center text-slate-400 py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-400" />
          <p className="text-sm font-medium">No merchant data in database.</p>
          <p className="text-xs mt-1">Run <code className="bg-slate-100 px-1 rounded">npm run pipeline:seed</code> to populate.</p>
        </div>
      </div>
    );
  }

  const dbImages = [getThumb(featured, 0), getThumb(featured, 1), getThumb(featured, 2)].filter(Boolean) as string[];
  const address = [featured.city, featured.postal_code].filter(Boolean).join(', ') || 'Indonesia';
  // Normalize confidence: DB may store 0-100 int OR 0-1 float
  const confidencePct = featured.confidence != null
    ? featured.confidence > 1 ? Math.round(featured.confidence) : Math.round(featured.confidence * 100)
    : null;

  return (
    <div className="bg-gray-50 w-full pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

          {/* Left Side: Images */}
          <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
            {dbImages.length > 0 ? (
              <div className={`grid gap-2 md:gap-4 ${dbImages.length > 1 ? 'grid-cols-3 h-64 md:h-96' : 'grid-cols-1 h-64 md:h-96'}`}>
                <div className={`${dbImages.length > 1 ? 'col-span-2' : 'col-span-1'} bg-gray-200 rounded-2xl overflow-hidden`}>
                  <img
                    src={dbImages[0]}
                    alt={featured.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {dbImages.length > 1 && (
                  <div className="col-span-1 flex flex-col gap-2 md:gap-4">
                    <img
                      src={dbImages[1]}
                      className="w-full h-1/2 object-cover rounded-2xl"
                      alt={`${featured.name} 2`}
                    />
                    {dbImages.length > 2 ? (
                      <div
                        className="w-full h-1/2 bg-gray-900 rounded-2xl flex items-center justify-center text-white cursor-pointer relative overflow-hidden group"
                        onClick={() => setShowGallery(true)}
                      >
                        <img
                          src={dbImages[2]}
                          className="opacity-40 w-full h-full object-cover absolute group-hover:opacity-50 transition"
                          alt="More"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="relative z-10 text-center text-xs md:text-sm font-semibold">
                          View All {dbImages.length}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-1/2 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <MapPin className="text-emerald-300 w-8 h-8" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // No images in DB -> show one clean placeholder
              <div className="w-full h-48 md:h-80 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 text-emerald-600">
                <Store className="w-12 h-12 mb-2 opacity-50" />
                <span className="text-sm font-medium opacity-70">No Photos Available</span>
              </div>
            )}


            {/* Precision Location */}
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg md:text-xl font-bold mb-3 text-gray-900">Precision Location</h3>
              <div className="w-full h-32 md:h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center p-2">
                  <MapPin className="text-emerald-600 w-8 h-8 fill-emerald-100" />
                  <span className="bg-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow text-gray-900">
                    {(featured.lat ?? 0).toFixed(5)}, {(featured.lng ?? 0).toFixed(5)}
                  </span>
                  <span className="text-[10px] md:text-xs text-slate-400 break-words max-w-[250px]">{address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Info Card */}
          <div className="col-span-1 space-y-4 md:space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 text-gray-900 break-words">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-emerald-500 text-white text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {featured.status || 'ACTIVE'}
                </span>
                {confidencePct != null && (
                  <span className="flex items-center text-emerald-600 font-bold text-xs bg-emerald-50 px-2 rounded-full">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {confidencePct}% Match
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2 leading-tight">{featured.name}</h1>
              <p className="text-gray-500 flex items-center gap-2 mb-6 text-sm">
                <Coffee className="w-4 h-4" />
                {featured.category || 'UMKM'} • Warung
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex gap-3 text-sm text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <p>{address}</p>
                </div>
                <div className="flex gap-3 text-sm text-gray-700">
                  <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                  <p>Scan count: {featured.scan_count ?? 0} times</p>
                </div>
                <div className="flex gap-3 text-sm text-gray-700">
                  <Banknote className="w-5 h-5 text-gray-400 shrink-0" />
                  <p>NMID: {featured.nmid || '—'}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                }}
                className="w-full bg-emerald-700 text-white h-12 rounded-xl font-semibold flex justify-center items-center gap-2 mb-3 hover:bg-emerald-800 transition">
                <ScanLine className="w-5 h-5" /> Pay with QRIS
              </button>
              {/* Save Merchant Button */}
              {(() => {
                const isSaved = savedIds.includes(featured.id);
                return (
                  <button
                    onClick={() => {
                      const next = isSaved
                        ? savedIds.filter((id) => id !== featured.id)
                        : [...savedIds, featured.id];
                      setSavedIds(next);
                      // Persist the full merchant object list
                      const existing: MerchantRow[] = JSON.parse(localStorage.getItem('saved_merchants_data') ?? '[]');
                      const filtered = existing.filter((m) => m.id !== featured.id);
                      const updated = isSaved ? filtered : [featured, ...filtered];
                      localStorage.setItem('saved_merchants', JSON.stringify(updated.map((m) => m.id)));
                      localStorage.setItem('saved_merchants_data', JSON.stringify(updated));
                    }}
                    className={`w-full h-12 rounded-xl font-semibold flex justify-center items-center gap-2 mb-3 transition border-2 ${
                      isSaved
                        ? 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100'
                        : 'bg-white border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    {isSaved ? 'Tersimpan di Profil' : 'Simpan ke Profil'}
                  </button>
                );
              })()}
              <button 
                onClick={() => navigate(`/explore?lat=${featured.lat}&lng=${featured.lng}`)}
                className="w-full border border-blue-600 text-blue-600 h-12 rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-blue-50 transition">
                <Navigation className="w-5 h-5" /> Navigate to Stall
              </button>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-4 border border-emerald-100">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-gray-800">Verified Merchant</h4>
                <p className="text-xs text-gray-500">
                  Source: {featured.source || 'Invisible Map'} • Confidence {confidencePct ?? 90}%
                </p>
              </div>
            </div>

            {/* Other recent merchants */}
            {allMerchants.length > 1 && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">More Nearby</h3>
                <div className="space-y-2">
                  {allMerchants.slice(1, 4).map((m) => {
                    const thumb = getThumb(m, 0);
                    return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition max-w-full hover:-translate-y-1 hover:shadow-md duration-300"
                      onClick={() => {
                        setFeatured(m);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={m.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>';
                            target.className = "w-10 h-10 rounded-lg object-none flex-shrink-0 bg-emerald-50 opacity-50";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="font-semibold text-xs text-gray-800 truncate">{m.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{m.category || 'UMKM'}</p>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ── Custom Toast Overlay ── */}
      {showToast && (
        <div 
          ref={toastRef}
          tabIndex={-1}
          role="alert"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 focus:outline-none"
        >
          <div className="bg-[#0f1423] text-white p-4 rounded-2xl shadow-xl flex flex-col gap-2 min-w-[300px] max-w-[90vw] border border-white/10">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <span className="font-bold text-lg">Notifikasi</span>
              </div>
              <button 
                onClick={() => setShowToast(false)} 
                aria-label="Tutup notifikasi"
                className="text-white/50 hover:text-white transition-colors w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-300 mb-3 font-medium">Fitur ini akan segera hadir!</p>
            <div className="inline-flex items-center justify-center gap-1.5 bg-[#033621] text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full self-start border border-[#045231]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Coming Soon
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Gallery Modal ── */}
      {showGallery && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex flex-col pointer-events-auto">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h3 className="text-white font-semibold text-lg">{featured.name} - Photos</h3>
            <button
              onClick={() => setShowGallery(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6">
            {dbImages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Photo ${i + 1}`}
                className="w-full max-w-4xl mx-auto rounded-xl object-contain bg-black/50"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
