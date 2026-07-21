import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, limit, serverTimestamp, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile, 
  updatePassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  linkWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

const dbId = (firebaseConfig as any).firestoreDatabaseId && (firebaseConfig as any).firestoreDatabaseId !== '(default)'
  ? (firebaseConfig as any).firestoreDatabaseId
  : undefined;

// Initialize Firestore with custom database ID and long polling to bypass network/sandbox constraints
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, dbId);

// Initialize and export Auth
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
}
export { messaging };

// Collection References
export const PRODUCTS_COLLECTION = 'products';
export const ORDERS_COLLECTION = 'orders';
export const NOTIFICATIONS_COLLECTION = 'notifications';
export const USERS_COLLECTION = 'users';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

import { safeJsonStringify } from './safeJson';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isNetworkOrTimeout = 
    errMsg.includes('Could not reach Cloud Firestore backend') ||
    errMsg.includes('client is offline') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('deadline-exceeded') ||
    errMsg.includes('network-request-failed') ||
    errMsg.includes('failed to get document') ||
    errMsg.includes('Failed to get document') ||
    errMsg.includes('network error') ||
    errMsg.includes('backend');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // For offline/network/timeout issues or read operations, handle quietly and fall back to local data without throwing an uncaught error
  if (isNetworkOrTimeout || operationType === OperationType.GET || operationType === OperationType.LIST) {
    console.warn(`[Firestore Offline/Timeout Quiet Fallback] (${operationType} @ ${path}):`, errMsg);
    return;
  }

  console.error('Firestore Error: ', safeJsonStringify(errInfo));
  throw new Error(safeJsonStringify(errInfo));
}

async function getUserDocRef(emailOrUid: string) {
  if (!emailOrUid) return null;
  const normalized = emailOrUid.trim().toLowerCase();
  
  if (auth.currentUser) {
    if (auth.currentUser.uid === emailOrUid || auth.currentUser.email?.toLowerCase() === normalized) {
      return doc(db, 'users', auth.currentUser.uid);
    }
  }

  if (!normalized.includes('@')) {
    return doc(db, 'users', emailOrUid);
  }

  // Only admins have collection-level read permissions on 'users' collection to query by email
  const isAdmin = auth.currentUser?.email?.toLowerCase() === 'khdersy808@gmail.com' || auth.currentUser?.email?.toLowerCase() === 'nagamwesam1998@gmail.com';
  
  if (isAdmin) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', normalized));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return doc(db, 'users', snap.docs[0].id);
      }
    } catch (err) {
    }
  }

  // Fallback to prevent permission errors: never return the email as the document ID
  if (auth.currentUser) {
    return doc(db, 'users', auth.currentUser.uid);
  }
  return doc(db, 'users', 'anonymous_user_fallback');
}

export async function redeemPoints(userEmail: string, currentPoints: number, currentCoupons: string[] = [], rule: any): Promise<{ points: number; coupons: string[]; generated: string }> {
  const pointsRequired = rule.discount * 1000;
  if (currentPoints < pointsRequired) {
    throw new Error('Not enough points');
  }

  const remainingPoints = currentPoints - pointsRequired;
  const code = 'RWD' + rule.discount + 'USD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const newCoupons = [...currentCoupons, code];

  // Save to global coupons collection
  const couponDocRef = doc(db, 'coupons', code);
  await setDoc(couponDocRef, {
    id: code,
    code: code,
    type: 'fixed',
    value: rule.discount,
    minAmount: rule.minPurchase,
    isActive: true,
    is_used: false,
    usage_status: 'unused',
    expiryDate: 'لا ينتهي',
    usageCount: 0,
    userId: userEmail,
    createdAt: new Date().toISOString()
  });

  // Update user document
  const userDocRef = await getUserDocRef(userEmail);
  if (userDocRef) {
    await setDoc(userDocRef, {
      points: remainingPoints,
      coupons: newCoupons
    }, { merge: true });
  }

  // Add system notifications for the coupon generated
  try {
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: userEmail,
      title: 'تم استبدال النقاط بنجاح! 🎁',
      message: `تهانينا! لقد حصلت على قسيمة خصم بقيمة $${rule.discount} بكود: ${code} مقابل ${pointsRequired} نقطة.`,
      date: new Date().toISOString(),
      isRead: false,
      type: 'system'
    });
  } catch (notifErr) {
  }

  return { points: remainingPoints, coupons: newCoupons, generated: code };
}

