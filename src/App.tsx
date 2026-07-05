/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
import OrderTracking from './components/OrderTracking';
import { Product, PaymentGateway, Order, CartItem, ProductType, OrderStatus, ProductReview, User, AppNotification } from './types';
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
  User as UserIcon,
  ShoppingCart,
  Users,
  MessageSquare
} from 'lucide-react';
import ProductDetailsModal from './components/ProductDetailsModal';
import { BottomNav } from './components/BottomNav';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import AgentDashboard from './components/AgentDashboard';
import MessagingSystem from './components/MessagingSystem';
import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, auth, signOut, onAuthStateChanged } from './lib/firebase';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { dir, t, language, texts } = useLanguage();
  const [activeCustomerView, setActiveCustomerView] = useState<'store' | 'tracking'>('store');
  const [currentTab, setCurrentTab] = useState<string>('home');

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

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const rememberMe = localStorage.getItem('king_store_remember_me') === 'true';
    if (rememberMe) {
      const saved = localStorage.getItem('king_store_current_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  // --- Notifications & Toasts State ---
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('king_store_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'success' | 'info' | 'warning' }[]>([]);

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

  // Synchronize categories with Firestore real-time listener
  useEffect(() => {
    try {
      const q = query(collection(db, 'categories'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: string[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.name) {
              list.push(data.name);
            }
          });
          if (list.length > 0) {
            setCategories(list);
          }
        }
      }, (error) => {
        console.warn("Firestore listening categories warning (falling back to localStorage):", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase categories sync not fully active. Fallback to localStorage.", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('king_store_categories', JSON.stringify(categories));
  }, [categories]);

  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(15000);

  // Synchronize global discount setting from Firestore real-time listener
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'discounts');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.globalDiscount === 'number') {
            setGlobalDiscount(data.globalDiscount);
          }
        }
      }, (error) => {
        console.warn("Error listening to global discount in App:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase global discount sync not fully active.", e);
    }
  }, []);

  // Synchronize exchange rate setting from Firestore real-time listener
  useEffect(() => {
    try {
      const docRef = doc(db, 'settings', 'currency');
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.exchangeRate === 'number') {
            setExchangeRate(data.exchangeRate);
          }
        }
      }, (error) => {
        console.warn("Error listening to exchange rate in App:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase exchange rate sync not fully active.", e);
    }
  }, []);

  // Synchronize notifications with Firestore real-time listener
  useEffect(() => {
    try {
      const q = query(collection(db, 'notifications'), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
        });

        setNotifications((prev) => {
          const prevIds = new Set(prev.map((n) => n.id));
          list.forEach((n) => {
            const belongsToUser =
              currentUser &&
              (n.userId === currentUser.email || (n.userId === 'admin' && currentUser.role === 'admin'));
            // Only trigger toast for brand new incoming notifications (not initial load)
            if (!prevIds.has(n.id) && belongsToUser && prev.length > 0 && !n.isRead) {
              showToast(n.title, n.message, 'info');
            }
          });
          return list;
        });
      }, (error) => {
        console.warn("Firestore listening warning (falling back to localStorage):", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase not fully configured or active. Fallback to localStorage.", e);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('king_store_notifications', JSON.stringify(notifications));
  }, [notifications]);


  // Synchronize authentication state with Firebase in real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Only set current user if email is verified or it's the default admin
        const adminEmail = 'khdersy808@gmail.com';
        const isVerified = fbUser.emailVerified || fbUser.email?.toLowerCase() === adminEmail;
        
        if (isVerified && fbUser.email) {
          try {
            const { getDoc } = await import('./lib/firebase');
            const userDocRef = doc(db, 'users', fbUser.email.toLowerCase());
            const userDoc = await getDoc(userDocRef);
            
            let role = 'customer';
            let nameVal = fbUser.displayName || fbUser.email.split('@')[0];
            
            if (fbUser.email.toLowerCase() === adminEmail.toLowerCase()) {
              role = 'admin';
              nameVal = fbUser.displayName || texts.royalAdminName;
              // Merge/force update role to admin in Firestore
              const { setDoc } = await import('./lib/firebase');
              await setDoc(userDocRef, {
                id: fbUser.uid,
                name: nameVal,
                email: fbUser.email.toLowerCase(),
                role: 'admin',
                createdAt: userDoc.exists() ? (userDoc.data().createdAt || new Date().toISOString()) : new Date().toISOString()
              }, { merge: true });
            } else {
              if (userDoc.exists()) {
                role = userDoc.data().role || 'customer';
                nameVal = userDoc.data().name || nameVal;
              }
            }
            
            setCurrentUser({
              id: fbUser.uid,
              name: nameVal,
              email: fbUser.email.toLowerCase(),
              password: '',
              role: role as 'admin' | 'customer'
            });
          } catch (err) {
            console.warn("Error fetching user data from Firestore during auth sync:", err);
          }
        }
      } else {
        // If logged out from Firebase, clear client-side state
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);


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
          localStorage.setItem('king_store_admin_invitations', JSON.stringify(updated));
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('king_store_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('king_store_gateways', JSON.stringify(gateways));
  }, [gateways]);

  useEffect(() => {
    localStorage.setItem('king_store_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('king_store_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('king_store_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    const rememberMe = localStorage.getItem('king_store_remember_me') === 'true';
    if (currentUser && rememberMe) {
      localStorage.setItem('king_store_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('king_store_current_user');
    }
  }, [currentUser]);

  // --- Cart Handlers ---
  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      if (existing) {
        // For physical products, check stock
        if (product.type === 'physical') {
          const maxStock = product.stock || 99;
          if (existing.quantity >= maxStock) return prevItems;
        }
        return prevItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
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
    // Optimistic local update
    setProducts((prev) => [newProduct, ...prev]);

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) {
        showToast('تنبيه', 'يرجى تسجيل الدخول لحفظ المنتج في قاعدة البيانات.', 'info');
        return;
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price),
          type: newProduct.type,
          category: newProduct.category,
          imageUrl: newProduct.imageUrl,
          stock: newProduct.stock,
          downloadUrl: newProduct.downloadUrl,
          licenseKeys: newProduct.licenseKeys,
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product) {
          const dbProd = {
            ...data.product,
            id: String(data.product.id)
          };
          // Replace the optimistic product with the actual DB product containing the real ID
          setProducts((prev) => 
            prev.map((p) => (p.id === newProduct.id ? dbProd : p))
          );
          showToast('نجاح', `تم إضافة منتج "${newProduct.name}" بنجاح في قاعدة البيانات ✨`, 'success');
        }
      } else {
        const data = await res.json();
        showToast('فشل المزامنة', data.error || 'فشل حفظ المنتج في قاعدة البيانات.', 'warning');
      }
    } catch (err) {
      console.warn("Failed to save added product to backend Cloud SQL:", err);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    // Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) return;

      const numericId = Number(updatedProduct.id);
      if (isNaN(numericId)) {
        // If it's a temporary string ID and not in DB yet, we skip DB call
        return;
      }

      const res = await fetch(`/api/products/${numericId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedProduct.name,
          description: updatedProduct.description,
          price: Number(updatedProduct.price),
          type: updatedProduct.type,
          category: updatedProduct.category,
          imageUrl: updatedProduct.imageUrl,
          stock: updatedProduct.stock,
          downloadUrl: updatedProduct.downloadUrl,
          licenseKeys: updatedProduct.licenseKeys,
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product) {
          showToast('نجاح', `تم تحديث منتج "${updatedProduct.name}" بنجاح في قاعدة البيانات ✨`, 'success');
        }
      } else {
        const data = await res.json();
        showToast('خطأ', data.error || 'فشل تحديث المنتج في قاعدة البيانات.', 'warning');
      }
    } catch (err) {
      console.warn("Failed to update product in backend Cloud SQL:", err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من KING STORE؟')) {
      // Optimistic local update
      setProducts((prev) => prev.filter((p) => p.id !== productId));

      try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) return;

        const numericId = Number(productId);
        if (isNaN(numericId)) return;

        const res = await fetch(`/api/products/${numericId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          showToast('تم الحذف', 'تم حذف المنتج من قاعدة البيانات بنجاح 🗑️', 'success');
        } else {
          const data = await res.json();
          showToast('خطأ', data.error || 'فشل حذف المنتج من قاعدة البيانات.', 'warning');
        }
      } catch (err) {
        console.warn("Failed to delete product from backend Cloud SQL:", err);
      }
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
    if (!confirm(`هل أنت متأكد من حذف الفئة "${categoryName}"؟`)) {
      return;
    }
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
            type: item.type
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
          console.log(`[Database Sync] Order ${newOrder.id} persisted with DB ID: ${data.order.id}`);
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
        if (status === 'completed') statusAr = 'مكتمل ومسلّم ✅';
        if (status === 'cancelled') statusAr = 'ملغي ❌';

        // Notify customer
        addNotification(
          existingOrder.customerEmail,
          `🔄 تحديث حالة طلبك #${orderId}`,
          `تم تحديث حالة طلبك رقم #${orderId} إلى (${statusAr}). ${
            status === 'completed'
              ? 'تمت الموافقة وتفعيل طلبك بنجاح! شكراً لثقتك بـ KING STORE.'
              : 'تم إلغاء الطلب. يرجى مراجعة الدعم الفني لأي استفسار.'
          }`,
          'order_status_updated',
          orderId
        );
      }
      return prev.map((o) => (o.id === orderId ? { ...o, status } : o));
    });

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
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 min-h-screen w-full overflow-y-auto" style={{ contain: 'content' }}>
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
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateCategory={handleUpdateCategory}
          />
        ) : activeCustomerView === 'tracking' ? (
          <OrderTracking
            orders={orders}
            gateways={gateways}
            onBackToStore={() => setActiveCustomerView('store')}
          />
        ) : (
          
          /* CUSTOMER STOREFRONT MODE */
          <>
            {currentTab === 'home' && (
              <>
                {/* Elegant Majestic Hero Banner */}
                <section className="relative overflow-hidden bg-slate-950 py-16 text-white border-b border-amber-500/10">
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
                      <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                        <ShieldCheck className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge1')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge2')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                        <Truck className="h-4 w-4 text-amber-500" />
                        <span>{t('trustBadge3')}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* --- 🎁 بنر العروض المميز الفاخر (Featured Offers Banner) --- */}
                <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 border border-amber-500/20 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none" />
                    <div className="absolute -top-16 -left-16 h-36 w-36 pointer-events-none bg-amber-500/5 rounded-full blur-3xl" />
                    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                      <div className="text-right space-y-3 max-w-xl">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                          <Crown className="h-4 w-4 text-amber-400 animate-bounce" />
                          <span>{t('weeklyOffers')}</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
                          {t('weeklyOffersTitle')}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                          {t('offersDesc')}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-auto">
                        {products.slice(0, 2).map((product) => (
                          <div 
                            key={`offer-${product.id}`}
                            onClick={() => setSelectedProduct(product)}
                            className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 sm:p-4 text-right transition-all duration-300 cursor-pointer group shadow-lg"
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
                                {product.price} {t('syrianPound')}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-zinc-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                {product.type === 'digital' ? t('instantDeliverySmall') : t('fastShippingSmall')}
                              </span>
                            </div>
                          </div>
                        ))}
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
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto shrink-0 z-10">
                        <button
                          onClick={() => setIsApkGuideOpen(true)}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 text-xs active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/20 text-center animate-pulse"
                          id="view-apk-guide-action"
                        >
                          <Smartphone className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                          <span>{t('installAppButton')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                          exchangeRate={exchangeRate}
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
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-right">
                          <img 
                            src={item.product.imageUrl || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=150"} 
                            alt={item.product.name} 
                            className="h-16 w-16 object-cover rounded-xl border border-slate-100 shrink-0 bg-slate-50"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 space-y-1">
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.product.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.product.name}</h4>
                            <p className="text-xs font-black text-amber-500">{item.product.price} {t('syrianPound')}</p>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50/50">
                              <button 
                                onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                                className="px-3 py-1.5 text-slate-500 hover:text-red-600 transition-colors cursor-pointer font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="px-3 py-1 text-xs font-black text-slate-800 bg-white border-x border-slate-200">
                                {item.quantity}
                              </span>
                              <button 
                                onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                className="px-3 py-1.5 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer font-bold text-xs"
                              >
                                +
                              </button>
                            </div>

                            <button 
                              onClick={() => handleRemoveItem(item.product.id)}
                              className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-colors cursor-pointer"
                              title={t('removeFromCart')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline checkout summary */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 border border-amber-500/20 shadow-xl space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <span className="text-zinc-400 font-bold text-xs">{t('itemsTotalAmount')}</span>
                        <span className="text-lg font-black text-white">
                          {cartItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)} {t('syrianPound')}
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
                                  {t('orderTotalIs')} <strong className="text-amber-600">{order.totalAmount} {t('syrianPound')}</strong>
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">{t('orderDate')} {order.date}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                order.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                order.status === 'cancelled' ? 'text-red-700 bg-red-50 border-red-100' :
                                'text-amber-700 bg-amber-50 border-amber-100'
                              }`}>
                                {order.status === 'completed' ? t('orderStatusCompleted') :
                                 order.status === 'cancelled' ? t('orderStatusCancelled') :
                                 t('orderStatusPending')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
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

    {/* 3. Global Shopping Cart Drawer */}
    <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        enabledGateways={enabledGateways}
        onPlaceOrder={handlePlaceOrder}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        globalDiscount={globalDiscount}
        exchangeRate={exchangeRate}
      />

      {/* 5. Product Details Modal */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          orders={orders}
          onAddReview={handleAddReview}
          onAddToCart={handleAddToCart}
          globalDiscount={globalDiscount}
          exchangeRate={exchangeRate}
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

      {/* 7. Mobile App Installation & Generation Guide Modal */}
      {isApkGuideOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir={dir}>
          <div 
            className="relative bg-slate-900 rounded-3xl border border-amber-500/20 max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Smartphone className="h-5 w-5 text-amber-400" />
                </div>
                <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  <span className="text-[10px] font-extrabold text-amber-400 block uppercase tracking-wide">{texts.apkGuideTitle}</span>
                  <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5 mt-0.5">
                    <span>{texts.apkGuideSubTitle}</span>
                  </h4>
                </div>
              </div>
              <button 
                onClick={() => setIsApkGuideOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className={`space-y-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-semibold">
                    {texts.pwaDesc}
                  </p>
                  <ul className="list-disc list-inside mt-2 text-[11px] sm:text-xs text-amber-400 font-bold space-y-1">
                    <li>{texts.pwaBenefit1}</li>
                    <li>{texts.pwaBenefit2}</li>
                    <li>{texts.pwaBenefit3}</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">1</span>
                    <span>{texts.androidInstallSteps}</span>
                  </h5>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-1.5">
                    <p>{texts.androidStep1}</p>
                    <p>{texts.androidStep2}</p>
                    <p>{texts.androidStep3}</p>
                    <p>{texts.androidStep4}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">2</span>
                    <span>{texts.iosInstallSteps}</span>
                  </h5>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-1.5">
                    <p>{texts.iosStep1}</p>
                    <p>{texts.iosStep2}</p>
                    <p>{texts.iosStep3}</p>
                    <p>{texts.iosStep4}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-zinc-400">{texts.footerPlatformName}</span>
              <button
                onClick={() => setIsApkGuideOpen(false)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                {texts.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Active Toast Notification Overlay */}
      <div className={`fixed top-24 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none ${dir === 'rtl' ? 'left-6' : 'right-6'}`} dir={dir}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-slate-900/95 text-white border border-amber-500/30 shadow-2xl transition-all duration-300 backdrop-blur-md ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
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
        currentTab={isAdminMode ? 'admin' : currentTab} 
        setCurrentTab={(tab) => {
          if (tab === 'admin') {
            setIsAdminMode(true);
            setCurrentTab('home');
          } else {
            setIsAdminMode(false);
            setCurrentTab(tab);
          }
        }} 
        cartCount={cartItems?.length || 0} 
        isAdmin={currentUser?.role === 'admin'}
      />

    </>
  );
}
