import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { db, collection, onSnapshot, query, addDoc } from '../lib/firebase';
import { auth, onAuthStateChanged } from '../lib/firebase';
import { Plus, Users, Phone, Percent, Mail, User, X, Shield, Award } from 'lucide-react';

interface AgentDashboardProps {
  isAdminMode?: boolean;
}

export default function AgentDashboard({ isAdminMode = false }: AgentDashboardProps) {
  const [agents, setAgents] = useState<Agent[]>(() => {
    try {
      const saved = localStorage.getItem('king_store_agents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('king_store_agents', JSON.stringify(agents));
  }, [agents]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
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

    return () => unsubscribe();
  }, []);

  const handleAddAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim() || !phone.trim() || !userId.trim()) {
      setErrorMessage('يرجى تعبئة كافة البيانات المطلوبة للوكيل.');
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

      setSuccessMessage('تمت إضافة الوكيل المعتمد الجديد بنجاح! 🎉');
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
      setErrorMessage('حدث خطأ أثناء إضافة الوكيل، يرجى التحقق من اتصال الشبكة.');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upper header section for Agents */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-amber-500/10">
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-400" />
            <span>الوكلاء والشبكة التوزيعية</span>
          </p>
          <h3 className="text-lg font-black text-slate-800">قائمة الوكلاء النشطين بالمحافظات</h3>
        </div>

        {isAdminMode && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs shadow-lg shadow-amber-500/15 cursor-pointer self-start sm:self-center transition-all"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" />
                <span>إلغاء العملية</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>إضافة وكيل معتمد جديد ➕</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Add New Agent Form Panel */}
      {isAdminMode && showAddForm && (
        <form 
          onSubmit={handleAddAgentSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-fade-in text-right"
        >
          <h4 className="text-sm font-black text-slate-900 border-b border-slate-150 pb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span>تعبئة بيانات الوكيل الجديد للشبكة الملكية 👑</span>
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
              <label className="block text-xs font-bold text-slate-700">اسم الوكيل الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد المحمد"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 pr-10 pl-3 text-slate-900"
                />
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Agent Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">رقم التواصل / الواتساب</label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +963 912 345 678"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 pr-10 pl-3 text-slate-900 text-left"
                  dir="ltr"
                />
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Agent User Email/ID */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني للوكيل (مربوط بحسابه)</label>
              <div className="relative">
                <input
                  type="email"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="مثال: agent@kingstore.com"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 pr-10 pl-3 text-slate-900 text-left"
                  dir="ltr"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Profit percentage */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">نسبة الربح أو العمولات التوزيعية (٪)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profitPercentage}
                  onChange={(e) => setProfitPercentage(Number(e.target.value))}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 pr-10 pl-3 text-slate-900"
                />
                <Percent className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 text-xs cursor-pointer shadow-md"
            >
              حفظ وتعميد الوكيل بالشبكة الملكية 🤝
            </button>
          </div>
        </form>
      )}

      {/* Agents Listing */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {agents.length === 0 ? (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">لا يوجد وكلاء مسجلين حالياً</h4>
            <p className="text-xs text-slate-500">لم يتم إدراج أي موزعين معتمدين بالمحافظات في النظام حتى الآن.</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div 
              key={agent.id} 
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-slate-900 text-sm">{agent.name}</p>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-2 py-0.5">
                    نشط ✅
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

              <div className="text-left space-y-1.5 shrink-0 pl-1 border-r border-slate-100 pr-4">
                <div className="bg-amber-50 text-amber-700 font-black text-xs px-2.5 py-1 rounded-lg border border-amber-100 inline-block">
                  عمولة {agent.profitPercentage}%
                </div>
                <p className="text-[10px] font-bold text-slate-500">الطلبات المنجزة: <span className="text-slate-900">{agent.ordersCount || 0}</span></p>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${agent.commissionStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                  {agent.commissionStatus === 'paid' ? 'تمت تصفية الحساب' : 'بانتظار التحصيل'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