export async function convertPointsToCoupons(userEmail: string, currentPoints: number, currentCoupons: string[] = []): Promise<{ points: number; coupons: string[]; generated: string[] }> {
  if (currentPoints < 1000) {
    return { points: currentPoints, coupons: currentCoupons, generated: [] };
  }
  
  const couponsToGenerate = Math.floor(currentPoints / 1000);
  const remainingPoints = currentPoints % 1000;
  const newCoupons = [...currentCoupons];
  const generatedCodes: string[] = [];
  
  for (let i = 0; i < couponsToGenerate; i++) {
    const code = 'REF1USD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    generatedCodes.push(code);
    newCoupons.push(code);
    
    // Save to global coupons collection
    const couponDocRef = doc(db, 'coupons', code);
    await setDoc(couponDocRef, {
      id: code,
      code: code,
      type: 'fixed',
      value: 1, // $1
      minAmount: 0,
      isActive: true,
      is_used: false,
      usage_status: 'unused',
      expiryDate: 'لا ينتهي',
      usageCount: 0,
      userId: userEmail,
      createdAt: new Date().toISOString()
    });
  }
  
  // Update user document
  const userDocRef = await getUserDocRef(userEmail);
  if (userDocRef) {
    await setDoc(userDocRef, {
      points: remainingPoints,
      coupons: newCoupons
    }, { merge: true });
  }

  // Add system notifications for the coupons generated
  try {
    const notificationRef = collection(db, 'notifications');
    for (const code of generatedCodes) {
      await addDoc(notificationRef, {
        userId: userEmail,
        title: 'قسيمة هدايا ملكية جديدة! 🎁',
        message: `تهانينا! لقد حصلت على قسيمة خصم بقيمة 1$ بكود: ${code} مقابل 1000 نقطة من نقاط الإحالة الخاصة بك.`,
        date: new Date().toISOString(),
        isRead: false,
        type: 'system'
      });
    }
  } catch (notifErr) {
  }
  
  return { points: remainingPoints, coupons: newCoupons, generated: generatedCodes };
}

export async function awardPointsForOrder(orderId: string, customerEmail: string, totalAmount: number): Promise<void> {
  if (!customerEmail) return;
  const userEmail = customerEmail.toLowerCase();
  
  try {
    // 1. Check if points are already awarded for this order
    const pointsHistoryQuery = query(
      collection(db, 'points_history'),
      where('orderId', '==', orderId)
    );
    const querySnap = await getDocs(pointsHistoryQuery);
    if (!querySnap.empty) {
      console.log(`[Loyalty] Points already awarded for order ${orderId}`);
      return; // Already awarded!
    }

    // 2. Fetch loyalty settings
    let isEnabled = true;
    let pointsPerDollar = 100;
    try {
      const loyaltySnap = await getDoc(doc(db, 'settings', 'loyalty'));
      if (loyaltySnap.exists()) {
        const loyaltyData = loyaltySnap.data();
        isEnabled = loyaltyData.isEnabled !== false; // default true
        pointsPerDollar = loyaltyData.pointsPerDollar ?? 100;
      }
    } catch (err) {
    }

    if (!isEnabled) {
      console.log(`[Loyalty] Purchase points are currently disabled.`);
      return;
    }

    // Calculate points: $1 = pointsPerDollar
    const pointsAdded = Math.round(totalAmount * pointsPerDollar);
    if (pointsAdded <= 0) return;

    // 3. Add to points_history
    const historyRef = doc(collection(db, 'points_history'));
    await setDoc(historyRef, {
      userId: userEmail,
      points_added: pointsAdded,
      orderId: orderId,
      date: new Date().toISOString()
    });

    // 4. Update user's points
    const userRef = await getUserDocRef(userEmail);
    if (!userRef) return;
    const userSnap = await getDoc(userRef);
    let currentPoints = 0;
    let currentCoupons: string[] = [];
    let userName = userEmail;

    if (userSnap.exists()) {
      const userData = userSnap.data();
      currentPoints = userData.points || 0;
      currentCoupons = userData.coupons || [];
      userName = userData.name || userEmail;
    }

    const newPoints = currentPoints + pointsAdded;

    // Save points
    await setDoc(userRef, {
      points: newPoints
    }, { merge: true });

    // 5. Trigger auto-conversion for every 1000 points
    if (newPoints >= 1000) {
      await convertPointsToCoupons(userEmail, newPoints, currentCoupons);
    }

    // 6. Create system notification for the user
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: userEmail,
        title: '🎉 تم كسب نقاط ملكية جديدة!',
        message: `تهانينا يا ${userName}! لقد حصلت على ${pointsAdded} نقطة ملكية مقابل مشترياتك في الطلب #${orderId}.`,
        date: new Date().toISOString(),
        isRead: false,
        type: 'system',
        orderId: orderId
      });
    } catch (notifErr) {
    }

    console.log(`[Loyalty] Awarded ${pointsAdded} points to ${userEmail} for order ${orderId}`);
  } catch (error) {
    console.error("[Loyalty] Error awarding points for order:", error);
  }
}

export const encryptPin = (pin: string): string => {
  if (!pin) return "";
  try {
    return btoa("KINGSTORE-SECURE-PIN-" + pin);
  } catch (e) {
    console.error("Error encrypting PIN:", e);
    return pin;
  }
};

export const hashPassword = (password: string): string => {
  if (!password) return "";
  try {
    return btoa("KINGSTORE-PASSWORD-SALT-" + password);
  } catch (e) {
    console.error("Error hashing password:", e);
    return password;
  }
};

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  limit,
  serverTimestamp,
  ref,
  uploadString,
  getDownloadURL,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  updatePassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  linkWithCredential,
  EmailAuthProvider,
  type FirebaseUser,
  getToken,
  onMessage
};

