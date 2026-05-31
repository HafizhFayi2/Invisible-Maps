import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import ExploreSidebar from './components/ExploreSidebar';
import MapArea from './components/MapArea';
import LensPanel from './components/LensPanel';
import { Branding, CenterNav, UserActions } from './components/MapOverlays';
import { initIDMBlocker } from './utils/idmBlocker';
import { getMerchantCount, MerchantRow } from '@/services/supabase';
import QRISScanner from './components/QRISScanner';
import { Map, ScanLine } from 'lucide-react';
import { SelectedLocation } from '@/types';
import { ANIMATION_TOKENS } from '@/core/theme';

import HomeView from './views/HomeView';
import DiscoverView from './views/DiscoverView';
import ProfileView from './views/ProfileView';

// ─── Smooth slide-up panel transition ────────────────────────────────────────
const panelVariants = {
  initial: { opacity: 0, y: 24, scale: 0.985, filter: ANIMATION_TOKENS.blurInitial },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: ANIMATION_TOKENS.blurNone,
    transition: { duration: ANIMATION_TOKENS.durationSlow, ease: ANIMATION_TOKENS.easeOut },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.99,
    filter: ANIMATION_TOKENS.blurExit,
    transition: { type: 'tween', duration: ANIMATION_TOKENS.durationFast, ease: ANIMATION_TOKENS.easeIn },
  },
};

function AnimatedPanel({ children }: { children: React.ReactNode }) {
  const lastScrollY = React.useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > 20) {
      window.dispatchEvent(new CustomEvent('nav-visibility', { detail: false }));
    } else {
      window.dispatchEvent(new CustomEvent('nav-visibility', { detail: true }));
    }
    lastScrollY.current = currentScrollY;
  };

  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onScroll={handleScroll}
      className="w-full h-full pt-32 md:pt-24 relative z-50 overflow-auto"
      style={{ background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(24px)' }}
    >
      {children}
    </motion.div>
  );
}

// ─── Mobile Bottom Action Bar (lives outside AnimatedPanel) ───────────────────
function MobileBottomBar({
  onOpenScanner,
}: {
  onOpenScanner: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname.includes('/home');

  // Only show on /home route on mobile
  if (!isHome) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 md:hidden flex gap-3 z-[5000] shadow-[0_-8px_32px_rgba(0,0,0,0.06)]">
      <button
        onClick={() => navigate('/explore')}
        className="flex-1 bg-emerald-50 text-emerald-700 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm active:scale-95 transition-all"
      >
        <Map className="w-4 h-4" /> Explore
      </button>
      <button
        onClick={onOpenScanner}
        className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
      >
        <ScanLine className="w-4 h-4" /> Scan QRIS
      </button>
    </div>
  );
}

