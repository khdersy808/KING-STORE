/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType = 'physical' | 'digital';

export interface DeliveryRule {
  days: number;
  modifierType: 'discount_percentage' | 'multiplier' | 'fixed_discount';
  value: number;
}

export interface DeliverySettings {
  id: string; // 'global'
  basePricePerDay: number; // Price per day
  rules?: DeliveryRule[];
  // Logistics & Shipping Config (Air vs Sea)
  airBaseCost?: number;
  airUrgencyFactor?: number;
  airWeightVolumeFactor?: number;
  seaBaseCost?: number;
  seaDailyDecay?: number;
  seaMinBaseline?: number;
}

export interface ProductReview {
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number; // 1-5
  comment: string;
  date: string; // ISO string
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: ProductType;
  category: string;
  imageUrl: string;
  images?: string[]; // مصفوفة الصور الجديدة لرفع أكثر من صورة
  colors?: string[]; // مصفوفة الألوان المتوفرة للمنتج
  stock?: number; // للمنتجات الملموسة
  downloadUrl?: string; // للمنتجات غير الملموسة (رقمية)
  licenseKeys?: string[]; // مفاتيح ترخيص أو أكواد للمنتجات الرقمية
  reviews?: ProductReview[]; // تقييمات وآراء العملاء
  discountPercentage?: number; // نسبة الخصم الخاصة بالمنتجة (0-100)
  sizes?: string[]; // مقاسات الملابس المتوفرة
  options?: { name: string; values: string[] }[]; // خيارات إضافية (مثل: السعة، المادة، الخ)
  specifications?: string; // مواصفات عامة (مثل: هاتف ذكي، فاخر، وذهبي)
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentGatewayField {
  key: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  iconName: string;
  isEnabled: boolean;
  instructions: string; // تعليمات الدفع للعميل
  accountIdentifier?: string; // الرقم أو المعرّف (رقم حساب، رقم محفظة، الخ)
  qrCodeUrl?: string; // رابط صورة الـ QR Code الخاصة بالحساب
  customIconUrl?: string; // صورة الأيقونة المخصصة المرفوعة من الأدمن
  fields: PaymentGatewayField[];
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  type: ProductType;
  selectedSize?: string; // المقاس المختار إن وجد
  selectedColor?: string; // اللون المختار إن وجد
  selectedOptions?: Record<string, string>; // الخيارات الأخرى المختارة
}

export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string; // مطلوب للمنتجات الملموسة فقط
  items: OrderItem[];
  totalAmount: number;
  paymentMethodId: string;
  paymentDetails: Record<string, string>; // القيم المدخلة لبوابة الدفع
  receiptUrl?: string; // رابط صورة الإيصال المرفوعة
  status: OrderStatus;
  date: string;
  senderName?: string;
  transactionId?: string;
  deliveryDate?: string; // ISO string
  deliveryFee?: number;
  import_tax?: number;
  payment_type?: 'standard' | 'split_50_50';
  amount_paid_advance?: number;
  amount_due_on_delivery?: number;
  payment_status?: 'fully_paid' | 'partially_paid' | 'unpaid';
  couponCode?: string;
  couponDiscount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // المقاس المختار
  selectedColor?: string; // اللون المختار
  selectedOptions?: Record<string, string>; // الخيارات الأخرى المختارة
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer' | 'agent';
  referralCode?: string;
  points?: number;
  coupons?: string[];
  deviceId?: string;
  referredBy?: string;
  referralApplied?: boolean;
  paymentPin?: string;
  wishlist?: string[];
  lastCheckInDate?: string;
  checkInStreak?: number;
  tempPassword?: string;
  tempPasswordExpiry?: string;
  tempPin?: string;
  tempPinExpiry?: string;
  mustChangePassword?: boolean;
  mustChangePin?: boolean;
  fcmToken?: string;
  isConvertingPoints?: boolean;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  profitPercentage: number;
  ordersCount: number;
  commissionStatus: 'pending' | 'paid';
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  date: string;
  isRead: boolean;
}

export interface AppNotification {
  id: string;
  userId: string; // 'admin' or user email/id to filter who sees it
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'order_created' | 'order_status_updated' | 'system';
  orderId?: string;
}

export interface CouponRule {
  id: string;
  discount: number;
  minPurchase: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount: number;
  isActive: boolean;
  expiryDate: string;
  usageCount: number;
  createdAt: string;
  userId?: string; // To track who redeemed it
  is_used?: boolean; // For single-use redeemed coupons
  usage_status?: 'unused' | 'used';
  usedAt?: string;
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  updatedAt: string;
}


