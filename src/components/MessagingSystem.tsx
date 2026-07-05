import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { db, auth, collection, onSnapshot, query, addDoc, doc, setDoc, onAuthStateChanged } from '../lib/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Phone, Send, Sparkles, MessageCircle, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function MessagingSystem() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // WhatsApp Settings
  const [whatsappLink, setWhatsappLink] = useState('https://wa.me/9639827419');
  const [whatsappMessage, setWhatsappMessage] = useState('أهلاً KING STORE، لدي استفسار بخصوص طلبي...');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Sync WhatsApp Settings
    const settingsRef = doc(db, 'settings', 'whatsapp');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
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
      console.warn("Error loading WhatsApp settings in MessagingSystem:", error);
      setWhatsappLink('https://wa.me/9639827419');
      setWhatsappMessage('أهلاً KING STORE، لدي استفسار بخصوص طلبي...');
    });

    if (loading || !user) return () => unsubscribeSettings();

    const q = query(collection(db, 'messages'));
    const unsubscribeMessages = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(data);
      },
      (error) => {
        console.error("Error fetching messages:", error);
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeMessages();
    };
  }, [loading, user]);

  const handleSendMessage = async () => {
    if (!text.trim() || !user) return;
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        text,
        timestamp: serverTimestamp(),
        isRead: false
      });
      setText('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleOpenWhatsapp = () => {
    const whatsappUrl = "https://wa.me/qr/RPBLK6RPYJCQB1";
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="flex flex-col h-full min-h-[500px]" dir="rtl">
      {/* Luxury Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wide block text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">{t('supportTitle')}</h2>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1">{t('supportTagline')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-8 bg-slate-50/30">
        
        {/* Luxury WhatsApp Section */}
        <div className="rounded-3xl border-2 border-emerald-500/20 bg-white p-8 shadow-xl shadow-emerald-500/5 relative overflow-hidden group text-center animate-slide-up">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20 scale-150" />
                <div className="relative h-20 w-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 transform group-hover:rotate-12 transition-transform duration-500">
                  <Phone className="h-10 w-10 stroke-[2.5]" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">{t('whatsappSupport')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                {t('whatsappDesc')}
              </p>
            </div>

            <button
              onClick={handleOpenWhatsapp}
              className="group/btn relative w-full max-w-xs mx-auto py-5 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg shadow-2xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-4 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <MessageCircle className="h-7 w-7" />
              <span>{t('chatNow')}</span>
              <div className="absolute right-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-2 transition-all">
                <Sparkles className="h-5 w-5 fill-white" />
              </div>
            </button>

            <div className="flex items-center justify-center gap-4 pt-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('availableNow')}</span>
            </div>
          </div>
        </div>

        {/* Alternative Internal Chat Preview (Optional / Luxury Divider) */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            <span className="bg-[#fcfcfc] px-4">{t('internalChat')}</span>
          </div>
        </div>

        {/* Simple Internal Messages List (Legacy View kept clean) */}
        <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-2 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-300 font-bold text-xs italic">لا توجد رسائل سابقة في النظام المدمج...</div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.senderId === user?.uid ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm transition-all ${
                  msg.senderId === user?.uid 
                    ? 'bg-amber-500 text-slate-950 rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="relative group">
          <input 
            type="text" 
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pr-5 pl-16 text-sm font-medium focus:border-amber-500 focus:outline-none transition-all shadow-sm" 
            placeholder={t('typeMessage')} 
          />
          <button 
            onClick={handleSendMessage}
            className="absolute left-2 top-2 bottom-2 px-4 rounded-xl bg-slate-950 text-amber-500 font-bold hover:bg-slate-900 transition-all flex items-center justify-center cursor-pointer shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
