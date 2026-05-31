/**
 * QRISScanner.tsx
 *
 * Full-featured QRIS scanner modal:
 * - Detects camera availability
 * - Live camera feed with jsQR frame-by-frame decode
 * - Blurred/disabled state + upload fallback when no camera
 * - Parses QRIS metadata (NMID, name, city, postal)
 * - Gets GPS coordinates
 * - Saves to Supabase + calls onSuccess for map refresh
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Camera, CameraOff, Upload, CheckCircle2, AlertCircle,
  MapPin, ScanLine, Loader2, RotateCcw, QrCode, ArrowRight, Wallet
} from 'lucide-react';
import { parseQRIS, decodeQRFromImageData, decodeQRFromFile } from '@/lib/qrisParser';
import { upsertQrisScan, MerchantRow } from '@/services/supabase';
import { forwardGeocode } from '@/services/geocoding';
import { resolveMerchantCoordinatesWithGemini } from '@/engine/gemini';
import { getGeminiApiKeys } from '@/services/config';
import { openBankingApp } from '@/services/deeplink';

// Haversine distance calculator in meters
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Deeplink helpers ────────────────────────────────────────────────────────
// Chrome on Android ONLY processes intent:// URIs via window.location.href.
// iframe trick causes the "Download" dialog — DO NOT use iframe for intent://.
// We save scanner state to sessionStorage so when user returns from the banking
// app (using browser back button), we can restore the success screen.
const SESSION_KEY = 'qris_payment_return';

function saveReturnState(merchantName: string, nmid: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      merchantName,
      nmid,
      timestamp: Date.now(),
    }));
  } catch { /* ignore */ }
}

function clearReturnState() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

function getReturnState(): { merchantName: string; nmid: string; timestamp: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only valid for 10 minutes
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      clearReturnState();
      return null;
    }
    return data;
  } catch { return null; }
}


// SESSION_KEY dan state helpers tetap di sini

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanPhase = 'detecting' | 'camera' | 'no-camera' | 'scanning' | 'parsed' | 'saving' | 'redirecting' | 'success' | 'error';

interface QRISScannerProps {
  onClose: () => void;
  onSuccess?: (merchant: MerchantRow) => void;
}

