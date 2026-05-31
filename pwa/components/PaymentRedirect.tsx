import { useState, useEffect, useRef } from 'react';
import { CreditCard, ExternalLink, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import { getPaymentDeeplink } from '../../src/services/deeplink';

interface PaymentRedirectProps {
  qrisString: string;
  onComplete?: () => void;
}

const APPS = [
  { key: 'gopay',     label: 'GoPay',          emoji: '💚', accent: 'text-emerald-300', border: 'hover:border-emerald-400/50 hover:bg-emerald-500/10' },
  { key: 'dana',      label: 'DANA',            emoji: '🔵', accent: 'text-cyan-300',    border: 'hover:border-cyan-400/50 hover:bg-cyan-500/10'     },
  { key: 'ovo',       label: 'OVO',             emoji: '💜', accent: 'text-purple-300',  border: 'hover:border-purple-400/50 hover:bg-purple-500/10' },
  { key: 'shopeepay', label: 'ShopeePay',       emoji: '🧡', accent: 'text-red-400',     border: 'hover:border-red-400/50 hover:bg-red-500/10'       },
  { key: 'mandiri',   label: "Livin' Mandiri",  emoji: '🟡', accent: 'text-yellow-300',  border: 'hover:border-yellow-400/50 hover:bg-yellow-500/10' },
  { key: 'bca',       label: 'BCA Mobile',      emoji: '🔷', accent: 'text-blue-300',    border: 'hover:border-blue-400/50 hover:bg-blue-500/10'     },
  { key: 'mybca',     label: 'myBCA',           emoji: '🌊', accent: 'text-sky-300',     border: 'hover:border-sky-400/50 hover:bg-sky-500/10'       },
  { key: 'bri',       label: 'BRImo',           emoji: '💙', accent: 'text-blue-200',    border: 'hover:border-blue-300/50 hover:bg-blue-400/10'     },
  { key: 'bni',       label: 'BNI Mobile',      emoji: '🟢', accent: 'text-teal-300',    border: 'hover:border-teal-400/50 hover:bg-teal-500/10'     },
  { key: 'seabank',   label: 'SeaBank',         emoji: '🟠', accent: 'text-orange-400',  border: 'hover:border-orange-400/50 hover:bg-orange-500/10' },
];

export function PaymentRedirect({ qrisString, onComplete }: PaymentRedirectProps) {
  const [selectedApp, setSelectedApp] = useState<{ key: string; label: string } | null>(null);
  const [appOpened, setAppOpened] = useState(false);
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when user comes back to the browser (app switched back)
  useEffect(() => {
    if (!selectedApp) return;

    const handleVisibilityChange = () => {
      // User switched back to browser — app was opened
      if (!document.hidden) {
        setAppOpened(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimer.current) clearTimeout(visibilityTimer.current);
    };
  }, [selectedApp]);

  const openApp = (appKey: string, label: string) => {
    const deeplink = getPaymentDeeplink(qrisString, appKey);
    setSelectedApp({ key: appKey, label });
    setAppOpened(false);

    // window.location.href is the most reliable way to trigger Android intent URIs
    // It passes the intent:// scheme to the OS which opens the app
    window.location.href = deeplink;

    // After 2.5s: if page is still active (app didn't open/switch), show hint
    visibilityTimer.current = setTimeout(() => {
      setAppOpened(false); // stays on waiting screen, user can retry
    }, 2500);
  };

  const retryOpen = () => {
    if (!selectedApp) return;
    openApp(selectedApp.key, selectedApp.label);
  };

  // ── After selecting an app: waiting / confirmation screen ──
  if (selectedApp) {
    return (
      <div className="flex flex-col items-center text-center space-y-5 py-6 px-4">
        {/* App emoji icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 border border-white/10 text-5xl shadow-inner">
          {APPS.find(a => a.key === selectedApp.key)?.emoji ?? '💳'}
        </div>

        <div className="space-y-1">
          <p className="text-xl font-bold text-white">Membuka {selectedApp.label}</p>
          <p className="text-sm text-white/50 max-w-[280px] mx-auto leading-relaxed">
            {appOpened
              ? `${selectedApp.label} sudah dibuka. Selesaikan pembayaran, lalu kembali ke sini.`
              : `Menunggu ${selectedApp.label} terbuka… Jika tidak muncul, tekan "Buka Ulang".`}
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={retryOpen}
          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition-all active:scale-95 hover:bg-white/10 w-full max-w-xs justify-center"
        >
          <RefreshCw className="h-4 w-4" />
          Buka Ulang {selectedApp.label}
        </button>

        {/* ✅ Confirm payment done */}
        <button
          onClick={() => onComplete?.()}
          className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-on-primary shadow-lg shadow-primary/30 transition-all active:scale-95 hover:opacity-90"
        >
          <CheckCircle2 className="h-5 w-5" />
          Saya Sudah Membayar ✓
        </button>

        {/* Back */}
        <button
          onClick={() => setSelectedApp(null)}
          className="flex items-center gap-1 text-xs font-semibold text-white/35 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Pilih Aplikasi Lain
        </button>
      </div>
    );
  }

  // ── App selection grid ──
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-2.5">
        <CreditCard className="h-4 w-4 text-emerald-300 shrink-0" />
        Pilih M-Banking / E-Wallet
      </h3>

      <div className="relative">
        <div className="space-y-3 filter blur-[3px] pointer-events-none select-none opacity-40 transition-all duration-300">
          <div className="grid grid-cols-2 gap-2">
            {APPS.map((app) => (
              <button
                key={app.key}
                disabled
                id={`pay-btn-${app.key}`}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left transition-all"
              >
                <span className="text-2xl leading-none">{app.emoji}</span>
                <span className={`text-xs font-bold leading-tight ${app.accent}`}>{app.label}</span>
              </button>
            ))}
          </div>

          {/* QRIS Online fallback */}
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs font-semibold text-white/60 transition-all hover:bg-white/10 active:scale-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka via QRIS Online (Browser)
          </button>

          <p className="text-center text-[10px] text-white/20 leading-relaxed pt-1">
            Pastikan aplikasi banking sudah terinstall di HP Anda
          </p>
        </div>

        {/* Coming Soon Glassmorphism Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl z-20 border border-white/5 backdrop-blur-[2px]">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_8px_32px_rgba(245,158,11,0.2)] animate-pulse">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            Coming Soon
          </div>
          <p className="text-[11px] text-white/60 mt-2 text-center px-6 leading-relaxed max-w-[280px]">
            Integrasi langsung pembayaran otomatis sedang disiapkan.
          </p>
        </div>
      </div>

      <button
        onClick={() => onComplete?.()}
        className="w-full mt-4 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
      >
        Selesai & Simpan ke Peta ✓
      </button>
    </div>
  );
}
