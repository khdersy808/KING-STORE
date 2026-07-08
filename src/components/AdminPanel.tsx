/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, PaymentGateway, Order, ProductType, OrderStatus, Coupon, User, DeliverySettings, Policy } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';
import AIImageLab from './AIImageLab';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Smartphone,
  Wallet,
  Building,
  Truck,
  Package,
  ListOrdered,
  TrendingUp,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle2,
  Download,
  DollarSign,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  UserPlus,
  Users,
  Copy,
  ExternalLink,
  Shield,
  Search,
  Filter,
  Printer,
  Calendar,
  FileText,
  Mail,
  Phone,
  MapPin,
  Activity,
  Tags,
  Crown,
  MessageSquare,
  Percent,
  Link as LinkIcon,
  RotateCcw
} from 'lucide-react';
import { auth, db, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc } from '../lib/firebase';
import AgentDashboard from './AgentDashboard';
import MessagingSystem from './MessagingSystem';

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  gateways: PaymentGateway[];
  onUpdateGateway: (gateway: PaymentGateway) => void;
  onAddGateway: (gateway: PaymentGateway) => void;
  onDeleteGateway: (gatewayId: string) => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  users: User[];
  onDeleteUser: (userId: string) => void;
  categories: string[];
  onAddCategory: (categoryName: string) => Promise<void>;
  onDeleteCategory: (categoryName: string) => Promise<void>;
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onShowToast: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

type AdminTab = 'analytics' | 'products' | 'categories' | 'gateways' | 'orders' | 'admins' | 'agents' | 'messages' | 'discounts' | 'settings' | 'ai-lab' | 'policies';

