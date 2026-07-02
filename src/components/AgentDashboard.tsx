import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Wallet, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRightLeft, 
  Download, 
  Search, 
  ShoppingBag, 
  Copy, 
  Check, 
  Sparkles, 
  AlertTriangle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { db, doc, updateDoc, onSnapshot, collection } from '../lib/firebase';
import { Order, OrderStatus, Product, Agent } from '../types';

interface AgentDashboardProps {
  currentUser: {
    uid: string;
    name: string;
    email: string;
    role: string;
  };
  orders: Order[];
  products: Product[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onBackToStore: () => void;
}

export default function AgentDashboard({
  currentUser,
  orders,
  products,
  onUpdateOrderStatus,
  onBackToStore
}: AgentDashboardProps) {
  const [agentData, setAgentData] = useState<Agent | null>(null);
  const [walletInput, setWalletInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedProdId, setCopiedProdId] = useState<string | null>(null);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Agent data from Firestore
  useEffect(() => {
    if (!currentUser.email) return;

    // Use onSnapshot to get live data of the agent
    const docRef = doc(db, 'agents', currentUser.email.toLowerCase());
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Agent;
        setAgentData({ id: docSnap.id, ...data });
        setWalletInput(data.walletLink || '');
      } else {
        // Fallback or not initialized yet
        setAgentData(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching agent data:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.email]);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // 2. Update wallet address/link in Firestore
  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.email) return;

    try {
      const docRef = doc(db, 'agents', currentUser.email.toLowerCase());
      await updateDoc(docRef, {
        walletLink: walletInput
      });
      triggerToast('success', '👑 تم تحديث رابط المحفظة الإلكترونية بنجاح!');
    } catch (err: any) {
      console.error("Error updating wallet link:", err);
      triggerToast('error', 'فشل في تحديث المحفظة، يرجى المحاولة لاحقاً.');
    }
  };

  // 3. Filter orders belonging to this agent
  const agentOrders = orders.filter(o => {
    if (!agentData) return false;
    
    // Direct attribution via referral/agentId
    const isDirectRef = o.agentId && o.agentId.toLowerCase() === currentUser.email.toLowerCase();
    
    // Or does the order contain products belonging to assigned categories or products list?
    const hasAssignedCategoryProduct = o.items.some(item => {
      const product = products.find(p => p.id === item.productId || p.name === item.productName);
      return product && product.category && agentData.assignedCategories?.includes(product.category);
    });

    const hasAssignedProduct = o.items.some(item => 
      agentData.assignedProducts?.includes(item.productId)
    );

    return isDirectRef || hasAssignedCategoryProduct || hasAssignedProduct;
  });

  // Calculations
  const completedOrders = agentOrders.filter(o => o.status === 'completed');
  
  // Total Sales (مكتمل فقط)
  const totalSalesAmount = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Pending Dues (المبالغ المستحقة للوكيل أو التحصيل)
  // Let's count completed, unsettled orders:
  const unsettledOrders = completedOrders.filter(o => !(o as any).isAgentSettled || (o as any).isAgentSettled === 'false' || (o as any).isAgentSettled === false);
  const pendingDuesAmount = unsettledOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = agentOrders.filter(o => o.status === 'pending').length;

