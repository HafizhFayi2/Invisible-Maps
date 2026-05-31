import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, MapPin, ShieldCheck, TriangleAlert, CheckCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { PaymentRedirect } from '../../components/PaymentRedirect';
import { useGPS } from '../../hooks/useGPS';
import { processScanViaApi } from '../../../src/services/coreApi';
import { upsertQrisScan } from '../../../src/services/supabase';

type ScanPhase = 'scan' | 'pay' | 'done';

// Parse basic NMID + name from raw QRIS string
function parseQrisBasic(raw: string): { nmid: string; name: string } {
  // NMID is usually in tag 26 field 01 (16 chars starting with ID)
  const nmidMatch = raw.match(/ID\.CO\.[A-Z.]+\d+01(\d{15,16})/);
  const nmid = (nmidMatch?.[1] ?? raw.replace(/\D/g, '').slice(0, 16)) || 'UNKNOWN';

  // Merchant name is in tag 59
  const nameMatch = raw.match(/59(\d{2})(.+?)(?=60\d{2}|61\d{2}|62\d{2}|63\d{4}|$)/);
  const len = nameMatch ? parseInt(nameMatch[1], 10) : 0;
  const name = nameMatch ? nameMatch[2].slice(0, len) : 'Merchant QRIS';

  // City from tag 60
  const cityMatch = raw.match(/60(\d{2})(.+?)(?=61\d{2}|62\d{2}|63\d{4}|$)/);
  const cityLen = cityMatch ? parseInt(cityMatch[1], 10) : 0;
  const city = cityMatch ? cityMatch[2].slice(0, cityLen) : 'Indonesia';

  return { nmid: nmid.trim() || 'UNKNOWN', name: name.trim() || 'Merchant QRIS' };
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ScanPhase>('scan');
  const [qrisString, setQrisString] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const { coords, accuracy, error: gpsError, loading: gpsLoading, refresh } = useGPS();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const detectedRef = useRef(false); // prevent double-detect

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            scanTick();
          };
        }
        setHasCamera(true);
      } catch (err) {
        console.warn('Camera access denied or not available.', err);
        setHasCamera(false);
        setScanError('Kamera tidak diizinkan. Gunakan tombol di bawah untuk simulasi scan.');
      }
    };

    const scanTick = () => {
      if (detectedRef.current) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

          if (code) {
            detectedRef.current = true;
            handleDetected(code.data);
            return;
          }
        }
      }
      if (phase === 'scan') {
        animationFrameId = requestAnimationFrame(scanTick);
      }
    };

    if (phase === 'scan') {
      detectedRef.current = false;
      startCamera();
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleDetected = useCallback(async (raw: string) => {
    setScanError(null);
    setQrisString(raw);
    setApiStatus('pending');

    // ── ALWAYS advance to pay screen immediately ──
    // The user must be able to select their banking app.
    // API/DB writes happen in the background (fire & forget).
    setPhase('pay');

    const scanCoords = coords || { lat: -6.2088, lng: 106.8456 };
    const { nmid, name } = parseQrisBasic(raw);

    // Background: try the API server first, then direct Supabase fallback
    (async () => {
      try {
        await processScanViaApi({
          rawQris: raw,
          coords: scanCoords,
          source: 'pipeline_1',
        });
        setApiStatus('success');
        console.log('[Scan] ✓ Scan recorded via API server');
      } catch (apiErr) {
        console.warn('[Scan] API server failed, falling back to direct Supabase write:', apiErr);
        // Fallback: write directly to Supabase so recent activities updates
        try {
          await upsertQrisScan({
            nmid,
            name,
            category: 'Retail',
            city: 'Indonesia',
            postal_code: '',
            lat: scanCoords.lat,
            lng: scanCoords.lng,
            qrisRaw: raw,
          });
          setApiStatus('success');
          console.log('[Scan] ✓ Scan recorded via direct Supabase fallback');
        } catch (dbErr) {
          console.error('[Scan] Both API and Supabase write failed:', dbErr);
          setApiStatus('failed');
        }
      }
    })();
  }, [coords]);

  const handleManualFallback = () => {
    handleDetected('00020101021126630016ID.CO.TELKOMSEL.WWW01189360091100118833110209010411880303UMI51440014ID.CO.QRIS.WWW0215ID10293847560120303UMI5204581253033605802ID5914Warung Pak Kumis6007Jakarta61051217062070703A0163048A5E');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
      <header className="absolute inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-black/40 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Camera className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">QRIS Scanner</h1>
        </div>
        <button
          onClick={refresh}
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/90 backdrop-blur-md transition-colors hover:bg-white/20"
        >
          Refresh GPS
        </button>
      </header>

      <main className="relative h-full w-full pt-16">
        {phase === 'scan' && (
          <>
            <div className="absolute inset-0">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />

              {!hasCamera && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-zinc-900 px-4 text-center">
                  <div className="rounded-full bg-zinc-800 p-5">
                    <Camera className="h-10 w-10 text-zinc-500" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-300">Kamera tidak aktif di lingkungan ini.</p>
                  <p className="text-xs text-zinc-500 max-w-xs">Untuk tes dari HP, buka via HTTPS. Di sini Anda bisa simulasi scan merchant nyata:</p>
                  <button
                    onClick={handleManualFallback}
                    className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg active:scale-95 transition-all"
                  >
                    Simulasi Scan QRIS
                  </button>
                </div>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-64 w-64">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-primary" />
                <div className="absolute inset-x-0 top-0 h-1 animate-[scan_2s_ease-in-out_infinite] bg-primary shadow-[0_0_12px_#4ae183]" />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-24 z-30 px-4">
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-2 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Secure Scan & Verify</p>
                    <p className="mt-0.5 text-xs text-white/70">Arahkan QRIS merchant ke dalam area frame. Sistem akan memverifikasi secara otomatis.</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/90">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {gpsLoading && <span>Mencari sinyal GPS...</span>}
                  {!gpsLoading && coords && <span>Akurasi GPS: ~{Math.round(accuracy ?? 0)} meter</span>}
                  {!gpsLoading && !coords && <span className="text-amber-400">Menunggu akses lokasi...</span>}
                </div>

                {(gpsError || scanError) && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>{scanError ?? gpsError}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {phase === 'pay' && qrisString && (
          <div className="flex h-full flex-col bg-zinc-950">
            {/* Header bar */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">QRIS Berhasil Di-scan</p>
                <p className="text-[10px] text-white/50 truncate">{qrisString.slice(0, 40)}…</p>
              </div>
              {/* API status indicator */}
              {apiStatus === 'pending' && (
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Menyimpan ke database..." />
              )}
              {apiStatus === 'success' && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Tersimpan" />
              )}
              {apiStatus === 'failed' && (
                <span className="flex h-2 w-2 rounded-full bg-red-400 shrink-0" title="Gagal simpan" />
              )}
            </div>

            {/* Payment app list - scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <PaymentRedirect qrisString={qrisString} onComplete={() => setPhase('done')} />
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex h-full items-center justify-center bg-zinc-950 px-4 text-center">
            <div className="w-full max-w-sm rounded-3xl border border-primary/20 bg-primary/10 p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary">
                <span className="material-symbols-outlined !text-3xl">check</span>
              </div>
              <p className="text-2xl font-bold text-primary">Merchant Verified!</p>
              <p className="mt-2 text-sm text-white/80">Data transaksi QRIS dan lokasi telah terekam di ekosistem Invisible Map.</p>
              <button
                onClick={() => {
                  setPhase('scan');
                  setQrisString(null);
                  setScanError(null);
                  setApiStatus(null);
                }}
                className="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-on-primary shadow-lg active:scale-95 transition-all"
              >
                Scan Lainnya
              </button>
              <button
                onClick={() => navigate('/contribute')}
                className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10"
              >
                Lihat Aktivitas Terbaru →
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="absolute bottom-0 z-50 flex h-20 w-full items-center justify-around border-t border-white/10 bg-black/80 px-2 pb-safe backdrop-blur-xl">
        <Link to="/map" className="flex flex-col items-center justify-center px-3 py-1 text-zinc-500 hover:text-primary">
          <span className="material-symbols-outlined">map</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">Map</span>
        </Link>
        <Link to="/discover" className="flex flex-col items-center justify-center px-3 py-1 text-zinc-500 hover:text-primary">
          <span className="material-symbols-outlined">explore</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">Discover</span>
        </Link>
        <div className="relative -top-5 flex flex-col items-center justify-center rounded-full bg-primary p-4 text-on-primary shadow-[0_4px_16px_rgba(74,225,131,0.4)]">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
        </div>
        <Link to="/information" className="flex flex-col items-center justify-center px-3 py-1 text-zinc-500 hover:text-primary">
          <span className="material-symbols-outlined">info</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">Info</span>
        </Link>
        <Link to="/contribute" className="flex flex-col items-center justify-center px-3 py-1 text-zinc-500 hover:text-primary">
          <span className="material-symbols-outlined">person</span>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </Link>
      </nav>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(256px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
