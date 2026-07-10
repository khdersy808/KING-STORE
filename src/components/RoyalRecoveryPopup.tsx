import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Copy, Check, X, Crown, Gift } from 'lucide-react';

interface RoyalRecoveryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  promoCode: string;
  onShowToast?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export default function RoyalRecoveryPopup({
  isOpen,
  onClose,
  promoCode,
  onShowToast
}: RoyalRecoveryPopupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      if (onShowToast) {
        onShowToast('تم نسخ الكود! 📋', 'تم نسخ كود الخصم الملكي بنجاح إلى الحافظة.', 'success');
      }
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="royal-recovery-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            id="royal-recovery-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            id="royal-recovery-card"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-amber-400 bg-slate-900 text-right text-white shadow-2xl shadow-amber-500/10 p-8 space-y-6"
            dir="rtl"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-purple-600/30 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              id="royal-recovery-close"
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors cursor-pointer border border-slate-700/50"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Royal Header */}
            <div className="text-center space-y-3 relative">
              <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-600 to-amber-500 rounded-2xl shadow-lg shadow-purple-500/25 relative">
                <Crown className="h-8 w-8 text-white animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-400 via-amber-200 to-purple-400 bg-clip-text text-transparent tracking-wide">
                اشتقنا لملكنا! 👑
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-md mx-auto leading-relaxed">
                أهلاً وسهلاً بعودتك المظفرة يا صاحب الجلالة إلى عرشك في <span className="text-amber-400 font-black">KING STORE</span>. تقديراً لولائك الثمين وتأكيداً على مكانتك الغالية، نرحب بك بهدية ملكية تليق بمقامك!
              </p>
            </div>

            {/* Stylized Coupon Card */}
            <div className="border border-amber-400/30 bg-gradient-to-br from-purple-950/40 to-slate-950 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center justify-center space-y-4">
              <div className="absolute top-1/2 left-0 w-4 h-8 bg-slate-900 rounded-r-full -translate-y-1/2 border-r border-amber-400/30" />
              <div className="absolute top-1/2 right-0 w-4 h-8 bg-slate-900 rounded-l-full -translate-y-1/2 border-l border-amber-400/30" />
              
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/25">
                <Gift className="h-3.5 w-3.5" />
                <span>عرض تنشيط الولاء الملكي الخاص</span>
              </div>

              <div className="text-center">
                <span className="text-4xl font-black bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent block">خصم 10%</span>
                <span className="text-[10px] text-slate-400 font-bold block mt-1">على كافة مشتريات سلتك القادمة بدون حد أدنى</span>
              </div>

              {/* Coupon Code Block */}
              <div className="w-full flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="font-mono text-base font-black text-amber-400 tracking-wider select-all px-2">
                  {promoCode}
                </span>
                <button
                  id="royal-recovery-copy"
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md shadow-amber-400/10'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>نسخ الكود</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expiry / Security Note */}
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span>تم ربط هذا الكود بحسابك بأمان ويسري لمدة 30 يوماً من اليوم.</span>
              </p>
            </div>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="royal-recovery-store"
                onClick={onClose}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 via-purple-700 to-amber-500 text-white rounded-xl text-sm font-black shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25 hover:scale-[1.01] transition-all cursor-pointer text-center"
              >
                انطلق للتسوق واستخدم الكود 🛒
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
