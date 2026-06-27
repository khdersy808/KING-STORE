/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CartItem, PaymentGateway, Order, OrderItem, Product, User } from '../types';
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
}: CartProps) {
  // Checkout states
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [gatewayFieldValues, setGatewayFieldValues] = useState<Record<string, string>>({});
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  // Pre-populate user details if logged in
  React.useEffect(() => {
    if (currentUser) {
      setCustomerName(prev => prev || currentUser.name);
      setCustomerEmail(prev => prev || currentUser.email);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
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
  };

  const handleFieldChange = (key: string, value: string) => {
    setGatewayFieldValues(prev => ({ ...prev, [key]: value }));
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
      for (const field of selectedGateway.fields) {
        if (!gatewayFieldValues[field.key]?.trim()) {
          setCheckoutError(`يرجى ملء حقل (${field.label}) لتأكيد الدفع.`);
          return;
        }
      }
    }

    // Generate simulated order
    const orderItems: OrderItem[] = cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      type: item.product.type
    }));

    const newOrder: Order = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: hasPhysicalProducts ? shippingAddress : undefined,
      items: orderItems,
      totalAmount,
      paymentMethodId: selectedGatewayId,
      paymentDetails: gatewayFieldValues,
      status: selectedGatewayId === 'cash_on_delivery' ? 'pending' : 'completed', // Digital/Online cards are immediately completed, COD is pending
      date: new Date().toISOString()
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

  const getGatewayIcon = (iconName: string) => {
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
    <div className="fixed inset-0 z-50 overflow-hidden" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 left-0 flex max-w-full pr-0 md:pr-10">
        <div className="w-screen max-w-lg transform bg-white text-slate-900 shadow-2xl transition-all flex flex-col h-full">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {step === 'cart' && 'سلة المشتريات'}
              {step === 'checkout' && 'إتمام الدفع والطلب'}
              {step === 'success' && 'تم الطلب بنجاح! 🎉'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">سلتك فارغة تماماً</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                      تصفح المنتجات الفاخرة والمميزة المتوفرة في المتجر، وأضف ما يعجبك هنا.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all"
                    >
                      متابعة التسوق
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!currentUser && (
                      <div className="rounded-xl border border-red-200/60 bg-red-50 p-3 text-right">
                        <p className="text-[11px] font-bold text-red-700 flex items-center gap-1.5 justify-start">
                          <Lock className="h-3.5 w-3.5 text-red-600" />
                          <span>الشراء مغلق للزوار 🔐</span>
                        </p>
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-1">
                          عذراً، لا يمكن إتمام عملية الشراء إلا بعد تسجيل حساب ملكي وتفعيله. يرجى الضغط على الزر بالأسفل لإنشاء حسابك أو تسجيل الدخول.
                        </p>
                      </div>
                    )}

                    {cartItems.map((item) => {
                      const maxStock = item.product.stock || 99;
                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 hover:border-amber-500/10 transition-colors bg-slate-50/50"
                        >
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 rounded-lg object-cover bg-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {item.product.name}
                            </h4>
                            <span className="text-xs text-amber-600 font-extrabold block mt-0.5">
                              ${item.product.price}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {item.product.type === 'physical' ? '📦 منتج ملموس' : '⚡ تسليم رقمي'}
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* Quantity Adjusters */}
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                              <button
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                                id={`qty-dec-${item.product.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  if (item.product.type !== 'physical' || item.quantity < maxStock) {
                                    onUpdateQuantity(item.product.id, item.quantity + 1);
                                  }
                                }}
                                disabled={item.product.type === 'physical' && item.quantity >= maxStock}
                                className="p-1 text-slate-500 hover:text-slate-950 rounded hover:bg-slate-100 disabled:opacity-30"
                                id={`qty-inc-${item.product.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
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
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-amber-600" />
                    <span>بيانات العميل المستلم</span>
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد أحمد العتيبي"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        required
                        placeholder="ضروري لإرسال المنتجات الرقمية"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الجوال *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+9665xxxxxxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping address - conditional on physical products */}
                {hasPhysicalProducts && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      <span>عنوان شحن المنتجات الملموسة</span>
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">العنوان بالتفصيل *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="الدولة، المدينة، اسم الحي، الشارع، رقم المنزل بالتفصيل لضمان سرعة التوصيل"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Gateway Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    <span>اختر بوابة الدفع المفضلة</span>
                  </h3>

                  {applicableGateways.length === 0 ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-xs">
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
                                ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="payment_gateway"
                                checked={selectedGatewayId === gw.id}
                                onChange={() => handleGatewaySelect(gw)}
                                className="h-4 w-4 text-amber-500 focus:ring-amber-500"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-slate-700">{getGatewayIcon(gw.iconName)}</span>
                                <span className="text-xs font-bold text-slate-900">{gw.name}</span>
                              </div>
                            </div>
                          </label>

                          {/* Dynamic fields show up when chosen */}
                          {selectedGatewayId === gw.id && (
                            <div className="mt-2 mr-6 rounded-xl border border-amber-200/60 bg-amber-50/20 p-4 space-y-3">
                              <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                                💡 {gw.instructions}
                              </p>

                              {gw.fields.map((field) => (
                                <div key={field.key}>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    {field.label} *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder={field.placeholder}
                                    value={gatewayFieldValues[field.key] || ''}
                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{checkoutError}</span>
                  </div>
                )}
              </form>
            )}

            {/* Step 3: Order Success Screen with Download / Serial Code deliverables! */}
            {step === 'success' && createdOrder && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-emerald-700">شكراً لطلبك من KING STORE!</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    رقم الطلب الخاص بك: <strong className="text-slate-950 font-bold">{createdOrder.id}</strong>
                  </p>
                </div>

                {/* Deliverables for Digital Products */}
                {hasDigitalProducts && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 text-right space-y-4">
                    <h4 className="text-xs font-bold text-emerald-800 border-b border-emerald-200/50 pb-2">
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
                            <span className="font-bold text-slate-900 block">• {item.product.name}</span>
                            
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
                              <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
                                <span className="font-mono text-[10px] text-slate-700 select-all">{key}</span>
                                <button
                                  onClick={() => handleCopyText(key, item.product.id)}
                                  className="text-slate-400 hover:text-slate-600"
                                  title="نسخ كود التفعيل"
                                >
                                  {copiedKeyId === item.product.id ? (
                                    <span className="text-[10px] text-emerald-600 font-bold">تم!</span>
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
                    <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                      * تم إرسال نسخة من الفاتورة وروابط التحميل والتعليمات إلى بريدك الإلكتروني: <strong className="text-slate-700">{createdOrder.customerEmail}</strong>.
                    </p>
                  </div>
                )}

                {/* Delivery Information for Physical Products */}
                {hasPhysicalProducts && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-right space-y-2 text-xs">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-amber-600" />
                      <span>تفاصيل التوصيل للمنتجات الملموسة:</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      العميل المستلم: <strong className="text-slate-900">{createdOrder.customerName}</strong>
                      <br />
                      العنوان: <span className="text-slate-700">{createdOrder.shippingAddress}</span>
                      <br />
                      الجوال: <span className="text-slate-700">{createdOrder.customerPhone}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold pt-1">
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
                  className="w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition-all"
                >
                  إغلاق ومتابعة التصفح
                </button>
              </div>
            )}

          </div>

          {/* Footer of Drawer (Cart checkout summary) */}
          {step !== 'success' && cartItems.length > 0 && (
            <div className="border-t border-slate-100 p-6 bg-slate-50">
              <div className="flex items-center justify-between text-base font-bold text-slate-900 mb-4">
                <span>المجموع الكلي:</span>
                <span className="text-xl text-amber-600 font-black">${totalAmount.toLocaleString()}</span>
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
                    className="rounded-xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    العودة للسلة
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitCheckout}
                    className="rounded-xl bg-amber-500 py-3.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
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
    </div>
  );
}
