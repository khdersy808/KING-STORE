import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles } from 'lucide-react';

export const WelcomeSplash: React.FC = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-[#020617] overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 0.95, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="p-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_50px_rgba(245,158,11,0.3)] border border-amber-300/30"
          >
            <Crown className="h-16 w-16 text-slate-950" strokeWidth={2.5} />
          </motion.div>
          
          <motion.div
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 text-amber-400"
          >
            <Sparkles className="h-8 w-8" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-amber-500 mb-2">
            KING STORE
          </h1>
          <div className="flex flex-col items-center gap-4">
            <p className="text-amber-500 font-bold tracking-[0.3em] text-xs uppercase">
              The Royal Marketplace
            </p>
            
            <div className="mt-12 flex flex-col items-center gap-3">
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
                />
              </div>
              <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest">
                Preparing your royal experience{dots}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Aesthetic Bottom Accents */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-30">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500" />
        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.5em]">Authentic & Premium</span>
        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500" />
      </div>
    </div>
  );
};
