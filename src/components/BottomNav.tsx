import React from 'react';
import { motion } from 'motion/react';
import { Home, ShoppingBag, Menu, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cartCount: number;
  onOpenMenu: () => void;
  isAdmin?: boolean;
}

export function BottomNav({ currentTab, setCurrentTab, cartCount, onOpenMenu, isAdmin }: BottomNavProps) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', icon: Home, label: t('navHome') },
    { id: 'messaging', icon: MessageSquare, label: t('supportSystemTitle') },
    { id: 'cart', icon: ShoppingBag, label: t('navCart'), badge: cartCount },
    { id: isAdmin ? 'admin' : 'menu', icon: isAdmin ? LayoutDashboard : Menu, label: isAdmin ? t('navAdmin') : t('navMore') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] px-6 pb-6 md:hidden pointer-events-none [will-change:transform] [transform:translate3d(0,0,0)]">
      <div className="relative mx-auto max-w-sm bg-zinc-950/95 backdrop- border border-white/5 rounded-[2.5rem] shadow-[0_-10px_50px_rgba(0,0,0,0.5)] flex items-center justify-around h-16 px-2 overflow-hidden pointer-events-auto [backface-visibility:hidden]">
        
        {/* Tab Icons */}
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'admin') {
                  setCurrentTab('admin');
                } else if (tab.id === 'menu') {
                  onOpenMenu();
                } else {
                  setCurrentTab(tab.id);
                }
              }}
              className="relative z-10 flex flex-col items-center justify-center w-full h-full cursor-pointer group select-none [backface-visibility:hidden] [transform:translate3d(0,0,0)]"
              style={{ contentVisibility: 'auto' }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-blob"
                  className="absolute inset-1 bg-amber-500/20 rounded-2xl [will-change:transform,opacity]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  style={{ backfaceVisibility: 'hidden' }}
                />
              )}
              
              <motion.div
                animate={{ 
                  scale: isActive ? 1.05 : 1
                }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="relative flex items-center justify-center [will-change:transform]"
              >
                <Icon 
                  className={`h-5 w-5 transition-all duration-300 ${
                    isActive ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`} 
                />
                
                {tab.badge !== undefined && tab.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-slate-950 ring-1 ring-zinc-950 shadow-lg"
                  >
                    {tab.badge}
                  </motion.span>
                )}
              </motion.div>
              
              <motion.span 
                animate={{ 
                  opacity: isActive ? 1 : 0.4,
                  scale: isActive ? 1 : 0.95
                }}
                transition={{ duration: 0.15, ease: "linear" }}
                className={`text-[8px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${
                  isActive ? 'text-amber-400' : 'text-zinc-500'
                }`}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
