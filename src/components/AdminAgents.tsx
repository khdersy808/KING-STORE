import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  addDoc
} from '../lib/firebase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  UserPlus, 
  DollarSign, 
  FileText, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Lock, 
  Unlock, 
  Crown, 
  Briefcase, 
  CreditCard, 
  Download, 
  Sparkles, 
  Check, 
  Layers 
} from 'lucide-react';
import { Product, Order, Agent } from '../types';

interface AdminAgentsProps {
  products: Product[];
  orders: Order[];
  categories: string[];
}

export default function AdminAgents({ products, orders, categories = [] }: AdminAgentsProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  // Editing state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [walletLink, setWalletLink] = useState<string>('');
  const [assignedProducts, setAssignedProducts] = useState<string[]>([]);
  const [assignedCategories, setAssignedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'blocked'>('active');
  
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Realtime agents sync from Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      if (db) {
        const q = query(collection(db, 'agents'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: Agent[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({ 
              id: docSnap.id, 
              ...data 
            } as Agent);
          });
          setAgents(list);
          setLoading(false);
        }, (error) => {
          console.error("Error listening to agents:", error);
          setLoading(false);
        });
      }
    } catch (e) {
      console.warn("Could not setup Firestore listener for agents", e);
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // Save agent (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const trimmedWallet = walletLink.trim();

    if (!trimmedName || !trimmedEmail || !trimmedWallet) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    try {
      if (!db) throw new Error("قاعدة البيانات غير متصلة");

      const agentData = {
        agentId: trimmedEmail,
        name: trimmedName,
        email: trimmedEmail,
        walletLink: trimmedWallet,
        assignedProducts: assignedProducts,
        assignedCategories: assignedCategories,
        status: status,
        totalSales: editingAgent ? editingAgent.totalSales : 0,
        pendingDues: editingAgent ? editingAgent.pendingDues : 0
      };

      if (editingAgent) {
        // Update Agent Document
        const agentDocRef = doc(db, 'agents', editingAgent.id);
        await updateDoc(agentDocRef, agentData);
        
        // Also ensure user role in users collection is updated to agent
        try {
          const userDocRef = doc(db, 'users', trimmedEmail);
          await updateDoc(userDocRef, { role: 'agent' });
        } catch (err) {
          console.warn("Could not update user role to agent, creating profile:", err);
          const userDocRef = doc(db, 'users', trimmedEmail);
          await setDoc(userDocRef, {
            email: trimmedEmail,
            name: trimmedName,
            role: 'agent',
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        setSuccessMsg('تم تحديث بيانات الوكيل المعتمد بنجاح! 👑');
      } else {
        // Check duplicate email
        const isDuplicate = agents.some(a => a.email === trimmedEmail);
        if (isDuplicate) {
          setErrorMsg('هذا البريد الإلكتروني مسجل كوكيل بالفعل مسبقاً.');
          return;
        }

        // Create Agent Document in agents collection
        // Let's use trimmedEmail as document ID for easy matching
        const agentDocRef = doc(db, 'agents', trimmedEmail);
        await setDoc(agentDocRef, agentData);

        // Create or update User profile in users collection with role: 'agent'
        const userDocRef = doc(db, 'users', trimmedEmail);
        await setDoc(userDocRef, {
          name: trimmedName,
          email: trimmedEmail,
          role: 'agent',
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Add System Notification
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: 'admin',
            title: 'إضافة وكيل معتمد جديد 👑',
            message: `تم تسجيل الوكيل ${trimmedName} (${trimmedEmail}) في متجر King Store بنجاح.`,
            date: new Date().toISOString(),
            isRead: false,
            type: 'system'
          });
        } catch (notifErr) {
          console.warn("Could not send system notification:", notifErr);
        }

        setSuccessMsg('تم تسجيل وإضافة الوكيل المعتمد الجديد بنجاح! 👑');
      }

      // Reset form states
      resetForm();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error("Error saving agent:", err);
      setErrorMsg(`فشل حفظ الوكيل: ${err.message || err}`);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setWalletLink('');
    setAssignedProducts([]);
    setAssignedCategories([]);
    setStatus('active');
    setEditingAgent(null);
    setShowAddForm(false);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setEmail(agent.email);
    setWalletLink(agent.walletLink);
    setAssignedProducts(agent.assignedProducts || []);
    setAssignedCategories(agent.assignedCategories || []);
    setStatus(agent.status);
    setShowAddForm(true);
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`هل أنت متأكد من حذف الوكيل "${agent.name}" نهائياً؟ لن يتمكن من تسجيل الدخول كوكيل.`)) {
      return;
    }

    try {
      if (db) {
        // Delete agent doc
        await deleteDoc(doc(db, 'agents', agent.id));
        
        // Downgrade user role in users collection to customer
        try {
          await updateDoc(doc(db, 'users', agent.email), { role: 'customer' });
        } catch (roleErr) {
          console.warn("Could not downgrade user role:", roleErr);
        }

        setSuccessMsg('تم حذف الوكيل بنجاح وتحويل حسابه إلى حساب عميل عادي.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error("Error deleting agent:", err);
      setErrorMsg('فشل حذف الوكيل من قاعدة البيانات.');
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'blocked' : 'active';
    try {
      if (db) {
        await updateDoc(doc(db, 'agents', agent.id), { status: newStatus });
        setSuccessMsg(`تم ${newStatus === 'blocked' ? 'حظر' : 'تنشيط'} الوكيل "${agent.name}" بنجاح.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      setErrorMsg('فشل تعديل حالة الوكيل.');
    }
  };

  // Toggle products selection
  const handleToggleProduct = (prodId: string) => {
    if (assignedProducts.includes(prodId)) {
      setAssignedProducts(assignedProducts.filter(id => id !== prodId));
    } else {
      setAssignedProducts([...assignedProducts, prodId]);
    }
  };

  // Select all products
  const handleSelectAllProducts = () => {
    if (assignedProducts.length === products.length) {
      setAssignedProducts([]);
    } else {
      setAssignedProducts(products.map(p => p.id));
    }
  };

  // Toggle categories selection
  const handleToggleCategory = (catName: string) => {
    if (assignedCategories.includes(catName)) {
      setAssignedCategories(assignedCategories.filter(name => name !== catName));
    } else {
      setAssignedCategories([...assignedCategories, catName]);
    }
  };

  // Select all categories
  const handleSelectAllCategories = () => {
    if (assignedCategories.length === categories.length) {
      setAssignedCategories([]);
    } else {
      setAssignedCategories([...categories]);
    }
  };

  // Settle Agent Dues (تصفير الديون وتسوية حساب المبيعات)
  const handleSettleDues = async (agent: Agent, duesToSettle: number) => {
    if (duesToSettle <= 0) {
      alert('الوكيل ليس لديه أي مبالغ مستحقة لتسويتها حالياً.');
      return;
    }

    if (!confirm(`هل تؤكد تسوية واستلام مبلغ قدره (${duesToSettle.toLocaleString()} ل.س) من الوكيل "${agent.name}" وتصفير المبالغ المستحقة المترتبة عليه؟`)) {
      return;
    }

    try {
      if (db) {
        // Fetch all completed, unsettled orders for this agent, and mark them as settled
        // For simplicity and client-side reactive calculations, we can save a "lastSettlementDate" or update orders in Firestore.
        // Let's create or update a settlement document or add an agent log!
        // To keep it clean and robust, we can update all orders from this agent where status is completed to isAgentSettled: true.
        const agentOrders = orders.filter(o => o.agentId === agent.email && o.status === 'completed' && !(o as any).isAgentSettled);
        
        // Batch update orders (in parallel)
        await Promise.all(
          agentOrders.map(o => {
            return updateDoc(doc(db!, 'orders', o.id), { isAgentSettled: true });
          })
        );

        // Send Notification to the Agent
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: agent.email,
            title: '👑 تم تصفير حسابك المالي بنجاح',
            message: `قام مدير المتجر بتسوية واستلام مستحقات مبيعاتك بقيمة (${duesToSettle.toLocaleString()} ل.س). حسابك المالي الحالي هو 0 ل.س. شكراً لجهودك الملكية!`,
            date: new Date().toISOString(),
            isRead: false,
            type: 'system'
          });
        } catch (notifErr) {
          console.warn("Could not notify agent:", notifErr);
        }

        setSuccessMsg(`🎉 تم تصفير حساب الوكيل "${agent.name}" بنجاح وتسوية كافة مبيعاته السابقة!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      console.error("Error settling dues:", err);
      alert(`فشل تسوية حساب الوكيل: ${err.message || err}`);
    }
  };

  // CSV Export for an agent's sales
  const handleExportCSV = (agent: Agent) => {
    const agentOrders = orders.filter(o => o.agentId === agent.email);
    
    if (agentOrders.length === 0) {
      alert('لا توجد مبيعات مسجلة لهذا الوكيل حالياً لتصديرها.');
      return;
    }

    // CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Adding UTF-8 BOM for Arabic support
    csvContent += "رقم الطلب,تاريخ الطلب,اسم الزبون,بريد الزبون,المبلغ الإجمالي,حالة الطلب,حالة التسوية الملكية,المنتجات المشتراة\n";

    agentOrders.forEach(o => {
      const itemsString = o.items.map(i => `${i.productName} (${i.quantity}x)`).join(" - ");
      const settledStatus = (o as any).isAgentSettled ? "تمت التسوية مع الإدارة" : "قيد التحصيل / معلق";
      const statusAr = o.status === 'completed' ? 'مكتمل' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار';
      
      csvContent += `"${o.id}","${new Date(o.date).toLocaleDateString('ar-EG')}","${o.customerName}","${o.customerEmail}","${o.totalAmount}","${statusAr}","${settledStatus}","${itemsString}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `مبيعات_الوكيل_${agent.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated values per agent based on completed orders in real-time
  const getAgentMetrics = (agentEmail: string) => {
    const agentCompletedOrders = orders.filter(o => o.agentId === agentEmail && o.status === 'completed');
    const totalSalesAmount = agentCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    // Unsettled completed orders sum up to pending dues
    const unsettledOrders = agentCompletedOrders.filter(o => !(o as any).isAgentSettled);
    const pendingDuesAmount = unsettledOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      salesCount: agentCompletedOrders.length,
      totalSales: totalSalesAmount,
      pendingDues: pendingDuesAmount
    };
  };

  // Filter agents based on search
  const filteredAgents = agents.filter(agent => {
    const queryLower = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(queryLower) ||
      agent.email.toLowerCase().includes(queryLower) ||
      agent.walletLink.toLowerCase().includes(queryLower)
    );
  });

  return (
    <div className="space-y-8 text-right" dir="rtl">
      
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-900 p-6 text-zinc-100 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span>نظام إدارة الوكلاء والمعتمدين الملكي 👑</span>
            </div>
            <h3 className="text-xl font-black text-white">إدارة الوكلاء الماليين والتحاسب الرقمي</h3>
            <p className="text-xs text-zinc-300 max-w-4xl leading-relaxed font-medium">
              قم بإضافة وتعيين الوكلاء المعتمدين لـ King Store. حدد المنتجات المصرح لكل وكيل ببيعها وإدارتها، وتابع حساباتهم المالية ونسب مبيعاتهم الحقيقية بذكاء. يمكنك تتبع الديون المترتبة عليهم للإدارة وتسويتها فوراً بضغطة زر واحدة.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-98"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>{showAddForm ? 'إلغاء وإغلاق النموذج' : 'إضافة وكيل معتمد جديد'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD / EDIT AGENT FORM */}
        {showAddForm && (
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 animate-fade-in h-fit">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 border border-amber-500/10">
                <Crown className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                {editingAgent ? `تعديل بيانات: ${editingAgent.name}` : 'تسجيل وكيل جديد بالمنظومة'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Agent Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>اسم الوكيل بالكامل</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد عبد الله (الوكيل المالي)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-bold"
                />
              </div>

              {/* Agent Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>البريد الإلكتروني للوكيل (تسجيل الدخول)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingAgent}
                  placeholder="agent@kingstore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {!editingAgent && (
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    💡 سيقوم هذا البريد بالدخول للمتجر واستعراض لوحة تحكم الوكيل تلقائياً.
                  </p>
                )}
              </div>

              {/* Wallet Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                  <span>رابط أو رقم المحفظة الإلكترونية (التحاسب المالي)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سيرياتيل كاش: 099123456 / شام كاش: 12345"
                  value={walletLink}
                  onChange={(e) => setWalletLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-medium"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حالة الوكيل بالمنظومة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'blocked')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-medium text-slate-800"
                >
                  <option value="active">🟢 وكيل نشط ومصرح له (Active)</option>
                  <option value="blocked">🔴 وكيل محظور مؤقتاً (Blocked)</option>
                </select>
              </div>

              {/* Assigned Products Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    <span>المنتجات المتاحة لبيعها وإدارتها ({assignedProducts.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllProducts}
                    className="text-[10px] text-amber-600 hover:underline font-black"
                  >
                    {assignedProducts.length === products.length ? 'إلغاء الكل' : 'تحديد جميع المنتجات'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2">
                  {products.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4">لا توجد منتجات مضافة بالمتجر حالياً.</p>
                  ) : (
                    products.map(p => {
                      const isChecked = assignedProducts.includes(p.id);
                      return (
                        <label 
                          key={p.id} 
                          className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors text-xs font-semibold text-slate-700 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProduct(p.id)}
                            className="rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                          />
                          <span className="truncate">{p.name} <span className="text-[10px] text-slate-400">({p.price.toLocaleString()} ل.س)</span></span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Assigned Categories Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    <span>الفئات المتاحة لبيعها وإدارتها ({assignedCategories.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-[10px] text-amber-600 hover:underline font-black"
                  >
                    {assignedCategories.length === categories.length ? 'إلغاء الكل' : 'تحديد جميع الفئات'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50 space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4">لا توجد فئات مضافة بالمتجر حالياً.</p>
                  ) : (
                    categories.map(cat => {
                      const isChecked = assignedCategories.includes(cat);
                      return (
                        <label 
                          key={cat} 
                          className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors text-xs font-semibold text-slate-700 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCategory(cat)}
                            className="rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-black transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingAgent ? 'حفظ التعديلات الملكية' : 'إتمام تفعيل الوكيل'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        )}

        {/* AGENTS LIST */}
        <div className={`${showAddForm ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            
            {/* Table Header & Search */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  <span>الوكلاء والمعتمدون المسجلون ({filteredAgents.length})</span>
                </h3>
                <p className="text-[10px] text-slate-400">تابع أرصدة وكلائك وقم بتنزيل حساباتهم أو تسوية مستحقاتهم المالية.</p>
              </div>

              {/* Search input */}
              <div className="relative max-w-xs w-full">
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث باسم الوكيل، بريده أو محفظته..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs text-slate-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Error & Success States */}
            {successMsg && (
              <div className="m-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-start gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="m-4 p-3.5 rounded-xl border border-red-500/20 bg-red-50 text-red-800 text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* Table / List View */}
            {loading ? (
              <div className="p-16 text-center text-slate-500 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
                <p className="text-xs font-semibold">جاري تحميل بيانات الوكلاء من السحابة الملكية...</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-4">
                <div className="bg-slate-50 p-4 rounded-full w-fit mx-auto text-slate-300 border border-slate-100">
                  <Briefcase className="h-10 w-10" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">لا يوجد أي وكلاء مضافين حالياً</h4>
                <p className="text-xs max-w-md mx-auto leading-relaxed">
                  لم يتم العثور على أي بيانات تطابق الاستعلام، أو لا توجد حسابات وكلاء مسجلة حالياً. انقر على زر إضافة وكيل لبدء العملية.
                </p>
              </div>
            ) : (
              
              /* Desktop and Mobile Responsive Layout */
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {filteredAgents.map((agent) => {
                  // Real-time financial calculations
                  const metrics = getAgentMetrics(agent.email);

                  return (
                    <div 
                      key={agent.id} 
                      className="p-5 hover:bg-slate-50/50 transition-all flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6"
                    >
                      {/* Name, Email, Wallet */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900">{agent.name}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border ${
                            agent.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {agent.status === 'active' ? '🟢 نشط' : '🔴 محظور'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-500 space-y-1 font-medium">
                          <p>البريد الإلكتروني: <span className="font-semibold text-slate-700">{agent.email}</span></p>
                          <p className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                            <span>المحفظة المالية: </span>
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{agent.walletLink || 'لم تحدد'}</span>
                          </p>
                        </div>

                        {/* Allowed Products Info */}
                        <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">المنتجات المخولة:</span>
                          {agent.assignedProducts && agent.assignedProducts.length === products.length ? (
                            <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              كل المنتجات الملكية ({products.length})
                            </span>
                          ) : agent.assignedProducts && agent.assignedProducts.length > 0 ? (
                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-800 px-2 py-0.5 rounded border border-amber-500/15">
                              {agent.assignedProducts.length} منتجات مصرحة
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                              لا توجد منتجات معينة
                            </span>
                          )}
                        </div>

                        {/* Allowed Categories Info */}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">الأقسام المخولة:</span>
                          {agent.assignedCategories && agent.assignedCategories.length === categories.length && categories.length > 0 ? (
                            <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              كل الأقسام الملكية ({categories.length})
                            </span>
                          ) : agent.assignedCategories && agent.assignedCategories.length > 0 ? (
                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-800 px-2 py-0.5 rounded border border-amber-500/15">
                              {agent.assignedCategories.length} أقسام مصرحة
                            </span>
                          ) : (
                            <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                              لا توجد أقسام معينة
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial counter details */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4 shrink-0 w-full sm:w-auto min-w-[280px]">
                        
                        {/* Total Sales */}
                        <div className="space-y-1 text-right">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                            <span>إجمالي المبيعات</span>
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            {metrics.totalSales.toLocaleString()} <span className="text-[10px] text-slate-500">ل.س</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold">
                            العمليات الناجحة: {metrics.salesCount}
                          </p>
                        </div>

                        {/* Pending Dues */}
                        <div className="space-y-1 text-right border-r border-slate-200 pr-4">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span>مستحقات للإدارة</span>
                          </span>
                          <p className="text-sm font-black text-red-600">
                            {metrics.pendingDues.toLocaleString()} <span className="text-[10px] text-red-400">ل.س</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold leading-none">
                            مبيعات لم يتم تسويتها بعد
                          </p>
                        </div>

                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end shrink-0 border-t xl:border-t-0 pt-4 xl:pt-0">
                        
                        {/* Settlement Button */}
                        <button
                          onClick={() => handleSettleDues(agent, metrics.pendingDues)}
                          disabled={metrics.pendingDues <= 0}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="تصفير أرباح وديون هذا الوكيل وتسوية حسابه بالكامل"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>تسوية الأرباح</span>
                        </button>

                        {/* Export CSV */}
                        <button
                          onClick={() => handleExportCSV(agent)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                          title="تحميل كشف مبيعات الوكيل CSV"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Toggle Status */}
                        <button
                          onClick={() => handleToggleStatus(agent)}
                          className={`p-2.5 rounded-xl transition-colors border ${
                            agent.status === 'active'
                              ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                          }`}
                          title={agent.status === 'active' ? 'حظر الوكيل مؤقتاً' : 'تنشيط إلغاء حظر الوكيل'}
                        >
                          {agent.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                          title="تعديل بيانات الوكيل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteAgent(agent)}
                          className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors border border-red-200"
                          title="حذف الوكيل نهائياً"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer metrics */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>إجمالي الوكلاء المسجلين بالمتجر: {agents.length} وكلاء معتمدين</span>
              <span>تحديث سحابي فوري 🛡️</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
