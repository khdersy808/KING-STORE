/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import Cart from './components/Cart';
import AdminPanel from './components/AdminPanel';
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
  Code
} from 'lucide-react';
import ProductDetailsModal from './components/ProductDetailsModal';
import AuthModal from './components/AuthModal';
import { db, collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, auth, signOut, onAuthStateChanged } from './lib/firebase';

export default function App() {
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
    const saved = localStorage.getItem('king_store_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- Notifications & Toasts State ---
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('king_store_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: 'success' | 'info' | 'warning' }[]>([]);

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
        console.error("Firestore listening error: ", error);
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
            
            if (userDoc.exists()) {
              role = userDoc.data().role || 'customer';
              nameVal = userDoc.data().name || nameVal;
            }
            
            setCurrentUser({
              id: fbUser.uid,
              name: nameVal,
              email: fbUser.email.toLowerCase(),
              password: '',
              role: role as 'admin' | 'customer'
            });
          } catch (err) {
            console.error("Error fetching user data from Firestore during auth sync:", err);
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
      console.error("Error adding notification to Firestore, falling back to local storage:", e);
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
      console.error("Error marking all notifications as read in Firestore:", e);
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
      console.error("Error marking notification as read in Firestore:", e);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    // Optimistic UI Update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const docRef = doc(db, 'notifications', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Error deleting notification in Firestore:", e);
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
    if (currentUser) {
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
    // Open cart drawer immediately for premium user experience
    setIsCartOpen(true);
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
  const handleLoginUser = (user: User) => {
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
    setCurrentUser(null);
    setIsAdminMode(false);
  };

  // --- Product Management Handlers ---
  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من KING STORE؟')) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
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
  const handlePlaceOrder = (newOrder: Order) => {
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
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
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
  };

  // Get active enabled payment gateways
  const enabledGateways = gateways.filter((gw) => gw.isEnabled);

  // Filter products for storefront view
  const categories = Array.from(new Set(products.map((p) => p.category)));

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
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800" dir="rtl">
      
      {/* 1. Navigation Bar */}
      <Navbar
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogoutUser}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onMarkAsRead={handleMarkNotificationAsRead}
        onDeleteNotification={handleDeleteNotification}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1">
        {isAdminMode ? (
          
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
          />
        ) : (
          
          /* CUSTOMER STOREFRONT MODE */
          <>
            {/* Elegant Majestic Hero Banner */}
            <section className="relative overflow-hidden bg-slate-950 py-16 text-white border-b border-amber-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 via-slate-900/40 to-slate-950 opacity-90" />
              <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />

              <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                  <Sparkles className="h-4 w-4 animate-spin-slow text-amber-400" />
                  <span>متجر الملوك للتجارة الإلكترونية المتكاملة</span>
                </div>
                
                <h2 className="text-3xl font-black sm:text-5xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-300 to-yellow-100">
                  متجر KING STORE الفاخر
                </h2>
                
                <p className="mx-auto max-w-2xl text-xs sm:text-base text-slate-300 leading-relaxed">
                  بوابتك الملكية لاقتناء أفخر المنتجات الملموسة والشحن السريع، وأفضل المنتجات والاشتراكات الرقمية والتراخيص البرمجية مع التسليم الآلي الفوري على بريدك الإلكتروني.
                </p>

                {/* Core trust badges */}
                <div className="pt-6 flex flex-wrap justify-center gap-6 text-xs text-amber-400/80 font-bold">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    <span>ضمان وأمان 100٪</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>تسليم رقمي فوري ⚡</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800">
                    <Truck className="h-4 w-4 text-amber-500" />
                    <span>توصيل ملموس سريع 📦</span>
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
                        <span>أهلاً بك في البوابة الملكية لـ KING STORE! 👋</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white">ضيفنا العزيز، نحن سعداء بوجودك معنا اليوم! ✨</h3>
                      <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
                        للحصول على تجربة تسوق آمنة وكاملة، وتوفير إمكانية الشراء الفوري مع متابعة طلباتك أو تفعيل المنتجات الرقمية فورياً، <strong className="text-amber-400 font-bold">يرجى تسجيل الدخول أو إنشاء حسابك الفاخر الآن</strong>. التسوق والشراء غير متاحين للزوار غير المسجلين لحفظ الخصوصية وتأمين التسليم الفوري.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 text-xs sm:text-sm active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                      >
                        تسجيل الدخول / إنشاء حساب 👑
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
                        <span>مرحباً بك مجدداً في قصرك! 👑</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white">أهلاً بك يا {currentUser.name}! ✨</h3>
                      <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
                        لقد تم تسجيل دخولك بنجاح بصفتك <span className="text-amber-400 font-bold">{currentUser.role === 'admin' ? 'مدير النظام الفاخر' : 'عضو تسوق متميز'}</span>. حسابك نشط وجاهز للتسوق، وإضافة أي منتج إلى السلة، وإتمام الدفع بأمان.
                      </p>
                    </div>
                    {currentUser.role === 'admin' && (
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => setIsAdminMode(true)}
                          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 text-xs sm:text-sm active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                        >
                          لوحة تحكم الإدارة ⚙️
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
                <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
                
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start gap-4 text-right">
                    <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shrink-0 mx-auto md:mx-0">
                      <Smartphone className="h-8 w-8 text-amber-400 stroke-[2]" />
                    </div>
                    <div className="space-y-2 text-center md:text-right flex-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>تطبيق الهواتف الذكية لـ KING STORE 📲</span>
                      </div>
                      <h4 className="text-xl font-black text-white">
                        <span>تثبيت وتشغيل متجر KING STORE على جهازك المحمول</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-4xl">
                        استمتع بتجربة تسوق ملكية فائقة السرعة مع دعم كامل لقواعد البيانات والتحقق من الطلبات! يمكنك تثبيت متجرنا فورا كـ تطبيق ويب تقدمي (PWA) فائق الخفة والسرعة، أو معرفة طريقة بناء وتصدير كود تطبيق الأندرويد الأصلي المتكامل مع Firebase.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="text-zinc-400 text-xs text-center lg:text-right">
                    💡 <span className="text-zinc-200 font-bold">الحل الموصى به:</span> تثبيت التطبيق الفوري كـ PWA يعمل 100% مع Firebase ولا يحتاج لتنزيل ملفات خارجية!
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto shrink-0 z-10">
                    <button
                      onClick={() => setIsApkGuideOpen(true)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3.5 text-xs active:scale-98 transition-all cursor-pointer shadow-lg shadow-amber-500/20 text-center animate-pulse"
                      id="view-apk-guide-action"
                    >
                      <Smartphone className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                      <span>تثبيت وتنزيل التطبيق للهواتف</span>
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
                    كل المعروض
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
                    <span>المنتجات الملموسة</span>
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
                    <span>المنتجات الرقمية</span>
                  </button>
                </div>

                {/* 2. Filter by Category */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1 shrink-0">
                    <Filter className="h-3.5 w-3.5" />
                    <span>الفئة:</span>
                  </span>
                  
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    الكل
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
                    نتائج البحث والتصفية: تم العثور على{' '}
                    <strong className="text-amber-600 font-extrabold">{filteredProducts.length}</strong> منتج
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
                    <span>تصفير الفلاتر</span>
                  </button>
                </div>
              )}

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 space-y-4">
                  <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-700">لم نجد أي منتجات تطابق اختيارك!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    قد تكون الكلمة المكتوبة غير صحيحة، أو لا تتوفر منتجات في هذه الفئة حالياً. تصفح بقية المعروضات أو قم بتصفير الفلاتر.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setSelectedCategory('all');
                    }}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    عرض كل المعروضات
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
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
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

      {/* 7. Mobile App Installation & Generation Guide Modal */}
      {isApkGuideOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
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
                <div>
                  <span className="text-[10px] font-extrabold text-amber-400 block uppercase tracking-wide">دليل الهواتف الذكية 📱</span>
                  <h4 className="text-sm sm:text-base font-black flex items-center gap-1.5 mt-0.5">
                    <span>تثبيت تطبيق KING STORE على هاتفك</span>
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
              <div className="space-y-4 text-right">
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-semibold">
                    تطبيقات الويب التقدمية (PWA) هي الجيل الجديد من التطبيقات المثبتة! لا تحتاج لتحميل ملفات APK خارجية أو مواجهة تحذيرات الأمان من Google Play.
                  </p>
                  <ul className="list-disc list-inside mt-2 text-[11px] sm:text-xs text-amber-400 font-bold space-y-1">
                    <li>تزامن فوري ومباشر 100% مع قاعدة بيانات Firebase!</li>
                    <li>تحديثات تلقائية بالكامل فور تعديل المتجر.</li>
                    <li>خفيف جداً وموفر لمساحة تخزين الهاتف وبطاريته.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">1</span>
                    <span>خطوات التثبيت على أجهزة أندرويد (Android):</span>
                  </h5>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-1.5">
                    <p>1. افتح رابط المتجر في متصفح <span className="text-white font-bold">Google Chrome</span> على هاتفك.</p>
                    <p>2. اضغط على زر القائمة (الثلاث نقاط) في الزاوية العلوية للمتصفح.</p>
                    <p>3. اضغط على خيار <span className="text-amber-400 font-bold">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span> أو <span className="text-amber-400 font-bold">"تثبيت التطبيق" (Install App)</span>.</p>
                    <p>4. وافق على التثبيت، وسيظهر شعار <span className="text-white font-bold">KING STORE</span> كأيقونة تطبيق رسمي على شاشة هاتفك فوراً!</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">2</span>
                    <span>خطوات التثبيت على أجهزة آيفون (iOS/Safari):</span>
                  </h5>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-1.5">
                    <p>1. افتح رابط المتجر في متصفح <span className="text-white font-bold">Safari</span> الرسمي على هاتف الآيفون.</p>
                    <p>2. اضغط على زر <span className="text-white font-bold">مشاركة (Share)</span> الموجود في شريط الأدوات بالأسفل.</p>
                    <p>3. مرر لأسفل القائمة قليلاً واضغط على خيار <span className="text-amber-400 font-bold">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</p>
                    <p>4. اضغط على زر <span className="text-amber-400 font-bold">"إضافة" (Add)</span> في الزاوية العلوية، واستمتع بتطبيق متكامل وسريع.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-zinc-400">👑 KING STORE - منصة الملوك والأمان الفائق</span>
              <button
                onClick={() => setIsApkGuideOpen(false)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Footer */}
      <footer className="bg-slate-950 text-white border-t border-amber-500/10 py-10 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <Crown className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-base font-extrabold tracking-wider">KING STORE</span>
          </div>
          
          <p className="text-center md:text-right text-[11px] sm:text-xs text-slate-400 max-w-md leading-relaxed">
            منصة ملوك التجارة لبيع المنتجات الملموسة وغير الملموسة. حقوق النشر © 2026. كل الحقوق محفوظة لـ KING STORE. مصمم بأعلى مستويات الاحترافية والأمان الفائق.
          </p>

          <div className="flex gap-4 text-xs text-slate-400 font-bold">
            <span className="hover:text-amber-400 cursor-pointer transition-colors">الشروط والأحكام</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer transition-colors">سياسة الخصوصية</span>
            <span>•</span>
            <span className="hover:text-amber-400 cursor-pointer transition-colors">الدعم الفني والشكاوى</span>
          </div>
        </div>
      </footer>



      {/* Floating Active Toast Notification Overlay */}
      <div className="fixed top-24 left-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" dir="rtl">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-slate-900/95 text-white border border-amber-500/30 shadow-2xl transition-all duration-300 text-right backdrop-blur-md"
            style={{ animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
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

    </div>
  );
}
