import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { analyzeLocationWithGemini, LocationResult } from '@/engine/gemini';
import { MapPin, Sparkles, Star, X, Map, AlertTriangle } from 'lucide-react';
import { SelectedLocation } from '@/types';
import { ANIMATION_TOKENS, UI_TOKENS } from '@/core/theme';

const MiniMap = lazy(() => import('./MiniMap'));

interface LensPanelProps {
  location: SelectedLocation | null;
  onClose: () => void;
}

const G = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

export default function LensPanel({ location, onClose }: LensPanelProps) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<LocationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!location) {
      setVisible(false);
      setTimeout(() => { setPhase('idle'); setResult(null); }, ANIMATION_TOKENS.durationSlow * 1000);
      return;
    }

    abortRef.current = false;
    setVisible(true);
    setPhase('scanning');
    setResult(null);
    setErrorMsg('');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const backupStr = import.meta.env.VITE_GEMINI_BACKUP_KEYS || '';
    const allKeys = [apiKey, ...backupStr.split(',')].map(k => k.trim()).filter(Boolean);

    console.log(`[LensPanel] Scanning ${location.lat.toFixed(5)},${location.lng.toFixed(5)} — keys:`, allKeys.length, allKeys.map(k => k.slice(0,12)));

    if (allKeys.length === 0) {
      setErrorMsg('Tidak ada Gemini API key. Cek .env VITE_GEMINI_API_KEY');
      setPhase('error');
      return;
    }

    analyzeLocationWithGemini(location.lat, location.lng, allKeys)
      .then(data => {
        if (abortRef.current) return;
        if (data) {
          setResult(data);
          setPhase('done');
        } else {
          setErrorMsg('Gemini tidak mengembalikan hasil. Cek browser console F12.');
          setPhase('error');
        }
      })
      .catch(err => {
        if (abortRef.current) return;
        console.error('[LensPanel] Error:', err);
        setErrorMsg(String(err));
        setPhase('error');
      });

    return () => { abortRef.current = true; };
  }, [location]);

  if (!location) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center md:justify-end md:pr-6 lg:pr-12 pointer-events-none">
      {/* ── Overlay Backdrop ── */}
      <div 
        className={`absolute inset-0 ${UI_TOKENS.overlayBg} transition-opacity duration-500 pointer-events-auto
          ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* ── Panel Container ── */}
      <div className={`
        relative z-10 pointer-events-auto
        transition-all duration-500 ease-out 
        w-[calc(100%-2rem)] max-w-[320px] 
        md:max-w-[340px] md:w-[340px] 
        lg:max-w-[380px] lg:w-[380px]
        ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8 md:translate-y-0 md:translate-x-8 pointer-events-none'}
      `}>
        <div className="w-full bg-[#0d0d1a]/94 backdrop-blur-2xl rounded-2xl
                        border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Close */}
          <button onClick={onClose} aria-label="Tutup panel analisis"
            className="absolute top-3 right-3 z-[9999] w-11 h-11 rounded-full bg-black/60 backdrop-blur-md
                       hover:bg-white/20 text-white shadow-lg border border-white/10 transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>

        {/* ── SCANNING ─────────────────────────────── */}
        {phase === 'scanning' && (
          <div className="h-24 relative overflow-hidden bg-[#05050a]">
            {/* Google Lens conic gradient spin */}
            <div style={{
              position:'absolute', inset:'-60%', width:'220%', height:'220%',
              background:'conic-gradient(from 0deg,#4285F4 0deg,#EA4335 90deg,#FBBC05 180deg,#34A853 270deg,#4285F4 360deg)',
              animation:'lensConicSpin 2s linear infinite',
              filter:'blur(24px)', opacity:0.55, transformOrigin:'center',
            }} />
            <div className="absolute inset-0 bg-[#05050a]/60" />
            
            {/* Compact Scanning UI */}
            <div className="absolute inset-0 flex flex-row items-center justify-center gap-4 px-6">
              <div className="relative w-10 h-10 shrink-0">
                <div className="absolute inset-0 rounded-full" style={{
                  background:'conic-gradient(#4285F4,#EA4335,#FBBC05,#34A853,#4285F4)',
                  animation:'lensConicSpin 1.4s linear infinite', padding:'2.5px',
                }}>
                  <div className="w-full h-full rounded-full bg-[#05050a] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#4285F4]" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex gap-1.5 items-center">
                  {G.map(c => <div key={c} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:c}} />)}
                  <span className="text-[9px] text-white/50 font-bold tracking-widest uppercase ml-1">Location AI</span>
                </div>
                <p className="text-[12px] text-white font-medium">Menganalisis lokasi...</p>
                <div className="h-1 bg-white/10 rounded-full w-full overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-[#4285F4] to-[#EA4335] w-1/2 animate-[slide_1.5s_ease-in-out_infinite_alternate]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────── */}
        {phase === 'error' && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">Gagal menganalisis</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed break-words">{errorMsg}</p>
            <div className="text-[10px] text-white/20">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </div>
          </div>
        )}

        {/* ── RESULT ───────────────────────────────── */}
        {phase === 'done' && result && (
          <>
            {/* Mini satellite map — exact location via Google tiles */}
            <div className="h-44 relative overflow-hidden">
              <Suspense fallback={
                <div className="w-full h-full bg-[#0a0a12] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <MiniMap lat={location.lat} lng={location.lng} />
              </Suspense>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d0d1a] to-transparent pointer-events-none" />
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
                <Sparkles className="w-3 h-3 text-[#4285F4]" />
                <span className="text-[9px] font-bold text-white/70">Gemini AI</span>
              </div>
            </div>

            <div className="p-4 pt-2">
              {/* Name + Rating */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm text-white leading-snug pr-2 flex-1">{result.name}</h3>
                {result.rating !== 'N/A' && (
                  <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-lg shrink-0">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs font-bold text-yellow-300">{result.rating}</span>
                  </div>
                )}
              </div>

              {result.poi_type && (
                <span className="inline-block mb-2 px-2 py-0.5 bg-[#4285F4]/15 text-[#4285F4] text-[10px] font-bold rounded-md">
                  {result.poi_type}
                </span>
              )}

              <p className="text-[11px] text-white/55 leading-relaxed mb-3">{result.description}</p>

              <div className="flex items-center gap-1.5 text-[10px] text-white/25 mb-3">
                <MapPin className="w-3 h-3" />
                <span>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              </div>

              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl
                           bg-white/5 hover:bg-white/10 border border-white/8
                           text-white/60 hover:text-white text-[11px] font-semibold transition-all"
              >
                <Map className="w-3.5 h-3.5" />
                Buka di Google Maps
              </a>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
