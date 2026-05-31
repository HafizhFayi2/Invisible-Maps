import React from 'react';
import { CheckCircle2, Coffee, Shirt, Map, Wrench, ShieldCheck, Settings, Heart, Star, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const savedGems = [
  { name: 'Warung Pizza Rakyat', rating: 4.8, dist: '0.8 km', status: 'Open Now', img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=300&q=80' },
  { name: 'Es Campur Pak Kumis', rating: 4.9, dist: '2.4 km', status: 'Closed', img: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=300&q=80' }
];

export default function ProfileView() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full bg-gray-50 w-full text-gray-900">
      {/* Left Sidebar */}
      <div className="w-64 bg-blue-50 border-r border-gray-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6">
            <h2 className="text-blue-900 font-semibold mb-1">Nearby Merchants</h2>
            <p className="text-xs text-gray-500 mb-6">Local discovery filters</p>
            <ul className="space-y-4 text-sm text-gray-700">
              <li className="flex items-center gap-3 cursor-pointer hover:text-green-600"><Coffee className="w-5 h-5" /> Street Food</li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-green-600"><Shirt className="w-5 h-5" /> Laundry</li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-green-600"><Map className="w-5 h-5" /> Warung</li>
              <li className="flex items-center gap-3 cursor-pointer hover:text-green-600"><Wrench className="w-5 h-5" /> Services</li>
            </ul>
          </div>
        </div>
        <div className="p-6">
          <button className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 transition">
            Verify Merchant
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Sync Bar */}
        <div className="bg-blue-700 text-white text-xs py-2 px-6 flex justify-between items-center sticky top-0 z-10">
          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> All changes synced offline</span>
          <div className="flex items-center gap-2">
             <div className="w-32 h-1.5 bg-blue-900 rounded-full overflow-hidden">
                <div className="w-full h-full bg-white"></div>
             </div>
             <span>100%</span>
          </div>
        </div>

        <div className="p-8 max-w-5xl mx-auto">
          {/* Profile Header */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start mb-6">
            <div className="flex gap-6 items-center">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80" alt="User" className="w-24 h-24 rounded-full border-4 border-green-100" />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">Indra Mapping <ShieldCheck className="text-green-500 w-6 h-6" /></h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md font-medium">Field Contributor</span>
                  <span>• Jakarta Selatan</span>
                </div>
                <p className="mt-3 text-sm text-gray-500 max-w-lg">Passionate about documenting local commerce and bringing visibility to the vibrant MSME ecosystem. Active in the community since 2022.</p>
              </div>
            </div>
            <button className="border border-green-600 text-green-600 px-4 py-2 text-sm rounded-lg flex items-center gap-2 bg-green-50 hover:bg-green-100 transition">
              <Settings className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-gray-800">Community Impact</h3>
                  <p className="text-xs text-gray-500">Your contribution to local growth</p>
                  <div className="text-4xl font-bold text-green-700 mt-4">1,248 <span className="text-sm font-normal text-gray-500">Points Earned</span></div>
                </div>
                <span className="text-green-600 font-semibold text-sm">+ 12% this month</span>
              </div>
              {/* Simple Bar Chart Placeholder */}
              <div className="flex items-end gap-2 h-24 mt-4">
                {[30, 40, 60, 40, 50, 60, 40, 80, 90, 60].map((h, i) => (
                  <div key={i} className="bg-green-400 w-full rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>

            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Community Badges</h3>
              <div className="space-y-4 mb-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><ShieldCheck className="text-orange-500 w-5 h-5" /></div>
                  <div><p className="font-bold text-sm">Street Hero</p><p className="text-xs text-gray-500">Verified 50+ stalls</p></div>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><User className="text-blue-500 w-5 h-5" /></div>
                  <div><p className="font-bold text-sm">Top Scout</p><p className="text-xs text-gray-500">Top 5% in Jakarta</p></div>
                </div>
              </div>
              <button className="w-full border border-gray-200 text-sm py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition">View Badge Gallery</button>
            </div>
          </div>

          {/* Saved Gems */}
          <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-gray-900">Saved Gems <span className="text-sm text-blue-600 cursor-pointer font-medium hover:underline" onClick={() => navigate('/desktop/explore')}>View All &gt;</span></h2>
          <div className="grid grid-cols-2 gap-6 mb-8">
            {savedGems.map((g, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative cursor-pointer hover:shadow-md transition" onClick={() => navigate('/desktop/explore')}>
                <div className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow z-10"><Heart className="w-5 h-5 text-red-500" /></div>
                <div className="relative">
                  <img src={g.img} className="w-full h-40 object-cover" alt={g.name} />
                  <span className={`absolute bottom-3 left-3 text-xs font-bold px-3 py-1 rounded-full text-white ${g.status === 'Open Now' ? 'bg-green-600' : 'bg-red-600'}`}>• {g.status}</span>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{g.name}</h3>
                    <span className="flex items-center text-sm font-bold text-gray-900"><Star className="w-4 h-4 fill-orange-500 text-orange-500 mr-1" />{g.rating}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Authentic wood-fired pizza with local toppings in a lively street setting.</p>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-sm text-gray-600 gap-1"><MapPin className="w-4 h-4" /> {g.dist} away</span>
                    <button className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition">Navigate</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
