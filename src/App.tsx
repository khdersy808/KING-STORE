/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import OrderTracking from './components/OrderTracking';
import { Product, PaymentGateway, Order, CartItem, ProductType, OrderStatus, ProductReview, User, AppNotification, DeliverySettings } from './types';
import { INITIAL_PRODUCTS, INITIAL_PAYMENT_GATEWAYS, INITIAL_ORDERS } from './data';
import {
  Package,
  Zap,
  ShieldCheck,
  CreditCard,
  Truck,
  Sparkles,
  ShoppingBag,
  Filter,
  Crown,
  X,
  Smartphone,
  ArrowDownToLine,
  Info,
  Settings,
  Check,
  Copy,
  ExternalLink,
  Code,
  Grid,
  Home,
  Heart,
  User as UserIcon,
  ShoppingCart,
  Users,
  MessageSquare,
  History
} from 'lucide-react';
import ProductDetailsModal from './components/ProductDetailsModal';
import MyOrders from './components/MyOrders';
import { BottomNav } from './components/BottomNav';
import AuthModal from './components/AuthModal';
import { DailyCheckIn } from './components/DailyCheckIn';
import SettingsModal from './components/SettingsModal';
import WalletModal from './components/WalletModal';
import AgentDashboard from './components/AgentDashboard';
import MessagingSystem from './components/MessagingSystem';
import { WelcomeSplash } from './components/WelcomeSplash';
import RoyalRecoveryPopup from './components/RoyalRecoveryPopup';
import { CustomRequestForm } from './components/CustomRequestForm';
import { UserCustomRequests } from './components/UserCustomRequests';
import { db, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, auth, signOut, onAuthStateChanged, messaging, getToken, onMessage, awardPointsForOrder, where, onSnapshot } from './lib/firebase';

// Firestore Error Handler helper for security rule debugging
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { safeLocalStorageSetItem } from './lib/safeJson';

