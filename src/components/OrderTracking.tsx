import React, { useState } from 'react';
import { Search, MapPin, Truck, Calendar, ShoppingBag, Clock, CheckCircle2, AlertCircle, FileText, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Order, PaymentGateway } from '../types';
import PaymentReceipt from './PaymentReceipt';

interface OrderTrackingProps {
  orders: Order[];
  gateways: PaymentGateway[];
  onBackToStore: () => void;
}

export default function OrderTracking({ orders, gateways, onBackToStore }: OrderTrackingProps) {
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setHasSearched(true);

    const cleanId = searchOrderId.trim().toUpperCase();
    if (!cleanId) {
      setSearchError('يرجى كتابة رقم الطلب أولاً.');
      setSearchedOrder(null);
      return;
    }

    const cleanNumericId = cleanId.replace('ORD-', '');

    const foundOrder = orders.find(o => {
      const orderIdUpper = o.id.toUpperCase();
      const orderIdNumeric = orderIdUpper.replace('ORD-', '');
      return orderIdUpper === cleanId || 
             orderIdUpper === `ORD-${cleanId}` || 
             orderIdNumeric === cleanId ||
             orderIdNumeric === cleanNumericId;
    });

    if (foundOrder) {
      setSearchedOrder(foundOrder);
    } else {
      setSearchedOrder(null);
      setSearchError(`لم يتم العثور على أي طلب بالرقم المذكور (${cleanId}). يرجى التحقق من الرقم والمحاولة مجدداً.`);
    }
  };

  const handleQuickSelect = (orderId: string) => {
    setSearchOrderId(orderId);
    const cleanId = orderId.toUpperCase();
    const cleanNumericId = cleanId.replace('ORD-', '');
    
    const foundOrder = orders.find(o => {
      const oIdUpper = o.id.toUpperCase();
      const oIdNumeric = oIdUpper.replace('ORD-', '');
      return oIdUpper === cleanId || 
             oIdUpper === `ORD-${cleanId}` || 
             oIdNumeric === cleanId ||
             oIdNumeric === cleanNumericId;
    });

    if (foundOrder) {
      setSearchedOrder(foundOrder);
      setHasSearched(true);
      setSearchError('');
    }
  };

  // Determine status steps and progress
  const getStatusStep = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 3;
      case 'cancelled': return -1;
      case 'pending': default: return 1;
    }
  };

  const activeStep = searchedOrder ? getStatusStep(searchedOrder.status) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 font-sans text-slate-800" dir="rtl">
      
      {/* Back Button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold shadow-sm transition-all hover:bg-slate-50 text-slate-700 cursor-pointer"
        >
          <ArrowRight className="h-4 w-4 text-slate-500" />
          <span>العودة للتسوق</span>
        </button>
        <span className="text-xs text-slate-400 font-semibold">تتبع فوري ومباشر 👑</span>
      </div>

      {/* Hero Headline */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-600">
          <Truck className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>تتبع بوابات التحصيل والطلبات</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          تتبع طلبك الملكي الخاص بـ KING STORE
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          أدخل رقم الطلب الخاص بك (ORD-XXXXX) الذي تلقيته بعد إتمام الدفع لمشاهدة حالة معالجة الحوالة وتأكيد الإيصال وخطوات التسليم الفورية.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* RIGHT COLUMN: Search form & Timeline tracker */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Search card */}
          <div className="bg-slate-950 border border-amber-500/20 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3.5">
              <Search className="h-4 w-4" />
              <span>البحث السريع عن حالة الطلب</span>
            </h3>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: ORD-12345 أو 12345"
                  value={searchOrderId || ""}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3.5 pr-4 pl-24 text-sm text-white placeholder-zinc-500 font-mono font-bold tracking-widest uppercase focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="absolute left-2 top-2 bottom-2 rounded-lg bg-amber-500 px-5 text-xs font-black text-slate-950 hover:bg-amber-400 active:scale-97 transition-all cursor-pointer shadow-md"
                >
                  استعلام 🔍
                </button>
              </div>
            </form>

            {/* Support / Quick access links for testing */}
            {orders.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <span className="block text-[10px] text-slate-400 font-bold">طلبات جاهزة للتجربة والاختبار الفوري:</span>
                <div className="flex flex-wrap gap-2">
                  {orders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleQuickSelect(o.id)}
                      className="text-[10px] font-mono bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CornerDownLeft className="h-2.5 w-2.5 shrink-0" />
                      <span>{o.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Timeline Status Tracker */}
          {searchedOrder ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>مخطط حالة الطلب: #{searchedOrder.id}</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">تحديث مباشر</span>
              </div>

              {activeStep === -1 ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-black block">عذراً، تم إلغاء هذا الطلب ❌</span>
                    <p className="text-[11px] leading-relaxed text-red-600">
                      تم إلغاء الطلب أو رفض تحصيل الحوالة نظراً لعدم تطابق إيصال الدفع مع بوابات التحصيل. يرجى التواصل مع فريق الدعم الفني الملكي عبر واتساب أو تليجرام لحل الإشكال فوراً.
                    </p>
                  </div>
                </div>
              ) : (
                /* Stepper UI */
                <div className="relative pl-2 pt-2 space-y-8">
                  {/* Vertical Connection Line */}
                  <div className="absolute right-[15px] top-4 bottom-4 w-0.5 bg-slate-100 pointer-events-none"></div>

                  {/* Step 1 */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      activeStep >= 1 
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-md shadow-amber-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${activeStep >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                        تم إرسال الطلب وقيد المراجعة ⏳
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        تم استلام الطلب من نظام المتجر بنجاح وهو الآن بانتظار مراجعة طاقم KING STORE للتأكد من وصول العملية لـ <strong>{gateways.find(g => g.id === searchedOrder.paymentMethodId)?.name || searchedOrder.paymentMethodId}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      searchedOrder.status === 'completed' || searchedOrder.status === 'processing' || activeStep >= 2
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-md shadow-amber-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${searchedOrder.status === 'completed' || searchedOrder.status === 'processing' || activeStep >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                        قيد التجهيز والتأصيل الفني 📦
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        جاري تجهيز المنتجات المطلوبة وتوليد الأكواد والتراخيص الفورية للطلبات الرقمية، أو حزم وشحن الطرود للمنتجات المادية.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      searchedOrder.status === 'completed' || activeStep >= 3
                        ? 'bg-emerald-500 text-white border-emerald-500 font-extrabold shadow-md shadow-emerald-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${searchedOrder.status === 'completed' || activeStep >= 3 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        تم التوصيل ومكتمل بنجاح ✅
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        اكتمل الطلب وصار جاهزاً! تم تسليم التراخيص الرقمية على البريد الإلكتروني للعميل، أو تم تزويد شركة الشحن بالطرد للتوصيل المنزلي السريع.
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : hasSearched ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">عذراً، لم نتمكن من إيجاد طلبك</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
                {searchError || 'يرجى مراجعة رقم الطلب المدخل بدقة. تأكد من كتابة الرقم كاملاً مثل ORD-54321.'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Truck className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">تتبع الحوالة المالية فوري ومباشر</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                أدخل رقم الحوالة أو معرف الطلب الخاص بك بالأعلى لعرض تفاصيل الإيصال وتأكيد الإدارة خطوة بخطوة.
              </p>
            </div>
          )}

        </div>

        {/* LEFT COLUMN: Payment Receipt display */}
        <div className="lg:col-span-5">
          {searchedOrder ? (
            <div className="space-y-4">
              <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center">إيصال الدفع الرقمي التفصيلي</span>
              <PaymentReceipt
                order={searchedOrder}
                gateway={gateways.find(g => g.id === searchedOrder.paymentMethodId)}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center py-12 space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-400">بانتظار الاستعلام</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                سيتم توليد وعرض إشعار التحصيل الفخم المعتمد لـ KING STORE هنا مباشرة بعد العثور على الطلب.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
