import React from 'react';
import ExploreSidebar from '../components/ExploreSidebar';
import MapArea from '../components/MapArea';

export default function DiscoverView() {
  return (
    <>
      {/* Left Sidebar for Discover/Explore */}
      <ExploreSidebar />
      {/* Right Map Area */}
      <div className="flex-1 relative">
        <MapArea />
        
        {/* Floating Map Status Overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex gap-2 pointer-events-auto">
          <div className="bg-surface/90 backdrop-blur-md rounded-lg px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-2 text-on-surface">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            428 Active Merchants Nearby
          </div>
          <div className="bg-surface/90 backdrop-blur-md rounded-lg px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-2 text-secondary">
            <span>☁️ All Data Synced</span>
          </div>
        </div>
      </div>
    </>
  );
}
