import React from 'react';
import { Home, Users, MessageSquare, ShoppingCart } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab, cartCount }) => {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-md flex h-16 items-center justify-around animate-fade-in">
      <button
        onClick={() => setCurrentTab('home')}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${currentTab === 'home' ? 'text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
      >
        <Home className="h-5 w-5" />
        <span>الرئيسية</span>
      </button>
      <button
        onClick={() => setCurrentTab('agents')}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${currentTab === 'agents' ? 'text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
      >
        <Users className="h-5 w-5" />
        <span>الوكلاء</span>
      </button>
      <button
        onClick={() => setCurrentTab('messaging')}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-all cursor-pointer ${currentTab === 'messaging' ? 'text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
      >
        <MessageSquare className="h-5 w-5" />
        <span>المحادثة</span>
      </button>
      <button
        onClick={() => setCurrentTab('cart')}
        className={`flex flex-col items-center gap-1 text-xs font-bold transition-all relative cursor-pointer ${currentTab === 'cart' ? 'text-amber-500 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
      >
        <ShoppingCart className="h-5 w-5" />
        <span>السلة</span>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-slate-950 animate-bounce">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );
};
