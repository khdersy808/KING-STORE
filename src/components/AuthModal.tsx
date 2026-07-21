/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Shield, CheckCircle2, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
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
  getDocs,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  convertPointsToCoupons,
  encryptPin,
  hashPassword,
  updatePassword,
  linkWithCredential,
  EmailAuthProvider
} from '../lib/firebase';

const getDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'unknown_node';
  let devId = localStorage.getItem('kingstore_device_id');
  if (!devId) {
    const ua = navigator.userAgent || 'unknown_ua';
    const sw = window.screen.width || 0;
    const sh = window.screen.height || 0;
    const platform = navigator.platform || 'unknown_platform';
    const lang = navigator.language || 'unknown_lang';
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const cleanUA = ua.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toUpperCase();
    const cleanPlatform = platform.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    devId = `KS-DEV-${cleanUA}-${sw}X${sh}-${cleanPlatform}-${random}`;
    localStorage.setItem('kingstore_device_id', devId);
  }
  return devId;
};

const isDeviceAlreadyUsed = async (deviceId: string): Promise<boolean> => {
  try {
    // Regular unauthenticated or custom users cannot query users collection under Firestore rules
    if (!auth.currentUser) {
      return false;
    }
    const usersColl = collection(db, 'users');
    const deviceQuery = query(usersColl, where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(deviceQuery);
    return !querySnapshot.empty;
  } catch (err) {
    console.warn("Quietly skipped deviceId check in Firestore (no permissions or offline):", err);
    return false;
  }
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User, rememberMe?: boolean) => void;
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
  const { t, dir } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [referralCodeUsed, setReferralCodeUsed] = useState('');
  const [paymentPinInput, setPaymentPinInput] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMustChangePassword, setIsMustChangePassword] = useState(false);
  const [isMustChangePin, setIsMustChangePin] = useState(false);
  const [newPermanentPassword, setNewPermanentPassword] = useState('');
  const [confirmPermanentPassword, setConfirmPermanentPassword] = useState('');
  const [newPermanentPin, setNewPermanentPin] = useState('');
  const [confirmPermanentPin, setConfirmPermanentPin] = useState('');
  const [tempSessionUser, setTempSessionUser] = useState<any>(null);

  // States for Account Linking
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<any>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [isLinkingState, setIsLinkingState] = useState(false);
  const [showLinkPassword, setShowLinkPassword] = useState(false);

  // States for Google username custom prompt
  const [googlePendingUser, setGooglePendingUser] = useState<any>(null);
  const [googleUsernameInput, setGoogleUsernameInput] = useState('');
  const [isPromptingGoogleUsername, setIsPromptingGoogleUsername] = useState(false);

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
      setIsLinkingState(false);
      setPendingGoogleCredential(null);
      setPendingEmail('');
      setLinkPassword('');
      setShowLinkPassword(false);
      setUsername('');
      setConfirmPassword('');
      setName('');
      setGooglePendingUser(null);
      setGoogleUsernameInput('');
      setIsPromptingGoogleUsername(false);
      
      const pendingRef = localStorage.getItem('king_store_pending_referral');
      if (pendingRef) {
        setReferralCodeUsed(pendingRef);
      } else {
        setReferralCodeUsed('');
      }
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
        setErrorMsg(t('enterEmailFirst'));
        setIsLoading(false);
        return;
      }
      try {
        await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
        setSuccessMsg(t('resetLinkSent'));
        setTimeout(() => {
          setIsForgotPassword(false);
          setErrorMsg('');
          setSuccessMsg('');
          setResetEmail('');
        }, 6000);
      } catch (err: any) {
        console.error("Password reset error: ", err);
        let errorMsgAr = t('errorWithMsg').replace('{message}', err.message);
        if (err.code === 'auth/user-not-found') {
          errorMsgAr = t('emailNotRegistered');
        } else if (err.code === 'auth/invalid-email') {
          errorMsgAr = t('invalidEmail');
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isLogin) {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('يرجى ملء جميع الحقول المطلوبة ⚠️');
        setIsLoading(false);
        return;
      }
    } else {
      if (!username.trim()) {
        setErrorMsg('يرجى إدخال اسم المستخدم أولاً ⚠️');
        setIsLoading(false);
        return;
      }
      if (!email.trim()) {
        setErrorMsg('يرجى إدخال البريد الإلكتروني أولاً ⚠️');
        setIsLoading(false);
        return;
      }
      if (!password.trim()) {
        setErrorMsg('يرجى إدخال كلمة المرور أولاً ⚠️');
        setIsLoading(false);
        return;
      }
      if (!confirmPassword.trim()) {
        setErrorMsg('يرجى تأكيد كلمة المرور أولاً ⚠️');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('كلمتا المرور غير متطابقتين ❌');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg('يجب أن تتكون كلمة المرور من 6 خانات على الأقل ⚠️');
        setIsLoading(false);
        return;
      }
    }

    const inputVal = email.trim();
    const adminEmail = 'khdersy808@gmail.com';

    if (isMustChangePassword || isMustChangePin) {
      // Validate Password if needed
      if (isMustChangePassword) {
        if (newPermanentPassword.length < 6) {
          setErrorMsg(t('weakPassword'));
          setIsLoading(false);
          return;
        }
        if (newPermanentPassword !== confirmPermanentPassword) {
          setErrorMsg('كلمات السر غير متطابقة ❌');
          setIsLoading(false);
          return;
        }
      }

      // Validate PIN if needed
      if (isMustChangePin) {
        if (!/^\d{4}$/.test(newPermanentPin)) {
          setErrorMsg('يجب أن يتكون رمز PIN من 4 أرقام فقط ⚠️');
          setIsLoading(false);
          return;
        }
        if (newPermanentPin !== confirmPermanentPin) {
          setErrorMsg('رموز الـ PIN غير متطابقة ❌');
          setIsLoading(false);
          return;
        }
      }

      try {
        const userId = auth.currentUser?.uid || tempSessionUser?.uid || tempSessionUser?.id || '';
        if (!userId) {
          throw new Error('لم يتم العثور على معرف المستخدم الخاص بك ⚠️');
        }
        const userDocRef = doc(db, 'users', userId);
        const updates: any = {};

        if (isMustChangePassword) {
          updates.password = hashPassword(newPermanentPassword);
          updates.tempPassword = null;
          updates.tempPasswordExpiry = null;
          updates.mustChangePassword = false;
        }

        if (isMustChangePin) {
          updates.paymentPin = encryptPin(newPermanentPin);
          updates.tempPin = null;
          updates.tempPinExpiry = null;
          updates.mustChangePin = false;
        }

        await updateDoc(userDocRef, updates);

        // Try to update Firebase Auth password if applicable
        if (isMustChangePassword && auth.currentUser) {
          await updatePassword(auth.currentUser, newPermanentPassword);
        }

        setSuccessMsg('تم تحديث بياناتك بنجاح! يمكنك الاستمتاع بالتسوق الآن 👑');
        setTimeout(() => {
          setIsMustChangePassword(false);
          setIsMustChangePin(false);
          setIsLogin(true);
          setPassword('');
          setNewPermanentPassword('');
          setConfirmPermanentPassword('');
          setNewPermanentPin('');
          setConfirmPermanentPin('');
          setSuccessMsg('');
          onClose(); // Auto close and proceed
        }, 2500);
      } catch (err: any) {
        console.error("Error updating security credentials:", err);
        setErrorMsg('فشل في تحديث البيانات. يرجى المحاولة لاحقاً.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isLogin) {
      // ------------------ LOGIN FLOW ------------------
      let normalizedEmail = '';
      const isEmailInput = inputVal.includes('@');

      if (isEmailInput) {
        normalizedEmail = inputVal.toLowerCase();
      } else {
        // Input is a plain username, search in Firestore
        try {
          const uQuery = query(collection(db, 'users'), where('username', '==', inputVal));
          const uSnap = await getDocs(uQuery);
          if (uSnap.empty) {
            setErrorMsg('اسم المستخدم غير مسجل ⚠️');
            setIsLoading(false);
            return;
          }
          const userDoc = uSnap.docs[0];
          normalizedEmail = userDoc.data().email.toLowerCase();
        } catch (err: any) {
          console.error("Error finding username email:", err);
          setErrorMsg('حدث خطأ أثناء البحث عن اسم المستخدم ⚠️');
          setIsLoading(false);
          return;
        }
      }

      try {
        // Set persistence dynamically based on Remember Me checkbox
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        let userCredential;

        try {
          // Direct sign in with credentials
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (signInErr: any) {
          // Check for temporary password fallback
          try {
            const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const userDoc = querySnap.docs[0];
              const userData = userDoc.data();
              const hashedEntered = hashPassword(password);
              const now = new Date().toISOString();
              
              if (userData.tempPassword === hashedEntered && userData.tempPasswordExpiry > now) {
                // Valid temporary login
                setIsMustChangePassword(true);
                setTempSessionUser({ email: normalizedEmail, id: userDoc.id, ...userData });
                setErrorMsg('');
                setSuccessMsg('تم قبول رمز الدخول المؤقت. يرجى تعيين كلمة سر جديدة فوراً للحماية 🔐');
                setIsLoading(false);
                return;
              }
            }
          } catch (tempErr) {
            console.warn("Quietly skipped temporary password fallback check:", tempErr);
          }
          
          // Auto register admin if credentials fail on the designated admin email
          if (normalizedEmail === adminEmail.toLowerCase() && 
              (signInErr.code === 'auth/invalid-credential' || 
               signInErr.code === 'auth/user-not-found' || 
               signInErr.code === 'auth/wrong-password')) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
              await updateProfile(userCredential.user, { displayName: 'مدير النظام الملكي' });
            } catch (signUpErr: any) {
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }

        const fbUser = userCredential.user;
        const userDocRef = doc(db, 'users', fbUser.uid);
        let userDoc = null;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (err) {
          console.warn("Failed to get user doc, will create silently:", err);
        }

        const mustChangePassword = userDoc && userDoc.exists() && userDoc.data().mustChangePassword;
        const mustChangePin = userDoc && userDoc.exists() && userDoc.data().mustChangePin;

        if (mustChangePassword || mustChangePin) {
          setIsMustChangePassword(!!mustChangePassword);
          setIsMustChangePin(!!mustChangePin);
          setTempSessionUser(fbUser);
          setIsLoading(false);
          return;
        }

        let role = 'customer';
        let nameVal = fbUser.displayName || normalizedEmail.split('@')[0];

        const deviceId = getDeviceFingerprint();
        const sessionId = crypto.randomUUID();
        localStorage.setItem('current_session_id', sessionId);

        if (normalizedEmail === adminEmail.toLowerCase()) {
          role = 'admin';
          try {
            await setDoc(userDocRef, {
              id: fbUser.uid,
              username: 'admin',
              name: nameVal || 'مدير النظام الملكي',
              email: normalizedEmail,
              role: 'admin',
              deviceId: deviceId,
              currentSessionId: sessionId,
              createdAt: (userDoc && userDoc.exists()) ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.warn("Failed to set admin doc:", e);
          }
        } else {
          if (userDoc && userDoc.exists()) {
            role = userDoc.data().role || 'customer';
            nameVal = userDoc.data().username || userDoc.data().name || nameVal;
            try {
              await setDoc(userDocRef, {
                deviceId: deviceId,
                currentSessionId: sessionId
              }, { merge: true });
            } catch (e) {
              console.warn("Failed to update user doc:", e);
            }
          } else {
            // Missing Firestore profile, create it
            try {
              await setDoc(userDocRef, {
                id: fbUser.uid,
                username: nameVal,
                name: nameVal,
                email: normalizedEmail,
                role: role,
                deviceId: deviceId,
                currentSessionId: sessionId,
                createdAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn("Failed to create missing user doc:", e);
            }
          }
        }

        const foundUser: User = {
          id: fbUser.uid,
          name: nameVal,
          email: normalizedEmail,
          password: hashPassword(password),
          role: role as 'admin' | 'customer'
        };

        onLogin(foundUser, rememberMe);
        setSuccessMsg(`تم تسجيل الدخول بنجاح! أهلاً بك مجدداً يا ${nameVal} 👑`);
        
        setTimeout(() => {
          onClose();
          setEmail('');
          setPassword('');
          setUsername('');
          setConfirmPassword('');
          setErrorMsg('');
          setSuccessMsg('');
        }, 1500);

      } catch (error: any) {
        console.error("Firebase Auth Error:", error.code, error.message);
        let errorMsgAr = t('invalidCredentials');
        if (error.code === 'auth/operation-not-allowed') {
          errorMsgAr = `طريقة تسجيل الدخول بالبريد الإلكتروني وكلمة المرور غير مفعّلة في مشروع Firebase الخاص بك (auth/operation-not-allowed). يرجى التأكد من تفعيلها في لوحة تحكم Firebase Console ⚠️\nالتفاصيل: ${error.message}`;
        } else if (error.code === 'auth/invalid-credential') {
          errorMsgAr = 'بيانات الاعتماد المدخلة غير صحيحة ❌';
        } else if (error.code === 'auth/user-not-found') {
          errorMsgAr = 'حسابك غير مسجل في النظام ⚠️';
        } else if (error.code === 'auth/wrong-password') {
          errorMsgAr = 'كلمة المرور غير صحيحة ❌';
        } else if (error.code === 'auth/user-disabled') {
          errorMsgAr = 'تم تعطيل هذا الحساب الملكي من قبل الإدارة ⚠️';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsgAr = 'محاولات كثيرة خاطئة. تم حظر الدخول مؤقتاً لحمايتك ⏳';
        } else if (error.code === 'auth/network-request-failed') {
          errorMsgAr = 'خطأ في شبكة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت ⚠️';
        } else if (error.message) {
          errorMsgAr = `${error.message} (${error.code || 'unknown'})`;
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }

    } else {
      // ------------------ REGISTER FLOW (SIGN UP) ------------------
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const usernameClean = username.trim();
        const isDefaultAdmin = normalizedEmail === adminEmail.toLowerCase();
        const finalRole = isDefaultAdmin ? 'admin' : 'customer';

        // 1. Check unique username in Firestore
        const uQuery = query(collection(db, 'users'), where('username', '==', usernameClean));
        const uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          setErrorMsg('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم مستخدم آخر ⚠️');
          setIsLoading(false);
          return;
        }

        // 2. Validate Payment PIN if provided
        const pinClean = paymentPinInput.trim();
        if (pinClean && !/^\d{4}$/.test(pinClean)) {
          setErrorMsg('رمز PIN للدفع غير صالح. يجب أن يتكون من 4 أرقام فقط ⚠️');
          setIsLoading(false);
          return;
        }

        // 3. Create Firebase auth user
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const fbUser = userCredential.user;

        // 4. Update displayName in Auth Profile
        await updateProfile(fbUser, { displayName: usernameClean });

        // 5. Send Verification Email
        try {
          await sendEmailVerification(fbUser);
        } catch (verErr) {
          console.warn("Could not send verification email:", verErr);
        }

        const generatedReferralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const deviceId = getDeviceFingerprint();
        const sessionId = crypto.randomUUID();
        localStorage.setItem('current_session_id', sessionId);

        let finalReferredBy = '';
        let finalReferralApplied = false;
        let referrerDocData: any = null;
        let referrerEmail = '';

        const cleanRefCode = referralCodeUsed.trim().toUpperCase();
        if (cleanRefCode) {
          try {
            const usersColl = collection(db, 'users');
            const refQuery = query(usersColl, where('referralCode', '==', cleanRefCode));
            const querySnapshot = await getDocs(refQuery);
            if (!querySnapshot.empty) {
              referrerDocData = querySnapshot.docs[0].data();
              referrerEmail = querySnapshot.docs[0].id;
              finalReferredBy = cleanRefCode;
              finalReferralApplied = true;
            }
          } catch (refErr) {
            console.error("Error verifying referral code:", refErr);
          }
        }

        const encryptedPin = pinClean ? encryptPin(pinClean) : '';

        const newUser: User = {
          id: fbUser.uid,
          name: usernameClean,
          email: normalizedEmail,
          password: hashPassword(password),
          role: finalRole as 'admin' | 'customer',
          referralCode: generatedReferralCode,
          points: 0,
          coupons: [],
          deviceId: deviceId,
          referredBy: finalReferredBy || undefined,
          referralApplied: finalReferralApplied || undefined,
          paymentPin: encryptedPin || undefined
        };

        const userDocRef = doc(db, 'users', fbUser.uid);
        await setDoc(userDocRef, {
          id: fbUser.uid,
          username: usernameClean,
          name: usernameClean,
          email: normalizedEmail,
          role: newUser.role,
          password: hashPassword(password),
          referralCode: generatedReferralCode,
          points: 0,
          coupons: [],
          deviceId: deviceId,
          currentSessionId: sessionId,
          referredBy: finalReferredBy,
          referralApplied: finalReferralApplied,
          paymentPin: encryptedPin,
          createdAt: new Date().toISOString()
        });

        // Referral logic: award points to the referrer
        if (finalReferralApplied && referrerDocData && referrerEmail) {
          try {
            const isUsed = await isDeviceAlreadyUsed(deviceId);
            if (!isUsed) {
              const oldPoints = typeof referrerDocData.points === 'number' ? referrerDocData.points : 0;
              const currentCouponsList = Array.isArray(referrerDocData.coupons) ? referrerDocData.coupons : [];
              const newPoints = oldPoints + 100;
              
              await setDoc(doc(db, 'users', referrerEmail), {
                points: newPoints
              }, { merge: true });
              
              await convertPointsToCoupons(referrerEmail, newPoints, currentCouponsList);
              
              await addDoc(collection(db, 'notifications'), {
                userId: referrerEmail,
                title: 'نقاط إحالة جديدة! 👥🎁',
                message: `لقد حصلت على 100 كهدية لتسجيل صديقك (${usernameClean}) باستخدام كود الإحالة الخاص بك!`,
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
              });
            } else {
              console.log(`Referral reward blocked for device ${deviceId} to prevent fraud.`);
            }
            localStorage.removeItem('king_store_pending_referral');
          } catch (refError) {
            console.warn("Could not award referral points to referrer: ", refError);
          }
        }

        onRegister(newUser);
        onLogin(newUser, rememberMe);
        setSuccessMsg('تم إنشاء حسابك الملكي الجديد وتسجيل الدخول تلقائياً! أهلاً بك في كينج ستور 👑');
        onClearInvite?.();
        
        setTimeout(() => {
          onClose();
          setEmail('');
          setPassword('');
          setUsername('');
          setConfirmPassword('');
          setErrorMsg('');
          setSuccessMsg('');
        }, 1500);

      } catch (err: any) {
        console.error("Firebase Auth Error:", err.code, err.message);
        let errorMsgAr = 'فشل في إنشاء الحساب الملكي ⚠️';
        if (err.code === 'auth/operation-not-allowed') {
          errorMsgAr = `طريقة إنشاء الحساب بالبريد وكلمة المرور غير مفعّلة في مشروع Firebase (auth/operation-not-allowed). يرجى تفعيلها في لوحة تحكم Firebase Console ⚠️\nالتفاصيل: ${err.message}`;
        } else if (err.code === 'auth/email-already-in-use') {
          errorMsgAr = 'البريد الإلكتروني المدخل مسجل بالفعل بموقعنا ⚠️';
        } else if (err.code === 'auth/weak-password') {
          errorMsgAr = 'كلمة المرور ضعيفة جداً. يجب أن تكون 6 خانات أو أكثر ⚠️';
        } else if (err.code === 'auth/invalid-email') {
          errorMsgAr = 'البريد الإلكتروني المدخل غير صالح ⚠️';
        } else if (err.code === 'auth/network-request-failed') {
          errorMsgAr = 'خطأ في شبكة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت ⚠️';
        } else if (err.message) {
          errorMsgAr = `${err.message} (${err.code || 'unknown'})`;
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPassword.trim()) {
      setErrorMsg('يرجى إدخال كلمة المرور لتأكيد الهوية. 🔐');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // 1. Sign in to the existing account with Email/Password
      const userCredential = await signInWithEmailAndPassword(auth, pendingEmail, linkPassword);
      const fbUser = userCredential.user;

      // 2. Link the pending Google credential to this user
      if (pendingGoogleCredential) {
        await linkWithCredential(fbUser, pendingGoogleCredential);
      }

      // 3. User is now successfully authenticated and linked!
      // Let's get/create the user document just like regular login/signup.
      const normalizedEmail = fbUser.email!.toLowerCase();
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      let role = 'customer';
      let nameVal = fbUser.displayName || normalizedEmail.split('@')[0];

      const deviceId = getDeviceFingerprint();
      const sessionId = crypto.randomUUID();
      localStorage.setItem('current_session_id', sessionId);

      if (userDoc.exists()) {
        role = userDoc.data().role || 'customer';
        nameVal = userDoc.data().name || nameVal;
        // Document deviceId and sessionId for existing users on login
        await setDoc(userDocRef, {
          deviceId: deviceId,
          currentSessionId: sessionId
        }, { merge: true });
      } else {
        const generatedReferralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: nameVal,
          email: normalizedEmail,
          role: role,
          referralCode: generatedReferralCode,
          points: 0,
          coupons: [],
          deviceId: deviceId,
          currentSessionId: sessionId,
          createdAt: new Date().toISOString()
        });
      }

      const loggedUser: User = {
        id: fbUser.uid,
        name: nameVal,
        email: normalizedEmail,
        password: '',
        role: role as 'admin' | 'customer'
      };

      onLogin(loggedUser, rememberMe);
      setSuccessMsg('تم ربط الحساب بنجاح وتسجيل الدخول! أهلاً بك في كينج ستور 👑');
      setTimeout(() => {
        onClose();
        // Reset states
        setPendingGoogleCredential(null);
        setPendingEmail('');
        setLinkPassword('');
        setIsLinkingState(false);
        setEmail('');
        setPassword('');
      }, 1500);

    } catch (err: any) {
      console.error("Account linking error: ", err);
      let errMsg = 'فشل في ربط الحساب. يرجى التأكد من كلمة المرور والمحاولة مرة أخرى.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة. 🔐';
      } else if (err.code === 'auth/credential-already-in-use') {
        errMsg = 'هذا الحساب تم ربطه مسبقاً بالفعل! يمكنك الآن تسجيل الدخول مباشرة بكلا الطريقتين. 👑';
      }
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      // Set persistence dynamically based on Remember Me checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      if (!fbUser.email) {
        throw new Error('No email found from Google account.');
      }
      
      const normalizedEmail = fbUser.email.toLowerCase();
      const adminEmail = 'khdersy808@gmail.com';
      
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let role = 'customer';
      let nameVal = fbUser.displayName || name.trim() || normalizedEmail.split('@')[0];
      
      const deviceId = getDeviceFingerprint();
      const sessionId = crypto.randomUUID();
      localStorage.setItem('current_session_id', sessionId);

      if (normalizedEmail === adminEmail.toLowerCase()) {
        role = 'admin';
        await setDoc(userDocRef, {
          id: fbUser.uid,
          username: 'admin',
          name: nameVal || 'مدير النظام الملكي',
          email: normalizedEmail,
          role: 'admin',
          deviceId: deviceId,
          currentSessionId: sessionId,
          createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
        }, { merge: true });

        const loggedUser: User = {
          id: fbUser.uid,
          name: nameVal || 'مدير النظام الملكي',
          email: normalizedEmail,
          password: '',
          role: 'admin'
        };
        onLogin(loggedUser, rememberMe);
        setSuccessMsg(t('welcomeBack').replace('{name}', nameVal));
        setTimeout(() => {
          onClose();
          setEmail('');
          setPassword('');
        }, 1500);
      } else {
        // Check if user exists and has a custom username
        if (userDoc.exists() && userDoc.data()?.username) {
          role = userDoc.data().role || 'customer';
          nameVal = userDoc.data().username;
          await setDoc(userDocRef, {
            deviceId: deviceId,
            currentSessionId: sessionId
          }, { merge: true });

          const loggedUser: User = {
            id: fbUser.uid,
            name: nameVal,
            email: normalizedEmail,
            password: '',
            role: role as 'admin' | 'customer'
          };
          onLogin(loggedUser, rememberMe);
          setSuccessMsg(t('welcomeBack').replace('{name}', nameVal));
          setTimeout(() => {
            onClose();
            setEmail('');
            setPassword('');
          }, 1500);
        } else {
          // Trigger the smart custom username popup modal within the auth flow
          setGooglePendingUser(fbUser);
          setIsPromptingGoogleUsername(true);
          setIsLoading(false);
          return;
        }
      }
      
    } catch (err: any) {
      console.error("Google sign in error: ", err);
      const adminEmail = 'khdersy808@gmail.com';
      if (err.code === 'auth/account-exists-with-different-credential') {
        const pendingMail = (err.customData?.email || err.email || '').toLowerCase();
        if (pendingMail && pendingMail !== adminEmail.toLowerCase()) {
          // Automatic login for customers! Find the existing user document in Firestore and log in instantly to the same account.
          try {
            const q = query(collection(db, 'users'), where('email', '==', pendingMail));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const uDoc = querySnap.docs[0];
              const uData = uDoc.data();
              
              const loggedUser: User = {
                id: uDoc.id,
                name: uData.name || pendingMail.split('@')[0],
                email: pendingMail,
                password: '',
                role: (uData.role || 'customer') as 'admin' | 'customer'
              };
              
              // Log session
              const deviceId = getDeviceFingerprint();
              const sessionId = crypto.randomUUID();
              localStorage.setItem('current_session_id', sessionId);
              await setDoc(doc(db, 'users', uDoc.id), {
                deviceId: deviceId,
                currentSessionId: sessionId
              }, { merge: true });

              onLogin(loggedUser, rememberMe);
              setSuccessMsg('تم تسجيل الدخول التلقائي الملكي بنجاح! أهلاً بك مجدداً 👑');
              setTimeout(() => {
                onClose();
              }, 1500);
              return;
            }
          } catch (autoLoginErr) {
            console.error("Auto login on google error failed, fallback to manual link:", autoLoginErr);
          }
        }

        const credential = GoogleAuthProvider.credentialFromError(err);
        if (credential && pendingMail) {
          setPendingGoogleCredential(credential);
          setPendingEmail(pendingMail);
          setIsLinkingState(true);
          setErrorMsg('');
          setSuccessMsg('هذا البريد الإلكتروني مسجل بالفعل بكلمة مرور. يرجى إدخال كلمة المرور الخاصة بك لربط حساب Google والاستمرار بأمان. 👑');
          setIsLoading(false);
          return;
        }
      }
      let errorMsgAr = t('errorWithMsg').replace('{message}', err.message);
      if (err.code === 'auth/operation-not-allowed') {
        errorMsgAr = 'طريقة تسجيل الدخول باستخدام Google غير مفعّلة في لوحة تحكم Firebase حالياً. يرجى تفعيلها من Firebase Console -> Authentication -> Sign-in method -> Google 👑';
      } else if (err.code === 'auth/popup-blocked') {
        errorMsgAr = t('googlePopupBlocked');
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMsgAr = t('googlePopupClosed');
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMsgAr = t('googleCancelled');
      }
      setErrorMsg(errorMsgAr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUsernameInput.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم أولاً ⚠️');
      return;
    }
    const cleanUsername = googleUsernameInput.trim();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Check if username is unique in Firestore
      const uQuery = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const uSnap = await getDocs(uQuery);
      if (!uSnap.empty) {
        setErrorMsg('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم مستخدم آخر ⚠️');
        setIsLoading(false);
        return;
      }

      const fbUser = googlePendingUser;
      const normalizedEmail = fbUser.email.toLowerCase();
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      const deviceId = getDeviceFingerprint();
      const sessionId = crypto.randomUUID();
      localStorage.setItem('current_session_id', sessionId);

      let role = 'customer';
      const isDefaultAdmin = normalizedEmail === 'khdersy808@gmail.com'.toLowerCase();
      if (isDefaultAdmin) {
        role = 'admin';
      }

      const generatedReferralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const pendingRef = localStorage.getItem('king_store_pending_referral');
      const cleanRefCode = pendingRef ? pendingRef.trim().toUpperCase() : '';
      
      let finalReferredBy = '';
      let finalReferralApplied = false;
      let referrerDocData: any = null;
      let referrerEmail = '';

      if (cleanRefCode) {
        try {
          const usersColl = collection(db, 'users');
          const refQuery = query(usersColl, where('referralCode', '==', cleanRefCode));
          const querySnapshot = await getDocs(refQuery);
          if (!querySnapshot.empty) {
            referrerDocData = querySnapshot.docs[0].data();
            referrerEmail = querySnapshot.docs[0].id;
            finalReferredBy = cleanRefCode;
            finalReferralApplied = true;
          }
        } catch (refErr) {
          console.error("Error verifying pending referral code:", refErr);
        }
      }

      const newUserDoc = {
        id: fbUser.uid,
        username: cleanUsername,
        name: cleanUsername,
        email: normalizedEmail,
        displayName: cleanUsername,
        role: role,
        referralCode: userDoc.exists() ? (userDoc.data().referralCode || generatedReferralCode) : generatedReferralCode,
        points: userDoc.exists() ? (userDoc.data().points || 0) : 0,
        coupons: userDoc.exists() ? (userDoc.data().coupons || []) : [],
        deviceId: deviceId,
        currentSessionId: sessionId,
        referredBy: userDoc.exists() ? (userDoc.data().referredBy || finalReferredBy) : finalReferredBy,
        referralApplied: userDoc.exists() ? (userDoc.data().referralApplied || finalReferralApplied) : finalReferralApplied,
        createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await setDoc(userDocRef, newUserDoc, { merge: true });

      try {
        await updateProfile(fbUser, { displayName: cleanUsername });
      } catch (profErr) {
        console.warn("Failed to update profile displayName in Auth:", profErr);
      }

      if (finalReferralApplied && referrerDocData && referrerEmail && !userDoc.exists()) {
        try {
          const isUsed = await isDeviceAlreadyUsed(deviceId);
          if (!isUsed) {
            const oldPoints = typeof referrerDocData.points === 'number' ? referrerDocData.points : 0;
            const currentCouponsList = Array.isArray(referrerDocData.coupons) ? referrerDocData.coupons : [];
            const newPoints = oldPoints + 100;
            
            await setDoc(doc(db, 'users', referrerEmail), {
              points: newPoints
            }, { merge: true });
            
            await convertPointsToCoupons(referrerEmail, newPoints, currentCouponsList);
            
            await addDoc(collection(db, 'notifications'), {
              userId: referrerEmail,
              title: 'نقاط إحالة جديدة! 👥🎁',
              message: `لقد حصلت على 100 كهدية لتسجيل صديقك (${cleanUsername}) باستخدام كود الإحالة الخاص بك!`,
              date: new Date().toISOString(),
              isRead: false,
              type: 'system'
            });
          }
          localStorage.removeItem('king_store_pending_referral');
        } catch (refError) {
          console.warn("Could not award referral points:", refError);
        }
      }

      const loggedUser: User = {
        id: fbUser.uid,
        name: cleanUsername,
        email: normalizedEmail,
        password: '',
        role: role as 'admin' | 'customer'
      };

      onLogin(loggedUser, rememberMe);
      setSuccessMsg('تم تعيين اسم المستخدم وتسجيل الدخول بنجاح! أهلاً بك في كينج ستور 👑');
      setTimeout(() => {
        onClose();
        setGooglePendingUser(null);
        setGoogleUsernameInput('');
        setIsPromptingGoogleUsername(false);
        setErrorMsg('');
        setSuccessMsg('');
      }, 1500);

    } catch (err: any) {
      console.error("Error setting Google username:", err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ اسم المستخدم ⚠️');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in" dir={dir}>
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0d0d0d] text-zinc-100 shadow-2xl p-6"
        id="auth-modal-container"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer`}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 mt-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 shadow-lg shadow-amber-500/10 mb-3">
            <Shield className="h-6 w-6 text-slate-950 stroke-[2]" />
          </div>
          <h3 className="text-xl font-black text-white">
            {isPromptingGoogleUsername
              ? 'اختيار اسم مستخدم مخصص 👑'
              : isLinkingState
                ? 'ربط وتأكيد الحساب الملكي 🔗👑'
                : (isMustChangePassword || isMustChangePin)
                  ? 'تحديث بيانات الحماية الإجباري 🔐'
                  : isForgotPassword 
                    ? t('forgotPasswordTitle')
                    : isLogin 
                      ? t('loginRoyalPortal')
                      : t('createNewAccount')
            }
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5">
            {isPromptingGoogleUsername
              ? 'أهلاً بك! يرجى اختيار اسم مستخدم فريد لحسابك لإتمام عملية تسجيل الدخول بـ Google.'
              : isLinkingState
                ? `البريد الإلكتروني ${pendingEmail} مسجل بالفعل بكلمة مرور. يرجى تأكيد كلمة المرور لربط حساب Google والاستمرار بنفس الحساب.`
                : (isMustChangePassword || isMustChangePin)
                  ? 'لحماية حسابك، يجب عليك تعيين بيانات اعتماد جديدة الآن.'
                  : isForgotPassword
                    ? t('forgotPasswordDesc')
                    : isLogin 
                      ? t('loginDesc') 
                      : t('registerDesc')
            }
          </p>
        </div>

        {isPromptingGoogleUsername ? (
          /* GOOGLE USERNAME SELECTION FORM */
          <form onSubmit={handleGoogleUsernameSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">أدخل اسم المستخدم الذي تريده لحسابك في المتجر</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: khaled_king"
                  value={googleUsernameInput}
                  onChange={(e) => setGoogleUsernameInput(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                />
                <UserIcon className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
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
              {isLoading ? 'جاري التحقق والحفظ...' : 'تأكيد اسم المستخدم والربط 👑'}
            </button>

            {/* Cancel Button */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsPromptingGoogleUsername(false);
                  setGooglePendingUser(null);
                  setGoogleUsernameInput('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-zinc-400 font-bold hover:text-zinc-200 cursor-pointer"
              >
                إلغاء والعودة لتسجيل الدخول
              </button>
            </div>
          </form>
        ) : isLinkingState ? (
          /* ACCOUNT LINKING FORM */
          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">كلمة المرور الحالية لتأكيد الربط 🔐</label>
              <div className="relative">
                <input
                  type={showLinkPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                />
                <Lock className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                <button
                  type="button"
                  onClick={() => setShowLinkPassword(!showLinkPassword)}
                  className={`absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-2.5 p-0.5 rounded text-zinc-500 hover:text-zinc-300 focus:outline-none`}
                >
                  {showLinkPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
              {isLoading ? 'جاري التحقق والربط...' : 'تأكيد وربط الحساب الآن 🔗👑'}
            </button>

            {/* Cancel Linking */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setIsLinkingState(false);
                  setPendingGoogleCredential(null);
                  setPendingEmail('');
                  setLinkPassword('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-zinc-400 font-bold hover:text-zinc-200 cursor-pointer"
              >
                إلغاء والعودة لتسجيل الدخول
              </button>
            </div>
          </form>
        ) : (isMustChangePassword || isMustChangePin) ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isMustChangePassword && (
              <>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">كلمة السر الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="6 أرقام أو حروف على الأقل"
                      value={newPermanentPassword}
                      onChange={(e) => setNewPermanentPassword(e.target.value)}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                    />
                    <Lock className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">تأكيد كلمة السر الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="أعد كتابة كلمة السر"
                      value={confirmPermanentPassword}
                      onChange={(e) => setConfirmPermanentPassword(e.target.value)}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                    />
                    <Lock className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>
              </>
            )}

            {isMustChangePin && (
              <>
                <div className="pt-2 border-t border-zinc-900 mt-2">
                  <label className="block text-xs font-bold text-amber-400 mb-1.5">تعيين رمز PIN جديد للدفع (4 أرقام)</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      pattern="\d*"
                      maxLength={4}
                      placeholder="رمز PIN جديد"
                      value={newPermanentPin}
                      onChange={(e) => setNewPermanentPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none tracking-[0.5em] text-center font-mono`}
                    />
                    <Shield className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">تأكيد رمز PIN الجديد</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      pattern="\d*"
                      maxLength={4}
                      placeholder="تأكيد رمز PIN"
                      value={confirmPermanentPin}
                      onChange={(e) => setConfirmPermanentPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none tracking-[0.5em] text-center font-mono`}
                    />
                    <Shield className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>
              </>
            )}

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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-amber-500 text-slate-950 py-3 text-xs font-black hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ كلمة السر والدخول الملكي ✨'}
            </button>
          </form>
        ) : isForgotPassword ? (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">{t('emailLabel')}</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder={t('emailPlaceholderAuth')}
                  value={resetEmail || ""}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                />
                <Mail className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
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
              {isLoading ? t('sending') : t('sendResetLink')}
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
                {t('backToLogin')}
              </button>
            </div>
          </form>
        ) : (
          /* LOGIN & REGISTER FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">اسم المستخدم (Username)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: khaled_king"
                    value={username || ""}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                  />
                  <UserIcon className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                </div>
              </div>
            )}

            {/* Email / Username field */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                {isLogin ? 'البريد الإلكتروني أو اسم المستخدم' : 'البريد الإلكتروني (Email)'}
              </label>
              <div className="relative">
                <input
                  type={isLogin ? 'text' : 'email'}
                  required
                  placeholder={isLogin ? 'أدخل البريد الإلكتروني أو اسم المستخدم' : 'name@example.com'}
                  value={email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                />
                <Mail className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-zinc-400">
                  {isLogin ? t('passwordLabel') : 'كلمة المرور (Password)'}
                </label>
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
                    {t('forgotPasswordLink')}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password || ""}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                />
                <Lock className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-2.5 p-0.5 rounded text-zinc-500 hover:text-zinc-300 focus:outline-none`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">تأكيد كلمة المرور (Confirm Password)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword || ""}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                  />
                  <Lock className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                </div>
              </div>
            )}

            {/* Referral Code (Register only) */}
            {!isLogin && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">كود الإحالة (اختياري)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="مثال: KING-XXXXXX"
                      value={referralCodeUsed || ""}
                      onChange={(e) => setReferralCodeUsed(e.target.value)}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                    />
                    <Check className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">رمز PIN سري للدفع (4 أرقام - اختياري)</label>
                  <div className="relative">
                    <input
                      type="password"
                      pattern="\d*"
                      maxLength={4}
                      placeholder="رمز مكون من 4 أرقام لحماية مشترياتك"
                      value={paymentPinInput || ""}
                      onChange={(e) => setPaymentPinInput(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none tracking-[0.2em] text-center font-mono`}
                    />
                    <Shield className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                  </div>
                </div>
              </div>
            )}

            {/* Admin Invitation Notice Banner */}
            {isAdminRole && adminInviteEmail && (
              <div className={`p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 ${dir === 'rtl' ? 'text-right' : 'text-left'} space-y-1`}>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                  {t('inviteActive')}
                </span>
                <p className="text-xs text-zinc-300">
                  {t('adminInviteNotice')}
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

            {/* Remember Me Checkbox (تذكرني) */}
            {isLogin && (
              <div className="flex items-center justify-start py-1">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-5 rounded-lg border border-zinc-800 bg-zinc-950 transition-all peer-checked:border-amber-400 peer-checked:bg-amber-400/10 flex items-center justify-center group-hover:border-amber-400/60">
                      <Check className={`h-3.5 w-3.5 text-amber-400 transition-transform duration-200 ${rememberMe ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">{t('rememberMe')}</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3 text-xs font-black hover:from-amber-400 hover:to-amber-500 active:scale-98 transition-all shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? t('loading') : isLogin ? t('loginButtonText') : t('registerButtonText')}
            </button>

            {/* Separator / Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-zinc-800"></div>
              <span className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('orContinueWith')}</span>
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
              <span>{isLogin ? t('googleLogin') : t('googleRegister')}</span>
            </button>
          </form>
        )}

        {/* Modal Footer (Switch tab) */}
        {!isForgotPassword && !isLinkingState && (
          <div className="mt-5 pt-4 border-t border-zinc-900 text-center text-xs">
            <span className="text-zinc-500">
              {isLogin ? t('noAccountYet') : t('alreadyHaveAccount')}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`text-amber-400 font-extrabold ${dir === 'rtl' ? 'mr-1' : 'ml-1'} hover:underline cursor-pointer`}
            >
              {isLogin ? t('registerNow') : t('loginHere')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

