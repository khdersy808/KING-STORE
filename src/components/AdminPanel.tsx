/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, PaymentGateway, Order, ProductType, OrderStatus } from '../types';
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
  Tags
} from 'lucide-react';
import { User } from '../types';

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
}

type AdminTab = 'analytics' | 'products' | 'categories' | 'gateways' | 'orders' | 'admins';

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
  onUpdateCategory
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  // Product form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formType, setFormType] = useState<ProductType>('physical');
  const [formCategory, setFormCategory] = useState(() => categories[0] || 'إلكترونيات');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formDownloadUrl, setFormDownloadUrl] = useState('');
  const [formLicenseKeys, setFormLicenseKeys] = useState('');
  const [productFormError, setProductFormError] = useState('');

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
  const [gatewayFieldLabels, setGatewayFieldLabels] = useState<Record<string, string>>({});

  // Add custom payment gateway states
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [newGatewayName, setNewGatewayName] = useState('');
  const [newGatewayIcon, setNewGatewayIcon] = useState('CreditCard');
  const [newGatewayInstructions, setNewGatewayInstructions] = useState('');
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

  // Reset product form
  const resetProductForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    setFormType('physical');
    setFormCategory(categories[0] || 'إلكترونيات');
    setFormImageUrl('');
    setFormStock(10);
    setFormDownloadUrl('');
    setFormLicenseKeys('');
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
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToUse,
          aspectRatio: aiAspectRatio,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل في توليد الصورة.');
      }

      setGeneratedImageUrl(data.imageUrl);
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
      // 1. Generate Product Details
      const detailsResponse = await fetch('/api/ai/generate-product-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      const imgResponse = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: imgPromptToUse,
          aspectRatio: '1:1',
        }),
      });

      const imgData = await imgResponse.json();
      if (!imgResponse.ok) {
        console.warn('Image generation failed, but product details were created.');
        setAiProductError('تم توليد تفاصيل المنتج بنجاح، ولكن فشل توليد الصورة تلقائياً. يمكنك توليدها يدوياً.');
      } else {
        setFormImageUrl(imgData.imageUrl);
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
    setFormType(product.type);
    setFormCategory(product.category);
    setFormImageUrl(product.imageUrl);
    setFormStock(product.stock || 0);
    setFormDownloadUrl(product.downloadUrl || '');
    setFormLicenseKeys(product.licenseKeys?.join(', ') || '');
  };

  // Handle saving product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formDescription.trim() || formPrice <= 0) {
      setProductFormError('يرجى ملء جميع الحقول المطلوبة وكتابة سعر صحيح.');
      return;
    }

    const licenseKeysArray = formLicenseKeys
      ? formLicenseKeys.split(',').map(k => k.trim()).filter(Boolean)
      : undefined;

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : `p-${Date.now()}`,
      name: formName,
      description: formDescription,
      price: Number(formPrice),
      type: formType,
      category: formCategory,
      imageUrl: formImageUrl.trim() || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
      stock: formType === 'physical' ? Number(formStock) : undefined,
      downloadUrl: formType === 'digital' ? formDownloadUrl.trim() : undefined,
      licenseKeys: formType === 'digital' ? licenseKeysArray : undefined,
      reviews: editingProduct ? editingProduct.reviews : undefined
    };

    if (editingProduct) {
      onUpdateProduct(savedProduct);
    } else {
      onAddProduct(savedProduct);
    }

    resetProductForm();
  };

  // Populate gateway form for editing
  const startEditGateway = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setGatewayInstructions(gateway.instructions);
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
      fields: newGatewayFields
    };

    onAddGateway(newGateway);

    // Reset States
    setNewGatewayName('');
    setNewGatewayIcon('CreditCard');
    setNewGatewayInstructions('');
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
      
      // Format the date label in Arabic (e.g., "26 يونيو")
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
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

  const getGatewayIcon = (iconName: string) => {
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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      
      {/* Title & Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">لوحة الإدارة والتخصيص</h2>
          <p className="text-sm text-slate-500 mt-1">
            إدارة المنتجات الملموسة والرقمية، تهيئة وضبط بوابات الدفع، ومتابعة الطلبات المكتملة والواردة.
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
            <span>نظرة عامة والتحليلات</span>
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
            <span>إدارة المنتجات ({products.length})</span>
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
            <span>تخصيص الفئات ({categories.length})</span>
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
            <span>بوابات الدفع ({gateways.length})</span>
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
            <span>الطلبات الواردة ({orders.length})</span>
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
            <span>المدراء والدعوات ({users.filter(u => u.role === 'admin').length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Bento Statistics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Total Revenue */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400">إجمالي الأرباح المكتملة</span>
                <h3 className="mt-2 text-3xl font-black text-amber-600">${totalRevenue.toLocaleString()}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">مكتملة ومؤكدة بالكامل</span>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3.5 text-amber-600">
                <DollarSign className="h-6 w-6 stroke-[2.5]" />
              </div>
            </div>

            {/* Total Orders */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400">إجمالي الطلبات</span>
                <h3 className="mt-2 text-3xl font-black text-slate-900">{orders.length} طلبات</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  {pendingOrdersCount} قيد المراجعة / {completedOrdersCount} مكتمل
                </span>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3.5 text-blue-600">
                <ListOrdered className="h-6 w-6" />
              </div>
            </div>

            {/* Physical Products */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400">منتجات ملموسة (شحن)</span>
                <h3 className="mt-2 text-3xl font-black text-blue-600">{physicalProductsCount} أصناف</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">جوالات، ملابس، ساعات...</span>
              </div>
              <div className="rounded-xl bg-blue-500/10 p-3.5 text-blue-600">
                <Package className="h-6 w-6" />
              </div>
            </div>

            {/* Digital Products */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400">منتجات غير ملموسة (رقمية)</span>
                <h3 className="mt-2 text-3xl font-black text-emerald-600">{digitalProductsCount} أصناف</h3>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">أكواد، مفاتيح تفعيل، كورسات...</span>
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
              <div className="mb-4">
                <h4 className="text-sm font-bold text-zinc-100">إيرادات المبيعات اليومية (آخر 7 أيام)</h4>
                <p className="text-[10px] text-zinc-400 mt-1">إجمالي الإيرادات بالدولار للطلبات المكتملة والمؤكدة</p>
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
                      formatter={(value) => [`$${value}`, 'الإيرادات']}
                      labelFormatter={(label) => `التاريخ: ${label}`}
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
              <div className="mb-4">
                <h4 className="text-sm font-bold text-zinc-100">تكرار وحجم الطلبات (آخر 7 أيام)</h4>
                <p className="text-[10px] text-zinc-400 mt-1">عدد الطلبات اليومية الواردة (مكتملة ومراجعة)</p>
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
                      formatter={(value) => [`${value} طلب`, 'عدد الطلبات']}
                      labelFormatter={(label) => `التاريخ: ${label}`}
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

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form (Create or Edit) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {editingProduct ? <Edit2 className="h-5 w-5 text-amber-600" /> : <Plus className="h-5 w-5 text-amber-600" />}
                  <span>{editingProduct ? 'تعديل منتج موجود' : 'إضافة منتج جديد للمتجر'}</span>
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
                          value={aiProductDesc}
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
                      value={formName}
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
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">الفئة</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none cursor-pointer text-right font-medium"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        {formCategory && !categories.includes(formCategory) && (
                          <option value={formCategory}>{formCategory}</option>
                        )}
                        {categories.length === 0 && (
                          <option value="أخرى">أخرى</option>
                        )}
                      </select>
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
                          value={formDownloadUrl}
                          onChange={(e) => setFormDownloadUrl(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">أكواد الترخيص الجاهزة للتسليم (مفصولة بفاصلة)</label>
                        <input
                          type="text"
                          placeholder="KEY-1234, KEY-5678, KEY-9900"
                          value={formLicenseKeys}
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
                      <input
                        type="text"
                        placeholder="رابط الصورة (سيتم تعبئته تلقائياً عند توليد الصورة بالذكاء الاصطناعي)"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none pl-10"
                      />
                      {formImageUrl && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <img
                            src={formImageUrl}
                            alt="Preview"
                            className="h-6 w-6 object-cover rounded border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
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
                              value={aiPrompt}
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
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">أبعاد الصورة (Aspect Ratio):</label>
                              <select
                                value={aiAspectRatio}
                                onChange={(e) => setAiAspectRatio(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:border-amber-400 focus:outline-none"
                              >
                                <option value="1:1">1:1 (مربع - افتراضي)</option>
                                <option value="16:9">16:9 (عريض - لاندسكيب)</option>
                                <option value="9:16">9:16 (رأسي - بورتريت)</option>
                                <option value="4:3">4:3 (شاشة كلاسيكية)</option>
                                <option value="3:4">3:4 (رأسي كلاسيكي)</option>
                              </select>
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
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">كل منتجات KING STORE</h3>
                <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                  إجمالي الأصناف: {products.length}
                </span>
              </div>

              {products.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  لا يوجد منتجات لعرضها. أضف منتجاً جديداً الآن من اليسار!
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
                      {products.map((p) => (
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
                    value={newCategoryName}
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
                      value={editingCategoryName}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-500 focus:outline-none text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الجديد للفئة *</label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الجديد..."
                      value={editCategoryNewValue}
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
                            onClick={async () => {
                              if (count > 0) {
                                if (!confirm(`تحذير: الفئة "${cat}" تحتوي على ${count} منتج(منتجات) مرتبطة بها. حذف هذه الفئة لن يحذف المنتجات ولكن قد يؤثر على فلترتها. هل تود الاستمرار بالحذف؟`)) {
                                  return;
                                }
                              }
                              await onDeleteCategory(cat);
                              if (editingCategoryName === cat) {
                                setEditingCategoryName(null);
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
                      value={newGatewayName}
                      onChange={(e) => setNewGatewayName(e.target.value)}
                      placeholder="مثال: STC Pay، تحويل فودافون كاش، محفظة أورنج..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Gateway Icon */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">أيقونة البوابة الافتراضية *</label>
                    <select
                      value={newGatewayIcon}
                      onChange={(e) => setNewGatewayIcon(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus:border-amber-400 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="CreditCard">بطاقة ائتمانية / مدى (CreditCard)</option>
                      <option value="Smartphone">محفظة هاتف ذكي (Smartphone)</option>
                      <option value="Wallet">محفظة إلكترونية / PayPal (Wallet)</option>
                      <option value="Building">تحويل بنكي (Building)</option>
                      <option value="Truck">الدفع عند الاستلام (Truck)</option>
                    </select>
                  </div>

                  {/* Gateway Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الدفع والتحويل للعميل *</label>
                    <textarea
                      required
                      rows={3}
                      value={newGatewayInstructions}
                      onChange={(e) => setNewGatewayInstructions(e.target.value)}
                      placeholder="اكتب أرقام الحسابات البنكية أو أرقام الهواتف وتوجيهات عملية الإرسال التي ستظهر للعميل أثناء الطلب..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Custom Fields configuration */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <label className="block text-xs font-bold text-slate-800">حقول التحقق المطلوبة من العميل (اختياري)</label>
                    <p className="text-[10px] text-slate-500 leading-relaxed">أضف حقولاً ليقوم العميل بتعبئتها لتأكيد عملية التحويل (مثل رقم المعاملة أو اسم المحول).</p>
                    
                    {/* List of currently added fields */}
                    {newGatewayFields.length > 0 && (
                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {newGatewayFields.map(f => (
                          <div key={f.key} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60 text-xs">
                            <div className="text-right">
                              <span className="font-bold text-slate-800">{f.label}</span>
                              <span className="text-[9px] text-slate-400 block font-mono">({f.key})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomField(f.key)}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Custom Field Form */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">معرف الحقل (بالإنجليزي) *</label>
                          <input
                            type="text"
                            value={fieldKey}
                            onChange={(e) => setFieldKey(e.target.value)}
                            placeholder="مثال: receipt_name"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-amber-400 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-0.5">اسم الحقل بالعربية *</label>
                          <input
                            type="text"
                            value={fieldLabel}
                            onChange={(e) => setFieldLabel(e.target.value)}
                            placeholder="مثال: اسم المحول"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5">نص توضيحي للعميل (اختياري)</label>
                        <input
                          type="text"
                          value={fieldPlaceholder}
                          onChange={(e) => setFieldPlaceholder(e.target.value)}
                          placeholder="مثال: الاسم كما في الحساب"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="w-full rounded-lg bg-amber-500/10 border border-amber-500/20 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        + إدراج حقل تحقق العميل
                      </button>
                    </div>
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
                    {getGatewayIcon(editingGateway.iconName)}
                    <span>ضبط بوابة: {editingGateway.name}</span>
                  </div>

                  {/* Gateway Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات الدفع والتحويل للعملاء *</label>
                    <textarea
                      required
                      rows={4}
                      value={gatewayInstructions}
                      onChange={(e) => setGatewayInstructions(e.target.value)}
                      placeholder="اكتب أرقام الحسابات البنكية أو أرقام الهواتف وتوجيهات عملية الإرسال لتظهر للعميل أثناء الدفع..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Customer Field Labels Config */}
                  {editingGateway.fields.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <label className="block text-xs font-bold text-slate-700">تخصيص مسميات حقول العميل المطلوب إدخالها:</label>
                      {editingGateway.fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">مسمى الحقل الحالي: ({field.key})</span>
                          <input
                            type="text"
                            value={gatewayFieldLabels[field.key] || ''}
                            onChange={(e) => setGatewayFieldLabels(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-amber-400 focus:bg-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}

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
                        {getGatewayIcon(gw.iconName)}
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
                        {gw.fields.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">الحقول المطلوبة:</span>
                            {gw.fields.map(f => (
                              <span key={f.key} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {f.label}
                              </span>
                            ))}
                          </div>
                        )}
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

                      {/* Delete custom gateway */}
                      {gw.id.startsWith('custom_') && (
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف طريقة الدفع المخصصة هذه؟')) {
                              onDeleteGateway(gw.id);
                              if (editingGateway?.id === gw.id) {
                                setEditingGateway(null);
                              }
                            }
                          }}
                          className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors"
                          title="حذف طريقة الدفع"
                          id={`delete-gw-${gw.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
                  value={orderSearchQuery}
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
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Filter className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500">النوع:</span>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value as any)}
                    className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">كل المنتجات</option>
                    <option value="physical">منتجات ملموسة فقط</option>
                    <option value="digital">منتجات رقمية فقط</option>
                  </select>
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
                              <div className="space-y-1.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black font-mono">
                                      {item.quantity}x
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-800 truncate max-w-[140px] block" title={item.productName}>
                                      {item.productName}
                                    </span>
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
                                  {Object.entries(order.paymentDetails || {}).map(([key, val]) => (
                                    <span key={key} className="text-[10px] text-slate-500 block truncate">
                                      {key}: <strong className="text-slate-800 select-all">{val}</strong>
                                    </span>
                                  ))}
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
                                    if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                                      onUpdateOrderStatus(order.id, 'cancelled');
                                    }
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
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
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
                        تأكيد الاكتمال
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
                          if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
                            onUpdateOrderStatus(selectedOrderForModal.id, 'cancelled');
                            setSelectedOrderForModal(prev => prev ? { ...prev, status: 'cancelled' } : null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black shadow-sm transition-all cursor-pointer"
                      >
                        إلغاء الطلب
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
                          {Object.entries(selectedOrderForModal.paymentDetails || {}).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-start gap-2 border-b border-slate-200/50 pb-1 last:border-0 last:pb-0">
                              <span className="text-[10px] text-slate-500 font-bold">{key}:</span>
                              <strong className="text-slate-800 select-all text-[11px] max-w-[140px] truncate font-mono text-left" title={val}>
                                {val}
                              </strong>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-500">مجموع المبلغ المدفوع:</span>
                          <span className="text-lg font-black text-amber-600 font-mono">
                            ${selectedOrderForModal.totalAmount}
                          </span>
                        </div>
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
                      value={adminEmailToInvite}
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
                        value={generatedLink}
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
                    <span>دعوات الإدارة النشطة قيد الانتظار</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {invitations.length} معلقة
                  </span>
                </div>

                {invitations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs leading-relaxed">
                    لا توجد دعوات نشطة معلقة حالياً. جميع الدعوات السابقة تم قبولها أو لم يتم إنشاؤها بعد.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                        <tr>
                          <th className="p-4">البريد الإلكتروني المدعو</th>
                          <th className="p-4">تاريخ الإنشاء</th>
                          <th className="p-4">حالة الدعوة</th>
                          <th className="p-4 text-center">الإجراءات</th>
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
                                <span>في الانتظار (Pending)</span>
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}?invite_email=${encodeURIComponent(inv.email)}&invite_role=admin`;
                                    navigator.clipboard.writeText(link);
                                    alert('تم نسخ الرابط الحصري للدعوة إلى الحافظة!');
                                  }}
                                  className="text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg p-1.5 transition-colors cursor-pointer border border-amber-200"
                                  title="نسخ رابط الدعوة"
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
                                  title="إلغاء الدعوة وسحبها"
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
                    <span>المدراء الحاليين للنظام (Admins)</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    {users.filter(u => u.role === 'admin').length} مدراء
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <tr>
                        <th className="p-4">اسم المدير</th>
                        <th className="p-4">البريد الإلكتروني</th>
                        <th className="p-4">مرتبة العضوية</th>
                        <th className="p-4 text-center">التحكم بالصلاحيات</th>
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
                                <span>{isMainAdmin ? 'المدير العام المطور' : 'مدير نظام مساعد'}</span>
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {isMainAdmin ? (
                                <span className="text-[10px] text-slate-400 font-semibold">غير قابل للحذف</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من سحب صلاحيات الإدارة من ${u.name}؟`)) {
                                      onDeleteUser(u.id);
                                    }
                                  }}
                                  className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  سحب الصلاحيات
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

    </main>
  );
}
