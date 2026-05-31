import React from 'react';
import { Link } from 'react-router-dom';

export default function DiscoverPage() {
  return (
    <div className="max-w-md mx-auto relative bg-background text-on-background font-body-lg h-[100dvh] w-full flex flex-col sm:border-x sm:border-zinc-200 shadow-2xl overflow-hidden">
      <style>{`
        .ar-perspective { transform: perspective(600px) rotateX(60deg); }
        .pin-bounce { animation: bounce 2s infinite ease-in-out; }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 20px); }
      `}</style>

      {/* Simulated AR Camera Background */}
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnFobWvfYd8dlhNmnH2km_K9ru_hdGLYGFPQjhxHEV5jLmRz4jo5J5gyQOES1mUSjKUV-b9XdIrMNcpuG6XUBo5fkptbBqVeJCKipFwgCksd5ggF3njL0r9Z4Mdw6AK0is9uxjy_CjF6QIUHYooV-VtZGHfoIGCtQzvbDbxGskbVjgPyUNpePyXbQ9Y8k2wbppeScCra5AmTvA7quKjXfJ6qzRfwL1A-kUL3PjOsfMNf1wxl1rj0iYPY6q13NEqaWDcN7MA6eNG2hN" 
          alt="AR Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>
      </div>

      {/* TopAppBar Component */}
      <nav className="bg-white/95 backdrop-blur-md text-emerald-600 font-plus-jakarta font-semibold absolute top-0 w-full z-50 border-b border-zinc-100 shadow-sm flex items-center justify-between px-4 h-16 pt-safe">
        {/* Leading Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant shrink-0 active:scale-95 duration-150">
          <img 
            alt="User profile photo" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHT8KbRTKpQcquQwX7XmIUj1IPuasZl3dK-ZrGYPkyPwXmO2A0qeWZIDSiGor4JdpfTCJM_JvO_XEod7FiwoVKgVnLvZRPXRnN5aWPP6MpVgWaYxZcEUtOmwHj1UJbHc_qzSdf6yrD7MI3Ws3RQLfIbuKq3c54wSEL2adYA2oVDfiM7FQOnP8J_7ZmsxtmWhIwCBzLYKV_fBKMj8H3MNR-IuXeBEjrH8ro5di_5cjL7_uIIpCJHg_-dPxeWnS7xf2ysjZPBI7pwTlb"
          />
        </div>
        {/* Headline */}
        <h1 className="text-xl font-extrabold tracking-tight text-emerald-600 flex-1 text-center">Invisible Map</h1>
        {/* Trailing Icon */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-50 transition-colors active:scale-95 duration-150 text-zinc-900">
          <span className="material-symbols-outlined">mic</span>
        </button>
      </nav>

      {/* AR Overlays Container */}
      <main className="absolute inset-0 z-10 pt-16 pb-20 pointer-events-none flex flex-col items-center justify-center">
        {/* Floating 3D Mapping Green Pin */}
        <div className="relative mt-20 pin-bounce flex flex-col items-center">
          <div className="w-16 h-16 bg-primary rounded-full shadow-[0_8px_32px_rgba(0,109,55,0.4)] flex items-center justify-center border-4 border-surface-container-lowest">
            <span className="material-symbols-outlined text-surface-container-lowest text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>restaurant</span>
          </div>
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary -mt-1 drop-shadow-md"></div>
          <div className="mt-2 bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant px-3 py-1 rounded-full text-primary font-label-bold text-label-bold shadow-sm">
            20m
          </div>
        </div>
        {/* Directional Path (Floor Arrow) */}
        <div className="absolute bottom-1/4 w-full flex justify-center ar-perspective opacity-80">
          <div className="flex flex-col items-center gap-2">
            <div className="w-4 h-16 bg-primary rounded-full shadow-[0_0_15px_rgba(0,109,55,0.6)]"></div>
            <div className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-b-[32px] border-b-primary drop-shadow-[0_0_15px_rgba(0,109,55,0.6)]"></div>
          </div>
        </div>
      </main>

      {/* Overlay Card at Bottom */}
      <div className="absolute bottom-[100px] left-margin-mobile right-margin-mobile z-20">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant text-primary">
            <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>navigation</span>
          </div>
          <div className="flex-1 pt-1">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-1">Nasi Goreng Gila</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">20m ahead. Follow the green line.</p>
          </div>
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <nav className="bg-white absolute bottom-0 w-full z-50 border-t rounded-t-lg border-zinc-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex justify-around items-center h-20 px-2 pb-safe md:hidden">
        <Link to="/map" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">map</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Map</span>
        </Link>
        <Link to="/discover" className="flex flex-col items-center justify-center text-emerald-600 bg-emerald-50 rounded-xl px-3 py-1 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>explore</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Discover</span>
        </Link>
        <Link to="/scan" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">qr_code_scanner</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Scan</span>
        </Link>
        <Link to="/contribute" className="flex flex-col items-center justify-center text-zinc-400 px-3 py-1 hover:text-emerald-500 active:scale-90 transition-transform duration-200 touch-none">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold font-plus-jakarta uppercase tracking-wider mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
