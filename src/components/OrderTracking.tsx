import React, { useState } from 'react';
import { Search, MapPin, Truck, Calendar, ShoppingBag, Clock, CheckCircle2, AlertCircle, FileText, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Order, PaymentGateway } from '../types';
import PaymentReceipt from './PaymentReceipt';
import { useLanguage } from '../contexts/LanguageContext';

interface OrderTrackingProps {
  orders: Order[];
  gateways: PaymentGateway[];
  onBackToStore: () => void;
}

export default function OrderTracking({ orders, gateways, onBackToStore }: OrderTrackingProps) {
  const { t, language, dir } = useLanguage();
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  React.useEffect(() => {
    const tempId = localStorage.getItem('temp_search_order_id');
    if (tempId) {
      setSearchOrderId(tempId);
      localStorage.removeItem('temp_search_order_id');
      setHasSearched(true);
      const cleanId = tempId.trim().toUpperCase();
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
      }
    }
  }, [orders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setHasSearched(true);

    const cleanId = searchOrderId.trim().toUpperCase();
    if (!cleanId) {
      setSearchError(t('enterOrderIdFirst'));
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
      setSearchError(t('noOrderFoundWithId').replace('{id}', cleanId));
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
      case 'completed': 
      case 'delivered': return 4;
      case 'shipping': return 3;
      case 'processing': return 2;
      case 'pending': default: return 1;
      case 'cancelled': return -1;
    }
  };

  const activeStep = searchedOrder ? getStatusStep(searchedOrder.status) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 font-sans text-slate-800" dir={dir}>
      
      {/* Back Button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={onBackToStore}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold shadow-sm transition-all hover:bg-slate-50 text-slate-700 cursor-pointer"
        >
          {language === 'ar' ? <ArrowRight className="h-4 w-4 text-slate-500" /> : <ArrowLeft className="h-4 w-4 text-slate-500" />}
          <span>{t('backToShopping')}</span>
        </button>
        <span className="text-xs text-slate-400 font-semibold">{t('liveTracking')}</span>
      </div>

      {/* Hero Headline */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-600">
          <Truck className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>{t('trackGateways')}</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {language === 'ar' ? (
            <>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500 font-black">تتبع طلبك الملكي الخاص</span> بـ KING STORE
            </>
          ) : (
            <>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500 font-black">Track Your Royal Order</span> at KING STORE
            </>
          )}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          {t('trackOrderHeroDesc')}
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* RIGHT COLUMN: Search form & Timeline tracker */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Search card */}
          <div className="bg-slate-950 border border-amber-500/20 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full  -mr-10 -mt-10 pointer-events-none"></div>
            
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3.5">
              <Search className="h-4 w-4" />
              <span>{t('quickSearchStatus')}</span>
            </h3>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('orderIdPlaceholder')}
                  value={searchOrderId || ""}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-3.5 ${language === 'ar' ? 'pr-4 pl-24' : 'pl-4 pr-24'} text-sm text-white placeholder-zinc-500 font-mono font-bold tracking-widest uppercase focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400`}
                />
                <button
                  type="submit"
                  className={`absolute ${language === 'ar' ? 'left-2' : 'right-2'} top-2 bottom-2 rounded-lg bg-amber-500 px-5 text-xs font-black text-slate-950 hover:bg-amber-400 active:scale-97 transition-all cursor-pointer shadow-md`}
                >
                  {t('inquiry')}
                </button>
              </div>
            </form>

            {/* Support / Quick access links for testing */}
            {orders.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                <span className="block text-[10px] text-slate-400 font-bold">{t('readyForTesting')}</span>
                <div className="flex flex-wrap gap-2">
                  {orders.slice(0, 3).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleQuickSelect(o.id)}
                      className="text-[10px] font-mono bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CornerDownLeft className={`h-2.5 w-2.5 shrink-0 ${language === 'ar' ? '' : 'rotate-180'}`} />
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
                  <span>{t('orderStatusMap')} {searchedOrder.id}</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">{t('liveUpdate')}</span>
              </div>

              {activeStep === -1 ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-black block">{t('orderCancelled')}</span>
                    <p className="text-[11px] leading-relaxed text-red-600">
                      {t('orderCancelledDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Stepper UI */
                <div className="relative px-2 pt-2 space-y-8">
                  {/* Vertical Connection Line */}
                  <div className={`absolute ${language === 'ar' ? 'right-[15px]' : 'left-[15px]'} top-4 bottom-4 w-0.5 bg-slate-100 pointer-events-none`}></div>

                  {/* Step 1: Pending */}
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
                        {language === 'ar' ? 'قيد المراجعة 📝' : 'Reviewing Order'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {language === 'ar' ? 'طلبك الآن قيد المراجعة من قبل فريقنا الملكي للتأكد من تفاصيل الدفع.' : 'Your order is being reviewed by our royal team to verify payment details.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      activeStep >= 2
                        ? 'bg-blue-600 text-white border-blue-600 font-extrabold shadow-md shadow-blue-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${activeStep >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                        {language === 'ar' ? 'جاري التجهيز 📦' : 'Processing Order'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {language === 'ar' ? 'يتم الآن تجهيز منتجاتك وتغليفها بعناية فائقة لتصلك بأفضل حلة.' : 'Your products are being prepared and packaged with extreme care.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Shipping */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      activeStep >= 3
                        ? 'bg-purple-600 text-white border-purple-600 font-extrabold shadow-md shadow-purple-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${activeStep >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                        {language === 'ar' ? 'جاري الشحن 🚚' : 'On the Way'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {language === 'ar' ? 'طلبك الآن في طريقه إليك! ترقب اتصالاً من مندوب التوصيل قريباً.' : 'Your order is on its way! Expect a call from the delivery agent soon.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="relative flex gap-4 items-start">
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      activeStep >= 4
                        ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-md shadow-emerald-500/10' 
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className={`text-xs font-black block ${activeStep >= 4 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {language === 'ar' ? 'تم التسليم 🎉' : 'Delivered'}
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {language === 'ar' ? 'تهانينا! تم تسليم طلبك بنجاح. نأمل أن تنال منتجاتنا رضاك.' : 'Congratulations! Your order has been successfully delivered.'}
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
              <h4 className="text-xs font-bold text-slate-900">{t('orderNotFound')}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
                {searchError || t('orderNotFoundDesc')}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Truck className="h-6 w-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">{t('trackFinancialTransfer')}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                {t('trackFinancialTransferDesc')}
              </p>
            </div>
          )}

        </div>

        {/* LEFT COLUMN: Payment Receipt display */}
        <div className="lg:col-span-5">
          {searchedOrder ? (
            <div className="space-y-4">
              <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center">{t('detailedReceipt')}</span>
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
              <h4 className="text-xs font-bold text-slate-400">{t('waitingForInquiry')}</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                {t('waitingForInquiryDesc')}
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
