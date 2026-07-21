import React, { useState } from 'react';
import { X, Settings, ShieldCheck, Lock, Mail, User, Eye, EyeOff, Save, Sparkles, Loader2, Key, Fingerprint } from 'lucide-react';
import { User as AppUser } from '../types';
import { auth, db, doc, setDoc, getDoc, deleteDoc, updateDoc, encryptPin } from '../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpdateUser: (updatedUser: AppUser) => void;
  showToast: (title: string, message: string, type: 'success' | 'info' | 'warning') => void;
}

type TabType = 'profile' | 'email' | 'password' | 'security';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  showToast,
}: SettingsModalProps) {
  if (!isOpen || !currentUser) return null;

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(false);

  // Profile Form State
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');

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

  // Security / PIN Form State
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const firebaseUser = auth.currentUser;
  const isGoogleUser = firebaseUser?.providerData.some((p) => p.providerId === 'google.com') || false;

  const handleSendResetEmail = async () => {
    setIsSendingReset(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('لا يوجد بريد إلكتروني مرتبط بالحساب الحالي.');
      
      const { sendPasswordResetEmail } = await import('../lib/firebase');
      await sendPasswordResetEmail(auth, user.email.toLowerCase());
      showToast('📬 تم إرسال الرابط!', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح. يرجى التحقق من بريدك (والرسائل غير المرغوب فيها Spam).', 'success');
    } catch (err: any) {
      console.error('Error sending reset email from Settings:', err);
      showToast('خطأ في الإرسال ❌', err.message || 'حدث خطأ أثناء إرسال البريد الإلكتروني لإعادة تعيين كلمة المرور.', 'warning');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUsername = username.trim().replace(/\s+/g, '');

    if (!cleanName) {
      showToast('خطأ في البيانات', 'الرجاء إدخال الاسم الجديد بشكل صحيح.', 'warning');
      return;
    }

    if (!cleanUsername) {
      showToast('خطأ في البيانات', 'الرجاء إدخال اسم المستخدم بشكل صحيح.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('لا يوجد مستخدم نشط حالياً.');

      // If username has changed, check for uniqueness in Firestore
      if (cleanUsername.toLowerCase() !== (currentUser.username || '').toLowerCase()) {
        const uQuery = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const uSnap = await getDocs(uQuery);
        const alreadyTaken = uSnap.docs.some(doc => doc.id !== currentUser.id);
        if (alreadyTaken) {
          showToast('اسم مستخدم غير متاح ⚠️', 'اسم المستخدم هذا مسجل بالفعل لمستخدم آخر، يرجى اختيار اسم مستخدم فريد.', 'warning');
          setIsLoading(false);
          return;
        }
      }

      // 1. Update Profile in Firebase Auth with the custom username as displayName
      await updateProfile(user, { displayName: cleanUsername });

      // 2. Update Document in Firestore
      const userDocRef = doc(db, 'users', currentUser.id);
      await updateDoc(userDocRef, {
        name: cleanName,
        username: cleanUsername
      });

      // 3. Update parent App state
      onUpdateUser({
        ...currentUser,
        name: cleanName,
        username: cleanUsername
      });

      showToast('تم التحديث بنجاح ✨', 'تم تعديل الاسم واسم المستخدم الخاص بك بنجاح.', 'success');
    } catch (err: any) {
      console.error('Error updating name:', err);
      showToast('فشل التحديث ❌', err.message || 'حدث خطأ غير متوقع أثناء تحديث الاسم.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNewEmail = newEmail.trim().toLowerCase();

    if (!targetNewEmail || !currentPasswordForEmail) {
      showToast('حقول مطلوبة', 'الرجاء إدخال كلمة المرور الحالية والبريد الإلكتروني الجديد.', 'warning');
      return;
    }

    if (targetNewEmail === currentUser.email.toLowerCase()) {
      showToast('البريد متطابق', 'البريد الإلكتروني الجديد مطابق للبريد الحالي بالفعل.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('لا يوجد مستخدم نشط حالياً.');

      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForEmail);
      await reauthenticateWithCredential(user, credential);

      // 2. Update Email in Firebase Auth
      await updateEmail(user, targetNewEmail);

      // 3. Update Firestore Document Email field
      const userDocRef = doc(db, 'users', currentUser.id);
      await updateDoc(userDocRef, {
        email: targetNewEmail,
        updatedAt: new Date().toISOString()
      });

      // 4. Update parent App state
      onUpdateUser({
        ...currentUser,
        email: targetNewEmail
      });

      showToast('تم تحديث البريد ✨', 'تم تغيير البريد الإلكتروني لحسابك بنجاح.', 'success');
      setCurrentPasswordForEmail('');
      setNewEmail('');
    } catch (err: any) {
      console.error('Error updating email:', err);
      let errMsg = err.message || 'حدث خطأ غير متوقع.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'كلمة المرور الحالية غير صحيحة. الرجاء التحقق وإعادة المحاولة.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'البريد الإلكتروني الجديد مستخدم بالفعل في حساب آخر.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'صيغة البريد الإلكتروني الجديد غير صالحة.';
      }
      showToast('فشل التحديث ❌', errMsg, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPasswordForPass || !newPassword || !confirmPassword) {
      showToast('حقول مطلوبة', 'الرجاء ملء كافة حقول كلمة المرور.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('غير متطابق', 'كلمة المرور الجديدة وتأكيدها غير متطابقين.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('كلمة مرور ضعيفة', 'يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('لا يوجد مستخدم نشط حالياً.');

      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPasswordForPass);
      await reauthenticateWithCredential(user, credential);

      // 2. Update Password in Firebase Auth
      await updatePassword(user, newPassword);

      showToast('تم تحديث كلمة المرور ✨', 'تم تغيير كلمة مرور حسابك بنجاح.', 'success');
      setCurrentPasswordForPass('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      let errMsg = err.message || 'حدث خطأ غير متوقع.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'كلمة المرور الحالية غير صحيحة. الرجاء التحقق وإعادة المحاولة.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'كلمة المرور الجديدة ضعيفة للغاية. يرجى اختيار كلمة مرور لا تقل عن 6 خانات.';
      }
      showToast('فشل التحديث ❌', errMsg, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      showToast('رمز PIN غير صالح', 'يجب أن يتكون رمز PIN من 4 أرقام فقط ⚠️', 'warning');
      return;
    }

    if (cleanPin !== cleanConfirmPin) {
      showToast('عدم تطابق', 'رمز PIN وتأكيد الرمز غير متطابقين ❌', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const encrypted = encryptPin(cleanPin);
      const userDocRef = doc(db, 'users', currentUser.id);
      await updateDoc(userDocRef, {
        paymentPin: encrypted
      });

      onUpdateUser({
        ...currentUser,
        paymentPin: encrypted
      });

      showToast('تم التحديث بنجاح ✨', 'تم تعيين وتحديث رمز PIN السري للدفع بنجاح! 🛡️', 'success');
      setPin('');
      setConfirmPin('');
    } catch (err: any) {
      console.error('Error updating payment PIN:', err);
      showToast('فشل التحديث ❌', err.message || 'حدث خطأ أثناء تحديث رمز PIN الخاص بك.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4" dir="rtl">
      <div 
        className="relative bg-slate-900 rounded-3xl border border-amber-500/20 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in text-zinc-100"
        onClick={(e) => e.stopPropagation()}
        id="settings-modal-container"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Settings className="h-5 w-5 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-amber-400 block uppercase tracking-wide">الملف الشخصي والأمان 👑</span>
              <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5 mt-0.5">
                <span>إعدادات الحساب الملكي</span>
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
        <div className="flex border-b border-zinc-800 bg-slate-950/40 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            الملف الشخصي
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            البريد
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            المرور
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            أمان الدفع (PIN)
          </button>
        </div>

        {/* Modal Body / Tab Forms */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">معلومات الحساب الحالي</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                  أهلاً بك، بريدك الإلكتروني هو: <span className="text-zinc-200 font-bold font-mono">{currentUser.email}</span>
                </p>
                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed mt-0.5">
                  نوع الحساب: <span className="text-amber-500 font-bold">{currentUser.role === 'admin' ? 'مدير النظام (Admin)' : 'عضو ملكي'}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">الاسم الشخصي / اللقب</label>
                <div className="relative">
                  <span className="absolute right-3 top-3.5 text-zinc-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={name || ""}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك الكريم"
                    className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-right font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">اسم المستخدم المخصص (Username)</label>
                <div className="relative">
                  <span className="absolute right-3 top-3.5 text-zinc-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={username || ""}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                    placeholder="مثال: khaled_king"
                    className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-left font-mono"
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
                <span>حفظ التعديلات الملكية</span>
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
                  <h5 className="text-sm font-extrabold text-amber-400 mb-2">تسجيل دخول عبر Google 🌐</h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    أنت مسجل الدخول باستخدام حساب Google الخاص بك. لا يمكنك تغيير البريد الإلكتروني الخاص بك من هنا. يرجى إدارته مباشرة من إعدادات حساب Google الخاص بك.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="bg-red-500/5 rounded-2xl p-4 border border-red-500/10 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-red-400">تحذير أمان هام!</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    تغيير البريد الإلكتروني يتطلب إعادة التحقق. يرجى إدخال كلمة مرورك الحالية لتأكيد الهوية وتجنب الإيقاف العشوائي.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">كلمة المرور الحالية</label>
                  <div className="relative">
                    <span className="absolute right-3 top-3.5 text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPasswordForEmail ? 'text' : 'password'}
                      value={currentPasswordForEmail || ""}
                      onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                      placeholder="أدخل كلمة مرورك الحالية للتأكيد"
                      className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-10 text-xs sm:text-sm text-white text-right font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordForEmail(!showPasswordForEmail)}
                      className="absolute left-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPasswordForEmail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 block">البريد الإلكتروني الجديد</label>
                  <div className="relative">
                    <span className="absolute right-3 top-3.5 text-zinc-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      value={newEmail || ""}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-left font-mono"
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
                  <span>تحديث البريد الإلكتروني</span>
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
                  <h5 className="text-sm font-extrabold text-amber-400 mb-2">حساب Google مرتبطه به كلمة المرور 🌐</h5>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    حسابك مسجل باستخدام Google ولا يحتوي على كلمة مرور محلية. يمكنك إدارة أو تغيير كلمة المرور بأمان من خلال إعدادات حساب Google الخاص بك.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">كلمة المرور الحالية</label>
                    <div className="relative">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showCurrentPasswordForPass ? 'text' : 'password'}
                        value={currentPasswordForPass || ""}
                        onChange={(e) => setCurrentPasswordForPass(e.target.value)}
                        placeholder="أدخل كلمة مرورك الحالية"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-10 text-xs sm:text-sm text-white text-right font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPasswordForPass(!showCurrentPasswordForPass)}
                        className="absolute left-3 top-3 text-zinc-500 hover:text-zinc-300"
                      >
                        {showCurrentPasswordForPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Lock className="h-4 w-4 animate-pulse" />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword || ""}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="لا تقل عن 6 خانات أو رموز"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-10 text-xs sm:text-sm text-white text-right font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-3 top-3 text-zinc-500 hover:text-zinc-300"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 block">تأكيد كلمة المرور الجديدة</label>
                    <div className="relative">
                      <span className="absolute right-3 top-3.5 text-zinc-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmPassword || ""}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور الجديدة"
                        className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-right font-medium"
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
                    <span>حفظ كلمة المرور الجديدة</span>
                  </button>
                </form>

                {/* Secure Password Reset Fallback Block */}
                <div className="pt-3 border-t border-zinc-800/80 text-center">
                  <p className="text-[10px] text-zinc-400 mb-2">
                    هل نسيت كلمة المرور الحالية أو تواجه صعوبة في تسجيل الدخول مجدداً؟
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
                    <span>إرسال رابط إعادة التعيين لبريدي الإلكتروني 📬</span>
                  </button>
                </div>
              </div>
            )
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/10 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">حماية فائقة لعمليات الدفع 🛡️</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                  لحماية حسابك ورصيد نقاطك الملكية، يمكنك تعيين رمز PIN سري مكون من 4 أرقام. سيطلب منك المتجر هذا الرمز للتأكيد قبل كل عملية شراء أو تحويل.
                </p>
                {currentUser.paymentPin ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <span>حالة الرمز: مفعل ونشط وبأمان تام ✅</span>
                  </div>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                    <span>حالة الرمز: لم يتم التعيين بعد (غير مفضل) ⚠️</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">رمز PIN الجديد (4 أرقام)</label>
                <div className="relative">
                  <span className="absolute right-3 top-3.5 text-zinc-500">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type={showPin ? 'text' : 'password'}
                    pattern="\d*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="رمز PIN مكون من 4 أرقام فقط"
                    className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-10 text-xs sm:text-sm text-white text-center font-mono tracking-[0.5em]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 block">تأكيد رمز PIN الجديد</label>
                <div className="relative">
                  <span className="absolute right-3 top-3.5 text-zinc-500">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type={showPin ? 'text' : 'password'}
                    pattern="\d*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="أعد إدخال الرمز لتأكيده"
                    className="w-full rounded-xl bg-slate-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 py-3 pr-10 pl-4 text-xs sm:text-sm text-white text-center font-mono tracking-[0.5em]"
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
                <span>حفظ الرمز السري الجديد</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-zinc-400">
          <span>🛡️ تشفير بيانات فائق الأمان بمقاييس ملوكية</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-[10px] font-extrabold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
          >
            إغلاق الضبط
          </button>
        </div>
      </div>
    </div>
  );
}
