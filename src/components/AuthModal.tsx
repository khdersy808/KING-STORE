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
  updatePassword
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
    const usersColl = collection(db, 'users');
    const deviceQuery = query(usersColl, where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(deviceQuery);
    return !querySnapshot.empty;
  } catch (err) {
    console.error("Error checking deviceId in Firestore:", err);
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
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
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

    if (!email.trim() || !password.trim()) {
      setErrorMsg(t('fillAllFields'));
      setIsLoading(false);
      return;
    }

    if (!isLogin && !name.trim()) {
      setErrorMsg(t('enterNameFirst'));
      setIsLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
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
        const userDocRef = doc(db, 'users', normalizedEmail);
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
      // Login flow with Firebase Auth & Firestore
      try {
        // Set persistence dynamically based on Remember Me checkbox
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        
        let userCredential;

        try {
          // Direct sign in using Firebase Console credentials (Firebase Auth)
          userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (signInErr: any) {
          // Check for temporary password fallback
          const userDocRef = doc(db, 'users', normalizedEmail);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const hashedEntered = hashPassword(password);
            const now = new Date().toISOString();
            
            if (userData.tempPassword === hashedEntered && userData.tempPasswordExpiry > now) {
              // Valid temporary login!
              setIsMustChangePassword(true);
              setTempSessionUser({ email: normalizedEmail, ...userData });
              setErrorMsg('');
              setSuccessMsg('تم قبول رمز الدخول المؤقت. يرجى تعيين كلمة سر جديدة فوراً للحماية 🔐');
              setIsLoading(false);
              return;
            }
          }
          
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
          setErrorMsg(t('emailNotVerified'));
          setIsLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', normalizedEmail);
        const userDoc = await getDoc(userDocRef);

        const mustChangePassword = userDoc.exists() && userDoc.data().mustChangePassword;
        const mustChangePin = userDoc.exists() && userDoc.data().mustChangePin;

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

        if (normalizedEmail === adminEmail.toLowerCase()) {
          role = 'admin';
          // Force Firestore document to exist and have 'admin' role
          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: nameVal || 'مدير النظام الملكي',
            email: normalizedEmail,
            role: 'admin',
            deviceId: deviceId,
            createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
          }, { merge: true });
        } else {
          if (userDoc.exists()) {
            role = userDoc.data().role || 'customer';
            nameVal = userDoc.data().name || nameVal;
            // Document deviceId for existing users on login
            await setDoc(userDocRef, {
              deviceId: deviceId
            }, { merge: true });
          } else {
            // If profile missing in Firestore, create it
            await setDoc(userDocRef, {
              id: fbUser.uid,
              name: nameVal,
              email: normalizedEmail,
              role: role,
              deviceId: deviceId,
              createdAt: new Date().toISOString()
            });
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
        setSuccessMsg(t('welcomeBack').replace('{name}', nameVal));
        
        setTimeout(() => {
          onClose();
          // Reset state
          setEmail('');
          setPassword('');
        }, 1500);

      } catch (error: any) {
        console.log(error);
        console.error(error.code, error.message);
        let errorMsgAr = t('invalidCredentials');
        if (error.code === 'auth/invalid-credential') {
          errorMsgAr = t('invalidCredentials');
        } else if (error.code === 'auth/user-not-found') {
          errorMsgAr = t('accountNotRegistered');
        } else if (error.code === 'auth/wrong-password') {
          errorMsgAr = t('wrongPassword');
        } else if (error.code === 'auth/user-disabled') {
          errorMsgAr = t('accountDisabled');
        } else if (error.code === 'auth/too-many-requests') {
          errorMsgAr = t('tooManyRequests');
        } else if (error.code === 'auth/network-request-failed') {
          errorMsgAr = 'خطأ في الاتصال بالخادم. قد تكون الخدمة محجوبة في بلدك، يرجى استخدام VPN أو التحقق من جودة الإنترنت ⚠️';
        } else if (error.message) {
          errorMsgAr = t('errorWithMsg').replace('{message}', error.message);
        }
        setErrorMsg(errorMsgAr);
      } finally {
        setIsLoading(false);
      }

    } else {
      // Register flow with Firebase Auth & Verification Email & Firestore
      try {
        const pinClean = paymentPinInput.trim();
        if (pinClean && !/^\d{4}$/.test(pinClean)) {
          setErrorMsg('رمز PIN للدفع غير صالح. يجب أن يتكون من 4 أرقام فقط ⚠️');
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        const fbUser = userCredential.user;

        // Set Display Name in Firebase Profile
        await updateProfile(fbUser, { displayName: name.trim() });

        // Send Email Verification (Dynamic Verification)
        await sendEmailVerification(fbUser);

        const isDefaultAdmin = normalizedEmail === adminEmail.toLowerCase();

        // Save User Details in Firestore Database
        const generatedReferralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const deviceId = getDeviceFingerprint();

        const cleanRefCode = referralCodeUsed.trim().toUpperCase();
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
            console.error("Error verifying referral code:", refErr);
          }
        }

        const encryptedPin = pinClean ? encryptPin(pinClean) : '';

        const newUser: User = {
          id: fbUser.uid,
          name: name.trim(),
          email: normalizedEmail,
          password: hashPassword(password),
          role: (isAdminRole || isDefaultAdmin) ? 'admin' : 'customer',
          referralCode: generatedReferralCode,
          points: 0,
          coupons: [],
          deviceId: deviceId,
          referredBy: finalReferredBy || undefined,
          referralApplied: finalReferralApplied || undefined,
          paymentPin: encryptedPin || undefined
        };

        const userDocRef = doc(db, 'users', normalizedEmail);
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: name.trim(),
          email: normalizedEmail,
          role: newUser.role,
          password: hashPassword(password),
          referralCode: generatedReferralCode,
          points: 0,
          coupons: [],
          deviceId: deviceId,
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
                message: `لقد حصلت على 100 كهدية لتسجيل صديقك (${name.trim()}) باستخدام كود الإحالة الخاص بك!`,
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
              });
            } else {
              console.log(`Referral reward blocked for device ${deviceId} to prevent fraud.`);
            }
            // Always clear pending referral after processing registration
            localStorage.removeItem('king_store_pending_referral');
          } catch (refError) {
            console.warn("Could not award referral points to referrer: ", refError);
          }
        }

        onRegister(newUser);
        setSuccessMsg(t('registrationSuccess'));
        onClearInvite?.();
        
        setTimeout(() => {
          setIsLogin(true); // Redirect to login tab so they login after verification
          setErrorMsg('');
          setSuccessMsg('');
          setPassword('');
        }, 7000);

      } catch (err: any) {
        console.error("Register error: ", err);
        let errorMsgAr = t('errorWithMsg').replace('{message}', err.message);
        if (err.code === 'auth/email-already-in-use') {
          errorMsgAr = t('emailInUse');
        } else if (err.code === 'auth/weak-password') {
          errorMsgAr = t('weakPassword');
        } else if (err.code === 'auth/invalid-email') {
          errorMsgAr = t('invalidEmail');
        } else if (err.code === 'auth/network-request-failed') {
          errorMsgAr = 'خطأ في الاتصال بالخادم. قد تكون الخدمة محجوبة في بلدك، يرجى استخدام VPN أو التحقق من جودة الإنترنت ⚠️';
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
      
      const userDocRef = doc(db, 'users', normalizedEmail);
      const userDoc = await getDoc(userDocRef);
      
      let role = 'customer';
      let nameVal = fbUser.displayName || name.trim() || normalizedEmail.split('@')[0];
      
      const deviceId = getDeviceFingerprint();

      if (normalizedEmail === adminEmail.toLowerCase()) {
        role = 'admin';
        await setDoc(userDocRef, {
          id: fbUser.uid,
          name: nameVal || 'مدير النظام الملكي',
          email: normalizedEmail,
          role: 'admin',
          deviceId: deviceId,
          createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
        }, { merge: true });
      } else {
        if (userDoc.exists()) {
          role = userDoc.data().role || 'customer';
          nameVal = userDoc.data().name || nameVal;
          // Document deviceId for existing users on login
          await setDoc(userDocRef, {
            deviceId: deviceId
          }, { merge: true });
        } else {
          const generatedReferralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          
          // Check if there is a pending referral code for Google Sign-Up
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

          await setDoc(userDocRef, {
            id: fbUser.uid,
            name: nameVal,
            email: normalizedEmail,
            role: role,
            referralCode: generatedReferralCode,
            points: 0,
            coupons: [],
            deviceId: deviceId,
            referredBy: finalReferredBy,
            referralApplied: finalReferralApplied,
            createdAt: new Date().toISOString()
          });

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
                  message: `لقد حصلت على 100 كهدية لتسجيل صديقك (${nameVal}) باستخدام كود الإحالة الخاص بك!`,
                  date: new Date().toISOString(),
                  isRead: false,
                  type: 'system'
                });
              } else {
                console.log(`Referral points blocked during Google signup for device ${deviceId} to prevent fraud.`);
              }
              localStorage.removeItem('king_store_pending_referral');
            } catch (refError) {
              console.warn("Could not award referral points during Google signup: ", refError);
            }
          }
        }
      }
      
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
      
    } catch (err: any) {
      console.error("Google sign in error: ", err);
      let errorMsgAr = t('errorWithMsg').replace('{message}', err.message);
      if (err.code === 'auth/popup-blocked') {
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
            {(isMustChangePassword || isMustChangePin)
              ? 'تحديث بيانات الحماية الإجباري 🔐'
              : isForgotPassword 
                ? t('forgotPasswordTitle')
                : isLogin 
                  ? t('loginRoyalPortal')
                  : t('createNewAccount')
            }
          </h3>
          <p className="text-xs text-zinc-400 mt-1.5">
            {(isMustChangePassword || isMustChangePin)
              ? 'لحماية حسابك، يجب عليك تعيين بيانات اعتماد جديدة الآن.'
              : isForgotPassword
                ? t('forgotPasswordDesc')
                : isLogin 
                  ? t('loginDesc') 
                  : t('registerDesc')
            }
          </p>
        </div>

        {(isMustChangePassword || isMustChangePin) ? (
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
            
            {/* Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">{t('fullNameLabel')}</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={t('fullNamePlaceholderAuth')}
                    value={name || ""}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 ${dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none`}
                  />
                  <UserIcon className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-zinc-600`} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1.5">{t('emailLabel')}</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder={t('emailPlaceholderAuth')}
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
                <label className="block text-xs font-bold text-zinc-400">{t('passwordLabel')}</label>
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
        {!isForgotPassword && (
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

