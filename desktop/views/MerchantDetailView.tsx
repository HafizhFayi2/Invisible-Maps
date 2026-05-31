import React from 'react';
import { Star, MapPin, Search, Coffee, Clock, Banknote, ScanLine, Navigation, ShieldCheck } from 'lucide-react';

export default function MerchantDetailView() {
  return (
    <div className="bg-gray-50 min-h-full w-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Side: Images & Map */}
          <div className="col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4 h-96">
              <div className="col-span-2 bg-gray-200 rounded-2xl overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="Main stall" />
              </div>
              <div className="col-span-1 flex flex-col gap-4">
                <img src="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=300&q=80" className="w-full h-44 object-cover rounded-2xl" alt="Food 1" />
                <div className="w-full h-44 bg-gray-900 rounded-2xl flex items-center justify-center text-white cursor-pointer relative overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1541557435984-1c79485d082c?auto=format&fit=crop&w=300&q=80" className="opacity-40 w-full h-full object-cover absolute" alt="View All" />
                  <div className="relative z-10 text-center"><Search className="w-6 h-6 mx-auto mb-2" /> View All 12</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Precision Location</h3>
              <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
                <div className="flex flex-col items-center">
                  <MapPin className="text-green-600 w-10 h-10 fill-green-100" />
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow mt-2 text-gray-900">Soto Ayam Madura</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Info Card */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-gray-900">
               <div className="flex justify-between items-start mb-4">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">OPEN NOW</span>
                  <span className="flex items-center text-orange-500 font-bold"><Star className="w-4 h-4 fill-orange-500 mr-1" /> 4.8</span>
               </div>
               <h1 className="text-3xl font-bold mb-2">Soto Ayam Madura Cak To</h1>
               <p className="text-gray-500 flex items-center gap-2 mb-6"><Coffee className="w-4 h-4" /> Street Food • Warung</p>
               
               <div className="space-y-4 mb-8">
                 <div className="flex gap-3 text-sm text-gray-700">
                   <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                   <p>Jl. Dharmahusada No.75, Mojo, Kec. Gubeng, Surabaya, Jawa Timur 60285</p>
                 </div>
                 <div className="flex gap-3 text-sm text-gray-700">
                   <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                   <p>06:00 - 15:00 • Closes soon</p>
                 </div>
                 <div className="flex gap-3 text-sm text-gray-700">
                   <Banknote className="w-5 h-5 text-gray-400 shrink-0" />
                   <p>IDR 15k - 30k • Cash, QRIS</p>
                 </div>
               </div>

               <button className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2 mb-3 hover:bg-green-800 transition">
                 <ScanLine className="w-5 h-5" /> Pay with QRIS
               </button>
               <button className="w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-blue-50 transition">
                 <Navigation className="w-5 h-5" /> Navigate to Stall
               </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-4">
               <ShieldCheck className="w-8 h-8 text-green-600" />
               <div>
                 <h4 className="font-bold text-gray-800">Verified Merchant</h4>
                 <p className="text-xs text-gray-500">Last audited 3 days ago</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
