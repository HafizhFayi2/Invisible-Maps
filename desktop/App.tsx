import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TopNavbar from './components/TopNavbar';
import { initIDMBlocker } from './utils/idmBlocker';

// Import Views
import HomeView from './views/HomeView';
import MerchantDetailView from './views/MerchantDetailView';
import DiscoverView from './views/DiscoverView';
import ProfileView from './views/ProfileView';

export default function DesktopApp() {
  useEffect(() => {
    initIDMBlocker();
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-surface text-on-surface">
      {/* Top Navbar */}
      <TopNavbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/explore" element={<MerchantDetailView />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/profile" element={<ProfileView />} />
          {/* Fallback to Home if unknown route */}
          <Route path="*" element={<HomeView />} />
        </Routes>
      </div>
    </div>
  );
}

