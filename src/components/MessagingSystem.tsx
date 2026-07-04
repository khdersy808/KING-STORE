import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { getFirestore, collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function MessagingSystem() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    const db = getFirestore();
    const q = query(collection(db, 'messages'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(data);
      },
      (error) => {
        console.error("Error fetching messages:", error);
      }
    );

    return () => unsubscribe();
  }, [loading, user]);

  const handleSendMessage = async () => {
    if (!text.trim() || !user) return;
    try {
      const db = getFirestore();
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

  return (
    <div className="p-6 flex flex-col h-[500px]" dir="rtl">
      <h2 className="text-2xl font-black text-white mb-4">الرسائل</h2>
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-3 rounded-lg ${msg.senderId === user?.uid ? 'bg-amber-500/20 text-right' : 'bg-slate-800 text-left'}`}>
            <p className="text-sm text-white">{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-slate-950 p-2 rounded-lg border border-zinc-800 text-white" 
          placeholder="اكتب رسالة..." 
        />
        <button 
          onClick={handleSendMessage}
          className="bg-amber-500 text-slate-950 font-bold p-2 rounded-lg"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}
