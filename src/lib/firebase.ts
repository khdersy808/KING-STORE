import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
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
  type Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser
} from 'firebase/auth';
import firebaseConfigFromJson from '../../firebase-applet-config.json';

// Safe configuration initialization with absolute fallbacks
const firebaseConfig = {
  projectId: firebaseConfigFromJson?.projectId || "kingstore-42539",
  appId: firebaseConfigFromJson?.appId || "1:260775608180:web:3f38686efd8f1716c7f621",
  apiKey: firebaseConfigFromJson?.apiKey || "AIzaSyD9oKYlMhlN67s6yEBxzF0c15q9VgwXHy0",
  authDomain: firebaseConfigFromJson?.authDomain || "kingstore-42539.firebaseapp.com",
  firestoreDatabaseId: firebaseConfigFromJson?.firestoreDatabaseId || "ai-studio-kingstore-0de88264-2a21-4322-9cdf-9f3e734cb912",
  storageBucket: firebaseConfigFromJson?.storageBucket || "kingstore-42539.firebasestorage.app",
  messagingSenderId: firebaseConfigFromJson?.messagingSenderId || "260775608180",
  measurementId: firebaseConfigFromJson?.measurementId || ""
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore safely using a typed immediate expression
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (error: any) {
    console.warn("Firestore already initialized, falling back to getFirestore:", error);
    return getFirestore(app);
  }
})();

// Initialize and export Auth
export const auth = getAuth(app);

// Collection References
export const PRODUCTS_COLLECTION = 'products';
export const ORDERS_COLLECTION = 'orders';
export const NOTIFICATIONS_COLLECTION = 'notifications';
export const USERS_COLLECTION = 'users';

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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type FirebaseUser
};