// ─── Main Desktop App ─────────────────────────────────────────────────────────
export default function DesktopApp() {
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [merchantCount, setMerchantCount] = useState<number | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);

  // ── QRIS scanner state lives here (outside AnimatedPanel) ──
  const [showScanner, setShowScanner] = useState(false);
  const handleScanSuccess = useCallback((merchant: MerchantRow) => {
    console.log('[App] Scan success:', merchant.name);
    setMapRefreshKey(k => k + 1);
    setShowScanner(false);
  }, []);

  const refreshMap = useCallback(() => setMapRefreshKey(k => k + 1), []);
  const navigate = useNavigate();
  const location = useLocation();

  const handleMerchantClick = useCallback((merchant: MerchantRow) => {
    navigate(`/discover?merchantId=${merchant.id}`);
  }, [navigate]);


  useEffect(() => {
    initIDMBlocker();
    getMerchantCount().then(setMerchantCount);

    const handleNavVis = (e: Event) => {
      setIsNavVisible((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener('nav-visibility', handleNavVis);
    return () => window.removeEventListener('nav-visibility', handleNavVis);
  }, []);

  const isExplore =
    location.pathname === '/' ||
    location.pathname === '/explore' ||
    (!location.pathname.includes('/home') &&
      !location.pathname.includes('/discover') &&
      !location.pathname.includes('/profile'));

  useEffect(() => {
    if (isExplore) {
      setIsNavVisible(true);
      const timer = setTimeout(() => setIsNavVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsNavVisible(true);
    }
  }, [isExplore, location.pathname]);

  return (
    <div className="h-screen w-screen bg-[var(--bg-map)] overflow-hidden relative flex flex-col font-sans text-[var(--text-main)] selection:bg-[var(--accent)] selection:text-white">

      {/* ── Persistent map background ── */}
      <div className="absolute inset-0 z-0 pointer-events-auto" onClick={() => { if (isExplore) setIsNavVisible(true); }}>
        <MapArea onLocationClick={setSelectedLocation} onMerchantClick={handleMerchantClick} onUserPosChange={setUserPos} refreshKey={mapRefreshKey} />
      </div>

      {/* Abstract SVG overlays */}
      <svg className="w-full h-full absolute inset-0 opacity-40 mix-blend-multiply filter drop-shadow-sm pointer-events-none z-[1]" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,200 C300,300 400,600 800,800 C1200,1000 1500,800 2000,900" stroke="#ffffff" strokeWidth="24" fill="none" strokeLinecap="round" />
        <path d="M-100,200 C300,300 400,600 800,800 C1200,1000 1500,800 2000,900" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M400,-100 L500,400 L800,800 L900,1200" stroke="#ffffff" strokeWidth="16" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M400,-100 L500,400 L800,800 L900,1200" stroke="#e2e8f0" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* ── Explore-only UI ── */}
      <AnimatePresence>
        {isExplore && (
          <motion.div
            key="explore-ui"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: ANIMATION_TOKENS.durationSlow, ease: ANIMATION_TOKENS.easeOut } }}
            exit={{ opacity: 0, transition: { type: 'tween', duration: ANIMATION_TOKENS.durationFast, ease: ANIMATION_TOKENS.easeIn } }}
            className="absolute inset-0 z-[50] pointer-events-none"
          >
            <ExploreSidebar merchantCount={merchantCount} userPos={userPos} />

            {!selectedLocation && (
              <div className="hidden md:flex absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg">
                  <div className="flex gap-1">
                    {['#4285F4', '#EA4335', '#FBBC05', '#34A853'].map((c, i) => (
                      <span key={c} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: c, animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-white font-medium">Klik area peta untuk scan AI</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lens Panel */}
      <div className="absolute inset-0 z-[3000] pointer-events-none">
        <div className="pointer-events-auto">
          <LensPanel location={selectedLocation} onClose={() => setSelectedLocation(null)} />
        </div>
      </div>

      {/* ── Floating Header ── */}
      <div className="absolute top-0 left-0 w-full z-[2000] p-3 md:p-6 flex flex-col md:flex-row justify-between items-start pointer-events-none gap-3 md:gap-0">
        <div className="w-full flex justify-between items-start md:items-center md:w-auto">
          <AnimatePresence>
            {isNavVisible && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }}
                exit={{ y: -50, opacity: 0, transition: { type: 'tween', ease: ANIMATION_TOKENS.easeInOut, duration: ANIMATION_TOKENS.durationFast } }}
                className="pointer-events-auto"
              >
                <Branding />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ml-auto pointer-events-auto">
            <UserActions />
          </div>
        </div>

        <AnimatePresence>
          {isNavVisible && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }}
              exit={{ y: -50, opacity: 0, transition: { type: 'tween', ease: ANIMATION_TOKENS.easeInOut, duration: ANIMATION_TOKENS.durationFast } }}
              className="pointer-events-auto flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2 w-full md:w-auto"
            >
              <CenterNav />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Animated Tab Content ── */}
      <div className="absolute inset-0 z-[100] pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} className="w-full h-full" initial={false}>
          <Routes location={location}>
            <Route path="/" element={<></>} />
            <Route path="/explore" element={<></>} />

            <Route
              path="/home"
              element={
                <div className="w-full h-full pointer-events-auto">
                  <AnimatedPanel>
                    <HomeView onMerchantAdded={refreshMap} onOpenScanner={() => setShowScanner(true)} />
                  </AnimatedPanel>
                </div>
              }
            />
            <Route
              path="/discover"
              element={
                <div className="w-full h-full pointer-events-auto">
                  <AnimatedPanel><DiscoverView /></AnimatedPanel>
                </div>
              }
            />
            <Route
              path="/profile"
              element={
                <div className="w-full h-full pointer-events-auto">
                  <AnimatedPanel><ProfileView /></AnimatedPanel>
                </div>
              }
            />

            <Route path="*" element={<></>} />
          </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Mobile Bottom Bar — OUTSIDE AnimatedPanel to avoid transform clipping ── */}
      <MobileBottomBar onOpenScanner={() => setShowScanner(true)} />

      {/* ── QRIS Scanner Modal — also outside AnimatedPanel ── */}
      {showScanner && (
        <div className="fixed inset-0 z-[9000] pointer-events-auto">
          <QRISScanner
            onClose={() => setShowScanner(false)}
            onSuccess={handleScanSuccess}
          />
        </div>
      )}
    </div>
  );
}
