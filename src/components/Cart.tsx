/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CartItem, PaymentGateway, Order, OrderItem, Product, User, DeliverySettings } from '../types';
import PaymentReceipt from './PaymentReceipt';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
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
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onUpdateItemSize: (index: number, newSize: string) => void;
  onUpdateItemColor: (index: number, newColor: string) => void;
  onClearCart: () => void;
  enabledGateways: PaymentGateway[];
  onPlaceOrder: (order: Order) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onEditItem?: (item: CartItem) => void;
  globalDiscount?: number;
  exchangeRate?: number;
  isSypEnabled?: boolean;
  deliverySettings: DeliverySettings;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemSize,
  onUpdateItemColor,
  onClearCart,
  enabledGateways,
  onPlaceOrder,
  currentUser,
  onOpenAuth,
  onEditItem,
  globalDiscount = 0,
  deliverySettings
}: CartProps) {
  const { t, language } = useLanguage();
  const { isSypEnabled, exchangeRate, formatPrice } = useCurrency();
  // Helper to get active product price with global and product-specific discounts
  const getCartItemPrice = (item: CartItem) => {
    const pSpecific = item.product.discountPercentage || 0;
    const gDiscount = globalDiscount || 0;
    const totalDiscount = Math.max(gDiscount, pSpecific);
    
    let basePrice = item.product.price;
    if (totalDiscount > 0) {
      basePrice = Math.round(basePrice * (1 - totalDiscount / 100));
    }
    
    return basePrice;
  };

  // Checkout states
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
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

  const subTotal = cartItems.reduce((acc, item) => acc + getCartItemPrice(item) * item.quantity, 0);
  const hasPhysicalProducts = cartItems.some(item => item.product.type === 'physical');
  const hasDigitalProducts = cartItems.some(item => item.product.type === 'digital');

  let daysDifference = 0;
  let deliveryFee = 0;

  if (deliveryDate && hasPhysicalProducts) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const chosenDate = new Date(deliveryDate);
    chosenDate.setHours(0,0,0,0);
    daysDifference = Math.max(0, Math.floor((chosenDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    const airBase = deliverySettings?.airBaseCost ?? 40;
    const airUrgency = deliverySettings?.airUrgencyFactor ?? 8;
    const airWeight = deliverySettings?.airWeightVolumeFactor ?? 1.5;
    const seaBase = deliverySettings?.seaBaseCost ?? 15;
    const seaDecay = deliverySettings?.seaDailyDecay ?? 0.5;
    const seaMin = deliverySettings?.seaMinBaseline ?? 5;

    // 1-4 days: Air Freight. 5+ days: Sea Freight
    if (daysDifference <= 4) {
      deliveryFee = airBase + (5 - Math.max(1, daysDifference)) * airUrgency * airWeight;
    } else {
      deliveryFee = Math.max(seaMin, seaBase - (daysDifference - 5) * seaDecay);
    }
  }

  // Charge delivery fee only if there are physical products
  const finalDeliveryFee = hasPhysicalProducts ? deliveryFee : 0;

  const physicalSubTotal = cartItems
    .filter(item => item.product.type === 'physical')
    .reduce((acc, item) => acc + getCartItemPrice(item) * item.quantity, 0);

  // 10% customs/import tax applied strictly on physical/tangible products
  const physicalImportTax = hasPhysicalProducts ? (physicalSubTotal * 0.10) : 0;

  const totalAmount = subTotal + finalDeliveryFee + physicalImportTax;

  // Split payment calculations
  const effectiveIsSplitPayment = hasPhysicalProducts && isSplitPayment;
  
  const digitalSubTotal = cartItems
    .filter(item => item.product.type === 'digital')
    .reduce((acc, item) => acc + getCartItemPrice(item) * item.quantity, 0);

  const totalPhysical = physicalSubTotal + finalDeliveryFee + physicalImportTax;

  const amountPaidAdvance = effectiveIsSplitPayment
    ? digitalSubTotal + (0.50 * totalPhysical)
    : totalAmount;

  const amountDueOnDelivery = effectiveIsSplitPayment
    ? 0.50 * totalPhysical
    : 0;

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

    if (hasPhysicalProducts && !deliveryDate) {
      setCheckoutError('يرجى اختيار تاريخ التسليم المطلوب لمتابعة الدفع.');
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
      price: getCartItemPrice(item),
      quantity: item.quantity,
      type: item.product.type,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      selectedOptions: item.selectedOptions
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
      deliveryDate: deliveryDate || undefined,
      deliveryFee: finalDeliveryFee,
      import_tax: physicalImportTax,
      status: 'pending', // All new orders are pending verification by Admin
      date: new Date().toISOString(),
      senderName: finalSenderName,
      transactionId: finalTransactionId,
      payment_type: effectiveIsSplitPayment ? 'split_50_50' : 'standard',
      amount_paid_advance: amountPaidAdvance,
      amount_due_on_delivery: amountDueOnDelivery,
      payment_status: effectiveIsSplitPayment ? 'partially_paid' : 'unpaid'
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
    <div className="fixed inset-0 z-[10001] overflow-hidden" aria-modal="true" role="dialog" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-slate-950/80 transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 left-0 flex max-w-full pr-0 md:pr-10">
        <div className="w-screen max-w-lg transform bg-[#0F172AFF] text-white shadow-2xl transition-all flex flex-col h-full rounded-r-2xl border-r border-amber-500/20">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/10 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              {step === 'cart' && `${t('cartTitle')} 🛒`}
              {step === 'checkout' && `${t('checkoutTitle')} 💳`}
              {step === 'success' && `${t('successTitle')} 🎉`}
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
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 mb-4 ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10">
                      <ShoppingBag className="h-8 w-8 animate-pulse text-blue-500" />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">{t('emptyCartTitle')}</h3>
                    <p className="mt-1 text-xs text-amber-100/60 max-w-xs leading-relaxed">
                      {t('emptyCartDesc')}
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
                    >
                      {t('continueShopping')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!currentUser && (
                      <div className="rounded-xl border border-red-950/40 bg-red-950/20 p-4 text-right">
                        <p className="text-[11px] font-bold text-red-400 flex items-center gap-1.5 justify-start">
                          <Lock className="h-3.5 w-3.5 text-red-400" />
                          <span>{t('loginToPurchase')} 🔐</span>
                        </p>
                        <p className="text-[10px] text-slate-300 leading-relaxed mt-1">
                          {t('loginToPurchaseDesc')}
                        </p>
                      </div>
                    )}

                    {cartItems.map((item, index) => {
                      const maxStock = item.product.stock || 99;
                      const itemUniqueId = `${item.product.id}-${item.selectedSize || 'default'}-${item.selectedColor || 'default'}-${JSON.stringify(item.selectedOptions || {})}-${index}`;
                      return (
                        <div
                          key={itemUniqueId}
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
                            
                            {/* Product Specifications (Enhanced Red highlight) */}
                            {item.product.specifications && (
                              <div className="bg-red-50 border-r-4 border-red-500 px-3 py-1.5 rounded my-2 shadow-sm">
                                <p className="text-[10px] font-black text-red-600 text-right leading-tight uppercase tracking-tight">
                                  🔥 {item.product.specifications}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.selectedSize && (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 flex flex-col">
                                  <span className="text-[8px] text-zinc-500 font-bold uppercase">المقاس</span>
                                  <span className="text-[10px] font-black text-white">{item.selectedSize}</span>
                                </div>
                              )}
                              
                              {item.selectedColor && (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-zinc-500 font-bold uppercase">اللون</span>
                                    <span className="text-[10px] font-black text-white">{item.selectedColor}</span>
                                  </div>
                                  <div 
                                    className="w-4 h-4 rounded-full border border-white/20 shadow-inner" 
                                    style={{ backgroundColor: item.selectedColor }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Custom selected options display */}
                            {item.selectedOptions && Object.entries(item.selectedOptions).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {Object.entries(item.selectedOptions).map(([key, value]) => (
                                  <div key={key} className="bg-zinc-900/50 border border-zinc-800/50 rounded-md px-2 py-0.5">
                                    <span className="text-[9px] font-bold text-zinc-400">{key}: {value}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-3">
                              <button
                                onClick={() => onEditItem?.(item)}
                                className="w-full py-2 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500 text-[11px] font-black hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center justify-center gap-2"
                              >
                                {t('editDetails')}
                              </button>
                            </div>

                            <div className="flex flex-col mt-2">
                              <span className="text-2xl font-black text-red-500 drop-shadow-sm filter saturate-150 transform -rotate-1 block leading-none">
                                {formatPrice(getCartItemPrice(item))}
                              </span>
                              {(globalDiscount > 0 || (item.product.discountPercentage && item.product.discountPercentage > 0)) && (
                                <span className="text-[10px] text-zinc-650 line-through font-bold mt-1">
                                  {formatPrice(item.product.price)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-amber-200/50 font-medium block">
                              {item.product.type === 'physical' ? '📦 منتج ملموس' : '⚡ تسليم رقمي'}
                            </span>
                          </div>

                        {/* Quantity & Delete */}
                        <div className="flex flex-col items-end justify-between gap-2">
                          <button
                            onClick={() => onRemoveItem(index)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          {item.product.type === 'physical' ? (
                            <div className="flex items-center gap-2 bg-slate-900 border border-zinc-800 rounded-lg p-0.5">
                              <button
                                onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                                className="p-1 text-slate-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-400"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-black text-white min-w-[1.2rem] text-center font-mono">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                                className="p-1 text-slate-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-400"
                                disabled={item.product.stock !== undefined && item.product.stock !== null && item.quantity >= item.product.stock}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-zinc-800">الكمية: 1</span>
                          )}
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
                    <span>{t('customerData')}</span>
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-amber-200/70 mb-1">{t('fullName')} *</label>
                    <input
                      type="text"
                      required
                      placeholder={t('fullNamePlaceholder')}
                      value={customerName || ""}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">{t('email')} *</label>
                      <input
                        type="email"
                        required
                        placeholder={t('emailPlaceholder')}
                        value={customerEmail || ""}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">{t('phone')} *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+9665xxxxxxxx"
                        value={customerPhone || ""}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">تاريخ التسليم المطلوب *</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className={`w-full rounded-xl border p-3 text-xs text-white focus:ring-1 focus:outline-none ${
                          !deliveryDate 
                            ? 'border-red-500/40 bg-red-950/10 focus:border-red-400 focus:ring-red-400/30' 
                            : 'border-amber-500/20 bg-slate-950 focus:border-amber-400 focus:ring-amber-400/30'
                        }`}
                      />
                      {deliveryDate ? (
                        <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-slate-900/80 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">وسيلة النقل والشحن:</span>
                            <span className="font-black text-amber-400 flex items-center gap-1">
                              {daysDifference <= 4 ? (
                                <><span>✈️ شحن جوي سريع</span></>
                              ) : (
                                <><span>🚢 شحن بحري اقتصادي</span></>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">المدة الزمنية للتسليم:</span>
                            <span className="font-mono font-black text-white">{daysDifference} يوم</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] border-t border-slate-800 pt-2">
                            <span className="text-slate-400">تكلفة خدمة التوصيل والشحن الدولي:</span>
                            <span className="font-mono font-black text-emerald-400">
                              ${finalDeliveryFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-red-400 mt-2 font-black animate-pulse flex items-center gap-1">
                          <span>⚠️</span>
                          <span>الرجاء اختيار تاريخ التسليم لحساب تكلفة الشحن والمتابعة</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping address - conditional on physical products */}
                {hasPhysicalProducts && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      <span>{t('shippingAddressLabel')}</span>
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-amber-200/70 mb-1">{t('addressDetail')} *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder={t('addressPlaceholder')}
                        value={shippingAddress || ""}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* نظام الدفع وتقسيم الفاتورة (للمنتجات الملموسة) */}
                {hasPhysicalProducts && (
                  <div className="space-y-3 bg-slate-950/20 border border-amber-500/10 p-4 rounded-xl text-right">
                    <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-400" />
                      <span>نظام دفع الفاتورة (Payment Plan)</span>
                    </h3>
                    <p className="text-[10px] text-amber-100/60 leading-relaxed">
                      نوفر لك خيار دفع القيمة الإجمالية بالكامل أو دفع 50% كعربون مقدم والـ 50% المتبقية عند استلام البضائع.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {/* Option 1: Full Payment */}
                      <div
                        className={`flex items-start justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                          !isSplitPayment
                            ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                            : 'border-amber-500/10 bg-slate-950/40 hover:bg-slate-950/85'
                        }`}
                        onClick={() => setIsSplitPayment(false)}
                      >
                        <div className="flex gap-2">
                          <input
                            type="radio"
                            name="payment_plan"
                            checked={!isSplitPayment}
                            onChange={() => setIsSplitPayment(false)}
                            className="mt-1 h-3.5 w-3.5 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex flex-col text-right">
                            <span className="text-xs font-bold text-slate-100">دفع كامل القيمة 100% مقدماً</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">دفع المبلغ الإجمالي لتسريع الشحن وتجهيز الفواتير</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-400">{formatPrice(totalAmount)}</span>
                      </div>

                      {/* Option 2: Split 50/50 */}
                      <div
                        className={`flex items-start justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                          isSplitPayment
                            ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500'
                            : 'border-amber-500/10 bg-slate-950/40 hover:bg-slate-950/85'
                        }`}
                        onClick={() => setIsSplitPayment(true)}
                      >
                        <div className="flex gap-2">
                          <input
                            type="radio"
                            name="payment_plan"
                            checked={isSplitPayment}
                            onChange={() => setIsSplitPayment(true)}
                            className="mt-1 h-3.5 w-3.5 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="flex flex-col text-right">
                            <span className="text-xs font-bold text-slate-100">تقسيم الدفع (50% مقدماً / 50% عند الاستلام)</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">دفع نصف قيمة المواد الملموسة بالإضافة للرسوم، والمتبقي نقداً عند الاستلام</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-emerald-400">العربون: {formatPrice(amountPaidAdvance)}</span>
                          <span className="text-[9px] text-amber-500/80 mt-0.5 font-bold">المتبقي: {formatPrice(amountDueOnDelivery)}</span>
                        </div>
                      </div>
                    </div>

                    {hasDigitalProducts && (
                      <p className="text-[9px] text-emerald-400/80 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                        * يرجى ملاحظة: المنتجات الرقمية/غير الملموسة يتم احتساب قيمتها 100% مقدماً دائماً وتضاف لقيمة العربون.
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Gateway Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <span>{t('chooseGateway')}</span>
                  </h3>

                  {applicableGateways.length === 0 ? (
                    <div className="p-4 bg-red-950/20 text-red-400 border border-red-950/40 rounded-xl flex items-center gap-2 text-xs">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t('noGateways')}</span>
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
                                        <CheckCircle2 className="h-3 w-3" /> {t('copied')}
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" /> {t('copy')}
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
                                          {t('senderNameLabel')}
                                        </label>
                                        <input
                                          type="text"
                                          value={senderName || ""}
                                          onChange={(e) => setSenderName(e.target.value)}
                                          placeholder={t('fullNamePlaceholder')}
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                          required
                                        />
                                      </div>

                                      {/* معرف العملية / رقم الحوالة */}
                                      <div>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          {t('transactionIdLabel')}
                                        </label>
                                        <input
                                          type="text"
                                          value={transactionId || ""}
                                          onChange={(e) => setTransactionId(e.target.value)}
                                          placeholder="12345678"
                                          className="block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                          required
                                        />
                                      </div>
                                    </>
                                  )}

                                  {/* صورة إيصال التحويل */}
                                  <div>
                                    <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                      {t('receiptLabel')}
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
                  <h3 className="text-lg font-extrabold text-emerald-400">{t('orderSuccessTitle')}</h3>
                  <p className="mt-1 text-xs text-amber-100/60">
                    {t('orderNumber')} <strong className="text-white font-extrabold">{createdOrder.id}</strong>
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
            <div className="border-t border-amber-500/10 p-6 bg-slate-950/40 pb-28 md:pb-8">
              {checkoutError && step === 'cart' && (
                <div className="p-3 bg-red-950/20 text-red-400 border border-red-950/40 rounded-xl text-xs flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="space-y-1.5 mb-4 text-xs font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>قيمة المنتجات:</span>
                  <span className="text-slate-200">{formatPrice(subTotal)}</span>
                </div>
                {hasPhysicalProducts && (
                  <div className="flex justify-between">
                    <span>تكلفة خدمة التوصيل والشحن الدولي:</span>
                    {deliveryDate ? (
                      <span className="text-amber-400 font-bold">+ {formatPrice(finalDeliveryFee)}</span>
                    ) : (
                      <span className="text-red-400 text-[10px] animate-pulse">⚠️ بانتظار تحديد التاريخ</span>
                    )}
                  </div>
                )}
                {hasPhysicalProducts && physicalImportTax > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-500/80">
                    <span>الرسوم الجمركية وضريبة الاستيراد (10% للمواد الملموسة):</span>
                    <span className="font-bold">+ {formatPrice(physicalImportTax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-300 border-t border-slate-800/60 pt-2">
                  <span>المجموع الكلي:</span>
                  <span className="text-xl text-amber-400 font-black">{formatPrice(totalAmount)}</span>
                </div>
                {effectiveIsSplitPayment && (
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-zinc-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>العربون المطلوب دفعه الآن (50% ملموس + 100% غير ملموس):</span>
                      <span>{formatPrice(amountPaidAdvance)}</span>
                    </div>
                    <div className="flex justify-between text-amber-500 font-bold">
                      <span>المتبقي المستحق عند الاستلام (50% ملموس):</span>
                      <span>{formatPrice(amountDueOnDelivery)}</span>
                    </div>
                  </div>
                )}
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
                      // Check if any cart item has sizes available but no selectedSize
                      const missingSizeItem = cartItems.find(
                        (item) => item.product.sizes && item.product.sizes.length > 0 && !item.selectedSize
                      );
                      if (missingSizeItem) {
                        const isShoes = missingSizeItem.product.category === 'أحذية' || 
                                        missingSizeItem.product.category?.toLowerCase().includes('shoes') || 
                                        missingSizeItem.product.category?.toLowerCase().includes('footwear');
                        setCheckoutError(`⚠️ يرجى اختيار المقاس المطلوب لـ "${missingSizeItem.product.name}" أولاً قبل إتمام عملية الدفع!`);
                        setTimeout(() => setCheckoutError(''), 5000);
                        return;
                      }

                      if (applicableGateways.length > 0) {
                        setStep('checkout');
                        setCheckoutError('');
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 transition-opacity" onClick={() => setZoomedQrUrl(null)}>
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
