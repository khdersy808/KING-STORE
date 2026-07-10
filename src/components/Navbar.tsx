/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Crown, ShoppingBag, Settings, Search, Eye, LogOut, User as UserIcon, Bell, Trash2, Check, X, Sparkles, Menu, Truck, ChevronRight, MessageSquare, Globe, Wallet, Heart, Package } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { User, AppNotification } from '../types';
import AgentDashboard from './AgentDashboard';
import MessagingSystem from './MessagingSystem';

interface NavbarProps {
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  activeCustomerView?: 'store' | 'tracking' | 'wishlist' | 'my-orders' | 'custom-requests';
  setActiveCustomerView?: (view: 'store' | 'tracking' | 'wishlist' | 'my-orders' | 'custom-requests') => void;
  isSypEnabled?: boolean;
  setIsSypEnabled?: (enabled: boolean) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  onOpenWallet: () => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
}

export default function Navbar({
  isAdminMode,
  setIsAdminMode,
  cartCount,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  currentUser,
  onLogout,
  onOpenSettings,
  notifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  activeCustomerView = 'store',
  setActiveCustomerView,
  isMobileMenuOpen: isMobileMenuOpenProp = false,
  setIsMobileMenuOpen: setIsMobileMenuOpenProp,
  onOpenWallet,
  currentTab,
  setCurrentTab,
}: NavbarProps) {
  const { t, language, setLanguage } = useLanguage();
  const { isSypEnabled, setIsSypEnabled } = useCurrency();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'menu' | 'agent' | 'messaging'>('menu');

  const isMobileMenuOpen = setIsMobileMenuOpenProp ? isMobileMenuOpenProp : internalMobileMenuOpen;
  const setIsMobileMenuOpen = setIsMobileMenuOpenProp ? setIsMobileMenuOpenProp : setInternalMobileMenuOpen;

  // Filter notifications belonging to the current user (either user email or 'admin')
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    return n.userId === currentUser?.email || (n.userId === 'admin' && currentUser?.role === 'admin');
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 w-full border-b border-zinc-900 bg-slate-950 text-[#e0e0e0] shadow-xl transition-all z-[999]">
      <div className="mx-auto flex max-w-7xl h-16 sm:h-18 items-center justify-between px-2 gap-1 md:px-6 md:gap-4 flex-nowrap w-full">
        
        {/* Right side: App Branding / Logo */}
        <div 
          onClick={() => window.location.reload()} 
          className="flex items-center gap-1.5 sm:gap-3 shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          title={t('shopName')}
        >
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/10 animate-pulse">
            <Crown className="h-4 w-4 sm:h-6 sm:w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 leading-tight">
              {t('shopName')}
            </h1>
            <span className="text-[8px] sm:text-[10px] text-amber-400 font-extrabold tracking-widest uppercase sm:-mt-1 hidden xs:block">
              {t('shopTagline')}
            </span>
          </div>
        </div>

        {/* Center-Right Navigation Tabs */}
        {!isAdminMode && setActiveCustomerView && (
          <div className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveCustomerView('store')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCustomerView === 'store'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              {t('luxuryStore')} 🛍️
            </button>
            <button
              onClick={() => setActiveCustomerView('tracking')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCustomerView === 'tracking'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              {t('trackOrderRoyal')} 🔍
            </button>
            <button
              onClick={() => setActiveCustomerView('my-orders')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCustomerView === 'my-orders'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              طلباتي الملكية 👑
            </button>
            <button
              onClick={() => setActiveCustomerView('wishlist')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCustomerView === 'wishlist'
                  ? 'bg-pink-600 text-white font-black shadow-lg shadow-pink-500/20'
                  : 'text-zinc-400 hover:text-pink-400'
              }`}
            >
              الأمنيات 🤍
            </button>
          </div>
        )}

        {/* Center: Search input (hidden when in admin mode) */}
        {!isAdminMode ? (
          <div className="hidden md:flex relative max-w-md w-full mx-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-zinc-800 bg-[#121212] py-2 pr-10 pl-4 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-amber-400 focus:bg-[#151515] focus:outline-none focus:ring-2 focus:ring-amber-400/10"
            />
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-amber-400 text-sm bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20">
            <Settings className="h-4 w-4 animate-spin-slow text-amber-400" />
            <span className="font-extrabold">{t('activeAdminPanel')}</span>
          </div>
        )}

        {/* Left side: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Search bar toggle for mobile */}
          {!isAdminMode && (
            <div className="md:hidden relative">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-16 xs:w-24 sm:w-32 rounded-full border border-zinc-800 bg-[#121212] py-1.5 pr-7 pl-2 text-[10px] text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none transition-all"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <Search className="h-2.5 w-2.5 text-zinc-500" />
              </div>
            </div>
          )}

          {/* Notifications Bell Icon Button (shown to logged-in users) */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                  isNotificationsOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold'
                    : 'bg-[#121212] border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400'
                }`}
                title={t('notifications')}
                id="notif-toggle-btn"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-600 text-[8px] sm:text-[10px] font-bold text-white ring-1 sm:ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotificationsOpen && (
                <div className="absolute top-full left-0 right-auto mt-2 z-[99999] w-[280px] sm:w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-[480px] overflow-y-auto text-right divide-y divide-zinc-900 animate-fade-in">
                  
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between p-4 bg-zinc-900/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white">{t('notifCenter')}</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-600/10 border border-red-500/20 px-2 py-0.5 text-[9px] font-black text-red-400">
                          {unreadCount} {t('new')}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          onMarkAllAsRead();
                          setIsNotificationsOpen(false);
                        }}
                        className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        <span>{t('markAllRead')}</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="divide-y divide-zinc-900 max-h-[360px] overflow-y-auto">
                    {userNotifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Bell className="h-8 w-8 text-zinc-600 mx-auto animate-bounce" />
                        <p className="text-xs text-zinc-400 font-medium">{t('noNotifsYet')}</p>
                        <p className="text-[10px] text-zinc-600">{t('notifHint')}</p>
                      </div>
                    ) : (
                      userNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 flex items-start gap-3 transition-colors ${
                            notif.isRead ? 'bg-zinc-950/40' : 'bg-amber-400/5'
                          }`}
                        >
                          <div className={`rounded-full p-2 shrink-0 ${
                            notif.isRead ? 'bg-zinc-900 text-zinc-500' : 'bg-amber-400/10 text-amber-400 animate-pulse'
                          }`}>
                            <Sparkles className="h-4 w-4" />
                          </div>

                          <div className="space-y-1 flex-1 text-right">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className={`text-xs font-bold leading-tight ${notif.isRead ? 'text-zinc-400' : 'text-white'}`}>
                                {notif.title}
                              </h5>
                              <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                                {new Date(notif.date).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                              {notif.message}
                            </p>
                            
                            <div className="flex items-center justify-between gap-2 pt-1.5">
                              {notif.orderId && (
                                <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-1.5 py-0.5 rounded">
                                  {t('orderNumber')}{notif.orderId}
                                </span>
                              )}
                              
                              <div className="flex items-center gap-2 mr-auto">
                                {!notif.isRead && (
                                  <button
                                    onClick={() => onMarkAsRead(notif.id)}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-0.5 cursor-pointer"
                                    title={t('markAsRead')}
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>{t('markAsRead')}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteNotification(notif.id)}
                                  className="text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer"
                                  title={t('deleteNotif')}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 text-center bg-zinc-900/20">
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[10px] font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {t('close')}
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TOP ROW ACTIONS: Support, Cart & Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Support Button (Accessible for both Admin and User) */}
            <button
              onClick={() => setCurrentTab?.('messaging')}
              className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                currentTab === 'messaging'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-lg shadow-amber-500/20'
                  : 'bg-[#121212] border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40'
              }`}
              title={t('supportSystemTitle')}
              id="header-support-btn"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Cart Icon (only if not admin mode) */}
            {!isAdminMode && (
              <button
                onClick={onOpenCart}
                className={`relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                  cartCount > 0 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/10' 
                    : 'bg-[#121212] border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400'
                }`}
                title={t('navCart')}
                id="header-cart-btn"
              >
                <ShoppingBag className={`h-4 w-4 sm:h-5 sm:w-5 ${cartCount > 0 ? 'animate-bounce' : ''}`} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-600 text-[8px] sm:text-[11px] font-black text-white ring-1 sm:ring-2 ring-zinc-950 shadow-lg">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[#121212] border border-zinc-800 text-zinc-300 hover:text-amber-400 hover:border-amber-500/40 transition-all cursor-pointer"
              title="القائمة"
              id="mobile-menu-toggle-btn"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

        </div>
      </div>

      {/* SUB-NAVBAR: Shopping Tools (Wallet, Track, Wishlist) */}
      {!isAdminMode && (
        <div className="bg-transparent px-4 sm:px-8 py-2 flex items-center justify-start gap-3 sm:gap-4 overflow-x-auto no-scrollbar" id="sub-navbar-tools">
          {/* My Orders Button */}
          {currentUser && (
            <button
              onClick={() => setActiveCustomerView?.(activeCustomerView === 'my-orders' ? 'store' : 'my-orders')}
              className={`flex h-9 px-3 items-center gap-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                activeCustomerView === 'my-orders'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                  : 'bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:text-amber-400'
              }`}
              id="subnav-my-orders-btn"
            >
              <Crown className="h-4 w-4" />
              <span className="text-[10px] font-black">طلباتي الملكية 👑</span>
            </button>
          )}

          {/* Wishlist Button */}
          <button
            onClick={() => setActiveCustomerView?.(activeCustomerView === 'wishlist' ? 'store' : 'wishlist')}
            className={`flex h-9 px-3 items-center gap-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              activeCustomerView === 'wishlist'
                ? 'bg-pink-600 text-white border-pink-500 font-black'
                : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-pink-400'
            }`}
            id="subnav-wishlist-btn"
          >
            <Heart className={`h-4 w-4 ${activeCustomerView === 'wishlist' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-black">الأمنيات 🤍</span>
          </button>

          {/* Track Order Button */}
          <button
            onClick={() => setActiveCustomerView?.(activeCustomerView === 'tracking' ? 'store' : 'tracking')}
            className={`flex h-9 px-3 items-center gap-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              activeCustomerView === 'tracking'
                ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-amber-400'
            }`}
            id="subnav-track-btn"
          >
            <Truck className="h-4 w-4" />
            <span className="text-[10px] font-black">تتبع طلبي 🚚</span>
          </button>

          {/* Wallet Button - Leftmost in Visual LTR */}
          <button
            onClick={onOpenWallet}
            className="flex h-9 px-3 items-center gap-2 rounded-xl bg-zinc-950/50 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shrink-0"
            id="subnav-wallet-btn"
          >
            <Wallet className="h-4 w-4" />
            <span className="text-[10px] font-black">المحفظة 🎁</span>
            {currentUser && typeof currentUser.points === 'number' && currentUser.points > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-slate-950">
                {currentUser.points}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Royal Navigation Drawer Overlay */}
      {isMobileMenuOpen && true && (
        <div className="fixed inset-0 z-[99999]" aria-modal="true" role="dialog" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/85 transition-opacity duration-300 ease-in-out cursor-pointer z-40" 
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sliding container with fixed positioning and guaranteed solid background color */}
          <div 
            className="fixed top-0 right-0 z-50 w-80 bg-[#0F172A] border-l border-amber-500/20 p-6 flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.8)] h-screen overflow-y-auto"
            style={{ backgroundColor: '#0F172A' }}
          >
            
            {/* Upper Content wrapper */}
            <div className="flex flex-col gap-6">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/30 animate-pulse">
                    <Crown className="h-5 w-5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <span className="text-sm font-black text-white tracking-wide">{t('royalMenu')}</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/60 hover:bg-slate-900/95 text-zinc-300 hover:text-white transition-all cursor-pointer border border-amber-500/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 1. Header Section: User Identity Card (Royal Admin Profile Card) */}
              {activeDrawer === 'menu' ? (
                <div className="rounded-2xl bg-slate-950/80 p-5 border border-amber-500/20 space-y-3.5 shadow-[0_4_25px_rgba(245,158,11,0.05)]">
                  <div className="flex items-center gap-3">
                    {/* Glowing Crown Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/40">
                      <Crown className="h-6 w-6 text-slate-950 stroke-[2.5]" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs text-amber-400 font-extrabold tracking-wider uppercase flex items-center gap-1">
                          {currentUser?.role === 'admin' ? t('royalAdmin') : t('royalMember')}
                          <Crown className="h-3 w-3 text-amber-400 fill-amber-400" />
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white truncate">{currentUser?.name}</h4>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-amber-500/10">
                    <p className="text-xs text-white/90 select-all font-mono truncate bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-amber-500/5">
                      <span className="text-amber-400 font-sans font-bold ml-1.5">{t('email')}:</span> 
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveDrawer('menu')}
                  className="flex items-center gap-2 text-amber-400 text-sm font-bold p-2 bg-slate-900/50 rounded-lg border border-amber-500/20"
                >
                  <ChevronRight className={`h-4 w-4 ${language === 'ar' ? '' : 'rotate-180'}`} />
                  {t('backToMenu')}
                </button>
              )}

              {/* 2. Navigation Links: Middle Section */}
              <div className="flex flex-col gap-5 pt-2">
                
                {activeDrawer === 'menu' && (
                  <>
                    {/* Language Selection Section */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest px-1">
                        {t('languageSelection')}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setLanguage('ar')}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold transition-all ${
                            language === 'ar' 
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' 
                              : 'bg-slate-900/50 border-amber-500/10 text-zinc-400 hover:border-amber-500/30'
                          }`}
                        >
                          <span className="text-xs">العربية</span>
                        </button>
                        <button
                          onClick={() => setLanguage('en')}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold transition-all ${
                            language === 'en' 
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' 
                              : 'bg-slate-900/50 border-amber-500/10 text-zinc-400 hover:border-amber-500/30'
                          }`}
                        >
                          <span className="text-xs">English</span>
                        </button>
                      </div>
                    </div>

                    {/* Currency Pricing Toggle Section */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest px-1">
                        {t('currencySettings')}
                      </span>
                      <button
                        onClick={() => setIsSypEnabled(!isSypEnabled)}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-amber-500/20 group hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg font-black transition-all ${
                            isSypEnabled ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isSypEnabled ? 'SYP' : '$'}
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-white">{t('royalPricing')}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {isSypEnabled ? 'Show prices in Syrian Pounds' : 'Show prices in US Dollars'}
                            </span>
                          </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-1 transition-all ${isSypEnabled ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${isSypEnabled ? (language === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Admin Mode Toggle (inside menu, only for admins) */}
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsAdminMode(!isAdminMode);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl p-4 text-xs font-black transition-all duration-300 border cursor-pointer border-r-4 ${
                          isAdminMode
                            ? 'bg-gradient-to-l from-amber-500/10 to-transparent border-amber-500/30 border-r-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                            : 'bg-slate-900/50 text-white border-amber-500/10 border-r-transparent hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isAdminMode ? (
                            <Eye className="h-5 w-5 text-amber-400" />
                          ) : (
                            <Settings className="h-5 w-5 text-amber-400" />
                          )}
                          <span className="text-white text-sm font-bold">
                            {isAdminMode ? t('viewStore') : t('adminDashboard')}
                          </span>
                        </div>
                      </button>
                    )}
 
                    {/* Wallet Button inside Menu Drawer */}
                    <button
                      onClick={() => {
                        onOpenWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-amber-400 hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-white text-sm font-bold">المحفظة الملكية 🎁</span>
                      </div>
                      {currentUser && typeof currentUser.points === 'number' && (
                        <span className="bg-amber-400/15 border border-amber-400/30 text-amber-400 rounded-full px-2 py-0.5 text-[10px] font-black">
                          {currentUser.points} نقطة
                        </span>
                      )}
                    </button>

                     {/* Custom Requests Button */}
                    <button
                      onClick={() => {
                        const superAdmin = currentUser?.role === 'admin' || currentUser?.email === 'khdersy080@gmail.com' || currentUser?.email === 'khdersy808@gmail.com';
                        setCurrentTab?.(superAdmin ? 'admin-custom-requests' : 'custom-requests');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-amber-500 hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      {currentUser?.role === 'admin' || currentUser?.email === 'khdersy080@gmail.com' || currentUser?.email === 'khdersy808@gmail.com' ? (
                        <Package className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-white text-sm font-bold">
                        {currentUser?.role === 'admin' || currentUser?.email === 'khdersy080@gmail.com' || currentUser?.email === 'khdersy808@gmail.com' ? t('navAdminRequests') : t('navRequests')}
                      </span>
                    </button>

                    {/* Settings Button */}
                    <button
                      onClick={() => {
                        setActiveCustomerView?.('my-orders');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-transparent hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      <Package className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-white text-sm font-bold">طلباتي الملكية 👑</span>
                    </button>

                    {/* Support Button inside Drawer */}
                    <button
                      onClick={() => {
                        setCurrentTab?.('messaging');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-transparent hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      <MessageSquare className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-white text-sm font-bold">{t('supportSystemTitle')} 💬</span>
                    </button>

                    {/* Settings Button */}
                    <button
                      onClick={() => {
                        onOpenSettings();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-transparent hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      <Settings className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-white text-sm font-bold">{t('accountSettings')}</span>
                    </button>

                  </>
                )}

                {activeDrawer === 'agent' && <AgentDashboard />}
                {activeDrawer === 'messaging' && <MessagingSystem />}
              </div>
            </div>

            {/* 3. Footer Section: Logout button at bottom of drawer */}
            <div className="border-t border-amber-500/10 pt-5">
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 hover:border-amber-500/30 hover:bg-rose-950/50 text-white py-3.5 text-xs font-black transition-all duration-300 cursor-pointer group shadow-[0_4_15px_rgba(244,63,94,0.05)]"
              >
                <LogOut className={`h-4.5 w-4.5 text-rose-400 group-hover:text-amber-400 transition-colors ${language === 'ar' ? '' : 'rotate-180'}`} />
                <span className="text-white text-sm font-extrabold flex items-center gap-1.5">
                  {t('logout')}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
