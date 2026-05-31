import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabaseClient } from '../services/supabase';
import { Loader2, UserPlus, AlertCircle, ShieldCheck, HelpCircle, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) return;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const supabase = getSupabaseClient();

    try {
      try {
        // 1. Insert into app_users table directly
        const { error: signUpError } = await supabase
          .from('app_users')
          .insert([
            { 
              username, 
              password 
            }
          ]);

        if (signUpError) {
          if (signUpError.message.includes('unique constraint')) {
            throw new Error('Username sudah terdaftar.');
          }
          throw signUpError;
        }
      } catch (dbErr: any) {
        // Check if error is network/fetch/downtime related
        const errStr = String(dbErr.message || dbErr).toLowerCase();
        const isOffline = errStr.includes('fetch') || errStr.includes('getaddrinfo') || errStr.includes('521') || errStr.includes('network') || errStr.includes('typeerror');
        
        if (isOffline) {
          console.warn('[Register] Supabase offline/paused. Falling back to localStorage auth.');
          
          const localUsersRaw = localStorage.getItem('local_app_users') || '[]';
          let localUsers = [];
          try {
            localUsers = JSON.parse(localUsersRaw);
          } catch {
            localUsers = [];
          }

          const found = localUsers.find((u: any) => u.username === username);
          if (found) {
            throw new Error('Username sudah terdaftar.');
          }

          localUsers.push({
            id: `u_${Math.random().toString(36).slice(2, 10)}`,
            username,
            password,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('local_app_users', JSON.stringify(localUsers));
        } else {
          throw dbErr;
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/login?registered=true'), 1200);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans text-gray-900 overflow-hidden relative">
      
      {/* Background soft gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-100/30 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="w-full flex justify-between items-center p-6 lg:px-12 relative z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="text-emerald-700 font-bold text-xl flex items-center gap-2">
            <MapPin className="w-6 h-6 fill-emerald-100" />
            Invisible Map
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-800 transition">
          <HelpCircle className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center relative z-10 w-full px-4 py-8">
        
        {/* Left Floating Card (Hidden on Mobile) */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hidden lg:block absolute left-12 bottom-24 w-80 bg-white p-4 rounded-3xl shadow-xl border border-gray-100"
        >
          <img 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80" 
            alt="Street Food Night" 
            className="w-full h-48 object-cover rounded-2xl mb-4"
          />
          <h3 className="font-bold text-lg text-gray-900 mb-1">Join the Community</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Become a part of the local commerce ecosystem and help MSMEs grow.
          </p>
        </motion.div>

        {/* Center Register Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-[90%] sm:w-[448px] shrink-0 bg-white p-10 rounded-[2rem] shadow-2xl shadow-blue-900/5 border border-gray-100"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-emerald-400 text-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Create Account</h1>
            <p className="text-gray-500 text-sm leading-relaxed px-4">
              Join Invisible Map to start exploring and contributing.
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm border border-red-100 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or Email"
                className="w-full bg-white border border-gray-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl py-4 px-5 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                disabled={loading || success}
              />
            </div>
            
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-white border border-gray-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl py-4 px-5 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                disabled={loading || success}
              />
            </div>

            <div>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full bg-white border border-gray-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 rounded-xl py-4 px-5 text-gray-900 placeholder-gray-400 outline-none transition-all font-medium"
                disabled={loading || success}
              />
            </div>

            <button 
              disabled={loading || success || !username || !password || !confirmPassword}
              className="w-full bg-[#0E7A3D] hover:bg-[#0b6331] text-white py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-70 disabled:hover:bg-[#0E7A3D] mt-2 relative overflow-hidden flex justify-center items-center h-[60px]"
              type="submit"
            >
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.span 
                    key="success"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" /> Account Created
                  </motion.span>
                ) : loading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.span 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Create Account
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <button 
              onClick={() => navigate('/login')} 
              className="text-emerald-700 font-bold flex items-center justify-center gap-2 w-full hover:text-emerald-800 transition group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Sudah punya akun? Login
            </button>
            <p className="text-xs text-gray-400 mt-6 leading-relaxed">
              By creating an account, you agree to our <span className="text-gray-500 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-gray-500 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 text-sm text-gray-500 font-medium">
        <div className="flex gap-6">
          <span>© 2024 Invisible Map</span>
          <span className="cursor-pointer hover:text-gray-800 transition">Support</span>
          <span className="cursor-pointer hover:text-gray-800 transition">Status</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gray-400" />
          <span>Secure Registration</span>
        </div>
      </footer>

    </div>
  );
}
