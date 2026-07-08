import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  type User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID and long polling to bypass network/sandbox constraints
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Initialize and export Auth
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

// Initialize Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging is not supported in this environment.", e);
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
      expiryDate: 'لا ينتهي',
      usageCount: 0,
      createdAt: new Date().toISOString()
    });
  }
  
  // Update user document
  const userDocRef = doc(db, 'users', userEmail);
  await setDoc(userDocRef, {
    points: remainingPoints,
    coupons: newCoupons
  }, { merge: true });

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
    console.warn("Could not create notification for generated coupon:", notifErr);
  }
  
  return { points: remainingPoints, coupons: newCoupons, generated: generatedCodes };
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
  type FirebaseUser,
  getToken,
  onMessage
};

