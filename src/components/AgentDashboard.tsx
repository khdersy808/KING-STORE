import React, { useState, useEffect } from 'react';
import { Agent, Order, Product } from '../types';
import { db, collection, onSnapshot, query, addDoc, where, orderBy, limit } from '../lib/firebase';
import { auth, onAuthStateChanged } from '../lib/firebase';
import { 
  Plus, Users, Phone, Percent, Mail, User, X, Shield, Award, 
  BarChart3, Package, DollarSign, ListOrdered, TrendingUp, 
  Search, ExternalLink, Printer, CheckCircle2, Clock, 
  Download, Calendar, FileText, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { updateDoc, doc, serverTimestamp } from '../lib/firebase';

interface AgentDashboardProps {
  isAdminMode?: boolean;
}

export default function AgentDashboard({ isAdminMode = false }: AgentDashboardProps) {
  const { t, texts, dir } = useLanguage();
  const { formatPrice, currency } = useCurrency();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  // Inventory/Account Details States
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'stats' | 'inventory' | 'pricing' | 'orders'>('stats');
  
  // Inventory Form State
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({
    productId: '',
    quantity: 1,
    deliveryDate: new Date().toISOString().split('T')[0],
    costPrice: 0,
    notes: ''
  });
  const [isSubmittingInventory, setIsSubmittingInventory] = useState(false);
  
  // New agent form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profitPercentage, setProfitPercentage] = useState(10);
  const [userId, setUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'agents'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent));
        setAgents(data);
      },
      (error) => {
        console.error("Error fetching agents:", error);
      }
    );

    // Fetch all products for the pricing/inventory list
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setAllProducts(data);
    });

    return () => {
      unsubscribe();
      unsubscribeProducts();
    };
  }, []);

  // Fetch agent-specific data when an agent is selected
  useEffect(() => {
    if (!selectedAgent) return;

    setIsLoadingDetails(true);
    // Fetch orders linked to this agent (assuming referredBy or a future agentId field)
    const q = query(
      collection(db, 'orders'),
      where('agentId', '==', selectedAgent.id),
      orderBy('date', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAgentOrders(data);
      setIsLoadingDetails(false);
    }, (err) => {
      console.error("Error fetching agent orders:", err);
      // Fallback: search by referredBy if agentId is missing
      setIsLoadingDetails(false);
    });

    return () => unsubscribe();
  }, [selectedAgent]);

  const handleAddAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !phone.trim() || !userId.trim()) {
      setErrorMessage(texts.fillAgentData);
      return;
    }

    try {
      await addDoc(collection(db, 'agents'), {
        name: name.trim(),
        phone: phone.trim(),
        profitPercentage: Number(profitPercentage) || 10,
        ordersCount: 0,
        commissionStatus: 'pending',
        userId: userId.trim().toLowerCase(),
      });

      setSuccessMessage(texts.agentAddedSuccess);
      setName('');
      setPhone('');
      setProfitPercentage(10);
      setUserId('');
      setTimeout(() => {
        setShowAddForm(false);
        setSuccessMessage('');
      }, 1500);
    } catch (err: any) {
      console.error('Error adding agent:', err);
      setErrorMessage(texts.addAgentError);
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !inventoryForm.productId) return;

    setIsSubmittingInventory(true);
    try {
      const selectedProduct = allProducts.find(p => p.id === inventoryForm.productId);
      if (!selectedProduct) throw new Error("Product not found");

      // 1. Update Agent Document with new inventory
      // We'll store it as a map of productId to quantity
      const agentRef = doc(db, 'agents', selectedAgent.id);
      const currentInventory = (selectedAgent as any).inventory || {};
      const newQuantity = (currentInventory[inventoryForm.productId] || 0) + Number(inventoryForm.quantity);
      
      await updateDoc(agentRef, {
        [`inventory.${inventoryForm.productId}`]: newQuantity
      });

      // 2. Add log entry for audit trail
      await addDoc(collection(db, 'agents', selectedAgent.id, 'agent_logs'), {
        type: 'addition',
        productId: inventoryForm.productId,
        productName: selectedProduct.name,
        quantity: Number(inventoryForm.quantity),
        costPrice: Number(inventoryForm.costPrice),
        deliveryDate: inventoryForm.deliveryDate,
        notes: inventoryForm.notes,
        timestamp: serverTimestamp(),
        adminId: user?.uid,
        adminEmail: user?.email
      });

      // Update local state for immediate feedback
      setSelectedAgent({
        ...selectedAgent,
        inventory: {
          ...currentInventory,
          [inventoryForm.productId]: newQuantity
        }
      } as any);

      setShowInventoryForm(false);
      setInventoryForm({
        productId: '',
        quantity: 1,
        deliveryDate: new Date().toISOString().split('T')[0],
        costPrice: 0,
        notes: ''
      });
      
      alert('تم إضافة المنتج للمخزون وتسجيل العملية بنجاح! ✅');
    } catch (err) {
      console.error("Error adding inventory:", err);
      alert('حدث خطأ أثناء إضافة المنتج للمخزون. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmittingInventory(false);
    }
  };

  const exportAgentData = () => {
    if (!selectedAgent) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // Section 1: Agent Info
    csvContent += `تقرير حساب الوكيل: ${selectedAgent.name}\n`;
    csvContent += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n`;

    // Section 2: Current Inventory
    csvContent += "الجرد الحالي للمنتجات\n";
    csvContent += "المنتج,الكمية المتوفرة,القيمة التقديرية\n";
    allProducts.forEach(p => {
      const stock = (selectedAgent as any).inventory?.[p.id] || 0;
      if (stock > 0) {
        const value = p.price * (1 - selectedAgent.profitPercentage / 100) * stock;
        csvContent += `${p.name},${stock},${value}\n`;
      }
    });
    csvContent += "\n";

    // Section 3: Sales History
    csvContent += "سجل المبيعات والطلبات\n";
    csvContent += "التاريخ,رقم الطلب,القيمة الإجمالية,عمولة الوكيل,الحالة\n";
    agentOrders.forEach(order => {
      csvContent += `${new Date(order.date).toLocaleDateString('ar-EG')},${order.id},${order.totalAmount},${order.totalAmount * (selectedAgent.profitPercentage / 100)},${order.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_كامل_${selectedAgent.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Upper header section for Agents */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-amber-500/10">
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-400" />
            <span>{texts.certifiedAgents}</span>
          </p>
          <h3 className="text-lg font-black text-slate-800">{texts.agentsPanelTitle}</h3>
        </div>

        {isAdminMode && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs shadow-lg shadow-amber-500/15 cursor-pointer self-start sm:self-center transition-all"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" />
                <span>{texts.cancel}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{texts.addNewAgent}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Add New Agent Form Panel */}
      {isAdminMode && showAddForm && (
        <form 
          onSubmit={handleAddAgentSubmit}
          className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-fade-in ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
        >
          <h4 className="text-sm font-black text-slate-900 border-b border-slate-150 pb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span>{texts.addAgentTitle} 👑</span>
          </h4>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold">
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-xs font-bold">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">{texts.agentNameLabel}</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={texts.agentNamePlaceholder}
                  className={`w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 pr-10 pl-3 text-slate-900 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
                <User className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
              </div>
            </div>

            {/* Agent Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">{texts.agentPhoneLabel}</label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={texts.agentPhonePlaceholder}
                  className={`w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 text-slate-900 ${dir === 'rtl' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                  dir="ltr"
                />
                <Phone className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
              </div>
            </div>

            {/* Agent User Email/ID */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">{texts.agentEmailIdLabel}</label>
              <div className="relative">
                <input
                  type="email"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="مثال: agent@kingstore.com"
                  className={`w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 text-slate-900 ${dir === 'rtl' ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                  dir="ltr"
                />
                <Mail className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
              </div>
            </div>

            {/* Profit percentage */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">{texts.profitPercentLabel}</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profitPercentage}
                  onChange={(e) => setProfitPercentage(Number(e.target.value))}
                  className={`w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 text-slate-900 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                />
                <Percent className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
              </div>
            </div>
          </div>

          <div className={`pt-3 flex ${dir === 'rtl' ? 'justify-end' : 'justify-start'}`}>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 text-xs cursor-pointer shadow-md"
            >
              {texts.saveAgent}
            </button>
          </div>
        </form>
      )}

      {/* Agents Listing */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {agents.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">{texts.noAgentsFound}</h4>
            <p className="text-xs text-slate-500">{texts.agentsPanelDesc}</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div 
              key={agent.id} 
              className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className={`absolute top-0 w-1 h-full bg-amber-500 ${dir === 'rtl' ? 'right-0' : 'left-0'}`} />
              <div className={`space-y-1.5 flex-1 ${dir === 'rtl' ? 'pr-2' : 'pl-2'}`}>
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-slate-900 text-sm">{agent.name}</p>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-2 py-0.5">
                    {texts.availableNow} ✅
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{agent.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{agent.userId}</span>
                </div>
              </div>

              <div className={`space-y-1.5 shrink-0 sm:pr-4 ${dir === 'rtl' ? 'text-right sm:text-left pl-1 sm:border-r border-slate-100' : 'text-left sm:text-right pr-1 sm:border-l border-slate-100'}`}>
                <div className="bg-amber-50 text-amber-700 font-black text-xs px-2.5 py-1 rounded-lg border border-amber-100 inline-block">
                  {texts.profitShare} {agent.profitPercentage}%
                </div>
                <p className="text-[10px] font-bold text-slate-500">{texts.ordersDone} <span className="text-slate-900">{agent.ordersCount || 0}</span></p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${agent.commissionStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                  {agent.commissionStatus === 'paid' ? texts.paid : texts.pending}
                </span>
                
                {isAdminMode && (
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setActiveDetailTab('stats');
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-50 hover:bg-amber-500 hover:text-slate-950 text-slate-600 text-[10px] font-black transition-all border border-slate-100 hover:border-amber-400 group"
                  >
                    <BarChart3 className="h-3 w-3 transition-transform group-hover:scale-110" />
                    <span>تفاصيل الجرد والحساب 📊</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Agent Details & Inventory Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Shield className="h-6 w-6 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedAgent.name}</h3>
                  <p className="text-xs text-amber-400 font-bold">إدارة حساب وجرد الوكيل المعتمد</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
              {[
                { id: 'stats', label: 'ملخص الحساب', icon: TrendingUp },
                { id: 'inventory', label: 'المخزون والجرد', icon: Package },
                { id: 'pricing', label: 'قائمة الأسعار', icon: DollarSign },
                { id: 'orders', label: 'الطلبات الأخيرة', icon: ListOrdered },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                    activeDetailTab === tab.id 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                      : 'bg-transparent text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات الوكيل...</p>
                </div>
              ) : (
                <>
                  {activeDetailTab === 'stats' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المبيعات</p>
                          <h4 className="text-2xl font-black text-slate-900">
                            {formatPrice(agentOrders.reduce((sum, o) => sum + o.totalAmount, 0))}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
                            <TrendingUp className="h-3 w-3" />
                            <span>نمو بنسبة 12% هذا الشهر</span>
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مستحقات الوكيل</p>
                          <h4 className="text-2xl font-black text-amber-600">
                            {formatPrice(agentOrders.reduce((sum, o) => sum + (o.totalAmount * (selectedAgent.profitPercentage / 100)), 0))}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold">بناءً على نسبة {selectedAgent.profitPercentage}%</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الطلبات المكتملة</p>
                          <h4 className="text-2xl font-black text-slate-900">{selectedAgent.ordersCount || 0}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">من أصل {agentOrders.length} طلب</p>
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-2">
                            <h4 className="text-lg font-black flex items-center gap-2">
                              <Shield className="h-5 w-5 text-amber-500" />
                              <span>حالة الحساب المعتمد</span>
                            </h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-md">
                              هذا الوكيل يتمتع بصلاحيات الوصول إلى أسعار التكلفة الخاصة بالمتجر. يرجى مراجعة الجرد بشكل دوري لضمان دقة الحسابات.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button className="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all cursor-pointer">
                              تصدير التقرير PDF
                            </button>
                            <button className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black hover:bg-slate-700 transition-all cursor-pointer border border-slate-700">
                              تحديث البيانات
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'inventory' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Package className="h-5 w-5 text-amber-500" />
                          <span>الجرد الحالي للمنتجات في ذمة الوكيل</span>
                        </h4>
                        <button 
                          onClick={() => {
                            setInventoryForm(prev => ({ ...prev, costPrice: 0 }));
                            setShowInventoryForm(true);
                          }}
                          className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap">
                        <table className="w-full text-right min-w-[550px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">المنتج</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">المخزون المتوفر</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">قيمة المخزون</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {allProducts.map((product) => {
                              const stock = (selectedAgent as any).inventory?.[product.id] || 0;
                              if (stock === 0 && activeDetailTab === 'inventory' && !showInventoryForm) return null;

                              return (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <img src={product.imageUrl} className="w-8 h-8 rounded-lg object-cover bg-slate-100" />
                                      <div>
                                        <p className="text-xs font-black text-slate-900">{product.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold">{product.category}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="text-xs font-black text-slate-700">{stock} قطعة</span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                      stock > 10 ? 'bg-emerald-50 text-emerald-600' : 
                                      stock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                      {stock > 10 ? 'متوفر بكثرة' : stock > 0 ? 'مخزون منخفض' : 'نفذت الكمية'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="text-xs font-black text-slate-900">{formatPrice(product.price * (1 - selectedAgent.profitPercentage / 100) * stock)}</span>
                                  </td>
                                </tr>
                              );
                            })}
                            {Object.keys((selectedAgent as any).inventory || {}).length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-xs font-bold">
                                  لا يوجد مخزون حالي في عهدة الوكيل
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'pricing' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6">
                        <div className="flex gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-xl">
                            <DollarSign className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-amber-900">تخصيص تسعيرات الوكيل</p>
                            <p className="text-[10px] text-amber-700 font-medium mt-1">
                              يتم احتساب هذه الأسعار بناءً على سعر التكلفة المخصص لهذا الوكيل ({100 - selectedAgent.profitPercentage}% من السعر الأصلي)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap">
                        <table className="w-full text-right min-w-[550px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">المنتج</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">سعر التكلفة للوكيل</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">سعر البيع المقترح</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">هامش ربح الوكيل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {allProducts.slice(0, 8).map((product) => (
                              <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4">
                                  <p className="text-xs font-black text-slate-900">{product.name}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-xs font-black text-slate-500">{formatPrice(product.price * (1 - selectedAgent.profitPercentage / 100))}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-xs font-black text-slate-900">{formatPrice(product.price)}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className="text-xs font-black text-emerald-600">{formatPrice(product.price * (selectedAgent.profitPercentage / 100))}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'orders' && (
                    <div className="space-y-4 animate-fade-in">
                      {agentOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div className="p-4 bg-slate-100 rounded-full text-slate-300">
                            <Clock className="h-10 w-10" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">لا توجد طلبات مسجلة لهذا الوكيل حالياً</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {agentOrders.map((order) => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-500/30 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${
                                  order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  <Package className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-slate-900"># {order.id.slice(-6).toUpperCase()}</p>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                      order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {order.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(order.date).toLocaleDateString('ar-EG')}</p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-black text-slate-900">{formatPrice(order.totalAmount)}</p>
                                <p className="text-[9px] text-amber-600 font-bold mt-0.5">عمولة الوكيل: {formatPrice(order.totalAmount * (selectedAgent.profitPercentage / 100))}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="p-2 text-slate-400 hover:text-slate-900 transition-all"
                  title="طباعة التقرير"
                >
                  <Printer className="h-5 w-5" />
                </button>
                <button 
                  onClick={exportAgentData}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-all"
                  title="تصدير كملف CSV"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-all">
                  <ExternalLink className="h-5 w-5" />
                </button>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                إغلاق الواجهة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Modal (Nested) */}
      {showInventoryForm && selectedAgent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div 
            className="bg-slate-900 border border-amber-500/30 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-slate-950 to-slate-900">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <Package className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">إسناد بضاعة للوكيل</h3>
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{selectedAgent.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInventoryForm(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddInventory} className="p-8 space-y-5">
              <div className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Search className="h-3 w-3" /> اختيار المنتج من المتجر
                  </label>
                  <select
                    value={inventoryForm.productId}
                    onChange={(e) => {
                      const p = allProducts.find(prod => prod.id === e.target.value);
                      setInventoryForm(prev => ({ 
                        ...prev, 
                        productId: e.target.value,
                        costPrice: p ? Math.round(p.price * (1 - selectedAgent.profitPercentage / 100)) : 0
                      }));
                    }}
                    required
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">اختر المنتج...</option>
                    {allProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {formatPrice(p.price)}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الكمية / العدد</label>
                    <input
                      type="number"
                      min="1"
                      value={inventoryForm.quantity}
                      onChange={(e) => setInventoryForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-bold focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Delivery Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ التسليم</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={inventoryForm.deliveryDate}
                        onChange={(e) => setInventoryForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                        required
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-bold focus:border-amber-500 outline-none"
                      />
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Cost Price */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">سعر التكلفة للوكيل (بالدولار $ للقطعة)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inventoryForm.costPrice}
                      onChange={(e) => setInventoryForm(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-bold focus:border-amber-500 outline-none pr-12"
                    />
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات وشروط الدفعة</label>
                  <textarea
                    value={inventoryForm.notes}
                    onChange={(e) => setInventoryForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="اكتب أي تفاصيل إضافية هنا..."
                    rows={3}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-xs font-bold focus:border-amber-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInventoryForm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInventory}
                  className="flex-[2] px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingInventory ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>تأكيد الإضافة والجرد</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-blue-400 shrink-0" />
                <p className="text-[10px] text-blue-400 font-bold leading-tight">
                  سيتم تسجيل هذه العملية في السجل التاريخي للوكيل ولا يمكن حذفها لاحقاً لضمان النزاهة.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