export default function App() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const { dir, t, language, texts } = useLanguage();
  const { isSypEnabled, setIsSypEnabled, exchangeRate } = useCurrency();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeCustomerView, setActiveCustomerView] = useState<'store' | 'tracking' | 'wishlist' | 'my-orders' | 'custom-requests'>('store');
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [rewardsConfig, setRewardsConfig] = useState<{ [key: string]: number }>({
    day1: 10, day2: 20, day3: 30, day4: 40, day5: 50, day6: 60, day7: 100
  });

  // --- Core App Initialization ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { getDoc, doc, getDocs, collection, query, orderBy } = await import('firebase/firestore');
        
        // 1. Wait for Auth and User Profile to resolve
        await new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
              try {
                const userDocRef = doc(db, 'users', fbUser.email!.toLowerCase());
                const userDocSnap = await getDoc(userDocRef);
                // The onAuthStateChanged listener in App.tsx will handle the state setting
                // We just need to wait for this one-time fetch to complete as a signal
              } catch (e) {
                console.warn("Auth initialization fetch error:", e);
              }
            }
            unsubscribe();
            resolve();
          });
          // Timeout as safety
          setTimeout(resolve, 3000);
        });

        // 2. Fetch all configuration data in parallel
        const fetchPromises = [
          // Rewards Config
          getDoc(doc(db, 'settings', 'daily_checkin')).then(snap => {
            if (snap.exists()) {
              const data = snap.data();
              setRewardsConfig({
                day1: data.day1 || 10,
                day2: data.day2 || 20,
                day3: data.day3 || 30,
                day4: data.day4 || 40,
                day5: data.day5 || 50,
                day6: data.day6 || 60,
                day7: data.day7 || 100,
              });
            }
          }),
          // Categories
          getDocs(query(collection(db, 'categories'))).then(snap => {
            if (!snap.empty) {
              const list: string[] = [];
              snap.forEach(d => { if (d.data().name) list.push(d.data().name); });
              if (list.length > 0) setCategories(list);
            }
          }),
          // Global Discount
          getDoc(doc(db, 'settings', 'discounts')).then(snap => {
            if (snap.exists() && typeof snap.data().globalDiscount === 'number') {
              setGlobalDiscount(snap.data().globalDiscount);
            }
          }),
          // Delivery Settings
          getDoc(doc(db, 'delivery_config', 'global_settings')).then(snap => {
            if (snap.exists()) {
              setDeliverySettings({ id: snap.id, ...snap.data() } as DeliverySettings);
            }
          }),
          // Exclusive Discounts Section
          getDoc(doc(db, 'settings', 'discounts_section')).then(snap => {
            if (snap.exists()) {
              const data = snap.data();
              setDiscountsSectionTitle(data.title || 'عروض ملوك الأسبوع الحصرية 👑');
              setDiscountsSectionDesc(data.description || 'خصومات استثنائية تصل إلى 30٪ على أفخم السلع!');
              setDiscountsSectionFeaturedProductIds(data.featuredProducts || []);
            }
          })
        ];

        await Promise.all(fetchPromises);

        // 3. Final safety buffer
        await new Promise(resolve => setTimeout(resolve, 300));

        setIsAppReady(true);
        const loader = document.getElementById('global-loader');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
            loader.remove();
          }, 300);
        }
      } catch (error) {
        console.warn("App initialization error:", error);
        setIsAppReady(true); 
      }
    };

    initializeApp();
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === 'admin' || tab === 'admin-custom-requests') {
      setIsAdminMode(true);
      setCurrentTab(tab);
    } else {
      setIsAdminMode(false);
      setCurrentTab(tab);
      setActiveCustomerView('store'); // Reset special views when switching tabs
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const rememberMe = localStorage.getItem('king_store_remember_me') === 'true';
    if (rememberMe) {
      const saved = localStorage.getItem('king_store_current_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'success' | 'info' | 'warning' }[]>([]);

  // --- PWA Installation Logic ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Setup Push Notifications
  useEffect(() => {
    if (!currentUser || !messaging) return;

    const setupNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Get the FCM token
          const token = await getToken(messaging, {
            vapidKey: 'BHz_Tj0uG9Wp5J_q9X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J0X0B9J' // Placeholder, real one should be from Firebase Console
          });
          
          if (token) {
            console.log('FCM Token generated:', token);
            // Save token to Firestore
            const userDocRef = doc(db, 'users', currentUser.email.toLowerCase());
            await setDoc(userDocRef, { fcmToken: token }, { merge: true });
          }
        }
      } catch (err) {
        console.error('Error setting up push notifications:', err);
      }
    };

    setupNotifications();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload: any) => {
      console.log('Foreground message received:', payload);
      if (payload.notification) {
        showToast(
          payload.notification.title || 'إشعار جديد 🔔',
          payload.notification.body || '',
          'info'
        );
      }
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  // --- Pull-to-Refresh State System for Mobile ---
  const [startY, setStartY] = useState<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      // Tension factor 0.35 with a limit of 100px
      const distance = Math.min(diff * 0.35, 100);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance >= 80) {
      setIsRefreshing(true);
      setPullDistance(80);
      // Brief delay then reload
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      setPullDistance(0);
    }
  };

  // --- LocalStorage Persistence Engine ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('king_store_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [gateways, setGateways] = useState<PaymentGateway[]>(() => {
    const saved = localStorage.getItem('king_store_gateways');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENT_GATEWAYS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('king_store_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('king_store_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Notifications & Toasts State ---
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('king_store_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  // Synchronize points history with currentUser in real-time
  useEffect(() => {
    if (!currentUser?.email) {
      setPointsHistory([]);
      return;
    }

    const q = query(
      collection(db, 'points_history'),
      where('userId', '==', currentUser.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyList: any[] = [];
      snapshot.forEach((doc) => {
        historyList.push({ id: doc.id, ...doc.data() });
      });
      // Sort in-memory safely to prevent requiring a composite index
      historyList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPointsHistory(historyList);
    }, (error) => {
      console.warn("Error listening to points history:", error);
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  // Synchronize wishlist with Firestore subcollection in real-time
  useEffect(() => {
    if (!currentUser?.email) {
      const saved = localStorage.getItem('king_store_wishlist');
      setWishlist(saved ? JSON.parse(saved) : []);
      return;
    }

    const userEmail = currentUser.email.toLowerCase();
    const wishColl = collection(db, 'users', userEmail, 'wishlist');
    
    const unsubscribe = onSnapshot(wishColl, (snapshot) => {
      const wishList: string[] = [];
      snapshot.forEach((doc) => {
        wishList.push(doc.id);
      });
      setWishlist(wishList);
    }, (err) => {
      console.warn("Wishlist sync error:", err);
    });

    return () => unsubscribe();
  }, [currentUser?.email]);

  const handleToggleWishlist = async (productId: string) => {
    if (!currentUser) {
      const newWishlist = wishlist.includes(productId)
        ? wishlist.filter((id) => id !== productId)
        : [...wishlist, productId];
      
      setWishlist(newWishlist);
      safeLocalStorageSetItem('king_store_wishlist', newWishlist);
      return;
    }

    try {
      const userEmail = currentUser.email.toLowerCase();
      const wishDocRef = doc(db, 'users', userEmail, 'wishlist', productId);
      
      if (wishlist.includes(productId)) {
        // Remove from wishlist
        try {
          await deleteDoc(wishDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${userEmail}/wishlist/${productId}`);
        }
      } else {
        // Add to wishlist
        try {
          await setDoc(wishDocRef, {
            id: productId,
            addedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${userEmail}/wishlist/${productId}`);
        }
      }
      // Let the onSnapshot listener update the local state.
    } catch (err) {
      console.error("Error toggling wishlist item in Firestore:", err);
    }
  };

  // --- Dynamic Categories State Engine ---
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('king_store_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        console.warn("Error parsing saved categories:", err);
      }
    }
    // Extract unique categories from initial products as fallback
    return Array.from(new Set(INITIAL_PRODUCTS.map((p) => p.category)));
  });

  // Categories synchronization is now handled in initializeApp for better performance
  useEffect(() => {
    safeLocalStorageSetItem('king_store_categories', categories);
  }, [categories]);

  // Synchronize products with Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { getDocs, collection, setDoc, doc } = await import('firebase/firestore');
        const q = collection(db, 'products');
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || '',
              description: data.description || '',
              price: Number(data.price) || 0,
              type: data.type || 'physical',
              category: data.category || '',
              imageUrl: data.imageUrl || '',
              stock: data.stock !== undefined && data.stock !== null ? Number(data.stock) : undefined,
              downloadUrl: data.downloadUrl || undefined,
              licenseKeys: Array.isArray(data.licenseKeys) ? data.licenseKeys : undefined,
              reviews: Array.isArray(data.reviews) ? data.reviews : undefined,
              discountPercentage: data.discountPercentage !== undefined ? Number(data.discountPercentage) : undefined,
              sizes: Array.isArray(data.sizes) ? data.sizes : [],
              colors: Array.isArray(data.colors) ? data.colors : [],
              createdAt: data.createdAt || undefined,
              updatedAt: data.updatedAt || undefined,
            } as Product);
          });
          setProducts(list);
        } else {
          // Seed INITIAL_PRODUCTS if empty in Firestore
          INITIAL_PRODUCTS.forEach(async (p) => {
            try {
              await setDoc(doc(db, 'products', p.id), {
                name: p.name,
                description: p.description,
                price: Number(p.price),
                type: p.type,
                category: p.category,
                imageUrl: p.imageUrl,
                stock: p.stock !== undefined ? Number(p.stock) : null,
                downloadUrl: p.downloadUrl || null,
                licenseKeys: p.licenseKeys || null,
                reviews: p.reviews || null,
                discountPercentage: p.discountPercentage || 0,
                sizes: p.sizes || []
              });
            } catch (err) {
              console.warn(`Error seeding product ${p.name} to Firestore:`, err);
            }
          });
        }
      } catch (e) {
        console.warn("Firebase products fetch failed.", e);
      }
    };
    fetchProducts();
  }, []);

  // Synchronize orders with Firestore
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { getDocs, collection } = await import('firebase/firestore');
        const q = collection(db, 'orders');
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const list: Order[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              customerName: data.customerName || '',
              customerEmail: data.customerEmail || '',
              customerPhone: data.customerPhone || '',
              shippingAddress: data.shippingAddress || undefined,
              items: Array.isArray(data.items) ? data.items.map((it: any) => ({
                productId: String(it.productId),
                productName: it.productName || '',
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
                type: it.type || 'physical',
                selectedSize: it.selectedSize || undefined,
              })) : [],
              totalAmount: Number(data.totalAmount) || 0,
              paymentMethodId: data.paymentMethodId || '',
              paymentDetails: data.paymentDetails || {},
              receiptUrl: data.receiptUrl || undefined,
              status: data.status || 'pending',
              date: data.date || new Date().toISOString(),
              senderName: data.senderName || undefined,
              transactionId: data.transactionId || undefined,
            } as Order);
          });
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setOrders(list);
        }
      } catch (e) {
        console.warn("Firebase orders fetch failed.", e);
      }
    };
    fetchOrders();
  }, []);

  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    id: 'global_settings',
    basePricePerDay: 5,
    rules: [],
    airBaseCost: 40,
    airUrgencyFactor: 8,
    airWeightVolumeFactor: 1.5,
    seaBaseCost: 15,
    seaDailyDecay: 0.5,
    seaMinBaseline: 5
  });

  // Exclusive Weekly Offers / Discounts Section States
  const [discountsSectionTitle, setDiscountsSectionTitle] = useState('عروض ملوك الأسبوع الحصرية 👑');
  const [discountsSectionDesc, setDiscountsSectionDesc] = useState('خصومات استثنائية تصل إلى 30٪ على أفخم السلع!');
  const [discountsSectionFeaturedProductIds, setDiscountsSectionFeaturedProductIds] = useState<string[]>([]);

  // Exclusive Discounts Section settings are now handled in initializeApp

  // Global discount setting is now handled in initializeApp

  // Delivery Settings are now handled in initializeApp

  // Synchronize notifications with Firestore
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser) {
        setNotifications([]);
        return;
      }

      try {
        const { getDocs, query, collection, orderBy } = await import('firebase/firestore');
        const q = query(collection(db, 'notifications'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const list: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
        });

        const filteredList = list.filter(n => {
          return n.userId === currentUser.email || (n.userId === 'admin' && currentUser.role === 'admin');
        });
        
        setNotifications(filteredList);
      } catch (e) {
        console.warn("Firebase notifications fetch failed.", e);
      }
    };
    fetchNotifications();
  }, [currentUser?.email, currentUser?.role]);

  useEffect(() => {
    safeLocalStorageSetItem('king_store_notifications', notifications);
  }, [notifications]);


  // URL Referral parameters detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || params.get('referral');
    if (refParam) {
      const cleanRef = refParam.trim().toUpperCase();
      localStorage.setItem('king_store_pending_referral', cleanRef);
      // Wait slightly so that toasts engine is ready
      setTimeout(() => {
        showToast(
          'رابط إحالة ملكي نشط 🎁',
          `أهلاً بك! تم تفعيل كود الدعوة ${cleanRef}. قم بالتسجيل الآن للحصول على مكافآت حصرية.`,
          'success'
        );
      }, 2000);
    }
  }, []);

  // Synchronize authentication state with Firebase
  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const adminEmail = 'khdersy808@gmail.com';
        const isVerified = fbUser.emailVerified || fbUser.email?.toLowerCase() === adminEmail;
        
        if (isVerified) {
          try {
            const { getDoc } = await import('firebase/firestore');
            const userDocRef = doc(db, 'users', fbUser.email.toLowerCase());
            const userDocSnap = await getDoc(userDocRef);
            
            let currentPoints = 0;
            let currentCoupons: any[] = [];
            let role = 'customer';
            let nameVal = fbUser.displayName || fbUser.email!.split('@')[0];
            let refCode = '';

            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              currentPoints = typeof uData.points === 'number' ? uData.points : 0;
              currentCoupons = Array.isArray(uData.coupons) ? uData.coupons : [];
              role = uData.role || 'customer';
              nameVal = uData.name || fbUser.displayName || fbUser.email!.split('@')[0];
              refCode = uData.referralCode || '';
                
              // If the user already has an account but has no referral code (older accounts)
              if (!refCode) {
                refCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                try {
                  // Update ONLY if missing to avoid snapshot loop
                  await updateDoc(userDocRef, {
                    referralCode: refCode
                  });
                } catch (updateErr) {
                  console.error("Error setting missing referral code:", updateErr);
                }
              }
              
              // Real-time automated conversion check - only if currentPoints is high
              // Added a guard to prevent conversion loop if points are already being processed
              if (currentPoints >= 1000 && !uData.isConvertingPoints) {
                const { convertPointsToCoupons } = await import('./lib/firebase');
                try {
                  // Mark as converting to prevent concurrent triggers from multiple snapshots
                  await updateDoc(userDocRef, { isConvertingPoints: true });
                  await convertPointsToCoupons(fbUser.email!.toLowerCase(), currentPoints, currentCoupons);
                  await updateDoc(userDocRef, { isConvertingPoints: false });
                } catch (err) {
                  console.error("Error during automatic points conversion:", err);
                  await updateDoc(userDocRef, { isConvertingPoints: false });
                }
              }

              // --- Royal Customer Recovery Check ---
              const lastActiveVal = uData.lastActive || uData.lastOrderDate || uData.createdAt || '';
              if (lastActiveVal && role !== 'admin') {
                const lastActiveDate = new Date(lastActiveVal);
                const now = new Date();
                const diffDays = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);

                // Load settings/recovery dynamic values or defaults
                let customDaysLimit = 14;
                let customDiscount = 10;
                let customExpiryDays = 30;
                let customTitle = '👑 اشتقنا لملكنا!';
                let customMessage = 'أهلاً بعودتك يا صاحب الجلالة! لقد تم تفعيل كود خصم خاص 10% لك على سلتك القادمة. الكود: {code}';

                try {
                  const { getDoc, doc } = await import('firebase/firestore');
                  const recSnap = await getDoc(doc(db, 'settings', 'recovery'));
                  if (recSnap.exists()) {
                    const recData = recSnap.data();
                    if (typeof recData.daysLimit === 'number') customDaysLimit = recData.daysLimit;
                    if (typeof recData.discount === 'number') customDiscount = recData.discount;
                    if (typeof recData.expiryDays === 'number') customExpiryDays = recData.expiryDays;
                    if (recData.title) customTitle = recData.title;
                    if (recData.message) customMessage = recData.message;
                  }
                } catch (err) {
                  console.warn("Failed to load custom recovery settings:", err);
                }

                if (diffDays >= customDaysLimit) {
                  const code = `ROYAL-MISS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                  try {
                    const { addDoc, collection } = await import('firebase/firestore');
                    const expiryDateStr = new Date(Date.now() + customExpiryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                    // Add Coupon to database securely
                    await addDoc(collection(db, 'coupons'), {
                      code: code,
                      type: 'percentage',
                      value: customDiscount,
                      minAmount: 0,
                      isActive: true,
                      expiryDate: expiryDateStr,
                      usageCount: 0,
                      createdAt: new Date().toISOString(),
                      userId: fbUser.email!.toLowerCase(),
                      is_used: false,
                      usage_status: 'active'
                    });

                    // Format custom message
                    const formattedMessage = customMessage
                      .replace('{code}', code)
                      .replace('{discount}', customDiscount.toString());

                    // Add Notification
                    await addDoc(collection(db, 'notifications'), {
                      userId: fbUser.email!.toLowerCase(),
                      title: customTitle,
                      message: formattedMessage,
                      date: new Date().toISOString(),
                      isRead: false,
                      type: 'system'
                    });

                    setRecoveryPromoCode(code);
                    setShowRecoveryPopup(true);
                  } catch (err) {
                    console.error("Error generating automated recovery coupon:", err);
                  }
                }
              }

              // Update lastActive in database once to current date/time to mark activity
              try {
                await updateDoc(userDocRef, {
                  lastActive: new Date().toISOString()
                });
              } catch (updateErr) {
                console.error("Error updating user lastActive:", updateErr);
              }
            } else {
              // If profile missing in Firestore, create it
              const isDefaultAdmin = fbUser.email!.toLowerCase() === adminEmail.toLowerCase();
              const roleVal = isDefaultAdmin ? 'admin' : 'customer';
              const referralCode = 'KING-' + Math.random().toString(36).substring(2, 8).toUpperCase();
              
              await setDoc(userDocRef, {
                id: fbUser.uid,
                name: nameVal,
                email: fbUser.email!.toLowerCase(),
                role: roleVal,
                referralCode: referralCode,
                points: 0,
                coupons: [],
                lastActive: new Date().toISOString(),
                createdAt: new Date().toISOString()
              });
            }

            // Unsubscribe existing snapshot first if any
            if (userUnsubscribe) {
              userUnsubscribe();
            }

            // Set up real-time listener for current user state
            userUnsubscribe = onSnapshot(userDocRef, (snap) => {
              if (snap.exists()) {
                const uData = snap.data();
                setCurrentUser({
                  id: fbUser.uid,
                  name: uData.name || nameVal,
                  email: fbUser.email!.toLowerCase(),
                  password: '',
                  role: (uData.role || role) as 'admin' | 'customer' | 'agent',
                  referralCode: uData.referralCode || refCode,
                  points: typeof uData.points === 'number' ? uData.points : 0,
                  coupons: Array.isArray(uData.coupons) ? uData.coupons : [],
                  deviceId: uData.deviceId || '',
                  referredBy: uData.referredBy || '',
                  referralApplied: uData.referralApplied || false,
                  paymentPin: uData.paymentPin || '',
                  lastCheckInDate: uData.lastCheckInDate || '',
                  lastActive: uData.lastActive || new Date().toISOString(),
                  lastOrderDate: uData.lastOrderDate || '',
                  checkInStreak: typeof uData.checkInStreak === 'number' ? uData.checkInStreak : 0
                });
              }
            }, (snapshotErr) => {
              console.warn("User document real-time sync failed:", snapshotErr);
            });

          } catch (err) {
            console.warn("Error in onAuthStateChanged setup:", err);
          }
        }
      } else {
        // If logged out from Firebase, clear client-side state
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        setCurrentUser(null);
      }
    });
    return () => {
      unsubscribe();
      if (userUnsubscribe) {
        userUnsubscribe();
      }
    };
  }, []);

  const showToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);

  const copyToClipboard = (text: string, title: string, message: string) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      success = true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        success = true;
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      textArea.remove();
    }
    
    if (success) {
      showToast(title, message, 'success');
    } else {
      showToast('خطأ بالنسخ', 'يرجى تحديد الكود ونسخه يدوياً 📋', 'warning');
    }
  };

  const addNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'order_created' | 'order_status_updated' | 'system',
    orderId?: string
  ) => {
    const newNotif = {
      userId,
      title,
      message,
      date: new Date().toISOString(),
      isRead: false,
      type,
      orderId: orderId || '',
    };

    try {
      await addDoc(collection(db, 'notifications'), newNotif);
    } catch (e) {
      console.warn("Error adding notification to Firestore, falling back to local storage:", e);
      const localNotif: AppNotification = {
        id: `notif_${Date.now()}_${Math.random()}`,
        ...newNotif,
      };
      setNotifications((prev) => [localNotif, ...prev]);
      showToast(title, message, 'info');
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const belongsToUser = (n: AppNotification) =>
      currentUser &&
      (n.userId === currentUser.email || (n.userId === 'admin' && currentUser.role === 'admin'));

    // Optimistic UI Update
    setNotifications((prev) =>
      prev.map((n) => (belongsToUser(n) ? { ...n, isRead: true } : n))
    );

    try {
      const unread = notifications.filter((n) => belongsToUser(n) && !n.isRead);
      for (const notif of unread) {
        const docRef = doc(db, 'notifications', notif.id);
        await updateDoc(docRef, { isRead: true });
      }
    } catch (e) {
      console.warn("Error marking all notifications as read in Firestore:", e);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    // Optimistic UI Update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, { isRead: true });
    } catch (e) {
      console.warn("Error marking notification as read in Firestore:", e);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    // Optimistic UI Update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const docRef = doc(db, 'notifications', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn("Error deleting notification in Firestore:", e);
    }
  };

  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCodeApp, setCopiedCodeApp] = useState<boolean>(false);
  const [copiedLinkApp, setCopiedLinkApp] = useState<boolean>(false);
  const [copiedCouponCodeApp, setCopiedCouponCodeApp] = useState<string | null>(null);
  
  // --- User Authentication / Registry State Engine ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('king_store_users');
    let parsed: User[] = saved ? JSON.parse(saved) : [];
    
    const adminEmail = 'khdersy808@gmail.com';
    const adminUser: User = {
      id: 'admin-default',
      name: 'مدير النظام الملكي',
      email: adminEmail,
      password: 'Khder@2003',
      role: 'admin'
    };

    const existingAdminIndex = parsed.findIndex(u => u.email.toLowerCase() === adminEmail.toLowerCase());
    if (existingAdminIndex > -1) {
      parsed[existingAdminIndex] = adminUser;
    } else {
      // Remove old default admin if present
      parsed = parsed.filter(u => u.email !== 'admin@kingstore.com');
      parsed.push(adminUser);
    }
    return parsed;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [showRecoveryPopup, setShowRecoveryPopup] = useState<boolean>(false);
  const [recoveryPromoCode, setRecoveryPromoCode] = useState<string>('');


  // --- Admin Invitation Detection Engine ---
  const [activeAdminInvite, setActiveAdminInvite] = useState<{ email: string; role: 'admin' } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteEmail = params.get('invite_email');
    const inviteRole = params.get('invite_role');

    if (inviteEmail && inviteRole === 'admin') {
      setActiveAdminInvite({ email: inviteEmail.trim().toLowerCase(), role: 'admin' });
      setIsAuthModalOpen(true);
      
      // Clean query params from the URL bar without reloading for clean experience
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  const handleClearInvite = () => {
    if (activeAdminInvite) {
      // Mark invitation as completed in local storage
      try {
        const saved = localStorage.getItem('king_store_admin_invitations');
        if (saved) {
          const parsed = JSON.parse(saved);
          const updated = parsed.map((inv: any) => 
            inv.email.toLowerCase() === activeAdminInvite.email.toLowerCase()
              ? { ...inv, status: 'completed' }
              : inv
          );
          safeLocalStorageSetItem('king_store_admin_invitations', updated);
        }
      } catch (err) {
        console.error('Error updating invitation status:', err);
      }
      setActiveAdminInvite(null);
    }
  };

  // Filtering states
  const [selectedType, setSelectedType] = useState<'all' | 'physical' | 'digital'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);

  const [prevTab, setPrevTab] = useState(currentTab);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (currentTab !== prevTab) {
      const tabsOrder = ['home', 'categories', 'cart', 'agents', 'messaging', 'profile', 'admin'];
      const newIndex = tabsOrder.indexOf(currentTab);
      const oldIndex = tabsOrder.indexOf(prevTab);
      
      if (newIndex !== -1 && oldIndex !== -1) {
        setDirection(newIndex > oldIndex ? 1 : -1);
      } else {
        setDirection(0);
      }
      setPrevTab(currentTab);
    }
  }, [currentTab, prevTab]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : dir < 0 ? "100%" : 0,
      opacity: 0,
    }),
  };

  useEffect(() => {
    safeLocalStorageSetItem('king_store_products', products);
  }, [products]);

  useEffect(() => {
    safeLocalStorageSetItem('king_store_gateways', gateways);
  }, [gateways]);

  useEffect(() => {
    safeLocalStorageSetItem('king_store_orders', orders);
  }, [orders]);

  useEffect(() => {
    safeLocalStorageSetItem('king_store_cart', cartItems);
  }, [cartItems]);

  useEffect(() => {
    safeLocalStorageSetItem('king_store_users', users);
  }, [users]);

  // Synchronize all users from Firestore in real-time if logged in as admin
  useEffect(() => {
    // Only subscribe if we are SURE the user is an admin
    if (currentUser?.role === 'admin' && (currentUser.email === 'khdersy808@gmail.com' || currentUser.email === 'khdersy080@gmail.com')) {
      const usersColl = collection(db, 'users');
      const unsubscribe = onSnapshot(usersColl, (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersList.push({
            id: data.id || doc.id,
            name: data.name || '',
            email: data.email || doc.id,
            password: data.password || '',
            role: data.role || 'customer',
            referralCode: data.referralCode || '',
            points: typeof data.points === 'number' ? data.points : 0,
            coupons: Array.isArray(data.coupons) ? data.coupons : [],
            deviceId: data.deviceId || '',
            referredBy: data.referredBy || '',
            referralApplied: data.referralApplied || false,
            paymentPin: data.paymentPin || '',
            lastCheckInDate: data.lastCheckInDate || '',
            lastActive: data.lastActive || '',
            lastOrderDate: data.lastOrderDate || '',
            checkInStreak: typeof data.checkInStreak === 'number' ? data.checkInStreak : 0
          });
        });
        setUsers(usersList);
      }, (err) => {
        console.warn("Failed to subscribe to users collection:", err);
      });
      return () => unsubscribe();
    } else {
      // Clear users list if not admin
      setUsers([]);
    }
  }, [currentUser?.role, currentUser?.email]);

  useEffect(() => {
    const rememberMe = localStorage.getItem('king_store_remember_me') === 'true';
    if (currentUser && rememberMe) {
      safeLocalStorageSetItem('king_store_current_user', currentUser);
    } else {
      localStorage.removeItem('king_store_current_user');
    }
  }, [currentUser]);

  // --- Cart Handlers ---
  const handleAddToCart = (product: Product, options: { selectedSize?: string; selectedColor?: string; selectedOptions?: Record<string, string> } = {}) => {
    const { selectedSize, selectedColor, selectedOptions } = options;
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCartItems((prevItems) => {
      let filtered = [...prevItems];
      
      // If editing, remove the specific item being edited by index
      if (editingCartItemIndex !== null) {
        filtered = filtered.filter((_, i) => i !== editingCartItemIndex);
      }

      const existing = filtered.find(
        (item) => item.product.id === product.id && 
                 item.selectedSize === selectedSize && 
                 item.selectedColor === selectedColor &&
                 JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions || {})
      );

      if (existing) {
        // If editing, we keep the quantity from the edited item, otherwise increment
        const newQuantity = editingCartItem ? editingCartItem.quantity : existing.quantity + 1;
        
        // For physical products, check stock
        if (product.type === 'physical') {
          const maxStock = product.stock || 99;
          if (newQuantity > maxStock) return prevItems;
        }
        
        return filtered.map((item) =>
          item.product.id === product.id && 
          item.selectedSize === selectedSize && 
          item.selectedColor === selectedColor &&
          JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions || {})
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      
      return [...filtered, { 
        product, 
        quantity: editingCartItem ? editingCartItem.quantity : 1, 
        selectedSize, 
        selectedColor,
        selectedOptions
      }];
    });

    setEditingCartItem(null);
    setEditingCartItemIndex(null);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item, i) =>
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prevItems) =>
      prevItems.filter((_, i) => i !== index)
    );
  };

  const handleUpdateItemSize = (index: number, newSize: string) => {
    setCartItems((prevItems) => 
      prevItems.map((item, i) => 
        i === index ? { ...item, selectedSize: newSize } : item
      )
    );
  };

  const handleUpdateItemColor = (index: number, newColor: string) => {
    setCartItems((prevItems) => 
      prevItems.map((item, i) => 
        i === index ? { ...item, selectedColor: newColor } : item
      )
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // --- Authentication Handlers ---
  const handleLoginUser = (user: User, rememberMe: boolean = true) => {
    localStorage.setItem('king_store_remember_me', rememberMe ? 'true' : 'false');
    setCurrentUser(user);
  };

  const handleRegisterUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleLogoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase Auth signout error:", e);
    }
    localStorage.removeItem('king_store_remember_me');
    setCurrentUser(null);
    setIsAdminMode(false);
  };

  // --- Product Management Handlers ---
  const handleAddProduct = async (newProduct: Product) => {
    // We intentionally don't do optimistic update here because the onSnapshot listener 
    // will immediately fetch the change. We will update it if needed.
    
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        showToast('تنبيه', 'يرجى تسجيل الدخول لحفظ المنتج في قاعدة البيانات.', 'info');
        return;
      }

      // Sync to Firestore
      try {
        const { doc, collection, setDoc } = await import('./lib/firebase');
        // Generate a new ID for the product
        const newId = newProduct.id.startsWith('p-') ? doc(collection(db, 'products')).id : newProduct.id;
        
        const dbProd = {
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price),
          type: newProduct.type,
          category: newProduct.category,
          imageUrl: newProduct.imageUrl,
          images: Array.isArray(newProduct.images) ? newProduct.images : [],
          colors: Array.isArray(newProduct.colors) ? newProduct.colors : [],
          stock: newProduct.stock !== undefined && newProduct.stock !== null ? Number(newProduct.stock) : null,
          downloadUrl: newProduct.downloadUrl || null,
          licenseKeys: newProduct.licenseKeys || null,
          discountPercentage: newProduct.discountPercentage || 0,
          sizes: Array.isArray(newProduct.sizes) ? newProduct.sizes : [],
          reviews: newProduct.reviews || []
        };

        await setDoc(doc(db, 'products', newId), dbProd);
        
        // Let the onSnapshot listener update the local state.
        showToast('نجاح', `تم إضافة منتج "${newProduct.name}" بنجاح في قاعدة البيانات ✨`, 'success');
      } catch (fsErr) {
        console.error("Firestore error adding product:", fsErr);
        showToast('خطأ', 'فشل حفظ المنتج. تحقق من الصلاحيات.', 'warning');
      }
    } catch (err) {
      console.error("Error checking auth token:", err);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        showToast('تنبيه', 'يرجى تسجيل الدخول لتعديل المنتج في قاعدة البيانات.', 'info');
        return;
      }

      try {
        const { doc, setDoc } = await import('./lib/firebase');
        const dbProd = {
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: Number(updatedProduct.price),
          type: updatedProduct.type,
          category: updatedProduct.category,
          imageUrl: updatedProduct.imageUrl,
          stock: updatedProduct.stock !== undefined && updatedProduct.stock !== null ? Number(updatedProduct.stock) : null,
          downloadUrl: updatedProduct.downloadUrl || null,
          licenseKeys: updatedProduct.licenseKeys || null,
          discountPercentage: updatedProduct.discountPercentage || 0,
          sizes: Array.isArray(updatedProduct.sizes) ? updatedProduct.sizes : []
        };

        await setDoc(doc(db, 'products', updatedProduct.id), dbProd, { merge: true });
        showToast('نجاح', `تم تحديث منتج "${updatedProduct.name}" بنجاح في قاعدة البيانات ✨`, 'success');
      } catch (fsErr) {
        console.error("Firestore error updating product:", fsErr);
        showToast('خطأ', 'فشل تحديث المنتج. تحقق من الصلاحيات.', 'warning');
      }
    } catch (err) {
      console.error("Error checking auth token:", err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      // Ensure user is authenticated
      if (!auth.currentUser) {
        showToast('تنبيه', 'يجب تسجيل الدخول كمدير للقيام بهذه العملية.', 'info');
        return;
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'products', productId));
      
      showToast('تم الحذف بنجاح ✅', 'تم إزالة المنتج نهائياً من قاعدة البيانات والمنصة.', 'success');
      
      // Close modal if open
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error deleting product from Firestore:', error);
      showToast('خطأ في العملية', 'فشل حذف المنتج. يرجى التحقق من الصلاحيات السحابية.', 'warning');
    }
  };

  // --- Category Management Handlers ---
  const handleAddCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast('خطأ', 'هذه الفئة موجودة بالفعل.', 'warning');
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);

    try {
      const { setDoc, doc } = await import('./lib/firebase');
      await setDoc(doc(db, 'categories', trimmed), { name: trimmed });
      showToast('تمت الإضافة', `تم إضافة فئة "${trimmed}" بنجاح 🏷️`, 'success');
    } catch (e) {
      console.warn("Error saving category to Firestore (saved locally):", e);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const updated = categories.filter((c) => c !== categoryName);
    setCategories(updated);

    try {
      const { deleteDoc, doc } = await import('./lib/firebase');
      await deleteDoc(doc(db, 'categories', categoryName));
      showToast('تم الحذف', `تم حذف فئة "${categoryName}" بنجاح 🏷️`, 'success');
    } catch (e) {
      console.warn("Error deleting category from Firestore (deleted locally):", e);
    }
  };

  const handleUpdateCategory = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;
    if (categories.includes(trimmedNew)) {
      showToast('خطأ', 'الاسم الجديد للفئة موجود بالفعل.', 'warning');
      return;
    }

    const updated = categories.map((c) => (c === oldName ? trimmedNew : c));
    setCategories(updated);

    try {
      const { setDoc, deleteDoc, doc } = await import('./lib/firebase');
      await deleteDoc(doc(db, 'categories', oldName));
      await setDoc(doc(db, 'categories', trimmedNew), { name: trimmedNew });
      
      // Update any products that used this category
      setProducts((prev) =>
        prev.map((p) => (p.category === oldName ? { ...p, category: trimmedNew } : p))
      );
      
      showToast('تم التعديل', `تم تعديل الفئة إلى "${trimmedNew}" بنجاح 🏷️`, 'success');
    } catch (e) {
      console.warn("Error updating category in Firestore (updated locally):", e);
    }
  };

  const handleAddReview = (productId: string, review: ProductReview) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedProduct = {
            ...p,
            reviews: [...(p.reviews || []), review],
          };
          if (selectedProduct?.id === productId) {
            setSelectedProduct(updatedProduct);
          }
          return updatedProduct;
        }
        return p;
      })
    );
  };

  // --- Payment Gateway Handlers ---
  const handleUpdateGateway = (updatedGateway: PaymentGateway) => {
    setGateways((prev) =>
      prev.map((gw) => (gw.id === updatedGateway.id ? updatedGateway : gw))
    );
  };

  const handleAddGateway = (newGateway: PaymentGateway) => {
    setGateways((prev) => [...prev, newGateway]);
  };

  const handleDeleteGateway = (gatewayId: string) => {
    setGateways((prev) => prev.filter((gw) => gw.id !== gatewayId));
  };

  // --- Orders Management Handlers ---
  const handlePlaceOrder = async (newOrder: Order) => {
    // Add locally first for optimistic UI and immediate receipt view
    setOrders((prev) => [newOrder, ...prev]);

    // Create Admin notification
    const orderAmountStr = newOrder.totalAmount.toLocaleString('ar-SA');
    addNotification(
      'admin',
      '📥 طلب شراء جديد وارد!',
      `قام العميل "${newOrder.customerName}" بطلب شراء جديد بقيمة ${orderAmountStr} ر.س. يرجى مراجعة بوابات التحصيل لتأكيد الطلب رقم #${newOrder.id}.`,
      'order_created',
      newOrder.id
    );

    // Create Customer notification
    addNotification(
      newOrder.customerEmail,
      '👑 تم استلام طلبك الملكي بنجاح',
      `أهلاً بك يا ${newOrder.customerName}. تم استلام طلبك رقم #${newOrder.id} بقيمة ${orderAmountStr} ر.س وهو قيد المراجعة والتحقق الآن. سنقوم بإشعارك فور تحديث حالته.`,
      'order_created',
      newOrder.id
    );

    // Subtract physical stock quantities
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const orderedItem = newOrder.items.find((item) => item.productId === p.id);
        if (orderedItem && p.type === 'physical' && p.stock !== undefined) {
          return { ...p, stock: Math.max(0, p.stock - orderedItem.quantity) };
        }
        return p;
      })
    );

    // Sync order to Firestore
    try {
      await setDoc(doc(db, 'orders', newOrder.id), {
        customerUid: auth.currentUser?.uid || null,
        customerName: newOrder.customerName,
        customerEmail: newOrder.customerEmail,
        customerPhone: newOrder.customerPhone,
        shippingAddress: newOrder.shippingAddress || null,
        totalAmount: Number(newOrder.totalAmount),
        paymentMethodId: newOrder.paymentMethodId,
        paymentDetails: newOrder.paymentDetails || {},
        receiptUrl: newOrder.receiptUrl || null,
        status: newOrder.status,
        date: newOrder.date,
        senderName: newOrder.senderName || null,
        transactionId: newOrder.transactionId || null,
        deliveryDate: newOrder.deliveryDate || null,
        deliveryFee: newOrder.deliveryFee || 0,
        items: newOrder.items.map(item => ({
          productId: String(item.productId),
          productName: item.productName,
          price: Number(item.price),
          quantity: Number(item.quantity),
          type: item.type,
          selectedSize: item.selectedSize || null
        }))
      });
    } catch (fsErr) {
      console.warn("Firestore error adding order:", fsErr);
    }

    // Sync points for checkout completion
    if (newOrder.customerEmail) {
      try {
        await awardPointsForOrder(newOrder.id, newOrder.customerEmail, newOrder.totalAmount);
      } catch (pointsErr) {
        console.warn("[Loyalty] Error awarding loyalty points on order placement:", pointsErr);
      }
    }

    // Persist order to Cloud SQL PostgreSQL database via backend API
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerUid: auth.currentUser?.uid || null,
          customerName: newOrder.customerName,
          customerEmail: newOrder.customerEmail,
          customerPhone: newOrder.customerPhone,
          shippingAddress: newOrder.shippingAddress || null,
          totalAmount: newOrder.totalAmount,
          paymentMethodId: newOrder.paymentMethodId,
          paymentDetails: newOrder.paymentDetails,
          receiptUrl: newOrder.receiptUrl || null,
          items: newOrder.items.map(item => ({
            productId: String(item.productId),
            productName: item.productName,
            price: Number(item.price),
            quantity: Number(item.quantity),
            type: item.type,
            selectedSize: item.selectedSize || null
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.order) {
          // Replace local temporary ID with official database serial ID
          const dbOrder = {
            ...newOrder,
            id: String(data.order.id)
          };
          setOrders((prev) => prev.map(o => o.id === newOrder.id ? dbOrder : o));

          // Also duplicate to Firestore under the actual DB ID for matching consistency
          try {
            await setDoc(doc(db, 'orders', String(data.order.id)), {
              customerUid: auth.currentUser?.uid || null,
              customerName: newOrder.customerName,
              customerEmail: newOrder.customerEmail,
              customerPhone: newOrder.customerPhone,
              shippingAddress: newOrder.shippingAddress || null,
              totalAmount: Number(newOrder.totalAmount),
              paymentMethodId: newOrder.paymentMethodId,
              paymentDetails: newOrder.paymentDetails || {},
              receiptUrl: newOrder.receiptUrl || null,
              status: newOrder.status,
              date: newOrder.date,
              senderName: newOrder.senderName || null,
              transactionId: newOrder.transactionId || null,
              items: newOrder.items.map(item => ({
                productId: String(item.productId),
                productName: item.productName,
                price: Number(item.price),
                quantity: Number(item.quantity),
                type: item.type,
                selectedSize: item.selectedSize || null
              }))
            });
          } catch (fsErr) {
            console.warn("Firestore error adding serial order ID:", fsErr);
          }
        }
      }
    } catch (err) {
      console.error("[Database Sync] Failed to persist order to backend database:", err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    // 1. Optimistic UI update
    setOrders((prev) => {
      const existingOrder = prev.find((o) => o.id === orderId);
      if (existingOrder) {
        let statusAr = 'قيد المراجعة';
        if (status === 'processing') statusAr = 'جاري التجهيز 📦';
        if (status === 'shipping') statusAr = 'جاري الشحن 🚚';
        if (status === 'delivered') statusAr = 'تم التسليم 🎉';
        if (status === 'completed') statusAr = 'مكتمل ومسلّم ✅';
        if (status === 'cancelled') statusAr = 'ملغي ❌';

        // Notify customer
        let message = `تم تحديث حالة طلبك رقم #${orderId} إلى (${statusAr}).`;
        if (status === 'processing') message += ' نحن الآن نجهز طلبك بكل حب لتسليمه لشركة الشحن في أسرع وقت. 📦';
        else if (status === 'shipping') message += ' طلبك الآن في الطريق إليك! سيقوم مندوب التوصيل بالتواصل معك قريباً. 🚚';
        else if (status === 'delivered') message += ' لقد تم تسليم طلبك بنجاح! نأمل أن تستمتع بمشترياتك الملكية. 🎉';
        else if (status === 'completed') message += ' تمت الموافقة وتفعيل طلبك بنجاح! شكراً لثقتك بـ KING STORE. ✅';
        else if (status === 'cancelled') message += ' للأسف تم إلغاء الطلب. يرجى مراجعة الدعم الفني لأي استفسار. ❌';

        addNotification(
          existingOrder.customerEmail,
          `🔄 تحديث حالة طلبك #${orderId}`,
          message,
          'order_status_updated',
          orderId
        );
      }
      return prev.map((o) => (o.id === orderId ? { ...o, status } : o));
    });

    // Sync status with Firestore
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
      if (status === 'completed') {
        const existingOrder = orders.find((o) => o.id === orderId);
        if (existingOrder && existingOrder.customerEmail) {
          await awardPointsForOrder(orderId, existingOrder.customerEmail, existingOrder.totalAmount);
        }
      }
    } catch (fsErr) {
      console.warn("Firestore error updating order status:", fsErr);
    }

    // 2. Persist update to database
    try {
      const numericId = Number(orderId.replace('ORD-', ''));
      if (!isNaN(numericId)) {
        const token = await auth.currentUser?.getIdToken(true);
        const response = await fetch(`/api/orders/${numericId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ status })
        });
        if (response.ok) {
          console.log(`[Database Sync] Order status updated in backend: ${orderId} -> ${status}`);
        } else {
          console.warn("[Database Sync] Failed to update order status in backend.");
        }
      }
    } catch (err) {
      console.error("[Database Sync] Error updating order status in backend:", err);
    }
  };

  // Get active enabled payment gateways
  const enabledGateways = gateways.filter((gw) => gw.isEnabled);

  // Filter products for storefront view

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'physical' && p.type === 'physical') ||
      (selectedType === 'digital' && p.type === 'digital');

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (!isAppReady) {
    return <WelcomeSplash />;
  }

  return (
    <>
      <div 
        className={`min-h-screen w-full bg-slate-950 flex flex-col text-slate-100 relative overflow-x-hidden main-store-container ${language === 'en' ? 'font-sans' : ''}`} 
      dir={dir}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={pullDistance > 0 ? { transform: `translateY(${pullDistance}px)` } : undefined}
    >
      
      {/* Pull-to-Refresh Royal Loader Spinner */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-4 left-0 right-0 z-[999999] flex justify-center pointer-events-none transition-all duration-150"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 30, 40)}px)`,
            opacity: Math.min(pullDistance / 50, 1) 
          }}
        >
          <div className="bg-[#0F172A] border border-amber-500/30 shadow-[0_4px_30px_rgba(245,158,11,0.25)] rounded-full px-5 py-2.5 flex items-center gap-3 text-amber-400">
            <div className={`h-4 w-4 rounded-full border-2 border-amber-500/20 border-t-amber-400 ${isRefreshing || pullDistance >= 80 ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-black tracking-wide text-white font-sans">
              {isRefreshing ? t('refreshing') : pullDistance >= 80 ? t('releaseToRefresh') : t('pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      {/* 1. Navigation Bar */}
      <Navbar
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onLogout={handleLogoutUser}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onMarkAsRead={handleMarkNotificationAsRead}
        onDeleteNotification={handleDeleteNotification}
        activeCustomerView={activeCustomerView}
        setActiveCustomerView={setActiveCustomerView}
        isSypEnabled={isSypEnabled}
        setIsSypEnabled={setIsSypEnabled}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 min-h-screen w-full overflow-x-hidden overflow-y-auto pb-24 pt-32 sm:pt-40" style={{ contain: 'content' }}>
        {isNavigating ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={isAdminMode ? 'admin' : activeCustomerView === 'tracking' ? 'tracking' : activeCustomerView === 'wishlist' ? 'wishlist' : currentTab}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              className="w-full h-full will-change-[transform,opacity]"
            >
            {currentTab === 'agents' ? (
              <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <Users className="h-4 w-4" />
                    <span>فريق الوكلاء المعتمدين 🤝</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">لوحة الوكلاء والموزعين المعتمدين</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    تصفح وتواصل مع وكلائنا المعتمدين لتسهيل عمليات الدفع المحلّي والحصول على بطاقات التعبئة الفورية لـ KING STORE.
                  </p>
                </div>
                <AgentDashboard isAdminMode={isAdminMode} />
              </section>
            ) : currentTab === 'admin-custom-requests' ? (
              <AdminPanel
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                gateways={gateways}
                onUpdateGateway={handleUpdateGateway}
                onAddGateway={handleAddGateway}
                onDeleteGateway={handleDeleteGateway}
                orders={orders}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                users={users}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateCategory={handleUpdateCategory}
                onShowToast={showToast}
                initialTab="custom-requests"
              />
            ) : currentTab === 'custom-requests' ? (
              currentUser ? (
                <UserCustomRequests 
                  currentUser={currentUser} 
                  onBack={() => setCurrentTab('home')} 
                />
              ) : (
                <section className="mx-auto max-w-4xl px-4 py-20 text-center">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-12 space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-600">
                      <Sparkles className="h-10 w-10 opacity-20" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-white">يرجى تسجيل الدخول</h4>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">
                        يجب تسجيل الدخول لمتابعة طلباتك المخصصة وتتبع حالتها الملكية.
                      </p>
                    </div>
                    <button
                      onClick={openAuthModal}
                      className="bg-amber-500 text-slate-950 px-8 py-3 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                    >
                      تسجيل الدخول الآن 👑
                    </button>
                  </div>
                </section>
              )
            ) : currentTab === 'messaging' ? (
              <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <MessageSquare className="h-4 w-4" />
                    <span>المحادثة المباشرة الفورية 💬</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">نظام الدعم الفني الملكي</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    راسل الإدارة وطاقم الدعم الفني مباشرة وبكل أمان لحل أي استفسار أو مشكلة تتعلق بطلباتك.
                  </p>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6">
                  <MessagingSystem />
                </div>
              </section>
            ) : isAdminMode ? (
              
              /* ADMIN DASHBOARD MODE */
              <AdminPanel
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                gateways={gateways}
                onUpdateGateway={handleUpdateGateway}
                onAddGateway={handleAddGateway}
                onDeleteGateway={handleDeleteGateway}
                orders={orders}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                users={users}
                onDeleteUser={handleDeleteUser}
                currentUser={currentUser}
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateCategory={handleUpdateCategory}
                onShowToast={showToast}
              />
            ) : activeCustomerView === 'wishlist' ? (
              <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-right" dir="rtl">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-500">
                    <Heart className="h-4 w-4 fill-current" />
                    <span>قائمة أمنياتك الملكية 🤍</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-wide drop-shadow-sm">المنتجات التي نالت إعجابك</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    احتفظ بمنتجاتك المفضلة هنا للرجوع إليها لاحقاً أو إضافتها للسلة بضغطة واحدة.
                  </p>
                </div>

                {wishlist.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-600">
                      <Heart className="h-8 w-8" />
                    </div>
                    <h4 className="text-lg font-bold text-white">قائمة الأمنيات فارغة</h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      لم تقم بإضافة أي منتجات لقائمة أمنياتك بعد. تصفح المتجر وأضف ما يعجبك!
                    </p>
                    <button
                      onClick={() => setActiveCustomerView('store')}
                      className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-400 transition-all cursor-pointer"
                    >
                      تصفح المتجر الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {products.filter(p => wishlist.includes(p.id)).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        onViewDetails={(prod) => setSelectedProduct(prod)}
                        globalDiscount={globalDiscount}
                        isWishlisted={true}
                        onToggleWishlist={() => handleToggleWishlist(product.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : activeCustomerView === 'my-orders' && currentUser ? (
              <MyOrders 
                currentUser={currentUser}
                gateways={gateways}
                onBack={() => setActiveCustomerView('store')}
              />
            ) : activeCustomerView === 'tracking' ? (
              <OrderTracking
                orders={orders}
                gateways={gateways}
                onBackToStore={() => setActiveCustomerView('store')}
              />
            ) : (
              
              /* CUSTOMER STOREFRONT MODE */
              <div>
                {currentTab === 'home' && (
                  <>
                    <DailyCheckIn
                      currentUser={currentUser}
                      onOpenAuth={openAuthModal}
                      onShowToast={showToast}
                      onUpdateUser={setCurrentUser}
                      rewardsConfig={rewardsConfig}
                    />
                <section className="relative overflow-hidden bg-slate-950 py-16 text-white border-b border-amber-500/10">
                  {/* Elegant Majestic Hero Banner */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 via-slate-900/40 to-slate-950 opacity-90" />
                  <div className="absolute -top-40 -right-40 h-80 w-80 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 70%)' }} />
                  <div className="absolute -bottom-40 -left-40 h-80 w-80 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0) 70%)' }} />

                  <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                      <Sparkles className="h-4 w-4 animate-spin-slow text-amber-400" />
                      <span>{t('heroBadge')}</span>
                    </div>
                    
                    <h2 className="text-3xl font-black sm:text-5xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-300 to-yellow-100">
                      {t('heroTitle')}
                    </h2>
                    
                    <p className="mx-auto max-w-2xl text-xs sm:text-base text-slate-300 leading-relaxed">
                      {t('heroDesc')}
                    </p>

                    {/* Core trust badges */}
                    <div className="pt-6 flex flex-wrap justify-center gap-6 text-xs text-amber-400/80 font-bold">
                      <div className="flex items-center gap-1.5 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge1')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge2')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
                        <Truck className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge3')}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
                  {/* --- 🎁 بنر العروض المميز الفاخر (Featured Offers Banner) --- */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 border border-amber-500/20 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
                    <div className="absolute -top-16 -left-16 h-36 w-36 pointer-events-none bg-amber-500/5 rounded-full" />
                    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                      <div className="text-right space-y-3 max-w-xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                          <Crown className="h-4 w-4 text-amber-400 animate-bounce" />
                          <span>{t('weeklyOffers')}</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
                          {discountsSectionTitle}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          {discountsSectionDesc}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-auto">
                        {(() => {
                          let featured = products.filter(p => discountsSectionFeaturedProductIds.includes(p.id));
                          if (featured.length === 0) {
                            featured = products.slice(0, 2);
                          }
                          return featured.map((product) => (
                            <div 
                              key={`offer-${product.id}`}
                              onClick={() => setSelectedProduct(product)}
                              className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 sm:p-4 text-right transition-all duration-300 cursor-pointer group shadow-lg animate-fade-in"
                            >
                              <div className="relative overflow-hidden rounded-xl bg-slate-950 h-24 sm:h-28 flex items-center justify-center">
                                <img 
                                  src={product.imageUrl || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300"} 
                                  alt={product.name} 
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                                  {t('royalSpecialOffer')}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-bold text-white mt-3 line-clamp-1 group-hover:text-amber-400 transition-colors">
                                {product.name}
                              </h4>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs sm:text-sm font-black text-amber-400">
                                  ${product.price}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-zinc-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                  {product.type === 'digital' ? t('instantDeliverySmall') : t('fastShippingSmall')}
                                </span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Welcome Segment & Onboarding Card */}
                <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
                  {!currentUser ? (
                    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900 p-6 text-zinc-100 shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-l from-amber-500/10 via-transparent to-transparent" />
                      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-right space-y-2">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>{t('welcomeRoyalPortal')}</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-white">{t('welcomeGuestTitle')}</h3>
                          <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed" dangerouslySetInnerHTML={{ __html: t('welcomeGuestDesc') }} />
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-xs sm:text-sm active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                          >
                            {t('loginRegisterButton')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 p-6 text-zinc-100 shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent" />
                      <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-right space-y-2">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                            <Crown className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{t('welcomeBackPalace')}</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-white">{t('welcomeUserTitle').replace('{name}', currentUser.name)}</h3>
                          <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed" dangerouslySetInnerHTML={{ 
                            __html: t('welcomeUserDesc').replace('{role}', currentUser.role === 'admin' ? t('adminRole') : t('memberRole')) 
                          }} />
                        </div>
                        {currentUser.role === 'admin' && (
                          <div className="flex gap-3 shrink-0">
                            <button
                              onClick={() => setIsAdminMode(true)}
                              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs sm:text-sm active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                            >
                              {t('adminDashboardButton')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Android APK & PWA installation guidance section */}
                <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6" id="apk-download-section">
                  <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900 p-6 sm:p-8 text-zinc-100 shadow-xl flex flex-col justify-between">
                    <div className="absolute inset-0 bg-gradient-to-l from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -top-12 -left-12 h-32 w-32 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 70%)' }} />
                    
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row items-start gap-4 text-right">
                        <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0 mx-auto md:mx-0">
                          <Smartphone className="h-8 w-8 text-amber-400 stroke-[2]" />
                        </div>
                        <div className="space-y-2 text-center md:text-right flex-1">
                          <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            <span>{t('smartphoneAppTitle')}</span>
                          </div>
                          <h4 className="text-xl font-black text-white">
                            <span>{t('smartphoneAppSub')}</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
                            {t('smartphoneAppDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col lg:flex-row items-center justify-between gap-4">
                      <div className="text-zinc-400 text-xs text-center lg:text-right">
                        💡 <span className="text-zinc-200 font-bold">{t('recommendedSolution')}</span> {t('pwaNotice')}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full lg:w-auto shrink-0 z-10">
                        {showInstallBtn && (
                          <button
                            onClick={handleInstallClick}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 text-xs active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/20 text-center animate-pulse"
                            id="pwa-install-hero-action"
                          >
                            <Smartphone className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                            <span>تثبيت تطبيق المتجر الملكي 📱</span>
                          </button>
                        )}
                        
                        {!showInstallBtn && (
                          <div className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black px-6 py-3.5 text-xs">
                            <Check className="h-4 w-4" />
                            <span>التطبيق مثبت بالفعل على جهازك ✨</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Custom Product Request Section */}
                <section className="mx-auto max-w-7xl px-4 sm:px-6">
                  <CustomRequestForm 
                    currentUser={currentUser} 
                    onShowToast={showToast} 
                    openAuthModal={openAuthModal}
                  />
                </section>

                {/* Storefront Navigation / Filtering Control Bar */}
                <section className="bg-white border-b border-slate-200 sticky top-18 z-30 shadow-sm mt-8">
                  <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    
                    {/* 1. Filter by Product Type */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedType('all'); setSelectedCategory('all'); }}
                        className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                          selectedType === 'all'
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t('allDisplayed')}
                      </button>
                      <button
                        onClick={() => { setSelectedType('physical'); setSelectedCategory('all'); }}
                        className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedType === 'physical'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Package className="h-4 w-4" />
                        <span>{t('physicalProducts')}</span>
                      </button>
                      <button
                        onClick={() => { setSelectedType('digital'); setSelectedCategory('all'); }}
                        className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedType === 'digital'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        <span>{t('digitalProducts')}</span>
                      </button>
                    </div>

                    {/* 2. Filter by Category */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1 shrink-0">
                        <Filter className="h-3.5 w-3.5" />
                        <span>{t('categoryLabel')}</span>
                      </span>
                      
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                          selectedCategory === 'all'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {t('all')}
                      </button>
                      
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                  </div>
                </section>

                {/* Products Grid & Results */}
                <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                  
                  {/* Search Result Headers */}
                  {(searchQuery || selectedType !== 'all' || selectedCategory !== 'all') && (
                    <div className="mb-6 flex items-center justify-between text-xs sm:text-sm text-slate-500 font-bold bg-white px-5 py-3 rounded-xl border border-slate-200">
                      <span>
                        {t('filterResults').replace('{count}', filteredProducts.length.toString())}
                      </span>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedType('all');
                          setSelectedCategory('all');
                        }}
                        className="text-amber-600 hover:underline flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        <span>{t('clearFilters')}</span>
                      </button>
                    </div>
                  )}

                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 space-y-4">
                      <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
                      <h3 className="text-lg font-bold text-slate-700">{t('noProductsFound')}</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        {t('noProductsDesc')}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedType('all');
                          setSelectedCategory('all');
                        }}
                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        {t('showAllOfferings')}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={handleAddToCart}
                          onViewDetails={(prod) => setSelectedProduct(prod)}
                          globalDiscount={globalDiscount}
                          isWishlisted={wishlist.includes(product.id)}
                          onToggleWishlist={() => handleToggleWishlist(product.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
                </>
            )}

            {currentTab === 'categories' && (
              <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <Grid className="h-4 w-4" />
                    <span>{t('browseExclusiveCategories')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{t('categoriesTitle')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('categoriesDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Default All */}
                  <div 
                    onClick={() => { setSelectedCategory('all'); setCurrentTab('home'); }}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-300 cursor-pointer text-right"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-950">{t('allOfferings')}</h4>
                        <p className="text-xs text-slate-500 mt-1">{t('allOfferingsDesc')}</p>
                      </div>
                    </div>
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                      {t('productCount').replace('{count}', products.length.toString())}
                    </span>
                  </div>

                  {categories.map((cat, index) => {
                    const colors = [
                      { bg: 'bg-blue-500/10 text-blue-600', border: 'hover:border-blue-500/30' },
                      { bg: 'bg-emerald-500/10 text-emerald-600', border: 'hover:border-emerald-500/30' },
                      { bg: 'bg-purple-500/10 text-purple-600', border: 'hover:border-purple-500/30' },
                      { bg: 'bg-pink-500/10 text-pink-600', border: 'hover:border-pink-500/30' },
                      { bg: 'bg-indigo-500/10 text-indigo-600', border: 'hover:border-indigo-500/30' },
                    ];
                    const design = colors[index % colors.length];
                    const catProducts = products.filter(p => p.category === cat);

                    return (
                      <div 
                        key={cat}
                        onClick={() => { setSelectedCategory(cat); setCurrentTab('home'); }}
                        className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md ${design.border} transition-all duration-300 cursor-pointer text-right`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-xl ${design.bg} group-hover:scale-110 transition-transform`}>
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-950">{cat}</h4>
                            <p className="text-xs text-slate-500 mt-1">{t('customCategoriesDesc')}</p>
                          </div>
                        </div>
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-150">
                          {t('productCount').replace('{count}', catProducts.length.toString())}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {currentTab === 'cart' && (
              <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{t('shoppingBagCurrent')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{t('royalCartTitle')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('cartDesc')}
                  </p>
                </div>

                {cartItems.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
                    <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{t('cartEmptyLong')}</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      {t('cartEmptyDesc')}
                    </p>
                    <button 
                      onClick={() => setCurrentTab('home')}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-xs shadow-lg shadow-amber-500/15 cursor-pointer"
                    >
                      {t('backToShoppingRoyal')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Cart Items List */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                      {cartItems.map((item, index) => (
                        <div key={`${item.product.id}-${index}`} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-right">
                          <img 
                            src={item.product.imageUrl || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150"} 
                            alt={item.product.name} 
                            className="h-16 w-16 object-cover rounded-xl border border-slate-100 shrink-0 bg-slate-50"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
                                {item.product.category}
                              </span>
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {item.product.type === 'physical' ? '📦 ملموس' : '⚡ رقمي'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{item.product.name}</h4>
                            
                            {/* Product Specifications (Enhanced Red highlight) */}
                            {item.product.specifications && (
                              <div className="bg-red-50/60 border-r-4 border-red-500 px-3 py-2 rounded-lg my-2 shadow-sm transition-transform hover:scale-[1.02]">
                                <p className="text-[11px] font-black text-red-700 text-right leading-relaxed">
                                  🔥 {item.product.specifications}
                                </p>
                              </div>
                            )}

                            {/* Selected Options with Edit capability */}
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                              {item.selectedSize && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">المقاس</span>
                                  <span className="inline-flex items-center justify-center text-sm font-black text-slate-800 bg-white px-4 py-1.5 rounded-xl border-2 border-slate-100 shadow-sm">
                                    {item.selectedSize}
                                  </span>
                                </div>
                              )}
                              {item.selectedColor && (
                                <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl border-2 border-slate-100 shadow-sm group transition-all hover:border-amber-200">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">اللون المختار</span>
                                    <span className="text-sm font-black text-slate-900">
                                      {item.selectedColor}
                                    </span>
                                  </div>
                                  <div 
                                    className="w-10 h-10 rounded-full border-4 border-white shadow-lg ring-2 ring-slate-50 group-hover:scale-110 transition-transform relative overflow-hidden" 
                                    style={{ backgroundColor: item.selectedColor }}
                                    title={item.selectedColor}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/10 pointer-events-none" />
                                  </div>
                                </div>
                              )}
                              
                              {/* Custom selected options display */}
                              {item.selectedOptions && Object.entries(item.selectedOptions).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">{key}</span>
                                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-100 shadow-sm">
                                    {value}
                                  </span>
                                </div>
                              ))}
                              
                              <button 
                                onClick={() => {
                                  setEditingCartItem(item);
                                  setSelectedProduct(item.product);
                                }}
                                className="mt-auto self-end text-xs font-bold text-amber-600 hover:text-white flex items-center gap-1.5 bg-amber-50 hover:bg-amber-500 px-4 py-2 rounded-2xl transition-all cursor-pointer border border-amber-200 hover:shadow-lg hover:-translate-y-0.5"
                              >
                                <Settings className="h-4 w-4" />
                                <span>{t('editDetails')}</span>
                              </button>
                            </div>
                          </div>

                          {/* Price and Actions Section */}
                          <div className="flex flex-row-reverse sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-5 sm:pt-0 border-t sm:border-0 border-slate-100">
                            <div className="flex flex-col items-end">
                              <p className="text-5xl font-black text-red-600 drop-shadow-md leading-none tracking-tighter filter saturate-150 transform -rotate-1">${item.product.price}</p>
                              {item.product.discountPercentage ? (
                                <span className="text-xs text-slate-400 line-through font-bold mt-1">
                                  ${Math.round(item.product.price * (1 + item.product.discountPercentage / 100))}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Quantity Controls */}
                              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50 shadow-inner">
                                <button 
                                  onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                                  className="px-3 py-1.5 text-slate-500 hover:text-red-600 transition-colors cursor-pointer font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 text-xs font-black text-slate-800 bg-white border-x border-slate-200 min-w-[2.5rem] text-center">
                                  {item.quantity}
                                </span>
                                <button 
                                  onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                                  className="px-3 py-1.5 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer font-bold text-xs"
                                >
                                  +
                                </button>
                              </div>

                              <button 
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 bg-red-50 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-90"
                                title={t('removeFromCart')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline checkout summary */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 border border-amber-500/20 shadow-xl space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <span className="text-zinc-400 font-bold text-xs">{t('itemsTotalAmount')}</span>
                        <span className="text-lg font-black text-white">
                          ${cartItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-amber-400/90 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 leading-relaxed font-bold">
                        {t('checkoutReminder')}
                      </div>

                      {/* Checkout button redirecting to main Cart drawer for processing with gateways */}
                      <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 text-xs sm:text-sm shadow-xl shadow-amber-500/15 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>{t('proceedToCheckoutRoyal')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {currentTab === 'agents' && (
              <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <Users className="h-4 w-4" />
                    <span>{t('certifiedAgents')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{t('agentsPanelTitle')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('agentsPanelDesc')}
                  </p>
                </div>
                <AgentDashboard isAdminMode={isAdminMode} />
              </section>
            )}

            {currentTab === 'messaging' && (
              <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <MessageSquare className="h-4 w-4" />
                    <span>{t('liveChatInstant')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{t('supportSystemTitle')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('supportSystemDesc')}
                  </p>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6">
                  <MessagingSystem />
                </div>
              </section>
            )}

            {currentTab === 'profile' && (
              <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 text-right">
                <div className="mb-8 space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
                    <UserIcon className="h-4 w-4" />
                    <span>{t('luxuryProfile')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tracking-wide drop-shadow-sm">{t('memberCornerTitle')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {t('memberCornerDesc')}
                  </p>
                </div>

                {!currentUser ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-sm">
                    <div className="h-16 w-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <Crown className="h-8 w-8 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{t('loginToActivateFeatures')}</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      {t('loginToActivateDesc')}
                    </p>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 text-xs shadow-lg shadow-amber-500/15 cursor-pointer"
                    >
                      {t('loginCreateAccountNow')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* User profile info card */}
                    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-amber-500/20 shadow-xl relative overflow-hidden text-right">
                      <div className="absolute inset-0 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            <Crown className="h-3.5 w-3.5 text-amber-400" />
                            <span>{t('activeGoldenMembership')}</span>
                          </span>
                          <h4 className="text-lg font-black text-white">{currentUser.name}</h4>
                          <p className="text-xs font-mono text-zinc-400">{currentUser.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                          >
                            {t('editAccount')}
                          </button>
                          <button 
                            onClick={handleLogoutUser}
                            className="rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                          >
                            {t('logout')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Royal Gift Wallet & Referral System */}
                    <div className="bg-slate-950 border border-amber-500/25 rounded-3xl p-6 shadow-xl space-y-6 text-right text-zinc-100">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-amber-400 animate-pulse" />
                          <h4 className="text-base font-black text-amber-400 tracking-wide">محفظة الهدايا الملكية 🎁</h4>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Referrals & Rewards</span>
                      </div>

                      {/* Bento grid layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Box 1: Referral Link & Code */}
                        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-4.5 space-y-3.5">
                          <span className="text-xs font-bold text-zinc-400 block">نظام الإحالة الفيروسي 👥</span>
                          <p className="text-[11px] leading-relaxed text-zinc-400 font-medium">
                            شارك الكود أو رابط الإحالة الخاص بك مع أصدقائك؛ عند تسجيلهم ستحصل فوراً على <strong className="text-amber-400">100 نقطة</strong> هدية!
                          </p>
                          
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">كود الإحالة الخاص بك</label>
                            <div className="flex items-center justify-between bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                              <span className="font-mono text-xs font-extrabold text-amber-400 tracking-wider">
                                {currentUser.referralCode || 'جاري التوليد...'}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  if (currentUser.referralCode) {
                                    copyToClipboard(currentUser.referralCode, 'نجاح النسخ', 'تم نسخ كود الإحالة بنجاح 📋');
                                    setCopiedCodeApp(true);
                                    setTimeout(() => setCopiedCodeApp(false), 2000);
                                  }
                                }}
                                className={`p-1.5 rounded transition-all duration-300 cursor-pointer border ${
                                  copiedCodeApp
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-transparent'
                                }`}
                                title="نسخ الكود"
                              >
                                <AnimatePresence mode="wait" initial={false}>
                                  {copiedCodeApp ? (
                                    <motion.div
                                      key="check"
                                      initial={{ scale: 0, rotate: -45 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      exit={{ scale: 0 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </motion.div>
                                  ) : (
                                    <motion.div
                                      key="copy"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase">رابط الإحالة المباشر</label>
                            <div className="flex items-center justify-between bg-zinc-950 rounded-xl p-3 border border-zinc-800">
                              <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[180px] text-left">
                                {window.location.origin + '/?ref=' + (currentUser.referralCode || '')}
                              </span>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  const shareUrl = window.location.origin + '/?ref=' + (currentUser.referralCode || '');
                                  copyToClipboard(shareUrl, 'نجاح النسخ', 'تم نسخ رابط الإحالة بنجاح وبامكانك مشاركته الآن! 🔗');
                                  setCopiedLinkApp(true);
                                  setTimeout(() => setCopiedLinkApp(false), 2000);
                                }}
                                className={`p-1 rounded transition-all duration-300 cursor-pointer flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 border ${
                                  copiedLinkApp
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                    : 'bg-zinc-900 hover:bg-zinc-800 border-transparent text-zinc-400 hover:text-white'
                                }`}
                              >
                                {copiedLinkApp ? (
                                  <>
                                    <Check className="h-3 w-3 stroke-[3]" />
                                    <span>تم النسخ!</span>
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-3 w-3" />
                                    <span>نسخ الرابط</span>
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </div>
                        </div>

                        {/* Box 2: Points & Progression */}
                        <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-4.5 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-zinc-400 block">رصيد نقاطك الملكي 👑</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-3xl font-black text-amber-500">{currentUser.points || 0}</span>
                              <span className="text-xs font-bold text-zinc-500">نقطة</span>
                            </div>
                          </div>

                          {/* Progress bar to 1000 */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                              <span>الهدف القادم: 1000 نقطة ($1 كوبون)</span>
                              <span>{Math.min(100, Math.round(((currentUser.points || 0) / 1000) * 100))}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, ((currentUser.points || 0) / 1000) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] leading-relaxed text-zinc-500">
                              يتم خصم 1000 نقطة تلقائياً عند الاكتمال لتوليد كود خصم بقيمة 1 دولار في محفظتك الموضحة أدناه!
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Points History Section */}
                      <div className="bg-slate-900 rounded-2xl border border-zinc-800 p-4.5 space-y-3.5">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                          <History className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-bold text-zinc-300 font-sans">سجل حركات النقاط الملكية 📜</span>
                        </div>

                        {pointsHistory.length === 0 ? (
                          <p className="text-[11px] text-zinc-500 text-center py-4 font-semibold">
                            لا يوجد سجل حركات نقاط حالياً. ابدأ الشراء الآن لكسب النقاط! 🛍️
                          </p>
                        ) : (
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {pointsHistory.map((historyItem) => (
                              <div
                                key={historyItem.id}
                                className="flex items-center justify-between bg-zinc-950 rounded-xl p-3 border border-zinc-850 hover:border-zinc-800 transition-all text-right"
                              >
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-zinc-300 block font-sans">
                                    {historyItem.orderId ? `مشتريات الطلب #${historyItem.orderId}` : 'مكافأة الإحالة'}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500 block">
                                    {new Date(historyItem.date).toLocaleDateString('ar-EG', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-black text-emerald-400">+{historyItem.points_added}</span>
                                  <span className="text-[10px] font-bold text-zinc-500">نقطة</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Earned Coupons Wallet */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-zinc-300">القسائم الملكية المكتسبة ($1 Coupons) 🏷️</span>
                        </div>
                        
                        {!currentUser.coupons || currentUser.coupons.length === 0 ? (
                          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                            <p className="text-xs text-zinc-500 font-medium">
                              لا توجد قسائم نشطة في محفظتك الملكية حالياً. شارك رابط الإحالة لربح قسائم خصم فورية بقيمة 1$!
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {currentUser.coupons.map((couponCodeStr, index) => (
                              <div
                                key={`${couponCodeStr}_${index}`}
                                className="relative bg-zinc-900 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between overflow-hidden shadow-md group hover:border-emerald-500/20 transition-all text-right"
                              >
                                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-950 border-r border-zinc-800 rounded-full" />
                                <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-950 border-l border-zinc-800 rounded-full" />
                                
                                <div className="space-y-1.5 pl-6 pr-4">
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                                    خصم $1.00 ثابت
                                  </span>
                                  <h5 className="font-mono text-[11px] font-bold text-zinc-300 tracking-wider">
                                    {couponCodeStr}
                                  </h5>
                                </div>
                                <button
                                  onClick={() => {
                                    copyToClipboard(couponCodeStr, 'تم النسخ', `تم نسخ كود القسيمة الملكية ${couponCodeStr} لشرائه في السلة! 🏷️`);
                                  }}
                                  className="rounded-xl bg-zinc-950 hover:bg-emerald-500 hover:text-slate-950 border border-zinc-800 text-zinc-400 text-[10px] font-bold px-3.5 py-2 cursor-pointer transition-all shrink-0"
                                >
                                  نسخ واستعمال
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order History */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Package className="h-4 w-4 text-amber-500" />
                        <span>{t('myRecentOrders').replace('{count}', orders.filter(o => o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()).length.toString())}</span>
                      </h4>

                      {orders.filter(o => o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()).length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center font-semibold">
                          {t('noOrdersYet')}
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {orders.filter(o => o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()).map((order) => (
                            <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                              <div>
                                <span className="text-[10px] font-mono text-slate-400 block">{t('orderId')} {order.id}</span>
                                <h5 className="text-xs font-black text-slate-900 mt-1">
                                  {t('orderTotalIs')} <strong className="text-amber-600">${order.totalAmount}</strong>
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">{t('orderDate')} {order.date}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                  order.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                  order.status === 'cancelled' ? 'text-red-700 bg-red-50 border-red-100' :
                                  'text-amber-700 bg-amber-50 border-amber-100'
                                }`}>
                                  {order.status === 'completed' ? t('orderStatusCompleted') :
                                   order.status === 'cancelled' ? t('orderStatusCancelled') :
                                   t('orderStatusPending')}
                                </span>
                                <button
                                  onClick={() => {
                                    localStorage.setItem('temp_search_order_id', order.id);
                                    setActiveCustomerView('tracking');
                                  }}
                                  className="text-[11px] font-black text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  تتبع طلبك الملكي الخاص 🔍
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 4. Footer */}
      <footer className="bg-slate-950 text-white border-t border-amber-500/10 py-10 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <Crown className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-base font-extrabold tracking-wider">{t('shopName')}</span>
          </div>
          
          <p className="text-center md:text-right text-[11px] sm:text-xs text-slate-400 max-w-md leading-relaxed">
            {t('footerDesc')}
          </p>

          {/* PWA Install Link in Footer */}
          {showInstallBtn && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-bold px-4 py-2.5 text-[10px] transition-all cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>تثبيت تطبيق المتجر 📱</span>
              </button>
            </div>
          )}

          <div className="flex gap-4 text-xs text-slate-400 font-bold">
            <span className="hover:text-amber-400 cursor-pointer transition-colors">{t('termsAndConditions')}</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer transition-colors">{t('privacyPolicy')}</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer transition-colors">{t('supportAndComplaints')}</span>
          </div>
        </div>
      </footer>
    </div>

    <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onUpdateItemSize={handleUpdateItemSize}
        onUpdateItemColor={handleUpdateItemColor}
        onClearCart={handleClearCart}
        enabledGateways={enabledGateways}
        onPlaceOrder={handlePlaceOrder}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onUpdateUser={(updatedUser) => {
          setCurrentUser(updatedUser);
          setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        }}
        onEditItem={(item) => {
          const index = cartItems.indexOf(item);
          setEditingCartItem(item);
          setEditingCartItemIndex(index !== -1 ? index : null);
          setSelectedProduct(item.product);
          setIsCartOpen(false);
        }}
        globalDiscount={globalDiscount}
        exchangeRate={exchangeRate}
        isSypEnabled={isSypEnabled}
        deliverySettings={deliverySettings}
      />

      {/* 5. Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={true}
          isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
          onToggleWishlist={() => selectedProduct && handleToggleWishlist(selectedProduct.id)}
          onClose={() => {
            setSelectedProduct(null);
            setEditingCartItem(null);
          }}
          initialOptions={editingCartItem ? {
            selectedSize: editingCartItem.selectedSize,
            selectedColor: editingCartItem.selectedColor,
            selectedOptions: (editingCartItem as any).selectedOptions
          } : undefined}
          orders={orders}
          onAddReview={handleAddReview}
          onAddToCart={handleAddToCart}
          globalDiscount={globalDiscount}
          isAdminMode={isAdminMode}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* 6. User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLoginUser}
        onRegister={handleRegisterUser}
        existingUsers={users}
        adminInviteEmail={activeAdminInvite?.email}
        onClearInvite={handleClearInvite}
      />

      {/* 6.5. User Account Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser) => {
          setCurrentUser(updatedUser);
          // Keep local users registry up-to-date
          setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        }}
        showToast={showToast}
      />

      {/* 6.6. Royal Gift Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        showToast={showToast}
      />

      {/* 6.7. Royal Customer Recovery Popup */}
      <RoyalRecoveryPopup
        isOpen={showRecoveryPopup}
        onClose={() => setShowRecoveryPopup(false)}
        promoCode={recoveryPromoCode}
        onShowToast={showToast}
      />

      {/* Floating Active Toast Notification Overlay */}
      <div className={`fixed top-24 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none ${dir === 'rtl' ? 'left-6' : 'right-6'}`} dir={dir}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-slate-900/95 text-white border border-amber-500/30 shadow-2xl transition-all duration-300 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            style={{ animation: dir === 'rtl' ? 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="rounded-full bg-amber-500/10 p-1.5 shrink-0 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-amber-400">{toast.title}</h4>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 8. Mobile Floating Bottom Navigation Bar (Visible on All Screens) */}
      <BottomNav 
        currentTab={currentTab} 
        setCurrentTab={handleTabChange}
        cartCount={cartItems?.length || 0} 
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        isAdmin={currentUser?.role === 'admin'}
        userEmail={currentUser?.email}
      />

    </>
  );
}
