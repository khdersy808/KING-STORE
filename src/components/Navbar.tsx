/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Crown, ShoppingBag, Settings, Search, Eye, LogOut, User as UserIcon, Bell, Trash2, Check, X, Sparkles, Menu, Truck, ChevronRight, MessageSquare } from 'lucide-react';
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
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  activeCustomerView?: 'store' | 'tracking';
  setActiveCustomerView?: (view: 'store' | 'tracking') => void;
}

export default function Navbar({
  isAdminMode,
  setIsAdminMode,
  cartCount,
  onOpenCart,
  searchQuery,
  setSearchQuery,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSettings,
  notifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  activeCustomerView = 'store',
  setActiveCustomerView,
}: NavbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'menu' | 'agent' | 'messaging'>('menu');

  // Filter notifications belonging to the current user (either user email or 'admin')
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    return n.userId === currentUser?.email || (n.userId === 'admin' && currentUser?.role === 'admin');
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  return (
    <header className={`sticky top-0 w-full border-b border-zinc-900 bg-[#0a0a0a]/95 text-[#e0e0e0] shadow-xl backdrop-blur-md transition-all ${isMobileMenuOpen ? 'z-[9999]' : 'z-40'}`}>
      <div className="mx-auto flex max-w-7xl h-16 sm:h-18 items-center justify-between px-2 gap-1 md:px-6 md:gap-4 flex-nowrap overflow-hidden w-full">
        
        {/* Right side: App Branding / Logo */}
        <div 
          onClick={() => window.location.reload()} 
          className="flex items-center gap-1.5 sm:gap-3 shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          title="تحديث المتجر"
        >
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/10 animate-pulse">
            <Crown className="h-4 w-4 sm:h-6 sm:w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200 leading-tight">
              KING STORE
            </h1>
            <span className="text-[8px] sm:text-[10px] text-amber-400 font-extrabold tracking-widest uppercase sm:-mt-1 hidden xs:block">
              عالم المنتجات الفاخرة
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
              المتجر الفاخر 🛍️
            </button>
            <button
              onClick={() => setActiveCustomerView('tracking')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCustomerView === 'tracking'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              تتبع طلبك الملكي 🔍
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
              placeholder="ابحث عن هاتف، بطاقة ألعاب، كورس، أو سترة..."
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-zinc-800 bg-[#121212] py-2 pr-10 pl-4 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-amber-400 focus:bg-[#151515] focus:outline-none focus:ring-2 focus:ring-amber-400/10"
            />
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 text-amber-400 text-sm bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20">
            <Settings className="h-4 w-4 animate-spin-slow text-amber-400" />
            <span className="font-extrabold">لوحة الإدارة النشطة</span>
          </div>
        )}

        {/* Left side: Controls */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          
          {/* Search bar toggle for mobile */}
          {!isAdminMode && (
            <div className="md:hidden relative">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery || ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-16 xs:w-24 sm:w-40 rounded-full border border-zinc-800 bg-[#121212] py-1.5 pr-7 pl-2 text-[10px] text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none transition-all"
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
                title="الإشعارات الملكية"
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
                <div className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[480px] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl text-right z-[99999] divide-y divide-zinc-900 animate-fade-in">
                  
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between p-4 bg-zinc-900/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white">مركز الإشعارات</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-red-600/10 border border-red-500/20 px-2 py-0.5 text-[9px] font-black text-red-400">
                          {unreadCount} جديد
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
                        <span>مقروء الكل</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="divide-y divide-zinc-900 max-h-[360px] overflow-y-auto">
                    {userNotifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <Bell className="h-8 w-8 text-zinc-600 mx-auto animate-bounce" />
                        <p className="text-xs text-zinc-400 font-medium">لا توجد إشعارات واردة حتى الآن</p>
                        <p className="text-[10px] text-zinc-600">سيتم تنبيهك هنا بأي تحديثات على طلباتك فورياً ✨</p>
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
                                {new Date(notif.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                              {notif.message}
                            </p>
                            
                            <div className="flex items-center justify-between gap-2 pt-1.5">
                              {notif.orderId && (
                                <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold px-1.5 py-0.5 rounded">
                                  طلب #{notif.orderId}
                                </span>
                              )}
                              
                              <div className="flex items-center gap-2 mr-auto">
                                {!notif.isRead && (
                                  <button
                                    onClick={() => onMarkAsRead(notif.id)}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-0.5 cursor-pointer"
                                    title="تحديد كمقروء"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>مقروء</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteNotification(notif.id)}
                                  className="text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer"
                                  title="حذف الإشعار"
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
                      إغلاق القائمة
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Mobile Track Order Button */}
          {!isAdminMode && (
            <button
              onClick={() => setActiveCustomerView?.(activeCustomerView === 'tracking' ? 'store' : 'tracking')}
              className={`flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-[#121212] border transition-all cursor-pointer ${
                activeCustomerView === 'tracking'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold'
                  : 'border-zinc-800 text-zinc-300 hover:text-amber-400'
              }`}
              title="تتبع طلبك الملكي"
              id="mobile-track-btn"
            >
              <Truck className="h-4 w-4" />
            </button>
          )}

          {/* Cart Icon (only if not admin mode) */}
          {!isAdminMode && (
            <button
              onClick={onOpenCart}
              className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-[#121212] border border-zinc-800 hover:border-amber-500/40 transition-all text-zinc-300 hover:text-amber-400 cursor-pointer"
              title="سلة المشتريات"
              id="cart-toggle-btn"
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[8px] sm:text-[11px] font-bold text-slate-950 ring-1 sm:ring-2 ring-zinc-950 animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile / Auth State (DESKTOP VERSION) */}
          {currentUser ? (
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 text-amber-400 border border-amber-500/30 px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-amber-500/5 cursor-pointer"
                id="navbar-profile-drawer-btn"
                title="افتح قائمة التحكم الفاخرة 👑"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span className="font-bold text-zinc-100">{currentUser?.name}</span>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                  {currentUser?.role === 'admin' ? 'المدير 👑' : 'الملكي 👑'}
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 text-amber-400 border border-amber-500/30 px-2 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-sm font-bold transition-all shadow-md cursor-pointer"
              id="navbar-login-btn"
            >
              <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">تسجيل الدخول</span>
              <span className="xs:hidden">دخول</span>
            </button>
          )}

          {/* Mode toggle switch - ONLY VISIBLE ON DESKTOP IF LOGGED IN AND USER ROLE IS ADMIN */}
          {true && (
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`hidden md:flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                isAdminMode
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-500/10'
                  : 'bg-[#121212] text-amber-400 border border-amber-500/30 hover:bg-[#181818]'
              }`}
              id="admin-mode-toggle"
              title={isAdminMode ? "عرض المتجر" : "لوحة التحكم (الآدمن)"}
            >
              {isAdminMode ? (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="hidden xs:inline">عرض المتجر</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span className="hidden xs:inline">لوحة التحكم (الآدمن)</span>
                </>
              )}
            </button>
          )}

          {/* Mobile Menu Toggle Button (Hamburger Menu - Mobile Only, visible if logged in) */}
          {true && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-[#121212] border border-zinc-800 text-zinc-300 hover:text-amber-400 hover:border-amber-500/40 transition-all cursor-pointer"
              title="القائمة"
              id="mobile-menu-toggle-btn"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

        </div>
      </div>

      {/* Royal Navigation Drawer Overlay */}
      {isMobileMenuOpen && true && (
        <div className="fixed inset-0 z-[99999]" aria-modal="true" role="dialog" dir="rtl">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 ease-in-out cursor-pointer z-40" 
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
                  <span className="text-sm font-black text-white tracking-wide">قائمة التحكم الفاخرة</span>
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
                          {currentUser?.role === 'admin' ? 'مدير النظام الملكي' : 'عضو ملكي متميز'}
                          <Crown className="h-3 w-3 text-amber-400 fill-amber-400" />
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white truncate">{currentUser?.name}</h4>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-amber-500/10">
                    <p className="text-xs text-white/90 select-all font-mono truncate bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-amber-500/5">
                      <span className="text-amber-400 font-sans font-bold ml-1.5">البريد الإلكتروني:</span> 
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveDrawer('menu')}
                  className="flex items-center gap-2 text-amber-400 text-sm font-bold p-2 bg-slate-900/50 rounded-lg border border-amber-500/20"
                >
                  <ChevronRight className="h-4 w-4" />
                  العودة للقائمة الرئيسية
                </button>
              )}

              {/* 2. Navigation Links: Middle Section */}
              <div className="flex flex-col gap-4 pt-2">
                
                {activeDrawer === 'menu' && (
                  <>
                    {/* Admin Mode Toggle (inside menu, only for admins) */}
                    {true && (
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
                            {isAdminMode ? 'العودة لعرض المتجر 🛒' : 'لوحة تحكم الإدارة ⚙️'}
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Settings Button */}
                    <button
                      onClick={() => {
                        onOpenSettings();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl bg-slate-900/50 border border-amber-500/10 border-r-4 border-r-transparent hover:bg-gradient-to-l hover:from-amber-500/10 hover:to-transparent hover:border-r-amber-500 hover:border-amber-500/25 p-4 text-xs font-black text-white transition-all duration-300 cursor-pointer group"
                    >
                      <Settings className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-white text-sm font-bold">إعدادات الحساب والضبط ⚙️</span>
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
                <LogOut className="h-4.5 w-4.5 text-rose-400 group-hover:text-amber-400 transition-colors" />
                <span className="text-white text-sm font-extrabold flex items-center gap-1.5">
                  تسجيل الخروج الآمن 🚪
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
