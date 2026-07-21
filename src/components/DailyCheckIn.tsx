import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, CheckCircle, Clock, Gift, Coins, Loader2 } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';

interface DailyCheckInProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onShowToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
  onUpdateUser: (user: User) => void;
  rewardsConfig: { [key: string]: number };
}

export const DailyCheckIn: React.FC<DailyCheckInProps> = memo(({
  currentUser,
  onOpenAuth,
  onShowToast,
  onUpdateUser,
  rewardsConfig
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeToNext, setTimeToNext] = useState<string>('');
  
  // Track the last claimed points to display in the modal accurately
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(10);

  // Local optimistic state
  const [localCheckedIn, setLocalCheckedIn] = useState(false);

  const getTodayString = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const getYesterdayString = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayStr = useMemo(() => getTodayString(), [getTodayString]);
  
  // Sync local check-in state with currentUser
  useEffect(() => {
    if (currentUser) {
      setLocalCheckedIn(currentUser.lastCheckInDate === todayStr);
    } else {
      setLocalCheckedIn(false);
    }
  }, [currentUser?.lastCheckInDate, currentUser?.email, todayStr]);

  const hasCheckedInToday = localCheckedIn;

  // Calculate countdown to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeToNext(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine what the potential next streak day and points will be
  const getNextStreakDay = () => {
    if (!currentUser) return 1;
    const yesterdayStr = getYesterdayString();
    if (currentUser.lastCheckInDate === yesterdayStr) {
      const next = (currentUser.checkInStreak || 0) + 1;
      return next > 7 ? 1 : next;
    }
    return 1;
  };

  const nextStreakDay = getNextStreakDay();
  const nextEarnedPoints = rewardsConfig[`day${nextStreakDay}`] || 10;

  const handleCheckIn = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (hasCheckedInToday || isProcessing) return;

    setIsProcessing(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.id);

      const yesterdayStr = getYesterdayString();
      const currentStreak = currentUser.checkInStreak || 0;
      
      let newStreak = 1;
      if (currentUser.lastCheckInDate === yesterdayStr) {
        newStreak = (currentStreak % 7) + 1;
      }

      const addedPoints = rewardsConfig[`day${newStreak}`] || 10;
      const currentPoints = currentUser.points || 0;

      const updatedUser: User = {
        ...currentUser,
        points: currentPoints + addedPoints,
        lastCheckInDate: todayStr,
        checkInStreak: newStreak,
        updatedAt: new Date().toISOString()
      };

      setLastEarnedPoints(addedPoints);
      
      // Optimistic update
      setLocalCheckedIn(true);
      onUpdateUser(updatedUser);

      await updateDoc(userDocRef, {
        points: currentPoints + addedPoints,
        lastCheckInDate: todayStr,
        checkInStreak: newStreak,
        updatedAt: new Date().toISOString()
      });

      setShowCelebration(true);
      onShowToast(
        '🏆 تهانينا الحارة!',
        `تم تسجيل حضورك اليومي (اليوم ${newStreak} متتالي). حصلت على ${addedPoints} نقاط ملكية!`,
        'success'
      );

      setTimeout(() => setShowCelebration(false), 5000);

    } catch (error: any) {
      console.error("Check-in error:", error);
      setLocalCheckedIn(false);
      onShowToast('حدث خطأ', 'يرجى المحاولة لاحقاً', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  // 7-day visualization setup (dynamic values based on configuration)
  const daysOfStreak = [
    { label: 'اليوم ١', points: `+${rewardsConfig.day1}` },
    { label: 'اليوم ٢', points: `+${rewardsConfig.day2}` },
    { label: 'اليوم ٣', points: `+${rewardsConfig.day3}` },
    { label: 'اليوم ٤', points: `+${rewardsConfig.day4}` },
    { label: 'اليوم ٥', points: `+${rewardsConfig.day5}` },
    { label: 'اليوم ٦', points: `+${rewardsConfig.day6}` },
    { label: 'اليوم ٧', points: `👑 +${rewardsConfig.day7}`, isSpecial: true }
  ];

  const currentStreak = currentUser?.checkInStreak || 0;
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-2" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        {/* Mirroring Policies Header style */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          
          {/* Right Section: Info & Title */}
          <div className="text-right space-y-2 flex-1 w-full">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-600 border border-amber-100">
              <Crown className="h-3.5 w-3.5" />
              <span>نظام الولاء والمكافآت الملكية</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>الجوائز اليومية المتتالية</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed font-semibold">
              سجل حضورك اليومي بانتظام لتكسب نقاط محفظة مضافة كل يوم. عند إتمام حضور 7 أيام متتالية ستحظى بترقية استثنائية وجائزة كبرى!
            </p>
          </div>

          {/* Left Section: Active Button & Stats */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
            {currentUser ? (
              <div className="text-center sm:text-left space-y-1 sm:ml-4 shrink-0">
                <div className="text-[11px] text-slate-400 font-bold">سلسلة حضورك الحالية:</div>
                <div className="text-lg font-black text-slate-900 flex items-center justify-center sm:justify-start gap-1">
                  <span>{currentStreak} من 7 أيام</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {localCheckedIn ? (
                <div
                  key="checked-in"
                  className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-1.5"
                >
                  <button
                    disabled
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 font-black px-6 py-3.5 text-xs select-none"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>تم استلام جائزة اليوم بنجاح ✓</span>
                  </button>
                  <div className="text-[10px] text-slate-400 font-mono text-center sm:text-left flex items-center justify-center sm:justify-end gap-1 font-bold">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>الجائزة التالية خلال: {timeToNext}</span>
                  </div>
                </div>
              ) : (
                <button
                  key="claim-btn"
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3.5 text-xs transition-all cursor-pointer shadow-md shadow-amber-500/10 border border-amber-400"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      <span>سجل حضورك اليومي (+{nextEarnedPoints} نقاط) 🎁</span>
                    </>
                  )}
                </button>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* 7-Day Streak Row Visual - Simplified White Style */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {daysOfStreak.map((day, index) => {
              const isCompleted = index < currentStreak;
              const isCurrent = index === currentStreak && !hasCheckedInToday;
              
              return (
                <div
                  key={`streak-day-${index}`}
                  className={`relative flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-300 ${
                    isCompleted
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : isCurrent
                      ? 'bg-white border-amber-400 text-amber-600 shadow-sm'
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold block truncate max-w-full">
                    {day.label}
                  </span>

                  <div className="my-1.5 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : day.isSpecial ? (
                      <Crown className={`h-4 w-4 ${isCurrent ? 'text-amber-500' : 'text-slate-300'}`} />
                    ) : (
                      <Coins className={`h-3.5 w-3.5 ${isCurrent ? 'text-amber-500' : 'text-slate-300'}`} />
                    )}
                  </div>

                  <span className={`text-[8px] font-mono tracking-wider uppercase block font-black ${
                    isCompleted ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {day.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Celebration Alert Modal - Simplified Style */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-md w-full rounded-[2.5rem] border border-slate-200 bg-white p-8 text-center shadow-2xl space-y-6"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                <Crown className="h-10 w-10 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black text-slate-900">
                  تم الحضور بنجاح! 👑
                </h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  شكراً لزيارتك المستمرة لمتجر ملوك الطائفة. تم إضافة مكافأتك فورياً إلى رصيدك الملكي.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-around">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">الجائزة:</span>
                  <span className="text-sm font-black text-amber-600">+{lastEarnedPoints} نقطة</span>
                </div>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">السلسلة:</span>
                  <span className="text-sm font-black text-slate-900">{currentUser?.checkInStreak || 1} أيام</span>
                </div>
              </div>

              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-4 rounded-2xl bg-slate-950 text-white font-black text-sm hover:bg-slate-800 transition-all cursor-pointer shadow-xl shadow-slate-950/10"
              >
                تأكيد ومتابعة التسوق 👑
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
});
