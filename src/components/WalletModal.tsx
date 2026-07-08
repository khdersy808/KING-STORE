/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Crown, Copy, ExternalLink, Sparkles, Wallet, Gift, Coins, LogIn, ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { db, convertPointsToCoupons } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  showToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
}

export default function WalletModal({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  showToast,
}: WalletModalProps) {
  if (!isOpen) return null;

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const isDeviceAlreadyUsed = async (deviceId: string): Promise<boolean> => {
    if (!deviceId) return false;
    try {
      const usersColl = collection(db, 'users');
      const deviceQuery = query(usersColl, where('deviceId', '==', deviceId));
      const querySnapshot = await getDocs(deviceQuery);
      return !querySnapshot.empty;
    } catch (err) {
      console.error("Error checking deviceId in Firestore:", err);
      return false;
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;

    const trimmedCode = inputReferralCode.trim().toUpperCase();
    if (!trimmedCode) {
      showToast('خطأ', 'يرجى إدخال كود إحالة صالح ⚠️', 'warning');
      return;
    }

    if (trimmedCode === currentUser.referralCode?.toUpperCase()) {
      showToast('عملية غير صالحة', 'لا يمكنك استخدام كود الإحالة الخاص بك! ❌', 'warning');
      return;
    }

    setIsApplying(true);
    try {
      // Query the database to find the user who owns this referralCode
      const usersColl = collection(db, 'users');
      const refQuery = query(usersColl, where('referralCode', '==', trimmedCode));
      const querySnapshot = await getDocs(refQuery);

      if (querySnapshot.empty) {
        showToast('كود غير موجود', 'كود الإحالة المدخل غير صحيح أو غير موجود بالنظام ❌', 'warning');
        setIsApplying(false);
        return;
      }

      const referrerDoc = querySnapshot.docs[0];
      const referrerEmail = referrerDoc.id;
      const referrerData = referrerDoc.data();

      if (referrerEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        showToast('عملية غير صالحة', 'لا يمكنك استخدام كود الإحالة الخاص بك! ❌', 'warning');
        setIsApplying(false);
        return;
      }

      // Check if current user's device has already been used for a referral award to prevent fraud
      const deviceId = currentUser.deviceId || localStorage.getItem('kingstore_device_id') || '';
      let isUsed = false;
      if (deviceId) {
        isUsed = await isDeviceAlreadyUsed(deviceId);
      }

      // 1. Update Current User's profile in Firestore with referredBy & referralApplied
      const currentUserDocRef = doc(db, 'users', currentUser.email);
      await setDoc(currentUserDocRef, {
        referredBy: trimmedCode,
        referralApplied: true
      }, { merge: true });

      // 2. If the device has NOT been used for a referral, award 100 points to the referrer
      if (!isUsed) {
        const oldPoints = typeof referrerData.points === 'number' ? referrerData.points : 0;
        const currentCouponsList = Array.isArray(referrerData.coupons) ? referrerData.coupons : [];
        const newPoints = oldPoints + 100;

        await setDoc(doc(db, 'users', referrerEmail), {
          points: newPoints
        }, { merge: true });

        await convertPointsToCoupons(referrerEmail, newPoints, currentCouponsList);

        await addDoc(collection(db, 'notifications'), {
          userId: referrerEmail,
          title: 'نقاط إحالة جديدة! 👥🎁',
          message: `لقد حصلت على 100 كهدية لتسجيل صديقك (${currentUser.name}) باستخدام كود الإحالة الخاص بك!`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'system'
        });

        showToast('تم تطبيق الكود', 'تم ربط حسابك بالمحيل بنجاح وحصل على 100 نقطة مكافأة! 🎉🎁', 'success');
      } else {
        // Device is already used (fraud prevention)
        showToast('تم ربط الحساب', 'تم ربط حسابك بالمحيل بنجاح. (ملاحظة: تم حظر منح الـ 100 نقطة لتكرار استخدام نفس الجهاز لمنع الاحتيال) 🛡️', 'info');
      }

      setInputReferralCode('');
    } catch (error) {
      console.error("Error applying referral code inside wallet:", error);
      showToast('خطأ بالنظام', 'حدث خطأ أثناء تطبيق كود الإحالة. يرجى المحاولة لاحقاً ❌', 'warning');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = (text: string, title: string, message: string) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      success = true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        success = true;
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      textArea.remove();
    }
    
    if (success) {
      showToast(title, message, 'success');
    } else {
      showToast('خطأ بالنسخ', 'يرجى تحديد الكود ونسخه يدوياً 📋', 'warning');
    }
  };

  const handleCopyCode = () => {
    if (currentUser?.referralCode) {
      handleCopy(currentUser.referralCode, 'تم النسخ', 'تم نسخ كود الإحالة بنجاح 📋');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (currentUser?.referralCode) {
      const shareUrl = window.location.origin + '/?ref=' + currentUser.referralCode;
      handleCopy(shareUrl, 'تم النسخ', 'تم نسخ رابط الإحالة المباشر ومشاركته مع الأصدقاء! 🔗');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCoupon = (couponCodeStr: string) => {
    handleCopy(couponCodeStr, 'تم نسخ الكوبون', `تم نسخ كود الخصم ${couponCodeStr} لاستخدامه بالسلة! 🏷️`);
    setCopiedCouponCode(couponCodeStr);
    setTimeout(() => setCopiedCouponCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-950 border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col animate-scale-up text-right">
        
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-md">
              <Wallet className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">محفظة الهدايا الملكية 🎁</h3>
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mt-0.5">Referral & Gift Wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {currentUser ? (
            // LOGGED IN VIEW
            <div className="space-y-6">
              
              {/* Profile Greeting */}
              <div className="flex items-center gap-3.5 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Crown className="h-6 w-6 text-slate-950 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1 mb-0.5">
                    {currentUser.role === 'admin' ? 'المدير الملكي' : 'عضو ملكي'}
                    <Sparkles className="h-3 w-3 animate-pulse" />
                  </span>
                  <h4 className="text-sm font-black text-white truncate">{currentUser.name}</h4>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Box 1: Points balance */}
                <div className="bg-slate-900/60 rounded-2xl border border-zinc-900 p-4.5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-400 block">رصيد نقاطك الملكي 👑</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-amber-500">{currentUser.points || 0}</span>
                      <span className="text-xs font-bold text-zinc-500">نقطة</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                      <span>الهدف: 1000 نقطة</span>
                      <span>{Math.min(100, Math.round(((currentUser.points || 0) / 1000) * 100))}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((currentUser.points || 0) / 1000) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] leading-relaxed text-zinc-500">
                      تتحول كل 1000 نقطة تلقائياً لقسيمة شراء بقيمة 1$.
                    </p>
                  </div>
                </div>

                {/* Box 2: Referral code details */}
                <div className="bg-slate-900/60 rounded-2xl border border-zinc-900 p-4.5 space-y-3">
                  <span className="text-xs font-bold text-zinc-400 block">كود الإحالة الخاص بك</span>
                  <div className="flex items-center justify-between bg-zinc-950 rounded-xl p-2.5 border border-zinc-850">
                    <span className="font-mono text-xs font-extrabold text-amber-400 tracking-wider">
                      {currentUser.referralCode || 'جاري التوليد...'}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopyCode}
                      className={`p-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                        copiedCode 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-transparent'
                      }`}
                      title="نسخ الكود"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copiedCode ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className={`w-full py-2.5 font-extrabold text-[11px] rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-md border ${
                      copiedLink
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 border-amber-300/30'
                    }`}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copiedLink ? (
                        <motion.div
                          key="copied"
                          className="flex items-center gap-1.5"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>تم نسخ رابط الدعوة الملكي بنجاح! 🎉</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          className="flex items-center gap-1.5"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>نسخ رابط الدعوة المباشر</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

              </div>

              {/* Referrer code entry (for users who haven't used one yet) */}
              <div className="bg-slate-900/40 border border-zinc-900 rounded-2xl p-4.5 space-y-3">
                <span className="text-xs font-bold text-zinc-350 flex items-center gap-1.5">
                  <Gift className="h-4 w-4 text-amber-500" />
                  إدخال كود المحيل (متاح مرة واحدة) 👤🎁
                </span>
                
                {currentUser.referralApplied || currentUser.referredBy ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 stroke-[3]" />
                    <span>لقد قمت بربط حسابك بكود المحيل: <strong className="font-mono text-white tracking-wider bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{currentUser.referredBy}</strong> بنجاح!</span>
                  </div>
                ) : (
                  <form onSubmit={handleApplyReferral} className="space-y-2">
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      إذا قام صديقك بدعوتك للمتجر ولم تستخدم كود إحالة أثناء التسجيل، يمكنك إدخاله هنا لربطه بحسابك ودعمه بالنقاط.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مثال: KING-XXXXXX"
                        value={inputReferralCode}
                        onChange={(e) => setInputReferralCode(e.target.value)}
                        disabled={isApplying}
                        className="flex-1 rounded-xl border border-zinc-850 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none disabled:opacity-50 text-right uppercase font-mono tracking-wider"
                      />
                      <button
                        type="submit"
                        disabled={isApplying || !inputReferralCode.trim()}
                        className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 text-xs font-black transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                      >
                        {isApplying ? 'جاري التطبيق...' : 'تطبيق الكود'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Informative Step banner */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-amber-400 block">كيف يعمل نظام الإحالة الفيروسي؟ 🚀</span>
                <p className="text-[11px] leading-relaxed text-zinc-400 font-medium">
                  عند قيام مستخدم جديد بالتسجيل في متجرنا باستخدام رابط أو كود الإحالة الخاص بك، ستحصل فوراً على <strong className="text-amber-400">100 نقطة</strong> هدية! وعند وصولك لـ 1000 نقطة، يتم استبدالها تلقائياً بكوبون $1 متاح للاستخدام في سلتك.
                </p>
              </div>

              {/* Earned Coupons */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-300">القسائم الملكية المكتسبة ($1 Coupons) 🏷️</span>
                </div>
                
                {!currentUser.coupons || currentUser.coupons.length === 0 ? (
                  <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                      لا توجد قسائم نشطة في محفظتك الملكية حالياً. شارك رابط الإحالة لربح قسائم خصم فورية بقيمة 1$!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto">
                    {currentUser.coupons.map((couponCodeStr, index) => (
                      <div
                        key={`${couponCodeStr}_${index}`}
                        className="relative bg-zinc-900 border border-emerald-500/10 rounded-xl p-3.5 flex items-center justify-between overflow-hidden shadow-md text-right"
                      >
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-r border-zinc-850 rounded-full" />
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-950 border-l border-zinc-850 rounded-full" />
                        
                        <div className="space-y-1 pl-4 pr-3">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black text-emerald-400">
                            خصم $1.00 ثابت
                          </span>
                          <h5 className="font-mono text-[10px] font-bold text-zinc-300 tracking-wider">
                            {couponCodeStr}
                          </h5>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleCopyCoupon(couponCodeStr)}
                          className={`rounded-lg border text-[9px] font-bold px-2.5 py-1.5 cursor-pointer transition-all duration-300 shrink-0 ${
                            copiedCouponCode === couponCodeStr
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'bg-zinc-950 hover:bg-emerald-500 hover:text-slate-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {copiedCouponCode === couponCodeStr ? 'تم النسخ! 🏷️' : 'نسخ واستعمال'}
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            // GUEST VIEW
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
                <Gift className="h-8 w-8 text-amber-400 stroke-[1.5]" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white">انضم لنظام الإحالة الفيروسي الملكي! 👑</h4>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto font-medium">
                  هل ترغب في الحصول على كوبونات خصم مجانية بقيمة 1$؟
                  سجل معنا الآن لتوليد كود الإحالة الخاص بك ومشاركته مع الأصدقاء. ستحصل على <strong className="text-amber-400">100 نقطة</strong> مقابل كل صديق يسجل في المتجر، وعند تجميع 1000 نقطة ستحصل تلقائياً على قسيمة خصم مخصصة!
                </p>
              </div>

              {/* Informative steps */}
              <div className="grid grid-cols-3 gap-2.5 text-right bg-zinc-900/30 p-4 rounded-2xl border border-zinc-900">
                <div className="text-center space-y-1">
                  <div className="text-amber-400 font-black text-sm">1. سجل حسابك</div>
                  <p className="text-[9px] text-zinc-500">احصل على كود فريد فوراً بعد التسجيل</p>
                </div>
                <div className="text-center space-y-1 border-x border-zinc-800">
                  <div className="text-amber-400 font-black text-sm">2. شارك الرابط</div>
                  <p className="text-[9px] text-zinc-500">احصل على 100 نقطة لكل تسجيل جديد</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-amber-400 font-black text-sm">3. اربح مجاناً</div>
                  <p className="text-[9px] text-zinc-500">احصل على قسيمة بقيمة 1$ تلقائياً</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>تسجيل الدخول أو إنشاء حساب الآن 👑</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 text-center">
          <button
            onClick={onClose}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            إغلاق المحفظة
          </button>
        </div>

      </div>
    </div>
  );
}
