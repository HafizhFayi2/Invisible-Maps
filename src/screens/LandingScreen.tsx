import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function LandingScreen() {
  const navigate = useNavigate();
  // States: 'loading' -> 'landing' -> 'transitioning'
  const [phase, setPhase] = useState("loading");
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    let scrollTimer: NodeJS.Timeout;
    
    // Biarkan teks meluncur ke tengah dulu, setelah 3 detik baru turun ke landing page
    const timer = setTimeout(() => {
      setPhase("landing");
      
      // Tunggu animasi transisi turun (spring layout) selesai sebelum membolehkan scroll
      scrollTimer = setTimeout(() => {
        document.body.style.overflow = "";
      }, 1500);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      if (scrollTimer) clearTimeout(scrollTimer);
      document.body.style.overflow = "";
    };
  }, []);

  const handleLoginClick = (e: React.MouseEvent) => {
    setClickPos({ x: e.clientX, y: e.clientY });
    setPhase("transitioning");
    setTimeout(() => {
      navigate('/login');
    }, 1200);
  };

  const textLine1 = "Hi There".split("");
  const textLine2 = "Welcome".split("");

  // Efek Gelombang Huruf (Wavy Spring) dari Bawah Viewport ke Tengah
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 }
    }
  };

  const letterVariants = {
    hidden: { y: "100vh", opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", damping: 18, stiffness: 90 }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F3F7F9] overflow-hidden font-sans">

      {/* ================= LAYER 1: BACKGROUND LANDING PAGE LAYER (Standby di Belakang) ================= */}
      <div className="relative w-full min-h-screen">
        
        {/* NAVBAR */}
        <motion.nav 
          animate={{ opacity: phase === "landing" ? 1 : 0, y: phase === "landing" ? 0 : -20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 bg-[#F3F7F9]/40 backdrop-blur-md"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-[#0E6C3B] font-bold text-xl cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 20l-5-3V4l5 3 5-3 5 3v13l-5-3z"/></svg>
            Invisible Map
          </motion.div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
            <motion.span 
              whileHover={{ scale: 1.1, color: "#0E6C3B" }}
              whileTap={{ scale: 0.95 }}
              className="text-[#0E6C3B] cursor-pointer transition-colors"
            >
              Home
            </motion.span>
            <motion.span 
              whileHover={{ scale: 1.1, color: "#111827" }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer transition-colors" 
              onClick={() => navigate('/login')}
            >
              Login
            </motion.span>
          </div>
        </motion.nav>

        {/* HERO CONTAINER */}
        <div className="pt-40 pb-16 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
          
          {/* Tempat Hinggap Teks Setelah Loading Selesai (Layout Anchor) */}
          <div className="h-32 md:h-48 flex items-center justify-center mb-6">
            {phase === "landing" && (
              <motion.div
                layoutId="shared-main-title"
                transition={{ type: "spring", damping: 22, stiffness: 75 }}
                className="flex flex-col items-center"
              >
                <h1 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tight leading-none">Hi There</h1>
                <h1 className="text-6xl md:text-8xl font-black text-[#0E6C3B] tracking-tight leading-none mt-2">Welcome</h1>
              </motion.div>
            )}
          </div>

          {/* SUBTITLE & BUTTON CUSTOMER */}
          <motion.div
            animate={{ opacity: phase === "landing" ? 1 : 0, y: phase === "landing" ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full max-w-2xl mx-auto text-center px-4"
          >
            <div className="mb-6 inline-flex items-center gap-2 bg-[#DDF1F8] text-[#0081C9] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap">
              For Customer Discovery
            </div>
            <p className="text-gray-500 text-lg md:text-xl leading-relaxed mb-8">
              Discover hidden gems, local artisans, and the best street food in your neighborhood that you won't find on regular maps.
            </p>

            {/* LOGIN I'M CUSTOMER BUTTON */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.04, backgroundColor: "#0b522c", boxShadow: "0px 15px 30px rgba(17, 122, 67, 0.25)" }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLoginClick}
                className="group relative inline-flex items-center gap-3 bg-[#117A43] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg transition-all overflow-hidden cursor-pointer"
              >
                <span className="relative z-10">Login I'm Customer</span>
                <svg className="relative z-10 group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* FEATURES CARDS SECTION */}
        <motion.div 
          animate={{ opacity: phase === "landing" ? 1 : 0, y: phase === "landing" ? 0 : 50 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-6xl mx-auto px-6 pb-24 w-full"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              whileHover={{ y: -8, boxShadow: "0px 20px 40px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm cursor-pointer"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-700 mb-6 transition-transform duration-300 transform group-hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Maximum Visibility</h3>
              <p className="text-gray-500 text-sm leading-relaxed">We ensure that even the smallest mobile carts and home-based businesses are discoverable by everyone.</p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -8, boxShadow: "0px 20px 40px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 mb-6 transition-transform duration-300 transform group-hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community Driven</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Our platform is built on real data from field contributors who understand the local landscape intimately.</p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -8, boxShadow: "0px 20px 40px rgba(0,0,0,0.08)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm cursor-pointer"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-700 mb-6 transition-transform duration-300 transform group-hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Economic Resilience</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Providing micro-entrepreneurs with digital tools to thrive in an increasingly tech-driven marketplace.</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ================= LAYER 2: OVERLAY BLUR 50% ================= */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-white/50 backdrop-blur-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ================= LAYER 3: FLOATING INTERACTIVE TEXT LAYER (Paling Depan) ================= */}
      <AnimatePresence>
        {phase === "loading" && (
          <motion.div 
            key="loading-text-layer"
            exit={{ opacity: 0, transition: { duration: 0.1, delay: 1.5 } }} // Keep wrapper alive during layout transition
            className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              layoutId="shared-main-title"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center"
            >
              {/* Baris Teks 1: Hi There */}
              <div className="flex overflow-hidden pb-2">
                {textLine1.map((char, i) => (
                  <motion.span
                    key={`l1-${i}`}
                    variants={letterVariants}
                    className="text-6xl md:text-8xl font-black text-gray-900 tracking-tight"
                    style={{ display: char === " " ? "inline" : "inline-block" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </div>

              {/* Baris Teks 2: Welcome */}
              <div className="flex overflow-hidden">
                {textLine2.map((char, i) => (
                  <motion.span
                    key={`l2-${i}`}
                    variants={letterVariants}
                    className="text-6xl md:text-8xl font-black text-[#0E6C3B] tracking-tight"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= LAYER 4: FULL SCREEN PAGE TRANSITION BUTTON ================= */}
      <AnimatePresence>
        {phase === "transitioning" && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 220 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bg-[#117A43] rounded-full pointer-events-none z-[100]"
            style={{ 
              top: clickPos.y, 
              left: clickPos.x,
              width: '20px',
              height: '20px',
              translateX: '-50%',
              translateY: '-50%',
              transformOrigin: 'center center'
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
