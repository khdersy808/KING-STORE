/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, ProductReview } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  X,
  Star,
  User,
  Mail,
  MessageSquare,
  Calendar,
  BadgeCheck,
  AlertCircle,
  Package,
  Zap,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';

interface ProductDetailsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onAddReview: (productId: string, review: ProductReview) => void;
  onAddToCart: (product: Product, options?: { selectedSize?: string; selectedColor?: string; selectedOptions?: Record<string, string> }) => void;
  globalDiscount?: number;
  exchangeRate?: number;
  isSypEnabled?: boolean;
  isAdminMode?: boolean;
  onDeleteProduct?: (productId: string) => void;
  initialOptions?: { 
    selectedSize?: string; 
    selectedColor?: string;
    selectedOptions?: Record<string, string>;
  };
}

export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  orders,
  onAddReview,
  onAddToCart,
  globalDiscount = 0,
  isAdminMode,
  onDeleteProduct,
  initialOptions
}: ProductDetailsModalProps) {
  const { formatPrice } = useCurrency();
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedSize, setSelectedSize] = useState(initialOptions?.selectedSize || '');
  const [sizeError, setSizeError] = useState(false);
  const [colorError, setColorError] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialOptions?.selectedColor || null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    (initialOptions as any)?.selectedOptions || {}
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  if (!isOpen) return null;

  const hasGlobalDiscount = globalDiscount > 0;
  const productSpecificDiscount = product.discountPercentage || 0;
  const totalDiscount = Math.max(globalDiscount, productSpecificDiscount);
  const hasDiscount = totalDiscount > 0;

  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - totalDiscount / 100))
    : product.price;

  // Calculate average rating
  const reviews = product.reviews || [];
  const reviewsCount = reviews.length;
  const averageRating = reviewsCount > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewsCount).toFixed(1))
    : 0;

  // Check if a specific email has purchased this product
  const checkEmailPurchase = (email: string) => {
    return orders.some(order => 
      order.customerEmail.trim().toLowerCase() === email.trim().toLowerCase() &&
      order.items.some(item => item.productId === product.id)
    );
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!reviewerName.trim()) {
      setErrorMsg('يرجى إدخال اسمك الكريم.');
      return;
    }
    if (!reviewerEmail.trim()) {
      setErrorMsg('يرجى إدخال بريدك الإلكتروني.');
      return;
    }
    if (!comment.trim()) {
      setErrorMsg('يرجى كتابة نص المراجعة أو التعليق.');
      return;
    }

    // Verify purchase
    const hasPurchased = checkEmailPurchase(reviewerEmail);
    if (!hasPurchased) {
      setErrorMsg('عذراً، لم نجد أي عملية شراء مسجلة بهذا البريد الإلكتروني لشراء هذا المنتج. التقييمات مخصصة حصرياً للمشترين الفعليين لضمان مصداقية التقييمات.');
      return;
    }

    // Check if they already reviewed this product with this email to avoid duplicates
    const alreadyReviewed = reviews.some(r => r.reviewerEmail.trim().toLowerCase() === reviewerEmail.trim().toLowerCase());
    if (alreadyReviewed) {
      setErrorMsg('لقد قمت بالفعل بتقييم هذا المنتج مسبقاً باستخدام هذا البريد الإلكتروني.');
      return;
    }

    const newReview: ProductReview = {
      id: `rev-${Date.now()}`,
      reviewerName: reviewerName.trim(),
      reviewerEmail: reviewerEmail.trim().toLowerCase(),
      rating,
      comment: comment.trim(),
      date: new Date().toISOString(),
    };

    onAddReview(product.id, newReview);
    setSuccessMsg('تم إرسال تقييمك بنجاح! شكراً لثقتك بمتجرنا.');
    
    // Clear form except name/email for user comfort
    setComment('');
    setRating(5);
  };

  const isPhysical = product.type !== 'digital';
  const isOutOfStock = isPhysical && (product.stock === undefined || product.stock <= 0);

  const colorMap: { [key: string]: string } = {
    "أسود": "#000000",
    "أبيض": "#FFFFFF",
    "أحمر": "#FF0000",
    "أزرق": "#0000FF",
    "أخضر": "#008000",
    "كحلي": "#000080",
    "رمادي": "#808080",
    "أصفر": "#FFFF00",
    "برتقالي": "#FFA500",
    "بنفسجي": "#800080",
    "وردي": "#FFC0CB",
    "سماوي": "#87CEEB",
    "ذهبي": "#FFD700",
    "فضي": "#C0C0C0"
  };

  const isColorMandatory = isPhysical && product.colors && product.colors.length > 0;
  const isSizeMandatory = isPhysical && product.sizes && product.sizes.length > 0;
  
  const canAddToCart = !isOutOfStock && 
    (!isColorMandatory || selectedColor) && 
    (!isSizeMandatory || selectedSize);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-fade-in" dir="rtl">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0d0d0d] text-zinc-100 shadow-2xl flex flex-col md:flex-row"
        id={`product-modal-${product.id}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/85 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Product Image and Main Stats (Right Side on large screen, Top on Mobile) */}
        <div className="w-full md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-l border-zinc-900 flex flex-col">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={`${product.name} - image ${currentImageIndex + 1}`}
                className="h-full w-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            
            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/50 text-white hover:bg-zinc-950/80 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-950/50 text-white hover:bg-zinc-950/80 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className="absolute top-3 right-3">
              {isPhysical ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/90 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shadow-sm">
                  <Package className="h-3 w-3 text-amber-500" />
                  <span>منتج ملموس</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950/90 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span>تسليم رقمي فوري</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-md">
              {product.category}
            </span>
            <h2 className="text-2xl font-black text-white mt-3 leading-tight">{product.name}</h2>
            
            {/* Product Specifications */}
            {product.specifications && (
              <p className="mt-2 text-xs font-bold text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg inline-block">
                ✨ {product.specifications}
              </p>
            )}
            
            {/* Price & Stock info */}
            <div className="mt-4 flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block">السعر الملكي</span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-400">
                      {formatPrice(discountedPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-zinc-500 line-through">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-left">
              {isPhysical ? (
                isOutOfStock ? (
                    <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/30">
                      نفد من المخزن
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-bold text-zinc-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                      المتبقي بالمخزن: <strong className="text-amber-400 mr-1">{product.stock}</strong> قطعة
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                    <Zap className="h-3.5 w-3.5 animate-pulse" />
                    <span>جاهز للتحميل</span>
                  </span>
                )}
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-zinc-300 bg-zinc-900/10 p-1 rounded-lg">
              {product.description}
            </p>

            {/* Color selection */}
            {isPhysical && (
              <div className="mt-5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 justify-start mb-3">
                  🎨 اللون المطلوب (إجباري):
                  <span className="text-amber-400 font-extrabold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{selectedColor || 'لم يتم الاختيار'}</span>
                </span>
                {product.colors && product.colors.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-start">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setColorError(false);
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor === color 
                            ? 'border-amber-400 scale-110 shadow-lg shadow-amber-500/20' 
                            : 'border-zinc-700 hover:border-zinc-500'
                        }`}
                        style={{ backgroundColor: colorMap[color] || color }}
                        title={color}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 font-bold">عذراً، لا تتوفر ألوان لهذا المنتج حالياً.</p>
                )}
              </div>
            )}

            {/* Size selection */}
            {isPhysical && product.sizes && product.sizes.length > 0 && (
              <div className={`mt-5 p-4 rounded-xl border transition-all duration-350 ${
                sizeError 
                  ? 'bg-red-500/5 border-red-500/30 ring-1 ring-red-500/20' 
                  : 'bg-zinc-900/40 border-zinc-800'
              }`}>
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 justify-start">
                  <span>{
                    product.category === 'أحذية' || 
                    product.category?.toLowerCase().includes('shoes') || 
                    product.category?.toLowerCase().includes('footwear') 
                      ? '👟 مقاس الحذاء المطلوب:' 
                      : '👕 المقاس المطلوب للملابس:'
                  }</span>
                  {!selectedSize ? (
                    <span className="text-amber-500 font-extrabold text-[10px] animate-pulse">(يرجى اختيار مقاسك)</span>
                  ) : (
                    <span className="text-amber-400 font-extrabold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{selectedSize}</span>
                  )}
                </span>
                <div className="flex flex-wrap gap-2 justify-start mt-3">
                  {product.sizes.map((sz) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setSelectedSize(sz);
                          setSizeError(false);
                        }}
                        className={`min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Options Display */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4 mt-5">
                {product.options.map((opt) => (
                  <div key={opt.name} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800">
                    <span className="text-xs font-bold text-zinc-400 block mb-3">
                      {opt.name}:
                      {selectedOptions[opt.name] && (
                        <span className="mr-2 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {selectedOptions[opt.name]}
                        </span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                          className={`px-3 py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer border ${
                            selectedOptions[opt.name] === val
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/10'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <div className="mt-6 pt-6 border-t border-zinc-900">
            {(sizeError || colorError) && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <p className="text-red-400 font-bold text-sm leading-relaxed">
                  {sizeError && "يرجى اختيار المقاس أولاً. "}
                  {colorError && "يرجى اختيار اللون أولاً. "}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                let hasError = false;
                if (product.sizes && product.sizes.length > 0 && !selectedSize) {
                  setSizeError(true);
                  hasError = true;
                } else {
                  setSizeError(false);
                }
                if (product.colors && product.colors.length > 0 && !selectedColor) {
                  setColorError(true);
                  hasError = true;
                } else {
                  setColorError(false);
                }
                if (hasError) return;
                
                onAddToCart(product, { 
                  selectedSize: selectedSize || undefined, 
                  selectedColor: selectedColor || undefined,
                  selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined
                } as any);
              }}
              disabled={!canAddToCart}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all cursor-pointer ${
                !canAddToCart
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-850'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-98 shadow-lg shadow-amber-500/10'
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>{isOutOfStock ? 'نفدت الكمية المتاحة' : 'أضف إلى سلة المشتريات'}</span>
            </button>

            {/* Admin Delete Action - Quick Access */}
            {isAdminMode && onDeleteProduct && (
              <div className="mt-4 space-y-2">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/30 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                    id="admin-delete-product-trigger"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف هذا المنتج نهائياً (صلاحية مدير)</span>
                  </button>
                ) : (
                  <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl space-y-3">
                    <p className="text-xs text-red-400 font-bold text-center">⚠️ هل أنت متأكد من حذف هذا المنتج نهائياً؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onDeleteProduct(product.id);
                          setShowDeleteConfirm(false);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2.5 rounded-lg text-xs cursor-pointer shadow-lg shadow-red-500/10"
                      >
                        نعم، احذف نهائياً
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-lg text-xs cursor-pointer"
                      >
                        إلغاء التراجع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews and Ratings Section (Left Side on large screen, Bottom on Mobile) */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-[#0a0a0a]">
          
          {/* Average Rating Display */}
          <div className="mb-6 flex items-center justify-between bg-zinc-900/40 p-5 rounded-2xl border border-zinc-900">
            <div>
              <h3 className="text-sm font-bold text-zinc-400">تقييمات العملاء</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-black text-white">{averageRating > 0 ? averageRating : '0.0'}</span>
                <span className="text-xs text-zinc-500">من 5</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= Math.round(averageRating);
                  return (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        isFilled ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-zinc-400 mt-1.5 font-bold">
                ({reviewsCount} {reviewsCount === 1 ? 'تقييم فردي' : reviewsCount >= 2 && reviewsCount <= 10 ? 'تقييمات' : 'تقييم'})
              </span>
            </div>
          </div>

          {/* Review form / list container */}
          <div className="flex-1 flex flex-col space-y-6">
            
            {/* 1. Review Submission Form */}
            <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                <span>اكتب مراجعة وتقييمك للمنتج</span>
              </h4>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                
                {/* Name & Email inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">الاسم الكريم</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="مثال: أحمد العتيبي"
                        value={reviewerName || ""}
                        onChange={(e) => setReviewerName(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pr-9 pl-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                      <User className="absolute right-3 top-2.5 h-4 w-4 text-zinc-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">البريد الإلكتروني (المستخدم بالشراء)</label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="مثال: custom@example.com"
                        value={reviewerEmail || ""}
                        onChange={(e) => setReviewerEmail(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pr-9 pl-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-zinc-600" />
                    </div>
                  </div>
                </div>

                {/* Star rating picker */}
                <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-400">تقييمك بالنجوم:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isHighlighted = hoveredRating !== null ? star <= hoveredRating : star <= rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(null)}
                          className="p-1 focus:outline-none hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`h-5 w-5 transition-colors ${
                              isHighlighted ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment textarea */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">مراجعتك الصادقة</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب تفاصيل تجربتك للمنتج هنا..."
                    value={comment || ""}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none resize-none"
                  />
                </div>

                {/* Errors & Success Banners */}
                {errorMsg && (
                  <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400 font-semibold flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/30 rounded-xl text-xs text-emerald-400 font-semibold flex items-start gap-2">
                    <BadgeCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-100 text-slate-950 py-2 text-xs font-bold hover:bg-white active:scale-98 transition-all cursor-pointer"
                >
                  نشر تقييمي ومراجعتي
                </button>
              </form>
            </div>

            {/* 2. List of Existing Reviews */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>المراجعات السابقة</span>
                <span className="text-xs text-zinc-500 font-normal">({reviewsCount})</span>
              </h4>

              {reviewsCount === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-850 rounded-xl">
                  <p className="text-xs text-zinc-500">لا توجد تقييمات مكتوبة لهذا المنتج بعد. كن أول من يقيّم بعد الشراء!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => {
                    // Check if reviewer purchased
                    const isVerified = checkEmailPurchase(rev.reviewerEmail);
                    return (
                      <div 
                        key={rev.id} 
                        className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/60 hover:border-zinc-800 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-zinc-100">{rev.reviewerName}</span>
                              {isVerified && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  <BadgeCheck className="h-2.5 w-2.5 text-amber-400" />
                                  <span>مشتري مؤكد</span>
                                </span>
                              )}
                            </div>
                            
                            {/* Star icons */}
                            <div className="flex gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-800'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(rev.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </span>
                        </div>

                        <p className="mt-2.5 text-xs text-zinc-300 leading-relaxed break-words font-medium">
                          {rev.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
