/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, User, PaymentGateway } from '../types';
import { 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar, 
  MapPin, 
  CreditCard,
  ExternalLink,
  Package,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { db, collection, query, where, onSnapshot } from '../lib/firebase';
import OrderTrackingStepper from './OrderTrackingStepper'; // I will create this simple one

interface MyOrdersProps {
  currentUser: User;
  gateways: PaymentGateway[];
  onBack: () => void;
}

export default function MyOrders({ currentUser, gateways, onBack }: MyOrdersProps) {
  const { t, dir } = useLanguage();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser.email) return;

    const q = query(
      collection(db, 'orders'),
      where('customerEmail', '==', currentUser.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort by date descending
      ordersData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setOrders(ordersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching my orders:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.email]);

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8" dir={dir}>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
            >
              {dir === 'rtl' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>طلباتي الملكية</span>
                <span className="p-1 bg-amber-500 text-white rounded-lg">👑</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">تتبع رحلة مشترياتك الفاخرة خطوة بخطوة.</p>
            </div>
          </div>
          
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="ابحث برقم الطلب أو المنتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-sm font-black text-slate-500 animate-pulse">جاري استرجاع سجلاتك الملكية...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">لا توجد طلبات مسجلة حالياً</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">لم تقم بإجراء أي عمليات شراء بعد. ابدأ رحلة التسوق الآن واستمتع بالفخامة!</p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              اكتشف المتجر الملكي 🛍️
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-amber-500/30 transition-all group">
                {/* Order Summary Header */}
                <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                      <Package className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 font-mono">#{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                          order.status === 'delivered' || order.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : order.status === 'cancelled'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {order.status === 'pending' ? 'قيد المراجعة' :
                           order.status === 'processing' ? 'جاري التجهيز' :
                           order.status === 'shipping' ? 'جاري الشحن' :
                           order.status === 'delivered' ? 'تم التسليم' :
                           order.status === 'completed' ? 'مكتمل' : 'ملغي'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.date).toLocaleDateString('ar-EG')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <CreditCard className="h-3 w-3" />
                          {gateways.find(g => g.id === order.paymentMethodId)?.name || 'دفع الكتروني'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-black block">إجمالي القيمة</span>
                    <span className="text-xl font-black text-slate-900">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Tracking Stepper Section */}
                <div className="p-6 md:px-12 bg-white">
                  <OrderTrackingStepper status={order.status} />
                </div>

                {/* Items & Footer */}
                <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-wrap gap-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                          {item.quantity}x
                        </div>
                        <span className="text-xs font-bold text-slate-700">{item.productName}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {order.shippingAddress && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-[10px] font-black text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="max-w-[120px] truncate">{order.shippingAddress}</span>
                      </div>
                    )}
                    <button 
                      className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                      title="عرض التفاصيل الكاملة"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
