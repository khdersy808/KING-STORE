/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CartItem, PaymentGateway, Order, OrderItem, Product, User } from '../types';
import PaymentReceipt from './PaymentReceipt';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  MapPin,
  CreditCard,
  Smartphone,
  Wallet,
  Building,
  Truck,
  CheckCircle2,
  Download,
  Copy,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  enabledGateways: PaymentGateway[];
  onPlaceOrder: (order: Order) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  globalDiscount?: number;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  enabledGateways,
  onPlaceOrder,
  currentUser,
  onOpenAuth,
  globalDiscount = 0,
}: CartProps) {
  // Helper to get active product price with global discount
  const getProductPrice = (product: Product) => {
    if (globalDiscount && globalDiscount > 0) {
      return Math.round(product.price * (1 - globalDiscount / 100));
    }
    return product.price;
  };

  // Checkout states
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [gatewayFieldValues, setGatewayFieldValues] = useState<Record<string, string>>({});
  const [senderName, setSenderName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [zoomedQrUrl, setZoomedQrUrl] = useState<string | null>(null);

  // MTN Cash state variables
  const [mtnSenderName, setMtnSenderName] = useState<string>('');
  const [mtnPhone, setMtnPhone] = useState<string>('');
  const [mtnTransactionId, setMtnTransactionId] = useState<string>('');

  // Syriatel Cash state variables
  const [syriatelSenderName, setSyriatelSenderName] = useState<string>('');
  const [syriatelPhone, setSyriatelPhone] = useState<string>('');
  const [syriatelTransactionId, setSyriatelTransactionId] = useState<string>('');

  // Pre-populate user details if logged in
  React.useEffect(() => {
    if (currentUser) {
      setCustomerName(prev => prev || currentUser.name);
      setCustomerEmail(prev => prev || currentUser.email);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + getProductPrice(item.product) * item.quantity, 0);
  const hasPhysicalProducts = cartItems.some(item => item.product.type === 'physical');
  const hasDigitalProducts = cartItems.some(item => item.product.type === 'digital');

  // Filter out COD if we have ONLY digital items
  const applicableGateways = enabledGateways.filter(gw => {
    if (!hasPhysicalProducts && gw.id === 'cash_on_delivery') {
      return false; // Cash on delivery is not applicable for purely digital orders
    }
    return true;
  });

  // Handle gateway change
  const handleGatewaySelect = (gateway: PaymentGateway) => {
    setSelectedGatewayId(gateway.id);
    const initialFields: Record<string, string> = {};
    gateway.fields.forEach(f => {
      initialFields[f.key] = '';
    });
    setGatewayFieldValues(initialFields);
    setCheckoutError('');
    
    // Reset specific fields
    setSenderName('');
    setTransactionId('');
    setMtnSenderName('');
    setMtnPhone('');
    setMtnTransactionId('');
    setSyriatelSenderName('');
    setSyriatelPhone('');
    setSyriatelTransactionId('');
    setReceiptBase64(null);
    setReceiptFileName('');
  };

  const handleFieldChange = (key: string, value: string) => {
    setGatewayFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setCheckoutError('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت.');
      return;
    }
    
    setReceiptFileName(file.name);
    setCheckoutError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process checkout submission
  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setCheckoutError('يرجى ملء جميع البيانات الأساسية المطلوبة.');
      return;
    }

    if (hasPhysicalProducts && !shippingAddress.trim()) {
      setCheckoutError('يرجى كتابة عنوان الشحن والتوصيل للمنتجات الملموسة.');
      return;
    }

    if (!selectedGatewayId) {
      setCheckoutError('يرجى اختيار طريقة الدفع المناسبة.');
      return;
    }

    // Verify gateway fields
    const selectedGateway = applicableGateways.find(gw => gw.id === selectedGatewayId);
    if (selectedGateway) {
      if (selectedGateway.id !== 'cash_on_delivery') {
        if (selectedGateway.id === 'mtn_cash') {
          if (!mtnSenderName.trim()) {
            setCheckoutError('يرجى كتابة اسم المرسل الكامل (الاسم الثلاثي للزبون) لتأكيد الدفع.');
            return;
          }
          if (!mtnPhone.trim()) {
            setCheckoutError('يرجى كتابة رقم الهاتف المشترك بخدمة MTN Cash.');
            return;
          }
          if (!mtnTransactionId.trim()) {
            setCheckoutError('يرجى كتابة معرف العملية / رقم الحوالة لتأكيد الدفع.');
            return;
          }
        } else if (selectedGateway.id === 'syriatel_cash') {
          if (!syriatelSenderName.trim()) {
            setCheckoutError('يرجى كتابة اسم المرسل الكامل (الاسم الثلاثي للزبون) لتأكيد الدفع.');
            return;
          }
          if (!syriatelPhone.trim()) {
            setCheckoutError('يرجى كتابة رقم الهاتف المشترك بخدمة سيريتل كاش.');
            return;
          }
          if (!syriatelTransactionId.trim()) {
            setCheckoutError('يرجى كتابة معرف العملية / رقم الحوالة لتأكيد الدفع.');
            return;
          }
        } else {
          if (!senderName.trim()) {
            setCheckoutError('يرجى كتابة اسم المرسل الكامل لتأكيد الدفع.');
            return;
          }
          if (!transactionId.trim()) {
            setCheckoutError('يرجى كتابة معرف العملية / رقم الحوالة لتأكيد الدفع.');
            return;
          }
        }
        if (!receiptBase64) {
          setCheckoutError('يرجى رفع لقطة شاشة لإيصال التحويل لإتمام الطلب.');
          return;
        }
      }
    }

    // Generate simulated order
    const orderItems: OrderItem[] = cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: getProductPrice(item.product),
      quantity: item.quantity,
      type: item.product.type
    }));

    const finalSenderName = selectedGatewayId === 'mtn_cash' 
      ? mtnSenderName 
      : selectedGatewayId === 'syriatel_cash' 
        ? syriatelSenderName 
        : (selectedGatewayId !== 'cash_on_delivery' ? senderName : undefined);

    const finalTransactionId = selectedGatewayId === 'mtn_cash' 
      ? mtnTransactionId 
      : selectedGatewayId === 'syriatel_cash' 
        ? syriatelTransactionId 
        : (selectedGatewayId !== 'cash_on_delivery' ? transactionId : undefined);

    const finalPhoneNumber = selectedGatewayId === 'mtn_cash' 
      ? mtnPhone 
      : selectedGatewayId === 'syriatel_cash' 
        ? syriatelPhone 
        : undefined;

    const newOrder: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: hasPhysicalProducts ? shippingAddress : undefined,
      items: orderItems,
      totalAmount,
      paymentMethodId: selectedGatewayId,
      paymentDetails: {
        ...gatewayFieldValues,
        senderName: finalSenderName || '',
        transactionId: finalTransactionId || '',
        phoneNumber: finalPhoneNumber || '',
        gatewayName: selectedGateway?.name || selectedGatewayId
      },
      receiptUrl: receiptBase64 || undefined,
      status: 'pending', // All new orders are pending verification by Admin
      date: new Date().toISOString(),
      senderName: finalSenderName,
      transactionId: finalTransactionId
    };

    setCreatedOrder(newOrder);
    onPlaceOrder(newOrder);
    setStep('success');
    onClearCart();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const getGatewayIcon = (iconName: string, customIconUrl?: string) => {
    if (customIconUrl) {
      return <img src={customIconUrl} alt="أيقونة البوابة" className="h-5 w-5 object-contain rounded bg-white p-0.5 border" referrerPolicy="no-referrer" />;
    }
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="h-5 w-5" />;
      case 'Smartphone': return <Smartphone className="h-5 w-5" />;
      case 'Wallet': return <Wallet className="h-5 w-5" />;
      case 'Building': return <Building className="h-5 w-5" />;
      case 'Truck': return <Truck className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-modal="true" role="dialog" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 left-0 flex max-w-full pr-0 md:pr-10">
        <div className="w-screen max-w-lg transform bg-[#0F172AFF] text-white shadow-2xl transition-all flex flex-col h-full rounded-r-2xl border-r border-amber-500/20">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/10 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              {step === 'cart' && 'سلة المشتريات 🛒'}
              {step === 'checkout' && 'إتمام الدفع والطلب 💳'}
              {step === 'success' && 'تم الطلب بنجاح! 🎉'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Step 1: Cart Items */}
            {step === 'cart' && (
              <>
                {cartItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-4 ring-1 ring-amber-500/20">
                      <ShoppingBag className="h-8 w-8 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">سلتك فارغة تماماً</h3>
                    <p className="mt-1 text-xs text-amber-100/60 max-w-xs leading-relaxed">
                      تصفح المنتجات الفاخرة والمميزة المتوفرة في المتجر، وأضف ما يعجبك هنا.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
                    >
                      متابعة التسوق
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!currentUser && (
                      <div className="rounded-xl border border-red-950/40 bg-red-950/20 p-4 text-right">
                        <p className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 justify-start">
                          <Lock className="h-3.5 w-3.5 text-red-400" />
                          <span>الشراء مغلق للزوار 🔐</span>
                        </p>
                        <p className="text-[10px] text-slate-300 leading-relaxed mt-1">
                          عذراً، لا يمكن إتمام عملية الشراء إلا بعد تسجيل حساب ملكي وتفعيله. يرجى الضغط على الزر بالأسفل لإنشاء حسابك أو تسجيل الدخول.
                        </p>
                      </div>
                    )}

                    {cartItems.map((item) => {
                      const maxStock = item.product.stock || 99;
                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-4 rounded-xl border border-amber-500/10 p-4 hover:border-amber-500/35 transition-all duration-300 bg-slate-950/40 hover:bg-slate-950/80 shadow-inner group"
                        >
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 rounded-lg object-cover bg-slate-900 border border-amber-500/10"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-amber-200 transition-colors">
                              {item.product.name}
                            </h4>
                            <span className="text-xs text-amber-400 font-extrabold block mt-0.5">
                              ${getProductPrice(item.product)}
                              {globalDiscount > 0 && (
                                <span className="text-[10px] text-zinc-500 line-through mr-1.5">${item.product.price}</span>
                              )}
                            </span>
                            <span className="text-[10px] text-amber-200/50 font-medium block">
                              {item.product.type === 'physical' ? '📦 منتج ملموس' : '⚡ تسليم رقمي'}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* Quantity Adjusters */}
                            <div className="flex items-center gap-1 rounded-lg border border-amber-500/20 bg-slate-950 p-1">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 rounded transition-colors"
                                id={`qty-dec-${item.product.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-white font-mono">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  if (item.product.type !== 'physical' || item.quantity < maxStock) {
                                    onUpdateQuantity(item.product.id, item.quantity + 1);
                                  }
                                }}
                                disabled={item.product.type === 'physical' && item.quantity >= maxStock}
                                className="p-1 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 rounded disabled:opacity-30 transition-colors"
                                id={`qty-inc-${item.product.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                              title="حذف من السلة"
                              id={`remove-item-${item.product.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Step 2: Checkout Form */}
            {step === 'checkout' && (
              <form onSubmit={handleSubmitCheckout} className="space-y-6">
                
                {/* Basic Customer Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-amber-400" />
                    <span>بيانات العميل المستلم</span>
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-amber-200/70 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد أحمد العتيبي"
                      value={customerName || ""}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        required
                        placeholder="ضروري لإرسال المنتجات الرقمية"
                        value={customerEmail || ""}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">رقم الجوال *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+9665xxxxxxxx"
                        value={customerPhone || ""}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping address - conditional on physical products */}
                {hasPhysicalProducts && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      <span>عنوان شحن المنتجات الملموسة</span>
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">العنوان بالتفصيل *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="الدولة، المدينة، اسم الحي، الشارع، رقم المنزل بالتفصيل لضمان سرعة التوصيل"
                        value={shippingAddress || ""}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Gateway Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <span>اختر بوابة الدفع المفضلة</span>
                  </h3>

                  {applicableGateways.length === 0 ? (
                    <div className="p-4 bg-red-950/20 text-red-400 border border-red-950/40 rounded-xl flex items-center gap-2 text-xs">
                      <AlertCircle className="h-4 w-4" />
                      <span>لم يقم المدير بتفعيل أي بوابة دفع بعد. يرجى تفعيل بوابات الدفع من لوحة التحكم.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {applicableGateways.map((gw) => (
                        <div key={gw.id} className="flex flex-col">
                          <label
                            className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                              selectedGatewayId === gw.id
                                ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                : 'border-amber-500/10 bg-slate-950/40 hover:bg-slate-950/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="payment_gateway"
                                checked={selectedGatewayId === gw.id}
                                onChange={() => handleGatewaySelect(gw)}
                                className="h-4 w-4 text-amber-500 focus:ring-amber-500 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400">{getGatewayIcon(gw.iconName, gw.customIconUrl)}</span>
                                <span className="text-xs font-bold text-slate-100">{gw.name}</span>
                              </div>
                            </div>
                          </label>

                          {/* Dynamic fields show up when chosen */}
                          {selectedGatewayId === gw.id && (
                            <div className="mt-2 mr-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3 shadow-inner">
                              <p className="text-[11px] leading-relaxed text-amber-100/70 font-medium">
                                💡 {gw.instructions}
                              </p>

                              {gw.accountIdentifier && (
                                <div className="flex items-center justify-between bg-slate-950 border border-amber-500/20 rounded-lg p-2.5">
                                  <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-amber-200/50 font-semibold mb-0.5">رقم الحساب / المعرّف</span>
                                    <span className="text-xs font-bold text-white font-mono tracking-wider">{gw.accountIdentifier}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(gw.accountIdentifier || '', `acc-${gw.id}`)}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-md text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedKeyId === `acc-${gw.id}` ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" /> تم النسخ!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" /> نسخ
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              {gw.qrCodeUrl && (
                                <div className="mt-2 flex flex-col items-center justify-center">
                                  <span className="text-[10px] text-amber-200/50 mb-1">اضغط على رمز الـ QR لتكبيره بأعلى دقة ملوكية 👑</span>
                                  <button
                                    type="button"
                                    onClick={() => setZoomedQrUrl(gw.qrCodeUrl || null)}
                                    className="block border-2 border-amber-500/20 hover:border-amber-500/40 rounded-xl bg-slate-950 p-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                                    title="اضغط للتكبير بأعلى دقة ملوكية"
                                  >
                                    <img src={gw.qrCodeUrl} alt="رمز الدفع السريع" className="w-32 h-32 object-contain bg-white rounded-lg p-1" referrerPolicy="no-referrer" />
                                  </button>
                                </div>
                              )}

                              {gw.id !== 'cash_on_delivery' && (
                                <div className="mt-2 border-t border-amber-500/10 pt-3 space-y-3">
                                  {gw.id === 'mtn_cash' ? (
                                    <>
                                      {/* اسم المرسل الكامل */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          اسم المرسل الكامل (الاسم الثلاثي للزبون) *
                                        </label>
                                        <input
                                          type="text"
                                          value={mtnSenderName || ""}
                                          onChange={(e) => setMtnSenderName(e.target.value)}
                                          placeholder="اكتب اسمك الثلاثي كما هو في حساب الدفع"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                          required
                                        />
                                      </div>

                                      {/* رقم الهاتف المشترك بخدمة MTN Cash */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          رقم الهاتف (المشترك بخدمة MTN Cash) *
                                        </label>
                                        <input
                                          type="text"
                                          value={mtnPhone || ""}
                                          onChange={(e) => setMtnPhone(e.target.value)}
                                          placeholder="اكتب رقم الهاتف المكون من أرقام (مثال: 09xxxxxxxx)"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>

                                      {/* معرف العملية / رقم الحوالة */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          معرف العملية / رقم الحوالة المستورد من التطبيق *
                                        </label>
                                        <input
                                          type="text"
                                          value={mtnTransactionId || ""}
                                          onChange={(e) => setMtnTransactionId(e.target.value)}
                                          placeholder="اكتب رقم العملية المكون من أرقام"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>
                                    </>
                                  ) : gw.id === 'syriatel_cash' ? (
                                    <>
                                      {/* اسم المرسل الكامل */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          اسم المرسل الكامل (الاسم الثلاثي للزبون) *
                                        </label>
                                        <input
                                          type="text"
                                          value={syriatelSenderName || ""}
                                          onChange={(e) => setSyriatelSenderName(e.target.value)}
                                          placeholder="اكتب اسمك الثلاثي كما هو في حساب الدفع"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                          required
                                        />
                                      </div>

                                      {/* رقم الهاتف المشترك بخدمة سيريتل كاش */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          رقم الهاتف (المشترك بخدمة سيريتل كاش) *
                                        </label>
                                        <input
                                          type="text"
                                          value={syriatelPhone || ""}
                                          onChange={(e) => setSyriatelPhone(e.target.value)}
                                          placeholder="اكتب رقم الهاتف المكون من أرقام (مثال: 09xxxxxxxx)"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>

                                      {/* معرف العملية / رقم الحوالة */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          معرف العملية / رقم الحوالة المستورد من التطبيق *
                                        </label>
                                        <input
                                          type="text"
                                          value={syriatelTransactionId || ""}
                                          onChange={(e) => setSyriatelTransactionId(e.target.value)}
                                          placeholder="اكتب رقم العملية المكون من أرقام"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {/* اسم المرسل الكامل */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          اسم المرسل الكامل (إجباري) *
                                        </label>
                                        <input
                                          type="text"
                                          value={senderName || ""}
                                          onChange={(e) => setSenderName(e.target.value)}
                                          placeholder="اكتب اسمك الثلاثي كما هو في حساب الدفع"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                          required
                                        />
                                      </div>

                                      {/* معرف العملية / رقم الحوالة */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          معرف العملية / رقم الحوالة (إجباري) *
                                        </label>
                                        <input
                                          type="text"
                                          value={transactionId || ""}
                                          onChange={(e) => setTransactionId(e.target.value)}
                                          placeholder="اكتب رقم العملية المكون من أرقام"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* صورة إيصال التحويل */}
                                  <div>
                                    <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                      صورة إيصال التحويل (إجباري) *
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleReceiptUpload}
                                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20 focus:outline-none cursor-pointer"
                                    />
                                    {receiptFileName && (
                                      <p className="mt-1 text-[10px] text-emerald-400 font-medium">تم إرفاق: {receiptFileName}</p>
                                    )}
                                    {receiptBase64 && (
                                      <div className="mt-2 rounded-lg overflow-hidden border border-amber-500/20 relative h-24 bg-slate-950 flex items-center justify-center">
                                        <img src={receiptBase64} alt="إيصال الدفع" className="max-h-full max-w-full object-contain" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div className="p-3 bg-red-950/20 text-red-400 border border-red-950/40 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{checkoutError}</span>
                  </div>
                )}
              </form>
            )}

            {/* Step 3: Order Success Screen with Download / Serial Code deliverables! */}
            {step === 'success' && createdOrder && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-emerald-400">شكراً لطلبك من KING STORE!</h3>
                  <p className="mt-1 text-xs text-amber-100/60">
                    رقم الطلب الخاص بك: <strong className="text-white font-extrabold">{createdOrder.id}</strong>
                  </p>
                </div>

                {/* إشعار الدفع الملوكي */}
                <div className="my-4 overflow-hidden rounded-2xl shadow-lg">
                  <PaymentReceipt
                    order={createdOrder}
                    gateway={enabledGateways.find(g => g.id === createdOrder.paymentMethodId)}
                  />
                </div>

                {/* Deliverables for Digital Products */}
                {hasDigitalProducts && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-right space-y-4">
                    <h4 className="text-xs font-bold text-emerald-400 border-b border-emerald-500/10 pb-2">
                      ⚡ تسليم المحتوى الرقمي الفوري:
                    </h4>

                    {cartItems.map((item, index) => {
                      if (item.product.type === 'digital') {
                        // Generate or get download url
                        const dlUrl = item.product.downloadUrl || 'https://example.com/download-key';
                        // Get or generate a fake license key
                        const key = item.product.licenseKeys?.[0] || `KEY-${Math.floor(100000 + Math.random() * 900000)}`;

                        return (
                          <div key={item.product.id} className="space-y-2 text-xs">
                            <span className="font-bold text-slate-100 block">• {item.product.name}</span>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Download button */}
                              <a
                                href={dlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                              >
                                <Download className="h-3 w-3" />
                                <span>تحميل الملف / الرابط</span>
                              </a>

                              {/* License Key code */}
                              <div className="flex items-center gap-2 bg-slate-950 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                <span className="font-mono text-[10px] text-amber-200 select-all">{key}</span>
                                <button
                                  onClick={() => handleCopyText(key, item.product.id)}
                                  className="text-amber-400 hover:text-amber-300"
                                  title="نسخ كود التفعيل"
                                >
                                  {copiedKeyId === item.product.id ? (
                                    <span className="text-[10px] text-emerald-400 font-bold">تم!</span>
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                    <p className="text-[10px] text-amber-100/60 leading-relaxed pt-1">
                      * تم إرسال نسخة من الفاتورة وروابط التحميل والتعليمات إلى بريدك الإلكتروني: <strong className="text-amber-200/60">{createdOrder.customerEmail}</strong>.
                    </p>
                  </div>
                )}

                {/* Delivery Information for Physical Products */}
                {hasPhysicalProducts && (
                  <div className="rounded-xl border border-amber-500/10 bg-slate-950/40 p-4 text-right space-y-2 text-xs">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-amber-400" />
                      <span>تفاصيل التوصيل للمنتجات الملموسة:</span>
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      العميل المستلم: <strong className="text-slate-900">{createdOrder.customerName}</strong>
                      <br />
                      العنوان: <span className="text-amber-200/60">{createdOrder.shippingAddress}</span>
                      <br />
                      الجوال: <span className="text-amber-200/60">{createdOrder.customerPhone}</span>
                    </p>
                    <p className="text-[10px] text-amber-400/80 font-semibold pt-1">
                      💡 سيتصل بك مندوب الشحن والتوصيل خلال 24 إلى 48 ساعة لتسليم طلبك.
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => {
                    setStep('cart');
                    onClose();
                  }}
                  className="w-full rounded-xl w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
                >
                  إغلاق ومتابعة التصفح
                </button>
              </div>
            )}

          </div>

          {/* Footer of Drawer (Cart checkout summary) */}
          {step !== 'success' && cartItems.length > 0 && (
            <div className="border-t border-amber-500/10 p-6 bg-slate-950/40">
              <div className="flex items-center justify-between text-base font-bold text-slate-300 mb-4">
                <span>المجموع الكلي:</span>
                <span className="text-xl text-amber-400 font-black">${totalAmount.toLocaleString()}</span>
              </div>

              {step === 'cart' ? (
                !currentUser ? (
                  <button
                    onClick={() => {
                      onOpenAuth();
                      onClose();
                    }}
                    className="w-full rounded-xl bg-red-600 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-red-500 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-600/10 cursor-pointer"
                    id="checkout-step-btn"
                  >
                    <Lock className="h-4 w-4 text-white" />
                    <span>تسجيل الدخول لإتمام عملية الشراء 🔐</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (applicableGateways.length > 0) {
                        setStep('checkout');
                      } else {
                        setCheckoutError('يرجى تفعيل طريقة دفع واحدة على الأقل في حساب الآدمن.');
                        setTimeout(() => setCheckoutError(''), 4000);
                      }
                    }}
                    className="w-full rounded-xl bg-slate-900 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 cursor-pointer"
                    id="checkout-step-btn"
                  >
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span>الانتقال لبيانات التوصيل والدفع</span>
                  </button>
                )
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="rounded-xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-bold text-amber-200/60 hover:bg-slate-50 transition-all"
                  >
                    العودة للسلة
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitCheckout}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 py-3.5 text-xs sm:text-sm font-black text-slate-950 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15 cursor-pointer"
                  >
                    <span>تأكيد الإرسال والدفع</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {zoomedQrUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md transition-opacity" onClick={() => setZoomedQrUrl(null)}>
          <div className="relative max-w-lg w-full bg-[#0F172AFF] border border-amber-500/20 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center text-right" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoomedQrUrl(null)}
              className="absolute top-4 right-4 text-amber-400 hover:text-amber-300 bg-slate-100 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold text-slate-100">رمز الـ QR Code للدفع بأعلى دقة 👑</h3>
            <div className="border border-amber-500/20 rounded-xl p-3 bg-white w-full max-w-sm">
              <img src={zoomedQrUrl} alt="رمز الدفع مكبر" className="w-full h-auto object-contain max-h-[450px]" referrerPolicy="no-referrer" />
            </div>
            <p className="text-xs text-amber-100/60">قم بمسح الرمز ضوئياً من هاتفك لإتمام عملية التحويل الفوري بكل سهولة.</p>
          </div>
        </div>
      )}
    </div>
  );
}
