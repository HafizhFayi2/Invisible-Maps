import React, { useState } from 'react';
import { CheckCircle2, Coffee, Shirt, Map, Wrench, ShieldCheck, Settings, Star, MapPin, LogOut, Store, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { MerchantRow } from '@/services/supabase';

export default function ProfileView() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Saved merchants from localStorage
  const [savedMerchants, setSavedMerchants] = useState<MerchantRow[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('saved_merchants_data') ?? '[]');
    } catch { return []; }
  });

  const handleRemoveSaved = (id: string) => {
    const updated = savedMerchants.filter((m) => m.id !== id);
    setSavedMerchants(updated);
    localStorage.setItem('saved_merchants_data', JSON.stringify(updated));
    localStorage.setItem('saved_merchants', JSON.stringify(updated.map((m) => m.id)));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Username initials for avatar
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  // Format joined date
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="flex flex-col md:flex-row bg-gray-50 w-full text-gray-900 pb-24 md:pb-0">
      {/* Left Sidebar (Hidden on Mobile) */}
      <div className="hidden md:flex w-64 bg-emerald-50 border-r border-gray-200 flex-col justify-between shrink-0 h-full">
        <div>
          <div className="p-6">
            <h2 className="text-emerald-900 font-semibold mb-1">Browse Merchants</h2>
            <p className="text-xs text-gray-500 mb-6">Local discovery filters</p>
            <ul className="space-y-4 text-sm text-gray-700">
              <li className="flex items-center gap-3 cursor-pointer hover:text-emerald-600 transition">
                <Coffee className="w-5 h-5" /> Street Food
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-emerald-600 transition">
                <Shirt className="w-5 h-5" /> Laundry
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-emerald-600 transition">
                <Map className="w-5 h-5" /> Warung
              </li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-emerald-600 transition">
                <Wrench className="w-5 h-5" /> Services
              </li>
            </ul>
          </div>
        </div>
        <div className="p-6 space-y-2">
          <button
            onClick={() => navigate('/explore')}
            className="w-full bg-emerald-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-emerald-800 transition"
          >
            Explore Map
          </button>
          <button
            onClick={handleLogout}
            className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium text-sm hover:bg-red-50 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-full overflow-hidden">
        {/* Top Sync Bar */}
        <div className="bg-emerald-700 text-white text-[10px] md:text-xs py-2 px-4 md:px-6 flex justify-between items-center sticky top-0 z-10 w-full">
          <span className="flex items-center gap-1.5 md:gap-2 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Session active via localStorage</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block w-24 md:w-32 h-1.5 bg-emerald-900 rounded-full overflow-hidden">
              <div className="w-full h-full bg-white" />
            </div>
            <span>100%</span>
          </div>
        </div>

        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col items-center gap-4 text-center w-full">
              {/* Initials Avatar */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-black border-4 border-emerald-100 shadow-sm shrink-0">
                {initials}
              </div>
              <div className="w-full min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
                  {user?.username ?? 'Explorer'}
                  <ShieldCheck className="text-emerald-500 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs md:text-sm text-gray-600">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 md:px-3 md:py-1 rounded-md font-medium">
                    Field Contributor
                  </span>
                  <span>• Joined {joinedDate}</span>
                </div>
                <p className="mt-3 text-xs md:text-sm text-gray-500">
                  Part of the Invisible Map community — helping local UMKM gain digital visibility.
                </p>
              </div>
            </div>
            <button className="w-full mt-4 border border-emerald-600 text-emerald-600 px-4 py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 transition">
              <Settings className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="col-span-1 md:col-span-2 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-gray-800">Community Impact</h3>
                  <p className="text-xs text-gray-500">Your contribution to local growth</p>
                  <div className="text-4xl font-bold text-emerald-700 mt-4">
                    0 <span className="text-sm font-normal text-gray-500">Scans so far</span>
                  </div>
                </div>
                <span className="text-emerald-600 font-semibold text-sm">Welcome!</span>
              </div>
              <div className="flex items-end gap-2 h-24 mt-4">
                {[10, 15, 20, 10, 18, 22, 15, 25, 30, 20].map((h, i) => (
                  <div
                    key={i}
                    className="bg-emerald-200 w-full rounded-t-sm transition-all duration-300 hover:bg-emerald-400"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Account Info</h3>
              <div className="space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ShieldCheck className="text-emerald-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{user?.username ?? '—'}</p>
                    <p className="text-xs text-gray-500">Username</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Star className="text-blue-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{joinedDate}</p>
                    <p className="text-xs text-gray-500">Member since</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Gems */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Saved Gems</h2>
            <button
              onClick={() => navigate('/discover')}
              className="text-sm text-emerald-600 hover:underline font-medium"
            >
              Discover More →
            </button>
          </div>

          {savedMerchants.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center text-slate-400">
              <MapPin className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-slate-200" />
              <p className="font-semibold text-sm text-slate-500">No saved merchants yet.</p>
              <p className="text-[10px] md:text-xs mt-1 px-4">Use the Explore map to discover and save UMKM near you.</p>
              <button
                onClick={() => navigate('/explore')}
                className="mt-6 w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 md:py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/30"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedMerchants.map((m) => {
                // Get thumbnail
                let thumb: string | null = null;
                try {
                  if (m.images && m.images.length > 0) {
                    thumb = m.images[0];
                  } else if (m.image_urls) {
                    const parsed = typeof m.image_urls === 'string' ? JSON.parse(m.image_urls) : m.image_urls;
                    if (Array.isArray(parsed) && parsed.length > 0) thumb = parsed[0];
                  }
                } catch { /* ignore */ }

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => navigate(`/discover?merchantId=${m.id}`)}
                  >
                    {/* Thumbnail strip */}
                    <div className="w-full h-28 bg-emerald-50 overflow-hidden flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Store className="w-10 h-10 text-emerald-200" />
                      )}
                    </div>
                    <div className="p-4 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{[m.city, m.postal_code].filter(Boolean).join(', ') || 'Indonesia'}</span>
                        </p>
                        <span className="inline-block mt-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {m.category || 'UMKM'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveSaved(m.id); }}
                        title="Hapus dari simpanan"
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          
          {/* Mobile Sign Out Button */}
          <div className="md:hidden mt-6">
            <button
              onClick={handleLogout}
              className="w-full border border-red-200 text-red-500 py-3 rounded-xl font-medium text-sm hover:bg-red-50 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
