import { Activity, Bell, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Branding() {
  return (
    <div className="glass-panel rounded-2xl px-4 md:px-5 py-2.5 md:py-3.5 flex items-center gap-3 pointer-events-auto">
      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-teal-500 flex items-center justify-center text-white shadow-inner">
        <Activity size={18} className="md:w-5 md:h-5" strokeWidth={3} />
      </div>
      <span className="font-extrabold text-[18px] md:text-xl tracking-tight text-[var(--text-main)]">InvisibleMap</span>
    </div>
  );
}

export function CenterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentPath = location.pathname;
  let active = 'Explore';
  if (currentPath.includes('/home')) active = 'Home';
  if (currentPath.includes('/discover')) active = 'Discover';

  const handleNav = (item: string) => {
    if (item === 'Explore') navigate('/explore');
    if (item === 'Home') navigate('/home');
    if (item === 'Discover') navigate('/discover');
  };

  return (
    <div className="glass-panel rounded-[20px] p-1.5 flex items-center gap-1.5 pointer-events-auto shadow-sm">
      {['Home', 'Explore', 'Discover'].map((item) => (
        <button 
          key={item} 
          onClick={() => handleNav(item)}
          className={cn(
            "relative px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-300",
            active === item ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5"
          )}
        >
          <span className="relative z-10 flex items-center gap-2">
            {item}
          </span>
          {active === item && (
            <motion.div layoutId="nav-bg" className="absolute inset-0 bg-[var(--accent-glass)] rounded-xl border border-[var(--accent)]/20" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Notification Bubble (CSS-animated portal — works even in DevTools emulation) ──
function NotifBubble({ top, right, onClose }: { top: number; right: number; onClose: () => void }) {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top,
        right,
        minWidth: 220,
        zIndex: 99999,
        animation: 'notifBubbleIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards',
      }}
    >
      {/* CSS keyframe injected once */}
      <style>{`
        @keyframes notifBubbleIn {
          from { opacity: 0; transform: scale(0.88) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Arrow pointer */}
      <div style={{
        position: 'absolute',
        top: -6,
        right: 16,
        width: 12,
        height: 12,
        background: '#111827',
        transform: 'rotate(45deg)',
        borderRadius: 2,
      }} />

      {/* Bubble card */}
      <div style={{
        background: '#111827',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.3 }}>
            🔔 Notifikasi
          </p>
          <p style={{ color: '#d1d5db', fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
            Fitur ini akan segera hadir!
          </p>
          <div style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16,185,129,0.15)',
            color: '#34d399',
            fontSize: 10,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
            Coming Soon
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 2, marginTop: 2 }}
          onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseOut={(e) => (e.currentTarget.style.color = '#9ca3af')}
        >
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export function UserActions() {
  const navigate = useNavigate();
  const [showNotifBubble, setShowNotifBubble] = useState(false);
  const [bubblePos, setBubblePos] = useState<{ top: number; right: number } | null>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss after 30s (long enough for users to read)
  useEffect(() => {
    if (!showNotifBubble) return;
    const t = setTimeout(() => setShowNotifBubble(false), 30000);
    return () => clearTimeout(t);
  }, [showNotifBubble]);

  const handleBellClick = () => {
    if (showNotifBubble) {
      setShowNotifBubble(false);
    } else {
      if (bellRef.current) {
        const rect = bellRef.current.getBoundingClientRect();
        setBubblePos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      setShowNotifBubble(true);
    }
  };

  return (
    <div className="glass-panel rounded-[16px] md:rounded-[20px] p-1.5 md:p-2 flex items-center gap-1 md:gap-2 pointer-events-auto shadow-sm">
      {/* Bell Button */}
      <button
        id="notif-bell"
        ref={bellRef}
        onClick={handleBellClick}
        className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-[14px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 transition-all relative"
      >
        <Bell size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
        <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--panel-bg)]" />
      </button>

      {/* CSS-animated Portal Bubble — bypasses all overflow/clip */}
      {showNotifBubble && bubblePos && (
        <NotifBubble
          top={bubblePos.top}
          right={bubblePos.right}
          onClose={() => setShowNotifBubble(false)}
        />
      )}

      <div className="w-px h-5 md:h-6 bg-[var(--border-light)] mx-0.5 md:mx-1" />

      {/* Profile Button */}
      <button onClick={() => navigate('/profile')} className="flex items-center gap-2 md:gap-3 pl-1.5 md:pl-2 pr-3 md:pr-4 py-1 rounded-xl md:rounded-[14px] hover:bg-black/5 transition-all group">
        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" alt="avatar" className="w-8 h-8 md:w-9 md:h-9 rounded-[10px] border border-[var(--border-light)] bg-white object-cover shadow-sm group-hover:scale-105 transition-transform" />
        <span className="hidden md:inline text-[14px] font-extrabold text-[var(--text-main)] truncate max-w-[100px]">udin.</span>
        <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors hidden md:block" strokeWidth={3} />
      </button>
    </div>
  );
}