export default function AdminPanel({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  gateways,
  onUpdateGateway,
  onAddGateway,
  onDeleteGateway,
  orders,
  onUpdateOrderStatus,
  users,
  onDeleteUser,
  categories,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategory,
  onShowToast
}: AdminPanelProps) {
  const { t, texts, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [adminEmail, setAdminEmail] = useState<string | null>(() => {
    const saved = localStorage.getItem('king_store_current_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        return user.email;
      } catch (e) {}
    }
    return null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setAdminEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Product form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formType, setFormType] = useState<ProductType>('physical');
  const [formCategory, setFormCategory] = useState(() => categories[0] || 'إلكترونيات');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formColors, setFormColors] = useState<string[]>([]);
  const [formImageFileName, setFormImageFileName] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formDownloadUrl, setFormDownloadUrl] = useState('');
  const [formLicenseKeys, setFormLicenseKeys] = useState('');
  const [formSizes, setFormSizes] = useState('');
  const [formSpecifications, setFormSpecifications] = useState('');
  const [formOptions, setFormOptions] = useState<{ name: string; values: string }[]>([]);
  const [productFormError, setProductFormError] = useState('');

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    let error = '';

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        error = 'حجم إحدى الصور كبير جداً. الحد الأقصى 2 ميجابايت لكل صورة.';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          setFormImages((prev) => [...prev, ...newImages]);
          if (!formImageUrl) setFormImageUrl(newImages[0]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (error) {
      setProductFormError(error);
    } else {
      setProductFormError('');
    }
  };

  // AI Smart Product Creator states
  const [aiProductDesc, setAiProductDesc] = useState('');
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);
  const [aiProductError, setAiProductError] = useState('');
  const [showAiProductCreator, setShowAiProductCreator] = useState(false);

  // AI Image generation states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAspectRatio, setAiAspectRatio] = useState('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [aiError, setAiError] = useState('');
  const [showAiImageHelper, setShowAiImageHelper] = useState(false);

  // Payment gateway selected for configuration
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [gatewayInstructions, setGatewayInstructions] = useState('');
  const [gatewayAccountIdentifier, setGatewayAccountIdentifier] = useState('');
  const [gatewayQrCodeUrl, setGatewayQrCodeUrl] = useState('');
  const [gatewayCustomIconUrl, setGatewayCustomIconUrl] = useState('');
  const [gatewayFieldLabels, setGatewayFieldLabels] = useState<Record<string, string>>({});
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGateway | null>(null);

  // Add custom payment gateway states
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [newGatewayName, setNewGatewayName] = useState('');
  const [newGatewayIcon, setNewGatewayIcon] = useState('CreditCard');
  const [newGatewayInstructions, setNewGatewayInstructions] = useState('');
  const [newGatewayAccount, setNewGatewayAccount] = useState('');
  const [newGatewayQrCode, setNewGatewayQrCode] = useState('');
  const [newGatewayCustomIcon, setNewGatewayCustomIcon] = useState('');
  const [newGatewayFields, setNewGatewayFields] = useState<{ key: string; label: string; placeholder: string; value: string }[]>([]);

  // Category management local states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editCategoryNewValue, setEditCategoryNewValue] = useState('');
  const [categoryFormError, setCategoryFormError] = useState('');
  
  // Custom fields form states
  const [fieldKey, setFieldKey] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [gatewayFormError, setGatewayFormError] = useState('');

  // Admin invitation and management states
  const [adminEmailToInvite, setAdminEmailToInvite] = useState('');
  const [invitationSuccessMsg, setInvitationSuccessMsg] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [invitations, setInvitations] = useState<{ id: string; email: string; createdAt: string; status: 'pending' | 'completed' }[]>(() => {
    const saved = localStorage.getItem('king_store_admin_invitations');
    return saved ? JSON.parse(saved) : [];
  });

  // Advanced Order Management States
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'physical' | 'digital'>('all');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [trackingNotes, setTrackingNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('king_store_order_tracking_notes');
    return saved ? JSON.parse(saved) : {};
  });

  // Advanced Product Management States
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');

  // Discounts & Coupons States
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('king_store_coupons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('king_store_coupons', JSON.stringify(coupons));
  }, [coupons]);

  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Coupon Form States
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState<number>(10);
  const [couponMinAmount, setCouponMinAmount] = useState<number>(0);
  const [couponExpiryDate, setCouponExpiryDate] = useState('');
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [couponFormError, setCouponFormError] = useState('');
  const [couponFormSuccess, setCouponFormSuccess] = useState('');

  // Global Discount States
  const [globalDiscountPercentage, setGlobalDiscountPercentage] = useState<number>(0);
  const [savingGlobalDiscount, setSavingGlobalDiscount] = useState(false);
  const [globalDiscountSuccess, setGlobalDiscountSuccess] = useState('');
  
  // Per-Product Discount States
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productDiscountPercentage, setProductDiscountPercentage] = useState<number>(0);
  const [isUpdatingProductDiscount, setIsUpdatingProductDiscount] = useState(false);
  const [productDiscountSuccess, setProductDiscountSuccess] = useState('');
  
  // WhatsApp Support States
  const [whatsappLink, setWhatsappLink] = useState('https://wa.me/9639827419');
  const [whatsappMessage, setWhatsappMessage] = useState('أهلاً KING STORE، لدي استفسار بخصوص طلبي...');
  const [isUpdatingWhatsapp, setIsUpdatingWhatsapp] = useState(false);
  const [whatsappSuccess, setWhatsappSuccess] = useState('');

  // Currency Exchange Rate States
  const [exchangeRateInput, setExchangeRateInput] = useState<number>(15000);
  const [savingExchangeRate, setSavingExchangeRate] = useState(false);
  const [exchangeRateSuccess, setExchangeRateSuccess] = useState('');

  // Exclusive Discounts Section States
  const [discountsSectionTitle, setDiscountsSectionTitle] = useState('عروض ملوك الأسبوع الحصرية 👑');
  const [discountsSectionDesc, setDiscountsSectionDesc] = useState('خصومات استثنائية تصل إلى 30٪ على أفخم السلع!');
  const [discountsSectionProducts, setDiscountsSectionProducts] = useState<string[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');
  const [isUpdatingDiscountsSection, setIsUpdatingDiscountsSection] = useState(false);
  const [discountsSectionSuccess, setDiscountsSectionSuccess] = useState('');

  // Delivery Time Settings States
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    id: 'global_settings',
    basePricePerDay: 5,
    rules: [],
    airBaseCost: 40,
    airUrgencyFactor: 8,
    airWeightVolumeFactor: 1.5,
    seaBaseCost: 15,
    seaDailyDecay: 0.5,
    seaMinBaseline: 5
  });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (err) {
          console.error("Error in confirm action:", err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
      confirmText,
      cancelText
    });
  };

  // Policies States
  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const saved = localStorage.getItem('king_store_policies');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    return [
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
  });

  useEffect(() => {
    localStorage.setItem('king_store_policies', JSON.stringify(policies));
  }, [policies]);

  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState('');
  const [policyIsActive, setPolicyIsActive] = useState(true);
  const [policyFormError, setPolicyFormError] = useState('');
  const [policyFormSuccess, setPolicyFormSuccess] = useState('');

  const [newRuleDays, setNewRuleDays] = useState<number>(10);
  const [newRuleType, setNewRuleType] = useState<'discount_percentage' | 'multiplier' | 'fixed_discount'>('discount_percentage');
  const [newRuleValue, setNewRuleValue] = useState<number>(10);
  const [deliverySavedSuccess, setDeliverySavedSuccess] = useState('');

  // Admin Testing Simulator State
  const [testDays, setTestDays] = useState<number>(3);

  // Synchronize Delivery Settings from Firestore
  useEffect(() => {
    try {
      const docRef = doc(db, 'delivery_config', 'global_settings');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDeliverySettings({ 
            id: docSnap.id, 
            basePricePerDay: data.basePricePerDay ?? 5, 
            rules: data.rules ?? [],
            airBaseCost: data.airBaseCost ?? 40,
            airUrgencyFactor: data.airUrgencyFactor ?? 8,
            airWeightVolumeFactor: data.airWeightVolumeFactor ?? 1.5,
            seaBaseCost: data.seaBaseCost ?? 15,
            seaDailyDecay: data.seaDailyDecay ?? 0.5,
            seaMinBaseline: data.seaMinBaseline ?? 5
          } as DeliverySettings);
        }
      }, (error) => {
        console.warn("Error loading delivery settings:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase delivery settings sync not active.", e);
    }
  }, []);

  // Synchronize Coupons from Firestore
  useEffect(() => {
    try {
      const q = collection(db, 'coupons');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Coupon[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
        });
        list.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.localeCompare(a.createdAt);
          }
          return 0;
        });
        setCoupons(list);
      }, (error) => {
        console.warn("Error loading coupons from Firestore:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase coupons sync not active.", e);
    }
  }, []);

  // Synchronize Policies from Firestore
  useEffect(() => {
    try {
      const q = collection(db, 'policies');
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const list: Policy[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Policy);
        });

        // If Firestore policies collection is completely empty,
        // automatically seed it with the default policies so they are editable immediately
        if (snapshot.empty) {
          const defaultPolicies = [
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

          try {
            for (const policy of defaultPolicies) {
              const docRef = doc(db, 'policies', policy.id);
              const { id, ...policyData } = policy;
              await setDoc(docRef, policyData);
            }
          } catch (err) {
            console.warn("Could not auto-seed default policies:", err);
          }
          return;
        }

        setPolicies(list);
      }, (error) => {
        console.warn("Error loading policies from Firestore:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase policies sync not active.", e);
    }
  }, []);

  // Synchronize Settings from Firestore
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'discounts');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.globalDiscount === 'number') {
            setGlobalDiscountPercentage(data.globalDiscount);
          }
        }
      }, (error) => {
        console.warn("Error loading global discount setting:", error);
      });

      // Sync WhatsApp Settings
      const whatsappRef = doc(db, 'settings', 'whatsapp');
      const unsubscribeWhatsapp = onSnapshot(whatsappRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const link = data.whatsappLink || data.supportUrl || 'https://wa.me/9639827419';
          const msg = data.whatsappMessage || data.supportMessage || 'أهلاً KING STORE، لدي استفسار بخصوص طلبي...';
          setWhatsappLink(link);
          setWhatsappMessage(msg);
        } else {
          setWhatsappLink('https://wa.me/9639827419');
          setWhatsappMessage('أهلاً KING STORE، لدي استفسار بخصوص طلبي...');
        }
      }, (error) => {
        console.warn("Error loading WhatsApp settings in AdminPanel:", error);
        setWhatsappLink('https://wa.me/9639827419');
        setWhatsappMessage('أهلاً KING STORE، لدي استفسار بخصوص طلبي...');
      });

      // Sync Currency Settings
      const currencyRef = doc(db, 'settings', 'currency');
      const unsubscribeCurrency = onSnapshot(currencyRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.exchangeRate === 'number') {
            setExchangeRateInput(data.exchangeRate);
          }
        }
      });

      // Sync Exclusive Discounts Section Settings
      const discountsSectionRef = doc(db, 'settings', 'discounts_section');
      const unsubscribeDiscountsSection = onSnapshot(discountsSectionRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDiscountsSectionTitle(data.title || 'عروض ملوك الأسبوع الحصرية 👑');
          setDiscountsSectionDesc(data.description || 'خصومات استثنائية تصل إلى 30٪ على أفخم السلع!');
          setDiscountsSectionProducts(data.featuredProducts || []);
        } else {
          setDiscountsSectionTitle('عروض ملوك الأسبوع الحصرية 👑');
          setDiscountsSectionDesc('خصومات استثنائية تصل إلى 30٪ على أفخم السلع!');
          setDiscountsSectionProducts([]);
        }
      }, (error) => {
        console.warn("Error loading discounts section settings in AdminPanel:", error);
      });

      return () => {
        unsubscribe();
        unsubscribeWhatsapp();
        unsubscribeCurrency();
        unsubscribeDiscountsSection();
      };
    } catch (e) {
      console.warn("Firebase settings sync not active.", e);
    }
  }, []);

  // Save Currency Exchange Rate Settings
  const handleSaveExchangeRate = async (value: number) => {
    setSavingExchangeRate(true);
    setExchangeRateSuccess('');
    try {
      const docRef = doc(db, 'settings', 'currency');
      await setDoc(docRef, { exchangeRate: value }, { merge: true });
      setExchangeRateSuccess('تم تحديث سعر صرف الدولار الحالي مقابل الليرة السورية بنجاح! 💵');
      setTimeout(() => setExchangeRateSuccess(''), 3000);
    } catch (err) {
      console.error("Error saving exchange rate:", err);
    } finally {
      setSavingExchangeRate(false);
    }
  };

  // Save Global Storewide Discount
  const handleSaveGlobalDiscount = async (value: number) => {
    setSavingGlobalDiscount(true);
    setGlobalDiscountSuccess('');
    try {
      const docRef = doc(db, 'settings', 'discounts');
      await setDoc(docRef, { globalDiscount: value }, { merge: true });
      setGlobalDiscountSuccess('تم حفظ نسبة الخصم العام بنجاح على المتجر! 🎉');
      setTimeout(() => setGlobalDiscountSuccess(''), 3000);
    } catch (err: any) {
      console.error("Error saving global discount:", err);
    } finally {
      setSavingGlobalDiscount(false);
    }
  };

  // Save Product-specific Discount
  const handleSaveProductDiscount = async () => {
    if (!selectedProductId) return;
    setIsUpdatingProductDiscount(true);
    setProductDiscountSuccess('');
    
    try {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        const updatedProduct = {
          ...product,
          discountPercentage: productDiscountPercentage
        };
        await onUpdateProduct(updatedProduct);
        setProductDiscountSuccess('تم تحديث خصم المنتج بنجاح! ✨');
        setTimeout(() => setProductDiscountSuccess(''), 3000);
      }
    } catch (err) {
      console.error("Error saving product discount:", err);
    } finally {
      setIsUpdatingProductDiscount(false);
    }
  };

  // Save WhatsApp Settings
  const handleSaveWhatsapp = async () => {
    setIsUpdatingWhatsapp(true);
    setWhatsappSuccess('');
    try {
      // Clean the whatsappLink if it contains a '+' in the phone number part
      let cleanedLink = whatsappLink.trim();
      
      if (cleanedLink.includes('wa.me/')) {
        const parts = cleanedLink.split('wa.me/');
        if (parts[1]) {
          const numberPart = parts[1].split('?')[0].replace(/[^0-9]/g, '');
          const queryPart = parts[1].includes('?') ? '?' + parts[1].split('?')[1] : '';
          cleanedLink = `${parts[0]}wa.me/${numberPart}${queryPart}`;
        }
      } else if (cleanedLink.includes('phone=')) {
        const parts = cleanedLink.split('phone=');
        if (parts[1]) {
          const numberPart = parts[1].split('&')[0].replace(/[^0-9]/g, '');
          const afterNumber = parts[1].includes('&') ? '&' + parts[1].substring(parts[1].indexOf('&') + 1) : '';
          cleanedLink = `${parts[0]}phone=${numberPart}${afterNumber}`;
        }
      } else if (!cleanedLink.startsWith('http')) {
        // It's just a raw phone number, strip out any + or non-digits
        cleanedLink = cleanedLink.replace(/[^0-9]/g, '');
      }

      const docRef = doc(db, 'settings', 'whatsapp');
      await setDoc(docRef, {
        whatsappLink: cleanedLink,
        whatsappMessage,
        supportUrl: cleanedLink,
        supportMessage: whatsappMessage
      }, { merge: true });
      
      setWhatsappLink(cleanedLink); // Sync state
      setWhatsappSuccess('تم تحديث إعدادات الدعم بنجاح! ✅');
      setTimeout(() => setWhatsappSuccess(''), 3000);
    } catch (err) {
      console.error("Error saving WhatsApp settings:", err);
    } finally {
      setIsUpdatingWhatsapp(false);
    }
  };

  const handleSaveDiscountsSection = async () => {
    setIsUpdatingDiscountsSection(true);
    setDiscountsSectionSuccess('');
    try {
      const docRef = doc(db, 'settings', 'discounts_section');
      await setDoc(docRef, {
        title: discountsSectionTitle.trim(),
        description: discountsSectionDesc.trim(),
        featuredProducts: discountsSectionProducts
      }, { merge: true });
      setDiscountsSectionSuccess('تم تحديث إعدادات قسم الخصومات الحصرية بنجاح! 👑');
      setTimeout(() => setDiscountsSectionSuccess(''), 3000);
    } catch (err) {
      console.error("Error updating discounts section settings:", err);
    } finally {
      setIsUpdatingDiscountsSection(false);
    }
  };

  const handleAddProductToDiscountsSection = () => {
    if (!selectedProductIdToAdd) return;
    if (discountsSectionProducts.includes(selectedProductIdToAdd)) {
      alert("المنتج مضاف بالفعل إلى قائمة الخصومات الحصرية!");
      return;
    }
    const updated = [...discountsSectionProducts, selectedProductIdToAdd];
    setDiscountsSectionProducts(updated);
    setSelectedProductIdToAdd('');
  };

  const handleRemoveProductFromDiscountsSection = (id: string) => {
    const updated = discountsSectionProducts.filter(pId => pId !== id);
    setDiscountsSectionProducts(updated);
  };

  // Save / Update Coupon
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError('');
    setCouponFormSuccess('');

    const codeClean = couponCode.trim().toUpperCase();
    if (!codeClean) {
      setCouponFormError('الرجاء إدخال كود الخصم');
      return;
    }
    if (couponValue <= 0) {
      setCouponFormError('الرجاء إدخال قيمة خصم صالحة أكبر من صفر');
      return;
    }

    try {
      const couponData = {
        code: codeClean,
        type: couponType,
        value: Number(couponValue),
        minAmount: Number(couponMinAmount),
        isActive: couponIsActive,
        expiryDate: couponExpiryDate || 'لا ينتهي',
        usageCount: editingCoupon ? editingCoupon.usageCount : 0,
        createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString(),
      };

      if (editingCoupon) {
        const docRef = doc(db, 'coupons', editingCoupon.id);
        await setDoc(docRef, couponData, { merge: true });
        setCouponFormSuccess('تم تعديل كود الخصم بنجاح! 🏷️');
      } else {
        // Check for duplicates
        const isDuplicate = coupons.some(c => c.code === codeClean);
        if (isDuplicate) {
          setCouponFormError('كود الخصم هذا موجود بالفعل!');
          return;
        }
        const collectionRef = collection(db, 'coupons');
        await addDoc(collectionRef, couponData);
        setCouponFormSuccess('تم إضافة كود الخصم الجديد بنجاح! 🎉');
      }

      // Reset form
      setCouponCode('');
      setCouponType('percentage');
      setCouponValue(10);
      setCouponMinAmount(0);
      setCouponExpiryDate('');
      setCouponIsActive(true);
      setEditingCoupon(null);
      setIsAddingCoupon(false);

      setTimeout(() => setCouponFormSuccess(''), 3000);
    } catch (err: any) {
      console.error("Error saving coupon:", err);
      setCouponFormError('حدث خطأ أثناء حفظ كود الخصم.');
    }
  };

  // Toggle Coupon Active State
  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const docRef = doc(db, 'coupons', coupon.id);
      await setDoc(docRef, { isActive: !coupon.isActive }, { merge: true });
    } catch (err) {
      console.error("Error toggling coupon:", err);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = (id: string) => {
    triggerConfirm(
      'حذف كود الخصم',
      'هل أنت متأكد من حذف كود الخصم هذا نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
      async () => {
        try {
          const docRef = doc(db, 'coupons', id);
          await deleteDoc(docRef);
        } catch (err) {
          console.error("Error deleting coupon:", err);
        }
      }
    );
  };

  // Load Coupon for Edit
  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponCode(coupon.code);
    setCouponType(coupon.type);
    setCouponValue(coupon.value);
    setCouponMinAmount(coupon.minAmount);
    setCouponExpiryDate(coupon.expiryDate === 'لا ينتهي' ? '' : coupon.expiryDate);
    setCouponIsActive(coupon.isActive);
    setIsAddingCoupon(true);
  };

  // ==========================================
  // WEBSITE POLICIES MANAGEMENT
  // ==========================================

  // Save / Update Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyFormError('');
    setPolicyFormSuccess('');

    const titleClean = policyTitle.trim();
    const contentClean = policyContent.trim();
    if (!titleClean) {
      setPolicyFormError('الرجاء إدخال عنوان السياسة');
      return;
    }
    if (!contentClean) {
      setPolicyFormError('الرجاء إدخال محتوى السياسة');
      return;
    }

    try {
      const policyData = {
        title: titleClean,
        content: contentClean,
        isActive: policyIsActive,
        updatedAt: new Date().toLocaleDateString('ar-EG'),
      };

      if (editingPolicy) {
        const docRef = doc(db, 'policies', editingPolicy.id);
        await setDoc(docRef, policyData, { merge: true });
        // Fallback update
        setPolicies(policies.map(p => p.id === editingPolicy.id ? { ...p, ...policyData } : p));
        setPolicyFormSuccess('تم تعديل السياسة بنجاح! 📜');
      } else {
        const isDuplicate = policies.some(p => p.title.toLowerCase() === titleClean.toLowerCase());
        if (isDuplicate) {
          setPolicyFormError('سياسة بنفس هذا العنوان موجودة بالفعل!');
          return;
        }
        const collectionRef = collection(db, 'policies');
        await addDoc(collectionRef, policyData);
        setPolicyFormSuccess('تم إضافة السياسة الجديدة بنجاح! 🎉');
      }

      // Reset Form
      setPolicyTitle('');
      setPolicyContent('');
      setPolicyIsActive(true);
      setEditingPolicy(null);
      setIsAddingPolicy(false);

      setTimeout(() => setPolicyFormSuccess(''), 3000);
    } catch (err: any) {
      console.error("Error saving policy:", err);
      setPolicyFormError('حدث خطأ أثناء حفظ السياسة.');
    }
  };

  const handleDeletePolicy = (id: string) => {
    triggerConfirm(
      'حذف السياسة',
      'هل أنت متأكد من رغبتك في حذف هذه السياسة بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.',
      async () => {
        try {
          const docRef = doc(db, 'policies', id);
          await deleteDoc(docRef);
          setPolicies(policies.filter(p => p.id !== id));
          onShowToast('نجاح', 'تم حذف السياسة بنجاح من قاعدة البيانات', 'success');
        } catch (err) {
          console.error("Error deleting policy:", err);
          onShowToast('خطأ', 'فشل حذف السياسة من قاعدة البيانات', 'error');
        }
      }
    );
  };

  const handleTogglePolicyActive = async (policy: Policy) => {
    try {
      const docRef = doc(db, 'policies', policy.id);
      // To prevent losing title or content if it is a default/fallback policy not yet fully initialized in Firestore,
      // we save the full policy data.
      const policyData = {
        title: policy.title,
        content: policy.content,
        isActive: !policy.isActive,
        updatedAt: new Date().toLocaleDateString('ar-EG'),
      };
      await setDoc(docRef, policyData, { merge: true });
      setPolicies(policies.map(p => p.id === policy.id ? { ...p, isActive: !p.isActive, updatedAt: policyData.updatedAt } : p));
      onShowToast('نجاح', 'تم تحديث حالة تفعيل السياسة بنجاح', 'success');
    } catch (err) {
      console.error("Error toggling policy status:", err);
      onShowToast('خطأ', 'فشل تحديث حالة السياسة في قاعدة البيانات', 'error');
    }
  };

  const handleRestoreDefaultPolicies = () => {
    triggerConfirm(
      'استعادة السياسات الافتراضية',
      'هل أنت متأكد من رغبتك في استعادة السياسات الافتراضية الثلاثة (الشروط والأحكام، الخصوصية، الاسترجاع) وإضافتها لقاعدة البيانات؟ سيؤدي ذلك إلى إنشاء أو استبدال السياسات الافتراضية ببياناتها الأصلية.',
      async () => {
        try {
          // Explicitly restore each policy with fixed, static document references in Firestore
          const termsDoc = doc(db, 'policies', 'pol-terms');
          await setDoc(termsDoc, {
            title: 'شروط الخدمة والأحكام (Terms of Service)',
            content: `مرحباً بكم في KING STORE. يرجى قراءة الشروط والأحكام التالية بعناية قبل استخدام موقعنا أو إجراء أي عملية شراء:

1. قبول الشروط: باستخدامك للموقع، فإنك توافق تماماً على الالتزام بهذه الشروط وبسياساتنا المعمول بها.
2. الحسابات والطلبات: تلتزم بتقديم معلومات صحيحة ودقيقة عند التسجيل أو الشراء. تحتفظ الإدارة بالحق في إلغاء أو تعليق أي طلب يخضع للشك أو عدم مطابقة البيانات.
3. تفاصيل الدفع: يجب على العميل دفع العربون أو قيمة الفاتورة المحددة بناءً على طريقة الدفع التي تم اختيارها ورفع إيصال تحويل صحيح ومطابق ليتم مراجعة الطلب وشحنه.
4. حقوق الملكية: جميع المحتويات والعلامات التجارية والرموز البرمجية المعروضة على المتجر هي ملك حصري لـ KING STORE.`,
            isActive: true,
            updatedAt: new Date().toLocaleDateString('ar-EG')
          });

          const privacyDoc = doc(db, 'policies', 'pol-privacy');
          await setDoc(privacyDoc, {
            title: 'سياسة الخصوصية وحماية البيانات (Privacy Policy)',
            content: `نحن في KING STORE نضع سرية وحماية بيانات عملائنا على رأس أولوياتنا:

1. جمع المعلومات: نقوم بجمع الاسم، البريد الإلكتروني، ورقم الهاتف، وعنوان الشحن لتسهيل توصيل الطلبات والتواصل معك.
2. حماية البيانات: نستخدم معايير تشفير وأمان قوية لحماية بياناتك من الوصول غير المصرح به.
3. مشاركة البيانات: نحن لا نبيع، ولا نؤجر، ولا نشارك بياناتك الشخصية مع أي جهات خارجية أو أطراف ثالثة لأغراض تسويقية على الإطلاق.
4. التحديثات: قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم إخطاركم بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار بارز في المتجر.`,
            isActive: true,
            updatedAt: new Date().toLocaleDateString('ar-EG')
          });

          const returnDoc = doc(db, 'policies', 'pol-return');
          await setDoc(returnDoc, {
            title: 'سياسة الشحن والاسترجاع (Shipping & Returns)',
            content: `سياسات تسليم البضائع الملموسة والمنتجات الرقمية:

1. المنتجات الرقمية: يتم تسليمها فوراً أو خلال ساعات معدودة عبر البريد الإلكتروني أو الواتساب، وبسبب طبيعتها الفورية فهي غير قابلة للإرجاع أو الاستبدال بعد استلام البيانات أو الرمز.
2. المنتجات الملموسة: نقوم بتوفير خيار تقسيم الفاتورة (50% مقدماً و50% عند الاستلام). يلتزم العميل بفحص البضائع فور وصولها.
3. سياسة الاستبدال: يمكن للعميل تقديم طلب استبدال للمنتجات الملموسة في حال وجود عيب مصنعي أو تلف واضح أثناء الشحن، وذلك خلال مدة لا وتتجاوز 3 أيام من تاريخ الاستلام مع إرفاق صور واضحة للتلف.`,
            isActive: true,
            updatedAt: new Date().toLocaleDateString('ar-EG')
          });
          
          onShowToast('نجاح', 'تم استعادة وإضافة السياسات الافتراضية للمتجر بنجاح! 📜', 'success');
        } catch (err) {
          console.error("Error restoring default policies:", err);
          onShowToast('خطأ', 'فشل استعادة السياسات في قاعدة البيانات', 'error');
        }
      }
    );
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setPolicyTitle(policy.title);
    setPolicyContent(policy.content);
    setPolicyIsActive(policy.isActive);
    setIsAddingPolicy(true);
  };


  // Reset product form
  const resetProductForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    setFormType('physical');
    setFormCategory(categories[0] || 'إلكترونيات');
    setFormImageUrl('');
    setFormImages([]);
    setFormColors([]);
    setFormStock(10);
    setFormDownloadUrl('');
    setFormLicenseKeys('');
    setFormSizes('');
    setFormSpecifications('');
    setFormOptions([]);
    setProductFormError('');
    setEditingProduct(null);
    setIsAddingNew(false);

    // Reset AI Image states
    setAiPrompt('');
    setAiAspectRatio('1:1');
    setIsGeneratingImage(false);
    setGeneratedImageUrl('');
    setAiError('');
    setShowAiImageHelper(false);

    // Reset AI Smart Product states
    setAiProductDesc('');
    setIsGeneratingProduct(false);
    setAiProductError('');
    setShowAiProductCreator(false);
  };

  const handleGenerateAiImage = async () => {
    const promptToUse = aiPrompt.trim() || `${formName} - ${formDescription}`;
    if (!promptToUse.trim() || promptToUse.trim() === '-') {
      setAiError('يرجى إدخال اسم المنتج ووصفه أو كتابة وصف مخصص للذكاء الاصطناعي.');
      return;
    }

    setIsGeneratingImage(true);
    setAiError('');
    setGeneratedImageUrl('');

    try {
      let width = 500;
      let height = 500;
      
      if (aiAspectRatio === '16:9') { width = 896; height = 504; }
      else if (aiAspectRatio === '9:16') { width = 504; height = 896; }
      else if (aiAspectRatio === '4:3') { width = 800; height = 600; }
      else if (aiAspectRatio === '3:4') { width = 600; height = 800; }

      // 2. Sanitize user input before sending to AI
      let sanitizedPrompt = promptToUse;
      const clothingKeywords = ['رجالي', 'نسائي', 'شبابي', 'بناتي', 'أطفال'];
      const hasClothingKeyword = clothingKeywords.some(kw => sanitizedPrompt.includes(kw));
      
      if (hasClothingKeyword) {
        sanitizedPrompt = sanitizedPrompt
          .replace(/رجالي/g, "Men's style apparel piece, flat lay clothing item")
          .replace(/نسائي/g, "Women's style apparel piece, flat lay clothing item")
          .replace(/شبابي/g, "Youth style apparel piece, flat lay clothing item")
          .replace(/بناتي/g, "Girls style apparel piece, flat lay clothing item")
          .replace(/أطفال/g, "Kids style apparel piece, flat lay clothing item");
      }

      // 3. Translate the sanitized prompt to English via backend
      let englishPromptToUse = sanitizedPrompt;
      try {
        const token = await auth.currentUser?.getIdToken(true);
        const transRes = await fetch('/api/ai/translate-prompt', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ prompt: sanitizedPrompt })
        });
        const transData = await transRes.json();
        if (transData.success && transData.translatedPrompt) {
          englishPromptToUse = transData.translatedPrompt;
        }
      } catch (err) {
        console.warn('Translation failed, using original prompt');
      }

      // 4. Enforce strict Negative Prompt and Flat Lay style
      const engineeredPrompt = `
Subject: ${englishPromptToUse}.
Style: Flat lay product photography or invisible mannequin. Isolated product photography only.
Strictly NO humans, NO male or female models, NO faces, NO bodies.
Lighting/Background: Pure studio white background or luxurious marble grey background, 8k resolution, highly detailed, studio lighting, commercial e-commerce product photography.
      `.trim();

      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(engineeredPrompt)}?width=${width}&height=${height}&nologo=true`;
      
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Failed to load image from Pollinations.'));
        img.src = pollinationsUrl;
      });

      setGeneratedImageUrl(pollinationsUrl);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'حدث خطأ غير متوقع أثناء توليد الصورة.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateProductWithAi = async () => {
    if (!aiProductDesc.trim()) {
      setAiProductError('يرجى كتابة وصف للمنتج أولاً لكي يقوم الذكاء الاصطناعي بإنشائه.');
      return;
    }

    setIsGeneratingProduct(true);
    setAiProductError('');
    try {
      const token = await auth.currentUser?.getIdToken(true);
      // 1. Generate Product Details
      const detailsResponse = await fetch('/api/ai/generate-product-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt: aiProductDesc }),
      });

      const detailsData = await detailsResponse.json();
      if (!detailsResponse.ok) {
        throw new Error(detailsData.error || 'فشل في توليد تفاصيل المنتج.');
      }

      // Populate details
      setFormName(detailsData.name || '');
      setFormDescription(detailsData.description || '');
      setFormPrice(Number(detailsData.price) || 0);
      
      // Map category if match
      if (detailsData.category && categories.includes(detailsData.category)) {
        setFormCategory(detailsData.category);
      } else {
        setFormCategory(categories[0] || 'أخرى');
      }

      // 2. Generate Image using the generated imagePrompt
      const imgPromptToUse = detailsData.imagePrompt || `${detailsData.name} studio lighting, commercial photography`;
      
      try {
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPromptToUse)}?width=500&height=500&nologo=true`;
        
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => reject(new Error('Failed'));
          img.src = pollinationsUrl;
        });

        setFormImageUrl(pollinationsUrl);
      } catch (err) {
        console.warn('Image generation failed, but product details were created.');
        setAiProductError('تم توليد تفاصيل المنتج بنجاح، ولكن فشل توليد الصورة تلقائياً. يمكنك توليدها يدوياً.');
      }

      // Reset prompt and keep creator active/inactive
      setAiProductDesc('');
      setShowAiProductCreator(false);
    } catch (err: any) {
      console.error(err);
      setAiProductError(err.message || 'حدث خطأ أثناء توليد المنتج بالذكاء الاصطناعي.');
    } finally {
      setIsGeneratingProduct(false);
    }
  };

  // Populate product form for editing
  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsAddingNew(false);
    setFormName(product.name);
    setFormDescription(product.description);
    setFormPrice(product.price);
    setFormType(product.type || 'physical');
    setFormCategory(product.category);
    setFormImageUrl(product.imageUrl);
    setFormStock(product.stock || 0);
    setFormDownloadUrl(product.downloadUrl || '');
    setFormLicenseKeys(product.licenseKeys?.join(', ') || '');
    setFormSizes(product.sizes?.join(', ') || '');
    setFormSpecifications(product.specifications || '');
    setFormColors(product.colors || []);
    setFormOptions(product.options?.map(o => ({ name: o.name, values: o.values.join(', ') })) || []);
  };

  // Handle updating product
  const handleUpdateProduct = async (product: Product) => {
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        name: product.name,
        description: product.description,
        price: product.price,
        type: product.type,
        category: product.category,
        imageUrl: product.imageUrl,
        images: product.images,
        colors: product.colors,
        stock: product.stock,
        downloadUrl: product.downloadUrl,
        licenseKeys: product.licenseKeys,
        sizes: product.sizes,
      });
      onUpdateProduct(product);
      onShowToast('تم التعديل', 'تم تحديث بيانات المنتج بنجاح', 'success');
    } catch (error) {
      console.error(error);
      onShowToast('خطأ', 'فشل تحديث المنتج في قاعدة البيانات', 'error');
    }
  };

  // Handle saving product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formDescription.trim() || formPrice <= 0) {
      setProductFormError('يرجى ملء جميع الحقول المطلوبة وكتابة سعر صحيح.');
      return;
    }

    setProductFormError('');

    const licenseKeysArray = formLicenseKeys
      ? formLicenseKeys.split(',').map(k => k.trim()).filter(Boolean)
      : undefined;

    const parsedSizesArray = formSizes
      ? formSizes.split(/[,،]/).map(s => s.trim().toUpperCase()).filter(Boolean)
      : undefined;

    const isEligibleForSizes = formCategory === 'ملابس' || 
                               formCategory === 'أحذية' ||
                               formCategory.toLowerCase().includes('clothing') || 
                               formCategory.toLowerCase().includes('apparel') ||
                               formCategory.toLowerCase().includes('shoes') ||
                               formCategory.toLowerCase().includes('footwear');

    // Automatically collect all data from the form state
    const productData: any = {
      name: formName.trim(),
      description: formDescription.trim(),
      specifications: formSpecifications.trim(),
      options: formOptions.length > 0 ? formOptions.map(opt => ({
        name: opt.name,
        values: typeof opt.values === 'string' ? opt.values.split(/[,،]/).map(v => v.trim()).filter(Boolean) : opt.values
      })) : [],
      price: Number(formPrice),
      type: formType,
      category: formCategory,
      imageUrl: formImageUrl.trim() || (formImages.length > 0 ? formImages[0] : 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'),
      images: formImages.length > 0 ? formImages : [formImageUrl.trim() || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'],
      colors: formType === 'physical' ? formColors : [],
      updatedAt: new Date().toISOString()
    };

    // Add optional fields only if they have values to avoid Firestore "undefined" errors
    if (formType === 'physical') {
      productData.stock = Number(formStock);
    }
    
    if (formType === 'digital') {
      if (formDownloadUrl.trim()) productData.downloadUrl = formDownloadUrl.trim();
      if (licenseKeysArray && licenseKeysArray.length > 0) productData.licenseKeys = licenseKeysArray;
    }

    if (formType === 'physical' && isEligibleForSizes && parsedSizesArray && parsedSizesArray.length > 0) {
      productData.sizes = parsedSizesArray;
    } else {
      productData.sizes = [];
    }

    if (editingProduct) {
      productData.reviews = editingProduct.reviews || [];
    } else {
      productData.reviews = [];
    }

    try {
      if (editingProduct) {
        // Update existing product in Firestore
        await setDoc(doc(db, 'products', editingProduct.id), productData, { merge: true });
        onShowToast('تم التحديث بنجاح 🎉', 'تم تحديث بيانات المنتج بنجاح في المتجر والفايربيس.', 'success');
        setEditingProduct(null);
      } else {
        // Add new product to Firestore
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString()
        });
        onShowToast('تمت الإضافة بنجاح 🎉', 'تم إضافة المنتج بنجاح إلى المتجر والفايربيس 🎉', 'success');
      }
      
      // Reset Form and close the editor
      resetProductForm();
      setIsAddingNew(false);
      
      // The table will update automatically thanks to the Firestore onSnapshot listener in App.tsx
    } catch (error) {
      console.error('Error saving product to Firestore:', error);
      setProductFormError('حدث خطأ أثناء حفظ المنتج في الفايربيس. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleExportProductsCSV = () => {
    // Columns: اسم المنتج الرقمي, الفئة, السعر الحالي, كمية المخزون المتوفرة, حالة المنتج
    const headers = [
      'اسم المنتج الرقمي',
      'الفئة (Category)',
      'السعر الحالي ($)',
      'كمية المخزون المتوفرة (Stock)',
      'حالة المنتج'
    ];

    const rows = products.map(p => {
      // Stock description
      let stockDesc = '';
      if (p.type === 'physical') {
        stockDesc = p.stock !== undefined ? `${p.stock} قطعة` : '0 قطعة';
      } else {
        stockDesc = 'منتج رقمي (غير محدود)';
      }

      // All products are active by default in our list
      const status = 'نشط';

      return [
        p.name,
        p.category,
        `$${p.price}`,
        stockDesc,
        status
      ];
    });

    // Escape CSV values containing commas, quotes or newlines
    const escapeCSV = (val: string) => {
      let clean = val.replace(/"/g, '""');
      if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
        clean = `"${clean}"`;
      }
      return clean;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // UTF-8 BOM
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory_and_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Populate gateway form for editing
  const startEditGateway = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setGatewayInstructions(gateway.instructions);
    setGatewayAccountIdentifier(gateway.accountIdentifier || '');
    setGatewayQrCodeUrl(gateway.qrCodeUrl || '');
    setGatewayCustomIconUrl(gateway.customIconUrl || '');
    const initialLabels: Record<string, string> = {};
    gateway.fields.forEach(f => {
      initialLabels[f.key] = f.label;
    });
    setGatewayFieldLabels(initialLabels);
  };

  // Handle saving payment gateway configuration
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateway) return;

    const updatedFields = editingGateway.fields.map(f => ({
      ...f,
      label: gatewayFieldLabels[f.key] || f.label
    }));

    const updatedGateway: PaymentGateway = {
      ...editingGateway,
      instructions: gatewayInstructions,
      accountIdentifier: gatewayAccountIdentifier.trim() || undefined,
      qrCodeUrl: gatewayQrCodeUrl.trim() || undefined,
      customIconUrl: gatewayCustomIconUrl.trim() || undefined,
      fields: updatedFields
    };

    onUpdateGateway(updatedGateway);
    setEditingGateway(null);
  };

  const handleAddCustomField = () => {
    if (!fieldKey.trim() || !fieldLabel.trim()) {
      setGatewayFormError('يرجى ملء مفتاح الحقل والاسم الظاهر.');
      return;
    }
    // ensure key is alphanumeric/underscore only
    const keyFormatted = fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (newGatewayFields.some(f => f.key === keyFormatted)) {
      setGatewayFormError('مفتاح الحقل هذا مستخدم بالفعل.');
      return;
    }

    setNewGatewayFields(prev => [
      ...prev,
      {
        key: keyFormatted,
        label: fieldLabel.trim(),
        placeholder: fieldPlaceholder.trim(),
        value: ''
      }
    ]);

    setFieldKey('');
    setFieldLabel('');
    setFieldPlaceholder('');
    setGatewayFormError('');
  };

  const handleRemoveCustomField = (keyToRemove: string) => {
    setNewGatewayFields(prev => prev.filter(f => f.key !== keyToRemove));
  };

  const handleCreateGatewaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGatewayName.trim() || !newGatewayInstructions.trim()) {
      setGatewayFormError('يرجى ملء اسم بوابة الدفع والتعليمات.');
      return;
    }

    const newGateway: PaymentGateway = {
      id: `custom_gw_${Date.now()}`,
      name: newGatewayName.trim(),
      iconName: newGatewayIcon,
      isEnabled: true,
      instructions: newGatewayInstructions.trim(),
      accountIdentifier: newGatewayAccount.trim() || undefined,
      qrCodeUrl: newGatewayQrCode.trim() || undefined,
      customIconUrl: newGatewayCustomIcon.trim() || undefined,
      fields: newGatewayFields
    };

    onAddGateway(newGateway);

    // Reset States
    setNewGatewayName('');
    setNewGatewayIcon('CreditCard');
    setNewGatewayInstructions('');
    setNewGatewayAccount('');
    setNewGatewayQrCode('');
    setNewGatewayCustomIcon('');
    setNewGatewayFields([]);
    setIsAddingGateway(false);
    setGatewayFormError('');
  };

  // Analytics Helpers
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length;

  const physicalProductsCount = products.filter(p => p.type === 'physical').length;
  const digitalProductsCount = products.filter(p => p.type === 'digital').length;

  // Real-time filtered products for search and filter experience
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(productSearchQuery.toLowerCase());
      const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
      const matchesType = productTypeFilter === 'all' || p.type === productTypeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [products, productSearchQuery, productCategoryFilter, productTypeFilter]);

  // Generate last 7 days array of objects for the charts
  const chartData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD
      
      // Format the date label (e.g., "26 June")
      const monthNames = texts.monthNames;
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      // Filter completed orders for sales revenue
      const dailyCompletedOrders = orders.filter(o => {
        if (!o.date) return false;
        const oDate = o.date.split('T')[0];
        return oDate === dateStr && o.status === 'completed';
      });
      const revenue = dailyCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Filter all orders for order frequency
      const dailyOrders = orders.filter(o => {
        if (!o.date) return false;
        const oDate = o.date.split('T')[0];
        return oDate === dateStr;
      });
      const orderCount = dailyOrders.length;

      data.push({
        date: dateStr,
        label,
        revenue,
        orderCount
      });
    }
    return data;
  }, [orders]);

  const getGatewayIcon = (iconName: string, customIconUrl?: string) => {
    if (customIconUrl) {
      return <img src={customIconUrl} alt="أيقونة البوابة" className="h-5 w-5 object-contain rounded bg-white" referrerPolicy="no-referrer" />;
    }
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="h-5 w-5 text-amber-600" />;
      case 'Smartphone': return <Smartphone className="h-5 w-5 text-amber-600" />;
      case 'Wallet': return <Wallet className="h-5 w-5 text-amber-600" />;
      case 'Building': return <Building className="h-5 w-5 text-amber-600" />;
      case 'Truck': return <Truck className="h-5 w-5 text-amber-600" />;
      default: return <CreditCard className="h-5 w-5 text-amber-600" />;
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6" dir={dir}>
      
      {/* Title & Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{texts.adminPanelTitle}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {texts.adminPanelDesc}
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveTab('analytics'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{texts.analyticsTab}</span>
          </button>
          <button
            onClick={() => { setActiveTab('products'); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>{texts.productsTab.replace('{count}', products.length.toString())}</span>
          </button>
          <button
            onClick={() => { setActiveTab('categories'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Tags className="h-4 w-4" />
            <span>{texts.categoriesTab.replace('{count}', categories.length.toString())}</span>
          </button>
          <button
            onClick={() => { setActiveTab('discounts'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'discounts'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <Percent className="h-4 w-4 text-amber-500" />
            <span>{texts.discountsTab}</span>
          </button>
          <button
            onClick={() => { setActiveTab('settings'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <Settings className="h-4 w-4 text-amber-500" />
            <span>إعدادات المتجر ⚙️</span>
          </button>
          <button
            onClick={() => { setActiveTab('gateways'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'gateways'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>{texts.gatewaysTab.replace('{count}', gateways.length.toString())}</span>
          </button>
          <button
            onClick={() => { setActiveTab('orders'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            <span>{texts.ordersTab.replace('{count}', orders.length.toString())}</span>
          </button>
          <button
            onClick={() => { setActiveTab('admins'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'admins'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>{texts.usersTab} ({users.filter(u => u.role === 'admin').length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('agents'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <Crown className="h-4 w-4 text-amber-500" />
            <span>{texts.agentsTab} 👑</span>
          </button>
          <button
            onClick={() => { setActiveTab('messages'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-amber-500" />
            <span>{texts.messagesTab} 💬</span>
          </button>
          <button
            onClick={() => { setActiveTab('ai-lab'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ai-lab'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>معمل الصور الملكي 🤖</span>
          </button>
          <button
            onClick={() => { setActiveTab('policies'); resetProductForm(); }}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'policies'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-amber-500/30'
            }`}
          >
            <FileText className="h-4 w-4 text-amber-500" />
            <span>سياسات الموقع 📜</span>
          </button>
        </div>
      </div>
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Bento Statistics Grid */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Total Revenue */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <span className="text-xs font-bold text-slate-400">{texts.totalRevenueAnalytics}</span>
                <h3 className="mt-2 text-3xl font-black text-amber-600">${totalRevenue.toLocaleString()}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">{texts.orderStatusCompleted}</span>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3.5 text-amber-600">
                <DollarSign className="h-6 w-6 stroke-[2.5]" />
              </div>
            </div>

            {/* Total Orders */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <span className="text-xs font-bold text-slate-400">{texts.ordersTab.replace('({count})', '')}</span>
                <h3 className="mt-2 text-3xl font-black text-slate-900">{orders.length} {texts.ordersDone.replace(':', '')}</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  {pendingOrdersCount} {texts.pending} / {completedOrdersCount} {texts.done}
                </span>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3.5 text-blue-600">
                <ListOrdered className="h-6 w-6" />
              </div>
            </div>

            {/* Physical Products */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <span className="text-xs font-bold text-slate-400">{texts.physicalProductsCountAnalytics}</span>
                <h3 className="mt-2 text-3xl font-black text-blue-600">{physicalProductsCount} {texts.physicalProducts.split(' ')[1]}</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">{texts.physicalProduct}</span>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3.5 text-blue-600">
                <Package className="h-6 w-6" />
              </div>
            </div>

            {/* Digital Products */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <span className="text-xs font-bold text-slate-400">{texts.digitalProductsCountAnalytics}</span>
                <h3 className="mt-2 text-3xl font-black text-emerald-600">{digitalProductsCount} {texts.digitalProducts.split(' ')[1]}</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">{texts.digitalProduct}</span>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3.5 text-emerald-600">
                <Download className="h-6 w-6" />
              </div>
            </div>

          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Sales Revenue Bar Chart */}
            <div className="rounded-2xl border border-zinc-800/80 bg-[#0d0d0d] p-6 shadow-xl flex flex-col">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <h4 className="text-sm font-bold text-zinc-100">{texts.dailyRevenueTitle}</h4>
                <p className="text-[10px] text-zinc-400 mt-1">{texts.dailyRevenueDesc}</p>
              </div>
              <div className="h-72 w-full mt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#71717a" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                      formatter={(value) => [`$${value}`, texts.revenueLabel]}
                      labelFormatter={(label) => `${texts.createdAt}: ${label}`}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Frequency Line Chart */}
            <div className="rounded-2xl border border-zinc-800/80 bg-[#0d0d0d] p-6 shadow-xl flex flex-col">
              <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                <h4 className="text-sm font-bold text-zinc-100">{texts.orderFrequencyTitle}</h4>
                <p className="text-[10px] text-zinc-400 mt-1">{texts.orderFrequencyDesc}</p>
              </div>
              <div className="h-72 w-full mt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#71717a" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5' }}
                      formatter={(value) => [`${value} ${texts.ordersDone.replace(':', '')}`, texts.orderCountLabel]}
                      labelFormatter={(label) => `${texts.createdAt}: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orderCount" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      activeDot={{ r: 6 }} 
                      dot={{ strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick Help Tips */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>نصائح للملك: إدارة المنتجات بنجاح</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              تطبيقك يدعم نوعين من المنتجات: <strong>المنتجات الملموسة</strong> التي تتطلب شحناً (وتدعم الدفع عند الاستلام)، و<strong>المنتجات غير الملموسة</strong> (رقمية مثل الكورسات والتراخيص) التي يتم توصيلها بشكل فوري ومباشر إلى العميل بمجرد تأكيد دفعه أونلاين. تأكد من إعداد بوابات الدفع الخاصة بك أدناه لتلقي الأموال بنجاح!
            </p>
          </div>
        </div>
      )}

      {/* TAB: AGENTS (إدارة الوكلاء والمحافظات) */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-[#0d0d0d] p-6 shadow-xl">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-6">إحصائيات المبيعات النشطة للمحافظات</h3>
            <div className="h-64 sm:h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'دمشق', sales: 58000 },
                  { name: 'حلب', sales: 42000 },
                  { name: 'حمص', sales: 31000 },
                ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="sales" name="المبيعات الكلية" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-[#0d0d0d] p-6 shadow-xl">
            <AgentDashboard isAdminMode={true} />
          </div>
        </div>
      )}

      {/* TAB: MESSAGES (نظام الرسائل والمحادثات) */}
      {activeTab === 'messages' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* WhatsApp Support Settings Form */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">إعدادات الدعم الفني (واتساب)</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">تخصيص رابط التواصل المباشر للزبائن</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* WhatsApp Link */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest px-1">رابط الواتساب المباشر</label>
                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="مثال: https://wa.me/9639xxxxxxxx"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 pr-12 pl-5 text-slate-950 font-black text-sm focus:border-emerald-500 focus:bg-white focus:outline-none transition-all"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-5">
                        <LinkIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest px-1">رسالة الترحيب الافتراضية</label>
                    <textarea
                      rows={4}
                      placeholder="اكتب الرسالة التي تظهر للزبون عند فتح المحادثة..."
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-5 text-slate-950 font-medium text-sm focus:border-emerald-500 focus:bg-white focus:outline-none transition-all text-right"
                    />
                  </div>

                  {whatsappSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-3 animate-bounce">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{whatsappSuccess}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isUpdatingWhatsapp}
                    onClick={handleSaveWhatsapp}
                    className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-emerald-400 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer group/btn"
                  >
                    {isUpdatingWhatsapp ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                    <span>{isUpdatingWhatsapp ? 'جاري الحفظ...' : 'حفظ إعدادات الدعم'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Messaging System Interface */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-zinc-800/80 bg-[#0d0d0d] shadow-2xl overflow-hidden h-full">
                <MessagingSystem />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form (Create or Edit) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {editingProduct ? <Edit2 className="h-5 w-5 text-amber-600" /> : <Plus className="h-5 w-5 text-amber-600" />}
                  <span>{editingProduct ? 'تعديل بيانات المنتج الحالي' : 'إضافة منتج جديد للمتجر'}</span>
                </h3>
                {(editingProduct || isAddingNew) && (
                  <button
                    onClick={resetProductForm}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!isAddingNew && !editingProduct ? (
                <div className="text-center py-8 space-y-3">
                  <Package className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">اختر تعديل على أي منتج، أو اضغط على الزر أدناه لإضافة منتج جديد.</p>
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
                    id="admin-add-product-btn"
                  >
                    + إضافة منتج جديد
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveProduct} className="space-y-4 text-right">
                  
                  {/* AI Smart Product Creator Panel */}
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                        <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                        <span>الصانع السحري بالذكاء الاصطناعي 🪄</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAiProductCreator(!showAiProductCreator)}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-500/10 px-2 py-1 rounded-lg transition"
                      >
                        {showAiProductCreator ? 'إخفاء ✕' : 'جرب الآن ✨'}
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      صِف المنتج الذي تريد إضافته (مثال: "سماعات قيمنق محيطية باللون الأحمر وسعرها 150 ريال") وسيقوم الذكاء الاصطناعي بتوليد الاسم، والوصف الاحترافي، والسعر، والتصنيف، وصورة ثلاثية الأبعاد مطابقة للمنتج فوراً!
                    </p>

                    {showAiProductCreator && (
                      <div className="space-y-2 pt-2 border-t border-amber-500/10 transition-all">
                        <textarea
                          placeholder="اكتب وصفاً مختصراً أو مفصلاً للمنتج المراد صنعه بالذكاء الاصطناعي..."
                          value={aiProductDesc || ""}
                          onChange={(e) => setAiProductDesc(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-amber-500/20 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none text-right font-medium animate-fade-in"
                        />
                        
                        {aiProductError && (
                          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold text-right">
                            {aiProductError}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isGeneratingProduct}
                          onClick={handleGenerateProductWithAi}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingProduct ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                              <span>جاري التوليد السحري وتصميم الصورة... ✨</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-slate-950" />
                              <span>اصنع المنتج والصورة فوراً 🪄</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ساعة يد ملكية ذهبية"
                      value={formName || ""}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الوصف والمميزات *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="اكتب وصفاً مفصلاً وجذاباً للمنتج ومواصفاته..."
                      value={formDescription || ""}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>

                  {/* Specifications */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المواصفات البارزة (مثال: هاتف ذكي، فاخر، وذهبي)</label>
                    <input
                      type="text"
                      placeholder="هذا النص سيظهر باللون الأحمر الجريء في حقيبة التسوق"
                      value={formSpecifications || ""}
                      onChange={(e) => setFormSpecifications(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Price & Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">السعر ($) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Price"
                        value={formPrice || ''}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <CustomSelect
                        label="الفئة"
                        value={formCategory}
                        onChange={setFormCategory}
                        options={categories.map(cat => ({ label: cat, value: cat }))}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('categories');
                        }}
                        className="text-[9px] text-amber-600 hover:text-amber-700 font-bold mt-1 flex items-center gap-1"
                      >
                        ⚙️ إدارة وتخصيص الفئات في لوحة التحكم
                      </button>
                    </div>
                  </div>

                  {/* Available Sizes for Apparel/Clothing or Shoes/Footwear categories */}
                  {formType === 'physical' && (formCategory === 'ملابس' || 
                    formCategory === 'أحذية' || 
                    formCategory.toLowerCase().includes('clothing') || 
                    formCategory.toLowerCase().includes('apparel') ||
                    formCategory.toLowerCase().includes('shoes') ||
                    formCategory.toLowerCase().includes('footwear')) && (
                    <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/15 space-y-1.5 animate-slide-up">
                      <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <span>👟 المقاسات المتوفرة (للملابس أو الأحذية)</span>
                        <span className="text-[10px] text-amber-600 font-normal">(مطلوب للاختيار قبل الإضافة للسلة)</span>
                      </label>
                      <input
                        type="text"
                        placeholder={
                          formCategory === 'أحذية' || 
                          formCategory.toLowerCase().includes('shoes') || 
                          formCategory.toLowerCase().includes('footwear') 
                            ? "مثال: 40, 41, 42, 43" 
                            : "مثال: S, M, L, XL"
                        }
                        value={formSizes}
                        onChange={(e) => setFormSizes(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/10 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none text-right font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500 block leading-normal">
                        اكتب المقاسات مفصولة بفاصلة (مثال: S, M, L, XL أو للأحذية: 40, 41, 42, 43). سيتمكن العميل من اختيار مقاسه قبل الإضافة إلى السلة، وسيظهر لك مقاسه بوضوح في الطلب.
                      </span>
                    </div>
                  )}

                  {/* Product Type (Physical vs Digital) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع المنتج</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType('physical')}
                        className={`rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                          formType === 'physical'
                            ? 'border-amber-500 bg-amber-500/5 text-amber-700 font-extrabold'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        📦 منتج ملموس (شحن)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType('digital')}
                        className={`rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                          formType === 'digital'
                            ? 'border-emerald-500 bg-emerald-50/5 text-emerald-700 font-extrabold'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        ⚡ منتج غير ملموس (رقمي)
                      </button>
                    </div>
                  </div>

                  {/* Conditional Fields based on product type */}
                  {formType === 'physical' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الكمية المتاحة في المخزن *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Stock qty"
                        value={formStock}
                        onChange={(e) => setFormStock(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">رابط تحميل الملف / الخدمة الرقمية *</label>
                        <input
                          type="url"
                          required
                          placeholder="https://example.com/download-link"
                          value={formDownloadUrl || ""}
                          onChange={(e) => setFormDownloadUrl(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">أكواد الترخيص الجاهزة للتسليم (مفصولة بفاصلة)</label>
                        <input
                          type="text"
                          placeholder="KEY-1234, KEY-5678, KEY-9900"
                          value={formLicenseKeys || ""}
                          onChange={(e) => setFormLicenseKeys(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">سيتم إرسال كود واحد تلو الآخر للعملاء مع كل عملية شراء ناجحة.</span>
                      </div>
                    </div>
                  )}

                  {/* Image URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">صورة المنتج (توليد مباشر بالذكاء الاصطناعي 🎨 أو رابط صورة)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAiImageHelper(!showAiImageHelper);
                          // Initialize custom prompt if empty
                          if (!aiPrompt) {
                            setAiPrompt(formName ? `${formName} ${formDescription ? '- ' + formDescription.slice(0, 50) : ''}` : '');
                          }
                        }}
                        className="text-[10px] font-bold text-amber-600 flex items-center gap-1 hover:text-amber-700 bg-amber-500/10 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>توليد صورة بالذكاء الاصطناعي 🪄</span>
                      </button>
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-amber-400 focus-within:bg-white transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleProductImageUpload}
                          className="flex-1 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 focus:outline-none cursor-pointer"
                        />
                        {formImages.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {formImages.map((img, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={img}
                                  alt={`Preview ${idx}`}
                                  className="h-10 w-10 object-cover rounded border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFormImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                                >
                                  <X className="h-2 w-2" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {formImageFileName && (
                        <p className="mt-1 text-[10px] text-emerald-600 font-medium">الملف المرفق: {formImageFileName}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-500">سيتم حفظ الصور المرفوعة، أو الصورة المولدة بالذكاء الاصطناعي إن وُجدت.</p>
                    </div>

                    {/* Colors Selection */}
                    {formType === 'physical' && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-700 mb-2">الألوان المتوفرة</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {["أسود", "أبيض", "أحمر", "أزرق", "أخضر", "كحلي", "رمادي"].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setFormColors(prev => 
                                  prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
                                );
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                formColors.includes(color)
                                  ? 'bg-amber-500 text-white shadow-md'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="أضف لوناً آخر..."
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val && !formColors.includes(val)) {
                                  setFormColors([...formColors, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {formColors.filter(c => !["أسود", "أبيض", "أحمر", "أزرق", "أخضر", "كحلي", "رمادي"].includes(c)).map(color => (
                            <span key={color} className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              {color}
                              <button type="button" onClick={() => setFormColors(prev => prev.filter(c => c !== color))}>&times;</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Options Selection */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-100/50 border border-slate-200 shadow-inner">
                      <label className="block text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Settings className="h-3.5 w-3.5 text-amber-500" />
                        <span>خيارات مخصصة إضافية للمنتج (مثلاً: السعة، المادة)</span>
                      </label>
                      <div className="space-y-3">
                        {formOptions.map((opt, idx) => (
                          <div key={idx} className="grid grid-cols-[1fr,1.5fr,auto] gap-2 items-end bg-white p-2.5 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">اسم الخيار</label>
                              <input
                                type="text"
                                placeholder="السعة"
                                value={opt.name}
                                onChange={(e) => {
                                  const newOpts = [...formOptions];
                                  newOpts[idx].name = e.target.value;
                                  setFormOptions(newOpts);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] focus:border-amber-400 focus:bg-white outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1">القيم (مفصولة بفاصلة)</label>
                              <input
                                type="text"
                                placeholder="128GB, 256GB"
                                value={opt.values}
                                onChange={(e) => {
                                  const newOpts = [...formOptions];
                                  newOpts[idx].values = e.target.value;
                                  setFormOptions(newOpts);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] focus:border-amber-400 focus:bg-white outline-none transition-colors"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormOptions(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFormOptions([...formOptions, { name: '', values: '' }])}
                          className="w-full py-2.5 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl text-[11px] font-bold hover:border-amber-300 hover:text-amber-600 transition-all cursor-pointer bg-white/50 hover:bg-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>إضافة خيار منتج مخصص جديد</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Image Generation Panel */}
                    {showAiImageHelper && (
                      <div className="mt-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3 transition-all duration-300">
                        <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                          <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>مساعد إنشاء الصور بالذكاء الاصطناعي (Gemini)</span>
                          </h5>
                          <button
                            type="button"
                            onClick={() => setShowAiImageHelper(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-2 text-right">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">صِف الشيء الذي تريد توليد صورة له بالذكاء الاصطناعي (باللغة العربية):</label>
                            <textarea
                              placeholder="مثال: حذاء جري رياضي ذكي بلون أزرق برّاق ومستقبلية مع إضاءة نيون هادئة..."
                              value={aiPrompt || ""}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              rows={2.5}
                              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:border-amber-400 focus:outline-none text-right font-medium"
                            />
                            <span className="text-[9px] text-zinc-500 block mt-1">
                              💡 اكتب وصفاً دقيقاً ومفصلاً للشيء الذي تريده، وسيقوم الذكاء الاصطناعي برسمه وتجسيده لك فوراً دون الحاجة لأي روابط خارجية!
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <CustomSelect
                                label="أبعاد الصورة (Aspect Ratio):"
                                value={aiAspectRatio}
                                onChange={(val) => setAiAspectRatio(val)}
                                options={[
                                  { label: '1:1 (مربع - افتراضي)', value: '1:1' },
                                  { label: '16:9 (عريض - لاندسكيب)', value: '16:9' },
                                  { label: '9:16 (رأسي - بورتريت)', value: '9:16' },
                                  { label: '4:3 (شاشة كلاسيكية)', value: '4:3' },
                                  { label: '3:4 (رأسي كلاسيكي)', value: '3:4' }
                                ]}
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                disabled={isGeneratingImage}
                                onClick={handleGenerateAiImage}
                                className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition cursor-pointer"
                              >
                                {isGeneratingImage ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>جاري رسم المنتج... 🎨</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>توليد الصورة 🎨</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {aiError && (
                            <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg">
                              {aiError}
                            </p>
                          )}

                          {generatedImageUrl && (
                            <div className="mt-3 border border-slate-200 rounded-lg p-2 bg-white flex flex-col items-center gap-2">
                              <img
                                src={generatedImageUrl}
                                alt="Generated product image"
                                className="max-h-48 w-full object-contain rounded border border-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormImageUrl(generatedImageUrl);
                                  setShowAiImageHelper(false);
                                }}
                                className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 text-xs flex items-center justify-center gap-1 transition"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>استخدام هذه الصورة للمنتج</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {productFormError && (
                    <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      <span>{productFormError}</span>
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      إلغاء الأمر
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      {editingProduct ? 'تعديل وحفظ' : 'إضافة الآن'}
                    </button>
                  </div>

                </form>
              )}
            </div>
          </div>

          {/* Right Column: Products Table / List */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-base font-bold text-slate-900">كل منتجات KING STORE</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportProductsCSV}
                      className="rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-1.5 text-[11px] font-bold text-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-50/30"
                      title="تصدير بيانات المنتجات والمخزون الحالي بصيغة CSV ملائمة للاكسل"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تصدير المخزون والمبيعات (CSV)</span>
                    </button>
                    {productSearchQuery || productCategoryFilter !== 'all' || productTypeFilter !== 'all' ? (
                      <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                        المعروضة: {filteredProducts.length} من {products.length}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                        إجمالي الأصناف: {products.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Real-time Search & Filtering Panel */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث باسم المنتج أو الوصف..."
                      value={productSearchQuery || ""}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 text-xs focus:border-amber-400 focus:outline-none focus:bg-slate-50/50 bg-slate-50 text-right font-medium"
                    />
                    {productSearchQuery && (
                      <button
                        onClick={() => setProductSearchQuery('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Category Filter */}
                    <div className="min-w-[150px]">
                      <CustomSelect
                        label="تصنيف المنتجات:"
                        value={productCategoryFilter}
                        onChange={(val) => setProductCategoryFilter(val)}
                        options={[
                          { label: 'كل التصنيفات', value: 'all' },
                          ...categories.map(cat => ({ label: cat, value: cat }))
                        ]}
                      />
                    </div>

                    {/* Type Filter */}
                    <div className="min-w-[150px]">
                      <CustomSelect
                        label="نوع المنتجات:"
                        value={productTypeFilter}
                        onChange={(val) => setProductTypeFilter(val)}
                        options={[
                          { label: 'كل الأنواع', value: 'all' },
                          { label: 'منتجات ملموسة', value: 'physical' },
                          { label: 'منتجات رقمية', value: 'digital' }
                        ]}
                      />
                    </div>
                  </div>
                  
                  {/* Delivery Time Option */}
                  {/* Removed: Delivery options are now managed globally */}
                </div>
              </div>

              {products.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  لا يوجد منتجات لعرضها. أضف منتجاً جديداً الآن من اليسار!
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm space-y-2">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto animate-bounce" />
                  <p className="font-bold">عذراً، لم نجد أي منتجات تطابق بحثك الحالي!</p>
                  <p className="text-xs text-slate-400">تأكد من مراجعة الكلمات المدخلة أو التصفيات المحددة.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="p-4">المنتج</th>
                        <th className="p-4">النوع</th>
                        <th className="p-4">السعر</th>
                        <th className="p-4">المخزن / الرابط</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 rounded-lg object-cover bg-slate-100 border border-slate-200/60"
                              />
                              <div className="min-w-0 max-w-xs sm:max-w-sm">
                                <h4 className="font-bold text-slate-900 truncate">{p.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{p.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {p.type === 'physical' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                <Package className="h-3 w-3" />
                                <span>ملموس</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <Download className="h-3 w-3" />
                                <span>رقمي</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-bold text-slate-900">${p.price}</td>
                          <td className="p-4">
                            {p.type === 'physical' ? (
                              <span className={`font-semibold ${p.stock && p.stock <= 3 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                {p.stock} قطعة
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 inline-block truncate max-w-40" title={p.downloadUrl}>
                                رابط مباشر ⚡
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEditProduct(p)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="تعديل المنتج"
                                id={`edit-prod-${p.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDeleteProduct(p.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="حذف المنتج"
                                id={`delete-prod-${p.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB: CUSTOM PRODUCT CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Right Column: Manage / Add Category */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-500" />
                <span>إضافة فئة جديدة</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                أنشئ فئات خاصة بمتجرك لتنظيم منتجاتك وتسهيل تصفحها وفلترتها للمشترين بطريقة مميزة.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setCategoryFormError('');
                const name = newCategoryName.trim();
                if (!name) {
                  setCategoryFormError('يرجى إدخال اسم الفئة.');
                  return;
                }
                if (categories.includes(name)) {
                  setCategoryFormError('هذه الفئة موجودة بالفعل.');
                  return;
                }
                await onAddCategory(name);
                setNewCategoryName('');
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الفئة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ألعاب الواقع الافتراضي، مقتنيات"
                    value={newCategoryName || ""}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none text-right font-medium"
                  />
                </div>

                {categoryFormError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold text-right">
                    {categoryFormError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة الفئة الملكية الجديدة ✨</span>
                </button>
              </form>
            </div>

            {/* Editing State Box */}
            {editingCategoryName && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-4 animate-fade-in">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-blue-600" />
                  <span>تعديل اسم الفئة</span>
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  تعديل اسم الفئة سيقوم تلقائياً بتحديث كافة المنتجات المرتبطة بهذه الفئة في المتجر.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الاسم القديم</label>
                    <input
                      type="text"
                      disabled
                      value={editingCategoryName || ""}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-500 focus:outline-none text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الجديد للفئة *</label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الجديد..."
                      value={editCategoryNewValue || ""}
                      onChange={(e) => setEditCategoryNewValue(e.target.value)}
                      className="w-full rounded-xl border border-blue-300 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none text-right font-bold"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const newVal = editCategoryNewValue.trim();
                        if (!newVal || newVal === editingCategoryName) return;
                        await onUpdateCategory(editingCategoryName, newVal);
                        setEditingCategoryName(null);
                        setEditCategoryNewValue('');
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      حفظ التغيير
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryName(null);
                        setEditCategoryNewValue('');
                      }}
                      className="py-2 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Categories List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tags className="h-5 w-5 text-amber-500" />
                  <span>فئات المنتجات الحالية ({categories.length})</span>
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-700 px-2.5 py-1 rounded-full font-bold">
                  تحديث فوري وآمن 🔒
                </span>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Tags className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold">لا يوجد أي فئات حالياً.</p>
                  <p className="text-xs text-slate-400 mt-1">يرجى إضافة فئة جديدة لتظهر في هذه القائمة.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map((cat) => {
                    const count = products.filter(p => p.category === cat).length;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition-all"
                      >
                        <div className="text-right space-y-1">
                          <span className="text-sm font-extrabold text-slate-900">{cat}</span>
                          <div className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                            <Package className="h-3 w-3 text-slate-400" />
                            <span>عدد المنتجات: <strong className="text-amber-600">{count}</strong> منتج</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryName(cat);
                              setEditCategoryNewValue(cat);
                            }}
                            title="تعديل اسم الفئة"
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-100 transition shadow-sm cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const performDelete = async () => {
                                await onDeleteCategory(cat);
                                if (editingCategoryName === cat) {
                                  setEditingCategoryName(null);
                                }
                              };

                              if (count > 0) {
                                triggerConfirm(
                                  'تحذير حذف الفئة',
                                  `تحذير: الفئة "${cat}" تحتوي على ${count} منتج(منتجات) مرتبطة بها. حذف هذه الفئة لن يحذف المنتجات ولكن قد يؤثر على فلترتها. هل تود الاستمرار بالحذف؟`,
                                  performDelete
                                );
                              } else {
                                triggerConfirm(
                                  'حذف الفئة',
                                  `هل أنت متأكد من رغبتك في حذف الفئة "${cat}" نهائياً؟`,
                                  performDelete
                                );
                              }
                            }}
                            title="حذف الفئة"
                            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 transition shadow-sm cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PAYMENT GATEWAYS CONFIGURATION */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Config Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-amber-600 animate-spin-slow" />
                  <span>{isAddingGateway ? 'إضافة بوابة دفع جديدة' : 'تهيئة بوابة الدفع وتخصيصها'}</span>
                </h3>
                {(editingGateway || isAddingGateway) && (
                  <button
                    onClick={() => {
                      setEditingGateway(null);
                      setIsAddingGateway(false);
                      setGatewayFormError('');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isAddingGateway ? (
                <form onSubmit={handleCreateGatewaySubmit} className="space-y-4 text-right">
                  {gatewayFormError && (
                    <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{gatewayFormError}</span>
                    </div>
                  )}

                  {/* Gateway Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم بوابة الدفع الجديدة *</label>
                    <input
                      type="text"
                      required
                      value={newGatewayName || ""}
                      onChange={(e) => setNewGatewayName(e.target.value)}
                      placeholder="مثال: STC Pay، تحويل فودافون كاش، محفظة أورنج..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                    />
                  </div>



                  {/* Custom Gateway Icon Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رفع أيقونة البوابة المخصصة (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setNewGatewayCustomIcon(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                    />
                    {newGatewayCustomIcon && (
                      <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <img src={newGatewayCustomIcon} alt="معاينة الأيقونة" className="h-8 w-8 object-contain rounded bg-white p-0.5 border" />
                        <span className="text-[10px] text-emerald-600 font-semibold">تم تحميل الأيقونة بنجاح ✅</span>
                        <button
                          type="button"
                          onClick={() => setNewGatewayCustomIcon('')}
                          className="mr-auto text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gateway Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الدفع والتحويل للعميل *</label>
                    <textarea
                      required
                      rows={3}
                      value={newGatewayInstructions || ""}
                      onChange={(e) => setNewGatewayInstructions(e.target.value)}
                      placeholder="اكتب توجيهات عملية الإرسال التي ستظهر للعميل أثناء الطلب..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Gateway Account */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحساب / المحفظة / المعرّف (اختياري)</label>
                    <input
                      type="text"
                      value={newGatewayAccount || ""}
                      onChange={(e) => setNewGatewayAccount(e.target.value)}
                      placeholder="مثال: 0987654321 أو payment@kingstore.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Gateway QR Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رفع صورة الـ QR Code للحساب (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setNewGatewayQrCode(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                    />
                    {newGatewayQrCode && (
                      <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <img src={newGatewayQrCode} alt="معاينة QR" className="h-10 w-10 object-contain rounded bg-white p-0.5 border" />
                        <span className="text-[10px] text-emerald-600 font-semibold">تم تحميل الـ QR Code بنجاح ✅</span>
                        <button
                          type="button"
                          onClick={() => setNewGatewayQrCode('')}
                          className="mr-auto text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>



                  {/* Submission actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingGateway(false);
                        setGatewayFormError('');
                      }}
                      className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      إلغاء الأمر
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      حفظ وإنشاء البوابة
                    </button>
                  </div>
                </form>
              ) : !editingGateway ? (
                <div className="text-center py-10 space-y-3">
                  <Settings className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">اختر أي بوابة دفع من الجدول على اليمين لتعديل مسميات الحقول وتعليمات الدفع والتحويل الخاصة بها!</p>
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingGateway(true);
                        setEditingGateway(null);
                      }}
                      className="mx-auto rounded-xl bg-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-all cursor-pointer shadow-md shadow-amber-500/10"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      <span>إضافة طريقة دفع مخصصة ✨</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveGateway} className="space-y-4 text-right">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    {getGatewayIcon(editingGateway.iconName, editingGateway.customIconUrl)}
                    <span>ضبط بوابة: {editingGateway.name}</span>
                  </div>

                  {/* Gateway Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الدفع والتحويل للعملاء *</label>
                    <textarea
                      required
                      rows={4}
                      value={gatewayInstructions || ""}
                      onChange={(e) => setGatewayInstructions(e.target.value)}
                      placeholder="اكتب توجيهات عملية الإرسال لتظهر للعميل أثناء الدفع..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Gateway Account */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الحساب / المحفظة / المعرّف (اختياري)</label>
                    <input
                      type="text"
                      value={gatewayAccountIdentifier || ""}
                      onChange={(e) => setGatewayAccountIdentifier(e.target.value)}
                      placeholder="مثال: 0987654321 أو payment@kingstore.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Custom Gateway Icon Upload for Edit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رفع أيقونة البوابة المخصصة (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setGatewayCustomIconUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                    />
                    {gatewayCustomIconUrl && (
                      <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <img src={gatewayCustomIconUrl} alt="معاينة الأيقونة" className="h-8 w-8 object-contain rounded bg-white p-0.5 border" />
                        <span className="text-[10px] text-emerald-600 font-semibold">تم تحميل الأيقونة بنجاح ✅</span>
                        <button
                          type="button"
                          onClick={() => setGatewayCustomIconUrl('')}
                          className="mr-auto text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gateway QR Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رفع صورة الـ QR Code للحساب (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setGatewayQrCodeUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                    />
                    {gatewayQrCodeUrl && (
                      <div className="mt-2 flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-150">
                        <img src={gatewayQrCodeUrl} alt="معاينة QR" className="h-10 w-10 object-contain rounded bg-white p-0.5 border" />
                        <span className="text-[10px] text-emerald-600 font-semibold">تم تحميل الـ QR Code بنجاح ✅</span>
                        <button
                          type="button"
                          onClick={() => setGatewayQrCodeUrl('')}
                          className="mr-auto text-red-500 hover:text-red-700 text-[10px] font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>



                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingGateway(null)}
                      className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      إلغاء الأمر
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      حفظ وتخصيص البوابة
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Gateways Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">بوابات الدفع وقنوات التحصيل</h3>
                {!isAddingGateway && !editingGateway && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingGateway(true);
                      setEditingGateway(null);
                    }}
                    className="rounded-xl bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs flex items-center gap-1 hover:bg-amber-400 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>إضافة طريقة دفع مخصصة</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {gateways.map((gw) => (
                  <div key={gw.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                    
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-amber-500/10 p-3 mt-0.5">
                        {getGatewayIcon(gw.iconName, gw.customIconUrl)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{gw.name}</h4>
                          {gw.isEnabled ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">مفعلة</span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">معطلة</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-md leading-relaxed mt-1">{gw.instructions}</p>

                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => onUpdateGateway({ ...gw, isEnabled: !gw.isEnabled })}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer ${
                          gw.isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        id={`toggle-gw-${gw.id}`}
                      >
                        {gw.isEnabled ? 'إيقاف البوابة' : 'تفعيل البوابة'}
                      </button>

                      {/* Config trigger */}
                      <button
                        onClick={() => {
                          startEditGateway(gw);
                          setIsAddingGateway(false);
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="تعديل وتخصيص التفاصيل"
                        id={`edit-gw-${gw.id}`}
                      >
                        <Settings className="h-4 w-4" />
                      </button>

                      {/* Delete gateway */}
                      <button
                        onClick={() => {
                          setGatewayToDelete(gw);
                        }}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-50/50"
                        title="حذف بوابة الدفع نهائياً"
                        id={`delete-gw-${gw.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>حذف البوابة</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6" dir="rtl" id="orders-management-tab">
          
          {/* 1. Header & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-md">
            <div>
              <h3 className="text-xl font-black tracking-tight text-amber-400 flex items-center gap-2">
                <ListOrdered className="h-6 w-6 text-amber-400" />
                <span>لوحة التحكم المتقدمة بالطلبات</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                إدارة طلبات عملاء KING STORE، تحديث الحالات، إصدار الفواتير وتوليد بيانات الشحن أو تسليم المنتجات الرقمية.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-amber-400/10 border border-amber-400/20 text-amber-400 px-3.5 py-1.5 rounded-xl">
                مجموع الطلبات: {orders.length}
              </span>
            </div>
          </div>

          {/* 2. Stats Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-800 shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">إجمالي الطلبات</span>
                <span className="text-base font-black text-slate-900">{orders.length}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 shrink-0 border border-amber-100">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">قيد المعالجة</span>
                <span className="text-base font-black text-amber-700">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 shrink-0 border border-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">الطلبات المكتملة</span>
                <span className="text-base font-black text-emerald-700">
                  {orders.filter(o => o.status === 'completed').length}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-2.5 text-red-600 shrink-0 border border-red-100">
                <X className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 font-semibold">الملغية / المرفوضة</span>
                <span className="text-base font-black text-red-700">
                  {orders.filter(o => o.status === 'cancelled').length}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1 flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 shrink-0 border border-amber-500/20">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 font-semibold">الأرباح والمبيعات المكتملة</span>
                <span className="text-base font-black text-amber-600">
                  ${orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          </div>

          {/* 3. Search & Advanced Filtering Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم العميل، البريد الإلكتروني، رقم الهاتف، أو رقم الطلب الفريد..."
                  value={orderSearchQuery || ""}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-amber-400 focus:outline-none focus:bg-slate-50/50 bg-slate-50"
                  id="order-search-input"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Filters triggers */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Product Type filter */}
                <div className="min-w-[150px]">
                  <CustomSelect
                    label="نوع الطلبات:"
                    value={orderTypeFilter}
                    onChange={(val) => setOrderTypeFilter(val as any)}
                    options={[
                      { label: 'كل المنتجات', value: 'all' },
                      { label: 'منتجات ملموسة فقط', value: 'physical' },
                      { label: 'منتجات رقمية فقط', value: 'digital' }
                    ]}
                  />
                </div>

                {/* Clear filters shortcut */}
                {(orderStatusFilter !== 'all' || orderTypeFilter !== 'all' || orderSearchQuery !== '') && (
                  <button
                    onClick={() => {
                      setOrderStatusFilter('all');
                      setOrderTypeFilter('all');
                      setOrderSearchQuery('');
                    }}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-all"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                )}

              </div>
            </div>

            {/* Status Tabs Filter */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 ml-2">تصفية حسب حالة الطلب:</span>
              
              <button
                onClick={() => setOrderStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                  orderStatusFilter === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                الكل ({orders.length})
              </button>

              <button
                onClick={() => setOrderStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                  orderStatusFilter === 'pending'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50'
                }`}
              >
                قيد المعالجة ({orders.filter(o => o.status === 'pending').length})
              </button>

              <button
                onClick={() => setOrderStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                  orderStatusFilter === 'completed'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                المكتملة ({orders.filter(o => o.status === 'completed').length})
              </button>

              <button
                onClick={() => setOrderStatusFilter('cancelled')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                  orderStatusFilter === 'cancelled'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-slate-200 text-red-600 hover:bg-red-50'
                }`}
              >
                الملغية ({orders.filter(o => o.status === 'cancelled').length})
              </button>

            </div>
          </div>

          {/* 4. Orders Table List */}
          {(() => {
            const filteredOrders = orders.filter(order => {
              const matchesSearch = 
                order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                order.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                order.customerEmail.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                order.customerPhone.includes(orderSearchQuery) ||
                order.items.some(item => item.productName.toLowerCase().includes(orderSearchQuery.toLowerCase()));

              const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
              
              const matchesType = orderTypeFilter === 'all' || order.items.some(item => item.type === orderTypeFilter);

              return matchesSearch && matchesStatus && matchesType;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-100 text-slate-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">لم يتم العثور على أي نتائج</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                    لا تتوفر طلبات تطابق مدخلات البحث أو الفلاتر المحددة حالياً. يرجى تعديل خيارات البحث والمحاولة مجدداً.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold select-none">
                      <tr>
                        <th className="p-4">تفاصيل الطلب</th>
                        <th className="p-4">العميل والموقع</th>
                        <th className="p-4">المنتجات المطلوبة</th>
                        <th className="p-4">الدفع والتحقق</th>
                        <th className="p-4">الإجمالي</th>
                        <th className="p-4">الحالة</th>
                        <th className="p-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredOrders.map((order) => {
                        const isPhysical = order.items.some(i => i.type === 'physical');
                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            
                            {/* Order ID & Date */}
                            <td className="p-4">
                              <div className="space-y-1">
                                <span className="font-extrabold text-slate-900 font-mono select-all block">#{order.id}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{new Date(order.date).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </span>
                              </div>
                            </td>

                            {/* Customer Profile */}
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 block">{order.customerName}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{order.customerEmail}</span>
                                <span className="text-[10px] text-slate-500 block font-semibold">{order.customerPhone}</span>
                                {order.shippingAddress && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-100/50 inline-block max-w-[150px] truncate" title={order.shippingAddress}>
                                    📍 {order.shippingAddress}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Products Summary */}
                            <td className="p-4">
                              <div className="space-y-1.5 text-right">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black font-mono">
                                      {item.quantity}x
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800 truncate max-w-[140px] block" title={item.productName}>
                                      {item.productName}
                                    </span>
                                    {item.selectedSize && (
                                      <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded shrink-0" title={`المقاس: ${item.selectedSize}`}>
                                        {item.selectedSize}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                      item.type === 'physical'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                                    }`}>
                                      {item.type === 'physical' ? 'مادي' : 'رقمي'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Payment details and confirmation */}
                            <td className="p-4">
                              <div className="space-y-1">
                                <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[10px] inline-block border border-slate-200">
                                  {gateways.find(g => g.id === order.paymentMethodId)?.name || order.paymentMethodId}
                                </span>
                                <div className="space-y-0.5 max-w-[160px] overflow-hidden">
                                  {Object.entries(order.paymentDetails || {}).map(([key, val]) => {
                                    if (key === 'gatewayName') return null;
                                    let label = key;
                                    if (key === 'senderName') label = 'اسم المرسل';
                                    if (key === 'transactionId') label = 'رقم الحوالة';
                                    return (
                                      <span key={key} className="text-[10px] text-slate-500 block truncate">
                                        <span className="font-semibold text-slate-600">{label}:</span> <strong className="text-slate-800 select-all">{val}</strong>
                                      </span>
                                    );
                                  })}
                                  {order.receiptUrl && (
                                    <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1 mt-1 bg-amber-50 rounded px-1 py-0.5 border border-amber-100 w-fit">
                                      <ImageIcon className="w-3 h-3" />
                                      صورة الإيصال
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Total Amount */}
                            <td className="p-4">
                              <span className="font-black text-slate-950 text-sm font-mono block">
                                ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            {/* Order Status Badge */}
                            <td className="p-4">
                              {order.status === 'completed' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  <span>مكتمل</span>
                                </span>
                              )}
                              {order.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                  <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                                  <span>قيد المعالجة</span>
                                </span>
                              )}
                              {order.status === 'cancelled' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                  <X className="h-3 w-3 text-red-600" />
                                  <span>ملغي</span>
                                </span>
                              )}
                            </td>

                            {/* Actions & Detail Triggers */}
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1.5">
                                
                                {/* Eye button for full modal details */}
                                <button
                                  onClick={() => setSelectedOrderForModal(order)}
                                  className="text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg p-2 transition-all cursor-pointer"
                                  title="عرض وتفصيل الفاتورة وتثبيت التتبع"
                                  id={`view-order-${order.id}`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>

                                {/* Quick complete */}
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                                  className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-1.5 text-[10px] font-black transition-all cursor-pointer"
                                >
                                  إكمال ✓
                                </button>

                                {/* Quick Cancel */}
                                <button
                                  onClick={() => {
                                    triggerConfirm(
                                      'إلغاء الطلب',
                                      'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
                                      () => {
                                        onUpdateOrderStatus(order.id, 'cancelled');
                                      }
                                    );
                                  }}
                                  className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-1.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 5. Detailed Invoice & Fulfillment Modal Dialog */}
          {selectedOrderForModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4" dir="rtl">
              <div 
                className="relative bg-white rounded-3xl border border-slate-200 max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in text-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Modal Title Bar */}
                <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-400 block uppercase tracking-wide">طلب معتمد وموثق 👑</span>
                    <h4 className="text-base font-black flex items-center gap-2 mt-0.5">
                      <span>فاتورة تفصيلية للطلب:</span>
                      <span className="font-mono text-amber-400 font-extrabold select-all">#{selectedOrderForModal.id}</span>
                    </h4>
                  </div>
                  <button 
                    onClick={() => setSelectedOrderForModal(null)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal main content area */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                  
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                    selectedOrderForModal.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : selectedOrderForModal.status === 'pending'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold block opacity-70">حالة الطلب الحالية</span>
                        <span className="text-xs font-black">
                          {selectedOrderForModal.status === 'completed' ? 'تم اكتمال الطلب والتسليم للعميل' : selectedOrderForModal.status === 'pending' ? 'جاري مراجعة الدفع والتجهيز' : 'تم إلغاء الطلب من قبل الإدارة'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          onUpdateOrderStatus(selectedOrderForModal.id, 'completed');
                          setSelectedOrderForModal(prev => prev ? { ...prev, status: 'completed' } : null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-sm transition-all cursor-pointer"
                      >
                        موافقة وتفعيل الكود
                      </button>
                      <button
                        onClick={() => {
                          onUpdateOrderStatus(selectedOrderForModal.id, 'pending');
                          setSelectedOrderForModal(prev => prev ? { ...prev, status: 'pending' } : null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black shadow-sm transition-all cursor-pointer"
                      >
                        تجهيز / انتظار
                      </button>
                      <button
                        onClick={() => {
                          triggerConfirm(
                            'إلغاء الطلب',
                            'هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
                            () => {
                              onUpdateOrderStatus(selectedOrderForModal.id, 'cancelled');
                              setSelectedOrderForModal(prev => prev ? { ...prev, status: 'cancelled' } : null);
                            }
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black shadow-sm transition-all cursor-pointer"
                      >
                        رفض وإلغاء
                      </button>
                    </div>
                  </div>

                  {/* Two columns: Customer profile & Payment status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Customer Profile Panel */}
                    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                        <span>بيانات وهوية العميل المستلم</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">الاسم الكريم</span>
                          <strong className="text-slate-900 block font-bold text-sm">{selectedOrderForModal.customerName}</strong>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">البريد الإلكتروني</span>
                            <a href={`mailto:${selectedOrderForModal.customerEmail}`} className="text-amber-600 hover:underline font-mono">{selectedOrderForModal.customerEmail}</a>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedOrderForModal.customerEmail);
                              alert('تم نسخ البريد الإلكتروني!');
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px]"
                            title="نسخ البريد"
                          >
                            نسخ
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block">رقم الجوال</span>
                            <a href={`tel:${selectedOrderForModal.customerPhone}`} className="text-slate-800 hover:underline font-bold font-mono">{selectedOrderForModal.customerPhone}</a>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedOrderForModal.customerPhone);
                                alert('تم نسخ الجوال!');
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px]"
                            >
                              نسخ
                            </button>
                            <a
                              href={`https://wa.me/${selectedOrderForModal.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم ورحمة الله وبركاته، أخي ${selectedOrderForModal.customerName}. معكم إدارة KING STORE بخصوص طلبكم رقم #${selectedOrderForModal.id}...`)}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold"
                            >
                              واتساب 💬
                            </a>
                          </div>
                        </div>

                        {selectedOrderForModal.shippingAddress && (
                          <div className="pt-1.5 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 block">عنوان الشحن الفعلي</span>
                            <span className="text-slate-700 block font-semibold leading-relaxed">
                              📍 {selectedOrderForModal.shippingAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment verification values */}
                    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                        <span>بيانات الدفع والتحقق الملكية</span>
                      </span>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">بوابة الدفع المستخدمة</span>
                          <span className="font-extrabold text-slate-900 text-sm bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100/50 inline-block">
                            👑 {gateways.find(g => g.id === selectedOrderForModal.paymentMethodId)?.name || selectedOrderForModal.paymentMethodId}
                          </span>
                        </div>

                        {/* Rendering customized gateway receipt details */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                          {Object.entries(selectedOrderForModal.paymentDetails || {}).map(([key, val]) => {
                            if (key === 'gatewayName') return null;
                            let label = key;
                            if (key === 'senderName') label = 'اسم المرسل الكامل';
                            if (key === 'transactionId') label = 'معرف العملية / رقم الحوالة';
                            return (
                              <div key={key} className="flex justify-between items-start gap-2 border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                                <span className="text-[10px] text-slate-500 font-bold">{label}:</span>
                                <strong className="text-slate-800 select-all text-[11px] max-w-[180px] truncate font-sans text-left" title={String(val)}>
                                  {String(val)}
                                </strong>
                              </div>
                            );
                          })}
                          
                          {selectedOrderForModal.receiptUrl && (
                            <div className="pt-3 mt-3 border-t border-slate-200/50">
                              <span className="text-[11px] text-slate-700 font-bold block mb-2 flex items-center gap-1">
                                <ImageIcon className="h-4 w-4 text-amber-500" />
                                صورة الإيصال المرفقة من الزبون (اضغط للتكبير):
                              </span>
                              <a href={selectedOrderForModal.receiptUrl} target="_blank" rel="noopener noreferrer" className="block w-full max-h-[400px] bg-slate-100 overflow-hidden rounded-xl border border-slate-300 hover:border-amber-400 transition-colors shadow-sm flex items-center justify-center">
                                <img src={selectedOrderForModal.receiptUrl} alt="إيصال الدفع" className="w-full h-full object-contain max-h-[400px]" />
                              </a>
                            </div>
                          )}
                        </div>

                        {selectedOrderForModal.deliveryFee !== undefined && selectedOrderForModal.deliveryFee > 0 && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>خدمة التوصيل والشحن الدولي:</span>
                            <span className="font-mono font-bold text-slate-700">
                              +${selectedOrderForModal.deliveryFee.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {selectedOrderForModal.import_tax !== undefined && selectedOrderForModal.import_tax > 0 && (
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>الرسوم الجمركية وضريبة الاستيراد (10%):</span>
                            <span className="font-mono font-bold text-amber-600">
                              +${selectedOrderForModal.import_tax.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-900">المجموع الكلي للفاتورة:</span>
                          <span className="text-lg font-black text-amber-600 font-mono">
                            ${selectedOrderForModal.totalAmount}
                          </span>
                        </div>

                        {selectedOrderForModal.payment_type === 'split_50_50' && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200 text-[11px] space-y-1">
                            <div className="flex justify-between text-emerald-600 font-bold">
                              <span>العربون المدفوع مقدماً (50% ملموس + 100% غير ملموس):</span>
                              <span className="font-mono">${selectedOrderForModal.amount_paid_advance?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-amber-600 font-bold">
                              <span>المتبقي عند الاستلام COD (50% ملموس):</span>
                              <span className="font-mono">${selectedOrderForModal.amount_due_on_delivery?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Order Products List */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 text-[10px] font-extrabold text-slate-500">
                      المنتجات المشمولة في الفاتورة
                    </div>
                    <div className="divide-y divide-slate-100">
                      {selectedOrderForModal.items.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-black">
                              {item.quantity}x
                            </span>
                            <div>
                              <strong className="text-slate-900 font-bold block">{item.productName}</strong>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                فئة: {item.type === 'physical' ? 'منتج ملموس (يتطلب شحن)' : 'منتج رقمي (كود/مفتاح ترخيص)'}
                              </span>
                              {item.selectedSize && (
                                <span className="inline-block mt-1 text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                                  {item.productName.toLowerCase().includes('حذاء') || 
                                   item.productName.toLowerCase().includes('حذا') || 
                                   item.productName.toLowerCase().includes('shoe') || 
                                   item.productName.toLowerCase().includes('sneaker') || 
                                   item.productName.toLowerCase().includes('boot') ||
                                   item.productName.toLowerCase().includes('footwear')
                                    ? '👟' 
                                    : '👕'}{' '}
                                  المقاس المطلوب: {item.selectedSize}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-black text-slate-900">
                            ${(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHIPPING / DIGITAL DELIVERY INPUT PANEL */}
                  <div className="p-5 rounded-2xl bg-amber-50/20 border border-amber-500/20 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-500/10">
                      <Truck className="h-5 w-5 text-amber-600" />
                      <h4 className="text-xs font-black text-slate-900">بيانات التوصيل والشحن والتسليم المخصص</h4>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      استخدم هذا الحقل لتسجيل وإرسال معلومات الشحن (للمنتجات الملموسة) أو أكواد التنشيط الرقمية ومفاتيح الترخيص (للمنتجات الرقمية). سيتم حفظها محلياً وظهورها في ملف العميل.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          معلومات الشحن / مفاتيح التسليم المخصصة للطلب
                        </label>
                        <textarea
                          placeholder={selectedOrderForModal.items.some(i => i.type === 'physical') 
                            ? "مثال: تم الشحن عبر سمسا - رقم التتبع: SMSA9827419" 
                            : "مثال: كود تنشيط ويندوز: Windows-XXXX-YYYY-ZZZZ"}
                          value={trackingNotes[selectedOrderForModal.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = { ...trackingNotes, [selectedOrderForModal.id]: val };
                            setTrackingNotes(updated);
                            localStorage.setItem('king_store_order_tracking_notes', JSON.stringify(updated));
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs focus:border-amber-400 focus:outline-none min-h-[80px]"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            alert('تم حفظ بيانات التوصيل محلياً وتعديلها بنجاح!');
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                        >
                          حفظ التحديث 💾
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer Actions */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة الفاتورة 🖨️</span>
                  </button>

                  <button
                    onClick={() => setSelectedOrderForModal(null)}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    إغلاق الفاتورة
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB: DISCOUNTS & COUPONS MANAGEMENT */}
      {activeTab === 'discounts' && (
        <div className="space-y-8 animate-fade-in" dir="rtl">
          {/* Royal Header Card */}
          <div className="rounded-[2.5rem] bg-slate-950 border border-slate-800 p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-3xl text-slate-950 shadow-lg shadow-amber-500/20">
                    <Percent className="h-8 w-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500">
                      نظام الخصومات والولاء الملكي
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <p className="text-slate-400 text-xs sm:text-sm font-bold tracking-wide uppercase">
                        Discounts & Loyalty Management Engine
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
                  صمم عروضك الحصرية وقم بتوليد قسائم تخفيض ذكية لجذب العملاء المتميزين. تحكم بالخصومات المباشرة أو أنشئ أكواد ترويجية مخصصة لزيادة المبيعات في متجر الملوك.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCoupon(!isAddingCoupon);
                    if (editingCoupon) setEditingCoupon(null);
                  }}
                  className={`px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                    isAddingCoupon 
                      ? 'bg-slate-800 text-white hover:bg-slate-700' 
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/20'
                  }`}
                >
                  {isAddingCoupon ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  <span>{isAddingCoupon ? 'إلغاء العملية' : 'إنشاء كود خصم جديد'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Control Center: Left Side (Forms) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Luxury Product-Specific Discount Form */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                    <Tags className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">خصم مخصص لمنتج معين</h3>
                </div>

                <div className="space-y-6">
                  {/* Product Selection Dropdown */}
                  <div className="space-y-3">
                    <CustomSelect
                      label="اختر المنتج من القائمة"
                      placeholder="-- اختر منتجاً لتعديل خصمه --"
                      value={selectedProductId}
                      onChange={(val) => {
                        setSelectedProductId(val);
                        const p = products.find(prod => prod.id === val);
                        if (p) {
                          setProductDiscountPercentage(p.discountPercentage || 0);
                        }
                      }}
                      options={[
                        { label: '-- اختر منتجاً لتعديل خصمه --', value: '' },
                        ...products.map(p => ({ label: `${p.name} ($${p.price})`, value: p.id }))
                      ]}
                    />
                  </div>

                  {selectedProductId && (
                    <div className="space-y-6 animate-slide-up">
                      {/* Discount Percentage Input */}
                      <div className="space-y-3">
                        <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                          <span>نسبة الخصم للمنتج</span>
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{productDiscountPercentage}%</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={productDiscountPercentage}
                            onChange={(e) => setProductDiscountPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 pr-5 pl-12 text-slate-950 font-black text-lg focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                            <span className="text-amber-600 font-black text-xl">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Price Preview */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-400">السعر الأصلي:</span>
                          <span className="text-slate-600 line-through">${products.find(p => p.id === selectedProductId)?.price}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-black">
                          <span className="text-slate-900">السعر بعد الخصم:</span>
                          <span className="text-amber-600 text-lg">
                            ${(products.find(p => p.id === selectedProductId)?.price || 0) * (1 - (productDiscountPercentage / 100))}
                          </span>
                        </div>
                      </div>

                      {productDiscountSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-3 animate-bounce">
                          <Check className="h-4 w-4" />
                          <span>{productDiscountSuccess}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isUpdatingProductDiscount}
                        onClick={handleSaveProductDiscount}
                        className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-500 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer group/btn"
                      >
                        {isUpdatingProductDiscount ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )}
                        <span>{isUpdatingProductDiscount ? 'جاري التحديث...' : 'تطبيق الخصم المخصص'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Luxury Global Discount Form */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-2xl bg-slate-950 text-amber-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">الخصم العام للمتجر</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                      <span>نسبة الخصم الحالي</span>
                      <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{globalDiscountPercentage}%</span>
                    </label>
                    <div className="relative group/input">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={globalDiscountPercentage}
                        onChange={(e) => setGlobalDiscountPercentage(Math.max(0, Math.min(90, Number(e.target.value))))}
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 pr-5 pl-12 text-slate-950 font-black text-lg focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                        <span className="text-amber-600 font-black text-xl">%</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                      * هذا الخصم يتم تطبيقه تلقائياً على كافة المنتجات المعروضة للزبائن.
                    </p>
                  </div>

                  {globalDiscountSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-3 animate-bounce">
                      <div className="bg-emerald-500 p-1 rounded-full text-white">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{globalDiscountSuccess}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={savingGlobalDiscount}
                    onClick={() => handleSaveGlobalDiscount(globalDiscountPercentage)}
                    className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-500 font-black text-sm shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 transition-all flex items-center justify-center gap-3 cursor-pointer group/btn"
                  >
                    {savingGlobalDiscount ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="bg-amber-500 p-1 rounded-full text-slate-950 group-hover/btn:scale-110 transition-transform">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <span>{savingGlobalDiscount ? 'جاري الحفظ الملكي...' : 'تثبيت الخصم العام'}</span>
                  </button>
                </div>
              </div>

              {/* Luxury Exclusive Weekly Offers Settings Form */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                    <Crown className="h-5 w-5 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">إعدادات لوحة الخصومات الحصرية</h3>
                </div>

                <div className="space-y-5">
                  {/* Title input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">عنوان لوحة الخصومات</label>
                    <input
                      type="text"
                      placeholder="مثال: عروض ملوك الأسبوع الحصرية 👑"
                      value={discountsSectionTitle}
                      onChange={(e) => setDiscountsSectionTitle(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3.5 px-5 text-slate-950 font-black text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  {/* Description input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">وصف لوحة الخصومات</label>
                    <textarea
                      placeholder="مثال: خصومات استثنائية تصل إلى 30٪ على أفخم السلع!"
                      value={discountsSectionDesc}
                      onChange={(e) => setDiscountsSectionDesc(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3.5 px-5 text-slate-950 font-medium text-xs sm:text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Product Selection Dropdown for Exclusive Offers */}
                  <div className="space-y-2">
                    <div className="space-y-2 text-right">
                      <CustomSelect
                        label="إضافة منتج للوحة العروض الحصرية"
                        placeholder="-- اختر منتجاً للإضافة --"
                        value={selectedProductIdToAdd}
                        onChange={(val) => setSelectedProductIdToAdd(val)}
                        options={[
                          { label: '-- اختر منتجاً للإضافة --', value: '' },
                          ...products.map(p => ({ label: `${p.name} - $${p.price}`, value: p.id }))
                        ]}
                      />
                      <button
                        type="button"
                        onClick={handleAddProductToDiscountsSection}
                        className="w-full mt-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer text-center block"
                      >
                        إضافة المنتج المختار 👑
                      </button>
                    </div>
                  </div>

                  {/* Selected products list with delete buttons */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">المنتجات المعروضة حالياً في اللوحة ({discountsSectionProducts.length})</label>
                    {discountsSectionProducts.length === 0 ? (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-slate-100 text-center text-xs text-slate-400 font-bold">
                        لم يتم تحديد أي منتجات بعد. سيتم عرض أول منتجين افتراضياً في واجهة المتجر.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50">
                        {discountsSectionProducts.map(pId => {
                          const product = products.find(p => p.id === pId);
                          return (
                            <div key={pId} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm gap-2">
                              <span className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">
                                {product ? product.name : `منتج غير موجود (${pId})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductFromDiscountsSection(pId)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all text-[11px] font-black cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {discountsSectionSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-black flex items-center gap-3 animate-bounce">
                      <div className="bg-emerald-500 p-1 rounded-full text-white">
                        <Check className="h-3 w-3" />
                      </div>
                      <span>{discountsSectionSuccess}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isUpdatingDiscountsSection}
                    onClick={handleSaveDiscountsSection}
                    className="w-full py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-500 font-black text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer group/btn"
                  >
                    {isUpdatingDiscountsSection ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Crown className="h-5 w-5" />
                    )}
                    <span>{isUpdatingDiscountsSection ? 'جاري الحفظ الملكي...' : 'حفظ إعدادات لوحة العروض'}</span>
                  </button>
                </div>
              </div>

              {/* Luxury Coupon Form */}
              {isAddingCoupon && (
                <form onSubmit={handleSaveCoupon} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl space-y-6 animate-slide-up relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mt-16 blur-2xl" />
                  
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
                      <Tags className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">
                      {editingCoupon ? 'تعديل بيانات القسيمة' : 'توليد قسيمة ملكية'}
                    </h3>
                  </div>

                  {couponFormError && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl text-xs font-black flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{couponFormError}</span>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">كود الخصم (Promo Code)</label>
                      <input
                        type="text"
                        placeholder="مثال: ROYAL_SUMMER"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-5 text-slate-950 font-black text-sm tracking-widest focus:border-amber-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">نوع الخصم</label>
                        <CustomSelect
                          value={couponType}
                          onChange={(val) => setCouponType(val as 'percentage' | 'fixed')}
                          options={[
                            { label: '٪ نسبة مئوية', value: 'percentage' },
                            { label: 'مبلغ ثابت ($)', value: 'fixed' }
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">قيمة التخفيض</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={couponValue}
                            onChange={(e) => setCouponValue(Number(e.target.value))}
                            className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-5 text-slate-950 font-black text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                          />
                          <div className="absolute inset-y-0 left-4 flex items-center">
                            <span className="text-amber-600 font-black text-sm">{couponType === 'percentage' ? '%' : '$'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">الحد الأدنى للطلب</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (بدون حد أدنى)"
                        value={couponMinAmount}
                        onChange={(e) => setCouponMinAmount(Number(e.target.value))}
                        className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-5 text-slate-950 font-black text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">تاريخ انتهاء الصلاحية</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={couponExpiryDate}
                          onChange={(e) => setCouponExpiryDate(e.target.value)}
                          className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-4 px-5 text-slate-950 font-black text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                        />
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          id="couponIsActive"
                          checked={couponIsActive}
                          onChange={(e) => setCouponIsActive(e.target.checked)}
                          className="peer h-6 w-6 rounded-lg opacity-0 absolute cursor-pointer z-10"
                        />
                        <div className="h-6 w-6 rounded-lg border-2 border-slate-200 bg-white flex items-center justify-center transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500">
                          <Check className="h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <label htmlFor="couponIsActive" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                        تفعيل القسيمة فوراً للاستخدام الملكي
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{editingCoupon ? 'حفظ التعديلات الملكية' : 'توليد القسيمة الآن'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCoupon(false);
                        setEditingCoupon(null);
                      }}
                      className="w-full sm:w-auto px-6 py-4 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 text-slate-500 font-bold text-sm transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List: Right Side (Table) */}
            <div className="lg:col-span-8">
              <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xl font-black text-slate-950 tracking-tight">سجل القسائم النشطة</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">إجمالي القسائم المتاحة: {coupons.length} قسيمة ترويجية</p>
                  </div>
                  
                  {couponFormSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-[10px] font-black flex items-center gap-2 animate-bounce">
                      <Sparkles className="h-4 w-4" />
                      <span>{couponFormSuccess}</span>
                    </div>
                  )}
                </div>

                {coupons.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="p-8 rounded-[3rem] bg-slate-50 border border-dashed border-slate-200 relative group">
                      <Percent className="h-16 w-16 text-slate-200 group-hover:text-amber-500/20 transition-colors duration-500" />
                      <div className="absolute -top-4 -right-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 animate-bounce">
                        <Plus className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-black text-slate-900">سجل الخصومات فارغ تماماً</p>
                      <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
                        ابدأ بتنشيط المبيعات الآن عبر إنشاء أول كود خصم لعملائك المتميزين.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddingCoupon(true)}
                      className="px-8 py-3 rounded-2xl bg-slate-950 text-amber-500 font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                    >
                      ابدأ التوليد الآن
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="p-6">معلومات القسيمة</th>
                          <th className="p-6">قيمة العرض</th>
                          <th className="p-6">الحد الأدنى</th>
                          <th className="p-6">الانتهاء</th>
                          <th className="p-6">الحالة</th>
                          <th className="p-6 text-left">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {coupons.map((coupon) => (
                          <tr key={coupon.id} className="hover:bg-amber-50/30 transition-all duration-300 group">
                            <td className="p-6">
                              <div className="flex flex-col gap-1.5">
                                <span className="inline-flex w-fit px-4 py-2 rounded-xl bg-slate-950 text-amber-500 font-mono font-black text-sm tracking-widest shadow-xl shadow-slate-950/10 group-hover:scale-105 transition-transform">
                                  {coupon.code}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold px-1">تم الاستخدام: {coupon.usageCount || 0} مرات</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 font-black text-lg">
                                  {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value.toLocaleString()}`}
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">خصم ملكي</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <span className="text-xs font-black text-slate-600">
                                {coupon.minAmount > 0 ? `$${coupon.minAmount.toLocaleString()}` : 'بدون قيود'}
                              </span>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{coupon.expiryDate}</span>
                              </div>
                            </td>
                            <td className="p-6">
                              <button
                                type="button"
                                onClick={() => handleToggleCoupon(coupon)}
                                className={`group/toggle relative flex items-center gap-2 pl-4 pr-3 py-1.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                                  coupon.isActive
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                              >
                                <span className={`h-2.5 w-2.5 rounded-full shadow-sm transition-all ${coupon.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span>{coupon.isActive ? 'قسيمة نشطة' : 'قسيمة معطلة'}</span>
                              </button>
                            </td>
                            <td className="p-6 text-left">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleEditCoupon(coupon)}
                                  className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-amber-500 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                                  title="تعديل"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                  className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 hover:shadow-lg transition-all cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-fade-in" dir="rtl">
          {/* Royal Header Card */}
          <div className="rounded-[2.5rem] bg-slate-950 border border-slate-800 p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 rounded-3xl text-slate-950 shadow-lg shadow-amber-500/20">
                    <Settings className="h-8 w-8 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-500">
                      إعدادات المتجر والعملة الملكية
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <p className="text-slate-400 text-xs sm:text-sm font-bold tracking-wide uppercase">
                        Store Settings & Currency Exchange Rate
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
                  تحكم في إعدادات المتجر وسعر الصرف اليومي للعملة بشكل فوري. يتيح لك هذا النظام تحديث سعر صرف الدولار مقابل الليرة السورية ليعمل النظام المزدوج بتوافق تام وتحديث تلقائي في كروت المنتجات والسلة والفواتير.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-3xl">
            {/* Luxury Exchange Rate Setting Form */}
            <div className="rounded-[2rem] border border-amber-500/30 bg-slate-950 p-8 shadow-xl hover:shadow-2xl hover:border-amber-500/50 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                  <DollarSign className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-amber-400">سعر الصرف مقابل الليرة (SYP)</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>سعر صرف $1 دولار الحالي</span>

                  </label>
                  <div className="relative group/input">
                    <input
                      type="number"
                      min="1"
                      value={exchangeRateInput}
                      onChange={(e) => setExchangeRateInput(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-2xl border-2 border-slate-800 bg-slate-900 py-4 pr-5 pl-16 text-white font-black text-lg focus:border-amber-500 focus:bg-slate-900/90 focus:outline-none transition-all font-mono"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-5">

                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed px-1">
                    * تحديث هذا الحقل سيغير أسعار جميع المنتجات والمشتريات والفواتير بشكل فوري وديناميكي في المتجر.
                  </p>
                </div>

                {exchangeRateSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-black flex items-center gap-3 animate-bounce">
                    <div className="bg-emerald-500 p-1 rounded-full text-white">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>{exchangeRateSuccess}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={savingExchangeRate}
                  onClick={() => handleSaveExchangeRate(exchangeRateInput)}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer group/btn"
                >
                  {savingExchangeRate ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="bg-slate-950 p-1 rounded-full text-amber-500 group-hover/btn:scale-110 transition-transform">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <span>{savingExchangeRate ? 'جاري تحديث السعر...' : 'تحديث سعر الصرف'}</span>
                </button>
              </div>
            </div>

            {/* Logistics & Shipping Settings */}
            <div className="rounded-[2rem] border border-amber-500/30 bg-slate-950 p-8 shadow-xl hover:shadow-2xl hover:border-amber-500/50 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-amber-400">آلة حاسبة لإدارة الشحن وتكلفة التوصيل الملكية 🌐</h3>
              </div>

              <div className="space-y-6">
                <p className="text-xs text-slate-400 leading-relaxed">
                  قم بضبط معايير الشحن الدولي والمحلي للتوصيل الملكي. يتم حساب الشحن آلياً للعميل بناءً على بُعد تاريخ التسليم المطلوب وطريقة النقل المناسبة.
                </p>

                {/* Air Freight config (1-4 days) */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-amber-400">✈️ الشحن الجوي السريع (Fast Window: 1-4 أيام)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">السعر الأساسي ($) *</label>
                      <input
                        type="number"
                        value={deliverySettings.airBaseCost ?? 40}
                        onChange={(e) => setDeliverySettings({...deliverySettings, airBaseCost: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">معامل الاستعجال اليومي ($) *</label>
                      <input
                        type="number"
                        value={deliverySettings.airUrgencyFactor ?? 8}
                        onChange={(e) => setDeliverySettings({...deliverySettings, airUrgencyFactor: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                        title="المبلغ المضاف عن كل يوم اقتراب من موعد التوصيل الفوري"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">معامل الحجم والوزن الجوي (ضرب) *</label>
                      <input
                        type="number"
                        step="0.05"
                        value={deliverySettings.airWeightVolumeFactor ?? 1.5}
                        onChange={(e) => setDeliverySettings({...deliverySettings, airWeightVolumeFactor: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-bold">
                    * معادلة الاحتساب: السعر الأساسي + (5 - عدد الأيام) × معامل الاستعجال × معامل الوزن.
                  </p>
                </div>

                {/* Sea Freight config (5+ days) */}
                <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-cyan-400">🚢 الشحن البحري الاقتصادي (Economy Window: 5 أيام فأكثر)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">السعر الأساسي لليوم الخامس ($) *</label>
                      <input
                        type="number"
                        value={deliverySettings.seaBaseCost ?? 15}
                        onChange={(e) => setDeliverySettings({...deliverySettings, seaBaseCost: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-955 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">معامل التخفيض اليومي ($) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={deliverySettings.seaDailyDecay ?? 0.5}
                        onChange={(e) => setDeliverySettings({...deliverySettings, seaDailyDecay: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-955 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                        title="المبلغ الذي يقل تدريجياً كلما كان تاريخ التسليم أبعد"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">الحد الأدنى المستقر للتكلفة ($) *</label>
                      <input
                        type="number"
                        value={deliverySettings.seaMinBaseline ?? 5}
                        onChange={(e) => setDeliverySettings({...deliverySettings, seaMinBaseline: Math.max(0, Number(e.target.value))})}
                        className="w-full rounded-xl border border-slate-700 bg-slate-955 p-3 text-xs text-white font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-bold">
                    * معادلة الاحتساب: الحد الأقصى بين (الحد الأدنى المستقر) و (السعر الأساسي لليوم الخامس - (عدد الأيام - 5) × معامل التخفيض).
                  </p>
                </div>

                {/* Admin Testing Calculator Widget */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1">
                      <span>🧪 محاكي فحص أسعار الشحن اللحظي:</span>
                    </h4>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">معاينة فورية قبل الحفظ</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[9px] text-slate-400 mb-1">حدد عدد أيام التوصيل المفترضة للفحص:</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={testDays}
                          onChange={(e) => setTestDays(Math.max(1, Number(e.target.value)))}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 px-3 text-xs text-white font-black focus:outline-none"
                        />
                        <span className="absolute left-3 top-2.5 text-slate-500 text-[10px]">يوم</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 mb-0.5">تكلفة التوصيل الناتجة:</div>
                      <div className="text-lg font-black text-emerald-400">
                        ${(() => {
                          const days = testDays;
                          const airBase = deliverySettings.airBaseCost ?? 40;
                          const airUrgency = deliverySettings.airUrgencyFactor ?? 8;
                          const airWeight = deliverySettings.airWeightVolumeFactor ?? 1.5;
                          const seaBase = deliverySettings.seaBaseCost ?? 15;
                          const seaDecay = deliverySettings.seaDailyDecay ?? 0.5;
                          const seaMin = deliverySettings.seaMinBaseline ?? 5;

                          if (days <= 4) {
                            return (airBase + (5 - days) * airUrgency * airWeight).toFixed(2);
                          } else {
                            return Math.max(seaMin, seaBase - (days - 5) * seaDecay).toFixed(2);
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] bg-slate-950/70 p-3 rounded-xl text-slate-300 leading-relaxed font-mono">
                    {testDays <= 4 ? (
                      <div>
                        <span className="text-amber-400 font-bold">✈️ نوع الشحن: جوي سريع (مدة قصيرة 1-4 أيام)</span>
                        <br />
                        <span>الحسبة: {deliverySettings.airBaseCost ?? 40} + (5 - {testDays}) × {deliverySettings.airUrgencyFactor ?? 8} × {deliverySettings.airWeightVolumeFactor ?? 1.5}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-cyan-400 font-bold">🚢 نوع الشحن: بحري اقتصادي (مدة طويلة 5+ أيام)</span>
                        <br />
                        <span>الحسبة: Max({deliverySettings.seaMinBaseline ?? 5}, {deliverySettings.seaBaseCost ?? 15} - ({testDays} - 5) × {deliverySettings.seaDailyDecay ?? 0.5})</span>
                      </div>
                    )}
                  </div>
                </div>

                {deliverySavedSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-center animate-pulse">
                    {deliverySavedSuccess}
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'delivery_config', 'global_settings'), {
                        basePricePerDay: deliverySettings.basePricePerDay ?? 5,
                        rules: deliverySettings.rules || [],
                        airBaseCost: deliverySettings.airBaseCost ?? 40,
                        airUrgencyFactor: deliverySettings.airUrgencyFactor ?? 8,
                        airWeightVolumeFactor: deliverySettings.airWeightVolumeFactor ?? 1.5,
                        seaBaseCost: deliverySettings.seaBaseCost ?? 15,
                        seaDailyDecay: deliverySettings.seaDailyDecay ?? 0.5,
                        seaMinBaseline: deliverySettings.seaMinBaseline ?? 5
                      }, { merge: true });
                      setDeliverySavedSuccess('تم حفظ إعدادات آلة حاسبة خدمة التوصيل الملكية في قاعدة البيانات! ✈️🚢👑');
                      setTimeout(() => setDeliverySavedSuccess(''), 4000);
                    } catch (err) {
                      console.error("Error saving delivery settings:", err);
                      alert('حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة لاحقاً.');
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="h-5 w-5" />
                  <span>حفظ وإرسال إعدادات آلة حاسبة التوصيل والشحن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ADMINS & INVITATIONS */}
      {activeTab === 'admins' && (
        <div className="space-y-8" dir="rtl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Invite Form */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">إنشاء دعوة إدارة جديدة</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  أدخل البريد الإلكتروني للمدير الآخر لتوليد رابط دعوة مخصص وآمن. عند قيام الطرف الآخر بفتح الرابط والتسجيل، سيتم ترقية حسابه تلقائياً إلى مدير نظام (Admin) بميزات تحكم كاملة.
                </p>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setInvitationSuccessMsg('');
                    setIsCopied(false);
                    const email = adminEmailToInvite.trim().toLowerCase();
                    if (!email) return;

                    // Check if already exists in users as admin
                    const alreadyAdmin = users.some(u => u.email.toLowerCase() === email && u.role === 'admin');
                    if (alreadyAdmin) {
                      alert('هذا البريد الإلكتروني مسجل بالفعل كمدير للنظام.');
                      return;
                    }

                    const newInvite = {
                      id: `inv-${Date.now()}`,
                      email,
                      createdAt: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
                      status: 'pending' as const
                    };

                    const updatedInvites = [...invitations, newInvite];
                    setInvitations(updatedInvites);
                    localStorage.setItem('king_store_admin_invitations', JSON.stringify(updatedInvites));

                    const link = `${window.location.origin}?invite_email=${encodeURIComponent(email)}&invite_role=admin`;
                    setGeneratedLink(link);
                    setInvitationSuccessMsg(`تم توليد رابط الدعوة بنجاح! تم إرسال إشعار محاكي للبريد الإلكتروني ${email}. يرجى نسخ الرابط من الأسفل ومشاركته معه.`);
                    setAdminEmailToInvite('');
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للمدير المستهدف</label>
                    <input
                      type="email"
                      required
                      placeholder="admin2@kingstore.com"
                      value={adminEmailToInvite || ""}
                      onChange={(e) => setAdminEmailToInvite(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>توليد وإرسال رابط الدعوة الملكية 👑</span>
                  </button>
                </form>

                {/* Generated Link Display */}
                {invitationSuccessMsg && (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/5 text-right space-y-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {invitationSuccessMsg}
                      </p>
                    </div>

                    <div className="relative mt-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink || ""}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-16 text-[10px] font-mono text-slate-600 focus:outline-none text-left"
                        dir="ltr"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="absolute left-1.5 top-1.5 px-2.5 py-1 text-[10px] font-extrabold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-all cursor-pointer"
                      >
                        {isCopied ? 'تم النسخ! ✓' : 'نسخ الرابط'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Active Invites & Admin List */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Active invitations */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <span>{texts.activeInvitesPending}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {invitations.length} {texts.pendingLabel}
                  </span>
                </div>

                {invitations.length === 0 ? (
                  <div className={`p-8 text-center text-slate-400 text-xs leading-relaxed ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    {texts.noPendingInvites}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`w-full text-xs ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                        <tr>
                          <th className="p-4">{texts.invitedEmail}</th>
                          <th className="p-4">{texts.createdAt}</th>
                          <th className="p-4">{texts.inviteStatus}</th>
                          <th className="p-4 text-center">{texts.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-mono text-slate-900 select-all">{inv.email}</td>
                            <td className="p-4 text-slate-500">{inv.createdAt}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span>{texts.waitingPending}</span>
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}?invite_email=${encodeURIComponent(inv.email)}&invite_role=admin`;
                                    navigator.clipboard.writeText(link);
                                    alert(texts.copied);
                                  }}
                                  className="text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg p-1.5 transition-colors cursor-pointer border border-amber-200"
                                  title={texts.copyInviteLink}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = invitations.filter(i => i.id !== inv.id);
                                    setInvitations(updated);
                                    localStorage.setItem('king_store_admin_invitations', JSON.stringify(updated));
                                  }}
                                  className="text-red-600 bg-red-50 hover:bg-red-100 rounded-lg p-1.5 transition-colors cursor-pointer border border-red-200"
                                  title={texts.cancelInvite}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Current Administrators List */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-500" />
                    <span>{texts.currentAdmins}</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {users.filter(u => u.role === 'admin').length} {texts.adminsCount}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className={`w-full text-xs ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="p-4">{texts.adminName}</th>
                        <th className="p-4">{texts.adminEmail}</th>
                        <th className="p-4">{texts.membershipRank}</th>
                        <th className="p-4 text-center">{texts.permissionsControl}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {users.filter(u => u.role === 'admin').map((u) => {
                        const isMainAdmin = u.email === 'khdersy808@gmail.com';
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-black text-slate-900">{u.name}</td>
                            <td className="p-4 font-mono select-all text-slate-500">{u.email}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                <Shield className="h-3 w-3 text-blue-500" />
                                <span>{isMainAdmin ? texts.mainAdmin : texts.assistantAdmin}</span>
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {isMainAdmin ? (
                                <span className="text-[10px] text-slate-400 font-semibold">{texts.nonDeletable}</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    triggerConfirm(
                                      texts.revokePermissions,
                                      texts.revokeConfirm.replace('{name}', u.name),
                                      () => {
                                        onDeleteUser(u.id);
                                      }
                                    );
                                  }}
                                  className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  {texts.revokePermissions}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {activeTab === 'ai-lab' && (
        <AIImageLab products={products} onShowToast={onShowToast} />
      )}

      {activeTab === 'policies' && (
        <div className="space-y-8 animate-fade-in text-slate-800" dir="rtl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="text-right">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 justify-start">
                <FileText className="h-5 w-5 text-amber-500" />
                <span>سياسات وأحكام الموقع الإلكتروني 📜</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                هنا يمكنك صياغة وتعديل شروط الاستخدام، سياسة الخصوصية، وقوانين الشراء والتوصيل التي تظهر للعملاء في صندوق الدفع.
              </p>
            </div>
            
            {!isAddingPolicy && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRestoreDefaultPolicies}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="استعادة السياسات الافتراضية الثلاثة للمتجر (الشروط، الخصوصية، الاسترجاع)"
                >
                  <RotateCcw className="h-4 w-4 text-slate-500" />
                  <span>استعادة السياسات الافتراضية</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPolicy(null);
                    setPolicyTitle('');
                    setPolicyContent('');
                    setPolicyIsActive(true);
                    setPolicyFormError('');
                    setPolicyFormSuccess('');
                    setIsAddingPolicy(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة سياسة جديدة</span>
                </button>
              </div>
            )}
          </div>

          {/* Form to Add/Edit Policy */}
          {isAddingPolicy && (
            <form onSubmit={handleSavePolicy} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6 animate-slide-up relative overflow-hidden text-right">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-amber-500 to-yellow-500" />
              
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-amber-500" />
                  <span>{editingPolicy ? 'تعديل السياسة الحالية' : 'إضافة سياسة جديدة للمتجر'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingPolicy(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {policyFormError && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2 justify-start">
                  <AlertCircle className="h-4 w-4" />
                  <span>{policyFormError}</span>
                </div>
              )}

              {policyFormSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2 justify-start">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{policyFormSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">عنوان السياسة (مثال: سياسة الاسترجاع والتبديل)</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب عنواناً واضحاً للسياسة..."
                    value={policyTitle}
                    onChange={(e) => setPolicyTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 font-bold focus:bg-white focus:border-amber-500 focus:outline-none transition-colors text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">محتوى السياسة بالتفصيل</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="اكتب بنود وقوانين السياسة هنا بالتفصيل وبشكل مرقم وواضح لعملائك..."
                    value={policyContent}
                    onChange={(e) => setPolicyContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 font-semibold focus:bg-white focus:border-amber-500 focus:outline-none transition-colors leading-relaxed text-right"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 justify-start">
                  <input
                    type="checkbox"
                    id="policyIsActive"
                    checked={policyIsActive}
                    onChange={(e) => setPolicyIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="policyIsActive" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    تفعيل السياسة فوراً وعرضها في المتجر للزبائن عند الدفع
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPolicy(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  إلغاء التعديل
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-600 transition-colors cursor-pointer shadow-md shadow-amber-500/10 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>حفظ وإقرار السياسة</span>
                </button>
              </div>
            </form>
          )}

          {/* Policies Cards Grid */}
          <div className="grid grid-cols-1 gap-6">
            {policies.map((policy) => (
              <div 
                key={policy.id} 
                className={`bg-white border rounded-3xl p-6 transition-all shadow-sm flex flex-col justify-between text-right ${
                  policy.isActive ? 'border-slate-100 hover:border-amber-500/20 shadow-sm' : 'border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 pb-4 mb-4">
                    <div className="text-right">
                      <h4 className="text-base font-extrabold text-slate-950 flex items-center gap-2 justify-start">
                        <Shield className={`h-4 w-4 ${policy.isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span>{policy.title}</span>
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1.5 justify-start">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>آخر تحديث: {policy.updatedAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                        policy.isActive 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                          : 'text-slate-500 bg-slate-100 border-slate-200'
                      }`}>
                        {policy.isActive ? 'نشطة وتظهر للزبائن ●' : 'مسودة / غير نشطة ○'}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleTogglePolicyActive(policy)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          policy.isActive
                            ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title={policy.isActive ? 'تعطيل السياسة مؤقتاً' : 'تفعيل السياسة وعرضها'}
                      >
                        {policy.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap bg-slate-50/50 p-4 rounded-2xl border border-slate-50 mb-6 max-h-[220px] overflow-y-auto text-right">
                    {policy.content}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase">ID: {policy.id}</span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPolicy(policy)}
                      className="text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePolicy(policy.id)}
                      className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {policies.length === 0 && (
              <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 p-8 text-slate-400 space-y-4 shadow-sm flex flex-col items-center">
                <FileText className="h-12 w-12 text-slate-300 animate-pulse" />
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-slate-700">لا يوجد أي سياسات للموقع حالياً</h5>
                  <p className="text-xs text-slate-500 font-semibold max-w-xs mx-auto">
                    تم حذف جميع السياسات بنجاح. يمكنك إضافتها يدوياً أو استعادتها تلقائياً بالكامل في قاعدة البيانات بضغطة زر واحدة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefaultPolicies}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>استعادة وإنشاء السياسات الافتراضية الآن 👑</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Delete Gateway Confirmation Modal */}
      {gatewayToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4" dir={dir}>
          <div 
            className={`relative bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl p-6 text-slate-800 animate-fade-in ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="bg-red-50 p-3 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">{texts.confirmGatewayDelete}</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
              {texts.deleteGatewayWarning.replace('{name}', gatewayToDelete.name)}
            </p>
            
            <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'justify-end' : 'justify-start'}`}>
              <button
                type="button"
                onClick={() => setGatewayToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {texts.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGateway(gatewayToDelete.id);
                  if (editingGateway?.id === gatewayToDelete.id) {
                    setEditingGateway(null);
                  }
                  setGatewayToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-100"
              >
                <Trash2 className="h-4 w-4" />
                <span>{texts.confirmDeletePermanent}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Generic Confirmation Modal for Sandbox Environment Safeness */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4" dir="rtl">
          <div 
            className="relative bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl p-6 text-slate-800 animate-fade-in text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-500 mb-4 justify-start">
              <div className="bg-amber-50 p-3 rounded-full text-amber-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">{confirmModal.title}</h3>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
              {confirmModal.message}
            </p>
            
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'إلغاء'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
              >
                <span>{confirmModal.confirmText || 'تأكيد'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