  // Filtered orders list for display
  const filteredOrders = agentOrders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // 4. Export CSV of agent sales
  const handleExportCSV = () => {
    if (agentOrders.length === 0) {
      triggerToast('error', 'لا توجد مبيعات مسجلة لتصديرها.');
      return;
    }

    // CSV Headers with UTF-8 BOM
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "رقم الطلب,تاريخ الطلب,اسم الزبون,رقم الهاتف,المبلغ الإجمالي,حالة الطلب,حالة التسوية الماليّة,المنتجات المطلوبة\n";

    agentOrders.forEach(o => {
      const itemsString = o.items.map(i => `${i.productName} (${i.quantity}x)`).join(" - ");
      const settledStatus = (o as any).isAgentSettled === 'true' || (o as any).isAgentSettled === true ? "تمت التسوية مع الإدارة" : "قيد التحصيل / معلق";
      const statusAr = o.status === 'completed' ? 'مكتمل' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار';
      const formattedDate = new Date(o.date).toLocaleDateString('ar-EG');
      
      csvContent += `"${o.id}","${formattedDate}","${o.customerName}","${o.customerPhone}","${o.totalAmount}","${statusAr}","${settledStatus}","${itemsString}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_مبيعات_الوكيل_${currentUser.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('success', '📥 تم تحميل كشف المبيعات بنجاح!');
  };

  // Copy Referral link for a specific product
  const handleCopyProductLink = (productId: string) => {
    const referralLink = `${window.location.origin}?agent=${encodeURIComponent(currentUser.email.toLowerCase())}&product=${productId}`;
    navigator.clipboard.writeText(referralLink);
    setCopiedProdId(productId);
    setTimeout(() => setCopiedProdId(null), 2500);
    triggerToast('success', '🔗 تم نسخ رابط التسويق المباشر لهذا المنتج!');
  };

  // Copy General Referral Store link
  const handleCopyGeneralLink = () => {
    const refLink = `${window.location.origin}?agent=${encodeURIComponent(currentUser.email.toLowerCase())}`;
    navigator.clipboard.writeText(refLink);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2500);
    triggerToast('success', '🔗 تم نسخ الرابط التسويقي العام للمتجر!');
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center bg-slate-950">
        <div className="relative h-12 w-12 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-500" />
      </div>
    );
  }

  // If the user logged in as agent, but there is no document in Firestore `agents` collection
  if (!agentData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-right">
        <div className="rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-zinc-100 shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-amber-500 animate-pulse" />
            <h2 className="text-2xl font-black text-white">تنبيه الصلاحية والأمان ⚙️</h2>
            <p className="text-zinc-300 max-w-md text-center leading-relaxed text-sm">
              أهلاً بك يا <span className="text-amber-400 font-bold">{currentUser.name}</span>. تم تسجيل حسابك كوكيل معتمد، ولكن حسابك لم يتم تفعيله أو تهيئته بالكامل من قبل إدارة المتجر بعد.
            </p>
            <p className="text-zinc-400 text-xs text-center">
              يرجى التواصل مع الإدارة الفنية لربط حسابك وتخصيص المنتجات المتاحة لك للتسويق والمبيعات.
            </p>
            <button
              onClick={onBackToStore}
              className="mt-6 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400"
            >
              العودة للمتجر الرئيسي 👑
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render blocked warning
  if (agentData.status === 'blocked') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-right">
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 backdrop-blur-sm p-8 text-zinc-100 shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <ShieldAlert className="h-16 w-16 text-red-500 animate-bounce" />
            <h2 className="text-2xl font-black text-red-400">حساب الوكيل محظور ⛔</h2>
            <p className="text-zinc-300 max-w-md text-center leading-relaxed text-sm">
              نأسف لإبلاغك بأن حسابك الملكي للوكالة المعتمدة قد تم حظره مؤقتاً من قبل الإدارة الفنية لمتجر King Store.
            </p>
            <p className="text-zinc-400 text-xs text-center">
              تواصل مع المسؤول المباشر لتسوية الأمور المالية وتفعيل الحساب مرة أخرى.
            </p>
            <button
              onClick={onBackToStore}
              className="mt-6 rounded-xl bg-slate-800 px-6 py-3 text-xs font-black text-white hover:bg-slate-700 transition-colors"
            >
              العودة للمتجر الرئيسي 👑
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get assigned products detail: direct products or products belonging to assigned categories
  const assignedProductsDetails = products.filter(p => 
    agentData.assignedProducts?.includes(p.id) || 
    (p.category && agentData.assignedCategories?.includes(p.category))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 text-right" dir="rtl">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-6 z-50 rounded-2xl border border-amber-500/30 bg-slate-900 px-5 py-4 text-zinc-100 shadow-2xl animate-fade-in flex items-center gap-3">
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold">{notification.text}</span>
        </div>
      )}

      {/* 1. Header Hero with visual luxury */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 p-6 sm:p-8 text-zinc-100 shadow-2xl mb-8">
        <div className="absolute inset-0 bg-gradient-to-l from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-12 -left-12 h-32 w-32 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0) 70%)' }} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-black text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>وكيل مبيعات معتمد 👑</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">لوحة تحكم الوكيل: {agentData.name} ✨</h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
              مرحباً بك في لوحة تحكم مبيعاتك المخصصة. هنا يمكنك مراقبة عمولاتك، مبيعات الزبائن وتأكيد طلباتهم مباشرة، وإضافة حسابات الدفع والتحصيل الخاصة بك.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={handleCopyGeneralLink}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-bold px-4 py-3 text-xs transition-all cursor-pointer"
            >
              {isCopiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>نسخ الرابط التسويقي العام للمتجر</span>
            </button>
            <button
              onClick={onBackToStore}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              المتجر الرئيسي 🛒
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Widgets */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        
        {/* Total Sales (إجمالي المبيعات) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-slate-900 p-6 text-zinc-100 shadow-xl">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">إجمالي المبيعات المكتملة 💰</p>
              <h3 className="text-2xl font-black text-white mt-1">{(totalSalesAmount).toLocaleString()} ل.س</h3>
              <p className="text-[10px] text-zinc-400 mt-1">من مبيعات زبائنك المسجلة والموافق عليها</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Pending Dues (المبالغ المستحقة) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-slate-900 p-6 text-zinc-100 shadow-xl">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-rose-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">المبالغ غير المسواة للتحصيل 💸</p>
              <h3 className="text-2xl font-black text-white mt-1">{(pendingDuesAmount).toLocaleString()} ل.س</h3>
              <p className="text-[10px] text-zinc-400 mt-1">مبالغ مترتب تسويتها مع مدير المتجر</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Active Orders (الطلبات النشطة) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-slate-900 p-6 text-zinc-100 shadow-xl">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">الطلبات قيد الانتظار ⏳</p>
              <h3 className="text-2xl font-black text-white mt-1">{pendingOrdersCount} طلبات</h3>
              <p className="text-[10px] text-zinc-400 mt-1">تحتاج للموافقة أو الرفض أو المعالجة</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Allowed Products Count */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-slate-900 p-6 text-zinc-100 shadow-xl">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">المنتجات المرخص تسويقها 📦</p>
              <h3 className="text-2xl font-black text-white mt-1">{assignedProductsDetails.length} من المنتجات</h3>
              <p className="text-[10px] text-zinc-400 mt-1">متاح لك ترويجها وتوليد روابط تسويقية لها</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Main Dashboard Layout splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* RIGHT 2 COLUMNS: Orders management (الطلبات الخاصة به) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-zinc-100 shadow-xl">
            
            {/* Header of section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white">📦 إدارة طلبات ومبيعات زبائنك</h2>
                <p className="text-xs text-zinc-400">تابع الطلبات المقدمة من خلال رابطك التسويقي وقم بتحديث حالتها فوراً</p>
              </div>

              {/* Download CSV button */}
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-100 px-4 py-2.5 text-xs font-bold border border-slate-700 transition-colors"
                title="تحميل كشف مبيعات الوكيل Excel/CSV"
              >
                <Download className="h-4 w-4" />
                <span>تحميل تقرير المبيعات (Export CSV)</span>
              </button>
            </div>

            {/* Filter and search bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="البحث برقم الطلب أو اسم الزبون أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 pl-4 pr-10 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                {['all', 'pending', 'completed', 'cancelled'].map((status) => {
                  const label = status === 'all' ? 'الكل' : status === 'pending' ? 'قيد الانتظار' : status === 'completed' ? 'مكتمل' : 'ملغي';
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        statusFilter === status 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-950/60 text-zinc-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Orders Table/List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-slate-950/20">
                <ShoppingBag className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-400">لا توجد أي طلبات مطابقة للبحث أو الفلتر المختار حالياً</p>
                <p className="text-xs text-zinc-500 mt-1">تأكد من مشاركة روابطك التسويقية لتلقي الطلبات من زبائنك المعتمدين.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id}
                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700/80 transition-all p-5 space-y-4"
                  >
                    {/* Header line of the order */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-amber-500">#{order.id}</span>
                        <span className="text-xs text-zinc-400">تاريخ: {new Date(order.date).toLocaleDateString('ar-EG')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Settlement Indicator */}
                        {(order as any).isAgentSettled === 'true' || (order as any).isAgentSettled === true ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            ✓ تمت التسوية مالياً
                          </span>
                        ) : order.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20" title="أرباح هذه العملية لم يتم تسويتها بعد مع الأدمن">
                            ⚠️ غير مسوى مالياً
                          </span>
                        ) : null}

                        {/* Status Badge */}
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                          order.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : order.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/50">
                      <div>
                        <span className="text-zinc-500 block mb-1">اسم العميل المعتمد:</span>
                        <span className="text-zinc-100 font-bold">{order.customerName}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">رقم هاتف العميل:</span>
                        <span className="text-zinc-100 font-bold" dir="ltr">{order.customerPhone}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">طريقة الدفع المختارة:</span>
                        <span className="text-zinc-100 font-bold text-[11px]">{order.paymentMethodId}</span>
                      </div>
                    </div>

                    {/* Ordered Items */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-zinc-400 block font-bold mb-1">تفاصيل المنتجات والمبيعات:</span>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-lg border border-slate-900">
                          <span className="text-zinc-300">{item.productName} (الكمية: {item.quantity}x)</span>
                          <span className="text-amber-400 font-black">{item.price.toLocaleString()} ل.س</span>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs sm:text-sm">
                      <div>
                        <span className="text-zinc-400 font-bold">المبلغ الإجمالي للطلب: </span>
                        <span className="text-white font-black text-base sm:text-lg">{(order.totalAmount).toLocaleString()} ل.س</span>
                      </div>

                      {/* Payment receipt link if exists */}
                      {order.receiptUrl && (
                        <a 
                          href={order.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 underline font-bold"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>عرض إيصال التحصيل</span>
                        </a>
                      )}
                    </div>

                    {/* Agent Control Actions (صلاحية تحديث حالة الطلب) */}
                    {order.status === 'pending' && (
                      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>صلاحية معالجة الطلب: يرجى تأكيد الدفع واستلام الأموال أولاً قبل اتخاذ الإجراء</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {/* 1. APPROVE */}
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black py-2.5 text-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>موافقة وتوصيل الطلب ✅</span>
                          </button>

                          {/* 2. REJECT */}
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'cancelled')}
                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 border border-rose-500/30 font-bold py-2.5 text-xs transition-all cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>رفض وإلغاء الطلب ❌</span>
                          </button>

                          {/* 3. SET TO PROCESSING / LEAVE AS PENDING */}
                          <button
                            onClick={() => onUpdateOrderStatus(order.id, 'pending')}
                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 text-zinc-100 hover:bg-slate-700 font-bold py-2.5 text-xs transition-colors cursor-pointer"
                          >
                            <Clock className="h-4 w-4" />
                            <span>قيد التنفيذ / معالجة</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* LEFT 1 COLUMN: Settings & Assigned products info */}
        <div className="space-y-6">
          
          {/* 1. Account Settings: Syriatel Cash / Cham Cash */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-zinc-100 shadow-xl">
            <h2 className="text-base font-black text-white border-b border-slate-800 pb-3 mb-4">⚙️ إعدادات الحساب والتحصيل المالي</h2>
            
            <form onSubmit={handleUpdateWallet} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-bold block">رابط محفظة الوكيل الإلكترونية ( Syriatel Cash / Cham Cash )</label>
                <div className="relative">
                  <Wallet className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  <input
                    type="text"
                    value={walletInput}
                    onChange={(e) => setWalletInput(e.target.value)}
                    placeholder="مثال: الرقم 093XXXXXXXX سيرياتيل كاش"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-4 pr-10 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  هذا الرقم/الرابط يستخدم لتسهيل عملية التحاسب المالي وتسوية الديون مع إدارة المتجر بناءً على مبيعاتك الإجمالية.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/5"
              >
                تحديث بيانات التحصيل والربط الملكية 👑
              </button>
            </form>
          </div>

          {/* 2. Assigned Products Marketing Hub */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-zinc-100 shadow-xl">
            <h2 className="text-base font-black text-white border-b border-slate-800 pb-3 mb-4">🔗 المنتجات المرخص تسويقها لك</h2>
            
            {assignedProductsDetails.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs leading-relaxed">
                لم يقم مدير المتجر بتخصيص أي منتجات محددة لك بعد. سيتم عرض المنتجات هنا فور تخصيصها في لوحة الإدارة.
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {assignedProductsDetails.map((product) => (
                  <div 
                    key={product.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3 hover:border-amber-500/20 transition-all"
                  >
                    <div className="flex gap-3">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="h-12 w-12 rounded-lg object-cover bg-slate-900 border border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <h4 className="font-bold text-white truncate">{product.name}</h4>
                        <span className="text-[11px] text-zinc-400 block">{product.category}</span>
                        <span className="text-amber-400 font-black">{(product.price).toLocaleString()} ل.س</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyProductLink(product.id)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-amber-500 hover:text-amber-400 font-bold py-1.5 text-[11px] border border-amber-500/20 transition-colors"
                    >
                      {copiedProdId === product.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم نسخ رابط التسويق!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>نسخ الرابط التسويقي للمنتج</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
