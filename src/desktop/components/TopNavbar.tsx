import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { Bell, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const currentPath = location.pathname;

  // Derive initials from username for the avatar badge
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isExploreRoot =
    currentPath === '/desktop' || currentPath === '/desktop/explore';
  const isDiscover = currentPath.startsWith('/desktop/discover');
  
  const activeNav = isDiscover ? 'Discover' : (isExploreRoot ? 'Explore' : 'Home');

  return (
    <div className="absolute top-4 left-4 right-4 pointer-events-none z-50 flex flex-col md:flex-row justify-between items-start gap-2">
      <div className="flex justify-between items-center w-full md:w-auto">
        {/* Branding */}
        <div className="glass-panel rounded-2xl px-4 md:px-5 py-2.5 md:py-3.5 flex items-center gap-3 pointer-events-auto shadow-sm">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[var(--accent)] to-teal-500 flex items-center justify-center text-white shadow-inner">
            <Activity size={18} strokeWidth={3} />
          </div>
          <span className="font-extrabold text-[18px] md:text-xl tracking-tight text-[var(--text-main)]">InvisibleMap</span>
        </div>
        
        {/* Mobile User Actions (hidden on desktop) */}
        <div className="md:hidden pointer-events-auto">
          <div className="glass-panel rounded-[16px] p-1.5 flex items-center gap-1 shadow-sm">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 transition-all relative">
              <Bell size={18} strokeWidth={2.5} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--panel-bg)]" />
            </button>
            <div className="w-px h-5 bg-[var(--border-light)] mx-0.5" />
            <button
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl hover:bg-black/5 transition-all group"
              onClick={() => navigate('/desktop/profile')}
            >
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-black shadow-sm ring-2 ring-transparent group-hover:ring-emerald-200 transition-all">
                {initials}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Center Nav */}
      <div className="hidden md:flex pointer-events-auto">
        <div className="glass-panel rounded-[20px] p-1.5 flex items-center gap-1.5 shadow-sm">
          {["Home", "Explore", "Discover"].map((item) => {
            const path = item === 'Home' ? '/desktop/home' : (item === 'Discover' ? '/desktop/discover' : '/desktop');
            return (
              <button
                key={item}
                onClick={() => navigate(path)}
                className={cn(
                  "relative px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-300",
                  activeNav === item ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5"
                )}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {item}
                </span>
                {activeNav === item && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 bg-[var(--accent-glass)] rounded-xl border border-[var(--accent)]/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right User Actions */}
      <div className="hidden md:flex pointer-events-auto">
        <div className="glass-panel rounded-[20px] p-2 flex items-center gap-2 shadow-sm">
          <button className="w-10 h-10 rounded-[14px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 transition-all relative">
            <Bell size={20} strokeWidth={2.5} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--panel-bg)]" />
          </button>
          <div className="w-px h-6 bg-[var(--border-light)] mx-1" />
          <button
            className="flex items-center gap-3 pl-2 pr-4 py-1 rounded-[14px] hover:bg-black/5 transition-all group"
            onClick={() => navigate('/desktop/profile')}
          >
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[11px] font-black shadow-sm ring-2 ring-transparent group-hover:ring-emerald-200 transition-all">
              {initials}
            </div>
            <span className="text-[14px] font-extrabold text-[var(--text-main)] truncate max-w-[100px]">
              {user?.username ?? 'user.'}
            </span>
            <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" strokeWidth={3} />
          </button>
          <button
            onClick={handleLogout}
            className="ml-1 px-3 py-1.5 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
