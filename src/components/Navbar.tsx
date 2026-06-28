/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Crown, ShoppingBag, Settings, Search, Eye, LogOut, User as UserIcon, Bell, Trash2, Check, X, Sparkles } from 'lucide-react';
import { User, AppNotification } from '../types';

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
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
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
  notifications = [],
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
}: NavbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Filter notifications belonging to the current user (either user email or 'admin')
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    return n.userId === currentUser.email || (n.userId === 'admin' && currentUser.role === 'admin');
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-[#0a0a0a]/95 text-[#e0e0e0] shadow-xl backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-18 items-center justify-between px-4 sm:px-6">
        
        {/* Right side: App Branding / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 shadow-lg shadow-amber-500/10 animate-pulse">
            <Crown className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
              KING STORE
            </h1>
            <span className="text-[10px] text-amber-400 font-extrabold tracking-widest uppercase -mt-1">
              عالم المنتجات الفاخرة
            </span>
          </div>
        </div>

        {/* Center: Search input (hidden when in admin mode) */}
        {!isAdminMode ? (
          <div className="hidden md:flex relative max-w-md w-full mx-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن هاتف، بطاقة ألعاب، كورس، أو سترة..."
              value={searchQuery}
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
        <div className="flex items-center gap-3">
          
          {/* Search bar toggle for mobile */}
          {!isAdminMode && (
            <div className="md:hidden relative">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-32 sm:w-48 rounded-full border border-zinc-800 bg-[#121212] py-1.5 pr-8 pl-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                <Search className="h-3.5 w-3.5 text-zinc-500" />
              </div>
            </div>
          )}

          {/* Notifications Bell Icon Button (shown to logged-in users) */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isNotificationsOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-400 font-extrabold'
                    : 'bg-[#121212] border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400'
                }`}
                title="الإشعارات الملكية"
                id="notif-toggle-btn"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[480px] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl text-right z-50 divide-y divide-zinc-900 animate-fade-in">
                  
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

          {/* Cart Icon (only if not admin mode) */}
          {!isAdminMode && (
            <button
              onClick={onOpenCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#121212] border border-zinc-800 hover:border-amber-500/40 transition-all text-zinc-300 hover:text-amber-400 cursor-pointer"
              title="سلة المشتريات"
              id="cart-toggle-btn"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-[11px] font-bold text-slate-950 ring-2 ring-zinc-950 animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-zinc-100">{currentUser.name}</span>
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                  {currentUser.role === 'admin' ? 'مدير النظام' : 'عضو ملكي'}
                </span>
              </div>
              
              <button
                onClick={onLogout}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121212] border border-zinc-800 hover:border-red-500/40 hover:text-red-400 text-zinc-400 transition-all cursor-pointer"
                title="تسجيل الخروج"
                id="navbar-logout-btn"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/30 text-amber-400 border border-amber-500/30 px-3.5 py-2 text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
              id="navbar-login-btn"
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">تسجيل الدخول</span>
              <span className="sm:hidden">دخول</span>
            </button>
          )}

          {/* Mode toggle switch - ONLY VISIBLE IF LOGGED IN AND USER ROLE IS ADMIN */}
          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                isAdminMode
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-500/10'
                  : 'bg-[#121212] text-amber-400 border border-amber-500/30 hover:bg-[#181818]'
              }`}
              id="admin-mode-toggle"
            >
              {isAdminMode ? (
                <>
                  <Eye className="h-4 w-4" />
                  <span>عرض المتجر</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>لوحة التحكم (الآدمن)</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
