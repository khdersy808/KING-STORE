import React from 'react';
import { Home, Users, MessageSquare, ShoppingCart, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cartCount: number;
  isAdmin?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setCurrentTab, cartCount, isAdmin = false }) => {
  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'messaging', label: 'المحادثة', icon: MessageSquare },
    { id: 'cart', label: 'السلة', icon: ShoppingCart },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'الإدارة', icon: Settings });
  }

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-lg rounded-[2rem] border border-white/10 bg-slate-900/90 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} items-center animate-fade-in transition-all duration-500`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`group relative flex flex-col items-center justify-center gap-1 w-full h-16 transition-all duration-300 cursor-pointer ${
              isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-amber-400/20 shadow-lg shadow-amber-400/10' : 'group-hover:bg-white/5'}`}>
              <Icon className={`h-6 w-6 transition-all duration-300 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </div>
            <span className={`text-[10px] font-black tracking-tight transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce">
                  {cartCount}
                </span>
              )}
            </span>
            
            {/* Active Indicator: Glowing Golden Dot */}
            <div 
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-all duration-500 ease-in-out ${
                isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-0'
              }`} 
            />
          </button>
        );
      })}
    </div>
  );
};
