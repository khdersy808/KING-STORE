/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Order, ProductReview } from '../types';
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
  ShoppingBag
} from 'lucide-react';

interface ProductDetailsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onAddReview: (productId: string, review: ProductReview) => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  orders,
  onAddReview,
  onAddToCart,
}: ProductDetailsModalProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

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

  const isOutOfStock = product.type === 'physical' && (product.stock === undefined || product.stock <= 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 px-4 backdrop-blur-sm animate-fade-in" dir="rtl">
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
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'}
              alt={product.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 right-3">
              {product.type === 'physical' ? (
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
            
            {/* Price & Stock info */}
            <div className="mt-4 flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold block">السعر الملكي</span>
                <span className="text-2xl font-black text-amber-400">${product.price.toLocaleString()}</span>
              </div>
              <div className="text-left">
                {product.type === 'physical' ? (
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
          </div>

          {/* Add to Cart Button */}
          <div className="mt-6 pt-6 border-t border-zinc-900">
            <button
              onClick={() => {
                onAddToCart(product);
              }}
              disabled={isOutOfStock}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all cursor-pointer ${
                isOutOfStock
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-850'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-98 shadow-lg shadow-amber-500/10'
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span>{isOutOfStock ? 'نفدت الكمية المتاحة' : 'أضف إلى سلة المشتريات'}</span>
            </button>
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
