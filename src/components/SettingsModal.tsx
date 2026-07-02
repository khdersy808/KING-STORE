import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../LanguageContext';
import { X, Settings, ShieldCheck, Lock, Mail, User, Eye, EyeOff, Save, Sparkles, Loader2 } from 'lucide-react';
import { User as AppUser } from '../types';
import { auth, db, doc, setDoc, getDoc, deleteDoc, updateDoc } from '../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpdateUser: (updatedUser: AppUser) => void;
  showToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
}

type TabType = 'profile' | 'email' | 'password';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  showToast,
}: SettingsModalProps) {
  if (!isOpen || !currentUser) return null;

  const { language, setLanguage, t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile Form State
  const [name, setName] = useState(currentUser.name);

  // Email Form State
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPasswordForEmail, setShowPasswordForEmail] = useState(false);

  // Password Form State
  const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPasswordForPass, setShowCurrentPasswordForPass] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const firebaseUser = auth.currentUser;
  const isGoogleUser = firebaseUser?.providerData.some((p) => p.providerId === 'google.com') || false;

  const handleSendResetEmail = async () => {
    setIsSendingReset(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error(language === 'ar' ? 'لا يوجد بريد إلكتروني مرتبط بالحساب الحالي.' : 'No email associated with current account.');
      
      const { sendPasswordResetEmail } = await import('../lib/firebase');
      await sendPasswordResetEmail(auth, user.email.toLowerCase());
      showToast(
        language === 'ar' ? '📬 تم إرسال الرابط!' : '📬 Link Sent!', 
        language === 'ar' 
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى التحقق من بريدك (والرسائل غير المرغوب فيها Spam).' 
          : 'Password reset link was successfully sent to your email. Please check your inbox or spam.', 
        'success'
      );
    } catch (err: any) {
      console.error('Error sending reset email from Settings:', err);
      showToast(
        language === 'ar' ? 'خطأ في الإرسال ❌' : 'Sending Error ❌', 
        err.message || (language === 'ar' ? 'حدث خطأ أثناء إرسال البريد الإلكتروني لإعادة تعيين كلمة المرور.' : 'An error occurred while sending password reset email.'), 
        'warning'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(
        language === 'ar' ? 'خطأ في البيانات' : 'Data Error', 
        language === 'ar' ? 'الرجاء إدخال الاسم الجديد بشكل صحيح.' : 'Please enter the new name correctly.', 
        'warning'
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error(language === 'ar' ? 'لا يوجد مستخدم نشط حالياً.' : 'No active user found.');

      // 1. Update Profile in Firebase Auth
      await updateProfile(user, { displayName: name.trim() });

      // 2. Update Document in Firestore
      const userDocRef = doc(db, 'users', currentUser.email.toLowerCase());
      await updateDoc(userDocRef, {
        name: name.trim()
      });

      // 3. Update parent App state
      onUpdateUser({
        ...currentUser,
        name: name.trim()
      });

      showToast(
        language === 'ar' ? 'تم التحديث بنجاح ✨' : 'Updated Successfully ✨', 
        language === 'ar' ? 'تم تعديل اسم الحساب بنجاح.' : 'Profile name has been changed successfully.', 
        'success'
      );
    } catch (err: any) {
      console.error('Error updating name:', err);
      showToast(
        language === 'ar' ? 'فشل التحديث ❌' : 'Update Failed ❌', 
        err.message || (language === 'ar' ? 'حدث خطأ غير متوقع أثناء تحديث الاسم.' : 'An error occurred while updating name.'), 
        'warning'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNewEmail = newEmail.trim().toLowerCase();

    if (!targetNewEmail || !currentPasswordForEmail) {
      showToast(
        language === 'ar' ? 'حقول مطلوبة' : 'Required Fields', 
        language === 'ar' ? 'الرجاء إدخال كلمة المرور الحالية والبريد الإلكتروني الجديد.' : 'Please enter your current password and the new email address.', 
        'warning'
      );
      return;
    }

    if (targetNewEmail === currentUser.email.toLowerCase()) {
      showToast(
        language === 'ar' ? 'البريد متطابق' : 'Email Identical', 
        language === 'ar' ? 'البريد الإلكتروني الجديد مطابق للبريد الحالي بالفعل.' : 'The new email address matches your current one.', 
        'warning'
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error(language === 'ar' ? 'لا يوجد مستخدم نشط حالياً.' : 'No active user found.');

      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmail);
      await reauthenticateWithCredential(user, credential);

      // 2. Update Email in Firebase Auth
      await updateEmail(user, targetNewEmail);

      // 3. Migrate Firestore Document
      const oldEmailNormalized = currentUser.email.toLowerCase();
      const oldDocRef = doc(db, 'users', oldEmailNormalized);
      const newDocRef = doc(db, 'users', targetNewEmail);

      const oldDoc = await getDoc(oldDocRef);
      if (oldDoc.exists()) {
        const docData = oldDoc.data();
        await setDoc(newDocRef, {
          ...docData,
          email: targetNewEmail,
          updatedAt: new Date().toISOString()
        });
        await deleteDoc(oldDocRef);
      } else {
        await setDoc(newDocRef, {
          id: user.uid,
          name: currentUser.name,
          email: targetNewEmail,
          role: currentUser.role,
          createdAt: new Date().toISOString()
        });
      }

      // 4. Update parent App state
      onUpdateUser({
        ...currentUser,
        email: targetNewEmail
      });

      showToast(
        language === 'ar' ? 'تم تحديث البريد ✨' : 'Email Updated ✨', 
        language === 'ar' ? 'تم تغيير البريد الإلكتروني لحسابك بنجاح.' : 'Your account email has been updated successfully.', 
        'success'
      );
      setCurrentPasswordForEmail('');
      setNewEmail('');
    } catch (err: any) {
      console.error('Error updating email:', err);
      let errMsg = err.message || (language === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = language === 'ar' 
          ? 'كلمة المرور الحالية غير صحيحة. الرجاء التحقق وإعادة المحاولة.' 
          : 'Current password is incorrect. Please verify and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = language === 'ar' 
          ? 'البريد الإلكتروني الجديد مستخدم بالفعل في حساب آخر.' 
          : 'The new email address is already in use by another account.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = language === 'ar' 
          ? 'صيغة البريد الإلكتروني الجديد غير صالحة.' 
          : 'The new email address format is invalid.';
      }
      showToast(language === 'ar' ? 'فشل التحديث ❌' : 'Update Failed ❌', errMsg, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPasswordForPass || !newPassword || !confirmPassword) {
      showToast(
        language === 'ar' ? 'حقول مطلوبة' : 'Required Fields', 
        language === 'ar' ? 'الرجاء ملء كافة حقول كلمة المرور.' : 'Please fill out all password fields.', 
        'warning'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast(
        language === 'ar' ? 'غير متطابق' : 'Password Mismatch', 
        language === 'ar' ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' : 'The new password and password confirmation do not match.', 
        'warning'
      );
      return;
    }

    if (newPassword.length < 6) {
      showToast(
        language === 'ar' ? 'كلمة مرور ضعيفة' : 'Weak Password', 
        language === 'ar' ? 'يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل.' : 'The new password must be at least 6 characters.', 
        'warning'
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error(language === 'ar' ? 'لا يوجد مستخدم نشط حالياً.' : 'No active user found.');

      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForPass);
      await reauthenticateWithCredential(user, credential);

      // 2. Update Password in Firebase Auth
      await updatePassword(user, newPassword);

      showToast(
        language === 'ar' ? 'تم تحديث كلمة المرور ✨' : 'Password Updated ✨', 
        language === 'ar' ? 'تم تغيير كلمة مرور حسابك بنجاح.' : 'Your account password has been updated successfully.', 
        'success'
      );
      setCurrentPasswordForPass('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      let errMsg = err.message || (language === 'ar' ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = language === 'ar' 
          ? 'كلمة المرور الحالية غير صحيحة. الرجاء التحقق وإعادة المحاولة.' 
          : 'Current password is incorrect. Please verify and try again.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = language === 'ar' 
          ? 'كلمة المرور الجديدة ضعيفة للغاية. يرجى اختيار كلمة مرور لا تقل عن 6 خانات.' 
          : 'New password is too weak. Please choose at least 6 characters.';
      }
      showToast(language === 'ar' ? 'فشل التحديث ❌' : 'Update Failed ❌', errMsg, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'} onClick={onClose}>
      <div 
        className="relative flex flex-col bg-slate-900 rounded-3xl border border-amber-500/20 max-w-md w-full max-h-[90vh] shadow-2xl animate-fade-in text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        id="settings-modal-container"
      >
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-amber-500/10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Settings className="h-5 w-5 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-amber-400 block uppercase tracking-wide">{t('settings.title')}</span>
              <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5 mt-0.5">
                <span>{t('settings.subtitle')}</span>
              </h4>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            id="close-settings-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Custom Premium Tabs Navigation */}
        <div className="shrink-0 flex border-b border-zinc-800 bg-slate-950/40 p-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('settings.profileTab')}
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('settings.emailTab')}
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('settings.passwordTab')}
          </button>
        </div>

        {/* Modal Body / Tab Forms */}
        <div className="p-6 overflow-y-auto overflow-x-hidden">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{t('settings.currentAccountInfo')}</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                  {t('settings.welcomeEmail', { email: currentUser.email })}
                </p>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed mt-0.5">
                  {t('settings.accountType', { role: currentUser.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleCustomer') })}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">{t('settings.nameLabel')}</label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={name || ""}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('settings.namePlaceholder')}
                    className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} text-xs sm:text-sm text-white font-medium`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{t('settings.saveEdits')}</span>
              </button>
            </form>
          )}

          {activeTab === 'email' && (
            isGoogleUser ? (
              <div className="bg-slate-950 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-amber-400 mb-2">{t('settings.googleUserTitle')}</h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {t('settings.googleUserDesc')}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="bg-red-500/5 rounded-2xl p-4 border border-red-500/10 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-red-400">{t('settings.securityWarning')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    {t('settings.emailWarningDesc')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">{t('settings.currentPassword')}</label>
                  <div className="relative">
                    <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPasswordForEmail ? 'text' : 'password'}
                      value={currentPasswordForEmail || ""}
                      onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                      placeholder={t('settings.currentPasswordPlaceholder')}
                      className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'} text-xs sm:text-sm text-white font-medium`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordForEmail(!showPasswordForEmail)}
                      className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-3 text-zinc-500 hover:text-zinc-300`}
                    >
                      {showPasswordForEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">{t('settings.newEmail')}</label>
                  <div className="relative">
                    <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={newEmail || ""}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-4 text-left' : 'pl-10 pr-4 text-left'} text-xs sm:text-sm text-white font-mono`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{t('settings.updateEmailBtn')}</span>
                </button>
              </form>
            )
          )}

          {activeTab === 'password' && (
            isGoogleUser ? (
              <div className="bg-slate-950 rounded-2xl p-6 border border-zinc-800 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-amber-400 mb-2">{t('settings.googleUserTitle')}</h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {t('settings.googleUserPassDesc')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">{t('settings.currentPasswordPass')}</label>
                    <div className="relative">
                      <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showCurrentPasswordForPass ? 'text' : 'password'}
                        value={currentPasswordForPass || ""}
                        onChange={(e) => setCurrentPasswordForPass(e.target.value)}
                        placeholder={t('settings.currentPasswordPassPlaceholder')}
                        className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'} text-xs sm:text-sm text-white font-medium`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPasswordForPass(!showCurrentPasswordForPass)}
                        className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-3 text-zinc-500 hover:text-zinc-300`}
                      >
                        {showCurrentPasswordForPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">{t('settings.newPassword')}</label>
                    <div className="relative">
                      <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                        <Lock className="h-4 w-4 animate-pulse" />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword || ""}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('settings.newPasswordPlaceholder')}
                        className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'} text-xs sm:text-sm text-white font-medium`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-3 text-zinc-500 hover:text-zinc-300`}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">{t('settings.confirmPassword')}</label>
                    <div className="relative">
                      <span className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-3.5 text-zinc-500`}>
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword || ""}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.confirmPasswordPlaceholder')}
                        className={`w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 ${isRtl ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} text-xs sm:text-sm text-white font-medium`}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>{t('settings.savePasswordBtn')}</span>
                  </button>
                </form>

                {/* Secure Password Reset Fallback Block */}
                <div className="pt-3 border-t border-zinc-800/80 text-center">
                  <p className="text-[10px] text-zinc-400 mb-2">
                    {t('settings.forgotPassPrompt')}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={isSendingReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 border border-amber-500/10 hover:border-amber-500/20 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    {isSendingReset ? (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    <span>{t('settings.sendResetLink')}</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-zinc-400 rounded-b-3xl">
          <span>{t('settings.footerSecure')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[10px] font-extrabold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
          >
            {t('settings.closeSettings')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
