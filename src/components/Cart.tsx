/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CartItem, PaymentGateway, Order, OrderItem, Product, User, DeliverySettings, Coupon, Policy } from '../types';
import PaymentReceipt from './PaymentReceipt';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { safeLocalStorageSetItem } from '../lib/safeJson';
import { db, collection, query, where, getDocs, doc, updateDoc, encryptPin } from '../lib/firebase';
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
  ShoppingBag,
  Tag,
  Shield,
  FileText,
  CheckSquare,
  Fingerprint,
  Key,
  Loader2
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
  onUpdateUser?: (updatedUser: User) => void;
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
  deliverySettings,
  onUpdateUser
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

  // PIN Security / Verification states
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinModalError, setPinModalError] = useState('');
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isSettingPinInCheckout, setIsSettingPinInCheckout] = useState(false);
  const [checkoutSetupPin, setCheckoutSetupPin] = useState('');
  const [checkoutSetupConfirmPin, setCheckoutSetupConfirmPin] = useState('');
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);

  // Coupon state variables
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // MTN Cash state variables
  const [mtnSenderName, setMtnSenderName] = useState<string>('');
  const [mtnPhone, setMtnPhone] = useState<string>('');
  const [mtnTransactionId, setMtnTransactionId] = useState<string>('');

  // Syriatel Cash state variables
  const [syriatelSenderName, setSyriatelSenderName] = useState<string>('');
  const [syriatelPhone, setSyriatelPhone] = useState<string>('');
  const [syriatelTransactionId, setSyriatelTransactionId] = useState<string>('');

  // Store Policies & Confirmation Checkbox State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isAgreedToPolicies, setIsAgreedToPolicies] = useState<boolean>(false);
  const [activePolicyToRead, setActivePolicyToRead] = useState<Policy | null>(null);
  const [isViewingPoliciesModal, setIsViewingPoliciesModal] = useState<boolean>(false);

  // Load active policies from Firestore and local backup
  React.useEffect(() => {
    const fetchPolicies = async () => {
      let loadedPolicies: Policy[] = [];
      let fetchSuccess = false;
      try {
        const qSnapshot = await getDocs(collection(db, 'policies'));
        if (!qSnapshot.empty) {
          loadedPolicies = qSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            content: doc.data().content,
            isActive: doc.data().isActive !== false,
            updatedAt: doc.data().updatedAt || ''
          })) as Policy[];
        }
        fetchSuccess = true;
      } catch (err) {
        console.warn("Could not fetch policies from Firestore, using local fallback...", err);
      }

      if (loadedPolicies.length === 0) {
        const localRaw = localStorage.getItem('king_store_policies');
        if (localRaw) {
          loadedPolicies = JSON.parse(localRaw) as Policy[];
        } else {
          // Default seeded Arabic policies (matching Admin Panel defaults)
          loadedPolicies = [
            {
              id: 'pol-terms',
              title: 'شروط الخدمة والأحكام (Terms of Service)',
              content: `مرحباً بكم في KING STORE. يرجى قراءة الشروط والأحكام التالية بعناية قبل استخدام موقعنا أو إجراء أي عملية شراء:

1. قبول الشروط: باستخدامك للموقع، فإنك توافق تماماً على الالتزام بهذه الشروط وبسياساتنا المعمول بها.
2. الحسابات والطلبات: تلتزم بتقديم معلومات صحيحة ودقيقة عند التسجيل أو الشراء. تحتفظ الإدارة بالحق في إلغاء أو تعليق أي طلب يخضع للشك أو عدم مطابقة البيانات.
3. تفاصيل الدفع: يجب على العميل دفع العربون أو قيمة الفاتورة المحددة بناءً على طريقة الدفع التي تم اختيارها ورفع إيصال تحويل صحيح ومطابق ليتم مراجعة الطلب وشحنه.
4. حقوق الملكية: جميع المحتويات والعلامات التجارية والرموز البرمجية المعروضة على المتجر هي ملك حصري لـ KING STORE.`,
              isActive: true,
              updatedAt: new Date().toLocaleDateString('ar-EG')
            },
            {
              id: 'pol-privacy',
              title: 'سياسة الخصوصية وحماية البيانات (Privacy Policy)',
              content: `نحن في KING STORE نضع سرية وحماية بيانات عملائنا على رأس أولوياتنا:

1. جمع المعلومات: نقوم بجمع الاسم، البريد الإلكتروني، ورقم الهاتف، وعنوان الشحن لتسهيل توصيل الطلبات والتواصل معك.
2. حماية البيانات: نستخدم معايير تشفير وأمان قوية لحماية بياناتك من الوصول غير المصرح به.
3. مشاركة البيانات: نحن لا نبيع، ولا نؤجر، ولا نشارك بياناتك الشخصية مع أي جهات خارجية أو أطراف ثالثة لأغراض تسويقية على الإطلاق.
4. التحديثات: قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم إخطاركم بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار بارز في المتجر.`,
              isActive: true,
              updatedAt: new Date().toLocaleDateString('ar-EG')
            },
            {
              id: 'pol-return',
              title: 'سياسة الشحن والاسترجاع (Shipping & Returns)',
              content: `سياسات تسليم البضائع الملموسة والمنتجات الرقمية:

1. المنتجات الرقمية: يتم تسليمها فوراً أو خلال ساعات معدودة عبر البريد الإلكتروني أو الواتساب، وبسبب طبيعتها الفورية فهي غير قابلة للإرجاع أو الاستبدال بعد استلام البيانات أو الرمز.
2. المنتجات الملموسة: نقوم بتوفير خيار تقسيم الفاتورة (50% مقدماً و50% عند الاستلام). يلتزم العميل بفحص البضائع فور وصولها.
3. سياسة الاستبدال: يمكن للعميل تقديم طلب استبدال للمنتجات الملموسة في حال وجود عيب مصنعي أو تلف واضح أثناء الشحن، وذلك خلال مدة لا تتجاوز 3 أيام من تاريخ الاستلام مع إرفاق صور واضحة للتلف.`,
              isActive: true,
              updatedAt: new Date().toLocaleDateString('ar-EG')
            }
          ];
          safeLocalStorageSetItem('king_store_policies', loadedPolicies);
        }
      }

      setPolicies(loadedPolicies.filter(p => p.isActive));
    };

    fetchPolicies();
  }, []);

  // Pre-populate user details if logged in
  React.useEffect(() => {
    if (currentUser) {
      setCustomerName(prev => prev || currentUser.name);
      setCustomerEmail(prev => prev || currentUser.email);
    }
  }, [currentUser]);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      setCouponFeedback({ message: 'الرجاء إدخال كود الخصم أولاً.', type: 'error' });
      return;
    }

    setIsValidatingCoupon(true);
    setCouponFeedback(null);

    const codeClean = couponCodeInput.trim().toUpperCase();
    const currentSubTotal = cartItems.reduce((acc, item) => acc + getCartItemPrice(item) * item.quantity, 0);

    try {
      // 1. Try to fetch from Firestore
      let foundCoupon: Coupon | null = null;
      try {
        const q = query(collection(db, 'coupons'), where('code', '==', codeClean));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          foundCoupon = {
            id: querySnapshot.docs[0].id,
            code: docData.code,
            type: docData.type,
            value: Number(docData.value),
            minAmount: Number(docData.minAmount || 0),
            isActive: docData.isActive !== false,
            expiryDate: docData.expiryDate || 'لا ينتهي',
            usageCount: Number(docData.usageCount || 0),
            createdAt: docData.createdAt || '',
            userId: docData.userId,
            is_used: docData.is_used,
            usage_status: docData.usage_status,
            usedAt: docData.usedAt,
          } as Coupon;
        }
      } catch (firestoreError) {
        console.warn("Could not fetch coupon from Firestore, checking localStorage...", firestoreError);
      }

      // 2. Fallback to localStorage if not found or firestore failed
      if (!foundCoupon) {
        const localCouponsRaw = localStorage.getItem('king_store_coupons');
        if (localCouponsRaw) {
          const localCoupons = JSON.parse(localCouponsRaw) as Coupon[];
          const localMatch = localCoupons.find(c => c.code.toUpperCase() === codeClean);
          if (localMatch) {
            foundCoupon = localMatch;
          }
        }
      }

      // Check validations
      if (!foundCoupon) {
        setCouponFeedback({ message: 'كود الخصم غير صحيح أو غير موجود.', type: 'error' });
        setAppliedCoupon(null);
        return;
      }

      if (foundCoupon.userId && currentUser?.email && foundCoupon.userId.toLowerCase() !== currentUser.email.toLowerCase()) {
        setCouponFeedback({ message: 'هذا الكوبون غير مصرح لك باستخدامه.', type: 'error' });
        setAppliedCoupon(null);
        return;
      }

      if (!foundCoupon.isActive) {
        setCouponFeedback({ message: 'كود الخصم هذا لم يعد نشطاً.', type: 'error' });
        setAppliedCoupon(null);
        return;
      }

      // Check is_used for one-time reward coupons
      if (foundCoupon.is_used === true || foundCoupon.usage_status === 'used') {
        setCouponFeedback({ message: 'تم استخدام هذا الكوبون مسبقاً ولا يمكن استخدامه مرة أخرى.', type: 'error' });
        setAppliedCoupon(null);
        return;
      }

      // Check minAmount
      if (currentSubTotal < foundCoupon.minAmount) {
        setCouponFeedback({
          message: `عذراً، هذا الكوبون يتطلب حد أدنى للمشتريات بقيمة ${formatPrice(foundCoupon.minAmount)}`,
          type: 'error'
        });
        setAppliedCoupon(null);
        return;
      }

      // Success
      setAppliedCoupon(foundCoupon);
      const discountVal = foundCoupon.type === 'percentage' ? `${foundCoupon.value}%` : formatPrice(foundCoupon.value);
      setCouponFeedback({
        message: `تم تطبيق كود الخصم بنجاح! خصم بقيمة ${discountVal}`,
        type: 'success'
      });
    } catch (err) {
      console.error("Error validating coupon:", err);
      setCouponFeedback({ message: 'حدث خطأ أثناء التحقق من كود الخصم.', type: 'error' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponFeedback(null);
  };

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

  // Coupon Discount calculation
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percentage') {
      couponDiscountAmount = subTotal * (appliedCoupon.value / 100);
    } else {
      couponDiscountAmount = Math.min(subTotal, appliedCoupon.value);
    }
  }

  const finalSubTotal = Math.max(0, subTotal - couponDiscountAmount);

  // 10% customs/import tax applied strictly on physical/tangible products
  const physicalImportTax = hasPhysicalProducts ? (physicalSubTotal * 0.10) : 0;

  const totalAmount = finalSubTotal + finalDeliveryFee + physicalImportTax;

  // Split payment calculations
  const effectiveIsSplitPayment = hasPhysicalProducts && isSplitPayment;
  
  const digitalSubTotal = cartItems
    .filter(item => item.product.type === 'digital')
    .reduce((acc, item) => acc + getCartItemPrice(item) * item.quantity, 0);

  // Apply the coupon discount proportionally to digital and physical subtotals for split payment
  const physicalRatio = subTotal > 0 ? (physicalSubTotal / subTotal) : 0;
  const discountedPhysicalSubTotal = Math.max(0, physicalSubTotal - (couponDiscountAmount * physicalRatio));
  const discountedDigitalSubTotal = Math.max(0, digitalSubTotal - (couponDiscountAmount * (1 - physicalRatio)));

  const totalPhysical = discountedPhysicalSubTotal + finalDeliveryFee + physicalImportTax;

  const amountPaidAdvance = effectiveIsSplitPayment
    ? discountedDigitalSubTotal + (0.50 * totalPhysical)
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
  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAgreedToPolicies) {
      setCheckoutError('⚠️ يرجى الموافقة على الشروط والأحكام وسياسة خصوصية المتجر لمتابعة عملية الدفع.');
      return;
    }

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
    if (selectedGateway && selectedGateway.id !== 'cash_on_delivery') {
      // Dynamic validation of fields
      if (selectedGateway.fields && selectedGateway.fields.length > 0) {
        for (const field of selectedGateway.fields) {
          if (!gatewayFieldValues[field.key]?.trim()) {
            setCheckoutError(`يرجى ملء حقل "${field.label}" لتأكيد الدفع.`);
            return;
          }
        }
      } else {
        // Fallback validation for default fields
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

    const finalSenderName = gatewayFieldValues.sender_name || gatewayFieldValues.senderName || senderName || mtnSenderName || syriatelSenderName || (selectedGatewayId !== 'cash_on_delivery' ? senderName : undefined);
    const finalTransactionId = gatewayFieldValues.txn_id || gatewayFieldValues.transactionId || transactionId || mtnTransactionId || syriatelTransactionId || (selectedGatewayId !== 'cash_on_delivery' ? transactionId : undefined);
    const finalPhoneNumber = gatewayFieldValues.phone_number || gatewayFieldValues.phoneNumber || mtnPhone || syriatelPhone || undefined;

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
      payment_status: effectiveIsSplitPayment ? 'partially_paid' : 'unpaid',
      couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      couponDiscount: appliedCoupon ? couponDiscountAmount : undefined
    };

    if (currentUser) {
      setPendingOrder(newOrder);
      setEnteredPin('');
      setPinModalError('');
      setCheckoutSetupPin('');
      setCheckoutSetupConfirmPin('');
      if (currentUser.paymentPin) {
        setIsSettingPinInCheckout(false);
      } else {
        setIsSettingPinInCheckout(true);
      }
      setIsPinModalOpen(true);
    } else {
      await executeOrder(newOrder);
    }
  };

  const executeOrder = async (orderToPlace: Order) => {
    // If coupon is used, increment usageCount in Firestore & local storage
    if (appliedCoupon) {
      try {
        const couponRef = doc(db, 'coupons', appliedCoupon.id);
        const updates: any = {
          usageCount: (appliedCoupon.usageCount || 0) + 1
        };
        // If it's a reward coupon, mark it as used so it cannot be used again
        if (appliedCoupon.code.startsWith('RWD') || appliedCoupon.code.startsWith('REF')) {
          updates.is_used = true;
          updates.isActive = false;
          updates.usage_status = 'used';
          updates.usedAt = new Date().toISOString();
        }
        await updateDoc(couponRef, updates);
      } catch (err) {
        console.warn("Could not update coupon usage count in Firestore, trying localStorage...", err);
      }

      try {
        const localCouponsRaw = localStorage.getItem('king_store_coupons');
        if (localCouponsRaw) {
          const localCoupons = JSON.parse(localCouponsRaw) as Coupon[];
          const updated = localCoupons.map(c => c.id === appliedCoupon.id ? { ...c, usageCount: (c.usageCount || 0) + 1 } : c);
          safeLocalStorageSetItem('king_store_coupons', updated);
        }
      } catch (e) {
        console.warn("Could not update local storage coupon:", e);
      }
    }

    setCreatedOrder(orderToPlace);
    onPlaceOrder(orderToPlace);
    setStep('success');
    onClearCart();
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !pendingOrder) return;

    setPinModalError('');

    if (isSettingPinInCheckout) {
      // Setup PIN
      const cleanSetup = checkoutSetupPin.trim();
      const cleanConfirm = checkoutSetupConfirmPin.trim();

      if (!/^\d{4}$/.test(cleanSetup)) {
        setPinModalError('يجب أن يتكون رمز PIN من 4 أرقام فقط ⚠️');
        return;
      }

      if (cleanSetup !== cleanConfirm) {
        setPinModalError('رمز PIN وتأكيد الرمز غير متطابقين ❌');
        return;
      }

      try {
        const encrypted = encryptPin(cleanSetup);
        const userDocRef = doc(db, 'users', currentUser.email.toLowerCase());
        const updates: any = {
          paymentPin: encrypted,
          tempPin: null,
          tempPinExpiry: null,
          mustChangePin: false
        };
        await updateDoc(userDocRef, updates);

        if (onUpdateUser) {
          onUpdateUser({
            ...currentUser,
            ...updates
          });
        }

        setIsPinModalOpen(false);
        await executeOrder(pendingOrder);
      } catch (err: any) {
        console.error('Error setting PIN during checkout:', err);
        setPinModalError('فشل حفظ الرمز السري. يرجى المحاولة لاحقاً.');
      }
    } else {
      // Verify PIN
      const cleanEntered = enteredPin.trim();
      const encryptedEntered = encryptPin(cleanEntered);
      const now = new Date().toISOString();

      // Check for permanent PIN
      const isPermanentMatch = encryptedEntered === currentUser.paymentPin;
      
      // Check for temporary PIN
      const isTempMatch = currentUser.tempPin === encryptedEntered && 
                          currentUser.tempPinExpiry && 
                          currentUser.tempPinExpiry > now;

      if (isPermanentMatch || isTempMatch) {
        if (currentUser.mustChangePin || isTempMatch) {
          // Force them to change it now if they are using a temp pin or have the flag
          setPinModalError('تم قبول الرمز المؤقت. لحمايتك، يرجى تعيين رمز PIN دائم جديد الآن 🔐');
          setIsSettingPinInCheckout(true);
          setEnteredPin('');
        } else {
          setIsPinModalOpen(false);
          await executeOrder(pendingOrder);
        }
      } else {
        setPinModalError('رمز PIN السري غير صحيح! يرجى التحقق وإعادة المحاولة ❌');
      }
    }
  };

  const handleBiometricAuth = () => {
    if (!currentUser || !pendingOrder) return;
    if (isSettingPinInCheckout) {
      setPinModalError('يرجى أولاً تعيين رمز PIN لإتاحة خيارات المصادقة البيومترية 🔐');
      return;
    }
    
    setIsBiometricScanning(true);
    setPinModalError('');
    
    setTimeout(async () => {
      setIsBiometricScanning(false);
      // Native-like popup warning that it's a placeholder
      setPinModalError('المصادقة البيومترية (WebAuthn / بصمة الإصبع) ستكون متاحة قريباً كبديل فائق الأمان لرمز الـ PIN! 📲');
    }, 1500);
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
                              {formatPrice(finalDeliveryFee)}
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
                                  {/* Dynamic fields from Firestore */}
                                  {gw.fields && gw.fields.length > 0 ? (
                                    gw.fields.map((field) => (
                                      <div key={field.key}>
                                        <label className="block text-[11px] font-semibold text-amber-200/70 mb-1">
                                          {field.label} *
                                        </label>
                                        <input
                                          type="text"
                                          value={gatewayFieldValues[field.key] || ""}
                                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                          placeholder={field.placeholder}
                                          className={`block w-full text-xs border border-amber-500/20 rounded-lg p-2.5 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                            field.key.includes('txn') || field.key.includes('id') || field.key.includes('number') || field.key.includes('phone')
                                              ? 'font-mono'
                                              : 'font-sans'
                                          }`}
                                          required
                                        />
                                      </div>
                                    ))
                                  ) : (
                                    <>
                                      {/* Fallback to default fields if no fields defined in database */}
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

                {/* Website Policies Confirmation Block */}
                {policies.length > 0 && (
                  <div className="space-y-3 bg-slate-950/40 border border-amber-500/10 p-4 rounded-xl text-right">
                    <h3 className="text-xs font-bold text-white border-b border-amber-500/10 pb-1.5 flex items-center gap-1.5 justify-start">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span>سياسات المتجر والأحكام القانونية</span>
                    </h3>
                    <p className="text-[10px] text-amber-100/60 leading-relaxed text-right">
                      يرجى قراءة والموافقة على سياسات المتجر وأحكام الاستخدام والخصوصية لمتابعة إتمام الطلب والدفع بأمان.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 pt-1 pb-2 justify-start">
                      {policies.map((policy) => (
                        <button
                          key={policy.id}
                          type="button"
                          onClick={() => {
                            setActivePolicyToRead(policy);
                            setIsViewingPoliciesModal(true);
                          }}
                          className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/20 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <FileText className="h-3 w-3" />
                          <span>إطلاع على {policy.title}</span>
                        </button>
                      ))}
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none justify-start">
                      <input
                        type="checkbox"
                        checked={isAgreedToPolicies}
                        onChange={(e) => setIsAgreedToPolicies(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-amber-500/20 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        id="agree-to-policies-checkbox"
                      />
                      <span className="text-[11px] font-bold text-slate-200 leading-tight text-right">
                        أوافق بالكامل وأقر بالتزامي بجميع <span className="text-amber-400 underline hover:text-amber-300 cursor-pointer" onClick={(e) => { e.preventDefault(); setIsViewingPoliciesModal(true); if(policies.length > 0) setActivePolicyToRead(policies[0]); }}>الشروط والسياسات</span> الموضحة أعلاه لشراء المنتجات. *
                      </span>
                    </label>
                  </div>
                )}

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

              {/* Coupon Section */}
              <div className="mb-4 bg-slate-950/40 p-3.5 rounded-xl border border-amber-500/10 text-right space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Tag className="h-4 w-4 text-amber-500" />
                  <span>هل لديك كود خصم أو قسيمة شراء؟</span>
                </div>
                
                {!appliedCoupon ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أدخل الكود (مثال: SAVE10)"
                      value={couponCodeInput}
                      onChange={(e) => {
                        setCouponCodeInput(e.target.value);
                        if (couponFeedback) setCouponFeedback(null);
                      }}
                      className="flex-1 bg-slate-950/60 border border-amber-500/10 rounded-lg px-3 py-1.5 text-xs text-slate-100 text-center uppercase focus:border-amber-500/40 focus:outline-none placeholder-slate-500 font-black"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 text-slate-950 font-black px-4 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      {isValidatingCoupon ? 'جاري التحقق...' : 'تطبيق'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>تم تطبيق الكود: <span className="underline font-mono text-amber-400 font-black">{appliedCoupon.code}</span></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-400 hover:text-red-300 text-[10px] font-bold border border-red-500/20 px-2 py-1 rounded-md bg-red-950/10 transition-colors"
                    >
                      إلغاء الكود
                    </button>
                  </div>
                )}

                {couponFeedback && (
                  <p className={`text-[10px] font-bold ${couponFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {couponFeedback.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 mb-4 text-xs font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>قيمة المنتجات:</span>
                  <span className="text-slate-200">{formatPrice(subTotal)}</span>
                </div>
                {appliedCoupon && couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>خصم الكود الترويجي ({appliedCoupon.code}):</span>
                    <span>- {formatPrice(couponDiscountAmount)}</span>
                  </div>
                )}
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

      {/* Store Policy Viewer Modal Overlay */}
      {isViewingPoliciesModal && activePolicyToRead && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4 animate-fade-in" dir="rtl" onClick={() => setIsViewingPoliciesModal(false)}>
          <div 
            className="relative max-w-xl w-full bg-slate-900 border border-amber-500/20 rounded-[2rem] overflow-hidden shadow-2xl p-6 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-500 to-yellow-500" />
            
            <button
              type="button"
              onClick={() => setIsViewingPoliciesModal(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 mb-4 border-b border-slate-800 pb-3 justify-start">
              <Shield className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-black text-white">{activePolicyToRead.title}</h3>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold max-h-[350px] overflow-y-auto whitespace-pre-wrap bg-slate-950/60 p-4 rounded-2xl border border-slate-800 shadow-inner mb-6 text-right">
              {activePolicyToRead.content}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4 flex-wrap gap-3">
              <span className="text-[10px] text-slate-500 font-bold">آخر تحديث للسياسة: {activePolicyToRead.updatedAt}</span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsViewingPoliciesModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAgreedToPolicies(true);
                    setIsViewingPoliciesModal(false);
                  }}
                  className="px-4.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1 shadow-md shadow-amber-500/10 cursor-pointer animate-pulse"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>الموافقة والالتزام بالشروط</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPinModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/95 p-4 animate-fade-in" dir="rtl" onClick={() => setIsPinModalOpen(false)}>
          <div 
            className="relative max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl p-6 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-500 to-yellow-500" />
            
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-3 mb-6">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-3 animate-pulse">
                <Lock className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-base font-black text-white">
                {isSettingPinInCheckout ? 'تعيين رمز PIN الأول لحسابك 🛡️' : 'تأكيد رمز PIN للدفع السري 🔐'}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs leading-relaxed">
                {isSettingPinInCheckout 
                  ? 'لحماية رصيد نقاطك الملكية، يرجى تعيين رمز PIN من 4 أرقام لتأكيد عمليات الشراء والتحويل.' 
                  : 'يرجى إدخال رمز PIN السري الخاص بحسابك لتمرير عملية الشراء واعتماد الطلب بنجاح.'}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              {isSettingPinInCheckout ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block text-right">رمز PIN الجديد (4 أرقام)</label>
                    <div className="relative">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Key className="h-4 w-4" />
                      </span>
                      <input
                        type="password"
                        pattern="\d*"
                        maxLength={4}
                        value={checkoutSetupPin}
                        onChange={(e) => setCheckoutSetupPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="رمز PIN مكون من 4 أرقام"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-center font-mono tracking-[0.5em]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300 block text-right">تأكيد الرمز السري</label>
                    <div className="relative">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Key className="h-4 w-4" />
                      </span>
                      <input
                        type="password"
                        pattern="\d*"
                        maxLength={4}
                        value={checkoutSetupConfirmPin}
                        onChange={(e) => setCheckoutSetupConfirmPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="أعد إدخال الرمز السري لتأكيده"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-center font-mono tracking-[0.5em]"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center gap-2" dir="ltr">
                    {/* Unified password numeric input with secure display */}
                    <div className="relative w-full">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Key className="h-4 w-4 text-amber-500" />
                      </span>
                      <input
                        type="password"
                        pattern="\d*"
                        maxLength={4}
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="••••"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3.5 pr-10 pl-10 text-lg text-white text-center font-mono tracking-[0.8em]"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {pinModalError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pinModalError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSettingPinInCheckout ? 'حفظ الرمز السري وإتمام الدفع 👑' : 'تأكيد الرمز وإتمام الدفع الآمن 🚀'}</span>
              </button>
            </form>

            {/* WebAuthn Biometric Section */}
            {!isSettingPinInCheckout && (
              <div className="mt-5 pt-4 border-t border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 font-bold block mb-2.5">أو المصادقة البديلة السريعة</span>
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={isBiometricScanning}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 border border-amber-500/10 hover:border-amber-500/20 text-xs font-extrabold transition-all cursor-pointer"
                >
                  {isBiometricScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      <span>جاري فحص بصمة الإصبع / الوجه...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 text-amber-500 animate-pulse" />
                      <span>تسجيل الدخول بيومترياً (WebAuthn)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
