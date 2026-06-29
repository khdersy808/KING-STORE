/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  updateProfile,
  doc, 
  setDoc,
  getDoc,
  GoogleAuthProvider,
  signInWithPopup
} from '../lib/firebase';

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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [isAdminRole, setIsAdminRole] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && adminInviteEmail) {
      setIsLogin(false); // Switch to registration tab
      setEmail(adminInviteEmail);
      setIsAdminRole(true);
    } else if (isOpen) {
      setIsAdminRole(false);
    }
    // Reset states when opening modal
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsForgotPassword(false);
    }
  }, [isOpen, adminInviteEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (isForgotPassword) {
      if (!resetEmail.trim()) {
        setErrorMsg('يرجى إدخال البريد الإلكتروني الخاص بك.');
        setIsLoading(false);
        return;
      }
      try {
        await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
        setSuccessMsg('📬 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح! يرجى التحقق من صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam).');
        setTimeout(() => {
          setIsForgotPassword(false);
          setErrorMsg('');
          setSuccessMsg('');
          setResetEmail('');
        }, 6000);
      } catch (err: any) {
        console.error("Password reset error: ", err);
        let errorMsgAr = 'حدث خطأ أثناء إرسال البريد. يرجى التأكد من كتابة البريد بشكل صحيح.';
        if (err.code === 'auth/user-not-found') {
          errorMsgAr = 'هذا البريد الإلكتروني غير مسجل لدينا في KING STORE.';
        } else if (err.code === 'auth/invalid-email') {
          errorMsgAr = 'البريد الإلكتروني المكتوب غير صالح.';
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !name.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكريم لإنشاء الحساب.');
      setIsLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = 'khdersy808@gmail.com';

    if (isLogin) {
      // Login flow with Firebase Auth & Firestore
      try {
        let userCredential;

        try {
          // Direct sign in using Firebase Console credentials (Firebase Auth)
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (signInErr: any) {
          // If the login is for the admin email and it failed due to not found or invalid credential,
          // automatically register the account to avoid manual registration friction!
          if (normalizedEmail === adminEmail.toLowerCase() && 
              (signInErr.code === 'auth/invalid-credential' || 
               signInErr.code === 'auth/user-not-found' || 
               signInErr.code === 'auth/wrong-password')) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
              await updateProfile(userCredential.user, { displayName: 'مدير النظام الملكي' });
            } catch (signUpErr: any) {
              // If signup fails (e.g. email in use but different password), throw the original sign-in error
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }

        const fbUser = userCredential.user;

        // Check if email is verified
        if (!fbUser.emailVerified && normalizedEmail !== adminEmail.toLowerCase()) {
          setErrorMsg('⚠️ لم يتم التحقق من بريدك الإلكتروني بعد! يرجى فتح الرسالة المرسلة لبريدك وتفعيله أولاً لتتمكن من تسجيل الدخول بنجاح.');
          setIsLoading(false);
          return;
        }

        // Fetch user metadata/role from Firestore
        const userDocRef = doc(db, 'users', normalizedEmail);
        const userDoc = await getDoc(userDocRef);

        let role = 'customer';
        let nameVal = fbUser.displayName || normalizedEmail.split('@')[0];

        if (normalizedEmail === adminEmail.toLowerCase()) {
          role = 'admin';
          // Force Firestore document to exist and have 'admin' role
          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: nameVal || 'مدير النظام الملكي',
            email: normalizedEmail,
            role: 'admin',
            createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
          }, { merge: true });
        } else {
          if (userDoc.exists()) {
            role = userDoc.data().role || 'customer';
            nameVal = userDoc.data().name || nameVal;
          } else {
            // If profile missing in Firestore, create it
            await setDoc(userDocRef, {
              id: fbUser.uid,
              name: nameVal,
              email: normalizedEmail,
              role: role,
              createdAt: new Date().toISOString()
            });
          }
        }

        const foundUser: User = {
          id: fbUser.uid,
          name: nameVal,
          email: normalizedEmail,
          password: password,
          role: role as 'admin' | 'customer'
        };

        onLogin(foundUser);
        setSuccessMsg(`أهلاً بك مجدداً، ${nameVal}! تم تسجيل الدخول بنجاح.`);
        
        setTimeout(() => {
          onClose();
          // Reset state
          setEmail('');
          setPassword('');
        }, 1500);

      } catch (error: any) {
        console.log(error);
        console.error(error.code, error.message);
        let errorMsgAr = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
        if (error.code === 'auth/invalid-credential') {
          errorMsgAr = '⚠️ البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من المدخلات والمحاولة مجدداً.';
        } else if (error.code === 'auth/user-not-found') {
          errorMsgAr = '⚠️ هذا الحساب غير مسجل لدينا. يرجى التأكد من البريد الإلكتروني أو إنشاء حساب جديد.';
        } else if (error.code === 'auth/wrong-password') {
          errorMsgAr = '⚠️ كلمة المرور المكتوبة غير صحيحة. يرجى المحاولة مرة أخرى.';
        } else if (error.code === 'auth/user-disabled') {
          errorMsgAr = '⚠️ تم تعطيل هذا الحساب من قبل الإدارة.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsgAr = '⚠️ تم إدخال الكثير من المحاولات الخاطئة. تم قفل الحساب مؤقتاً، يرجى المحاولة لاحقاً.';
        } else if (error.message) {
          errorMsgAr = `⚠️ خطأ: ${error.message}`;
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }

    } else {
      // Register flow with Firebase Auth & Verification Email & Firestore
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const fbUser = userCredential.user;

        // Set Display Name in Firebase Profile
        await updateProfile(fbUser, { displayName: name.trim() });

        // Send Email Verification (Dynamic Verification)
        await sendEmailVerification(fbUser);

        const isDefaultAdmin = normalizedEmail === adminEmail.toLowerCase();

        // Save User Details in Firestore Database
        const newUser: User = {
          id: fbUser.uid,
          name: name.trim(),
          email: normalizedEmail,
          password: password,
          role: (isAdminRole || isDefaultAdmin) ? 'admin' : 'customer'
        };

        const userDocRef = doc(db, 'users', normalizedEmail);
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: name.trim(),
          email: normalizedEmail,
          role: newUser.role,
          createdAt: new Date().toISOString()
        });

        onRegister(newUser);
        setSuccessMsg('🎉 تهانينا! تم إنشاء حسابك الملكي بنجاح. لقد أرسلنا رسالة تفعيل إلى بريدك الإلكتروني لتأكيد ملكيته. يرجى تفعيله ثم تسجيل الدخول.');
        onClearInvite?.();
        
        setTimeout(() => {
          setIsLogin(true); // Redirect to login tab so they login after verification
          setErrorMsg('');
          setSuccessMsg('');
          setPassword('');
        }, 7000);

      } catch (err: any) {
        console.error("Register error: ", err);
        let errorMsgAr = 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.';
        if (err.code === 'auth/email-already-in-use') {
          errorMsgAr = 'هذا البريد الإلكتروني مسجل بالفعل مسبقاً. حاول تسجيل الدخول.';
        } else if (err.code === 'auth/weak-password') {
          errorMsgAr = 'كلمة المرور ضعيفة للغاية. يجب أن تتكون من 6 أحرف أو أكثر.';
        } else if (err.code === 'auth/invalid-email') {
          errorMsgAr = 'البريد الإلكتروني المكتوب غير صالح.';
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      if (!fbUser.email) {
        throw new Error('No email found from Google account.');
      }
      
      const normalizedEmail = fbUser.email.toLowerCase();
      const adminEmail = 'khdersy808@gmail.com';
      
      const userDocRef = doc(db, 'users', normalizedEmail);
      const userDoc = await getDoc(userDocRef);
      
      let role = 'customer';
      let nameVal = fbUser.displayName || name.trim() || normalizedEmail.split('@')[0];
      
      if (normalizedEmail === adminEmail.toLowerCase()) {
        role = 'admin';
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: nameVal || 'مدير النظام الملكي',
          email: normalizedEmail,
          role: 'admin',
          createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
        }, { merge: true });
      } else {
        if (userDoc.exists()) {
          role = userDoc.data().role || 'customer';
          nameVal = userDoc.data().name || nameVal;
        } else {
          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: nameVal,
            email: normalizedEmail,
            role: role,
            createdAt: new Date().toISOString()
          });
        }
      }
      
      const loggedUser: User = {
        id: fbUser.uid,
        name: nameVal,
        email: normalizedEmail,
        password: '',
        role: role as 'admin' | 'customer'
      };
      
      onLogin(loggedUser);
      setSuccessMsg(`أهلاً بك، ${nameVal}! تم تسجيل دخولك بنجاح عبر Google.`);
      setTimeout(() => {
        onClose();
        setEmail('');
        setPassword('');
      }, 1500);
      
    } catch (err: any) {
      console.error("Google sign in error: ", err);
      let errorMsgAr = 'حدث خطأ أثناء تسجيل الدخول باستخدام Google.';
      if (err.code === 'auth/popup-blocked') {
        errorMsgAr = '⚠️ تم حظر النافذة المنبثقة من قبل متصفحك. يرجى السماح بالنوافذ المنبثقة لمتجرنا الفاخر والمحاولة مجدداً.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsgAr = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMsgAr = 'تم إلغاء طلب تسجيل الدخول.';
      }
      setErrorMsg(errorMsgAr);
    } finally {
      setIsLoading(false);
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
            {isForgotPassword 
              ? 'إستعادة كلمة المرور' 
              : isLogin 
                ? 'تسجيل الدخول إلى بوابتك الملكية' 
                : 'إنشاء حساب ملكي جديد'
            }
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5">
            {isForgotPassword
              ? 'أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور'
              : isLogin 
                ? 'سجل دخولك لمتابعة طلباتك وتقييم مشترياتك الفاخرة' 
                : 'انضم إلينا واستمتع بتجربة تسوق رقمية وملموسة فريدة'
            }
          </p>
        </div>

        {isForgotPassword ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">البريد الإلكتروني لحسابك</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="example@kingstore.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 pr-9 pl-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                />
                <Mail className="absolute right-3 top-3 h-4 w-4 text-zinc-600" />
              </div>
            </div>

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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3 text-xs font-black hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'جاري الإرسال...' : 'إرسال رابط التحقق وإعادة التعيين 📨'}
            </button>

            {/* Return to Login */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-amber-400 font-extrabold hover:underline cursor-pointer"
              >
                العودة لتسجيل الدخول ⏎
              </button>
            </div>
          </form>
        ) : (
          /* LOGIN & REGISTER FORM */
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-zinc-400">كلمة المرور</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                      setResetEmail(email); // Autofill with entered email if any
                    }}
                    className="text-[11px] text-amber-500/80 hover:text-amber-400 cursor-pointer"
                  >
                    نسيت كلمة المرور؟ 🔑
                  </button>
                )}
              </div>
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
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3 text-xs font-black hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'جاري التحميل...' : isLogin ? 'تسجيل الدخول الفوري' : 'إتمام إنشاء الحساب وإرسال رابط التفعيل'}
            </button>

            {/* Separator / Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-zinc-800"></div>
              <span className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">أو المتابعة باستخدام</span>
              <div className="flex-1 border-t border-zinc-800"></div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-100 py-3 text-xs font-bold active:scale-98 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>{isLogin ? 'تسجيل الدخول باستخدام Google' : 'التسجيل السريع عبر حساب Google'}</span>
            </button>
          </form>
        )}

        {/* Modal Footer (Switch tab) */}
        {!isForgotPassword && (
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
        )}

      </div>
    </div>
  );
}

