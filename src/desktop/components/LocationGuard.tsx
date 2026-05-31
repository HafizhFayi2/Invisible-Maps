import { motion, AnimatePresence } from 'motion/react';
import { Navigation, Lock, X } from 'lucide-react';
import { useState } from 'react';

interface LocationGuardProps {
  onGranted: () => void;
  isRequesting: boolean;
  isDenied: boolean;
}

export default function LocationGuard({ onGranted, isRequesting, isDenied }: LocationGuardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="geo-toast"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute bottom-[140px] left-1/2 -translate-x-1/2 z-[2000] w-[340px] bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100 flex flex-col"
      >
        <button 
          onClick={() => setDismissed(true)} 
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-3 mt-1">
          <div className={`p-2 rounded-xl shrink-0 ${isDenied ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
            {isDenied ? <Lock className="w-5 h-5" /> : <Navigation className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">
              {isDenied ? 'Location Denied' : 'Enable Location'}
            </h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-3 pr-4">
              {isDenied 
                ? 'Please allow location access in your browser settings to use the radar scan feature.' 
                : 'Turn on location to scan nearby merchants from your actual position.'}
            </p>
            
            {!isDenied && (
              <button
                onClick={onGranted}
                disabled={isRequesting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
              >
                {isRequesting ? 'Requesting...' : 'Enable Location'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
