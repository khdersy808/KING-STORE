import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Clock, CheckCircle2, XCircle, Package, ArrowRight, MessageCircle } from 'lucide-react';
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase';
import { CustomProductRequest, User } from '../types';

interface UserCustomRequestsProps {
  currentUser: User;
  onBack: () => void;
}

export const UserCustomRequests: React.FC<UserCustomRequestsProps> = ({ currentUser, onBack }) => {
  const [requests, setRequests] = useState<CustomProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'custom_requests'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CustomProductRequest[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CustomProductRequest);
      });
      // Sort in memory by timestamp descending
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRequests(list);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching user custom requests:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
      case 'قيد المراجعة':
        return { 
          label: 'قيد المراجعة ⏳', 
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          icon: Clock
        };
      case 'secured':
      case 'تم التوفير':
        return { 
          label: 'تم تأمين المنتج ✅', 
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          icon: Package
        };
      case 'available':
        return { 
          label: 'متاح للطلب الآن 👑', 
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          icon: CheckCircle2
        };
      case 'cancelled':
      case 'ملغى':
        return { 
          label: 'تم إلغاء الطلب ❌', 
          color: 'bg-red-500/10 text-red-500 border-red-500/20',
          icon: XCircle
        };
      default:
        return { 
          label: status, 
          color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
          icon: Sparkles
        };
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-500">
            <Sparkles className="h-4 w-4" />
            <span>طلباتك الملكية الخاصة 👑</span>
          </div>
          <h3 className="text-3xl font-black text-white tracking-wide drop-shadow-sm">متابعة طلبات المنتجات المخصصة</h3>
          <p className="text-sm text-slate-500 font-medium">
            هنا يمكنك تتبع حالة المنتجات التي طلبت توفيرها بشكل خاص. سيقوم فريقنا بتحديث الحالة فور تأمين المنتج.
          </p>
        </div>
        
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 self-start md:self-center"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للمتجر</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold">جاري تحميل طلباتك الملكية...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-600">
            <Package className="h-10 w-10 opacity-20" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-white">لا توجد طلبات حالية</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              لم تقم بإرسال أي طلب لمنتج مخصص حتى الآن. يمكنك إرسال طلبك من خلال القسم المخصص في الصفحة الرئيسية!
            </p>
          </div>
          <button
            onClick={onBack}
            className="bg-amber-500 text-slate-950 px-8 py-3 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            تصفح المتجر واطلب الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((req) => {
            const statusInfo = getStatusInfo(req.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-950/40 border border-slate-800 rounded-[2rem] overflow-hidden group hover:border-purple-500/30 transition-all duration-500"
              >
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Image Side */}
                  <div className="w-full sm:w-40 h-48 sm:h-auto relative overflow-hidden bg-slate-900 shrink-0">
                    <img 
                      src={req.imageUrl} 
                      alt="المنتج المطلوب" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent sm:hidden" />
                  </div>

                  {/* Content Side */}
                  <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusInfo.color} text-[10px] font-black`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusInfo.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(req.timestamp).toLocaleDateString('ar-EG')}
                        </span>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <span className="text-[9px] font-black text-purple-400 block mb-1 uppercase tracking-widest">مواصفات الطلب:</span>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed line-clamp-3">
                          {req.description}
                        </p>
                      </div>
                    </div>

                    {(req.status === 'available' || req.status === 'secured') && (
                      <button 
                        onClick={() => window.open('https://wa.me/message/YOUR_WA_LINK', '_blank')}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:brightness-110 transition-all active:scale-95"
                      >
                        <MessageCircle className="h-4 w-4" />
                        تواصل لإتمام الشراء
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
};
