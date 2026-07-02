import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from '../lib/firebase';
import { 
  Send, 
  MessageSquare, 
  Trash2, 
  Users, 
  User, 
  Sparkles, 
  Clock, 
  Search, 
  CheckCircle2, 
  X, 
  Mail
} from 'lucide-react';

interface UserType {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MessageType {
  id: string;
  senderId: string;
  receiverId: string;
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
}

interface AdminMessagesProps {
  users: UserType[];
  currentUser: UserType | null;
}

export default function AdminMessages({ users, currentUser }: AdminMessagesProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form states
  const [recipientId, setRecipientId] = useState<string>('all');
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filter customers out of users list for display
  const customerUsers = users.filter(u => u.role !== 'admin');

  // Realtime messages sync from Firestore
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      if (db) {
        const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const list: MessageType[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as MessageType);
          });
          setMessages(list);
          setLoading(false);
        }, (error) => {
          console.error("Error listening to messages:", error);
          setLoading(false);
        });
      }
    } catch (e) {
      console.warn("Could not setup Firestore listener, falling back to empty state", e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setErrorMsg('يرجى ملء جميع حقول الرسالة.');
      return;
    }

    setSending(true);

    try {
      if (!db) {
        throw new Error("قاعدة البيانات غير متصلة");
      }

      const messageData = {
        senderId: currentUser?.email || 'admin',
        receiverId: recipientId,
        title: trimmedTitle,
        body: trimmedBody,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      // Add to Firestore
      await addDoc(collection(db, 'messages'), messageData);

      // If sending to a specific user, or "all", we can also copy it as a standard system notification
      // so it shows up in their notification drawer immediately as well.
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId === 'all' ? 'all' : recipientId,
          title: trimmedTitle,
          message: trimmedBody,
          date: new Date().toISOString(),
          isRead: false,
          type: 'admin_broadcast',
          orderId: ''
        });
      } catch (notifErr) {
        console.warn("Could not copy message to notifications collection:", notifErr);
      }

      setSuccessMsg('تم إرسال الرسالة الملكية بنجاح إلى المستلم المختار! 👑');
      setTitle('');
      setBody('');
      setRecipientId('all');

      // Clear success message after 4 seconds
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setErrorMsg(`فشل إرسال الرسالة: ${err.message || err}`);
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟ لن تظهر للعميل بعد الآن.')) {
      return;
    }

    try {
      if (db) {
        await deleteDoc(doc(db, 'messages', id));
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      alert('فشل حذف الرسالة من قاعدة البيانات.');
    }
  };

  // Filter messages for search
  const filteredMessages = messages.filter(msg => {
    const queryLower = searchQuery.toLowerCase();
    const recipientName = msg.receiverId === 'all' 
      ? 'جميع المستخدمين' 
      : users.find(u => u.email === msg.receiverId)?.name || msg.receiverId;
    
    return (
      msg.title.toLowerCase().includes(queryLower) ||
      msg.body.toLowerCase().includes(queryLower) ||
      recipientName.toLowerCase().includes(queryLower) ||
      msg.receiverId.toLowerCase().includes(queryLower)
    );
  });

  return (
    <div className="space-y-8" dir="rtl">
      
      {/* Visual Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-900 p-6 text-zinc-100 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>نظام الرسائل والإشعارات الملكي 👑</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">إرسال وبث الرسائل لزبائن KING STORE ✨</h3>
            <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
              هنا يمكنك التواصل مباشرة مع عملائك. اكتب رسالة مخصصة لعميل معين أو قم بالبث الجماعي لجميع المستخدمين بضغطة زر واحدة. ستصل الرسالة كإشعار في شريط التنبيهات وصندوق الرسائل المباشر الخاص بحساباتهم.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Royal Send Form (Outbox) */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-right animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 border border-amber-500/10">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">إنشاء وإرسال رسالة جديدة</h3>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              
              {/* Recipient Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-amber-500" />
                  <span>تحديد المستلم المستهدف</span>
                </label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-medium text-slate-800"
                >
                  <option value="all">👑 جميع الزبائن والمسجلين (إرسال جماعي)</option>
                  {customerUsers.map((u) => (
                    <option key={u.id} value={u.email}>
                      👤 {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {recipientId === 'all' 
                    ? 'سيتم بث هذه الرسالة لجميع زوار وأعضاء المتجر المسجلين فوراً.' 
                    : `ستصل هذه الرسالة بشكل خاص وسري للعميل المختار فقط.`}
                </p>
              </div>

              {/* Message Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>عنوان الرسالة الملكية</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خصومات نهاية الأسبوع الكبرى! 🔥"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none font-bold"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                  <span>محتوى ونص الرسالة</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="اكتب هنا تفاصيل الرسالة، أكواد الخصم، أو التنبيهات المخصصة للعملاء..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-amber-400 focus:bg-white focus:outline-none leading-relaxed"
                />
              </div>

              {/* Feedback Alert States */}
              {successMsg && (
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="leading-relaxed">{successMsg}</p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-50 text-red-800 text-xs font-bold flex items-start gap-2 animate-fade-in">
                  <X className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-slate-200"
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>بث وإرسال الرسالة الآن 🚀</span>
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Outbox Sent History */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm text-right">
            
            {/* Header with Search and Stats */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-amber-500" />
                  <span>أرشيف الرسائل الملكية المرسلة (Outbox)</span>
                </h3>
                <p className="text-[10px] text-slate-400">تتبع وحذف الرسائل المرسلة سابقاً للعملاء.</p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث بالعنوان، النص أو العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs text-slate-800 focus:border-amber-400 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Loading / Empty States */}
            {loading ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
                <p className="text-xs font-semibold">جاري تحميل أرشيف الرسائل الصادرة...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-4">
                <div className="bg-slate-50 p-4 rounded-full w-fit mx-auto text-slate-300 border border-slate-100">
                  <MessageSquare className="h-10 w-10" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">لا توجد أي رسائل مطابقة للبحث</h4>
                <p className="text-xs max-w-md mx-auto leading-relaxed">
                  لم يتم إرسال أي رسائل تفي ببيانات الاستعلام حالياً، أو لم تقم بإرسال أي رسائل بعد.
                </p>
              </div>
            ) : (
              
              /* Messages List */
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredMessages.map((msg) => {
                  const recipient = msg.receiverId === 'all' 
                    ? { name: 'جميع المستخدمين والزبائن', email: 'all', isAll: true }
                    : (() => {
                        const found = users.find(u => u.email === msg.receiverId);
                        return found ? { name: found.name, email: found.email, isAll: false } : { name: msg.receiverId, email: msg.receiverId, isAll: false };
                      })();

                  return (
                    <div key={msg.id} className="p-5 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-fade-in">
                      
                      <div className="space-y-3 flex-1">
                        
                        {/* Meta: Recipient & Date */}
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold font-sans">
                          {recipient.isAll ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/10 text-[10px]">
                              <Users className="h-3 w-3" />
                              <span>{recipient.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">
                              <User className="h-3 w-3" />
                              <span>إلى: {recipient.name} ({recipient.email})</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(msg.timestamp).toLocaleString('ar-EG', { hour12: true })}</span>
                          </span>

                          {!recipient.isAll && (
                            <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded font-black ${
                              msg.isRead 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {msg.isRead ? 'تمت القراءة ✓' : 'لم يقرأ بعد'}
                            </span>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                            {msg.title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                            {msg.body}
                          </p>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: <span className="select-all">{msg.id}</span> • المرسل: {msg.senderId}
                        </div>

                      </div>

                      {/* Action buttons */}
                      <div className="sm:self-center shrink-0">
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-2.5 transition-all cursor-pointer"
                          title="حذف الرسالة الصادرة نهائياً"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Stats Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>إجمالي الرسائل الصادرة: {messages.length} رسالة</span>
              <span>تحديث مباشر وقفل آمن 🛡️</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
