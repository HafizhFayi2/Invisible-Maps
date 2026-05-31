import React from 'react';
import { User, Clock, CheckCircle2, Star, ShieldCheck, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const metricData = [
  { title: 'Total Merchants', value: '428', icon: <User className="text-green-600" />, bg: 'bg-green-100' },
  { title: 'Recently Added', value: '15', icon: <Clock className="text-green-600" />, bg: 'bg-green-100' },
  { title: 'Active Warungs', value: '380', icon: <CheckCircle2 className="text-green-600" />, bg: 'bg-green-100' }
];

const newWarungs = [
  { name: 'Warung Nasi Goreng', rating: 4.8, img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=300&q=80' },
  { name: 'Warung Ijo', rating: 4.5, img: 'https://images.unsplash.com/photo-1564671165093-20688ff1fffa?auto=format&fit=crop&w=300&q=80' },
  { name: 'Kopi Warung', rating: 4.7, img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80' },
];

export default function HomeView() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-8 relative min-h-full bg-surface text-on-surface w-full">
      <h1 className="text-5xl font-bold text-green-700 mb-8 mt-4">Welcome Home</h1>
      
      <div className="flex gap-8 mb-12">
        <div className="w-1/3">
          <h2 className="text-xl font-bold mb-4">Key Metrics</h2>
          <div className="flex gap-4 flex-col lg:flex-row">
            {metricData.map((m, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col justify-between">
                <div className={`${m.bg} w-12 h-12 rounded-lg flex items-center justify-center mb-6`}>
                  {m.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{m.title}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">{m.value}</p>
                </div>
                <div className="h-1 w-full bg-green-500 rounded-b-xl mt-4 -mx-4 -mb-4 block"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-2/3">
          <h2 className="text-xl font-bold mb-4">Newly Added Warungs</h2>
          <div className="flex gap-4">
            {newWarungs.map((w, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 w-48 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/desktop/explore')}>
                <img src={w.img} alt={w.name} className="w-full h-28 object-cover rounded-lg mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-gray-900">{w.name}</h3>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" /> {w.rating}
                </div>
                <button className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Bottom Actions */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button className="bg-white text-green-700 px-6 py-3 rounded-full shadow-lg border border-green-200 flex items-center gap-2 font-medium hover:bg-green-50 transition">
          <ShieldCheck className="w-5 h-5" /> Verify Merchant
        </button>
        <button className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium hover:bg-green-700 transition">
          <ScanLine className="w-5 h-5" /> Scan QRIS to Pay
        </button>
      </div>
    </div>
  );
}
