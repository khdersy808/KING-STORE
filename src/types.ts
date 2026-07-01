/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType = 'physical' | 'digital';

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
  stock?: number; // للمنتجات الملموسة
  downloadUrl?: string; // للمنتجات غير الملموسة (رقمية)
  licenseKeys?: string[]; // مفاتيح ترخيص أو أكواد للمنتجات الرقمية
  reviews?: ProductReview[]; // تقييمات وآراء العملاء
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
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

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
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'customer';
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

