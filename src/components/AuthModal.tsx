/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  existingUsers: User[];
  adminInviteEmail?: string;
  onClearInvite?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  existingUsers,
  adminInviteEmail,
  onClearInvite
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isAdminRole, setIsAdminRole] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  React.useEffect(() => {
    if (isOpen && adminInviteEmail) {
      setIsLogin(false); // Switch to registration tab
      setEmail(adminInviteEmail);
      setIsAdminRole(true);
    } else if (isOpen) {
      setIsAdminRole(false);
    }
  }, [isOpen, adminInviteEmail]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    if (!isLogin && !name.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكريم لإنشاء الحساب.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isLogin) {
      // Login flow
      const foundUser = existingUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
      );

      if (!foundUser) {
        setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
        return;
      }

      onLogin(foundUser);
      setSuccessMsg(`أهلاً بك مجدداً، ${foundUser.name}! تم تسجيل الدخول بنجاح.`);
      setTimeout(() => {
        onClose();
        // Reset state
        setEmail('');
        setPassword('');
      }, 1500);

    } else {
      // Register flow
      const emailExists = existingUsers.some((u) => u.email.toLowerCase() === normalizedEmail);
      if (emailExists) {
        setErrorMsg('هذا البريد الإلكتروني مسجل بالفعل مسبقاً. حاول تسجيل الدخول.');
        return;
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password: password,
        role: isAdminRole ? 'admin' : 'customer'
      };

      onRegister(newUser);
      setSuccessMsg('تهانينا! تم إنشاء حسابك بنجاح. جاري تسجيل الدخول تلقائياً...');
      onClearInvite?.();
      
      setTimeout(() => {
        onLogin(newUser);
        onClose();
        // Reset state
        setName('');
        setEmail('');
        setPassword('');
        setIsAdminRole(false);
      }, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d0d] text-zinc-100 shadow-2xl p-6"
        id="auth-modal-container"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 mt-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 shadow-lg shadow-amber-500/10 mb-3">
            <Shield className="h-6 w-6 text-slate-950 stroke-[2]" />
          </div>
          <h3 className="text-xl font-black text-white">
            {isLogin ? 'تسجيل الدخول إلى بوابتك الملكية' : 'إنشاء حساب ملكي جديد'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5">
            {isLogin 
              ? 'سجل دخولك لمتابعة طلباتك وتقييم مشترياتك الفاخرة' 
              : 'انضم إلينا واستمتع بتجربة تسوق رقمية وملموسة فريدة'
            }
          </p>
        </div>



        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">الاسم الكريم بالكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="أحمد العتيبي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 pr-9 pl-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                />
                <UserIcon className="absolute right-3 top-3 h-4 w-4 text-zinc-600" />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="example@kingstore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 pr-9 pl-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
              />
              <Mail className="absolute right-3 top-3 h-4 w-4 text-zinc-600" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 pr-9 pl-10 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
              />
              <Lock className="absolute right-3 top-3 h-4 w-4 text-zinc-600" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-2.5 p-0.5 rounded text-zinc-500 hover:text-zinc-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Admin Invitation Notice Banner */}
          {isAdminRole && adminInviteEmail && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-right space-y-1">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                👑 رابط دعوة مفعّل ومصدق:
              </span>
              <p className="text-xs text-zinc-300">
                أنت تسجل الآن كمسؤول نظام معتمد. سيتم منحك صلاحيات لوحة التحكم بالكامل فور إتمام إنشاء هذا الحساب الفاخر.
              </p>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-semibold flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/30 rounded-xl text-xs text-emerald-400 font-semibold flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3 text-xs font-black hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            {isLogin ? 'تسجيل الدخول الفوري' : 'إتمام إنشاء الحساب'}
          </button>
        </form>

        {/* Modal Footer (Switch tab) */}
        <div className="mt-5 pt-4 border-t border-zinc-900 text-center text-xs">
          <span className="text-zinc-500">
            {isLogin ? 'ليس لديك حساب معنا بعد؟' : 'لديك حساب بالفعل؟'}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-amber-400 font-extrabold mr-1 hover:underline cursor-pointer"
          >
            {isLogin ? 'سجل حسابك الفاخر الآن' : 'سجل دخولك هنا'}
          </button>
        </div>

      </div>
    </div>
  );
}
