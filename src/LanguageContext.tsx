/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isRtl: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // AuthModal
    "auth.resetPassword": "إستعادة كلمة المرور",
    "auth.royalLogin": "تسجيل الدخول إلى بوابتك الملكية",
    "auth.newRoyalAccount": "إنشاء حساب ملكي جديد",
    "auth.resetPasswordDesc": "أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور",
    "auth.loginDesc": "سجل دخولك لمتابعة طلباتك وتقييم مشترياتك الفاخرة",
    "auth.registerDesc": "انضم إلينا واستمتع بتجربة تسوق رقمية وملموسة فريدة",
    "auth.accountEmail": "البريد الإلكتروني لحسابك",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.forgotPassword": "نسيت كلمة المرور؟ 🔑",
    "auth.rememberMe": "تذكرني على هذا الجهاز",
    "auth.loginBtn": "تسجيل الدخول الفوري",
    "auth.registerBtn": "إتمام إنشاء الحساب وإرسال رابط التفعيل",
    "auth.sendResetBtn": "إرسال رابط التحقق وإعادة التعيين 📨",
    "auth.sending": "جاري الإرسال...",
    "auth.loading": "جاري التحميل...",
    "auth.returnToLogin": "العودة لتسجيل الدخول ⏎",
    "auth.fullName": "الاسم الكريم بالكامل",
    "auth.fullNamePlaceholder": "أحمد العتيبي",
    "auth.or": "أو المتابعة باستخدام",
    "auth.googleLogin": "تسجيل الدخول باستخدام Google",
    "auth.googleRegister": "التسجيل السريع عبر حساب Google",
    "auth.noAccount": "ليس لديك حساب معنا بعد؟",
    "auth.registerNow": "سجل حسابك الفاخر الآن",
    "auth.hasAccount": "لديك حساب بالفعل؟",
    "auth.loginHere": "سجل دخولك هنا",
    "auth.inviteBannerTitle": "👑 رابط دعوة مفعّل ومصدق:",
    "auth.inviteBannerDesc": "أنت تسجل الآن كمسؤول نظام معتمد. سيتم منحك صلاحيات لوحة التحكم بالكامل فور إتمام إنشاء هذا الحساب الفاخر.",
    "auth.errorEmailRequired": "يرجى إدخال البريد الإلكتروني الخاص بك.",
    "auth.errorEmailInvalid": "البريد الإلكتروني المكتوب غير صالح.",
    "auth.errorFieldsRequired": "يرجى ملء جميع الحقول المطلوبة.",
    "auth.errorNameRequired": "يرجى إدخال اسمك الكريم لإنشاء الحساب.",
    "auth.welcomeBack": "أهلاً بك مجدداً، {name}! تم تسجيل الدخول بنجاح.",
    "auth.welcomeGoogle": "أهلاً بك، {name}! تم تسجيل دخولك بنجاح عبر Google.",
    
    // SettingsModal (Account/Profile Settings)
    "settings.title": "الملف الشخصي والأمان 👑",
    "settings.subtitle": "إعدادات الحساب الملكي",
    "settings.closeBtn": "إغلاق الضبط",
    "settings.profileTab": "الملف الشخصي",
    "settings.emailTab": "تغيير البريد",
    "settings.passwordTab": "كلمة المرور",
    "settings.currentAccountInfo": "معلومات الحساب الحالي",
    "settings.welcomeEmail": "أهلاً بك، بريدك الإلكتروني هو: {email}",
    "settings.accountType": "نوع الحساب: {role}",
    "settings.roleAdmin": "مدير النظام (Admin)",
    "settings.roleCustomer": "عضو ملكي",
    "settings.nameLabel": "الاسم الشخصي / اللقب",
    "settings.namePlaceholder": "أدخل اسمك الكريم",
    "settings.saveEdits": "حفظ التعديلات الملكية",
    "settings.googleUserTitle": "تسجيل دخول عبر Google 🌐",
    "settings.googleUserDesc": "أنت مسجل الدخول باستخدام حساب Google الخاص بك. لا يمكنك تغيير البريد الإلكتروني الخاص بك من هنا. يرجى إدارته مباشرة من إعدادات حساب Google الخاص بك.",
    "settings.googleUserPassDesc": "حسابك مسجل باستخدام Google ولا يحتوي على كلمة مرور محلية. يمكنك إدارة أو تغيير كلمة المرور بأمان من خلال إعدادات حساب Google الخاص بك.",
    "settings.securityWarning": "تحذير أمان هام!",
    "settings.emailWarningDesc": "تغيير البريد الإلكتروني يتطلب إعادة التحقق. يرجى إدخال كلمة مرورك الحالية لتأكيد الهوية وتجنب الإيقاف العشوائي.",
    "settings.currentPassword": "كلمة المرور الحالية",
    "settings.currentPasswordPlaceholder": "أدخل كلمة مرورك الحالية للتأكيد",
    "settings.newEmail": "البريد الإلكتروني الجديد",
    "settings.updateEmailBtn": "تحديث البريد الإلكتروني",
    "settings.currentPasswordPass": "كلمة المرور الحالية",
    "settings.currentPasswordPassPlaceholder": "أدخل كلمة مرورك الحالية",
    "settings.newPassword": "كلمة المرور الجديدة",
    "settings.newPasswordPlaceholder": "لا تقل عن 6 خانات أو رموز",
    "settings.confirmPassword": "تأكيد كلمة المرور الجديدة",
    "settings.confirmPasswordPlaceholder": "أعد إدخال كلمة المرور الجديدة",
    "settings.savePasswordBtn": "حفظ كلمة المرور الجديدة",
    "settings.forgotPassPrompt": "هل نسيت كلمة المرور الحالية أو تواجه صعوبة في تسجيل الدخول مجدداً؟",
    "settings.sendResetLink": "إرسال رابط إعادة التعيين لبريدي الإلكتروني 📬",
    "settings.footerSecure": "🛡️ تشفير بيانات فائق الأمان بمقاييس ملوكية",
    "settings.closeSettings": "إغلاق الضبط"
  },
  en: {
    // AuthModal
    "auth.resetPassword": "Reset Password",
    "auth.royalLogin": "Sign in to Your Royal Portal",
    "auth.newRoyalAccount": "Create New Royal Account",
    "auth.resetPasswordDesc": "Enter your email to receive a password reset link",
    "auth.royalLoginDesc": "Sign in to track your orders and rate your luxury purchases", // Wait, user requested royalLoginDesc or loginDesc. Let's make sure both map
    "auth.loginDesc": "Sign in to track your orders and rate your luxury purchases",
    "auth.registerDesc": "Join us and enjoy a unique digital and physical shopping experience",
    "auth.accountEmail": "Account Email",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot Password? 🔑",
    "auth.rememberMe": "Remember me on this device",
    "auth.loginBtn": "Instant Login",
    "auth.registerBtn": "Complete Registration & Send Activation Link",
    "auth.sendResetBtn": "Send Verification & Reset Link 📨",
    "auth.sending": "Sending...",
    "auth.loading": "Loading...",
    "auth.returnToLogin": "Return to Login ⏎",
    "auth.fullName": "Full Name",
    "auth.fullNamePlaceholder": "John Doe",
    "auth.or": "Or continue using",
    "auth.googleLogin": "Sign in with Google",
    "auth.googleRegister": "Quick sign up with Google",
    "auth.noAccount": "Don't have an account yet?",
    "auth.registerNow": "Register your luxury account now",
    "auth.hasAccount": "Already have an account?",
    "auth.loginHere": "Sign in here",
    "auth.inviteBannerTitle": "👑 Approved Invitation Link Active:",
    "auth.inviteBannerDesc": "You are registering as an authorized admin. You will be granted full control panel access upon completion of this luxury account.",
    "auth.errorEmailRequired": "Please enter your email address.",
    "auth.errorEmailInvalid": "The provided email address is invalid.",
    "auth.errorFieldsRequired": "Please fill in all required fields.",
    "auth.errorNameRequired": "Please enter your name to create the account.",
    "auth.welcomeBack": "Welcome back, {name}! Logged in successfully.",
    "auth.welcomeGoogle": "Welcome, {name}! Logged in successfully via Google.",

    // SettingsModal (Account/Profile Settings)
    "settings.title": "Profile & Security 👑",
    "settings.subtitle": "Royal Account Settings",
    "settings.closeBtn": "Close Settings",
    "settings.profileTab": "Profile",
    "settings.emailTab": "Change Email",
    "settings.passwordTab": "Password",
    "settings.currentAccountInfo": "Current Account Info",
    "settings.welcomeEmail": "Welcome, your email is: {email}",
    "settings.accountType": "Account Type: {role}",
    "settings.roleAdmin": "System Admin",
    "settings.roleCustomer": "Royal Member",
    "settings.nameLabel": "Personal Name / Display Name",
    "settings.namePlaceholder": "Enter your noble name",
    "settings.saveEdits": "Save Royal Edits",
    "settings.googleUserTitle": "Google Sign-In Connected 🌐",
    "settings.googleUserDesc": "You are signed in using your Google account. You cannot change your email address here. Please manage it directly in your Google account settings.",
    "settings.googleUserPassDesc": "Your account is registered via Google and does not have a local password. You can securely manage your password through your Google account settings.",
    "settings.securityWarning": "Important Security Warning!",
    "settings.emailWarningDesc": "Changing your email requires re-verification. Please enter your current password to confirm your identity and prevent temporary account lock.",
    "settings.currentPassword": "Current Password",
    "settings.currentPasswordPlaceholder": "Enter current password to confirm",
    "settings.newEmail": "New Email Address",
    "settings.updateEmailBtn": "Update Email Address",
    "settings.currentPasswordPass": "Current Password",
    "settings.currentPasswordPassPlaceholder": "Enter your current password",
    "settings.newPassword": "New Password",
    "settings.newPasswordPlaceholder": "At least 6 characters or symbols",
    "settings.confirmPassword": "Confirm New Password",
    "settings.confirmPasswordPlaceholder": "Re-enter your new password",
    "settings.savePasswordBtn": "Save New Password",
    "settings.forgotPassPrompt": "Forgot your current password or having trouble signing back in?",
    "settings.sendResetLink": "Send reset link to my email 📬",
    "settings.footerSecure": "🛡️ Ultra-Secure Data Encryption in Royal Standards",
    "settings.closeSettings": "Close Settings"
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('kingstore_language');
    return (saved === 'ar' || saved === 'en') ? saved : 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kingstore_language', lang);
  };

  useEffect(() => {
    // Sync document element attributes
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, string>): string => {
    let text = translations[language]?.[key] || translations['ar']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, value);
      });
    }
    return text;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