// ─── Animated scan line overlay ───────────────────────────────────────────────
function ScanLine_() {
  return (
    <motion.div
      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full z-10"
      animate={{ top: ['15%', '85%', '15%'] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ─── Corner brackets ──────────────────────────────────────────────────────────
function ScanFrame() {
  const corner = 'absolute w-8 h-8 border-emerald-400';
  return (
    <>
      <div className={`${corner} top-4 left-4 border-t-2 border-l-2 rounded-tl-lg`} />
      <div className={`${corner} top-4 right-4 border-t-2 border-r-2 rounded-tr-lg`} />
      <div className={`${corner} bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg`} />
      <div className={`${corner} bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg`} />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QRISScanner({ onClose, onSuccess }: QRISScannerProps) {
  const [phase, setPhase] = useState<ScanPhase>(() => {
    // Check if user just returned from a banking app
    const returnState = getReturnState();
    if (returnState) return 'success';
    return 'detecting';
  });
  const [hasCamera, setHasCamera] = useState(false);
  const [qrisText, setQrisText] = useState('');
  const [parsedData, setParsedData] = useState<ReturnType<typeof parseQRIS> | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [qrisCoords, setQrisCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCoordsSource, setSelectedCoordsSource] = useState<'device' | 'qris_metadata'>('device');
  const [coordsSourceMethod, setCoordsSourceMethod] = useState<'gemini' | 'nominatim' | 'failed' | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationMatchStatus, setLocationMatchStatus] = useState<'matching' | 'mismatch' | 'no-gps' | 'idle'>('idle');
  const [validationDistance, setValidationDistance] = useState<number | null>(null);
  const [redirectingApp, setRedirectingApp] = useState<{ key: string; label: string } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedMerchant, setSavedMerchant] = useState<MerchantRow | null>(() => {
    // Restore merchant name from sessionStorage if returning from banking app
    const returnState = getReturnState();
    if (returnState) {
      return {
        id: '', nmid: returnState.nmid, name: returnState.merchantName,
        category: null, city: null, postal_code: null,
        lat: 0, lng: 0, image_urls: null,
        status: 'INVISIBLE', confidence: 80, scan_count: 1,
        source: 'qris_scan', created_at: '', updated_at: '',
      } as MerchantRow;
    }
    return null;
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Detect camera and get GPS early on mount ──────────────────────────
  useEffect(() => {
    async function detectCamera() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cam = devices.some(d => d.kind === 'videoinput');
        setHasCamera(cam);
        setPhase(cam ? 'camera' : 'no-camera');
      } catch {
        setHasCamera(false);
        setPhase('no-camera');
      }
    }
    detectCamera();

    // Also start GPS early
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          setSelectedCoordsSource('device'); // Default to physical GPS coordinates
        },
        () => {}, // silently fail — user can still scan without GPS
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recalculate 2x Location Validation dynamically when coordinates load ─────
  useEffect(() => {
    if (!qrisCoords) {
      setLocationMatchStatus('idle');
      return;
    }

    if (userCoords) {
      const dist = getHaversineDistance(userCoords.lat, userCoords.lng, qrisCoords.lat, qrisCoords.lng);
      setValidationDistance(dist);
      if (dist <= 1500) {
        setLocationMatchStatus('matching');
      } else {
        setLocationMatchStatus('mismatch');
      }
    } else {
      setLocationMatchStatus('no-gps');
      setSelectedCoordsSource('qris_metadata');
    }
  }, [userCoords, qrisCoords]);

  // ── Step 2: Start camera stream when phase = 'camera' ───────────────────────
  useEffect(() => {
    if (phase !== 'camera') return;
    let active = true;

    async function startStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setPhase('scanning');
        startScanLoop();
      } catch (err) {
        console.error('[QRIS] Camera start error:', err);
        setHasCamera(false);
        setPhase('no-camera');
      }
    }
    startStream();
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'camera']);

  // ── Scan loop: run jsQR on each video frame ──────────────────────────────────
  function startScanLoop() {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    scanTimerRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = await decodeQRFromImageData(imageData);
      if (decoded) {
        stopScanLoop();
        // Capture screenshot of the frame
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(dataUrl);
        handleDecoded(decoded);
      }
    }, 300); // scan every 300ms
  }

  function stopScanLoop() {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
  }

  function cleanup() {
    stopScanLoop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  // ── Handle decoded QR string ─────────────────────────────────────────────────
  async function handleDecoded(raw: string) {
    const parsed = parseQRIS(raw);
    setQrisText(raw);
    setParsedData(parsed);
    if (parsed.isValid) {
      setPhase('parsed');
      if (parsed.merchantCity) {
        setIsResolvingLocation(true);
        try {
          const apiKeys = getGeminiApiKeys();
          let resolved = null;
          let method: 'gemini' | 'nominatim' | 'failed' | null = null;

          if (apiKeys.length > 0) {
            try {
              // 1. Try Gemini AI resolution first
              resolved = await resolveMerchantCoordinatesWithGemini(
                parsed.merchantName,
                parsed.merchantCity,
                parsed.postalCode || '',
                apiKeys
              );
              if (resolved) {
                method = 'gemini';
              }
            } catch (err) {
              console.warn('[QRIS Geocode] Gemini resolution failed, falling back to Nominatim:', err);
            }
          }
          
          // 2. If Gemini fails, fallback to Nominatim Geocoding
          if (!resolved) {
            const query = `${parsed.merchantCity} ${parsed.postalCode || ''}`.trim();
            const geoResult = await forwardGeocode(query);
            if (geoResult) {
              resolved = geoResult.coords;
              method = 'nominatim';
            } else {
              method = 'failed';
            }
          }

          setCoordsSourceMethod(method);

          if (resolved) {
            setQrisCoords(resolved);
            // 3. 2x Validation: Compare against user device GPS location
            if (userCoords) {
              const dist = getHaversineDistance(userCoords.lat, userCoords.lng, resolved.lat, resolved.lng);
              setValidationDistance(dist);
              if (dist <= 1500) {
                setLocationMatchStatus('matching');
              } else {
                setLocationMatchStatus('mismatch');
              }
            } else {
              setLocationMatchStatus('no-gps');
            }
          } else {
            setLocationMatchStatus('no-gps');
          }
        } catch (err) {
          console.error('[QRIS Geocode] error:', err);
          setLocationMatchStatus('no-gps');
          setCoordsSourceMethod('failed');
        } finally {
          setIsResolvingLocation(false);
        }
      }
    } else {
      setErrorMsg(parsed.error || 'QR code ini bukan QRIS yang valid');
      setPhase('error');
    }
  }

  // ── Handle file upload fallback ──────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = ev => setCapturedImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    setPhase('scanning');
    const decoded = await decodeQRFromFile(file);
    if (decoded) {
      handleDecoded(decoded);
    } else {
      setErrorMsg('Tidak dapat membaca QR code dari gambar. Pastikan gambar jelas dan QRIS terlihat penuh.');
      setPhase('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!parsedData || !parsedData.isValid) return;
    setPhase('saving');

    // Save based on the user's selected coordinate source (GPS Scan device vs QRIS city reference)
    const lat = selectedCoordsSource === 'device'
      ? (userCoords?.lat ?? qrisCoords?.lat ?? -6.2088)
      : (qrisCoords?.lat ?? userCoords?.lat ?? -6.2088);
    const lng = selectedCoordsSource === 'device'
      ? (userCoords?.lng ?? qrisCoords?.lng ?? 106.8456)
      : (qrisCoords?.lng ?? userCoords?.lng ?? 106.8456);

    // ── Always write activity to localStorage for Recent Activities ───────────
    const localActivity = {
      id: `local_${Date.now()}`,
      nmid: parsedData.nmid || `SCAN-${Date.now()}`,
      scanned_at: new Date().toISOString(),
      lat,
      lng,
      result_status: 'SCANNED',
      result_confidence: 80,
      qris_raw: qrisText,
      merchant_name: parsedData.merchantName || 'Unknown Merchant',
      merchant_city: parsedData.merchantCity || 'Unknown City',
      merchant_postal_code: parsedData.postalCode || '',
      merchant_category: parsedData.mcc ? mapMccToCategory(parsedData.mcc) : 'Retail',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('local_scan_activities') || '[]');
      const updated = [localActivity, ...existing].slice(0, 20); // keep last 20
      localStorage.setItem('local_scan_activities', JSON.stringify(updated));
    } catch {
      // ignore localStorage errors
    }

    try {
      const merchant = await upsertQrisScan({
        nmid: parsedData.nmid || `SCAN-${Date.now()}`,
        name: parsedData.merchantName,
        category: parsedData.mcc ? mapMccToCategory(parsedData.mcc) : 'Retail',
        city: parsedData.merchantCity,
        postal_code: parsedData.postalCode,
        lat,
        lng,
        qrisRaw: qrisText,
        imageBase64: capturedImage ?? undefined,
      });

      if (merchant) {
        setSavedMerchant(merchant);
        setPhase('redirecting');
        onSuccess?.(merchant);
      } else {
        throw new Error('Database tidak merespons');
      }
    } catch (err) {
      setErrorMsg(String(err));
      setPhase('error');
    }
  }

  function mapMccToCategory(mcc: string): string {
    const n = parseInt(mcc, 10);
    if (n >= 5812 && n <= 5817) return 'Food';
    if (n >= 5411 && n <= 5441) return 'Retail';
    if (n >= 7210 && n <= 7299) return 'Services';
    return 'Retail';
  }

  function reset() {
    cleanup();
    setPhase(hasCamera ? 'camera' : 'no-camera');
    setParsedData(null);
    setCapturedImage(null);
    setQrisText('');
    setErrorMsg('');
    setSavedMerchant(null);
    setCoordsSourceMethod(null);
    setSelectedCoordsSource('device');
    clearReturnState();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="qris-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) { clearReturnState(); cleanup(); onClose(); } }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="bg-[#0d1117] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden"
          style={{ width: 'min(380px, calc(100vw - 2rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <QrCode className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Scan QRIS</h2>
                <p className="text-[10px] text-white/40">
                  {userCoords
                    ? `📍 ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                    : 'Mendapatkan lokasi...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => { clearReturnState(); cleanup(); onClose(); }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-hide">

            {/* ── Phase: Detecting ── */}
            {phase === 'detecting' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm text-white/50">Mendeteksi kamera...</p>
              </div>
            )}

            {/* ── Phase: Camera / Scanning ── */}
            {(phase === 'camera' || phase === 'scanning') && (
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0">
                  <ScanFrame />
                  {phase === 'scanning' && <ScanLine_ />}
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-white/70 font-medium">
                    {phase === 'camera' ? 'Memulai kamera...' : 'Arahkan ke QRIS'}
                  </span>
                </div>
              </div>
            )}

            {/* ── Phase: No Camera ── */}
            {phase === 'no-camera' && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex flex-col items-center justify-center py-10 gap-3" style={{ filter: 'blur(0px)' }}>
                  {/* Simulated blurred camera view */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-blue-900/20 backdrop-blur-xl" />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <CameraOff className="w-10 h-10 text-white/30" />
                    <p className="text-sm text-white/50 font-medium">Kamera tidak tersedia</p>
                    <p className="text-[11px] text-white/30 text-center px-4">
                      Upload gambar QRIS dari galeri atau screenshot
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload Gambar QRIS
                </button>
              </div>
            )}

            {/* ── Phase: Scanning (file) ── */}
            {phase === 'scanning' && !streamRef.current && (
              <div className="flex flex-col items-center gap-3 py-4">
                {capturedImage && (
                  <img src={capturedImage} alt="QRIS upload" className="w-full rounded-xl object-contain max-h-48" />
                )}
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Menganalisis gambar...
                </div>
              </div>
            )}

            {/* ── Phase: Parsed ── */}
            {phase === 'parsed' && parsedData && (
              <div className="space-y-4">
                {capturedImage && (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={capturedImage} alt="QRIS captured" className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] text-white/80 font-semibold">QRIS Terdeteksi</span>
                    </div>
                  </div>
                )}

                {/* Merchant info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Nama Merchant</p>
                    <p className="text-white font-bold text-base leading-tight">{parsedData.merchantName}</p>
                  </div>
                  {parsedData.merchantCity && (
                    <div className="flex items-center gap-1.5 text-white/50">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-sm">{parsedData.merchantCity}{parsedData.postalCode ? `, ${parsedData.postalCode}` : ''}</span>
                    </div>
                  )}
                  {parsedData.nmid && (
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">NMID</p>
                      <p className="text-[11px] text-white/50 font-mono break-all">{parsedData.nmid}</p>
                    </div>
                  )}
                  {userCoords && (
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Koordinat GPS Perangkat</p>
                      <p className="text-[11px] text-emerald-400 font-mono">
                        {userCoords.lat.toFixed(6)}, {userCoords.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                  {!userCoords && (
                    <div className="flex items-center gap-1.5 text-amber-400/70 text-[11px]">
                      <MapPin className="w-3 h-3" />
                      GPS tidak aktif — akan menggunakan koordinat default
                    </div>
                  )}

                  {/* 2x Validation Status Display */}
                  {isResolvingLocation && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Verifikasi Lokasi (2x Validasi)</p>
                      <div className="flex items-center gap-1.5 text-white/40 text-[11px] animate-pulse bg-white/5 rounded-xl border border-white/5 px-2.5 py-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                        <span>Memverifikasi lokasi dengan AI Gemini...</span>
                      </div>
                    </div>
                  )}

                  {!isResolvingLocation && locationMatchStatus !== 'idle' && (
                    <div className="space-y-2.5 pt-1">
                      {/* Method indicator badge */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">Verifikasi Lokasi (2x Validasi)</p>
                        {coordsSourceMethod === 'gemini' && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            AI Gemini Aktif
                          </span>
                        )}
                        {coordsSourceMethod === 'nominatim' && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5" title="API Key limit 429 atau kuota habis, beralih ke geocoder cadangan">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            AI Limit (429) → Nominatim
                          </span>
                        )}
                      </div>

                      {locationMatchStatus === 'matching' && (
                        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] text-emerald-300 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Lokasi Cocok (Jarak: {validationDistance ? Math.round(validationDistance) : 0}m)</span>
                        </div>
                      )}

                      {locationMatchStatus === 'mismatch' && (
                        <div className="flex flex-col gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px]">
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Selisih GPS & QRIS ({validationDistance ? (validationDistance / 1000).toFixed(1) : 0} km)</span>
                          </div>
                          
                          <p className="text-[10px] text-white/50 leading-normal pl-5">
                            Lokasi GPS berbeda jauh dengan kota terdaftar ({parsedData.merchantCity}). Pilih koordinat yang akan disimpan ke peta:
                          </p>

                          <div className="grid grid-cols-2 gap-2 pl-5 pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedCoordsSource('device')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                selectedCoordsSource === 'device'
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md scale-[1.02]'
                                  : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60 hover:bg-white/10'
                              }`}
                            >
                              <MapPin className={`w-4 h-4 mb-1 ${selectedCoordsSource === 'device' ? 'text-emerald-400' : 'text-white/30'}`} />
                              <span className="font-bold text-[10px]">📍 GPS Scan (HP)</span>
                              <span className="text-[8px] font-mono opacity-80 mt-0.5">
                                {userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}` : '-'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCoordsSource('qris_metadata')}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                                selectedCoordsSource === 'qris_metadata'
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md scale-[1.02]'
                                  : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60 hover:bg-white/10'
                              }`}
                            >
                              <QrCode className={`w-4 h-4 mb-1 ${selectedCoordsSource === 'qris_metadata' ? 'text-emerald-400' : 'text-white/30'}`} />
                              <span className="font-bold text-[10px]">🏢 Kota QRIS</span>
                              <span className="text-[8px] font-mono opacity-80 mt-0.5">
                                {qrisCoords ? `${qrisCoords.lat.toFixed(4)}, ${qrisCoords.lng.toFixed(4)}` : '-'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {locationMatchStatus === 'no-gps' && (
                        <div className="flex items-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[11px] text-blue-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Menggunakan lokasi referensi QRIS Kota ({parsedData.merchantCity}).</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" /> Scan Ulang
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Simpan ke Peta
                  </button>
                </div>
              </div>
            )}

            {/* ── Phase: Saving ── */}
            {phase === 'saving' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  <div className="absolute inset-2 flex items-center justify-center">
                    <ScanLine className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-white/50">Menyimpan ke database...</p>
              </div>
            )}

            {/* ── Phase: Redirecting M-Banking ── */}
            {phase === 'redirecting' && savedMerchant && (
              <div className="space-y-4">
                {redirectingApp ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-6 text-center"
                  >
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      <Wallet className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">Menghubungkan ke {redirectingApp.label}</h3>
                      <p className="text-white/40 text-xs mt-1">Membuka aplikasi untuk transaksi...</p>
                      <p className="text-[10px] font-mono text-emerald-400 mt-2 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10 inline-block break-all max-w-full">
                        NMID: {savedMerchant.nmid}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full pt-4">
                      <button
                        onClick={() => {
                            // Langsung panggil openBankingApp — harus dalam user gesture context
                            openBankingApp(redirectingApp.key, qrisText);
                        }}
                        className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
                      >
                        Buka Aplikasi Manual
                      </button>
                      <button
                        onClick={() => setRedirectingApp(null)}
                        className="py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-sm font-semibold transition-all"
                      >
                        Pilih Aplikasi Lain
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col items-center gap-2 text-center pb-1">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-white font-bold text-base mt-1">Peta Berhasil Diupdate!</h3>
                      <p className="text-white/50 text-xs">Pilih M-Banking / E-Wallet tujuan pembayaran:</p>
                    </div>

                    <div className="relative">
                      <div className="space-y-4 filter blur-[3px] pointer-events-none select-none opacity-40 transition-all duration-300">
                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {[
                            { key: 'mandiri', label: "Livin' Mandiri", color: 'border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-300' },
                            { key: 'bca', label: 'BCA Mobile', color: 'border-blue-500/30 hover:bg-blue-500/10 text-blue-300' },
                            { key: 'mybca', label: 'myBCA', color: 'border-sky-500/30 hover:bg-sky-500/10 text-sky-300' },
                            { key: 'bri', label: 'BRImo (BRI)', color: 'border-blue-400/30 hover:bg-blue-400/10 text-blue-200' },
                            { key: 'bni', label: 'BNI Mobile', color: 'border-teal-500/30 hover:bg-teal-500/10 text-teal-300' },
                            { key: 'seabank', label: 'SeaBank', color: 'border-orange-500/30 hover:bg-orange-500/10 text-orange-400' },
                            { key: 'gopay', label: 'GoPay', color: 'border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300' },
                            { key: 'shopeepay', label: 'ShopeePay', color: 'border-red-500/30 hover:bg-red-500/10 text-red-400' },
                            { key: 'dana', label: 'DANA', color: 'border-cyan-400/30 hover:bg-cyan-400/10 text-cyan-300' },
                            { key: 'ovo', label: 'OVO', color: 'border-purple-500/30 hover:bg-purple-500/10 text-purple-300' },
                          ].map((app) => (
                            <button
                              key={app.key}
                              disabled
                              className={`rounded-xl border bg-white/5 p-3 text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${app.color}`}
                            >
                              <span>{app.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Copy QRIS fallback — untuk app yang tidak support deep link */}
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <p className="text-[10px] text-white/30 text-center">Atau salin QRIS untuk paste di app banking:</p>
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-semibold flex items-center justify-center gap-2"
                          >
                            📋 Salin String QRIS
                          </button>
                        </div>
                      </div>

                      {/* Coming Soon Glassmorphism Overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl z-20 border border-white/5 backdrop-blur-[2px]">
                        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_32px_rgba(245,158,11,0.2)] animate-pulse">
                          <Wallet className="w-3.5 h-3.5 text-amber-400" />
                          Coming Soon
                        </div>
                        <p className="text-[11px] text-white/60 mt-2 text-center px-6 leading-relaxed max-w-[280px]">
                          Integrasi langsung pembayaran otomatis sedang disiapkan.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPhase('success')}
                      className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
                    >
                      Selesai & Lihat di Peta <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── Phase: Success ── */}
            {phase === 'success' && savedMerchant && (
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{savedMerchant.name}</p>
                    <p className="text-emerald-400 text-sm mt-0.5 font-semibold">Berhasil ditambahkan ke peta!</p>
                    {savedMerchant.lat !== 0 && savedMerchant.lng !== 0 && (
                      <p className="text-white/30 text-[11px] mt-1 font-mono">
                        {savedMerchant.lat.toFixed(5)}, {savedMerchant.lng.toFixed(5)}
                      </p>
                    )}
                    <p className="text-white/40 text-[11px] mt-2">
                      ✅ Data tersimpan — kembali dari aplikasi banking
                    </p>
                  </div>
                </motion.div>
                <button
                  onClick={() => { clearReturnState(); cleanup(); onClose(); }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)]"
                >
                  Lihat di Peta
                </button>
              </div>
            )}

            {/* ── Phase: Error ── */}
            {phase === 'error' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/70 font-semibold text-sm">Gagal memproses QRIS</p>
                    <p className="text-white/30 text-[11px] mt-1 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" /> Coba Lagi
                  </button>
                  {!hasCamera && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
